import store, {ITask, PostCallDraftCaptureToken} from '@webex/cc-store';
import {aiSummaryFixtures} from '@webex/test-fixtures';
import type {AISummary, AISummaryResponse} from '@webex/contact-center';
import {TASK_EVENTS} from '@webex/contact-center';
import {EventEmitter} from 'events';
import {
  completeWrapupWithSummary,
  editPostCallSummary,
  getPostCallSummaryView,
  requestPostCallSummaryForReason,
  retryPostCallSummary,
  setPostCallSummaryFeedback,
} from '../src/ai-summary-post-call';

type PostCallTestTask = ITask & {
  aiSummaryCapabilities: ITask['aiSummaryCapabilities'];
  requestPostCallSummary: jest.Mock<Promise<AISummary>, []>;
  sendPostCallSummaryResponse: jest.Mock<Promise<void>, [AISummaryResponse]>;
  wrapup: jest.Mock<Promise<unknown>, [{wrapUpReason: string; auxCodeId: string}]>;
};

const deferred = <T = unknown>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return {promise, resolve, reject};
};

describe('ai-summary-post-call', () => {
  const createPostCallTask = (overrides: Partial<PostCallTestTask> = {}): PostCallTestTask => {
    const events = new EventEmitter();
    return {
      data: {
        agentId: 'agent-a',
        interactionId: 'interaction-main-1',
        interaction: {
          interactionId: 'interaction-main-1',
          mainInteractionId: 'interaction-main-1',
          mediaType: 'telephony',
          media: {
            'media-main': {mType: 'mainCall', mediaResourceId: 'interaction-main-1'},
          },
        },
      },
      aiSummaryCapabilities: {midCallEnabled: true, postCallEnabled: true},
      requestPostCallSummary: jest.fn().mockResolvedValue(aiSummaryFixtures.postCall.structured),
      sendPostCallSummaryResponse: jest.fn().mockResolvedValue(undefined),
      wrapup: jest.fn().mockResolvedValue(undefined),
      on: events.on.bind(events),
      off: events.off.bind(events),
      emit: events.emit.bind(events),
      ...overrides,
    } as PostCallTestTask;
  };

  const resetStoreAISummaryState = (): void => {
    store.store.agentId = 'agent-a';
    store.store.isAgentLoggedIn = true;
    store.store.aiSummaryCapabilities = {};
    store.store.aiSummaryCurrentOwners = {};
    store.store.aiSummaryOwnerStates = {};
    store.store.aiSummaryPendingRequests = {};
    store.store.aiSummaryLastResults = {};
    store.store.pendingAISummaryStatusTransitions = [];
    store['aiSummaryLatestFreshness'] = {};
    store['aiSummaryLatestRequestSequences'] = {};
    store['retiredAISummaryInteractions'].clear();
    store['aiSummaryFeatureArrivalOrder'] = 0;
    store['aiSummaryPayloadArrivalOrder'] = 0;
    store['aiSummaryRequestSequence'] = 0;
    store['aiSummaryStatusSequence'] = 0;
    store['aiSummaryContentRevision'] = 0;
    store['aiSummaryOwnershipGeneration'] = 0;
    store['aiSummaryPostCallGeneration'] = 0;
    store['aiSummarySeededCapabilityTasks'] = new WeakSet();
    store['aiSummaryOwnerTasks'] = {};
    store['aiSummaryPendingRequestTasks'] = {};
    Object.keys(store['aiSummaryWrappedUpSubscriptions']).forEach((key) => {
      store['detachAISummaryWrappedUpSubscription'](key);
    });
    store['aiSummaryWrappedUpObservedOwnerKeys'].clear();
    store['aiSummaryPendingOwnershipCaptures'] = {};
    store['aiSummaryAppliedOwnershipCaptureIds'].clear();
    store['aiSummaryObservedOwnershipBoundaries'].clear();
    store['aiSummaryTopologySignatures'] = {};
    store['postCallDraftCaptures'].clear();
  };

  beforeEach(resetStoreAISummaryState);

  afterEach(() => {
    jest.restoreAllMocks();
    resetStoreAISummaryState();
  });

  it('projects editable post-call content and treats card-only content as unavailable', () => {
    jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue({
      key: 'post-call:post-call',
      eligible: true,
      surface: 'content',
      requestPending: false,
      content: {type: 'card', adaptiveCard: {type: 'AdaptiveCard'}},
      contentRevision: 4,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none',
      controlsDisabled: true,
    } as ReturnType<typeof store.getAISummaryViewModel> & {controlsDisabled: boolean});

    expect(getPostCallSummaryView()).toMatchObject({
      state: 'unavailable',
      content: {type: 'text', summaryText: ''},
      contentRevision: 4,
      controlsDisabled: true,
    });
  });

  it('returns an eligible omitted view before reason commit and generating for the first pending request', () => {
    const viewModel = {
      key: 'post-call:post-call' as const,
      eligible: true,
      surface: 'omitted' as const,
      requestPending: false,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none' as const,
    };
    const viewSpy = jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue(viewModel);

    expect(getPostCallSummaryView()).toMatchObject({
      state: 'omitted',
      requestPending: false,
    });

    viewSpy.mockReturnValue({...viewModel, surface: 'generating', requestPending: true});

    expect(getPostCallSummaryView()).toMatchObject({
      state: 'generating',
      requestPending: true,
      completionEscape: false,
    });

    viewSpy.mockReturnValue({...viewModel, surface: 'generating', requestPending: true, completionEscape: true});

    expect(getPostCallSummaryView()).toMatchObject({
      state: 'generating',
      requestPending: true,
      completionEscape: true,
    });
  });

  it('requests reason commits and retries through closed store triggers', async () => {
    const requestSpy = jest.spyOn(store, 'requestPostCallSummary').mockResolvedValue({outcome: 'blocked'});

    await expect(requestPostCallSummaryForReason('reason-1', 7)).resolves.toEqual({outcome: 'blocked'});
    await expect(retryPostCallSummary()).resolves.toEqual({outcome: 'blocked'});
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      {type: 'reason-commit', reasonId: 'reason-1', selectionRevision: 7},
      undefined
    );
    expect(requestSpy).toHaveBeenNthCalledWith(2, {type: 'retry'}, undefined);
  });

  it('projects the store-owned completion escape through retry-pending post-call views', async () => {
    resetStoreAISummaryState();
    const retry = (() => {
      let reject: (reason?: unknown) => void = () => undefined;
      const promise = new Promise<AISummary>((_resolve, promiseReject) => {
        reject = promiseReject;
      });
      return {promise, reject};
    })();
    const task = createPostCallTask({
      requestPostCallSummary: jest
        .fn()
        .mockRejectedValueOnce(new Error('initial failure'))
        .mockReturnValueOnce(retry.promise),
    });

    await expect(requestPostCallSummaryForReason('reason-1', 1, task)).resolves.toEqual({outcome: 'failed'});
    expect(getPostCallSummaryView(task)).toMatchObject({
      state: 'generic-error',
      requestPending: false,
      completionEscape: true,
    });

    const retryRequest = retryPostCallSummary(task);
    expect(getPostCallSummaryView(task)).toMatchObject({
      state: 'generating',
      requestPending: true,
      completionEscape: true,
    });

    retry.reject(new Error('retry failure'));
    await expect(retryRequest).resolves.toEqual({outcome: 'failed'});
  });

  it('allows completion during Retry after a terminal generation error without requiring a draft response', async () => {
    const retry = deferred<AISummary>();
    const task = createPostCallTask({
      requestPostCallSummary: jest
        .fn()
        .mockRejectedValueOnce(new Error('initial failure'))
        .mockReturnValueOnce(retry.promise),
    });
    const captureSpy = jest.spyOn(store, 'capturePostCallDraft');

    await expect(requestPostCallSummaryForReason('reason-1', 1, task)).resolves.toEqual({outcome: 'failed'});
    const retryRequest = retryPostCallSummary(task);

    expect(getPostCallSummaryView(task)).toMatchObject({
      state: 'generating',
      requestPending: true,
      completionEscape: true,
    });
    await expect(
      completeWrapupWithSummary({
        task,
        wrapUpReason: 'Escalated',
        auxCodeId: 'aux-code-escalated',
        responseRequired: getPostCallSummaryView(task)?.state === 'content',
      })
    ).resolves.toEqual({wrapup: 'succeeded', response: 'not-required'});
    expect(captureSpy).not.toHaveBeenCalled();
    expect(task.sendPostCallSummaryResponse).not.toHaveBeenCalled();

    retry.reject(new Error('retry failure'));
    await expect(retryRequest).resolves.toEqual({outcome: 'stale'});
  });

  it('retains edited drafts through reason regeneration and repeated close/reopen projection', async () => {
    const regeneration = deferred<AISummary>();
    const task = createPostCallTask({
      requestPostCallSummary: jest
        .fn()
        .mockResolvedValueOnce(aiSummaryFixtures.postCall.structured)
        .mockReturnValueOnce(regeneration.promise),
    });

    await expect(requestPostCallSummaryForReason('reason-1', 1, task)).resolves.toEqual({outcome: 'accepted'});
    const initialView = getPostCallSummaryView(task);
    expect(initialView?.state).toBe('content');
    expect(
      editPostCallSummary(
        {key: 'initialContactReason', value: 'Edited draft retained across reopen.'},
        initialView?.contentRevision ?? 0,
        task
      )
    ).toBe(true);

    const regenerationRequest = requestPostCallSummaryForReason('reason-2', 2, task);
    const pendingView = getPostCallSummaryView(task);
    const reopenedView = getPostCallSummaryView(task);

    expect(pendingView).toMatchObject({
      state: 'content',
      requestPending: true,
      content: expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({key: 'initialContactReason', value: 'Edited draft retained across reopen.'}),
        ]),
      }),
    });
    expect(reopenedView).toEqual(pendingView);

    regeneration.reject(new Error('regeneration failed'));
    await expect(regenerationRequest).resolves.toEqual({outcome: 'failed'});
    expect(getPostCallSummaryView(task)).toMatchObject({
      state: 'content',
      requestPending: false,
      content: expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({key: 'initialContactReason', value: 'Edited draft retained across reopen.'}),
        ]),
      }),
    });
  });

  it('projects resolution-absent structured summaries without an Outcome field', async () => {
    const task = createPostCallTask({
      requestPostCallSummary: jest.fn().mockResolvedValue(aiSummaryFixtures.postCall.resolutionAbsent),
    });

    await expect(requestPostCallSummaryForReason('reason-1', 1, task)).resolves.toEqual({outcome: 'accepted'});
    const view = getPostCallSummaryView(task);

    expect(view?.state).toBe('content');
    expect(view?.content).toMatchObject({
      type: 'sections',
      sections: [expect.objectContaining({key: 'initialContactReason'}), expect.objectContaining({key: 'nextSteps'})],
    });
    if (view?.content.type === 'sections') {
      expect(view.content.resolution).toBeUndefined();
    }
  });

  it('routes edits and local feedback through exact post-call keys', () => {
    const editSpy = jest.spyOn(store, 'editAISummary').mockReturnValue(true);
    const feedbackSpy = jest.spyOn(store, 'setPostCallSummaryFeedback').mockReturnValue(true);

    expect(editPostCallSummary({key: 'summaryText', value: 'Edited'}, 2)).toBe(true);
    expect(setPostCallSummaryFeedback('dislike', 2)).toBe(true);
    expect(editSpy).toHaveBeenCalledWith('post-call', 'post-call', {key: 'summaryText', value: 'Edited'}, 2);
    expect(feedbackSpy).toHaveBeenCalledWith('dislike', 2);
  });

  it('wraps up without a summary response when no draft is required', async () => {
    const task = {wrapup: jest.fn().mockResolvedValue(undefined)};
    const captureSpy = jest.spyOn(store, 'capturePostCallDraft');
    const markCompletedSpy = jest.spyOn(store, 'markPostCallWrapupCompleted');

    await expect(
      completeWrapupWithSummary({
        task: task as never,
        wrapUpReason: 'Resolved',
        auxCodeId: 'aux-1',
        responseRequired: false,
      })
    ).resolves.toEqual({wrapup: 'succeeded', response: 'not-required'});
    expect(task.wrapup).toHaveBeenCalledWith({wrapUpReason: 'Resolved', auxCodeId: 'aux-1'});
    expect(captureSpy).not.toHaveBeenCalled();
    expect(markCompletedSpy).toHaveBeenCalledWith('aux-1', task);
  });

  it('captures before wrap-up and sends the frozen response only after wrap-up succeeds', async () => {
    const task = {wrapup: jest.fn().mockResolvedValue(undefined)};
    const token = Symbol('capture');
    const order: string[] = [];
    const captureSpy = jest.spyOn(store, 'capturePostCallDraft').mockImplementation(() => {
      order.push('capture');
      return token as never;
    });
    task.wrapup.mockImplementation(async () => {
      order.push('wrapup');
    });
    jest.spyOn(store, 'freezeAndSendPostCallSummary').mockImplementation(async () => {
      order.push('send');
      return {wrapup: 'succeeded', response: 'submitted'};
    });

    await expect(
      completeWrapupWithSummary({
        task: task as never,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: true,
      })
    ).resolves.toEqual({wrapup: 'succeeded', response: 'submitted'});
    expect(order).toEqual(['capture', 'wrapup', 'send']);
    expect(captureSpy).toHaveBeenCalledWith('aux-code-9', task);
    expect(task.wrapup).toHaveBeenCalledWith({wrapUpReason: 'Human label', auxCodeId: 'aux-code-9'});
  });

  it('commits successful wrap-up before the summary response send settles', async () => {
    const task = {wrapup: jest.fn().mockResolvedValue(undefined)};
    const token = Symbol('capture');
    const responseSend = deferred<{wrapup: 'succeeded'; response: 'submitted'}>();
    const order: string[] = [];
    const setCurrentTaskSpy = jest.spyOn(store, 'setCurrentTask').mockImplementation(() => undefined);
    const setStateSpy = jest.spyOn(store, 'setState').mockImplementation(() => undefined);
    const completionObserver = jest.fn();

    jest.spyOn(store, 'capturePostCallDraft').mockReturnValue(token as never);
    task.wrapup.mockImplementation(async () => {
      order.push('wrapup');
    });
    jest.spyOn(store, 'freezeAndSendPostCallSummary').mockImplementation(() => {
      order.push('send-start');
      return responseSend.promise;
    });

    const completion = completeWrapupWithSummary({
      task: task as never,
      wrapUpReason: 'Human label',
      auxCodeId: 'aux-code-9',
      responseRequired: true,
      onWrapupCommitted: () => {
        order.push('commit');
        store.setCurrentTask(task as never);
        store.setState({developerName: 'ENGAGED', name: 'Engaged'});
      },
    });
    void completion.then(completionObserver);

    await Promise.resolve();
    await Promise.resolve();

    expect(order).toEqual(['wrapup', 'commit', 'send-start']);
    expect(setCurrentTaskSpy).toHaveBeenCalledWith(task);
    expect(setStateSpy).toHaveBeenCalledWith({developerName: 'ENGAGED', name: 'Engaged'});
    expect(completionObserver).not.toHaveBeenCalled();

    responseSend.resolve({wrapup: 'succeeded', response: 'submitted'});
    await expect(completion).resolves.toEqual({wrapup: 'succeeded', response: 'submitted'});
    expect(completionObserver).toHaveBeenCalledTimes(1);
  });

  it('returns failed without wrapping up when draft capture throws', async () => {
    const task = {wrapup: jest.fn().mockResolvedValue(undefined)};
    jest.spyOn(store, 'capturePostCallDraft').mockImplementation(() => {
      throw new Error('capture failed');
    });

    await expect(
      completeWrapupWithSummary({
        task: task as never,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: true,
      })
    ).resolves.toEqual({wrapup: 'failed'});
    expect(task.wrapup).not.toHaveBeenCalled();
  });

  it('sends exactly once when the SDK wrapped-up event precedes wrapup Promise fulfillment', async () => {
    const order: string[] = [];
    jest.spyOn(store, 'refreshTaskList').mockImplementation(() => undefined);
    const task = createPostCallTask();
    task.wrapup.mockImplementation(async () => {
      order.push('wrapped-up event');
      task.emit(TASK_EVENTS.TASK_WRAPPEDUP);
      store.handleTaskRemove(task);
      order.push('wrapup fulfilled');
    });
    task.sendPostCallSummaryResponse.mockImplementation(async () => {
      order.push('response');
    });
    await requestPostCallSummaryForReason('reason-1', 1, task);
    await expect(
      completeWrapupWithSummary({task, wrapUpReason: 'Human label', auxCodeId: 'aux-code', responseRequired: true})
    ).resolves.toEqual({wrapup: 'succeeded', response: 'submitted'});
    expect(order).toEqual(['wrapped-up event', 'wrapup fulfilled', 'response']);
    expect(task.sendPostCallSummaryResponse).toHaveBeenCalledTimes(1);
    expect(getPostCallSummaryView(task)).toMatchObject({state: 'content', controlsDisabled: true});
  });

  it('captures retained content during regeneration before wrap-up and rejects the late generation', async () => {
    const regeneration = deferred<AISummary>();
    const responseSend = deferred<void>();
    const task = createPostCallTask({
      requestPostCallSummary: jest
        .fn()
        .mockResolvedValueOnce(aiSummaryFixtures.postCall.structured)
        .mockReturnValueOnce(regeneration.promise),
      sendPostCallSummaryResponse: jest.fn().mockReturnValue(responseSend.promise),
    });

    await requestPostCallSummaryForReason('reason-1', 1, task);
    const regenerationRequest = retryPostCallSummary(task);
    expect(getPostCallSummaryView(task)).toMatchObject({state: 'content', requestPending: true});

    const completion = completeWrapupWithSummary({
      task,
      wrapUpReason: aiSummaryFixtures.wrapUp.distinctReasonAndCode.wrapUpReason,
      auxCodeId: aiSummaryFixtures.wrapUp.distinctReasonAndCode.auxCodeId,
      responseRequired: getPostCallSummaryView(task)?.state === 'content',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(task.wrapup).toHaveBeenCalledWith({
      wrapUpReason: aiSummaryFixtures.wrapUp.distinctReasonAndCode.wrapUpReason,
      auxCodeId: aiSummaryFixtures.wrapUp.distinctReasonAndCode.auxCodeId,
    });
    expect(task.sendPostCallSummaryResponse).toHaveBeenCalledWith(
      expect.objectContaining({wrapUpCode: aiSummaryFixtures.wrapUp.distinctReasonAndCode.auxCodeId})
    );

    regeneration.resolve(aiSummaryFixtures.postCall.plainText);
    await expect(regenerationRequest).resolves.toEqual({outcome: 'stale'});
    responseSend.resolve(undefined);
    await expect(completion).resolves.toEqual({wrapup: 'succeeded', response: 'submitted'});
  });

  it('reuses one in-flight completion promise for the same task', async () => {
    const wrapup = (() => {
      let resolve: (value?: unknown) => void = () => undefined;
      const promise = new Promise<unknown>((promiseResolve) => {
        resolve = promiseResolve;
      });
      return {promise, resolve};
    })();
    const response = (() => {
      let resolve: (value: {wrapup: 'succeeded'; response: 'submitted'}) => void = () => undefined;
      const promise = new Promise<{wrapup: 'succeeded'; response: 'submitted'}>((promiseResolve) => {
        resolve = promiseResolve;
      });
      return {promise, resolve};
    })();
    const task = {wrapup: jest.fn().mockReturnValue(wrapup.promise)};
    const token = Symbol('capture');
    const captureSpy = jest.spyOn(store, 'capturePostCallDraft').mockReturnValue(token as never);
    const freezeSpy = jest.spyOn(store, 'freezeAndSendPostCallSummary').mockReturnValue(response.promise);

    const first = completeWrapupWithSummary({
      task: task as never,
      wrapUpReason: 'Human label',
      auxCodeId: 'aux-code-9',
      responseRequired: true,
    });
    const second = completeWrapupWithSummary({
      task: task as never,
      wrapUpReason: 'Other label',
      auxCodeId: 'aux-code-10',
      responseRequired: true,
    });

    expect(second).toBe(first);
    expect(task.wrapup).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledTimes(1);

    wrapup.resolve();
    await Promise.resolve();
    expect(freezeSpy).toHaveBeenCalledTimes(1);

    response.resolve({wrapup: 'succeeded', response: 'submitted'});
    await expect(first).resolves.toEqual({wrapup: 'succeeded', response: 'submitted'});
    await expect(second).resolves.toEqual({wrapup: 'succeeded', response: 'submitted'});
  });

  it('releases a captured draft when wrap-up fails and never rejects', async () => {
    const token = Symbol('capture');
    jest.spyOn(store, 'capturePostCallDraft').mockReturnValue(token as never);
    const releaseSpy = jest.spyOn(store, 'releasePostCallDraft').mockReturnValue(true);
    const task = {wrapup: jest.fn().mockRejectedValue(new Error('raw'))};

    await expect(
      completeWrapupWithSummary({
        task: task as never,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: true,
      })
    ).resolves.toEqual({wrapup: 'failed'});
    expect(releaseSpy).toHaveBeenCalledWith(token);
  });

  it('suppresses release failures when wrap-up fails', async () => {
    const token = Symbol('capture');
    jest.spyOn(store, 'capturePostCallDraft').mockReturnValue(token as never);
    const releaseSpy = jest.spyOn(store, 'releasePostCallDraft').mockImplementation(() => {
      throw new Error('release failed');
    });
    const task = {wrapup: jest.fn().mockRejectedValue(new Error('raw'))};

    await expect(
      completeWrapupWithSummary({
        task: task as never,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: true,
      })
    ).resolves.toEqual({wrapup: 'failed'});
    expect(releaseSpy).toHaveBeenCalledWith(token);
  });

  it('retains wrap-up success and returns response-failed when summary response submission fails', async () => {
    const token = Symbol('capture');
    jest.spyOn(store, 'capturePostCallDraft').mockReturnValue(token as never);
    jest.spyOn(store, 'freezeAndSendPostCallSummary').mockRejectedValue(new Error('send failed'));
    const task = {wrapup: jest.fn().mockResolvedValue(undefined)};

    await expect(
      completeWrapupWithSummary({
        task: task as never,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: true,
      })
    ).resolves.toEqual({wrapup: 'succeeded', response: 'response-failed'});
    expect(task.wrapup).toHaveBeenCalledWith({wrapUpReason: 'Human label', auxCodeId: 'aux-code-9'});
  });

  it('does not resend a failed frozen response on replay or repeated completion', async () => {
    resetStoreAISummaryState();
    const task = createPostCallTask({
      sendPostCallSummaryResponse: jest.fn().mockRejectedValue(new Error('send failed')),
    });
    const captureSpy = jest.spyOn(store, 'capturePostCallDraft');

    await expect(requestPostCallSummaryForReason('reason-1', 1, task)).resolves.toEqual({outcome: 'accepted'});
    expect(task.requestPostCallSummary).toHaveBeenCalledTimes(1);

    await expect(
      completeWrapupWithSummary({
        task,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: getPostCallSummaryView(task)?.state === 'content',
      })
    ).resolves.toEqual({wrapup: 'succeeded', response: 'response-failed'});
    const token = captureSpy.mock.results[0]?.value as PostCallDraftCaptureToken | undefined;
    expect(token).toBeDefined();
    expect(task.sendPostCallSummaryResponse).toHaveBeenCalledTimes(1);

    await expect(store.freezeAndSendPostCallSummary(token!)).resolves.toEqual({
      wrapup: 'succeeded',
      response: 'response-failed',
    });
    await expect(
      completeWrapupWithSummary({
        task,
        wrapUpReason: 'Human label',
        auxCodeId: 'aux-code-9',
        responseRequired: getPostCallSummaryView(task)?.state === 'content',
      })
    ).resolves.toEqual({wrapup: 'succeeded', response: 'response-failed'});

    expect(task.sendPostCallSummaryResponse).toHaveBeenCalledTimes(1);
    expect(task.requestPostCallSummary).toHaveBeenCalledTimes(1);
    expect(task.wrapup).toHaveBeenCalledTimes(1);
  });
});
