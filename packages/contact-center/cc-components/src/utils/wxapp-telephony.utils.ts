import {ITask} from '@webex/cc-store';

/** Duck-type wxApp engaged call — visibility only; SDK owns mute/DTMF API routing. */
type WxAppTelephonyTaskForVisibility = ITask & {
  getWebexCallingCallId?: () => string | null | undefined;
};

/**
 * Returns true when the task represents an active wxApp thick-client telephony session.
 * Visibility gate only — does not route mute or DTMF SDK calls.
 */
export const isWxAppEngagedCall = (task: ITask | null | undefined): boolean => {
  const wxTask = task as WxAppTelephonyTaskForVisibility | null | undefined;
  return typeof wxTask?.getWebexCallingCallId === 'function' && !!wxTask.getWebexCallingCallId();
};

/**
 * Thick-client main-bar Mute/Keypad visibility gate.
 * Requires host init flag ON and an engaged wxApp call id on the task.
 */
export const shouldShowWxAppTelephonyControls = (
  enableWxBetterTogether: boolean,
  task: ITask | null | undefined
): boolean => enableWxBetterTogether === true && isWxAppEngagedCall(task);
