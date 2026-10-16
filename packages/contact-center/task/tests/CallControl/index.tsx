import React from 'react';
import {act, render} from '@testing-library/react';
import {runInAction} from 'mobx';
import * as helper from '../../src/helper';
import {CallControl} from '../../src';
import store, {type ITask} from '@webex/cc-store';
import {createEnabledMainTaskUIControls, mockTask} from '@webex/test-fixtures';
import {TARGET_TYPE} from '../../src/task.types';
import '@testing-library/jest-dom';

const onHoldResumeCb = jest.fn();
const onEndCb = jest.fn();
const onWrapUpCb = jest.fn();
const onRecordingToggleCb = jest.fn();

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

const resetStatusTestState = (): void => {
  runInAction(() => {
    store.store.currentTask = null;
    store.store.acceptedCampaignIds = new Set();
  });
  store.onErrorCallback = undefined;
};

// Sending a post-call summary response is one of the store actions that reports a summary status.
const submitPostCallSummary = (sendPostCallSummaryResponse: jest.Mock) =>
  store.sendPostCallSummaryResponse(
    {
      summary: 'Summary',
      feedback: 'none',
      state: 'DEFAULT',
      numberOfTimesViewed: 0,
      numberOfTimesEdited: 0,
      numberOfTimesCopied: 0,
    },
    {data: {interactionId: 'status-interaction'}, sendPostCallSummaryResponse} as unknown as ITask
  );

describe('CallControl Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStatusTestState();
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

  it('should forward summary status changes to the host callback while mounted', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue(createUseCallControlReturn());
    const onAISummaryStatusChange = jest.fn();

    const {unmount} = render(<CallControl onAISummaryStatusChange={onAISummaryStatusChange} />);
    await act(async () => {
      await submitPostCallSummary(jest.fn().mockResolvedValue(undefined));
      await submitPostCallSummary(jest.fn().mockRejectedValue(new Error('503')));
    });

    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(1, {kind: 'post-call', state: 'submitted'});
    expect(onAISummaryStatusChange).toHaveBeenNthCalledWith(2, {kind: 'post-call', state: 'response-failed'});

    unmount();
    await act(async () => {
      await submitPostCallSummary(jest.fn().mockResolvedValue(undefined));
    });
    expect(onAISummaryStatusChange).toHaveBeenCalledTimes(2);
  });

  it('should not subscribe to summary status changes without a host callback', () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue(createUseCallControlReturn());
    const subscribeSpy = jest.spyOn(store, 'onAISummaryStatusChange');

    render(<CallControl />);

    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('should deliver later statuses only to the replacement callback', async () => {
    jest.spyOn(helper, 'useCallControl').mockReturnValue(createUseCallControlReturn());
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();

    const {rerender} = render(<CallControl onAISummaryStatusChange={firstCallback} />);
    rerender(<CallControl onAISummaryStatusChange={secondCallback} />);
    await act(async () => {
      await submitPostCallSummary(jest.fn().mockResolvedValue(undefined));
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith({kind: 'post-call', state: 'submitted'});
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
