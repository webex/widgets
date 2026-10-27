import {autorun, isObservable, runInAction} from 'mobx';
import type {IReactionDisposer} from 'mobx';
import {mockCC, mockProfile, mockTask} from '@webex/test-fixtures';
import {aiSummaryFixtures} from '../../test-fixtures/src/aiSummaryFixtures';
import store from '../src/storeEventsWrapper';
import {TASK_EVENTS} from '../src/store.types';
import type {AISummaryEntry, IContactCenter, ITask, WithWebex} from '../src/store.types';

type Summary = NonNullable<AISummaryEntry['content']>;

const INTERACTION_ID = 'summary-observability-interaction';

const deferredSummary = () => {
  let resolve: (summary: Summary) => void = () => undefined;
  const promise = new Promise<Summary>((complete) => {
    resolve = complete;
  });
  return {promise, resolve};
};

describe('AI summary notifications with the real MobX store', () => {
  let cc: IContactCenter;
  let webex: WithWebex['webex'];
  let task: ITask;
  const disposers: IReactionDisposer[] = [];

  beforeEach(async () => {
    cc = {
      ...mockCC,
      register: jest.fn().mockResolvedValue(mockProfile),
      taskManager: {
        ...mockCC.taskManager,
        getAllTasks: jest.fn(() => ({[INTERACTION_ID]: task})),
      },
    };
    webex = {cc, logger: cc.LoggerProxy};
    task = {
      ...mockTask,
      data: {...mockTask.data, interactionId: INTERACTION_ID},
      aiSummaryCapabilities: {midCallEnabled: true, postCallEnabled: true},
    };
    await store.registerCC(webex);
  });

  afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
    runInAction(() => {
      store.store.aiSummaries = {};
      store.store.currentTask = null;
    });
  });

  it.each(['mid-call', 'post-call'] as const)(
    'notifies observers when a %s request starts and completes without another task event',
    async (kind) => {
      const reply = deferredSummary();
      task.requestMidCallSummary = jest.fn().mockReturnValue(reply.promise);
      task.requestPostCallSummary = jest.fn().mockReturnValue(reply.promise);
      const role = kind === 'mid-call' ? 'initiator' : 'post-call';
      const states: string[] = [];
      disposers.push(
        autorun(() => {
          states.push(store.aiSummaries[INTERACTION_ID]?.[role]?.status ?? 'idle');
        })
      );

      const pending =
        kind === 'mid-call' ? store.requestMidCallSummary('CONSULT', task) : store.requestPostCallSummary(task);
      const summary = aiSummaryFixtures.initiatingMidCall.plainText;
      reply.resolve(summary);
      await pending;

      expect(states).toEqual(['idle', 'loading', 'ready']);
      expect(store.aiSummaries[INTERACTION_ID][role].content).toBe(summary);
      expect(store.cc).toBe(cc);
      expect(isObservable(summary)).toBe(false);
      expect(isObservable(cc.taskManager)).toBe(false);
    }
  );

  it('notifies observers when a failed consult-summary request leaves the loading state', async () => {
    task.requestMidCallSummary = jest.fn().mockRejectedValue(new Error('Summary unavailable'));
    const states: string[] = [];
    disposers.push(
      autorun(() => {
        states.push(store.aiSummaries[INTERACTION_ID]?.initiator?.status ?? 'idle');
      })
    );

    await store.requestMidCallSummary('CONSULT', task);

    expect(states).toEqual(['idle', 'loading', 'error']);
  });

  it('notifies observers of receiver summary replacement and confirmed feedback', async () => {
    const on = jest.fn();
    task = {...task, on, off: jest.fn()};
    runInAction(() => {
      store.store.currentTask = task;
    });
    task = store.currentTask;
    (store as unknown as {registerTaskEventListeners: (task: ITask) => void}).registerTaskEventListeners(task);
    const receive = on.mock.calls.find(([event]) => event === TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED)[1] as (
      summary: Summary
    ) => void;
    const entries: Array<AISummaryEntry | undefined> = [];
    disposers.push(autorun(() => entries.push(store.aiSummaries[INTERACTION_ID]?.receiver)));

    const unavailable: Summary = {conversationId: INTERACTION_ID, areTranscriptsAvailable: false};
    const summary = aiSummaryFixtures.receivingMidCall.adaptiveCard;
    receive(unavailable);
    receive(summary);

    let confirmFeedback: () => void = () => undefined;
    Object.assign(cc.apiAIAssistant, {
      sendEvent: jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          confirmFeedback = resolve;
        })
      ),
    });
    const pending = store.setReceiverSummaryFeedback('thumbs_up', summary, task);
    expect(entries.map((entry) => entry?.content)).toEqual([undefined, unavailable, summary, summary]);
    expect(entries[3]).toMatchObject({feedbackPending: true, response: {feedback: 'none'}});

    confirmFeedback();
    await pending;

    expect(entries).toHaveLength(5);
    expect(entries[4]).toMatchObject({feedbackPending: false, response: {feedback: 'thumbs_up'}});
    expect(entries[4].content).toBe(summary);
  });

  it.each(['initiator', 'post-call'] as const)(
    'notifies observers of local %s response changes while preserving the SDK summary',
    async (role) => {
      runInAction(() => {
        store.store.currentTask = task;
      });
      task = store.currentTask;
      const summary = aiSummaryFixtures.postCall.structured;
      task.requestMidCallSummary = jest.fn().mockResolvedValue(summary);
      task.requestPostCallSummary = jest.fn().mockResolvedValue(summary);
      await (role === 'initiator' ? store.requestMidCallSummary('CONSULT', task) : store.requestPostCallSummary(task));
      const responses: AISummaryEntry['response'][] = [];
      disposers.push(
        autorun(() => {
          responses.push(store.aiSummaries[INTERACTION_ID][role].response);
        })
      );

      expect(store.editAISummary(role, 'initialContactReason', 'Edited reason', summary, task)).toBe(true);
      expect(store.recordAISummaryCopied(role, summary, task)).toBe(true);
      expect(store.setAISummaryFeedback(role, 'thumbs_up', summary, task)).toBe(true);

      expect(responses).toHaveLength(4);
      expect(responses[3]).toMatchObject({
        summary: {initialContactReason: 'Edited reason'},
        numberOfTimesEdited: 1,
        numberOfTimesCopied: 1,
        feedback: 'thumbs_up',
      });
      expect(store.aiSummaries[INTERACTION_ID][role].content).toBe(summary);
      expect(summary.sections.initialContactReason).toBe('Customer called about an invoice discrepancy.');
      expect(isObservable(summary)).toBe(false);
    }
  );

  it('rejects local response changes from a different task with the same interaction ID', async () => {
    runInAction(() => {
      store.store.currentTask = task;
    });
    task = store.currentTask;
    const summary = aiSummaryFixtures.postCall.structured;
    task.requestPostCallSummary = jest.fn().mockResolvedValue(summary);
    await store.requestPostCallSummary(task);
    const response = store.aiSummaries[INTERACTION_ID]['post-call'].response;
    const differentTask = {...task};

    expect(store.editAISummary('post-call', 'initialContactReason', 'Stale edit', summary, differentTask)).toBe(false);
    expect(store.recordAISummaryCopied('post-call', summary, differentTask)).toBe(false);
    expect(store.setAISummaryFeedback('post-call', 'thumbs_up', summary, differentTask)).toBe(false);
    expect(store.aiSummaries[INTERACTION_ID]['post-call'].response).toBe(response);
  });

  it('preserves summaries for the same SDK instance and clears them when the SDK changes', async () => {
    const summary = aiSummaryFixtures.initiatingMidCall.plainText;
    task.requestMidCallSummary = jest.fn().mockResolvedValue(summary);
    await store.requestMidCallSummary('CONSULT', task);
    const api = cc.apiAIAssistant;
    const previous = store.aiSummaries;

    await store.registerCC(webex);

    expect(cc.apiAIAssistant).toBe(api);
    expect(api).not.toHaveProperty('aiSummaries');
    expect(store.aiSummaries).toBe(previous);
    const contents: Array<Summary | undefined> = [];
    disposers.push(
      autorun(() => {
        contents.push(store.aiSummaries[INTERACTION_ID]?.initiator?.content);
      })
    );
    const nextCC = {...cc};
    await store.registerCC({cc: nextCC, logger: nextCC.LoggerProxy});

    expect(contents).toEqual([summary, undefined]);
    expect(store.aiSummaries).toEqual({});
    expect(nextCC.apiAIAssistant).toBe(api);
    expect(api).not.toHaveProperty('aiSummaries');
  });

  it.each(['before', 'after'] as const)(
    'uses SDK configuration when hydration occurs %s silent registration',
    async (hydrateTiming) => {
      const previousProfile = store.agentProfile;
      const previousAgentId = store.agentId;
      const previousFeatureFlags = store.featureFlags;
      const previousGetAllTasks = cc.taskManager.getAllTasks;
      const sessionId = 'silently-restored-session';
      Object.assign(task, {
        on: jest.fn(),
        off: jest.fn(),
        aiSummaryCapabilities: {midCallEnabled: false, postCallEnabled: false},
        setFeatureEnablement: (flags: ITask['aiSummaryCapabilities']) => {
          Object.assign(task.aiSummaryCapabilities, {
            midCallEnabled: flags.midCallEnabled,
            postCallEnabled: flags.postCallEnabled,
          });
        },
      });
      cc.taskManager.getAllTasks = jest.fn(() => ({[INTERACTION_ID]: task}));
      webex.credentials = {getOrgId: () => 'sdk-org'};
      runInAction(() => {
        store.store.agentProfile = {};
        store.store.agentId = '';
      });
      cc.register = jest.fn(async () => {
        if (hydrateTiming === 'before') store.handleTaskHydrate(task);
        return {
          ...mockProfile,
          orgId: undefined,
          isAgentLoggedIn: true,
          agentSessionId: sessionId,
          aiFeature: {generatedSummaries: {consultTransferSummariesEnabled: true, wrapUpSummariesEnabled: true}},
        };
      });

      try {
        await store.registerCC(webex);
        if (hydrateTiming === 'after') store.handleTaskHydrate(task);
        await Promise.resolve();

        expect(store.agentProfile.orgId).toBe('sdk-org');
        expect(task.aiSummaryCapabilities).toEqual({midCallEnabled: true, postCallEnabled: true});
      } finally {
        store.handleTaskRemove(task);
        cc.taskManager.getAllTasks = previousGetAllTasks;
        runInAction(() => {
          store.store.agentProfile = previousProfile;
          store.store.agentId = previousAgentId;
          store.store.featureFlags = previousFeatureFlags;
        });
      }
    }
  );
});
