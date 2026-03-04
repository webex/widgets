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
      it('should display dialed number (customer DN) for OUTBOUND telephony tasks instead of ANI', () => {
        const originalDirection = mockTask.data.interaction.direction;
        const originalParticipants = mockTask.data.interaction.participants;

        // Setup OUTBOUND call with customer participant
        mockTask.data.interaction.direction = 'OUTBOUND';
        mockTask.data.interaction.participants = {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent Name',
            dn: '1001',
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer Name',
            dn: '+15551234567', // Dialed number
          },
        };

        const result = extractIncomingTaskData(mockTask, true);

        // For outdial, title should be the customer's DN (dialed number), not ANI
        expect(result.title).toBe('+15551234567');
        expect(result.title).not.toBe(result.ani);

        // Restore original values
        mockTask.data.interaction.direction = originalDirection;
        mockTask.data.interaction.participants = originalParticipants;
      });

      it('should fall back to customer ID if DN is not available in OUTBOUND calls', () => {
        const originalDirection = mockTask.data.interaction.direction;
        const originalParticipants = mockTask.data.interaction.participants;

        // Setup OUTBOUND call with customer participant without DN
        mockTask.data.interaction.direction = 'OUTBOUND';
        mockTask.data.interaction.participants = {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent Name',
            dn: '1001',
          },
          customer1: {
            id: '+15559876543',
            pType: 'Customer',
            name: 'Customer Name',
            // No DN field
          },
        };

        const result = extractIncomingTaskData(mockTask, true);

        // Should fall back to customer ID
        expect(result.title).toBe('+15559876543');

        // Restore original values
        mockTask.data.interaction.direction = originalDirection;
        mockTask.data.interaction.participants = originalParticipants;
      });

      it('should fall back to ANI if customer participant is not found in OUTBOUND calls', () => {
        const originalDirection = mockTask.data.interaction.direction;
        const originalParticipants = mockTask.data.interaction.participants;

        // Setup OUTBOUND call without customer participant
        mockTask.data.interaction.direction = 'OUTBOUND';
        mockTask.data.interaction.participants = {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent Name',
            dn: '1001',
          },
        };

        const result = extractIncomingTaskData(mockTask, true);

        // Should fall back to ANI
        expect(result.title).toBe(result.ani);

        // Restore original values
        mockTask.data.interaction.direction = originalDirection;
        mockTask.data.interaction.participants = originalParticipants;
      });

      it('should use ANI for INBOUND telephony tasks (default behavior)', () => {
        const originalDirection = mockTask.data.interaction.direction;

        // Explicitly set as INBOUND
        mockTask.data.interaction.direction = 'INBOUND';

        const result = extractIncomingTaskData(mockTask, true);

        // For inbound, title should be ANI as before
        expect(result.title).toBe(result.ani);

        // Restore original value
        mockTask.data.interaction.direction = originalDirection;
      });

      it('should not affect social media tasks for OUTBOUND direction', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalDirection = mockTask.data.interaction.direction;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
        mockTask.data.interaction.direction = 'OUTBOUND';

        const result = extractIncomingTaskData(mockTask, true);

        // For social, title should still be customerName regardless of direction
        expect(result.title).toBe(result.customerName);
        expect(result.isSocial).toBe(true);

        // Restore original values
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.direction = originalDirection;
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
