import {
  ConsultTransferInteractionContext,
  isAgentsTabVisible,
  isCollaborationAccessEnabled,
  isEntryPointTabVisible,
  isQueueEnabled,
  isQueuesTabVisible,
} from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-tab.utils';

describe('consult-transfer-tab.utils', () => {
  const inboundVoice: ConsultTransferInteractionContext = {
    contactDirectionType: 'INBOUND',
    mediaType: 'telephony',
  };

  const outboundVoiceTransferDisabled: ConsultTransferInteractionContext = {
    contactDirectionType: 'OUTBOUND',
    outdialTransferToQueueEnabled: false,
    mediaType: 'telephony',
  };

  const outboundVoiceTransferEnabled: ConsultTransferInteractionContext = {
    contactDirectionType: 'OUTBOUND',
    outdialTransferToQueueEnabled: true,
    mediaType: 'telephony',
  };

  describe('isCollaborationAccessEnabled', () => {
    it('returns false when access is NONE (case-insensitive)', () => {
      expect(isCollaborationAccessEnabled('NONE')).toBe(false);
      expect(isCollaborationAccessEnabled('none')).toBe(false);
    });

    it('returns true for ALL, SPECIFIC, or undefined', () => {
      expect(isCollaborationAccessEnabled('ALL')).toBe(true);
      expect(isCollaborationAccessEnabled('SPECIFIC')).toBe(true);
      expect(isCollaborationAccessEnabled(undefined)).toBe(true);
    });
  });

  describe('isQueueEnabled', () => {
    it('requires allowConsultToQueue for Consult on voice', () => {
      expect(isQueueEnabled('Consult', false, inboundVoice, true)).toBe(false);
      expect(isQueueEnabled('Consult', true, inboundVoice, true)).toBe(true);
    });

    it('shows queues for Transfer on inbound voice even when consultToQueue is off (AVERA case)', () => {
      expect(isQueueEnabled('Transfer', false, inboundVoice, true)).toBe(true);
    });

    it('gates Transfer outbound voice on outdialTransferToQueueEnabled', () => {
      expect(isQueueEnabled('Transfer', false, outboundVoiceTransferDisabled, true)).toBe(false);
      expect(isQueueEnabled('Transfer', false, outboundVoiceTransferEnabled, true)).toBe(true);
    });

    it('returns true for non-voice media', () => {
      expect(isQueueEnabled('Consult', false, {mediaType: 'chat'}, false)).toBe(true);
    });
  });

  describe('tab visibility helpers', () => {
    it('hides agents tab when accessBuddyTeam is NONE', () => {
      expect(isAgentsTabVisible('NONE')).toBe(false);
      expect(isAgentsTabVisible('SPECIFIC')).toBe(true);
    });

    it('shows queue tab for Transfer inbound when accessQueue is SPECIFIC and consultToQueue is off', () => {
      expect(isQueuesTabVisible('Transfer', false, 'SPECIFIC', inboundVoice, true)).toBe(true);
    });

    it('hides queue tab when accessQueue is NONE even if queue transfer is otherwise enabled', () => {
      expect(isQueuesTabVisible('Transfer', false, 'NONE', inboundVoice, true)).toBe(false);
    });

    it('shows entry point tab on voice when showEntryPointTab and accessEntryPoint allow it', () => {
      expect(isEntryPointTabVisible(true, 'SPECIFIC', true)).toBe(true);
      expect(isEntryPointTabVisible(true, 'NONE', true)).toBe(false);
      expect(isEntryPointTabVisible(true, 'SPECIFIC', false)).toBe(false);
    });
  });
});
