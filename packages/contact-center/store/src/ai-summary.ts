import type {
  AISummaryActionType,
  AISummaryCapabilityRecord,
  AISummaryContent,
  AISummaryCounters,
  AISummaryEditableField,
  AISummaryErrorCategory,
  AISummaryFeedback,
  AISummaryKind,
  AISummaryMidCallOwnerState,
  AISummaryMidCallRole,
  AISummaryOwnerKey,
  AISummaryOwnerState,
  AISummaryOwnershipAdvanceMode,
  AISummaryOwnershipBoundary,
  AISummaryOwnershipRole,
  AISummaryPostCallOwnerState,
  AISummaryPostCallRequestTrigger,
  AISummarySection,
  AISummarySectionKey,
  AISummarySurface,
  AISummaryViewSelector,
  AISummaryViewModel,
  ITask,
} from './store.types';
import type {AISummaryResponse, AISummarySections, AISummaryState} from '@webex/contact-center';
import {findMediaResourceId} from './task-utils';

type UnknownRecord = Record<string, unknown>;

type NormalizedTimestamp =
  | {
      present: true;
      value: number;
    }
  | {
      present: false;
    };

export type NormalizedAISummaryCapability =
  | {
      kind: 'valid';
      interactionId: string;
      enabled: boolean;
      midCallEnabled: boolean;
      postCallEnabled: boolean;
      timestamp: NormalizedTimestamp;
      arrivalOrder: number;
    }
  | {
      kind: 'invalid';
      interactionId?: string;
      reason: 'missing-interaction' | 'invalid-timestamp';
    };

export type NormalizedAISummarySuccess = {
  kind: 'success';
  interactionId: string;
  role: AISummaryOwnershipRole;
  content: AISummaryContent;
  timestamp: NormalizedTimestamp;
  arrivalOrder: number;
};

export type NormalizedAISummaryResult =
  | NormalizedAISummarySuccess
  | {
      kind: 'unsupported';
      interactionId: string;
      role: AISummaryOwnershipRole;
      timestamp: NormalizedTimestamp;
      arrivalOrder: number;
    }
  | {
      kind: 'error';
      category: AISummaryErrorCategory;
      role: AISummaryOwnershipRole;
      interactionId?: string;
    }
  | {
      kind: 'discarded-interaction-mismatch';
      interactionId?: string;
      expectedInteractionId: string;
    };

export type AISummaryFreshnessCandidate = {
  ownerRole: AISummaryOwnershipRole;
  arrivalOrder: number;
  timestamp: NormalizedTimestamp;
  ownerGeneration?: number;
  postCallGeneration?: number;
};

export type AISummaryFreshnessDecision = 'incoming' | 'current' | 'stale';

const compareAISummaryGeneration = (currentGeneration?: number, incomingGeneration?: number): number => {
  if (currentGeneration === incomingGeneration) {
    return 0;
  }
  if (incomingGeneration === undefined) {
    return -1;
  }
  if (currentGeneration === undefined) {
    return 1;
  }
  return incomingGeneration > currentGeneration ? 1 : -1;
};

const MID_CALL_SECTION_KEYS = new Set<AISummarySectionKey>([
  'reasonForTransferOrConsult',
  'additionalContext',
  'keyActionsTaken',
]);
const POST_CALL_SECTION_KEYS = new Set<AISummarySectionKey>([
  'initialContactReason',
  'additionalContactReasons',
  'additionalContext',
  'keyActionsTaken',
  'nextSteps',
]);

export const emptyAISummaryCounters = (): AISummaryCounters => ({
  viewed: 0,
  copied: 0,
  edited: 0,
  liked: 0,
  disliked: 0,
});

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (record: UnknownRecord, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const getBoolean = (record: UnknownRecord, key: string): boolean | undefined => {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
};

const normalizeTimestamp = (record: UnknownRecord): NormalizedTimestamp | 'invalid' => {
  if (!Object.prototype.hasOwnProperty.call(record, 'timestamp')) {
    return {present: false};
  }
  const value = record.timestamp;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || !Number.isFinite(value)) {
    return 'invalid';
  }
  return {present: true, value};
};

