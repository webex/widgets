import type {AISummaryFeatureEnablement, ITask} from '@webex/contact-center';

type StoredSummaryEnablement = ITask['aiSummaryCapabilities'];

const getStorageKey = (sessionKey: string): string => `cc-widget-ai-summary-enablement:${sessionKey}`;

const readRecords = (sessionKey: string): Record<string, StoredSummaryEnablement> => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(getStorageKey(sessionKey)) ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, StoredSummaryEnablement>)
      : {};
  } catch {
    return {};
  }
};

export const readAISummaryEnablement = (
  sessionKey: string | undefined,
  interactionId: string
): AISummaryFeatureEnablement | undefined => {
  if (!sessionKey || !interactionId) return undefined;
  const saved = readRecords(sessionKey)[interactionId];
  return saved && typeof saved.midCallEnabled === 'boolean' && typeof saved.postCallEnabled === 'boolean'
    ? {interactionId, midCallEnabled: saved.midCallEnabled, postCallEnabled: saved.postCallEnabled}
    : undefined;
};

export const writeAISummaryEnablement = (
  sessionKey: string | undefined,
  enablement: AISummaryFeatureEnablement
): void => {
  if (!sessionKey || !enablement.interactionId) return;
  try {
    sessionStorage.setItem(
      getStorageKey(sessionKey),
      JSON.stringify({
        ...readRecords(sessionKey),
        [enablement.interactionId]: {
          midCallEnabled: enablement.midCallEnabled === true,
          postCallEnabled: enablement.postCallEnabled === true,
        },
      })
    );
  } catch {
    // Storage is optional in private mode or when quota is exhausted.
  }
};

export const clearAISummaryEnablement = (sessionKey: string | undefined, interactionId?: string): void => {
  if (!sessionKey) return;
  try {
    if (!interactionId) {
      sessionStorage.removeItem(getStorageKey(sessionKey));
      return;
    }
    const records = readRecords(sessionKey);
    delete records[interactionId];
    sessionStorage.setItem(getStorageKey(sessionKey), JSON.stringify(records));
  } catch {
    // Ignore unavailable storage.
  }
};
