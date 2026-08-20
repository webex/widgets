import {ILogger} from '@webex/cc-store';

export type WxAppTelephonyErrorDisplay = {
  message: string;
  trackingId?: string;
  status?: number | string;
  isWxAppTelephonyError: boolean;
};

export const OFFER_ACTION_ACCEPT_MESSAGE = 'Unable to answer the Call. Please try again';
export const OFFER_ACTION_DECLINE_MESSAGE = 'Unable to decline the Call. Please try again';

export const getOfferActionUserMessage = (action: string): string => {
  if (action === 'accept' || action === 'acceptTask') {
    return OFFER_ACTION_ACCEPT_MESSAGE;
  }
  if (action === 'reject' || action === 'declineTask') {
    return OFFER_ACTION_DECLINE_MESSAGE;
  }
  return OFFER_ACTION_ACCEPT_MESSAGE;
};

export const withOfferActionUserMessage = (
  display: WxAppTelephonyErrorDisplay,
  action: string
): WxAppTelephonyErrorDisplay => ({
  ...display,
  message: getOfferActionUserMessage(action),
});

export type TelephonyToastAction = 'mute' | 'unmute' | 'dtmf';

export const TELEPHONY_MUTE_MESSAGE = "Couldn't mute call. Please try again.";
export const TELEPHONY_UNMUTE_MESSAGE = "Couldn't unmute call. Please try again.";
export const TELEPHONY_DTMF_MESSAGE = "Action didn't work. Please try again.";

export const getTelephonyToastUserMessage = (action: TelephonyToastAction): string => {
  if (action === 'mute') {
    return TELEPHONY_MUTE_MESSAGE;
  }
  if (action === 'unmute') {
    return TELEPHONY_UNMUTE_MESSAGE;
  }
  return TELEPHONY_DTMF_MESSAGE;
};

export const getTelephonyToastDisplay = (
  display: WxAppTelephonyErrorDisplay,
  action: TelephonyToastAction
): WxAppTelephonyErrorDisplay => ({
  ...display,
  message: getTelephonyToastUserMessage(action),
});

type WxAppTelephonyErrorLike = Error & {
  isWxAppTelephonyError?: boolean;
  trackingId?: string;
  status?: number | string;
  statusCode?: number;
};

export const parseWxAppTelephonyError = (error: unknown): WxAppTelephonyErrorDisplay => {
  if (error instanceof Error) {
    const wxError = error as WxAppTelephonyErrorLike;
    return {
      message: error.message || 'Telephony request failed',
      trackingId: wxError.trackingId,
      status: wxError.status ?? wxError.statusCode,
      isWxAppTelephonyError: !!wxError.isWxAppTelephonyError,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Telephony request failed',
    isWxAppTelephonyError: false,
  };
};

export const toWxAppTelephonyError = (display: WxAppTelephonyErrorDisplay): WxAppTelephonyErrorLike => {
  const err = new Error(display.message) as WxAppTelephonyErrorLike;
  err.isWxAppTelephonyError = display.isWxAppTelephonyError;
  if (display.trackingId) {
    err.trackingId = display.trackingId;
  }
  if (display.status !== undefined) {
    err.status = display.status;
  }
  return err;
};

export const reportWxAppTelephonyFailure = (
  error: unknown,
  context: {widget: string; action: string},
  logger: ILogger,
  onErrorCallback?: (widgetName: string, error: Error) => void
): WxAppTelephonyErrorDisplay => {
  const parsed = parseWxAppTelephonyError(error);

  logger.error(`CC-Widgets: ${context.action} failed: ${parsed.message}`, {
    module: 'wxapp-error.utils',
    method: context.action,
    trackingId: parsed.trackingId,
    status: parsed.status,
  });

  if (onErrorCallback) {
    onErrorCallback(context.widget, toWxAppTelephonyError(parsed));
  }

  return parsed;
};