const normalizeActionTimestamp = (record: UnknownRecord): NormalizedTimestamp | 'invalid' => {
  if (!Object.prototype.hasOwnProperty.call(record, 'actionTimestamp')) {
    return {present: false};
  }
  const value = record.actionTimestamp;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || !Number.isFinite(value)) {
    return 'invalid';
  }
  return {present: true, value};
};

const SUMMARY_TIMEOUT_CODES = new Set(['POST_CALL_SUMMARY_TIMEOUT', 'MID_CALL_SUMMARY_TIMEOUT']);
const SUMMARY_DISABLED_CODES = new Set(['POST_CALL_SUMMARY_DISABLED', 'MID_CALL_SUMMARY_DISABLED']);
const SUMMARY_INITIALIZATION_CODES = new Set(['AI_ASSISTANT_BASE_URL_NOT_AVAILABLE']);

const HTTP_STATUS_BY_CATEGORY: Partial<Record<AISummaryErrorCategory, Set<number>>> = {
  unauthorized: new Set([401, 403]),
  timeout: new Set([408, 504]),
  unavailable: new Set([429, 500, 502, 503]),
  offline: new Set([0]),
};

const getErrorCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }
  const data = isRecord(error.data) ? error.data : undefined;
  return getString(data ?? error, 'errorCode') ?? getString(error, 'code');
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }
  const candidates: unknown[] = [error.status, error.statusCode];
  if (isRecord(error.response)) {
    candidates.push(error.response.status, error.response.statusCode);
  }
  if (isRecord(error.data)) {
    candidates.push(error.data.status, error.data.statusCode);
  }
  return candidates.find(
    (candidate): candidate is number => typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 0
  );
};

const getErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  if (!isRecord(error)) {
    return undefined;
  }
  return getString(error, 'message');
};

export const mapAISummaryError = (error: unknown): AISummaryErrorCategory => {
  const errorCode = getErrorCode(error);
  if (errorCode) {
    if (SUMMARY_TIMEOUT_CODES.has(errorCode)) {
      return 'timeout';
    }
    if (SUMMARY_DISABLED_CODES.has(errorCode)) {
      return 'disabled';
    }
    if (SUMMARY_INITIALIZATION_CODES.has(errorCode)) {
      return 'initialization';
    }
    if (/UNAUTHORI[ZS]ED|FORBIDDEN|AUTH(?:ORIZATION)?_FAILED/i.test(errorCode)) {
      return 'unauthorized';
    }
    if (/NETWORK|OFFLINE|ECONNRESET|ECONNREFUSED|ENOTFOUND|ERR_NETWORK|ERR_INTERNET_DISCONNECTED/i.test(errorCode)) {
      return 'offline';
    }
  }

  const status = getErrorStatus(error);
  for (const [category, statuses] of Object.entries(HTTP_STATUS_BY_CATEGORY) as Array<
    [AISummaryErrorCategory, Set<number>]
  >) {
    if (statuses.has(status ?? -1)) {
      return category;
    }
  }

  const message = getErrorMessage(error);
  if (message) {
    if (SUMMARY_TIMEOUT_CODES.has(message)) {
      return 'timeout';
    }
    if (SUMMARY_DISABLED_CODES.has(message)) {
      return 'disabled';
    }
    if (SUMMARY_INITIALIZATION_CODES.has(message)) {
      return 'initialization';
    }
    if (/UNAUTHORI[ZS]ED|FORBIDDEN|AUTH(?:ORIZATION)? FAILED/i.test(message)) {
      return 'unauthorized';
    }
    if (/NOT INITIALI[ZS]ED|BASE URL NOT AVAILABLE|AI ASSISTANT.*(MISSING|UNAVAILABLE|UNCONFIGURED)/i.test(message)) {
      return 'initialization';
    }
    if (/NETWORK|OFFLINE|FAILED TO FETCH|NETWORK REQUEST FAILED|ERR_NETWORK|ERR_INTERNET_DISCONNECTED/i.test(message)) {
      return 'offline';
    }
  }

  return 'generic';
};

