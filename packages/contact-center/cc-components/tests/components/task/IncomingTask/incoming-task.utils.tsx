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

    describe('Outdial calls', () => {
      it('should use customer DN for outdial telephony task', () => {
        const originalParticipants = mockTask.data.interaction.participants;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

        // Set up an outdial scenario with customer participant having DN
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+11234567890', // Entrypoint number
          customerName: 'Outdial Customer',
          virtualTeamName: 'Sales Team',
        };

        mockTask.data.interaction.participants = {
          agent1: {
            hasJoined: true,
            pType: 'Agent',
            id: 'agent1',
            name: 'Agent Smith',
            hasLeft: false,
          },
          customer1: {
            hasJoined: true,
            pType: 'Customer',
            id: 'customer1',
            name: 'Customer',
            dn: '+19876543210', // Dialed number
            hasLeft: false,
          },
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(true);
        expect(result.ani).toBe('+11234567890');
        expect(result.title).toBe('+19876543210'); // Should use customer DN, not ANI

        // Restore original values
        mockTask.data.interaction.participants = originalParticipants;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should fall back to ANI when customer participant has no DN', () => {
        const originalParticipants = mockTask.data.interaction.participants;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

        // Set up an inbound scenario without customer DN
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+15551234567',
          customerName: 'Inbound Caller',
          virtualTeamName: 'Support Team',
        };

        mockTask.data.interaction.participants = {
          agent1: {
            hasJoined: true,
            pType: 'Agent',
            id: 'agent1',
            name: 'Agent Jones',
            hasLeft: false,
          },
          customer1: {
            hasJoined: true,
            pType: 'Customer',
            id: 'customer1',
            name: 'Customer',
            hasLeft: false,
          },
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.isTelephony).toBe(true);
        expect(result.ani).toBe('+15551234567');
        expect(result.title).toBe('+15551234567'); // Should fall back to ANI

        // Restore original values
        mockTask.data.interaction.participants = originalParticipants;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should handle missing participants gracefully', () => {
        const originalParticipants = mockTask.data.interaction.participants;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+15559999999',
          customerName: 'Test Customer',
        };

        mockTask.data.interaction.participants = undefined;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+15559999999'); // Should fall back to ANI

        // Restore original values
        mockTask.data.interaction.participants = originalParticipants;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });
    });

    describe('Edge cases', () => {
      it('should handle missing call association details', () => {
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        mockTask.data.interaction.callAssociatedDetails = undefined;

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.ani).toBeUndefined();
        expect(result.customerName).toBeUndefined();
        expect(result.virtualTeamName).toBeUndefined();

        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should handle missing and invalid ronaTimeout values', () => {
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

        // Test missing ronaTimeout
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: undefined,
        };

        let result = extractIncomingTaskData(mockTask, true);
        expect(result.ronaTimeout).toBeNull();

        // Test invalid ronaTimeout
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: 'invalid-number',
        };

        result = extractIncomingTaskData(mockTask, true);
        expect(result.ronaTimeout).toBeNaN();

        // Restore original values
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });
    });
  });
});
