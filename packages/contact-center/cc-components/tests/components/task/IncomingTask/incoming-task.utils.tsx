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
      it('should extract correct data for browser telephony task', () => {
        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(true);
        expect(result.isSocial).toBe(false);
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBe('Decline');
        expect(result.disableAccept).toBe(false);
        expect(result.mediaType).toBe(mockTask.data.interaction.mediaType);
        expect(result.startTimeStamp).toBe(mockTask.data.interaction.createdTimestamp);
        expect(result.title).toBe(result.ani); // ANI for telephony
      });

      it('should extract correct data for non-browser telephony task', () => {
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

    describe('Digital media tasks', () => {
      it('should extract correct data for social media task', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(true);
        expect(result.acceptText).toBe('Accept');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(false);
        expect(result.mediaType).toBe(MEDIA_CHANNEL.SOCIAL);
        expect(result.title).toBe(result.customerName); // Customer name for social

        // Restore original mediaType
        mockTask.data.interaction.mediaType = originalMediaType;
      });

      it('should extract correct data for chat media type', () => {
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

      it('should handle digital media task with wrap up required', () => {
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

    describe('Edge cases', () => {
      it('should handle missing call association details', () => {
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = undefined;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ani).toBeUndefined();
        expect(result.customerName).toBeUndefined();
        expect(result.virtualTeamName).toBeUndefined();

        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should handle missing and invalid ronaTimeout values', () => {
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

        // Test missing ronaTimeout
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: undefined,
        };

        let result = extractIncomingTaskData(mockTask, true);
        expect(result.ronaTimeout).toBeNull();

        // Test invalid ronaTimeout
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: 'invalid-number',
        };

        result = extractIncomingTaskData(mockTask, true);
        expect(result.ronaTimeout).toBeNaN();

        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });
    });
  });
});