export const isHiddenAISummaryErrorCategory = (category: AISummaryErrorCategory): boolean =>
  category === 'unauthorized' || category === 'initialization';

export const normalizeAISummaryFeatureEnablement = (raw: unknown, arrivalOrder = 0): NormalizedAISummaryCapability => {
  if (!isRecord(raw)) {
    return {kind: 'invalid', reason: 'missing-interaction'};
  }
  const interactionId = getString(raw, 'interactionId');
  if (!interactionId) {
    return {kind: 'invalid', reason: 'missing-interaction'};
  }
  const timestamp = normalizeActionTimestamp(raw);
  if (timestamp === 'invalid') {
    return {kind: 'invalid', interactionId, reason: 'invalid-timestamp'};
  }
  const midCallEnabled = getBoolean(raw, 'midCallEnabled') === true;
  const postCallEnabled = getBoolean(raw, 'postCallEnabled') === true;
  return {
    kind: 'valid',
    interactionId,
    enabled: midCallEnabled || postCallEnabled,
    midCallEnabled,
    postCallEnabled,
    timestamp,
    arrivalOrder,
  };
};

export const reduceAISummaryCapability = (
  current: NormalizedAISummaryCapability | undefined,
  incoming: NormalizedAISummaryCapability
): NormalizedAISummaryCapability | undefined => {
  if (incoming.kind !== 'valid') {
    return current;
  }
  if (!current || current.kind !== 'valid') {
    return incoming;
  }
  if (incoming.timestamp.present && current.timestamp.present) {
    if (incoming.timestamp.value > current.timestamp.value) {
      return incoming;
    }
    if (incoming.timestamp.value === current.timestamp.value && incoming.arrivalOrder >= current.arrivalOrder) {
      return incoming;
    }
    return current;
  }
  return incoming.arrivalOrder >= current.arrivalOrder ? incoming : current;
};

export const toAISummaryCapabilityRecord = (
  capability: NormalizedAISummaryCapability
): AISummaryCapabilityRecord | undefined => {
  if (capability.kind !== 'valid') {
    return undefined;
  }
  return {
    interactionId: capability.interactionId,
    midCallEnabled: capability.midCallEnabled,
    postCallEnabled: capability.postCallEnabled,
    timestamp: capability.timestamp,
    arrivalOrder: capability.arrivalOrder,
  };
};

const getStableIdentityCandidate = (candidate: string | undefined): string | undefined => {
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : undefined;
};

export const resolveAISummaryCanonicalInteraction = (task: unknown): AISummaryOwnershipBoundary => {
  if (!isRecord(task) || !isRecord(task.data) || !isRecord(task.data.interaction)) {
    return {kind: 'invalid', reason: 'missing-stable-identity'};
  }
  const mainInteractionId = getStableIdentityCandidate(getString(task.data.interaction, 'mainInteractionId'));
  const mainCallInteractionId = getStableIdentityCandidate(findMediaResourceId(task as unknown as ITask, 'mainCall'));
  if (!mainInteractionId && !mainCallInteractionId) {
    return {kind: 'invalid', reason: 'missing-stable-identity'};
  }
  if (!mainInteractionId) {
    return {kind: 'valid', interactionId: mainCallInteractionId};
  }
  if (!mainCallInteractionId) {
    return {kind: 'valid', interactionId: mainInteractionId};
  }
  if (mainInteractionId !== mainCallInteractionId) {
    return {kind: 'invalid', reason: 'conflicting-stable-identity'};
  }
  return {kind: 'valid', interactionId: mainInteractionId};
};

const normalizeSectionsRecord = (
  rawSections: unknown,
  allowedKeys: ReadonlySet<AISummarySectionKey>
): AISummarySection[] | 'invalid' => {
  if (!isRecord(rawSections)) {
    return 'invalid';
  }
  const sections: AISummarySection[] = [];
  for (const [key, value] of Object.entries(rawSections)) {
    if (!allowedKeys.has(key as AISummarySectionKey)) {
      continue;
    }
    if (typeof value !== 'string') {
      return 'invalid';
    }
    if (value.trim().length === 0) {
      continue;
    }
    sections.push({
      key: key as AISummarySectionKey,
      value,
      editable: true,
    });
  }
  return sections;
};

