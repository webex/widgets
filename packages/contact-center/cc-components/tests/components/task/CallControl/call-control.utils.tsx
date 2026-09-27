import '@testing-library/jest-dom';
import type {AISummaryPreActionSendResult, ITask} from '@webex/cc-store';
import {createEnabledMainTaskUIControls, enabledControl} from '@webex/test-fixtures';
import {
  handleToggleHold,
  handleMuteToggle,
  handleWrapupCall,
  handleWrapupChange,
  handleTargetSelect,
  getMediaType,
  isTelephonyMediaType,
  buildCallControlButtons,
  filterButtonsForConsultation,
  getConsultFilterPhase,
  updateCallStateFromTask,
  handleCloseButtonPress,
  handleWrapupReasonChange,
  handleAudioRef,
  onInputDialNumber,
  handleButtonPress,
  applyWxAppTelephonyControlVisibility,
  runMidCallActionBeforeTelephony,
} from '../../../../src/components/task/CallControl/call-control.utils';
import type {WrapupCompletionResult} from '../../../../src/components/task/task.types';
import * as utils from '../../../../src/utils';

// Mock the external utilities
jest.mock('../../../../src/utils', () => ({
  getMediaTypeInfo: jest.fn(),
}));

const loggerMock = {
  info: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
};

describe('CallControl Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockCurrentTask = {
    data: {
      interaction: {
        mediaType: 'telephony',
        mediaChannel: 'telephony',
        media: {
          'media-resource-1': {
            isHold: false,
          },
        },
        callProcessingDetails: {
          isPaused: false,
        },
      },
      mediaResourceId: 'media-resource-1',
    },
  };

  const mockControls = createEnabledMainTaskUIControls({wrapup: enabledControl});

  const mockMediaTypeInfo = {
    labelName: 'Call',
  };

  describe('onInputDialNumber', () => {
    it('should set value from event currentTarget.value', () => {
      const setValue = jest.fn();
      const event = {currentTarget: {value: '12345'}};
      onInputDialNumber(event, setValue);
      expect(setValue).toHaveBeenCalledWith('12345');
    });
  });

  describe('handleButtonPress', () => {
    it('should log info and call onButtonPress with value', () => {
      const logger = {info: jest.fn()};
      const onButtonPress = jest.fn();
      const value = '67890';
      handleButtonPress(logger, onButtonPress, value);
      expect(logger.info).toHaveBeenCalledWith(
        'Dial Number button pressed',
        expect.objectContaining({module: 'consult-transfer-dial-number.tsx', method: 'handleButtonPress'})
      );
      expect(onButtonPress).toHaveBeenCalledWith('67890');
    });
  });

  describe('handleToggleHold', () => {
    it('should toggle hold from false to true', () => {
      const mockToggleHold = jest.fn();

      handleToggleHold(false, mockToggleHold, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: is Call On Hold status is false', {
        module: 'call-control.tsx',
        method: 'handletoggleHold',
      });
      expect(mockToggleHold).toHaveBeenCalledWith(true);
    });

    it('should toggle hold from true to false', () => {
      const mockToggleHold = jest.fn();

      handleToggleHold(true, mockToggleHold, loggerMock);

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: is Call On Hold status is true', {
        module: 'call-control.tsx',
        method: 'handletoggleHold',
      });
      expect(mockToggleHold).toHaveBeenCalledWith(false);
    });
  });

  describe('handleMuteToggle', () => {
    it('should disable button, call toggleMute, and re-enable button after completion', async () => {
      const mockToggleMute = jest.fn().mockResolvedValue(undefined);
      const mockSetIsMuteButtonDisabled = jest.fn();

      await handleMuteToggle(mockToggleMute, mockSetIsMuteButtonDisabled, loggerMock);

      expect(mockSetIsMuteButtonDisabled).toHaveBeenCalledWith(true);
      expect(mockToggleMute).toHaveBeenCalled();
      expect(mockSetIsMuteButtonDisabled).toHaveBeenCalledWith(false);
    });

    it('should keep button disabled until toggleMute promise settles', async () => {
      let resolveMute!: () => void;
      const mockToggleMute = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveMute = resolve;
          })
      );
      const mockSetIsMuteButtonDisabled = jest.fn();

      const promise = handleMuteToggle(mockToggleMute, mockSetIsMuteButtonDisabled, loggerMock);

      expect(mockSetIsMuteButtonDisabled).toHaveBeenCalledWith(true);
      expect(mockSetIsMuteButtonDisabled).not.toHaveBeenCalledWith(false);

      resolveMute();
      await promise;

      expect(mockSetIsMuteButtonDisabled).toHaveBeenCalledWith(false);
    });

    it('should handle error and still re-enable button', async () => {
      const mockToggleMute = jest.fn().mockRejectedValue(new Error('Mute failed'));
      const mockSetIsMuteButtonDisabled = jest.fn();

      await handleMuteToggle(mockToggleMute, mockSetIsMuteButtonDisabled, loggerMock);

      expect(mockSetIsMuteButtonDisabled).toHaveBeenCalledWith(true);
      expect(loggerMock.error).toHaveBeenCalledWith('Mute toggle failed: Error: Mute failed', {
        module: 'call-control.tsx',
        method: 'handleMuteToggle',
      });
      expect(mockSetIsMuteButtonDisabled).toHaveBeenCalledWith(false);
    });
  });

  describe('handleWrapupCall', () => {
    it('should call wrapupCall and reset state when both reason and id are provided', async () => {
      const mockWrapupCall = jest.fn().mockResolvedValue({wrapup: 'succeeded', response: 'not-required'});
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      await expect(
        handleWrapupCall(
          'Test Reason',
          'test-id',
          mockWrapupCall,
          mockSetSelectedWrapupReason,
          mockSetSelectedWrapupId,
          loggerMock
        )
      ).resolves.toEqual({wrapup: 'succeeded', response: 'not-required'});

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: wrap-up submitted', {
        module: 'call-control.tsx',
        method: 'handleWrapupCall',
      });
      expect(mockWrapupCall).toHaveBeenCalledWith('Test Reason', 'test-id');
      expect(mockSetSelectedWrapupReason).toHaveBeenCalledWith(null);
      expect(mockSetSelectedWrapupId).toHaveBeenCalledWith(null);
      expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControl: wrapup completed', {
        module: 'call-control.tsx',
        method: 'handleWrapupCall',
      });
    });

    it('should treat a legacy void wrapupCall return as succeeded without an AI response', async () => {
      const mockWrapupCall = jest.fn(() => undefined) as unknown as (
        reason: string,
        id: string
      ) => Promise<WrapupCompletionResult>;
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      await expect(
        handleWrapupCall(
          'Legacy Reason',
          'legacy-id',
          mockWrapupCall,
          mockSetSelectedWrapupReason,
          mockSetSelectedWrapupId,
          loggerMock
        )
      ).resolves.toEqual({wrapup: 'succeeded', response: 'not-required'});

      expect(mockWrapupCall).toHaveBeenCalledWith('Legacy Reason', 'legacy-id');
      expect(mockSetSelectedWrapupReason).toHaveBeenCalledWith(null);
      expect(mockSetSelectedWrapupId).toHaveBeenCalledWith(null);
      expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControl: wrapup completed', {
        module: 'call-control.tsx',
        method: 'handleWrapupCall',
      });
    });

    it('should treat a non-result wrapupCall return as legacy fire-and-forget success', async () => {
      const mockWrapupCall = jest.fn().mockResolvedValue('legacy-complete') as unknown as (
        reason: string,
        id: string
      ) => Promise<WrapupCompletionResult>;
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      await expect(
        handleWrapupCall(
          'Legacy Reason',
          'legacy-id',
          mockWrapupCall,
          mockSetSelectedWrapupReason,
          mockSetSelectedWrapupId,
          loggerMock
        )
      ).resolves.toEqual({wrapup: 'succeeded', response: 'not-required'});

      expect(mockSetSelectedWrapupReason).toHaveBeenCalledWith(null);
      expect(mockSetSelectedWrapupId).toHaveBeenCalledWith(null);
    });

    it('should keep an explicit failed wrapupCall result authoritative', async () => {
      const mockWrapupCall = jest.fn().mockResolvedValue({wrapup: 'failed'});
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      await expect(
        handleWrapupCall(
          'Test Reason',
          'test-id',
          mockWrapupCall,
          mockSetSelectedWrapupReason,
          mockSetSelectedWrapupId,
          loggerMock
        )
      ).resolves.toEqual({wrapup: 'failed'});

      expect(mockSetSelectedWrapupReason).not.toHaveBeenCalled();
      expect(mockSetSelectedWrapupId).not.toHaveBeenCalled();
      expect(loggerMock.log).not.toHaveBeenCalled();
    });

    it.each([
      {wrapup: 'succeeded' as const, response: 'submitted' as const},
      {wrapup: 'succeeded' as const, response: 'response-failed' as const},
    ])('should clear reason and id after successful wrapup with $response response', async (wrapupResult) => {
      const mockWrapupCall = jest.fn().mockResolvedValue(wrapupResult);
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      await expect(
        handleWrapupCall(
          'Test Reason',
          'test-id',
          mockWrapupCall,
          mockSetSelectedWrapupReason,
          mockSetSelectedWrapupId,
          loggerMock
        )
      ).resolves.toEqual(wrapupResult);

      expect(mockSetSelectedWrapupReason).toHaveBeenCalledWith(null);
      expect(mockSetSelectedWrapupId).toHaveBeenCalledWith(null);
      expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControl: wrapup completed', {
        module: 'call-control.tsx',
        method: 'handleWrapupCall',
      });
    });

    it.each([
      {
        name: 'rejected',
        wrapupCall: jest.fn().mockRejectedValue(new Error('Wrap-up rejected')),
      },
      {
        name: 'synchronously thrown',
        wrapupCall: jest.fn(() => {
          throw new Error('Wrap-up threw');
        }),
      },
    ])('should retain reason and id when wrapupCall is $name', async ({wrapupCall}) => {
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      await expect(
        handleWrapupCall(
          'Test Reason',
          'test-id',
          wrapupCall,
          mockSetSelectedWrapupReason,
          mockSetSelectedWrapupId,
          loggerMock
        )
      ).resolves.toEqual({wrapup: 'failed'});

      expect(mockSetSelectedWrapupReason).not.toHaveBeenCalled();
      expect(mockSetSelectedWrapupId).not.toHaveBeenCalled();
      expect(loggerMock.log).not.toHaveBeenCalled();
    });

    it('should not call wrapupCall when reason is null', () => {
      const mockWrapupCall = jest.fn();
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      handleWrapupCall(
        null,
        'test-id',
        mockWrapupCall,
        mockSetSelectedWrapupReason,
        mockSetSelectedWrapupId,
        loggerMock
      );

      expect(loggerMock.info).toHaveBeenCalled();
      expect(mockWrapupCall).not.toHaveBeenCalled();
      expect(mockSetSelectedWrapupReason).not.toHaveBeenCalled();
      expect(mockSetSelectedWrapupId).not.toHaveBeenCalled();
      expect(loggerMock.log).not.toHaveBeenCalled();
    });

    it('should not call wrapupCall when id is null', () => {
      const mockWrapupCall = jest.fn();
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      handleWrapupCall(
        'Test Reason',
        null,
        mockWrapupCall,
        mockSetSelectedWrapupReason,
        mockSetSelectedWrapupId,
        loggerMock
      );

      expect(loggerMock.info).toHaveBeenCalled();
      expect(mockWrapupCall).not.toHaveBeenCalled();
      expect(mockSetSelectedWrapupReason).not.toHaveBeenCalled();
      expect(mockSetSelectedWrapupId).not.toHaveBeenCalled();
      expect(loggerMock.log).not.toHaveBeenCalled();
    });
  });

  describe('handleWrapupChange', () => {
    it('should call both setter functions with correct values', () => {
      const mockSetSelectedWrapupReason = jest.fn();
      const mockSetSelectedWrapupId = jest.fn();

      handleWrapupChange('New Reason', 'new-id', mockSetSelectedWrapupReason, mockSetSelectedWrapupId);

      expect(mockSetSelectedWrapupReason).toHaveBeenCalledWith('New Reason');
      expect(mockSetSelectedWrapupId).toHaveBeenCalledWith('new-id');
    });
  });

  describe('handleTargetSelect', () => {
    const mockConsultCall = jest.fn();
    const mockTransferCall = jest.fn();
    const mockSetConsultAgentName = jest.fn();
    const mockSetLastTargetType = jest.fn();

    beforeEach(() => {
      mockConsultCall.mockClear();
      mockTransferCall.mockClear();
      mockSetConsultAgentName.mockClear();
      mockSetLastTargetType.mockClear();
    });

    it('should handle consult call successfully', async () => {
      await handleTargetSelect(
        'agent-123',
        'John Doe',
        'agent',
        false,
        'Consult',
        mockConsultCall,
        mockTransferCall,
        mockSetConsultAgentName,
        mockSetLastTargetType,
        loggerMock
      );

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: handling target agent selected', {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
      expect(mockConsultCall).toHaveBeenCalledWith('agent-123', 'agent', false);
      expect(mockSetConsultAgentName).toHaveBeenCalledWith('John Doe');
      expect(mockSetLastTargetType).toHaveBeenCalledWith('agent');
      expect(mockTransferCall).not.toHaveBeenCalled();
    });

    it('should commit consult UI state only after pre-action and consult fulfillment settle', async () => {
      const response = deferred<{outcome: 'sent'}>();
      const consult = deferred<void>();
      const order: string[] = [];
      let resolveConsultStarted!: () => void;
      const consultStarted = new Promise<void>((resolve) => {
        resolveConsultStarted = resolve;
      });
      const beforeAction = jest.fn(() => {
        order.push('pre-action');
        return response.promise;
      });
      mockConsultCall.mockImplementation(() => {
        order.push('consult');
        resolveConsultStarted();
        return consult.promise;
      });

      const result = handleTargetSelect(
        'agent-123',
        'John Doe',
        'agent',
        false,
        'Consult',
        mockConsultCall,
        mockTransferCall,
        mockSetConsultAgentName,
        mockSetLastTargetType,
        loggerMock,
        beforeAction
      );

      await Promise.resolve();

      expect(beforeAction).toHaveBeenCalledTimes(1);
      expect(mockConsultCall).not.toHaveBeenCalled();
      expect(mockSetConsultAgentName).not.toHaveBeenCalled();
      expect(mockSetLastTargetType).not.toHaveBeenCalled();

      response.resolve({outcome: 'sent'});
      await consultStarted;

      expect(order).toEqual(['pre-action', 'consult']);
      expect(mockConsultCall).toHaveBeenCalledTimes(1);
      expect(mockSetConsultAgentName).not.toHaveBeenCalled();
      expect(mockSetLastTargetType).not.toHaveBeenCalled();

      consult.resolve();
      await result;

      expect(mockSetConsultAgentName).toHaveBeenCalledWith('John Doe');
      expect(mockSetLastTargetType).toHaveBeenCalledWith('agent');
    });

    it('should consume consult promise rejection without committing consult UI state', async () => {
      mockConsultCall.mockRejectedValue(new Error('Async consult failed'));

      await expect(
        handleTargetSelect(
          'agent-123',
          'John Doe',
          'agent',
          false,
          'Consult',
          mockConsultCall,
          mockTransferCall,
          mockSetConsultAgentName,
          mockSetLastTargetType,
          loggerMock
        )
      ).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith('Error during consult call: Error: Async consult failed', {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
      expect(mockSetConsultAgentName).not.toHaveBeenCalled();
      expect(mockSetLastTargetType).not.toHaveBeenCalled();
    });

    it('should handle transfer call successfully', async () => {
      await handleTargetSelect(
        'queue-456',
        'Support Queue',
        'queue',
        false,
        'Transfer',
        mockConsultCall,
        mockTransferCall,
        mockSetConsultAgentName,
        mockSetLastTargetType,
        loggerMock
      );

      expect(loggerMock.info).toHaveBeenCalledWith('CC-Widgets: CallControl: handling target agent selected', {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
      expect(mockTransferCall).toHaveBeenCalledWith('queue-456', 'queue');
      expect(mockConsultCall).not.toHaveBeenCalled();
      expect(mockSetConsultAgentName).not.toHaveBeenCalled();
      expect(mockSetLastTargetType).not.toHaveBeenCalled();
    });

    it('should handle consult call error', async () => {
      mockConsultCall.mockImplementation(() => {
        throw new Error('Consult failed');
      });

      await expect(
        handleTargetSelect(
          'agent-123',
          'John Doe',
          'agent',
          false,
          'Consult',
          mockConsultCall,
          mockTransferCall,
          mockSetConsultAgentName,
          mockSetLastTargetType,
          loggerMock
        )
      ).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith('Error during consult call: Error: Consult failed', {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
      expect(mockSetConsultAgentName).not.toHaveBeenCalled();
      expect(mockSetLastTargetType).not.toHaveBeenCalled();
    });

    it('should handle transfer call error', async () => {
      mockTransferCall.mockImplementation(() => {
        throw new Error('Transfer failed');
      });

      await expect(
        handleTargetSelect(
          'queue-456',
          'Support Queue',
          'queue',
          false,
          'Transfer',
          mockConsultCall,
          mockTransferCall,
          mockSetConsultAgentName,
          mockSetLastTargetType,
          loggerMock
        )
      ).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith('Error during transfer call: Error: Transfer failed', {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
    });

    it('should consume transfer promise rejection', async () => {
      mockTransferCall.mockRejectedValue(new Error('Async transfer failed'));

      await expect(
        handleTargetSelect(
          'queue-456',
          'Support Queue',
          'queue',
          false,
          'Transfer',
          mockConsultCall,
          mockTransferCall,
          mockSetConsultAgentName,
          mockSetLastTargetType,
          loggerMock
        )
      ).resolves.toBeUndefined();

      expect(loggerMock.error).toHaveBeenCalledWith('Error during transfer call: Error: Async transfer failed', {
        module: 'call-control.tsx',
        method: 'handleTargetSelect',
      });
    });

    it('should do nothing when agentMenuType is null', () => {
      handleTargetSelect(
        'agent-123',
        'John Doe',
        'agent',
        false,
        null,
        mockConsultCall,
        mockTransferCall,
        mockSetConsultAgentName,
        mockSetLastTargetType,
        loggerMock
      );

      expect(mockConsultCall).not.toHaveBeenCalled();
      expect(mockTransferCall).not.toHaveBeenCalled();
    });
  });

  describe('runMidCallActionBeforeTelephony', () => {
    const summary = {
      state: 'content' as const,
      content: {type: 'text' as const, summaryText: 'Customer needs billing support.'},
      contentRevision: 9,
      actionType: 'TRANSFER' as const,
      selectedFeedback: 'none' as const,
      onEdit: jest.fn(),
      onCopy: jest.fn(),
      onFeedback: jest.fn(),
    };

    it.each(['generic-error', 'unavailable'] as const)(
      'awaits the %s response before continuing telephony',
      async (state) => {
        const response = deferred<{outcome: 'sent'}>();
        const send = jest.fn().mockReturnValue(response.promise);
        const telephony = jest.fn();
        const completion = runMidCallActionBeforeTelephony({
          summary: {...summary, state, contentRevision: 0},
          sendMidCallSummaryBeforeAction: send,
          isPending: () => false,
          setPending: jest.fn(),
          runTelephonyAction: telephony,
          logger: loggerMock,
          method: 'testUnavailable',
        });
        await Promise.resolve();
        expect(send).toHaveBeenCalledWith('TRANSFER', 0);
        expect(telephony).not.toHaveBeenCalled();
        response.resolve({outcome: 'sent'});
        await completion;
        expect(telephony).toHaveBeenCalledTimes(1);
      }
    );

    it('holds telephony while the pre-action response is pending and ignores re-entry', async () => {
      const response = deferred<{outcome: 'sent'}>();
      const sendMidCallSummaryBeforeAction = jest.fn().mockReturnValue(response.promise);
      const runTelephonyAction = jest.fn();
      let pending = false;
      const setPending = jest.fn((value: boolean) => {
        pending = value;
      });

      const first = runMidCallActionBeforeTelephony({
        summary,
        sendMidCallSummaryBeforeAction,
        isPending: () => pending,
        setPending,
        runTelephonyAction,
        logger: loggerMock,
        method: 'testAction',
      });
      await runMidCallActionBeforeTelephony({
        summary,
        sendMidCallSummaryBeforeAction,
        isPending: () => pending,
        setPending,
        runTelephonyAction,
        logger: loggerMock,
        method: 'testAction',
      });

      expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1);
      expect(runTelephonyAction).not.toHaveBeenCalled();
      response.resolve({outcome: 'sent'});
      await first;
      expect(runTelephonyAction).toHaveBeenCalledTimes(1);
      expect(setPending).toHaveBeenLastCalledWith(false);
    });

    it.each<AISummaryPreActionSendResult['outcome']>(['sent', 'failed', 'blocked', 'stale'])(
      'delays exactly one telephony action until a %s pre-action response settles',
      async (outcome) => {
        const response = deferred<AISummaryPreActionSendResult>();
        const order: string[] = [];
        const sendMidCallSummaryBeforeAction = jest.fn(() =>
          response.promise.then((result) => {
            order.push(result.outcome);
            return result;
          })
        );
        const runTelephonyAction = jest.fn(() => {
          order.push('telephony');
        });
        let pending = false;

        const first = runMidCallActionBeforeTelephony({
          summary,
          sendMidCallSummaryBeforeAction,
          isPending: () => pending,
          setPending: (value) => {
            pending = value;
          },
          runTelephonyAction,
          logger: loggerMock,
          method: 'testAction',
        });
        await runMidCallActionBeforeTelephony({
          summary,
          sendMidCallSummaryBeforeAction,
          isPending: () => pending,
          setPending: (value) => {
            pending = value;
          },
          runTelephonyAction,
          logger: loggerMock,
          method: 'testAction',
        });

        expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1);
        expect(runTelephonyAction).not.toHaveBeenCalled();

        response.resolve({outcome});
        await first;

        expect(order).toEqual([outcome, 'telephony']);
        expect(runTelephonyAction).toHaveBeenCalledTimes(1);
        expect(pending).toBe(false);
      }
    );

    it('delays exactly one telephony action until a rejected pre-action response settles', async () => {
      const response = deferred<AISummaryPreActionSendResult>();
      const sendMidCallSummaryBeforeAction = jest.fn().mockReturnValue(response.promise);
      const runTelephonyAction = jest.fn();
      let pending = false;

      const first = runMidCallActionBeforeTelephony({
        summary,
        sendMidCallSummaryBeforeAction,
        isPending: () => pending,
        setPending: (value) => {
          pending = value;
        },
        runTelephonyAction,
        logger: loggerMock,
        method: 'testAction',
      });
      await runMidCallActionBeforeTelephony({
        summary,
        sendMidCallSummaryBeforeAction,
        isPending: () => pending,
        setPending: (value) => {
          pending = value;
        },
        runTelephonyAction,
        logger: loggerMock,
        method: 'testAction',
      });

      expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1);
      expect(runTelephonyAction).not.toHaveBeenCalled();

      response.reject(new Error('pre-action rejected'));
      await first;

      expect(runTelephonyAction).toHaveBeenCalledTimes(1);
      expect(pending).toBe(false);
    });

    it('continues exactly one telephony action after a non-sent response outcome settles', async () => {
      const order: string[] = [];
      const sendMidCallSummaryBeforeAction = jest.fn(async () => {
        order.push('response');
        return {outcome: 'blocked'} as const;
      });
      const runTelephonyAction = jest.fn(() => {
        order.push('telephony');
      });
      let pending = false;

      await runMidCallActionBeforeTelephony({
        summary,
        sendMidCallSummaryBeforeAction,
        isPending: () => pending,
        setPending: (value) => {
          pending = value;
        },
        runTelephonyAction,
        logger: loggerMock,
        method: 'testAction',
      });

      expect(order).toEqual(['response', 'telephony']);
      expect(runTelephonyAction).toHaveBeenCalledTimes(1);
    });

    it('continues after a synchronously thrown pre-action response supplier', async () => {
      const sendMidCallSummaryBeforeAction = jest.fn(() => {
        throw new Error('Response send failed before returning a promise');
      });
      const runTelephonyAction = jest.fn();
      let pending = false;

      await runMidCallActionBeforeTelephony({
        summary,
        sendMidCallSummaryBeforeAction,
        isPending: () => pending,
        setPending: (value) => {
          pending = value;
        },
        runTelephonyAction,
        logger: loggerMock,
        method: 'testAction',
      });

      expect(sendMidCallSummaryBeforeAction).toHaveBeenCalledTimes(1);
      expect(runTelephonyAction).toHaveBeenCalledTimes(1);
    });

    it('consumes asynchronous telephony rejection after the pre-action response settles', async () => {
      const sendMidCallSummaryBeforeAction = jest.fn().mockResolvedValue({outcome: 'sent'});
      const runTelephonyAction = jest.fn().mockRejectedValue(new Error('Telephony rejected'));
      let pending = false;

      await expect(
        runMidCallActionBeforeTelephony({
          summary,
          sendMidCallSummaryBeforeAction,
          isPending: () => pending,
          setPending: (value) => {
            pending = value;
          },
          runTelephonyAction,
          logger: loggerMock,
          method: 'testAction',
        })
      ).resolves.toBeUndefined();

      expect(runTelephonyAction).toHaveBeenCalledTimes(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        'CC-Widgets: CallControl: Error running mid-call telephony action - Error: Telephony rejected',
        {
          module: 'call-control.tsx',
          method: 'testAction',
        }
      );
      expect(pending).toBe(false);
    });
  });

  describe('handlePopoverOpen', () => {
    const mockSetShowAgentMenu = jest.fn();
    const mockSetAgentMenuType = jest.fn();
    const mockLoadBuddyAgents = jest.fn();
    const mockLoadQueues = jest.fn();

    beforeEach(() => {
      mockSetShowAgentMenu.mockClear();
      mockSetAgentMenuType.mockClear();
      mockLoadBuddyAgents.mockClear();
      mockLoadQueues.mockClear();
    });

    it('should handle popover open event', () => {
      // TODO: Add actual test implementation
      expect(true).toBe(true);
    });
  });

  describe('getMediaType', () => {
    it('should call getMediaTypeInfo with correct parameters', () => {
      const mockGetMediaTypeInfo = utils.getMediaTypeInfo as jest.Mock;
      mockGetMediaTypeInfo.mockReturnValue(mockMediaTypeInfo);

      const result = getMediaType('telephony', 'telephony');

      expect(mockGetMediaTypeInfo).toHaveBeenCalledWith('telephony', 'telephony');
      expect(result).toBe(mockMediaTypeInfo);
    });
  });

  describe('isTelephonyMediaType', () => {
    it('should return true for telephony media type', () => {
      const result = isTelephonyMediaType('telephony');
      expect(result).toBe(true);
    });

    it('should return false for non-telephony media type', () => {
      const result = isTelephonyMediaType('chat');
      expect(result).toBe(false);
    });

    it('should return false for email media type', () => {
      const result = isTelephonyMediaType('email');
      expect(result).toBe(false);
    });
  });

  describe('buildCallControlButtons', () => {
    const mockFunctions = {
      handleMuteToggleFunc: jest.fn(),
      handleToggleHoldFunc: jest.fn(),
      toggleRecording: jest.fn(),
      endCall: jest.fn(),
      exitConference: jest.fn(),
      switchToConsult: jest.fn(),
    };

    it('should build buttons with correct configuration when muted', () => {
      const buttons = buildCallControlButtons(
        true, // isMuted
        true, // isRecording
        false, // isMuteButtonDisabled
        mockMediaTypeInfo,
        mockControls,
        false, // isHeld
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(), // switchToMainCall
        jest.fn() // mergeConference
      );

      expect(buttons).toHaveLength(11); // Includes keypad (WXCC-6026), switchToConsult, transferConsult, and conference buttons

      // Check mute button
      const muteButton = buttons.find((b) => b.id === 'mute');
      expect(muteButton).toEqual({
        id: 'mute',
        icon: 'microphone-muted-bold',
        onClick: mockFunctions.handleMuteToggleFunc,
        tooltip: 'Unmute',
        className: 'call-control-button-muted',
        disabled: false,
        isVisible: true,
        dataTestId: 'call-control:mute-toggle',
      });

      // Check hold button
      const holdButton = buttons.find((b) => b.id === 'hold');
      expect(holdButton).toEqual({
        id: 'hold',
        icon: 'pause-bold',
        onClick: mockFunctions.handleToggleHoldFunc,
        tooltip: 'Hold the call',
        className: 'call-control-button',
        disabled: false,
        isVisible: true,
        dataTestId: 'call-control:hold-toggle',
      });
    });

    it('includes visible keypad button when main keypad control is enabled (WXCC-6026)', () => {
      const controlsWithKeypad = {
        ...mockControls,
        main: {
          ...mockControls.main,
          keypad: {isVisible: true, isEnabled: true},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithKeypad,
        false,
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(),
        jest.fn()
      );

      const keypadButton = buttons.find((b) => b.id === 'keypad');
      expect(keypadButton).toEqual({
        id: 'keypad',
        icon: 'dialpad-bold',
        tooltip: 'Keypad',
        className: 'call-control-button',
        disabled: false,
        isVisible: true,
        menuType: 'Keypad',
        dataTestId: 'call-control:keypad',
      });
    });

    it('hides keypad button when main keypad control is not visible (WXCC-6026)', () => {
      const controlsWithoutKeypad = {
        ...mockControls,
        main: {
          ...mockControls.main,
          keypad: {isVisible: false, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithoutKeypad,
        false,
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(),
        jest.fn()
      );

      const keypadButton = buttons.find((b) => b.id === 'keypad');
      expect(keypadButton?.isVisible).toBe(false);
      expect(keypadButton?.disabled).toBe(true);
    });

    it('should build buttons with correct configuration when not muted and held', () => {
      const heldControls = createEnabledMainTaskUIControls({
        wrapup: enabledControl,
        end: {isVisible: true, isEnabled: false},
      });
      const buttons = buildCallControlButtons(
        false, // isMuted
        false, // isRecording
        true, // isMuteButtonDisabled
        mockMediaTypeInfo,
        heldControls,
        true, // isHeld
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(), // switchToMainCall
        jest.fn() // mergeConference
      );

      // Check mute button
      const muteButton = buttons.find((b) => b.id === 'mute');
      expect(muteButton).toEqual({
        id: 'mute',
        icon: 'microphone-bold',
        onClick: mockFunctions.handleMuteToggleFunc,
        tooltip: 'Mute',
        className: 'call-control-button',
        disabled: true,
        isVisible: true,
        dataTestId: 'call-control:mute-toggle',
      });

      // Check hold button
      const holdButton = buttons.find((b) => b.id === 'hold');
      expect(holdButton).toEqual({
        id: 'hold',
        icon: 'play-bold',
        onClick: mockFunctions.handleToggleHoldFunc,
        tooltip: 'Resume the call',
        className: 'call-control-button',
        disabled: false,
        isVisible: true,
        dataTestId: 'call-control:hold-toggle',
      });

      // Check end button - should be disabled when held
      const endButton = buttons.find((b) => b.id === 'end');
      expect(endButton?.disabled).toBe(true);
    });

    it('should build consult and transfer buttons with menu types', () => {
      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        mockControls,
        false, // isHeld
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(), // switchToMainCall
        jest.fn() // mergeConference
      );

      const consultButton = buttons.find((b) => b.id === 'consult');
      expect(consultButton).toEqual({
        id: 'consult',
        icon: 'headset-bold',
        tooltip: 'Consult with another agent',
        className: 'call-control-button',
        disabled: false,
        menuType: 'Consult',
        isVisible: true,
        dataTestId: 'call-control:consult',
      });

      const transferButton = buttons.find((b) => b.id === 'transfer');
      expect(transferButton).toEqual({
        id: 'transfer',
        icon: 'next-bold',
        tooltip: 'Transfer Call',
        className: 'call-control-button',
        disabled: false,
        menuType: 'Transfer',
        isVisible: true,
        dataTestId: 'call-control:transfer',
      });
    });

    it('should build record button with correct states', () => {
      // When recording
      let buttons = buildCallControlButtons(
        false,
        true, // isRecording
        false,
        mockMediaTypeInfo,
        mockControls,
        false, // isHeld
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(), // switchToMainCall
        jest.fn() // mergeConference
      );

      let recordButton = buttons.find((b) => b.id === 'record');
      expect(recordButton?.icon).toBe('record-paused-bold');
      expect(recordButton?.tooltip).toBe('Pause Recording');

      // When not recording
      buttons = buildCallControlButtons(
        false,
        false, // isRecording
        false,
        mockMediaTypeInfo,
        mockControls,
        false, // isHeld
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(), // switchToMainCall
        jest.fn() // mergeConference
      );

      recordButton = buttons.find((b) => b.id === 'record');
      expect(recordButton?.icon).toBe('record-bold');
      expect(recordButton?.tooltip).toBe('Resume Recording');
    });

    it('should build exit conference button when in conference', () => {
      const conferenceControls = createEnabledMainTaskUIControls({
        wrapup: enabledControl,
        exitConference: enabledControl,
      });
      const buttons = buildCallControlButtons(
        false, // isMuted
        false, // isRecording
        false, // isMuteButtonDisabled
        mockMediaTypeInfo,
        conferenceControls,
        false, // isHeld
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(), // switchToMainCall
        jest.fn() // mergeConference
      );
      const exitConferenceButton = buttons.find((b) => b.id === 'exitConference');
      expect(exitConferenceButton).toEqual({
        id: 'exitConference',
        icon: 'exit-room-bold',
        onClick: mockFunctions.exitConference,
        tooltip: 'Exit Conference',
        className: 'call-control-button-muted',
        disabled: false,
        isVisible: true,
        dataTestId: 'call-control:exit-conference',
      });
    });

    it('should disable mute button when sdk marks main mute disabled', () => {
      const nestedControls = {
        main: {
          mute: {isVisible: true, isEnabled: false},
          hold: {isVisible: false, isEnabled: false},
          consult: {isVisible: false, isEnabled: false},
          transfer: {isVisible: false, isEnabled: false},
          recording: {isVisible: false, isEnabled: false},
          end: {isVisible: false, isEnabled: false},
          conference: {isVisible: false, isEnabled: false},
          switch: {isVisible: false, isEnabled: false},
          exitConference: {isVisible: false, isEnabled: false},
        },
        consult: {
          endConsult: {isVisible: false, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        nestedControls as never,
        false,
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(),
        jest.fn()
      );

      const muteButton = buttons.find((b) => b.id === 'mute');
      expect(muteButton?.isVisible).toBe(true);
      expect(muteButton?.disabled).toBe(true);
    });

    it('should hide hold and transferConsult but keep transfer menu during consult requested', () => {
      const consultRequestedControls = {
        activeLeg: 'consult',
        main: {
          hold: {isVisible: true, isEnabled: true},
          transfer: {isVisible: true, isEnabled: false},
          conference: {isVisible: true, isEnabled: false},
          end: {isVisible: true, isEnabled: false},
        },
        consult: {
          endConsult: {isVisible: true, isEnabled: true},
          switch: {isVisible: true, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        consultRequestedControls as never,
        true,
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        jest.fn(),
        jest.fn()
      );

      const holdButton = buttons.find((b) => b.id === 'hold');
      const transferButton = buttons.find((b) => b.id === 'transfer');
      const transferConsultButton = buttons.find((b) => b.id === 'transferConsult');

      expect(holdButton?.isVisible).toBe(false);
      expect(transferButton?.isVisible).toBe(true);
      expect(transferConsultButton?.isVisible).toBe(false);
    });

    it('should prioritize transferConference over transfer on main leg', () => {
      const nestedControls = {
        activeLeg: 'main',
        main: {
          accept: {isVisible: false, isEnabled: false},
          decline: {isVisible: false, isEnabled: false},
          hold: {isVisible: false, isEnabled: false},
          mute: {isVisible: false, isEnabled: false},
          end: {isVisible: true, isEnabled: true},
          transfer: {isVisible: true, isEnabled: true},
          consult: {isVisible: false, isEnabled: false},
          consultTransfer: {isVisible: false, isEnabled: false},
          endConsult: {isVisible: false, isEnabled: false},
          recording: {isVisible: false, isEnabled: false},
          conference: {isVisible: true, isEnabled: true},
          wrapup: {isVisible: false, isEnabled: false},
          exitConference: {isVisible: false, isEnabled: false},
          transferConference: {isVisible: true, isEnabled: true},
          mergeToConference: {isVisible: false, isEnabled: false},
          switch: {isVisible: false, isEnabled: false},
        },
        consult: {
          accept: {isVisible: false, isEnabled: false},
          decline: {isVisible: false, isEnabled: false},
          hold: {isVisible: false, isEnabled: false},
          mute: {isVisible: false, isEnabled: false},
          end: {isVisible: false, isEnabled: false},
          transfer: {isVisible: false, isEnabled: false},
          consult: {isVisible: true, isEnabled: false},
          consultTransfer: {isVisible: false, isEnabled: false},
          endConsult: {isVisible: true, isEnabled: true},
          recording: {isVisible: false, isEnabled: false},
          conference: {isVisible: true, isEnabled: false},
          wrapup: {isVisible: false, isEnabled: false},
          exitConference: {isVisible: false, isEnabled: false},
          transferConference: {isVisible: false, isEnabled: false},
          mergeToConference: {isVisible: true, isEnabled: false},
          switch: {isVisible: false, isEnabled: false},
        },
      };

      const onTransferConsult = jest.fn();
      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        nestedControls as never,
        false,
        mockFunctions.handleMuteToggleFunc,
        mockFunctions.handleToggleHoldFunc,
        mockFunctions.toggleRecording,
        mockFunctions.endCall,
        mockFunctions.exitConference,
        mockFunctions.switchToConsult,
        onTransferConsult,
        jest.fn()
      );

      const transferConsultButton = buttons.find((b) => b.id === 'transferConsult');
      const transferMenuButton = buttons.find((b) => b.id === 'transfer');

      expect(transferConsultButton?.isVisible).toBe(true);
      expect(transferConsultButton?.tooltip).toBe('Transfer Conference');
      expect(transferConsultButton?.disabled).toBe(false);

      expect(transferMenuButton?.isVisible).toBe(false);
    });
  });

  describe('applyWxAppTelephonyControlVisibility', () => {
    const wxAppTask = {
      getWebexCallingCallId: () => 'call-123',
    } as unknown as ITask;

    const baseButtons = buildCallControlButtons(
      false,
      false,
      false,
      mockMediaTypeInfo,
      {
        ...mockControls,
        main: {
          ...mockControls.main,
          mute: {isVisible: true, isEnabled: true},
          keypad: {isVisible: true, isEnabled: true},
        },
      },
      false,
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn()
    );

    it('passes through SDK visibility when enableWxBetterTogether is false', () => {
      const controlsWithDisabledKeypad = {
        ...mockControls,
        main: {
          ...mockControls.main,
          mute: {isVisible: true, isEnabled: false},
          keypad: {isVisible: true, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithDisabledKeypad,
        false,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      const result = applyWxAppTelephonyControlVisibility(buttons, wxAppTask, controlsWithDisabledKeypad, true, false);

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(true);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(true);
    });

    it('hides mute and keypad when flag is on, wxApp not engaged, and SDK shows disabled controls', () => {
      const controlsWithDisabled = {
        ...mockControls,
        main: {
          ...mockControls.main,
          mute: {isVisible: true, isEnabled: false},
          keypad: {isVisible: true, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithDisabled,
        false,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      const result = applyWxAppTelephonyControlVisibility(
        buttons,
        {} as ITask,
        controlsWithDisabled,
        true,
        true,
        'EXTENSION'
      );

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(false);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(false);
    });

    it('passes through BROWSER mute when flag is on, wxApp not engaged, and SDK shows disabled controls', () => {
      const controlsWithDisabled = {
        ...mockControls,
        main: {
          ...mockControls.main,
          mute: {isVisible: true, isEnabled: false},
          keypad: {isVisible: true, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithDisabled,
        false,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      const result = applyWxAppTelephonyControlVisibility(
        buttons,
        {} as ITask,
        controlsWithDisabled,
        true,
        true,
        'BROWSER'
      );

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(true);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(true);
    });

    it('passes through SDK visibility when flag is on but wxApp is not engaged and controls are enabled', () => {
      const result = applyWxAppTelephonyControlVisibility(baseButtons, {} as ITask, mockControls, true, true);

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(true);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(true);
    });

    it('passes through SDK visibility when wxApp is engaged and SDK enables controls', () => {
      const result = applyWxAppTelephonyControlVisibility(baseButtons, wxAppTask, mockControls, true, true);

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(true);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(true);
    });

    it('force-shows mute and keypad when wxApp is engaged and SDK enables controls even if not visible', () => {
      const controlsWithEnabledButHidden = {
        ...mockControls,
        main: {
          ...mockControls.main,
          mute: {isVisible: false, isEnabled: true},
          keypad: {isVisible: false, isEnabled: true},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithEnabledButHidden,
        false,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      const result = applyWxAppTelephonyControlVisibility(buttons, wxAppTask, controlsWithEnabledButHidden, true, true);

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(true);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(true);
    });

    it('hides mute and keypad when wxApp is engaged but SDK disables controls during consult/hold', () => {
      const controlsWithDisabled = {
        ...mockControls,
        main: {
          ...mockControls.main,
          mute: {isVisible: true, isEnabled: false},
          keypad: {isVisible: true, isEnabled: false},
        },
      };

      const buttons = buildCallControlButtons(
        false,
        false,
        false,
        mockMediaTypeInfo,
        controlsWithDisabled,
        false,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn()
      );

      const result = applyWxAppTelephonyControlVisibility(buttons, wxAppTask, controlsWithDisabled, true, true);

      expect(result.find((b) => b.id === 'mute')?.isVisible).toBe(false);
      expect(result.find((b) => b.id === 'keypad')?.isVisible).toBe(false);
    });
  });

  describe('getConsultFilterPhase', () => {
    it('returns none when endConsult is not visible', () => {
      expect(getConsultFilterPhase(null, {main: {}, consult: {}} as never)).toBe('none');
    });

    it('returns pending when self participant is consultInitiated', () => {
      const task = {
        data: {
          agentId: 'agent-1',
          interaction: {
            participants: {
              'agent-1': {consultState: 'consultInitiated'},
            },
          },
        },
      } as never;

      expect(
        getConsultFilterPhase(task, {
          consult: {endConsult: {isVisible: true, isEnabled: true}},
        } as never)
      ).toBe('pending');
    });

    it('returns active when consult destination has joined controls', () => {
      const task = {
        data: {
          agentId: 'agent-1',
          interaction: {
            participants: {
              'agent-1': {consultState: 'consulting'},
            },
          },
        },
      } as never;

      expect(
        getConsultFilterPhase(task, {
          main: {transfer: {isVisible: true, isEnabled: true}},
          consult: {
            endConsult: {isVisible: true, isEnabled: true},
            switch: {isVisible: true, isEnabled: true},
          },
        } as never)
      ).toBe('active');
    });
  });

  describe('filterButtonsForConsultation', () => {
    const mockButtons = [
      {id: 'mute', icon: '', tooltip: '', className: '', disabled: false, isVisible: true},
      {id: 'hold', icon: '', tooltip: '', className: '', disabled: false, isVisible: true},
      {id: 'consult', icon: '', tooltip: '', className: '', disabled: false, isVisible: true},
      {id: 'transfer', icon: '', tooltip: '', className: '', disabled: false, isVisible: true},
      {id: 'record', icon: '', tooltip: '', className: '', disabled: false, isVisible: true},
      {id: 'end', icon: '', tooltip: '', className: '', disabled: false, isVisible: true},
    ];

    it('should filter hold and consult but keep transfer during pending consult', () => {
      const result = filterButtonsForConsultation(mockButtons, 'pending', true);

      expect(result.map((b) => b.id)).toEqual(['mute', 'transfer', 'end']);
    });

    it('should filter hold, consult, and transfer during active consult', () => {
      const result = filterButtonsForConsultation(mockButtons, 'active', true);

      expect(result.map((b) => b.id)).toEqual(['mute', 'end']);
    });

    it('should not filter buttons when consult phase is none', () => {
      const result = filterButtonsForConsultation(mockButtons, 'none', true);

      expect(result).toHaveLength(6);
      expect(result).toBe(mockButtons);
    });

    it('should not filter buttons when not telephony', () => {
      const result = filterButtonsForConsultation(mockButtons, 'active', false);

      expect(result).toHaveLength(6);
      expect(result).toBe(mockButtons);
    });
  });

  describe('updateCallStateFromTask', () => {
    const mockSetIsRecording = jest.fn();

    beforeEach(() => {
      mockSetIsRecording.mockClear();
    });

    it('should update recording state from task data', () => {
      updateCallStateFromTask(mockCurrentTask as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(true);
    });

    it('should handle task with recording paused', () => {
      const taskWithPausedRecording = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {
              isPaused: 'true',
            },
          },
        },
      };

      updateCallStateFromTask(taskWithPausedRecording as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(false);
    });

    it('should handle isPaused as string "true" from backend', () => {
      const taskWithStringPaused = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {
              isPaused: 'true',
            },
          },
        },
      };

      updateCallStateFromTask(taskWithStringPaused as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(false);
    });

    it('should handle isPaused as string "false" from backend', () => {
      const taskWithStringNotPaused = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {
              isPaused: 'false',
            },
          },
        },
      };

      updateCallStateFromTask(taskWithStringNotPaused as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(true);
    });

    // The SDK's taskDataNormalizer coerces callProcessingDetails flags to real
    // booleans before widgets ever see them.
    it('should handle isPaused as boolean true from the SDK', () => {
      const taskWithBooleanPaused = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {isPaused: true},
          },
        },
      };

      updateCallStateFromTask(taskWithBooleanPaused as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(false);
    });

    it('should handle isPaused as boolean false from the SDK', () => {
      const taskWithBooleanNotPaused = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {isPaused: false},
          },
        },
      };

      updateCallStateFromTask(taskWithBooleanNotPaused as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(true);
    });

    it('should fall back to recordInProgress when isPaused is absent', () => {
      const taskWithoutIsPaused = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {recordingStarted: true, recordInProgress: false},
          },
        },
      };

      updateCallStateFromTask(taskWithoutIsPaused as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).toHaveBeenCalledWith(false);
    });

    it('should not change recording state when no recording flags are present', () => {
      const taskWithUnrelatedDetails = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: {pauseResumeEnabled: true},
          },
        },
      };

      updateCallStateFromTask(taskWithUnrelatedDetails as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).not.toHaveBeenCalled();
    });

    it('should return early when currentTask is null', () => {
      updateCallStateFromTask(null as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).not.toHaveBeenCalled();
    });

    it('should return early when currentTask.data is null', () => {
      const invalidTask = {data: null};

      updateCallStateFromTask(invalidTask as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).not.toHaveBeenCalled();
    });

    it('should return early when currentTask.data.interaction is null', () => {
      const invalidTask = {
        data: {
          interaction: null,
        },
      };

      updateCallStateFromTask(invalidTask as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).not.toHaveBeenCalled();
    });

    it('should handle missing callProcessingDetails', () => {
      const taskWithoutCallProcessing = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            callProcessingDetails: null,
          },
        },
      };

      updateCallStateFromTask(taskWithoutCallProcessing as unknown as ITask, mockSetIsRecording);

      expect(mockSetIsRecording).not.toHaveBeenCalled();
    });
  });

  describe('handleCloseButtonPress', () => {
    it('should set showAgentMenu to false and agentMenuType to null', () => {
      const mockSetShowAgentMenu = jest.fn();
      const mockSetAgentMenuType = jest.fn();

      handleCloseButtonPress(mockSetShowAgentMenu, mockSetAgentMenuType);

      expect(mockSetShowAgentMenu).toHaveBeenCalledWith(false);
      expect(mockSetAgentMenuType).toHaveBeenCalledWith(null);
    });
  });

  describe('handleWrapupReasonChange', () => {
    const mockHandleWrapupChange = jest.fn();

    beforeEach(() => {
      mockHandleWrapupChange.mockClear();
    });

    it('should handle wrapup reason change with valid selection', () => {
      const mockEvent = {
        detail: {
          value: 'code-1',
        },
      } as CustomEvent;

      const mockWrapupCodes = [
        {id: 'code-1', name: 'Technical Issue'},
        {id: 'code-2', name: 'Customer Inquiry'},
      ];

      handleWrapupReasonChange(mockEvent, mockWrapupCodes, mockHandleWrapupChange, loggerMock);

      expect(mockHandleWrapupChange).toHaveBeenCalledWith('Technical Issue', 'code-1', loggerMock);
    });

    it('should handle wrapup reason change with unknown selection', () => {
      const mockEvent = {
        detail: {
          value: 'unknown-code',
        },
      } as CustomEvent;

      const mockWrapupCodes = [
        {id: 'code-1', name: 'Technical Issue'},
        {id: 'code-2', name: 'Customer Inquiry'},
      ];

      handleWrapupReasonChange(mockEvent, mockWrapupCodes, mockHandleWrapupChange);

      expect(mockHandleWrapupChange).not.toHaveBeenCalled();
    });

    it('should handle wrapup reason change with undefined wrapupCodes', () => {
      const mockEvent = {
        detail: {
          value: 'code-1',
        },
      } as CustomEvent;

      handleWrapupReasonChange(mockEvent, undefined, mockHandleWrapupChange);

      expect(mockHandleWrapupChange).not.toHaveBeenCalled();
    });

    it('should handle wrapup reason change with empty wrapupCodes array', () => {
      const mockEvent = {
        detail: {
          value: 'code-1',
        },
      } as CustomEvent;

      const mockWrapupCodes: Array<{id: string; name: string}> = [];

      handleWrapupReasonChange(mockEvent, mockWrapupCodes, mockHandleWrapupChange);

      expect(mockHandleWrapupChange).not.toHaveBeenCalled();
    });
  });

  describe('handleAudioRef', () => {
    it('should set srcObject when both audioElement and callControlAudio are provided', () => {
      const mockAudioElement = {
        srcObject: null,
      } as HTMLAudioElement;

      const mockCallControlAudio = {} as MediaStream;

      handleAudioRef(mockAudioElement, mockCallControlAudio);

      expect(mockAudioElement.srcObject).toBe(mockCallControlAudio);
    });

    it('should not set srcObject when audioElement is null', () => {
      const mockCallControlAudio = {} as MediaStream;

      handleAudioRef(null, mockCallControlAudio);

      // No assertion needed as the function should not throw and do nothing
    });

    it('should not set srcObject when callControlAudio is null', () => {
      const mockAudioElement = {
        srcObject: null,
      } as HTMLAudioElement;

      handleAudioRef(mockAudioElement, null);

      expect(mockAudioElement.srcObject).toBe(null);
    });

    it('should not set srcObject when both audioElement and callControlAudio are null', () => {
      handleAudioRef(null, null);

      // No assertion needed as the function should not throw and do nothing
    });
  });
});
