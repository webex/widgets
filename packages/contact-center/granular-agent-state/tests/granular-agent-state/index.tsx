import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {GranularAgentState} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: {
    cc: {setAgentState: jest.fn()},
    agentId: 'testAgentId',
    idleCodes: [{id: '10', name: 'Lunch Break', isSystem: false, isDefault: false}],
    channelStatesMap: {
      telephony: {
        agentState: 'Available',
        pendingIdle: false,
        auxCodeId: '0',
        availableChannelCount: 1,
        totalChannelCount: 1,
        stateChangeReason: '',
        stateChangeTimestamp: Date.now(),
      },
    },
    isGranularAgentStateActive: true,
    refreshAgentStateControl: jest.fn(),
    logger: {log: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn()},
    onErrorCallback: jest.fn(),
  },
  ERROR_TRIGGERING_IDLE_CODES: {RONA: 'RONA'},
}));

const mockStore = store as unknown as {isGranularAgentStateActive: boolean; onErrorCallback: jest.Mock};

describe('GranularAgentState Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.Worker = jest.fn(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    })) as unknown as typeof Worker;
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    if (typeof window.HTMLElement.prototype.attachInternals !== 'function') {
      window.HTMLElement.prototype.attachInternals = jest.fn();
    }
    mockStore.isGranularAgentStateActive = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the granular component with store data for V2 sessions', () => {
    const useGranularAgentStateSpy = jest.spyOn(helper, 'useGranularAgentState');
    const onStateChange = jest.fn();

    render(<GranularAgentState onStateChange={onStateChange} />);

    expect(useGranularAgentStateSpy).toHaveBeenCalledWith({
      cc: store.cc,
      agentId: 'testAgentId',
      idleCodes: store.idleCodes,
      channelStatesMap: store.channelStatesMap,
      logger: store.logger,
      onStateChange,
    });
    expect(screen.getByTestId('granular-state-pill')).toHaveTextContent('Available');
  });

  it('should render nothing and not start the hook for V1 sessions', () => {
    mockStore.isGranularAgentStateActive = false;
    const useGranularAgentStateSpy = jest.spyOn(helper, 'useGranularAgentState');

    const {container} = render(<GranularAgentState />);

    expect(container).toBeEmptyDOMElement();
    expect(useGranularAgentStateSpy).not.toHaveBeenCalled();
  });

  it('should report render errors through onErrorCallback', () => {
    jest.spyOn(helper, 'useGranularAgentState').mockImplementation(() => {
      throw new Error('Test error in useGranularAgentState');
    });

    const {container} = render(<GranularAgentState />);

    expect(container).toBeEmptyDOMElement();
    expect(mockStore.onErrorCallback).toHaveBeenCalledWith('GranularAgentState', expect.any(Error));
  });
});
