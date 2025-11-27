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
  disableDecline: boolean;
}

/**
 * Extracts and processes all data needed for rendering an incoming task
 * @param incomingTask - The incoming task object
 * @param isBrowser - Whether the device type is browser
 * @returns Processed task data with computed values
 */
export const extractIncomingTaskData = (
  incomingTask: ITask,
  isBrowser: boolean,
  logger?,
  isDeclineButtonEnabled?: boolean
): IncomingTaskData => {
  try {
    // Extract basic data from task
    //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
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

    // Compute disable state for accept button when auto-answering
    const isAutoAnswering = incomingTask.data.isAutoAnswering || false;
    // Compute disable state for accept button
    const disableAccept = (isTelephony && !isBrowser) || isAutoAnswering;

    const disableDecline = (isTelephony && !isBrowser) || (isAutoAnswering && !isDeclineButtonEnabled);

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
      disableDecline,
    };
  } catch (error) {
    logger?.error('CC-Widgets: IncomingTask: Error in extractIncomingTaskData', {
      module: 'cc-components#incoming-task.utils.tsx',
      method: 'extractIncomingTaskData',
      error: error.message,
    });
    // Return safe default
    return {
      ani: '',
      customerName: '',
      virtualTeamName: '',
      ronaTimeout: null,
      startTimeStamp: Date.now(),
      mediaType: MEDIA_CHANNEL.TELEPHONY,
      mediaChannel: MEDIA_CHANNEL.TELEPHONY,
      isTelephony: true,
      isSocial: false,
      acceptText: 'Accept',
      declineText: undefined,
      title: '',
      disableAccept: false,
      disableDecline: false,
    };
  }
};
