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
  logger?,
  acceptControl?: {isVisible: boolean; isEnabled: boolean},
  declineControl?: {isVisible: boolean; isEnabled: boolean},
  isDeclineButtonEnabled?: boolean
): IncomingTaskData => {
  try {
    const accept = acceptControl ?? incomingTask?.uiControls?.accept ?? {isVisible: false, isEnabled: false};
    const sdkDecline = declineControl ?? incomingTask?.uiControls?.decline ?? {isVisible: false, isEnabled: false};
    const decline = {
      ...sdkDecline,
      isEnabled: sdkDecline.isEnabled || !!isDeclineButtonEnabled,
    };

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
    // Extension mode (EPDN): accept button is visible but disabled → show "Ringing..."
    // WebRTC mode (Desktop): accept button is visible and enabled → show "Accept"
    const acceptText = accept.isVisible
      ? isTelephony && !accept.isEnabled
        ? 'Ringing...'
        : 'Accept'
      : undefined;

    const declineText = decline.isVisible ? 'Decline' : undefined;

    // Compute title based on media type
    const title = isSocial ? customerName : ani;

    const disableAccept = !accept.isEnabled;
    const disableDecline = !decline.isEnabled;

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
