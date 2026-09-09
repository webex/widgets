// Relationship Types
export const RELATIONSHIP_TYPE_CONSULT = 'consult';

export const AGENT = 'Agent';
export const CUSTOMER = 'Customer';
export const SUPERVISOR = 'Supervisor';
/**
 * Virtual Voice Assistant (VVA) - Automated participant type
 * Used to identify bot/automated participants in interactions
 */
export const VVA = 'VVA';

/**
 * Participant types to exclude from active agent participant counts
 * Used for filtering conference participants and consult operations
 */
export const EXCLUDED_PARTICIPANT_TYPES = [CUSTOMER, SUPERVISOR, VVA];

export const MEDIA_TYPE_CONSULT = 'consult';

export const AI_FEATURE_SUGGESTED_RESPONSES_KEY = 'isSuggestedResponsesEnabled';
export const AI_FEATURE_WELLNESS_BREAK_KEY = 'isWellnessBreakEnabled';

export const TASK_MULTI_LOGIN_HYDRATE = 'task:multiLoginHydrate';

export const SUGGESTED_RESPONSE_EVENT = 'SUGGESTED_RESPONSE';

/**
 * State Control V2 events used only by the first-party wellness integration.
 * They are deliberately kept out of the public store event contract.
 * @internal
 */
export const INTERNAL_AGENT_STATE_CONTROL_EVENTS = {
  AGENT_CHANNEL_RELOGIN_SUCCESS: 'AgentChannelReloginSuccess',
  AGENT_CHANNEL_STATE_CHANGED: 'AgentChannelStateChanged',
} as const;
