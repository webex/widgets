export const AGENT = 'Agent';
export const CUSTOMER = 'Customer';
export const SUPERVISOR = 'Supervisor';
export const VVA = 'VVA';
export const MAX_PARTICIPANTS_IN_MULTIPARTY_CONFERENCE = 7;
export const MAX_PARTICIPANTS_IN_THREE_PARTY_CONFERENCE = 2;

// Interaction States
export const INTERACTION_STATE_WRAPUP = 'wrapUp';
export const INTERACTION_STATE_POST_CALL = 'post_call';
export const INTERACTION_STATE_CONNECTED = 'connected';
export const INTERACTION_STATE_CONFERENCE = 'conference';

// Task States
export const TASK_STATE_CONSULT = 'consult';
export const TASK_STATE_CONSULTING = 'consulting';
export const TASK_STATE_CONSULT_COMPLETED = 'consultCompleted';

// Consult States (participant.consultState)
export const CONSULT_STATE_INITIATED = 'consultInitiated';
export const CONSULT_STATE_COMPLETED = 'consultCompleted';
export const CONSULT_STATE_CONFERENCING = 'conferencing';

// Media Types
export const MEDIA_TYPE_TELEPHONY = 'telephony';
export const MEDIA_TYPE_CHAT = 'chat';
export const MEDIA_TYPE_EMAIL = 'email';
export const MEDIA_TYPE_CONSULT = 'consult';

// Relationship Types
export const RELATIONSHIP_TYPE_CONSULT = 'consult';

export enum ConsultStatus {
  NO_CONSULTATION_IN_PROGRESS = 'No consultation in progress',
  BEING_CONSULTED = 'beingConsulted',
  CONSULT_INITIATED = 'consultInitiated',
  BEING_CONSULTED_ACCEPTED = 'beingConsultedAccepted',
  CONSULT_ACCEPTED = 'consultAccepted',
  CONNECTED = 'connected',
  CONFERENCE = 'conference',
}
