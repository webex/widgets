import {autorun, isObservable, runInAction} from 'mobx';
import type {IReactionDisposer} from 'mobx';
import {mockCC, mockProfile, mockTask} from '@webex/test-fixtures';
import {aiSummaryFixtures} from '../../test-fixtures/src/aiSummaryFixtures';
import store from '../src/storeEventsWrapper';
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
      aiSummaries: {},
      register: jest.fn().mockResolvedValue(mockProfile),
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
      cc.aiSummaries = {};
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
          states.push(store.cc.aiSummaries[INTERACTION_ID]?.[role]?.status ?? 'idle');
        })
      );

      const pending =
        kind === 'mid-call' ? store.requestMidCallSummary('CONSULT', task) : store.requestPostCallSummary(task);
      const summary = aiSummaryFixtures.initiatingMidCall.plainText;
      reply.resolve(summary);
      await pending;

      expect(states).toEqual(['idle', 'loading', 'ready']);
      expect(store.cc.aiSummaries[INTERACTION_ID][role].content).toBe(summary);
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
        states.push(store.cc.aiSummaries[INTERACTION_ID]?.initiator?.status ?? 'idle');
      })
    );

    await store.requestMidCallSummary('CONSULT', task);

    expect(states).toEqual(['idle', 'loading', 'error']);
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
          responses.push(store.cc.aiSummaries[INTERACTION_ID][role].response);
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
      expect(store.cc.aiSummaries[INTERACTION_ID][role].content).toBe(summary);
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
    const response = cc.aiSummaries[INTERACTION_ID]['post-call'].response;
    const differentTask = {...task};

    expect(store.editAISummary('post-call', 'initialContactReason', 'Stale edit', summary, differentTask)).toBe(false);
    expect(store.recordAISummaryCopied('post-call', summary, differentTask)).toBe(false);
    expect(store.setAISummaryFeedback('post-call', 'thumbs_up', summary, differentTask)).toBe(false);
    expect(cc.aiSummaries[INTERACTION_ID]['post-call'].response).toBe(response);
  });

  it('keeps summary notifications and existing content after registering the same SDK instance again', async () => {
    const summary = aiSummaryFixtures.initiatingMidCall.plainText;
    task.requestMidCallSummary = jest.fn().mockResolvedValue(summary);
    await store.requestMidCallSummary('CONSULT', task);
    const previous = cc.aiSummaries;

    await store.registerCC(webex);

    expect(cc.aiSummaries).toBe(previous);
    const contents: Array<Summary | undefined> = [];
    disposers.push(
      autorun(() => {
        contents.push(store.cc.aiSummaries[INTERACTION_ID]?.initiator?.content);
      })
    );
    runInAction(() => {
      cc.aiSummaries = {};
    });

    expect(contents).toEqual([summary, undefined]);
  });
});