const normalizeResolution = (raw: UnknownRecord): string | undefined => {
  const value = raw.resolution;
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
};

export const normalizeAISummaryPayload = (options: {
  raw: unknown;
  role: AISummaryOwnershipRole;
  expectedInteractionId: string;
  arrivalOrder?: number;
}): NormalizedAISummaryResult => {
  const {raw, role, expectedInteractionId} = options;
  const arrivalOrder = options.arrivalOrder ?? 0;
  if (!isRecord(raw)) {
    return {kind: 'error', category: 'generic', role};
  }
  const conversationId = getString(raw, 'conversationId');
  if (!conversationId || conversationId !== expectedInteractionId) {
    return {
      kind: 'discarded-interaction-mismatch',
      interactionId: conversationId,
      expectedInteractionId,
    };
  }
  const timestamp = normalizeTimestamp(raw);
  if (timestamp === 'invalid') {
    return {kind: 'error', category: 'generic', role, interactionId: conversationId};
  }

  if (role === 'receiver') {
    if (isRecord(raw.adaptiveCard)) {
      return {
        kind: 'success',
        interactionId: conversationId,
        role,
        content: {type: 'card', adaptiveCard: raw.adaptiveCard},
        timestamp,
        arrivalOrder,
      };
    }
    return {kind: 'unsupported', interactionId: conversationId, role, timestamp, arrivalOrder};
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'sections')) {
    const sections = normalizeSectionsRecord(
      raw.sections,
      role === 'post-call' ? POST_CALL_SECTION_KEYS : MID_CALL_SECTION_KEYS
    );
    if (sections === 'invalid') {
      return {kind: 'error', category: 'generic', role, interactionId: conversationId};
    }
    if (sections.length > 0) {
      return {
        kind: 'success',
        interactionId: conversationId,
        role,
        content: {
          type: 'sections',
          sections,
          resolution: role === 'post-call' ? normalizeResolution(raw) : undefined,
        },
        timestamp,
        arrivalOrder,
      };
    }
  }

  if (typeof raw.summaryText === 'string') {
    if (raw.summaryText.trim().length > 0) {
      return {
        kind: 'success',
        interactionId: conversationId,
        role,
        content: {type: 'text', summaryText: raw.summaryText},
        timestamp,
        arrivalOrder,
      };
    }
    return {kind: 'error', category: 'empty', role, interactionId: conversationId};
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'adaptiveCard')) {
    return {kind: 'unsupported', interactionId: conversationId, role, timestamp, arrivalOrder};
  }
  return {kind: 'error', category: 'empty', role, interactionId: conversationId};
};

export const chooseAISummaryFreshness = (
  current: AISummaryFreshnessCandidate | undefined,
  incoming: AISummaryFreshnessCandidate
): AISummaryFreshnessDecision => {
  if (!current) {
    return 'incoming';
  }
  if (current.ownerRole !== incoming.ownerRole) {
    return 'incoming';
  }

  const ownerGenerationOrder = compareAISummaryGeneration(current.ownerGeneration, incoming.ownerGeneration);
  if (ownerGenerationOrder > 0) {
    return 'incoming';
  }
  if (ownerGenerationOrder < 0) {
    return 'stale';
  }

  const postCallGenerationOrder = compareAISummaryGeneration(current.postCallGeneration, incoming.postCallGeneration);
  if (postCallGenerationOrder > 0) {
    return 'incoming';
  }
  if (postCallGenerationOrder < 0) {
    return 'stale';
  }

  if (current.timestamp.present && incoming.timestamp.present) {
    if (incoming.timestamp.value > current.timestamp.value) {
      return 'incoming';
    }
    if (incoming.timestamp.value === current.timestamp.value && incoming.arrivalOrder >= current.arrivalOrder) {
      return 'incoming';
    }
    return 'current';
  }
  return incoming.arrivalOrder >= current.arrivalOrder ? 'incoming' : 'current';
};

