import {Interaction} from '@webex/contact-center';

/**
 * Finds the hold timestamp for a specific media type from an interaction.
 * Used by useHoldTimer for hold duration display.
 *
 * Note: There is a separate findHoldTimestamp in @webex/cc-store that takes ITask.
 * This one takes Interaction directly.
 */
export function findHoldTimestamp(interaction: Interaction, mType = 'mainCall'): number | null {
  if (interaction?.media) {
    const media = Object.values(interaction.media).find((m) => m.mType === mType);
    return media?.holdTimestamp ?? null;
  }
  return null;
}
