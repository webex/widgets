import {extractIncomingTaskData} from '../../../../src/components/task/IncomingTask/incoming-task.utils';
import {MEDIA_CHANNEL, OUTBOUND_TYPE} from '../../../../src/components/task/task.types';
import {mockTask, enabledControl, disabledControl} from '@webex/test-fixtures';

const logger = {
  error: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

const visibleDisabledAccept = {isVisible: true, isEnabled: false};

describe('incoming-task.utils', () => {
  beforeEach(() => {
    // Reset mockTask to default state before each test
    jest.clearAllMocks();
  });

  describe('extractIncomingTaskData', () => {
    describe('Telephony tasks', () => {
      it('should extract correct data for browser telephony task', () => {
        const result = extractIncomingTaskData(mockTask, logger, enabledControl, enabledControl, false, true);

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
        const result = extractIncomingTaskData(mockTask, logger, visibleDisabledAccept, disabledControl, false, false);

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

        extractIncomingTaskData(mockTask, logger, disabledControl, disabledControl, false, true);

        // Restore original wrapUpRequired
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
      });
    });

    describe('Digital media tasks', () => {
      it('should extract correct data for social media task', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;

        const result = extractIncomingTaskData(mockTask, logger, enabledControl, disabledControl, false, true);
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

        const result = extractIncomingTaskData(mockTask, logger, enabledControl, disabledControl, false, true);

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

        const result = extractIncomingTaskData(mockTask, logger, disabledControl, disabledControl, false, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isSocial).toBe(true);

        // Restore original values
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
      });
    });

    describe('Outdial tasks', () => {
      it('should use dn (dialed number) as title for outdial telephony tasks', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.outboundType = OUTBOUND_TYPE.OUTDIAL;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          dn: '+14155559876',
          customerName: 'Outdial Customer',
          virtualTeamName: 'Outbound Team',
          ronaTimeout: '30',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+14155559876'); // Should show dn, not ani
        expect(result.ani).toBe('+18005551234');
        expect(result.isTelephony).toBe(true);

        // Restore
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
      });

      it('should fall back to ani when dn is not available for outdial tasks', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.outboundType = OUTBOUND_TYPE.OUTDIAL;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          customerName: 'Outdial Customer',
          virtualTeamName: 'Outbound Team',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+18005551234'); // Falls back to ani

        // Restore
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
      });

      it('should use ani as title for non-outdial telephony tasks', () => {
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;

        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          dn: '+14155559876',
          customerName: 'Inbound Customer',
          virtualTeamName: 'Support Team',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+18005551234'); // Should show ani for inbound

        // Restore
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });

      it('should fall back to ani when dn is empty string for outdial tasks', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.outboundType = OUTBOUND_TYPE.OUTDIAL;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          dn: '',
          customerName: 'Outdial Customer',
          virtualTeamName: 'Outbound Team',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+18005551234'); // Empty dn falls back to ani

        // Restore
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
      });

      it('should use ani for CALLBACK outboundType (not OUTDIAL)', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.outboundType = OUTBOUND_TYPE.CALLBACK;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          dn: '+14155559876',
          customerName: 'Callback Customer',
          virtualTeamName: 'Callback Team',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+18005551234'); // CALLBACK uses ani, not dn

        // Restore
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
      });

      it('should still use customerName for social media outdial tasks', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.SOCIAL;
        mockTask.data.interaction.outboundType = OUTBOUND_TYPE.OUTDIAL;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: 'social-ani',
          dn: 'social-dn',
          customerName: 'Social Outdial Customer',
          virtualTeamName: 'Social Team',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('Social Outdial Customer'); // Social always uses customerName

        // Restore
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
      });

      it('should extract correct button states for outdial telephony on non-browser', () => {
        const originalMediaType = mockTask.data.interaction.mediaType;
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;
        const originalWrapUpRequired = mockTask.data.wrapUpRequired;

        mockTask.data.interaction.mediaType = MEDIA_CHANNEL.TELEPHONY;
        mockTask.data.interaction.outboundType = OUTBOUND_TYPE.OUTDIAL;
        mockTask.data.wrapUpRequired = false;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          dn: '+14155559876',
          customerName: 'Outdial Customer',
          virtualTeamName: 'Outbound Team',
          ronaTimeout: '30',
        };

        const result = extractIncomingTaskData(mockTask, logger, visibleDisabledAccept, disabledControl, false, false);

        expect(result.title).toBe('+14155559876');
        expect(result.acceptText).toBe('Ringing...');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(true);

        // Restore
        mockTask.data.interaction.mediaType = originalMediaType;
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
        mockTask.data.wrapUpRequired = originalWrapUpRequired;
      });
    });

    describe('Standard inbound tasks', () => {
      it('should use ani for title when outboundType is undefined (standard inbound)', () => {
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        const originalOutboundType = mockTask.data.interaction.outboundType;

        mockTask.data.interaction.outboundType = undefined;
        mockTask.data.interaction.callAssociatedDetails = {
          ani: '+18005551234',
          dn: '+14155559876',
          customerName: 'Inbound Customer',
          virtualTeamName: 'Support Team',
        };

        const result = extractIncomingTaskData(mockTask, true);

        expect(result.title).toBe('+18005551234'); // Standard inbound uses ani

        // Restore
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
        mockTask.data.interaction.outboundType = originalOutboundType;
      });
    });

    describe('Edge cases', () => {
      it('should handle missing call association details', () => {
        const originalCallAssociatedDetails = mockTask.data.interaction.callAssociatedDetails;
        mockTask.data.interaction.callAssociatedDetails = undefined;

        const result = extractIncomingTaskData(mockTask, logger, enabledControl, enabledControl, false, true);

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

        let result = extractIncomingTaskData(mockTask, logger, enabledControl, enabledControl, false, true);
        expect(result.ronaTimeout).toBeNull();

        // Test invalid ronaTimeout
        mockTask.data.interaction.callAssociatedDetails = {
          ...originalCallAssociatedDetails,
          ronaTimeout: 'invalid-number',
        };

        result = extractIncomingTaskData(mockTask, logger, enabledControl, enabledControl, false, true);
        expect(result.ronaTimeout).toBeNaN();

        // Restore original values
        mockTask.data.interaction.callAssociatedDetails = originalCallAssociatedDetails;
      });
    });
  });
});
