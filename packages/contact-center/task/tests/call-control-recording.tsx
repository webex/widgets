import React from 'react';
import {render, screen, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import {EventEmitter} from 'events';
import store, {TASK_EVENTS, IContactCenter} from '@webex/cc-store';
import {mockTask, mockCC, createEnabledMainTaskUIControls} from '@webex/test-fixtures';
import {CallControl} from '../src/CallControl';

const INTERACTION_ID = 'interaction-recording-1';
const AGENT_ID = 'agent-recording-1';

/**
 * Task double as a class instance, like the SDK's Task: MobX leaves non-plain
 * objects by reference, so a plain object would not behave like production here.
 * Extends EventEmitter so SDK-style emits reach the widget's listeners.
 */
class FakeTask extends EventEmitter {
  public data;
  public uiControls;
  public pauseRecording = jest.fn().mockResolvedValue({});
  public resumeRecording = jest.fn().mockResolvedValue({});

  constructor(isPaused: boolean) {
    super();
    this.uiControls = createEnabledMainTaskUIControls();
    this.data = {
      ...mockTask.data,
      interactionId: INTERACTION_ID,
      agentId: AGENT_ID,
      interaction: {
        ...mockTask.data.interaction,
        interactionId: INTERACTION_ID,
        mediaType: 'telephony',
        mediaChannel: 'telephony',
        state: 'connected',
        callProcessingDetails: {
          ...mockTask.data.interaction.callProcessingDetails,
          recordingStarted: true,
          // taskDataNormalizer coerces these to real booleans before widgets see them.
          isPaused,
          recordInProgress: !isPaused,
          pauseResumeEnabled: true,
        },
        participants: {
          [AGENT_ID]: {id: AGENT_ID, pType: 'Agent', hasJoined: true, joinTimestamp: Date.now()},
        },
        media: {},
      },
    };
  }

  /** Mirrors the SDK replacing task.data from the websocket payload. */
  setPaused(isPaused: boolean) {
    this.data = {
      ...this.data,
      interaction: {
        ...this.data.interaction,
        callProcessingDetails: {
          ...this.data.interaction.callProcessingDetails,
          isPaused,
          recordInProgress: !isPaused,
        },
      },
    };
  }
}

const createTask = (isPaused: boolean) => new FakeTask(isPaused);

const promoteTask = (task: FakeTask) => {
  store.store.cc = {
    ...mockCC,
    agentConfig: {agentId: AGENT_ID},
    taskManager: {getAllTasks: jest.fn().mockReturnValue({[INTERACTION_ID]: task})},
  } as unknown as IContactCenter;
  store.store.agentId = AGENT_ID;
  // Registers the store's own task listeners (refreshTaskList on recording
  // pause/resume, etc.) exactly as production does.
  store.handleIncomingTask(task as unknown as Parameters<typeof store.handleIncomingTask>[0]);
  store.setCurrentTask(task as unknown as Parameters<typeof store.setCurrentTask>[0]);
};

/** What the SDK does when the ContactRecordingPaused websocket event arrives. */
const emitRecordingPaused = (task: FakeTask) =>
  act(() => {
    task.setPaused(true);
    task.emit(TASK_EVENTS.TASK_RECORDING_PAUSED, task);
  });

const emitRecordingResumed = (task: FakeTask) =>
  act(() => {
    task.setPaused(false);
    task.emit(TASK_EVENTS.TASK_RECORDING_RESUMED, task);
  });

const recordButtonLabel = () => screen.getByTestId('call-control:recording-toggle').getAttribute('aria-label');

describe('CallControl recording pause/resume state', () => {
  beforeAll(() => {
    store.setDeviceType('BROWSER');
    store.store.featureFlags = {isEndCallEnabled: true, isEndConsultEnabled: true, webRtcEnabled: true};
    store.store.logger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
    };
  });

  it('should show pause action while recording is active', () => {
    promoteTask(createTask(false));
    render(<CallControl />);

    expect(recordButtonLabel()).toBe('Pause Recording');
  });

  it('should show resume action when the SDK reports recording paused', () => {
    const task = createTask(false);
    promoteTask(task);
    render(<CallControl />);

    emitRecordingPaused(task);

    expect(recordButtonLabel()).toBe('Resume Recording');
  });

  it('should show pause action again when the SDK reports recording resumed', () => {
    const task = createTask(false);
    promoteTask(task);
    render(<CallControl />);

    emitRecordingPaused(task);
    emitRecordingResumed(task);

    expect(recordButtonLabel()).toBe('Pause Recording');
  });

  it('should show resume action for a task that is already paused on mount', () => {
    promoteTask(createTask(true));
    render(<CallControl />);

    expect(recordButtonLabel()).toBe('Resume Recording');
  });

  it('should keep the paused state when a later task event refreshes the store', () => {
    const task = createTask(false);
    promoteTask(task);
    render(<CallControl />);

    emitRecordingPaused(task);

    // Later websocket events re-promote the task, handing call control a freshly
    // cloned currentTask, which must not reset the paused state.
    act(() => {
      task.emit(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, task.uiControls);
    });

    expect(recordButtonLabel()).toBe('Resume Recording');
  });

  it('should keep the paused state when call control remounts while paused', () => {
    const task = createTask(false);
    promoteTask(task);
    const firstRender = render(<CallControl />);

    emitRecordingPaused(task);
    firstRender.unmount();
    render(<CallControl />);

    expect(recordButtonLabel()).toBe('Resume Recording');
  });
});
