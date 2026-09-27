import store, {
  AISummaryActionType,
  AISummaryContent,
  AISummaryEditableField,
  AISummaryFeedback,
  AISummaryFeedbackResult,
  AISummaryPreActionSendResult,
  AISummaryRequestResult,
  AISummarySurface,
  AISummaryViewModel,
  ITask,
} from '@webex/cc-store';

export type MidCallAISummaryRole = 'initiator' | 'receiver';

export type MidCallAISummaryView = {
  state: AISummarySurface;
  content: Extract<AISummaryContent, {type: 'sections' | 'text'}>;
  contentRevision: number;
  actionType: AISummaryActionType;
  selectedFeedback: AISummaryFeedback;
  requestPending: boolean;
  controlsDisabled?: boolean;
};

export type MidCallActionResult =
  | {
      summary: AISummaryPreActionSendResult;
      action: 'fulfilled';
    }
  | {
      summary: AISummaryPreActionSendResult;
      action: 'rejected';
      error: unknown;
    };

const EMPTY_TEXT_CONTENT: Extract<AISummaryContent, {type: 'text'}> = {type: 'text', summaryText: ''};

type ScopedAISummaryStore = typeof store & {
  editAISummary(
    kind: 'mid-call',
    role: MidCallAISummaryRole,
    field: AISummaryEditableField,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  recordAISummaryViewed(kind: 'mid-call', role: MidCallAISummaryRole, expectedRevision: number, task?: ITask): boolean;
  recordAISummaryCopied(kind: 'mid-call', role: MidCallAISummaryRole, expectedRevision: number, task?: ITask): boolean;
  setMidCallSummaryFeedback(
    role: MidCallAISummaryRole,
    feedback: Exclude<AISummaryFeedback, 'none'>,
    actionType: AISummaryActionType,
    expectedRevision: number,
    task?: ITask
  ): Promise<AISummaryFeedbackResult>;
  sendMidCallSummaryBeforeAction(
    role: MidCallAISummaryRole,
    actionType: AISummaryActionType,
    expectedRevision: number,
    task?: ITask
  ): Promise<AISummaryPreActionSendResult>;
};

const scopedStore = store as ScopedAISummaryStore;

const sanitizeRequestFailure = (): AISummaryRequestResult => ({outcome: 'failed'});
const sanitizeFeedbackFailure = (): AISummaryFeedbackResult => ({outcome: 'failed'});
const sanitizePreActionFailure = (): AISummaryPreActionSendResult => ({outcome: 'failed'});

const toEditableContent = (content?: AISummaryContent): Extract<AISummaryContent, {type: 'sections' | 'text'}> => {
  if (content?.type === 'sections' || content?.type === 'text') {
    return content;
  }
  return EMPTY_TEXT_CONTENT;
};

export const getMidCallSummaryView = (
  role: MidCallAISummaryRole,
  actionType: AISummaryActionType,
  task?: ITask
): MidCallAISummaryView | undefined => {
  const view: AISummaryViewModel = store.getAISummaryViewModel('mid-call', role, task);
  if (!view.eligible) {
    return undefined;
  }

  if (view.surface === 'omitted' && view.requestPending) {
    return {
      state: 'generating',
      content: EMPTY_TEXT_CONTENT,
      contentRevision: view.contentRevision ?? 0,
      actionType: view.actionType ?? actionType,
      selectedFeedback: view.feedback,
      requestPending: view.requestPending,
      controlsDisabled: true,
    };
  }

  const hasEditableContent = view.content?.type === 'sections' || view.content?.type === 'text';
  const state = view.surface === 'content' && !hasEditableContent ? 'unavailable' : view.surface;

  return {
    state,
    content: toEditableContent(view.content),
    contentRevision: view.contentRevision ?? 0,
    actionType: view.actionType ?? actionType,
    selectedFeedback: view.feedback,
    requestPending: view.requestPending,
    controlsDisabled: !view.actionType,
  };
};

export const requestMidCallSummary = async (
  actionType: AISummaryActionType,
  role: MidCallAISummaryRole = 'initiator',
  task?: ITask
): Promise<AISummaryRequestResult> => {
  try {
    return await store.requestMidCallSummary(actionType, role, task);
  } catch {
    return sanitizeRequestFailure();
  }
};

export const editMidCallSummary = (
  role: MidCallAISummaryRole,
  field: AISummaryEditableField,
  expectedRevision: number,
  task?: ITask
): boolean => {
  try {
    return task
      ? scopedStore.editAISummary('mid-call', role, field, expectedRevision, task)
      : scopedStore.editAISummary('mid-call', role, field, expectedRevision);
  } catch {
    return false;
  }
};

export const recordMidCallSummaryViewed = (
  role: MidCallAISummaryRole,
  expectedRevision: number,
  task?: ITask
): boolean => {
  try {
    return task
      ? scopedStore.recordAISummaryViewed('mid-call', role, expectedRevision, task)
      : scopedStore.recordAISummaryViewed('mid-call', role, expectedRevision);
  } catch {
    return false;
  }
};

export const recordMidCallSummaryCopied = (
  role: MidCallAISummaryRole,
  expectedRevision: number,
  task?: ITask
): boolean => {
  try {
    return task
      ? scopedStore.recordAISummaryCopied('mid-call', role, expectedRevision, task)
      : scopedStore.recordAISummaryCopied('mid-call', role, expectedRevision);
  } catch {
    return false;
  }
};

export const setMidCallSummaryFeedback = async (
  role: MidCallAISummaryRole,
  feedback: Exclude<AISummaryFeedback, 'none'>,
  actionType: AISummaryActionType,
  expectedRevision: number,
  task?: ITask
): Promise<AISummaryFeedbackResult> => {
  try {
    return task
      ? await scopedStore.setMidCallSummaryFeedback(role, feedback, actionType, expectedRevision, task)
      : await scopedStore.setMidCallSummaryFeedback(role, feedback, actionType, expectedRevision);
  } catch {
    return sanitizeFeedbackFailure();
  }
};

export const sendMidCallSummaryBeforeAction = async (
  role: MidCallAISummaryRole,
  actionType: AISummaryActionType,
  expectedRevision: number,
  task?: ITask
): Promise<AISummaryPreActionSendResult> => {
  try {
    return task
      ? await scopedStore.sendMidCallSummaryBeforeAction(role, actionType, expectedRevision, task)
      : await scopedStore.sendMidCallSummaryBeforeAction(role, actionType, expectedRevision);
  } catch {
    return sanitizePreActionFailure();
  }
};

export const sendSummaryThenRunAction = async (
  actionType: AISummaryActionType,
  expectedRevision: number,
  action: () => Promise<void>,
  role: MidCallAISummaryRole = 'initiator',
  task?: ITask
): Promise<MidCallActionResult> => {
  const summary = await sendMidCallSummaryBeforeAction(role, actionType, expectedRevision, task);
  try {
    await action();
    return {summary, action: 'fulfilled'};
  } catch (error) {
    return {summary, action: 'rejected', error};
  }
};
