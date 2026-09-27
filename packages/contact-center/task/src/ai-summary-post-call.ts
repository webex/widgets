import store, {
  AISummaryContent,
  AISummaryEditableField,
  AISummaryFeedback,
  AISummaryFeedbackStatus,
  AISummaryPostCallRequestTrigger,
  AISummaryRequestResult,
  AISummarySurface,
  ITask,
  PostCallDraftCaptureToken,
  PostCallSubmissionResult,
} from '@webex/cc-store';

export type WrapupCompletionResult = PostCallSubmissionResult;

export type CompleteWrapupWithSummaryParams = {
  task: ITask;
  wrapUpReason: string;
  auxCodeId: string;
  responseRequired: boolean;
  onWrapupCommitted?: () => void;
};

export type PostCallAISummaryView = {
  state: AISummarySurface;
  content: Extract<AISummaryContent, {type: 'sections' | 'text'}>;
  contentRevision: number;
  selectedFeedback: AISummaryFeedback;
  feedbackStatus?: AISummaryFeedbackStatus;
  requestPending: boolean;
  completionEscape: boolean;
  controlsDisabled: boolean;
};

type PostCallAISummaryViewModel = ReturnType<typeof store.getAISummaryViewModel> & {
  controlsDisabled?: boolean;
};

const EMPTY_TEXT_CONTENT: Extract<AISummaryContent, {type: 'text'}> = {type: 'text', summaryText: ''};

