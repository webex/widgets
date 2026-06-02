import {Interaction} from '@webex/contact-center';

const HOLD_ANCHOR_PREFIX = 'cc-widget-hold-anchor:';
const CONSULT_HOLD_ANCHOR_PREFIX = 'cc-widget-consult-hold-anchor:';

type ConsultMediaEntry = {
  holdTimestamp?: number | null;
};

export const getHoldAnchorStorageKey = (interactionId: string): string => `${HOLD_ANCHOR_PREFIX}${interactionId}`;

export const getConsultHoldAnchorStorageKey = (interactionId: string): string =>
  `${CONSULT_HOLD_ANCHOR_PREFIX}${interactionId}`;

export const normalizeHoldTimestampMs = (raw: number): number => (raw < 10000000000 ? raw * 1000 : raw);

export const readHoldAnchor = (interactionId: string | undefined): number | null => {
  if (!interactionId || typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(getHoldAnchorStorageKey(interactionId));
    if (!stored) {
      return null;
    }
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

export const writeHoldAnchor = (interactionId: string | undefined, timestampMs: number): void => {
  if (!interactionId || typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(getHoldAnchorStorageKey(interactionId), String(timestampMs));
  } catch {
    // Ignore quota / private-mode errors.
  }
};

export const clearHoldAnchor = (interactionId: string | undefined): void => {
  if (!interactionId || typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(getHoldAnchorStorageKey(interactionId));
  } catch {
    // Ignore storage errors.
  }
};

export const readConsultHoldAnchor = (interactionId: string | undefined): number | null => {
  if (!interactionId || typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(getConsultHoldAnchorStorageKey(interactionId));
    if (!stored) {
      return null;
    }
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

export const writeConsultHoldAnchor = (interactionId: string | undefined, timestampMs: number): void => {
  if (!interactionId || typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(getConsultHoldAnchorStorageKey(interactionId), String(timestampMs));
  } catch {
    // Ignore quota / private-mode errors.
  }
};

export const clearConsultHoldAnchor = (interactionId: string | undefined): void => {
  if (!interactionId || typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(getConsultHoldAnchorStorageKey(interactionId));
  } catch {
    // Ignore storage errors.
  }
};

const getMatchingMedia = (interaction: Interaction, mType: string) => {
  if (!interaction?.media) {
    return [];
  }

  return Object.values(interaction.media).filter(
    (media) => media.mType === mType || (mType === 'mainCall' && media.mType === 'main')
  );
};

/**
 * Finds the hold timestamp for a specific media type from an interaction.
 * Used by useHoldTimer for hold duration display.
 *
 * Note: There is a separate findHoldTimestamp in @webex/cc-store that takes ITask.
 * This one takes Interaction directly.
 */
export function findHoldTimestamp(interaction: Interaction, mType = 'mainCall'): number | null {
  const matchingMedia = getMatchingMedia(interaction, mType);

  if (matchingMedia.length === 0) {
    return null;
  }

  for (const media of matchingMedia) {
    if (media.isHold === true && media.holdTimestamp != null && media.holdTimestamp > 0) {
      return media.holdTimestamp;
    }
  }

  // Hydrate/refresh: backend may retain holdTimestamp while isHold lags (consulted Agent 2).
  let latestTimestamp: number | null = null;
  for (const media of matchingMedia) {
    if (media.holdTimestamp != null && media.holdTimestamp > 0) {
      latestTimestamp = latestTimestamp == null ? media.holdTimestamp : Math.max(latestTimestamp, media.holdTimestamp);
    }
  }

  return latestTimestamp;
}

/**
 * Resolve main CAD hold timer anchor in milliseconds.
 * Prefers interaction media; falls back to session anchor for refresh continuity.
 */
export function resolveMainCadHoldTimestampMs(
  interaction: Interaction | undefined,
  isHeld: boolean,
  interactionId?: string
): number | null {
  if (!isHeld || !interaction) {
    return null;
  }

  const mediaTimestamp = findHoldTimestamp(interaction, 'mainCall');
  if (mediaTimestamp != null && mediaTimestamp > 0) {
    return normalizeHoldTimestampMs(mediaTimestamp);
  }

  return readHoldAnchor(interactionId ?? interaction.interactionId);
}

/**
 * Resolve consult-leg hold timer anchor in milliseconds (Agent 1 initiator CAD).
 */
export function resolveConsultHoldTimestampMs(
  consultMedia: ConsultMediaEntry | null | undefined,
  interactionId?: string
): number {
  const raw = consultMedia?.holdTimestamp;
  if (raw != null && raw > 0) {
    return normalizeHoldTimestampMs(raw);
  }

  return readConsultHoldAnchor(interactionId) ?? Date.now();
}
