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
