import {MEDIA_CHANNEL, getCallerIdentifier} from '../task.types';
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
  isDeclineButtonEnabled?: boolean,
  isBrowser?: boolean
): IncomingTaskData => {
  try {
    const accept = acceptControl ?? incomingTask?.uiControls?.main?.accept ?? {isVisible: false, isEnabled: false};
    const sdkDecline = declineControl ??
      incomingTask?.uiControls?.main?.decline ?? {isVisible: false, isEnabled: false};
    const decline = {
      ...sdkDecline,
      isEnabled: sdkDecline.isEnabled || !!isDeclineButtonEnabled,
    };

    // Extract basic data from task
    const callAssociationDetails = incomingTask?.data?.interaction?.callAssociatedDetails;
    const isOutdial = incomingTask?.data?.interaction?.outboundType === 'OUTDIAL';
    const dnis = callAssociationDetails?.dnis || incomingTask?.data?.interaction?.callProcessingDetails?.dnis;
    const ani = isOutdial ? dnis || callAssociationDetails?.ani : callAssociationDetails?.ani;
    const dn = callAssociationDetails?.dn;
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
    // Extension mode (any call): accept visible but disabled → show "Ringing..."
    // Desktop/WebRTC outdial: accept visible but disabled → show "Accept" (auto-answer handles it)
    // Desktop/WebRTC inbound: accept visible and enabled → show "Accept"
    const showRinging = isTelephony && !accept.isEnabled && !(isBrowser && isOutdial);
    const showCalling = isTelephony && isOutdial && accept.isVisible && !accept.isEnabled && decline.isVisible;
    const acceptText = accept.isVisible
      ? showCalling
        ? 'Calling...'
        : showRinging
          ? 'Ringing...'
          : 'Accept'
      : undefined;

    const declineText = decline.isVisible ? 'Decline' : undefined;

    // Compute title based on media type
    const outboundType = incomingTask?.data?.interaction?.outboundType;
    const title = isSocial ? customerName : getCallerIdentifier(ani, dn, outboundType);

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
