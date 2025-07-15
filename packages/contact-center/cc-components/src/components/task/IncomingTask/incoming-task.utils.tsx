import {MEDIA_CHANNEL} from '../task.types';
import {ITask} from '@webex/cc-store';

export interface IncomingTaskData {
  ani: string;
  customerName: string;
  virtualTeamName: string;
  ronaTimeout: number | null;
  startTimeStamp: number;
  mediaType: string;
  mediaChannel: string;
  isTelephony: boolean;
  isSocial: boolean;
  acceptText: string | undefined;
  declineText: string | undefined;
  title: string;
  disableAccept: boolean;
}

/**
 * Extracts and processes all data needed for rendering an incoming task
 * @param incomingTask - The incoming task object
 * @param isBrowser - Whether the device type is browser
 * @returns Processed task data with computed values
 */
export const extractIncomingTaskData = (incomingTask: ITask, isBrowser: boolean): IncomingTaskData => {
  // Extract basic data from task
  const callAssociationDetails = incomingTask?.data?.interaction?.callAssociatedDetails;
  const ani = callAssociationDetails?.ani;
  const customerName = callAssociationDetails?.customerName;
  const virtualTeamName = callAssociationDetails?.virtualTeamName;
  const ronaTimeout = callAssociationDetails?.ronaTimeout ? Number(callAssociationDetails?.ronaTimeout) : null;
  const startTimeStamp = incomingTask?.data?.interaction?.createdTimestamp;
  const mediaType = incomingTask.data.interaction.mediaType;
  const mediaChannel = incomingTask.data.interaction.mediaChannel;

  // Compute media type flags
  const isTelephony = mediaType === MEDIA_CHANNEL.TELEPHONY;
  const isSocial = mediaType === MEDIA_CHANNEL.SOCIAL;

  // Compute button text based on conditions
  const acceptText = !incomingTask.data.wrapUpRequired
    ? isTelephony && !isBrowser
      ? 'Ringing...'
      : 'Accept'
    : undefined;

  const declineText = !incomingTask.data.wrapUpRequired && isTelephony && isBrowser ? 'Decline' : undefined;

  // Compute title based on media type
  const title = isSocial ? customerName : ani;

  // Compute disable state for accept button
  const disableAccept = isTelephony && !isBrowser;

  return {
    ani,
    customerName,
    virtualTeamName,
    ronaTimeout,
    startTimeStamp,
    mediaType,
    mediaChannel,
    isTelephony,
    isSocial,
    acceptText,
    declineText,
    title,
    disableAccept,
  };
};
