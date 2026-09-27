import React from 'react';
import {act, render, waitFor} from '@testing-library/react';
import {runInAction} from 'mobx';
import * as helper from '../../src/helper';
import {CallControl} from '../../src';
import store, {type AISummaryStatusTransition, type ITask} from '@webex/cc-store';
import {createEnabledMainTaskUIControls, makeMockTask, mockTask} from '@webex/test-fixtures';
import {TARGET_TYPE} from '../../src/task.types';
import '@testing-library/jest-dom';

const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();
const onRecordingToggleCb = jest.fn();

type AISummaryStatusTestStore = {
  store: {
    currentTask: ITask | null;
    acceptedCampaignIds: Set<string>;
    pendingAISummaryStatusTransitions: readonly AISummaryStatusTransition[];
  };
  appendAISummaryStatus: (kind: AISummaryStatusTransition['kind'], state: AISummaryStatusTransition['state']) => void;
  aiSummaryStatusSequence: number;
};

const aiSummaryStatusTestStore = store as unknown as AISummaryStatusTestStore;

const createUseCallControlReturn = (
  overrides: Partial<ReturnType<typeof helper.useCallControl>> = {}
): ReturnType<typeof helper.useCallControl> => ({
  currentTask: mockTask,
  endCall: jest.fn(),
  toggleHold: jest.fn(),
  toggleRecording: jest.fn(),
  wrapupCall: jest.fn(),
  isRecording: false,
  setIsRecording: jest.fn(),
  buddyAgents: [],
  loadBuddyAgents: jest.fn(),
  loadingBuddyAgents: false,
  transferCall: jest.fn(),
  consultCall: jest.fn(),
  endConsultCall: jest.fn(),
  consultTransfer: jest.fn(),
  consultAgentName: 'Consult Agent',
  setConsultAgentName: jest.fn(),
  holdTime: 0,
  startTimestamp: 0,
  lastTargetType: TARGET_TYPE.AGENT,
  setLastTargetType: jest.fn(),
  controls: createEnabledMainTaskUIControls(),
  isHeld: false,
  conferenceEnabled: true,
  switchToMainCall: jest.fn(),
  switchToConsult: jest.fn(),
  secondsUntilAutoWrapup: 0,
  cancelAutoWrapup: jest.fn(),
  toggleMute: jest.fn(),
  sendDtmf: jest.fn(),
  isMuted: false,
  consultConference: jest.fn(),
  exitConference: jest.fn(),
  conferenceParticipants: [],
  conferenceParticipantDropRoster: null,
  pendingParticipantDropId: null,
  participantDropAnnouncement: null,
  participantDropConfirmationTarget: null,
  participantDropConfirmationDisabled: true,
  requestParticipantDrop: jest.fn(),
  confirmParticipantDrop: jest.fn(),
  cancelParticipantDropConfirmation: jest.fn(),
  getAddressBookEntries: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
  getEntryPoints: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
  getQueuesFetcher: jest.fn().mockResolvedValue({data: [], meta: {page: 0, totalPages: 0}}),
  stateTimerLabel: null,
  stateTimerTimestamp: 0,
  consultTimerLabel: 'Consulting',
  consultTimerTimestamp: 0,
  isCampaignCall: false,
  telephonyToast: null,
  dismissTelephonyToast: jest.fn(),
  ...overrides,
});

const getMobXStrictModeMessages = (...spies: Array<jest.SpyInstance>): string[] =>
  spies
    .flatMap((spy) => spy.mock.calls)
    .map((args) => args.map((arg) => String(arg)).join(' '))
    .filter((message) => message.includes('[MobX]') && message.includes('changing'));

const resetAISummaryStatusTestState = (): void => {
  runInAction(() => {
    aiSummaryStatusTestStore.store.currentTask = null;
    aiSummaryStatusTestStore.store.acceptedCampaignIds = new Set();
    aiSummaryStatusTestStore.store.pendingAISummaryStatusTransitions = [];
  });
  aiSummaryStatusTestStore.aiSummaryStatusSequence = 0;
  store.onErrorCallback = undefined;
};

const appendAISummaryStatusTransition = (
  kind: AISummaryStatusTransition['kind'],
  state: AISummaryStatusTransition['state']
): void => {
  aiSummaryStatusTestStore.appendAISummaryStatus.call(store, kind, state);
};

const observePendingAISummaryStatusReads = (): Array<readonly AISummaryStatusTransition[]> => {
  const originalGetPending = store.getPendingAISummaryStatusTransitions.bind(store);
  const readRefs: Array<readonly AISummaryStatusTransition[]> = [];
  jest.spyOn(store, 'getPendingAISummaryStatusTransitions').mockImplementation(() => {
    const transitions = originalGetPending();
    readRefs.push(transitions);
    return transitions;
  });
  return readRefs;
};

