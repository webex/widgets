import store from '@webex/cc-store';
import type {ITask} from '@webex/cc-store';
import {
  editMidCallSummary,
  getMidCallSummaryView,
  recordMidCallSummaryCopied,
  requestMidCallSummary,
  sendSummaryThenRunAction,
  setMidCallSummaryFeedback,
} from '../src/ai-summary-mid-call';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
};

describe('ai-summary-mid-call', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('projects only editable initiator content and preserves action metadata', () => {
    jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue({
      key: 'mid-call:initiator',
      eligible: true,
      surface: 'content',
      requestPending: false,
      content: {
        type: 'sections',
        sections: [{key: 'reasonForTransferOrConsult', value: 'Customer needs help', editable: true}],
      },
      contentRevision: 8,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'like',
      actionType: 'CONSULT',
    });

    expect(getMidCallSummaryView('initiator', 'TRANSFER')).toMatchObject({
      state: 'content',
      contentRevision: 8,
      actionType: 'CONSULT',
      selectedFeedback: 'like',
    });
  });

  it('maps card-only initiator content to unavailable instead of leaking card JSON', () => {
    jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue({
      key: 'mid-call:initiator',
      eligible: true,
      surface: 'content',
      requestPending: false,
      content: {type: 'card', adaptiveCard: {type: 'AdaptiveCard'}},
      contentRevision: 3,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none',
      actionType: 'TRANSFER',
    });

    expect(getMidCallSummaryView('initiator', 'TRANSFER')).toMatchObject({
      state: 'unavailable',
      content: {type: 'text', summaryText: ''},
    });
  });

  it('projects an eligible first pending omitted request as generating with disabled controls', () => {
    jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue({
      key: 'mid-call:initiator',
      eligible: true,
      surface: 'omitted',
      requestPending: true,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none',
    });

    expect(getMidCallSummaryView('initiator', 'CONSULT')).toEqual({
      state: 'generating',
      content: {type: 'text', summaryText: ''},
      contentRevision: 0,
      actionType: 'CONSULT',
      selectedFeedback: 'none',
      requestPending: true,
      controlsDisabled: true,
    });
  });

  it('keeps retained content visible while a replacement request is pending', () => {
    jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue({
      key: 'mid-call:initiator',
      eligible: true,
      surface: 'content',
      requestPending: true,
      content: {type: 'text', summaryText: 'Existing summary remains visible.'},
      contentRevision: 12,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none',
      actionType: 'TRANSFER',
    });

    expect(getMidCallSummaryView('initiator', 'CONSULT')).toMatchObject({
      state: 'content',
      content: {type: 'text', summaryText: 'Existing summary remains visible.'},
      contentRevision: 12,
      actionType: 'TRANSFER',
      requestPending: true,
      controlsDisabled: false,
    });
  });

  it('preserves eligible omitted bootstrap and store-projected pending-without-content surfaces', () => {
    const viewModel = {
      key: 'mid-call:initiator' as const,
      eligible: true,
      surface: 'omitted' as const,
      requestPending: false,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none' as const,
    };
    const viewSpy = jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue(viewModel);

    expect(getMidCallSummaryView('initiator', 'CONSULT')).toMatchObject({
      state: 'omitted',
      actionType: 'CONSULT',
      requestPending: false,
    });

    viewSpy.mockReturnValue({...viewModel, surface: 'generating', requestPending: true});

    expect(getMidCallSummaryView('initiator', 'CONSULT')).toMatchObject({
      state: 'generating',
      actionType: 'CONSULT',
      requestPending: true,
    });
  });

  it('preserves settled failure surfaces and omits ineligible pending requests', () => {
    const counters = {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0};
    const viewSpy = jest.spyOn(store, 'getAISummaryViewModel').mockReturnValue({
      key: 'mid-call:initiator',
      eligible: true,
      surface: 'generic-error',
      requestPending: false,
      counters,
      feedback: 'none',
      actionType: 'CONSULT',
    });

    expect(getMidCallSummaryView('initiator', 'CONSULT')).toMatchObject({
      state: 'generic-error',
      requestPending: false,
      actionType: 'CONSULT',
    });

    viewSpy.mockReturnValue({
      key: 'mid-call:initiator',
      eligible: false,
      surface: 'omitted',
      requestPending: true,
      counters,
      feedback: 'none',
    });

    expect(getMidCallSummaryView('initiator', 'CONSULT')).toBeUndefined();
  });

  it('reprojects capability arrival, revocation and ownership changes from the current task', () => {
    const ownedTask = {
      data: {
        agentId: 'agent1',
        interactionId: 'interaction-1',
        interaction: {owner: 'agent1', mainInteractionId: 'main-1'},
      },
    } as unknown as ITask;
    const transferredTask = {
      data: {
        agentId: 'agent1',
        interactionId: 'interaction-1',
        interaction: {owner: 'agent2', mainInteractionId: 'main-1'},
      },
    } as unknown as ITask;
    const counters = {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0};
    const viewSpy = jest.spyOn(store, 'getAISummaryViewModel').mockImplementation((_kind, _role, task) => {
      if (task === transferredTask) {
        return {
          key: 'mid-call:initiator',
          eligible: false,
          surface: 'omitted',
          requestPending: false,
          counters,
          feedback: 'none',
        };
      }

      return {
        key: 'mid-call:initiator',
        eligible: true,
        surface: 'content',
        requestPending: false,
        content: {type: 'text', summaryText: 'Customer needs a warm handoff.'},
        contentRevision: 21,
        counters,
        feedback: 'none',
      };
    });

    expect(getMidCallSummaryView('initiator', 'TRANSFER', ownedTask)).toMatchObject({
      state: 'content',
      contentRevision: 21,
      actionType: 'TRANSFER',
      controlsDisabled: true,
    });
    expect(getMidCallSummaryView('initiator', 'TRANSFER', transferredTask)).toBeUndefined();
    expect(viewSpy).toHaveBeenNthCalledWith(1, 'mid-call', 'initiator', ownedTask);
    expect(viewSpy).toHaveBeenNthCalledWith(2, 'mid-call', 'initiator', transferredTask);
  });

  it('always fulfills request and feedback results with sanitized outcomes', async () => {
    jest.spyOn(store, 'requestMidCallSummary').mockRejectedValue(new Error('raw'));
    jest.spyOn(store, 'setMidCallSummaryFeedback').mockRejectedValue(new Error('raw'));

    await expect(requestMidCallSummary('CONSULT')).resolves.toEqual({outcome: 'failed'});
    await expect(setMidCallSummaryFeedback('initiator', 'like', 'CONSULT', 1)).resolves.toEqual({outcome: 'failed'});
  });

  it('observes a rejected open request without leaking an unhandled rejection', async () => {
    jest.spyOn(store, 'requestMidCallSummary').mockRejectedValue(new Error('transport'));
    await expect(requestMidCallSummary('TRANSFER')).resolves.toEqual({outcome: 'failed'});
    // Let real Promise rejection reporting run. Jest's runner fails the test
    // on an unhandled rejection; a listener on its sandboxed process copy does not.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('routes edits and copy recorders through exact mid-call role/revision keys', () => {
    const editSpy = jest.spyOn(store, 'editAISummary').mockReturnValue(true);
    const copySpy = jest.spyOn(store, 'recordAISummaryCopied').mockReturnValue(true);

    expect(editMidCallSummary('initiator', {key: 'summaryText', value: 'Edited'}, 4)).toBe(true);
    expect(recordMidCallSummaryCopied('initiator', 4)).toBe(true);
    expect(editSpy).toHaveBeenCalledWith('mid-call', 'initiator', {key: 'summaryText', value: 'Edited'}, 4);
    expect(copySpy).toHaveBeenCalledWith('mid-call', 'initiator', 4);
  });

  it('awaits the pre-action response before running the telephony action and still runs after non-sent outcomes', async () => {
    const order: string[] = [];
    const response = deferred<{outcome: 'failed'}>();
    jest.spyOn(store, 'sendMidCallSummaryBeforeAction').mockImplementation(() => {
      order.push('summary-started');
      return response.promise.then((result) => {
        order.push('summary-settled');
        return result;
      });
    });
    const telephony = jest.fn(async () => {
      order.push('telephony');
    });

    const result = sendSummaryThenRunAction('TRANSFER', 9, telephony);

    expect(telephony).not.toHaveBeenCalled();
    response.resolve({outcome: 'failed'});

    await expect(result).resolves.toEqual({
      summary: {outcome: 'failed'},
      action: 'fulfilled',
    });
    expect(order).toEqual(['summary-started', 'summary-settled', 'telephony']);
  });

  it('preserves a rejected telephony action error in the closed action result', async () => {
    const actionError = new Error('transfer failed');
    jest.spyOn(store, 'sendMidCallSummaryBeforeAction').mockResolvedValue({outcome: 'sent'});
    const telephony = jest.fn().mockRejectedValue(actionError);

    await expect(sendSummaryThenRunAction('TRANSFER', 9, telephony)).resolves.toEqual({
      summary: {outcome: 'sent'},
      action: 'rejected',
      error: actionError,
    });
  });
});
