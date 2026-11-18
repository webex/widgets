import {renderHook, act, waitFor} from '@testing-library/react';
import {useGranularAgentState} from '../src/helper';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: {refreshAgentStateControl: jest.fn()},
  ERROR_TRIGGERING_IDLE_CODES: {RONA: 'RONA'},
}));

const channelState = (overrides = {}) => ({
  agentState: 'Available',
  pendingIdle: false,
  auxCodeId: '0',
  availableChannelCount: 1,
  totalChannelCount: 1,
  stateChangeReason: '',
  stateChangeTimestamp: Date.now(),
  ...overrides,
});

describe('useGranularAgentState Hook', () => {
  const logger = {log: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn(), trace: jest.fn()};
  const idleCodes = [
    {id: '0', name: 'Available', isSystem: false, isDefault: false},
    {id: '10', name: 'Lunch Break', isSystem: false, isDefault: false},
    {id: '11', name: 'Meeting', isSystem: false, isDefault: true},
  ];
  let workerMock;
  let cc;

  const renderUseGranularAgentState = (channelStatesMap, onStateChange = jest.fn()) =>
    renderHook(() =>
      useGranularAgentState({
        cc,
        agentId: 'agent123',
        idleCodes,
        channelStatesMap,
        logger,
        onStateChange,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    workerMock = {postMessage: jest.fn(), terminate: jest.fn(), onmessage: null};
    global.Worker = jest.fn(() => workerMock);
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    cc = {setAgentState: jest.fn().mockResolvedValue({})};
  });

  it('should build channel view models with the first channel as primary', () => {
    const {result} = renderUseGranularAgentState({
      telephony: channelState(),
      chat: channelState({agentState: 'Idle', auxCodeId: '10'}),
    });

    expect(result.current.channels.map((channel) => [channel.channelType, channel.displayState])).toEqual([
      ['telephony', 'Available'],
      ['chat', 'Lunch Break'],
    ]);
    expect(result.current.primaryChannel.channelType).toBe('telephony');
  });

  it('should start a worker tick and terminate it on unmount', () => {
    const {unmount} = renderUseGranularAgentState({telephony: channelState()});

    expect(workerMock.postMessage).toHaveBeenCalledWith({type: 'start'});
    unmount();
    expect(workerMock.postMessage).toHaveBeenCalledWith({type: 'stop'});
    expect(workerMock.terminate).toHaveBeenCalledTimes(1);
  });

  it('should update elapsed time on each worker tick', () => {
    const start = Date.now();
    const {result} = renderUseGranularAgentState({telephony: channelState({stateChangeTimestamp: start})});

    act(() => {
      workerMock.onmessage({data: {type: 'tick', now: start + 65_000}});
    });

    expect(result.current.primaryChannel.elapsedTime).toBe(65);
  });

  it('should set only non-available channels Available and notify on success', async () => {
    const onStateChange = jest.fn();
    const {result} = renderUseGranularAgentState(
      {
        telephony: channelState(),
        chat: channelState({agentState: 'Idle', auxCodeId: '10'}),
        email: channelState({agentState: 'Idle', auxCodeId: '10'}),
        social: channelState(),
      },
      onStateChange
    );

    act(() => result.current.setAllAvailable());

    expect(cc.setAgentState).toHaveBeenCalledWith({
      state: 'Available',
      auxCodeId: '0',
      agentId: 'agent123',
      lastStateChangeReason: 'Available',
      channelType: ['chat', 'email'],
    });
    await waitFor(() =>
      expect(onStateChange).toHaveBeenCalledWith({
        state: 'Available',
        auxCodeId: '0',
        channelTypes: ['chat', 'email'],
        idleCode: undefined,
      })
    );
    expect(store.refreshAgentStateControl).toHaveBeenCalled();
    expect(result.current.isSettingAgentState).toBe(false);
  });

  it('should skip the request when every channel is already Available', () => {
    const {result} = renderUseGranularAgentState({
      telephony: channelState(),
      chat: channelState(),
      email: channelState(),
      social: channelState(),
    });

    act(() => result.current.setAllAvailable());

    expect(cc.setAgentState).not.toHaveBeenCalled();
  });

  it('should set all channels Idle with the chosen idle code as reason', () => {
    const {result} = renderUseGranularAgentState({
      telephony: channelState(),
      chat: channelState(),
      email: channelState(),
      social: channelState({agentState: 'Idle', auxCodeId: '11'}),
    });

    act(() => result.current.setAllIdle(idleCodes[2]));

    expect(cc.setAgentState).toHaveBeenCalledWith({
      state: 'Idle',
      auxCodeId: '11',
      agentId: 'agent123',
      lastStateChangeReason: 'Meeting',
      channelType: ['telephony', 'chat', 'email'],
    });
  });

  it('should log and reset the busy flag when the SDK rejects', async () => {
    cc.setAgentState.mockRejectedValue(new Error('boom'));
    const onStateChange = jest.fn();
    const {result} = renderUseGranularAgentState(
      {telephony: channelState({agentState: 'Idle', auxCodeId: '10'})},
      onStateChange
    );

    act(() => result.current.setAllAvailable());
    expect(result.current.isSettingAgentState).toBe(true);

    await waitFor(() => expect(result.current.isSettingAgentState).toBe(false));
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error setting agent state'),
      expect.objectContaining({module: 'useGranularAgentState', method: 'requestStateChange'})
    );
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('should apply per-channel availability as one request per target state using the last idle code', async () => {
    const {result} = renderUseGranularAgentState({
      telephony: channelState(),
      chat: channelState({agentState: 'Idle', auxCodeId: '10', lastIdleCodeChangeTimestamp: 5}),
      email: channelState(),
      social: channelState(),
    });

    let pending: Promise<boolean>;
    act(() => {
      pending = result.current.applyChannelAvailability({chat: true, email: false, social: false});
    });

    await pending;
    await waitFor(() => expect(cc.setAgentState).toHaveBeenCalledTimes(2));
    expect(cc.setAgentState).toHaveBeenNthCalledWith(1, {
      state: 'Available',
      auxCodeId: '0',
      agentId: 'agent123',
      lastStateChangeReason: 'Available',
      channelType: ['chat'],
    });
    expect(cc.setAgentState).toHaveBeenNthCalledWith(2, {
      state: 'Idle',
      auxCodeId: '10',
      agentId: 'agent123',
      lastStateChangeReason: 'Lunch Break',
      channelType: ['email', 'social'],
    });
  });

  it('should not send Idle when the Available request fails', async () => {
    cc.setAgentState.mockRejectedValue(new Error('boom'));
    const {result} = renderUseGranularAgentState({
      telephony: channelState(),
      chat: channelState({agentState: 'Idle', auxCodeId: '10'}),
    });

    const applied = result.current.applyChannelAvailability({chat: true, telephony: false});
    await expect(applied).resolves.toBe(false);
    expect(cc.setAgentState).toHaveBeenCalledTimes(1);
    expect(cc.setAgentState).toHaveBeenCalledWith(expect.objectContaining({state: 'Available', channelType: ['chat']}));
  });

  it('should fall back to the default idle code when switching channels off with none idle', async () => {
    const {result} = renderUseGranularAgentState({telephony: channelState(), chat: channelState()});

    const pending = result.current.applyChannelAvailability({telephony: false});
    await pending;

    await waitFor(() =>
      expect(cc.setAgentState).toHaveBeenCalledWith(
        expect.objectContaining({state: 'Idle', auxCodeId: '11', channelType: ['telephony']})
      )
    );
    expect(cc.setAgentState).toHaveBeenCalledTimes(1);
  });
});