describe('CallControl Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAISummaryStatusTestState();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders CallControlPresentational with correct props', () => {
    const useCallControlSpy = jest.spyOn(helper, 'useCallControl').mockReturnValue(createUseCallControlReturn());

    render(
      <CallControl
        onHoldResume={onHoldResumeCb}
        onEnd={onEndCb}
        onWrapUp={onWrapUpCb}
        onRecordingToggle={onRecordingToggleCb}
      />
    );

    // Assert that the useCallControl hook is called with the correct arguments
    expect(useCallControlSpy).toHaveBeenCalledWith({
      currentTask: null,
      onHoldResume: onHoldResumeCb,
      conferenceEnabled: undefined,
      onEnd: onEndCb,
      onWrapUp: onWrapUpCb,
      onRecordingToggle: onRecordingToggleCb,
      logger: store.logger,
      isMuted: false,
      onToggleMute: undefined,
      agentId: store.agentId,
      enableWxBetterTogether: false,
      widgetName: 'CallControl',
    });
  });

  it('drains AI summary status transitions in order and acknowledges before callback invocation', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    const observed: string[] = [];
    const originalAcknowledge = store.acknowledgeAISummaryStatusTransition.bind(store);
    jest.spyOn(store, 'acknowledgeAISummaryStatusTransition').mockImplementation((sequence: number) => {
      observed.push(`ack:${sequence}`);
      return originalAcknowledge(sequence);
    });
    const onAISummaryStatusChange = jest.fn((detail) => {
      observed.push(`callback:${detail.kind}:${detail.state}`);
      if (detail.kind === 'mid-call') {
        throw new Error('host callback failed');
      }
    });
    appendAISummaryStatusTransition('mid-call', 'available');
    appendAISummaryStatusTransition('post-call', 'response-failed');

    render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);

    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledTimes(2));
    expect(observed).toEqual(['ack:1', 'callback:mid-call:available', 'ack:2', 'callback:post-call:response-failed']);
    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(1, {kind: 'mid-call', state: 'available'});
    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(2, {kind: 'post-call', state: 'response-failed'});
  });

  it('leaves queued AI summary status transitions untouched when the callback is absent', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    const acknowledge = jest.spyOn(store, 'acknowledgeAISummaryStatusTransition');
    appendAISummaryStatusTransition('mid-call', 'unavailable');
    const queued = store.getPendingAISummaryStatusTransitions();

    render(<CallControl />);

    await Promise.resolve();
    expect(acknowledge).not.toHaveBeenCalled();
    expect(store.getPendingAISummaryStatusTransitions()).toBe(queued);
  });

  it('delivers AI summary statuses appended after mount through the observable queue', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    const onAISummaryStatusChange = jest.fn();

    render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);
    expect(onAISummaryStatusChange).not.toHaveBeenCalled();

    act(() => {
      appendAISummaryStatusTransition('mid-call', 'available');
    });

    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledWith({kind: 'mid-call', state: 'available'}));
    expect(store.getPendingAISummaryStatusTransitions()).toEqual([]);
  });

  it('retains queued AI summary statuses while unmounted and suppresses acknowledged replay on remount', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    const onAISummaryStatusChange = jest.fn();
    const firstMount = render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);

    firstMount.unmount();
    act(() => {
      appendAISummaryStatusTransition('post-call', 'response-failed');
    });

    const secondMount = render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);
    await waitFor(() =>
      expect(onAISummaryStatusChange).toHaveBeenCalledWith({kind: 'post-call', state: 'response-failed'})
    );
    expect(onAISummaryStatusChange).toHaveBeenCalledTimes(1);

    secondMount.unmount();
    render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);
    await Promise.resolve();

    expect(onAISummaryStatusChange).toHaveBeenCalledTimes(1);
    expect(store.getPendingAISummaryStatusTransitions()).toEqual([]);
  });

  it('drains queued AI summary statuses when the host callback is assigned after mount', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    const onAISummaryStatusChange = jest.fn();
    const {rerender} = render(<CallControl />);

    act(() => {
      appendAISummaryStatusTransition('mid-call', 'available');
      appendAISummaryStatusTransition('post-call', 'submitted');
    });
    await Promise.resolve();
    expect(store.getPendingAISummaryStatusTransitions()).toHaveLength(2);

    rerender(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);

    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledTimes(2));
    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(1, {kind: 'mid-call', state: 'available'});
    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(2, {kind: 'post-call', state: 'submitted'});
    expect(store.getPendingAISummaryStatusTransitions()).toEqual([]);
  });

  it('skips a stale queue snapshot entry when the exact head was already acknowledged', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    appendAISummaryStatusTransition('mid-call', 'available');
    appendAISummaryStatusTransition('post-call', 'submitted');
    const onAISummaryStatusChange = jest.fn();

    const PreAcknowledgeHead: React.FunctionComponent<React.PropsWithChildren<unknown>> = ({children}) => {
      const [head] = store.getPendingAISummaryStatusTransitions();
      React.useLayoutEffect(() => {
        if (head) {
          store.acknowledgeAISummaryStatusTransition(head.sequence);
        }
      }, [head]);
      return <>{children}</>;
    };

    render(
      <PreAcknowledgeHead>
        <CallControl onAISummaryStatusChange={onAISummaryStatusChange} />
      </PreAcknowledgeHead>
    );

    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledTimes(1));
    expect(onAISummaryStatusChange).toHaveBeenCalledWith({kind: 'post-call', state: 'submitted'});
    expect(store.getPendingAISummaryStatusTransitions()).toEqual([]);
  });

  it('acknowledges a throwing host callback once per transition and continues later drains', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    const onAISummaryStatusChange = jest.fn(() => {
      throw new Error('host callback failed');
    });
    const {rerender} = render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);

    act(() => {
      appendAISummaryStatusTransition('mid-call', 'available');
    });
    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledTimes(1));

    rerender(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);
    await Promise.resolve();
    expect(onAISummaryStatusChange).toHaveBeenCalledTimes(1);

    act(() => {
      appendAISummaryStatusTransition('post-call', 'response-failed');
    });
    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledTimes(2));
    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(2, {kind: 'post-call', state: 'response-failed'});
    expect(store.getPendingAISummaryStatusTransitions()).toEqual([]);
  });

  it('keeps the status drain mounted while a campaign preview transitions to accepted controls', async () => {
    const campaignTask = makeMockTask({
      data: {
        interactionId: 'campaign-preview-1',
        interaction: {
          interactionId: 'campaign-preview-1',
          outboundType: 'STANDARD_PREVIEW_CAMPAIGN',
          callProcessingDetails: {campaignType: 'preview_standard'},
        },
      },
    });
    runInAction(() => {
      aiSummaryStatusTestStore.store.currentTask = campaignTask;
      aiSummaryStatusTestStore.store.acceptedCampaignIds = new Set();
    });
    const useCallControlSpy = jest
      .spyOn(helper, 'useCallControl')
      .mockReturnValue(createUseCallControlReturn({currentTask: campaignTask}));
    const onAISummaryStatusChange = jest.fn();
    const mockOnErrorCallback = jest.fn();
    store.onErrorCallback = mockOnErrorCallback;

    render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);
    expect(useCallControlSpy).not.toHaveBeenCalled();

    act(() => {
      appendAISummaryStatusTransition('mid-call', 'available');
    });
    await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledWith({kind: 'mid-call', state: 'available'}));

    act(() => {
      store.addAcceptedCampaign('campaign-preview-1');
    });

    await waitFor(() => expect(useCallControlSpy).toHaveBeenCalled());
    expect(mockOnErrorCallback).not.toHaveBeenCalled();
  });

  it('keeps the AI summary status render read pure without a host callback', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    appendAISummaryStatusTransition('mid-call', 'unavailable');
    const initialQueue = store.getPendingAISummaryStatusTransitions();
    const readRefs = observePendingAISummaryStatusReads();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(<CallControl />);

      await Promise.resolve();
      expect(readRefs[0]).toBe(initialQueue);
      expect(store.store.pendingAISummaryStatusTransitions).toBe(initialQueue);
      expect(getMobXStrictModeMessages(warnSpy, errorSpy)).toEqual([]);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('keeps the AI summary status render read pure before host callback acknowledgement', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue({} as ReturnType<typeof helper.useCallControl>);
    appendAISummaryStatusTransition('mid-call', 'available');
    appendAISummaryStatusTransition('post-call', 'submitted');
    const initialQueue = store.getPendingAISummaryStatusTransitions();
    const readRefs = observePendingAISummaryStatusReads();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const onAISummaryStatusChange = jest.fn();

    try {
      render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);

      await waitFor(() => expect(onAISummaryStatusChange).toHaveBeenCalledTimes(2));
      expect(readRefs[0]).toBe(initialQueue);
      expect(store.store.pendingAISummaryStatusTransitions).not.toBe(initialQueue);
      expect(store.store.pendingAISummaryStatusTransitions).toEqual([]);
      expect(getMobXStrictModeMessages(warnSpy, errorSpy)).toEqual([]);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error', () => {
      const mockOnErrorCallback = jest.fn();
      store.onErrorCallback = mockOnErrorCallback;

      // Mock the useCallControl to throw an error
      jest.spyOn(helper, 'useCallControl').mockImplementation(() => {
        throw new Error('Test error in useCallControl');
      });

      const {container} = render(
        <CallControl
          onHoldResume={onHoldResumeCb}
          onEnd={onEndCb}
          onWrapUp={onWrapUpCb}
          onRecordingToggle={onRecordingToggleCb}
        />
      );

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(mockOnErrorCallback).toHaveBeenCalledWith('CallControl', Error('Test error in useCallControl'));
    });

    it('should not throw when onErrorCallback is not set', () => {
      store.onErrorCallback = undefined;

      // Mock the useCallControl to throw an error
      jest.spyOn(helper, 'useCallControl').mockImplementation(() => {
        throw new Error('Test error in useCallControl');
      });

      const {container} = render(<CallControl onHoldResume={onHoldResumeCb} onEnd={onEndCb} onWrapUp={onWrapUpCb} />);

      // The fallback should still render an empty fragment
      expect(container.firstChild).toBeNull();
    });
  });
});
