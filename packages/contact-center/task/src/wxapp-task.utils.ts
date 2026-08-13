import {ITask, TaskUIControls} from '@webex/contact-center';

/**
 * WxApp thick-client telephony methods on ITask (SDK @webex/contact-center — WXCC-6026).
 * Duck-typed until SDK types publish acceptOnWebex / transmitDtmfOnWebex on ITask.
 */
export type WxAppTelephonyTask = ITask & {
  isWebexAppCallingOffer?: () => boolean;
  acceptOnWebex?: () => Promise<unknown>;
  rejectOnWebex?: () => Promise<unknown>;
  toggleMuteOnWebex?: (options?: {lineOwnerId?: string; muted?: boolean}) => Promise<void>;
  transmitDtmfOnWebex?: (options: {dtmf: string; lineOwnerId?: string}) => Promise<void>;
  getWebexCallingCallId?: () => string | null | undefined;
};

/** SDK P0 keypad control — may exist on main leg before InteractionUIControls ships keypad. */
export type TaskMainControlsWithKeypad = TaskUIControls['main'] & {
  keypad?: {isVisible: boolean; isEnabled: boolean};
};

export const getKeypadControl = (controls: TaskUIControls | undefined) =>
  (controls?.main as TaskMainControlsWithKeypad | undefined)?.keypad;

export const isWxAppCallingOffer = (task: ITask | null | undefined): boolean => {
  const wxTask = task as WxAppTelephonyTask | null | undefined;
  return typeof wxTask?.isWebexAppCallingOffer === 'function' && !!wxTask.isWebexAppCallingOffer();
};

export const isWxAppEngagedCall = (task: ITask | null | undefined): boolean => {
  const wxTask = task as WxAppTelephonyTask | null | undefined;
  return typeof wxTask?.getWebexCallingCallId === 'function' && !!wxTask.getWebexCallingCallId();
};

export const acceptTaskForOffer = (task: ITask): Promise<unknown> => {
  const wxTask = task as WxAppTelephonyTask;
  if (isWxAppCallingOffer(task) && typeof wxTask.acceptOnWebex === 'function') {
    return wxTask.acceptOnWebex();
  }
  return task.accept();
};

export const rejectTaskForOffer = (task: ITask): Promise<unknown> => {
  const wxTask = task as WxAppTelephonyTask;
  if (isWxAppCallingOffer(task) && typeof wxTask.rejectOnWebex === 'function') {
    return wxTask.rejectOnWebex();
  }
  return task.decline();
};

export const toggleMuteForTask = (task: ITask, muted: boolean): Promise<void> => {
  const wxTask = task as WxAppTelephonyTask;
  if (isWxAppEngagedCall(task) && typeof wxTask.toggleMuteOnWebex === 'function') {
    return wxTask.toggleMuteOnWebex({muted});
  }
  return task.toggleMute();
};

export const transmitDtmfForTask = (task: ITask, dtmf: string): Promise<void> => {
  const wxTask = task as WxAppTelephonyTask;
  if (isWxAppEngagedCall(task) && typeof wxTask.transmitDtmfOnWebex === 'function') {
    return wxTask.transmitDtmfOnWebex({dtmf});
  }
  return Promise.resolve();
};
