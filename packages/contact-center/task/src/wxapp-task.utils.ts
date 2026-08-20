import {ITask} from '@webex/contact-center';

/**
 * UI visibility helpers for wxApp thick-client telephony (WXCC-6026).
 * Telephony routing is owned by the SDK via task.accept/decline/toggleMute/transmitDtmf.
 */
export const isWxAppEngagedCall = (task: ITask | null | undefined): boolean => {
  const voiceTask = task as ITask & {getWebexCallingCallId?: () => string | null | undefined};
  return typeof voiceTask?.getWebexCallingCallId === 'function' && !!voiceTask.getWebexCallingCallId();
};

/** Thick-client main-bar Mute/Keypad visibility gate — does not affect mute API routing. */
export const shouldShowWxAppTelephonyControls = (
  enableWxBetterTogether: boolean,
  task: ITask | null | undefined
): boolean => enableWxBetterTogether === true && isWxAppEngagedCall(task);
