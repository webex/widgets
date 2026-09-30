/** Short-lived, session-scoped recovery data owned by the wellness widget. @internal */
export interface WellnessBreakRecoveryMarkerV1 {
  version: 1;
  agentSessionId: string;
  preBreakLegacyState?: string;
  preBreakLegacyAuxCodeId?: string;
}
