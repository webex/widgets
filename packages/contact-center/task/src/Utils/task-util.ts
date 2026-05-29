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

// ==================== CAMPAIGN PREVIEW FUNCTIONS ====================

/**
 * Checks whether the given task is a campaign preview task based on
 * its outboundType or callProcessingDetails.campaignType.
 */
export function isCampaignPreviewTask(task: ITask): boolean {
  const interaction = task.data?.interaction;
  if (!interaction) return false;
  const outboundType = interaction.outboundType ?? '';
  const cpd = interaction.callProcessingDetails as unknown as CampaignCallProcessingDetails;
  const campaignType = cpd?.campaignType ?? '';

  return (
    CAMPAIGN_PREVIEW_OUTBOUND_TYPES.includes(outboundType) || CAMPAIGN_PREVIEW_CAMPAIGN_TYPES.includes(campaignType)
  );
}

/**
 * Checks whether the task is a campaign preview that the agent has not
 * explicitly accepted.  Uses the store's acceptedCampaignIds as the
 * source of truth — the participants.hasJoined flag is unreliable
 * because CampaignContactUpdated payloads can set it even when the
 * agent only skipped or removed the preview.
 */
export function isUnacceptedCampaignPreview(task: ITask, acceptedCampaignIds: Set<string>): boolean {
  if (!isCampaignPreviewTask(task)) return false;

  return !acceptedCampaignIds.has(task.data.interactionId);
}
