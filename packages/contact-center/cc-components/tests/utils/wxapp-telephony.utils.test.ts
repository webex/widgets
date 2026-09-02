import {ITask} from '@webex/contact-center';
import {isWxAppEngagedCall, shouldShowWxAppTelephonyControls} from '../../src/utils/wxapp-telephony.utils';

const baseTask = {
  accept: jest.fn().mockResolvedValue(undefined),
  decline: jest.fn().mockResolvedValue(undefined),
  toggleMute: jest.fn().mockResolvedValue(undefined),
} as unknown as ITask;

describe('wxapp-telephony.utils', () => {
  describe('isWxAppEngagedCall', () => {
    it('returns true when getWebexCallingCallId returns a call id', () => {
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => 'call-123',
      } as ITask;
      expect(isWxAppEngagedCall(task)).toBe(true);
    });

    it('returns false when call id is empty', () => {
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => '',
      } as ITask;
      expect(isWxAppEngagedCall(task)).toBe(false);
    });

    it('returns false when helper is missing', () => {
      expect(isWxAppEngagedCall(baseTask)).toBe(false);
    });
  });

  describe('shouldShowWxAppTelephonyControls', () => {
    it('returns true when flag is on and wxApp call id is set', () => {
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => 'call-123',
      } as ITask;
      expect(shouldShowWxAppTelephonyControls(true, task)).toBe(true);
    });

    it('returns false when flag is off even with wxApp call id', () => {
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => 'call-123',
      } as ITask;
      expect(shouldShowWxAppTelephonyControls(false, task)).toBe(false);
    });

    it('returns false when flag is on but wxApp is not engaged', () => {
      expect(shouldShowWxAppTelephonyControls(true, baseTask)).toBe(false);
    });
  });
});
