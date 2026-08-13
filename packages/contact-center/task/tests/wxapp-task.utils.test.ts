import {ITask} from '@webex/contact-center';
import {
  acceptTaskForOffer,
  isWxAppCallingOffer,
  isWxAppEngagedCall,
  rejectTaskForOffer,
  toggleMuteForTask,
  transmitDtmfForTask,
} from '../src/wxapp-task.utils';

const baseTask = {
  accept: jest.fn().mockResolvedValue(undefined),
  decline: jest.fn().mockResolvedValue(undefined),
  toggleMute: jest.fn().mockResolvedValue(undefined),
} as unknown as ITask;

describe('wxapp-task.utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isWxAppCallingOffer', () => {
    it('returns true when isWebexAppCallingOffer is true', () => {
      const task = {
        ...baseTask,
        isWebexAppCallingOffer: () => true,
      } as ITask;
      expect(isWxAppCallingOffer(task)).toBe(true);
    });

    it('returns false when helper is missing', () => {
      expect(isWxAppCallingOffer(baseTask)).toBe(false);
    });
  });

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
  });

  describe('acceptTaskForOffer', () => {
    it('calls acceptOnWebex for wxApp offers', async () => {
      const acceptOnWebex = jest.fn().mockResolvedValue(undefined);
      const task = {
        ...baseTask,
        isWebexAppCallingOffer: () => true,
        acceptOnWebex,
      } as ITask;

      await acceptTaskForOffer(task);

      expect(acceptOnWebex).toHaveBeenCalled();
      expect(baseTask.accept).not.toHaveBeenCalled();
    });

    it('calls accept for non-wxApp offers', async () => {
      await acceptTaskForOffer(baseTask);
      expect(baseTask.accept).toHaveBeenCalled();
    });
  });

  describe('rejectTaskForOffer', () => {
    it('calls rejectOnWebex for wxApp offers', async () => {
      const rejectOnWebex = jest.fn().mockResolvedValue(undefined);
      const task = {
        ...baseTask,
        isWebexAppCallingOffer: () => true,
        rejectOnWebex,
      } as ITask;

      await rejectTaskForOffer(task);

      expect(rejectOnWebex).toHaveBeenCalled();
      expect(baseTask.decline).not.toHaveBeenCalled();
    });
  });

  describe('toggleMuteForTask', () => {
    it('calls toggleMuteOnWebex with muted target for engaged wxApp calls', async () => {
      const toggleMuteOnWebex = jest.fn().mockResolvedValue(undefined);
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => 'call-123',
        toggleMuteOnWebex,
      } as ITask;

      await toggleMuteForTask(task, true);

      expect(toggleMuteOnWebex).toHaveBeenCalledWith({muted: true});
      expect(baseTask.toggleMute).not.toHaveBeenCalled();
    });

    it('calls toggleMute for non-wxApp engaged calls', async () => {
      await toggleMuteForTask(baseTask, true);
      expect(baseTask.toggleMute).toHaveBeenCalled();
    });
  });

  describe('transmitDtmfForTask', () => {
    it('calls transmitDtmfOnWebex for engaged wxApp calls', async () => {
      const transmitDtmfOnWebex = jest.fn().mockResolvedValue(undefined);
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => 'call-123',
        transmitDtmfOnWebex,
      } as ITask;

      await transmitDtmfForTask(task, '5');

      expect(transmitDtmfOnWebex).toHaveBeenCalledWith({dtmf: '5'});
    });

    it('no-ops when transmitDtmfOnWebex is unavailable', async () => {
      const task = {
        ...baseTask,
        getWebexCallingCallId: () => 'call-123',
      } as ITask;

      await expect(transmitDtmfForTask(task, '1')).resolves.toBeUndefined();
    });
  });
});