type ScopedAISummaryStore = typeof store & {
  editAISummary(
    kind: 'post-call',
    role: 'post-call',
    field: AISummaryEditableField,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  recordAISummaryViewed(kind: 'post-call', role: 'post-call', expectedRevision: number, task?: ITask): boolean;
  recordAISummaryCopied(kind: 'post-call', role: 'post-call', expectedRevision: number, task?: ITask): boolean;
  setPostCallSummaryFeedback(
    feedback: Exclude<AISummaryFeedback, 'none'>,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  markPostCallWrapupCompleted(wrapUpCode: string, task?: ITask): boolean;
};

const scopedStore = store as ScopedAISummaryStore;

const failedWrapup = (): WrapupCompletionResult => ({wrapup: 'failed'});
const internalFailure = (): AISummaryRequestResult => ({outcome: 'failed'});

const releaseCapturedDraft = (captureToken: PostCallDraftCaptureToken): void => {
  try {
    store.releasePostCallDraft(captureToken);
  } catch {
    // Release is best-effort once the SDK wrap-up has already failed.
  }
};

const markWrapupCommitted = (auxCodeId: string, task: ITask): void => {
  try {
    store.markPostCallWrapupCompleted(auxCodeId, task);
  } catch {
    // Summary terminal bookkeeping must not reject a successful SDK wrap-up.
  }
};

const notifyWrapupCommitted = (onWrapupCommitted?: () => void): void => {
  try {
    onWrapupCommitted?.();
  } catch {
    // The wrap-up result remains authoritative even if local commit bookkeeping fails.
  }
};

const isCallableWrapupTask = (
  task: ITask
): task is ITask & {wrapup: (payload: {wrapUpReason: string; auxCodeId: string}) => Promise<unknown>} =>
  typeof task?.wrapup === 'function';

const toEditableContent = (content?: AISummaryContent): Extract<AISummaryContent, {type: 'sections' | 'text'}> => {
  if (content?.type === 'sections' || content?.type === 'text') {
    return content;
  }
  return EMPTY_TEXT_CONTENT;
};

export const getPostCallSummaryView = (task?: ITask): PostCallAISummaryView | undefined => {
  const view = store.getAISummaryViewModel('post-call', 'post-call', task) as PostCallAISummaryViewModel;
  if (!view.eligible) {
    return undefined;
  }
  const state = view.surface === 'content' && view.content?.type === 'card' ? 'unavailable' : view.surface;

  return {
    state,
    content: toEditableContent(view.content),
    contentRevision: view.contentRevision ?? 0,
    selectedFeedback: view.feedback,
    feedbackStatus: view.feedbackStatus,
    requestPending: view.requestPending,
    completionEscape: Boolean(view.completionEscape),
    controlsDisabled: Boolean(view.controlsDisabled),
  };
};

export const requestPostCallSummaryForReason = async (
  reasonId: string,
  selectionRevision: number,
  task?: ITask
): Promise<AISummaryRequestResult> => {
  const trigger: AISummaryPostCallRequestTrigger = {type: 'reason-commit', reasonId, selectionRevision};
  try {
    return await store.requestPostCallSummary(trigger, task);
  } catch {
    return internalFailure();
  }
};

export const retryPostCallSummary = async (task?: ITask): Promise<AISummaryRequestResult> => {
  try {
    return await store.requestPostCallSummary({type: 'retry'}, task);
  } catch {
    return internalFailure();
  }
};

export const editPostCallSummary = (field: AISummaryEditableField, expectedRevision: number, task?: ITask): boolean => {
  try {
    return task
      ? scopedStore.editAISummary('post-call', 'post-call', field, expectedRevision, task)
      : scopedStore.editAISummary('post-call', 'post-call', field, expectedRevision);
  } catch {
    return false;
  }
};

export const recordPostCallSummaryViewed = (expectedRevision: number, task?: ITask): boolean => {
  try {
    return task
      ? scopedStore.recordAISummaryViewed('post-call', 'post-call', expectedRevision, task)
      : scopedStore.recordAISummaryViewed('post-call', 'post-call', expectedRevision);
  } catch {
    return false;
  }
};

export const recordPostCallSummaryCopied = (expectedRevision: number, task?: ITask): boolean => {
  try {
    return task
      ? scopedStore.recordAISummaryCopied('post-call', 'post-call', expectedRevision, task)
      : scopedStore.recordAISummaryCopied('post-call', 'post-call', expectedRevision);
  } catch {
    return false;
  }
};

export const setPostCallSummaryFeedback = (
  feedback: Exclude<AISummaryFeedback, 'none'>,
  expectedRevision: number,
  task?: ITask
): boolean => {
  try {
    return task
      ? scopedStore.setPostCallSummaryFeedback(feedback, expectedRevision, task)
      : scopedStore.setPostCallSummaryFeedback(feedback, expectedRevision);
  } catch {
    return false;
  }
};

const wrapupCompletionsInFlight = new WeakMap<ITask, Promise<WrapupCompletionResult>>();

const runCompleteWrapupWithSummary = async ({
  task,
  wrapUpReason,
  auxCodeId,
  responseRequired,
  onWrapupCommitted,
}: CompleteWrapupWithSummaryParams): Promise<WrapupCompletionResult> => {
  if (!isCallableWrapupTask(task)) {
    return failedWrapup();
  }

  let captureToken: PostCallDraftCaptureToken | undefined;
  if (responseRequired) {
    try {
      captureToken = store.capturePostCallDraft(auxCodeId, task);
    } catch {
      return failedWrapup();
    }
    if (!captureToken) {
      return {wrapup: 'succeeded', response: 'response-failed'};
    }
  }

  try {
    await task.wrapup({wrapUpReason, auxCodeId});
  } catch {
    if (captureToken) {
      releaseCapturedDraft(captureToken);
    }
    return failedWrapup();
  }

  notifyWrapupCommitted(onWrapupCommitted);

  if (!captureToken) {
    markWrapupCommitted(auxCodeId, task);
    return {wrapup: 'succeeded', response: 'not-required'};
  }

  try {
    return await store.freezeAndSendPostCallSummary(captureToken);
  } catch {
    return {wrapup: 'succeeded', response: 'response-failed'};
  }
};

export const completeWrapupWithSummary = (params: CompleteWrapupWithSummaryParams): Promise<WrapupCompletionResult> => {
  if (!isCallableWrapupTask(params.task)) {
    return Promise.resolve(failedWrapup());
  }

  const inFlight = wrapupCompletionsInFlight.get(params.task);
  if (inFlight) {
    return inFlight;
  }

  const completion = runCompleteWrapupWithSummary(params);
  wrapupCompletionsInFlight.set(params.task, completion);
  void completion.then(
    () => {
      if (wrapupCompletionsInFlight.get(params.task) === completion) {
        wrapupCompletionsInFlight.delete(params.task);
      }
    },
    () => {
      if (wrapupCompletionsInFlight.get(params.task) === completion) {
        wrapupCompletionsInFlight.delete(params.task);
      }
    }
  );
  return completion;
};
