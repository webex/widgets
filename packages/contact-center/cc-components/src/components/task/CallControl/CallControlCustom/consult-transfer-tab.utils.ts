export type ConsultTransferAction = 'Consult' | 'Transfer';

export type ConsultTransferInteractionContext = {
  contactDirectionType?: string;
  outdialTransferToQueueEnabled?: boolean;
  mediaType?: string;
};

export const isCollaborationAccessEnabled = (access?: string): boolean => access?.toLowerCase() !== 'none';

export const isQueueEnabled = (
  action: ConsultTransferAction,
  allowConsultToQueue: boolean,
  interaction: ConsultTransferInteractionContext,
  isTelephony: boolean
): boolean => {
  if (!isTelephony) {
    return true;
  }

  if (action === 'Consult') {
    return allowConsultToQueue;
  }

  const direction = interaction.contactDirectionType?.toUpperCase();
  if (direction === 'INBOUND') {
    return true;
  }
  if (direction === 'OUTBOUND') {
    return interaction.outdialTransferToQueueEnabled === true;
  }

  return true;
};

export const isAgentsTabVisible = (accessBuddyTeam?: string): boolean => isCollaborationAccessEnabled(accessBuddyTeam);

export const isQueuesTabVisible = (
  action: ConsultTransferAction,
  allowConsultToQueue: boolean,
  accessQueue: string | undefined,
  interaction: ConsultTransferInteractionContext,
  isTelephony: boolean
): boolean =>
  isCollaborationAccessEnabled(accessQueue) && isQueueEnabled(action, allowConsultToQueue, interaction, isTelephony);

export const isEntryPointTabVisible = (
  showEntryPointTab: boolean,
  accessEntryPoint: string | undefined,
  isTelephony: boolean
): boolean => showEntryPointTab && isTelephony && isCollaborationAccessEnabled(accessEntryPoint);
