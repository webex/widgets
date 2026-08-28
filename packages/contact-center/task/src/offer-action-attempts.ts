const offerActionAttempts: Record<string, number> = {};

/** Test-only reset for module-level offer attempt counters between Jest cases. */
export const resetOfferActionAttemptsForTests = (): void => {
  Object.keys(offerActionAttempts).forEach((interactionId) => {
    delete offerActionAttempts[interactionId];
  });
};

export const nextOfferActionAttempt = (interactionId: string): number => {
  const attemptId = (offerActionAttempts[interactionId] ?? 0) + 1;
  offerActionAttempts[interactionId] = attemptId;
  return attemptId;
};

export const isLatestOfferActionAttempt = (interactionId: string, attemptId: number): boolean => {
  return offerActionAttempts[interactionId] === attemptId;
};