export const createAISummaryOwnerState = (options: {
  kind: AISummaryKind;
  role: AISummaryOwnershipRole;
  ownerKey: AISummaryOwnerKey;
  actionType?: AISummaryActionType;
  postCallGeneration?: number;
}): AISummaryOwnerState => {
  const base = {
    ownerKey: options.ownerKey,
    contentRevision: 0,
    counters: emptyAISummaryCounters(),
    feedback: 'none' as AISummaryFeedback,
  };
  if (options.kind === 'mid-call') {
    if (options.role === 'post-call' || !options.actionType) {
      throw new Error('mid-call summaries require an initiating or receiver role and action type');
    }
    return {
      ...base,
      kind: 'mid-call',
      role: options.role,
      actionType: options.actionType,
      midCallFeedbackPending: false,
    };
  }
  return {
    ...base,
    kind: 'post-call',
    role: 'post-call',
    postCallGeneration: options.postCallGeneration,
    postCallFeedbackPending: false,
    agentWrappedUpObserved: false,
  };
};

export const advanceAISummaryOwnerState = (
  state: AISummaryOwnerState,
  ownerKey: AISummaryOwnerKey,
  mode: AISummaryOwnershipAdvanceMode
): AISummaryOwnerState => {
  if (mode === 'reset') {
    return createAISummaryOwnerState({
      kind: state.kind,
      role: state.role,
      ownerKey,
      actionType: state.kind === 'mid-call' ? state.actionType : undefined,
      postCallGeneration: state.kind === 'post-call' ? state.postCallGeneration : undefined,
    });
  }

  if (state.kind === 'mid-call') {
    return {
      ...state,
      ownerKey,
      midCallFeedbackPending: false,
    };
  }

  return {
    ...state,
    ownerKey,
    postCallFeedbackPending: false,
    feedbackStatus: undefined,
    postCallCaptureRevision: undefined,
    postCallTerminalGeneration: undefined,
    postCallTerminalWrapUpCode: undefined,
    agentWrappedUpObserved: false,
  };
};

export const acceptAISummaryContent = (
  state: AISummaryOwnerState,
  content: AISummaryContent,
  nextRevision: number
): AISummaryOwnerState => {
  if (state.kind === 'post-call') {
    return {
      ...state,
      content,
      contentRevision: nextRevision,
      feedback: 'none',
      feedbackStatus: undefined,
      postCallFeedbackPending: false,
    };
  }
  return {
    ...state,
    content,
    contentRevision: nextRevision,
    feedback: 'none',
    midCallFeedbackPending: false,
  };
};

export const recordAISummaryViewed = (
  state: AISummaryOwnerState,
  expectedRevision: number
): {accepted: boolean; state: AISummaryOwnerState} => {
  if (state.contentRevision !== expectedRevision || !state.content) {
    return {accepted: false, state};
  }
  return {
    accepted: true,
    state: {
      ...state,
      counters: {...state.counters, viewed: state.counters.viewed + 1},
    } as AISummaryOwnerState,
  };
};

export const editAISummaryContent = (
  state: AISummaryOwnerState,
  field: AISummaryEditableField,
  expectedRevision: number,
  nextRevision: number
): {accepted: boolean; state: AISummaryOwnerState} => {
  if (state.contentRevision !== expectedRevision || !state.content) {
    return {accepted: false, state};
  }
  if (state.content.type === 'text' && field.key === 'summaryText') {
    if (state.content.summaryText === field.value) {
      return {accepted: true, state};
    }
    return {
      accepted: true,
      state: {
        ...state,
        content: {...state.content, summaryText: field.value},
        contentRevision: nextRevision,
        ...(state.kind === 'mid-call' ? {midCallFeedbackPending: false} : {}),
        counters: {...state.counters, edited: state.counters.edited + 1},
      } as AISummaryOwnerState,
    };
  }
  if (state.content.type !== 'sections' || field.key === 'summaryText') {
    return {accepted: false, state};
  }
  const sectionIndex = state.content.sections.findIndex((section) => section.key === field.key && section.editable);
  if (sectionIndex < 0) {
    return {accepted: false, state};
  }
  if (state.content.sections[sectionIndex].value === field.value) {
    return {accepted: true, state};
  }
  const sections = state.content.sections.map((section, index) =>
    index === sectionIndex ? {...section, value: field.value} : section
  );
  return {
    accepted: true,
    state: {
      ...state,
      content: {...state.content, sections},
      contentRevision: nextRevision,
      ...(state.kind === 'mid-call' ? {midCallFeedbackPending: false} : {}),
      counters: {...state.counters, edited: state.counters.edited + 1},
    } as AISummaryOwnerState,
  };
};

