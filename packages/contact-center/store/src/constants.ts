// Task States
export const TASK_STATE_CONSULT = 'consult';
export const TASK_STATE_CONSULTING = 'consulting';
export const TASK_STATE_CONSULT_COMPLETED = 'consultCompleted';

// Interaction States
export const INTERACTION_STATE_WRAPUP = 'wrapUp';
export const INTERACTION_STATE_POST_CALL = 'post_call';
export const INTERACTION_STATE_CONNECTED = 'connected';
export const INTERACTION_STATE_CONFERENCE = 'conference';

// Consult States (participant.consultState)
export const CONSULT_STATE_INITIATED = 'consultInitiated';
export const CONSULT_STATE_COMPLETED = 'consultCompleted';
export const CONSULT_STATE_CONFERENCING = 'conferencing';

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
