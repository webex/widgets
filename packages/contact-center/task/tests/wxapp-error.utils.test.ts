import {
  getOfferActionUserMessage,
  getTelephonyToastDisplay,
  getTelephonyToastUserMessage,
  OFFER_ACTION_ACCEPT_MESSAGE,
  OFFER_ACTION_DECLINE_MESSAGE,
  parseWxAppTelephonyError,
  reportWxAppTelephonyFailure,
  TELEPHONY_DTMF_MESSAGE,
  TELEPHONY_MUTE_MESSAGE,
  TELEPHONY_UNMUTE_MESSAGE,
  toWxAppTelephonyError,
  withOfferActionUserMessage,
} from '../src/wxapp-error.utils';

const logger = {
  error: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

describe('wxapp-error.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseWxAppTelephonyError', () => {
    it('extracts structured wxApp telephony fields from Error', () => {
      const error = Object.assign(new Error('TELEPHONY_ERROR'), {
        isWxAppTelephonyError: true,
        trackingId: 'track-123',
        status: 400,
      });

      expect(parseWxAppTelephonyError(error)).toEqual({
        message: 'TELEPHONY_ERROR',
        trackingId: 'track-123',
        status: 400,
        isWxAppTelephonyError: true,
      });
    });

    it('returns generic message for unknown errors', () => {
      expect(parseWxAppTelephonyError('network down')).toEqual({
        message: 'network down',
        isWxAppTelephonyError: false,
      });
    });
  });

  describe('reportWxAppTelephonyFailure', () => {
    it('logs, invokes onErrorCallback, and returns parsed display', () => {
      const onErrorCallback = jest.fn();
      const error = Object.assign(new Error('Mute failed'), {
        isWxAppTelephonyError: true,
        trackingId: 'track-mute',
        status: 503,
      });

      const parsed = reportWxAppTelephonyFailure(
        error,
        {widget: 'CallControl', action: 'Mute'},
        logger,
        onErrorCallback
      );

      expect(parsed.trackingId).toBe('track-mute');
      expect(logger.error).toHaveBeenCalled();
      expect(onErrorCallback).toHaveBeenCalledWith('CallControl', expect.objectContaining({message: 'Mute failed'}));
    });

    it('returns parsed display when onErrorCallback throws', () => {
      const onErrorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Host metrics failed');
      });
      const error = Object.assign(new Error('Mute failed'), {
        isWxAppTelephonyError: true,
        trackingId: 'track-mute-throw',
        status: 503,
      });

      const parsed = reportWxAppTelephonyFailure(
        error,
        {widget: 'CallControl', action: 'Mute'},
        logger,
        onErrorCallback
      );

      expect(parsed.trackingId).toBe('track-mute-throw');
      expect(onErrorCallback).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('onErrorCallback failed: Error: Host metrics failed', {
        module: 'wxapp-error.utils',
        method: 'onErrorCallback',
      });
    });
  });

  describe('getOfferActionUserMessage', () => {
    it('returns accept message for accept actions', () => {
      expect(getOfferActionUserMessage('accept')).toBe(OFFER_ACTION_ACCEPT_MESSAGE);
      expect(getOfferActionUserMessage('acceptTask')).toBe(OFFER_ACTION_ACCEPT_MESSAGE);
    });

    it('returns decline message for decline actions', () => {
      expect(getOfferActionUserMessage('reject')).toBe(OFFER_ACTION_DECLINE_MESSAGE);
      expect(getOfferActionUserMessage('declineTask')).toBe(OFFER_ACTION_DECLINE_MESSAGE);
    });
  });

  describe('withOfferActionUserMessage', () => {
    it('replaces SDK message with user-facing offer action text', () => {
      const display = withOfferActionUserMessage(
        {
          message: 'Answer failed',
          trackingId: 'track-accept',
          status: 500,
          isWxAppTelephonyError: true,
        },
        'accept'
      );

      expect(display.message).toBe(OFFER_ACTION_ACCEPT_MESSAGE);
      expect(display.trackingId).toBe('track-accept');
    });
  });

  describe('getTelephonyToastUserMessage', () => {
    it('returns user-facing messages for mute, unmute, and dtmf actions', () => {
      expect(getTelephonyToastUserMessage('mute')).toBe(TELEPHONY_MUTE_MESSAGE);
      expect(getTelephonyToastUserMessage('unmute')).toBe(TELEPHONY_UNMUTE_MESSAGE);
      expect(getTelephonyToastUserMessage('dtmf')).toBe(TELEPHONY_DTMF_MESSAGE);
    });
  });

  describe('getTelephonyToastDisplay', () => {
    it('replaces SDK message with user-facing telephony toast text', () => {
      const display = getTelephonyToastDisplay(
        {
          message: 'Mute failed',
          trackingId: 'track-mute',
          status: 503,
          isWxAppTelephonyError: true,
        },
        'mute'
      );

      expect(display.message).toBe(TELEPHONY_MUTE_MESSAGE);
      expect(display.trackingId).toBe('track-mute');
    });
  });

  describe('toWxAppTelephonyError', () => {
    it('builds Error with wxApp telephony metadata', () => {
      const err = toWxAppTelephonyError({
        message: 'Reject failed',
        trackingId: 'track-reject',
        status: 404,
        isWxAppTelephonyError: true,
      });

      expect(err.message).toBe('Reject failed');
      expect(err.trackingId).toBe('track-reject');
      expect(err.status).toBe(404);
      expect(err.isWxAppTelephonyError).toBe(true);
    });
  });
});