export const recordAISummaryCopied = (
  state: AISummaryOwnerState,
  expectedRevision: number
): {accepted: boolean; state: AISummaryOwnerState} => {
  if (state.contentRevision !== expectedRevision || !state.content) {
    return {accepted: false, state};
  }
  return {
    accepted: true,
    state: {
      ...state,
      counters: {...state.counters, copied: state.counters.copied + 1},
    } as AISummaryOwnerState,
  };
};

export const setAISummaryFeedback = (
  state: AISummaryOwnerState,
  feedback: Exclude<AISummaryFeedback, 'none'>,
  expectedRevision: number
): {accepted: boolean; state: AISummaryOwnerState} => {
  if (state.contentRevision !== expectedRevision || !state.content) {
    return {accepted: false, state};
  }
  const nextCounters = {
    ...state.counters,
    liked: feedback === 'like' && state.feedback !== 'like' ? state.counters.liked + 1 : state.counters.liked,
    disliked:
      feedback === 'dislike' && state.feedback !== 'dislike' ? state.counters.disliked + 1 : state.counters.disliked,
  };
  if (state.kind === 'post-call') {
    return {
      accepted: true,
      state: {
        ...state,
        feedback,
        feedbackStatus: 'pending',
        postCallFeedbackPending: true,
        counters: nextCounters,
      },
    };
  }
  return {
    accepted: true,
    state: {
      ...state,
      feedback,
      counters: nextCounters,
    },
  };
};

export const isPostCallStateFrozen = (state?: AISummaryOwnerState): boolean =>
  state?.kind === 'post-call' &&
  (state.postCallCaptureRevision !== undefined || state.postCallTerminalGeneration !== undefined);

export const composeMidCallResponse = (state: AISummaryMidCallOwnerState): AISummaryResponse | undefined => {
  if (!state.content) {
    return {...buildAISummaryResponse(state, ''), state: 'NOT_RECEIVED'};
  }
  if (state.content.type === 'text') {
    return buildAISummaryResponse(state, state.content.summaryText);
  }
  if (state.content.type === 'card') {
    return buildAISummaryResponse(state, projectAISummaryCardText(state.content.adaptiveCard));
  }
  return buildAISummaryResponse(state, composeSectionResponse(state.content.sections, MID_CALL_SECTION_KEYS));
};

export const composePostCallResponse = (state: AISummaryPostCallOwnerState): AISummaryResponse | undefined => {
  if (!state.content) {
    return undefined;
  }
  if (state.content.type === 'text') {
    return buildAISummaryResponse(state, state.content.summaryText);
  }
  if (state.content.type !== 'sections') {
    return undefined;
  }
  return buildAISummaryResponse(state, composeSectionResponse(state.content.sections, POST_CALL_SECTION_KEYS));
};

const SDK_FEEDBACK = {
  none: 'none',
  like: 'thumbs_up',
  dislike: 'thumbs_down',
} as const;

const composeSectionResponse = (
  sections: AISummarySection[],
  allowedKeys: ReadonlySet<AISummarySectionKey>
): AISummarySections => {
  const response: AISummarySections = {};
  for (const section of sections) {
    if (allowedKeys.has(section.key)) {
      response[section.key] = section.value;
    }
  }
  return response;
};

