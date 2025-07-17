import {extractIncomingTaskData} from '../../../../src/components/task/IncomingTask/incoming-task.utils';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import {mockTask} from '@webex/test-fixtures';

describe('incoming-task.utils', () => {
  beforeEach(() => {
    // Reset mockTask to default state before each test
    jest.clearAllMocks();
  });

  describe('extractIncomingTaskData', () => {
    describe('Telephony tasks', () => {
      it('should extract correct data for browser telephony task without wrap up', () => {
        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(true);
        expect(result.isSocial).toBe(false);
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBe('Decline');
        expect(result.disableAccept).toBe(false);
        expect(result.mediaType).toBe(mockTask.data.interaction.mediaType);
        expect(result.startTimeStamp).toBe(mockTask.data.interaction.createdTimestamp);
      });

      it('should extract correct data for non-browser telephony task without wrap up', () => {
        const result = extractIncomingTaskData(mockTask, false);

        expect(result.isTelephony).toBe(true);
        expect(result.isSocial).toBe(false);
        expect(result.acceptText).toBe('Ringing...');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(true);
        expect(result.mediaType).toBe(mockTask.data.interaction.mediaType);
        expect(result.startTimeStamp).toBe(mockTask.data.interaction.createdTimestamp);
      });

      it('should handle telephony task with wrap up required', () => {
        // Temporarily modify mockTask for wrap up test
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;
        mockTask.data.wrapUpRequired = true;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isTelephony).toBe(true);

        // Restore original wrapUpRequired
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
      });
    });

    describe('Social media tasks', () => {
      it('should extract correct data for social media task', () => {
        // Temporarily modify mockTask for social media test
        const originalMediaType = mockTask.data.interaction.mediaType;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(true);
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.SOCIAL);

        // Restore original mediaType
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should handle social media task with wrap up required', () => {
        // Temporarily modify mockTask for social media with wrap up test
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
        mockTask.data.wrapUpRequired = true;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isSocial).toBe(true);

        // Restore original values
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
      });
    });

    describe('Edge cases and missing data', () => {
      it('should handle missing call association details', () => {
        // Temporarily modify mockTask for missing details test
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = undefined;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ani).toBeUndefined();
        expect(result.customerName).toBeUndefined();
        expect(result.virtualTeamName).toBeUndefined();

        // Restore original callAssociatedDetails
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should handle missing ronaTimeout', () => {
        // Temporarily modify mockTask for missing ronaTimeout test
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: undefined,
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ronaTimeout).toBeNull();

        // Restore original callAssociatedDetails
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should handle invalid ronaTimeout', () => {
        // Temporarily modify mockTask for invalid ronaTimeout test
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: 'invalid-number',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ronaTimeout).toBeNaN();

        // Restore original callAssociatedDetails
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should handle zero ronaTimeout', () => {
        // Temporarily modify mockTask for zero ronaTimeout test
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: '0',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ronaTimeout).toBe(0);

        // Restore original callAssociatedDetails
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });
    });

    describe('Different media types', () => {
      it('should handle chat media type', () => {
        // Temporarily modify mockTask for chat test
        const originalMediaType = mockTask.data.interaction.mediaType;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.CHAT;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.CHAT);
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(false);

        // Restore original mediaType
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should handle email media type', () => {
        // Temporarily modify mockTask for email test
        const originalMediaType = mockTask.data.interaction.mediaType;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.EMAIL;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.EMAIL);

        // Restore original mediaType
        mockTask.data.interaction.mediaType = originalMediaType;
      });
    });

    describe('Button state combinations', () => {
      const testCases = [
        {
          description: 'browser telephony without wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          wrapUpRequired: false,
          expectedAcceptText: 'Accept',
          expectedDeclineText: 'Decline',
          expectedDisableAccept: false,
        },
        {
          description: 'non-browser telephony without wrap up',
          isBrowser: false,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          wrapUpRequired: false,
          expectedAcceptText: 'Ringing...',
          expectedDeclineText: undefined,
          expectedDisableAccept: true,
        },
        {
          description: 'browser telephony with wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          wrapUpRequired: true,
          expectedAcceptText: undefined,
          expectedDeclineText: undefined,
          expectedDisableAccept: false,
        },
        {
          description: 'browser social without wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.SOCIAL,
          wrapUpRequired: false,
          expectedAcceptText: 'Accept',
          expectedDeclineText: undefined,
          expectedDisableAccept: false,
        },
        {
          description: 'browser chat without wrap up',
          isBrowser: true,
          mediaType: MEDIA_CHANNEL.CHAT,
          wrapUpRequired: false,
          expectedAcceptText: 'Accept',
          expectedDeclineText: undefined,
          expectedDisableAccept: false,
        },
      ];

      testCases.forEach(
        ({
          description,
          isBrowser,
          mediaType,
          wrapUpRequired,
          expectedAcceptText,
          expectedDeclineText,
          expectedDisableAccept,
        }) => {
          it(`should handle ${description}`, () => {
            // Store original values for restoration
            const originalMediaType = mockTask.data.interaction.mediaType;
            const originalWrapUpRequired = mockTask.data.wrapUpRequired;

            // Temporarily modify mockTask for this test
            mockTask.data.interaction.mediaType = mediaType;
            mockTask.data.wrapUpRequired = wrapUpRequired;

            const result = extractIncomingTaskData(mockTask, isBrowser);

            expect(result.acceptText).toBe(expectedAcceptText);
            expect(result.declineText).toBe(expectedDeclineText);
            expect(result.disableAccept).toBe(expectedDisableAccept);

            // Restore original values
            mockTask.data.interaction.mediaType = originalMediaType;
            mockTask.data.wrapUpRequired = originalWrapUpRequired;
          });
        }
      );
    });
  });
});
