jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  ERROR_TRIGGERING_IDLE_CODES: {RONA: 'RONA'},
}));

import {
  buildChannelStates,
  filterIdleCodes,
  formatDuration,
  getChannelDisplayState,
  getChannelsToChange,
  getLastSetIdleCode,
  getPresenceType,
  getSelectableChannelTypes,
  getSelectableIdleCodes,
} from '../../../src/components/GranularAgentState/granular-agent-state.utils';

const idleCodes = [
  {id: '0', name: 'Available', isSystem: false, isDefault: false},
  {id: '10', name: 'Lunch Break', isSystem: false, isDefault: false},
  {id: '11', name: 'Meeting', isSystem: false, isDefault: true},
  {id: '12', name: 'RONA', isSystem: true, isDefault: false},
  {id: '13', name: 'ENGAGED', isSystem: true, isDefault: false},
];

const channelState = (overrides = {}) => ({
  agentState: 'Available',
  pendingIdle: false,
  auxCodeId: '0',
  availableChannelCount: 1,
  totalChannelCount: 1,
  stateChangeReason: '',
  stateChangeTimestamp: 1_000_000,
  ...overrides,
});

describe('granular-agent-state.utils', () => {
  describe('getSelectableChannelTypes', () => {
    it('should return channels with totalChannelCount > 0 in display order', () => {
      expect(
        getSelectableChannelTypes({
          social: channelState({totalChannelCount: 1}),
          telephony: channelState({totalChannelCount: 1}),
          email: channelState({totalChannelCount: 0}),
          chat: channelState({totalChannelCount: 2}),
        })
      ).toEqual(['telephony', 'chat', 'social']);
    });

    it('should exclude channels not in the state map', () => {
      expect(
        getSelectableChannelTypes({
          email: channelState(),
          telephony: channelState(),
        })
      ).toEqual(['telephony', 'email']);
    });
  });

  describe('getChannelDisplayState', () => {
    it.each([
      ['Available channel', channelState(), 'Available'],
      ['Idle channel with known code', channelState({agentState: 'Idle', auxCodeId: '10'}), 'Lunch Break'],
      ['Idle channel with unknown code', channelState({agentState: 'Idle', auxCodeId: '99'}), 'Idle'],
      [
        'pending idle channel',
        channelState({agentState: 'Engaged', pendingIdle: true, auxCodeId: '11'}),
        'Pending Meeting',
      ],
      ['RONA channel', channelState({agentState: 'RONA'}), 'RONA'],
    ])('should show the right label for %s', (_label, state, expected) => {
      expect(getChannelDisplayState(state, idleCodes)).toBe(expected);
    });
  });

  describe('buildChannelStates', () => {
    it('should build view models with elapsed time and availability', () => {
      const channels = buildChannelStates(
        {
          telephony: channelState(),
          chat: channelState({agentState: 'Idle', auxCodeId: '10', stateChangeTimestamp: 1_060_000}),
        },
        idleCodes,
        1_120_000
      );

      expect(channels).toEqual([
        {
          channelType: 'telephony',
          label: 'Voice',
          agentState: 'Available',
          displayState: 'Available',
          auxCodeId: '0',
          pendingIdle: false,
          elapsedTime: 120,
          isAvailable: true,
        },
        {
          channelType: 'chat',
          label: 'Chat',
          agentState: 'Idle',
          displayState: 'Lunch Break',
          auxCodeId: '10',
          pendingIdle: false,
          elapsedTime: 60,
          isAvailable: false,
        },
      ]);
    });

    it('should never report negative elapsed time', () => {
      const [channel] = buildChannelStates({telephony: channelState()}, idleCodes, 0);
      expect(channel.elapsedTime).toBe(0);
    });
  });

  describe('getPresenceType', () => {
    it.each([
      ['Available', 'active'],
      ['Idle', 'away'],
      ['RONA', 'dnd'],
      ['Engaged', 'busy'],
      ['WrapUp', 'busy'],
    ])('should map %s to %s', (state, presence) => {
      expect(getPresenceType(state)).toBe(presence);
    });

    it('should return away when pendingIdle is true regardless of agentState', () => {
      expect(getPresenceType('Available', true)).toBe('away');
      expect(getPresenceType('Engaged', true)).toBe('away');
    });

    it('should use normal mapping when pendingIdle is false or undefined', () => {
      expect(getPresenceType('Available', false)).toBe('active');
      expect(getPresenceType('Available', undefined)).toBe('active');
      expect(getPresenceType('Available')).toBe('active');
    });
  });

  describe('idle codes', () => {
    it('should exclude Available and platform-assigned codes', () => {
      expect(getSelectableIdleCodes(idleCodes).map((code) => code.id)).toEqual(['10', '11']);
    });

    it('should not select Engaged as a selectable or fallback idle code', () => {
      const engagedIdleCode = idleCodes[4];
      const firstSelectableIdleCode = {...idleCodes[1], isDefault: false};

      expect(getSelectableIdleCodes([engagedIdleCode])).toEqual([]);
      expect(getLastSetIdleCode({}, [engagedIdleCode, firstSelectableIdleCode])).toEqual(firstSelectableIdleCode);
      expect(getLastSetIdleCode({}, [engagedIdleCode])).toBeUndefined();
    });

    it('should filter idle codes case-insensitively', () => {
      expect(filterIdleCodes(getSelectableIdleCodes(idleCodes), '  lUNch ').map((code) => code.id)).toEqual(['10']);
      expect(filterIdleCodes(getSelectableIdleCodes(idleCodes), '')).toHaveLength(2);
    });
  });

  describe('getChannelsToChange', () => {
    const map = {
      telephony: channelState(),
      chat: channelState({agentState: 'Idle', auxCodeId: '10'}),
      email: channelState({pendingIdle: true}),
    };

    it('should skip channels already Available', () => {
      expect(getChannelsToChange(map, ['telephony', 'chat', 'email'], 'Available', '0')).toEqual(['chat', 'email']);
    });

    it('should skip channels already Idle with the same code', () => {
      expect(getChannelsToChange(map, ['telephony', 'chat', 'email'], 'Idle', '10')).toEqual(['telephony', 'email']);
      expect(getChannelsToChange(map, ['chat'], 'Idle', '11')).toEqual(['chat']);
    });
  });

  describe('getLastSetIdleCode', () => {
    it('should use the most recently applied idle code', () => {
      const map = {
        chat: channelState({agentState: 'Idle', auxCodeId: '10', lastIdleCodeChangeTimestamp: 100}),
        email: channelState({agentState: 'Idle', auxCodeId: '11', lastIdleCodeChangeTimestamp: 200}),
      };
      expect(getLastSetIdleCode(map, idleCodes)?.id).toBe('11');
    });

    it('should fall back to the default idle code, then the first one', () => {
      expect(getLastSetIdleCode({telephony: channelState()}, idleCodes)?.id).toBe('11');
      expect(getLastSetIdleCode({}, [idleCodes[1]])?.id).toBe('10');
      expect(getLastSetIdleCode({}, [])).toBeUndefined();
    });
  });

  describe('formatDuration', () => {
    it.each([
      [0, '00:00:00'],
      [308, '00:05:08'],
      [8048, '02:14:08'],
      [-5, '00:00:00'],
    ])('should format %d seconds as %s', (seconds, expected) => {
      expect(formatDuration(seconds)).toBe(expected);
    });
  });
});