const CARD_TEXT_KEYS = new Set(['text', 'title', 'value']);

export const projectAISummaryCardText = (adaptiveCard: unknown): string => {
  const fragments: string[] = [];
  const visit = (value: unknown, key?: string): void => {
    if (typeof value === 'string') {
      if (key && CARD_TEXT_KEYS.has(key) && value.trim().length > 0) {
        fragments.push(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry));
      return;
    }
    if (!isRecord(value)) {
      return;
    }
    for (const [entryKey, entryValue] of Object.entries(value)) {
      visit(entryValue, entryKey);
    }
  };
  visit(adaptiveCard);
  return fragments.join('\n');
};

const buildAISummaryResponse = (
  state: AISummaryOwnerState,
  summary: string | AISummarySections,
  wrapUpCode?: string
): AISummaryResponse => {
  const response: AISummaryResponse = {
    summary,
    feedback: SDK_FEEDBACK[state.feedback],
    state: 'DEFAULT' satisfies AISummaryState,
    numberOfTimesViewed: state.counters.viewed,
    numberOfTimesEdited: state.counters.edited,
    numberOfTimesCopied: state.counters.copied,
    summaryReceived: Boolean(state.content),
    ...(wrapUpCode ? {wrapUpCode} : {}),
  };
  return response;
};

export const composePostCallResponseWithWrapUpCode = (
  state: AISummaryPostCallOwnerState,
  wrapUpCode: string
): AISummaryResponse | undefined => {
  const response = composePostCallResponse(state);
  return response ? {...response, wrapUpCode} : undefined;
};

type AISummaryProjectionOptions = AISummaryViewSelector & {
  eligible: boolean;
  requestPending: boolean;
  state?: AISummaryOwnerState;
  result?: NormalizedAISummaryResult;
};

const viewKeyForProjection = (kind: AISummaryKind, role: AISummaryMidCallRole | 'post-call') =>
  (kind === 'post-call' ? 'post-call:post-call' : `mid-call:${role}`) as AISummaryViewModel['key'];

export const projectAISummarySurface = (options: AISummaryProjectionOptions): AISummaryViewModel => {
  const counters = options.state?.counters ?? emptyAISummaryCounters();
  const feedback = options.state?.feedback ?? 'none';
  const content = options.state?.content;
  const contentRevision = options.state?.contentRevision;
  const midCallFeedbackPending = options.state?.kind === 'mid-call' ? options.state.midCallFeedbackPending : false;
  const controlsDisabled = isPostCallStateFrozen(options.state);
  const completionEscape =
    options.state?.kind === 'post-call' &&
    options.state.postCallGeneration !== undefined &&
    options.state.postCallCompletionEscapeGeneration === options.state.postCallGeneration;
  const hiddenError = options.result?.kind === 'error' && isHiddenAISummaryErrorCategory(options.result.category);
  const eligible = options.eligible && !hiddenError;
  let surface: AISummarySurface = 'omitted';
  if (!eligible) {
    surface = 'omitted';
  } else if (content) {
    surface = 'content';
  } else if (options.requestPending) {
    surface = 'generating';
  } else if (options.result?.kind === 'unsupported') {
    surface = 'unavailable';
  } else if (options.result?.kind === 'error') {
    surface = 'generic-error';
  }
  const key = viewKeyForProjection(options.kind, options.role);
  return {
    key,
    eligible,
    surface,
    requestPending: options.requestPending || midCallFeedbackPending,
    completionEscape,
    content,
    contentRevision,
    counters,
    feedback,
    midCallFeedbackPending,
    feedbackStatus: options.state?.kind === 'post-call' ? options.state.feedbackStatus : undefined,
    controlsDisabled,
    actionType: options.state?.kind === 'mid-call' ? options.state.actionType : undefined,
    ownerKey: options.state?.ownerKey,
  };
};

export const nextPostCallGeneration = (
  installedGeneration: number,
  trigger: AISummaryPostCallRequestTrigger,
  currentGeneration = installedGeneration
): number => (trigger.type === 'reason-commit' ? installedGeneration + 1 : currentGeneration);
