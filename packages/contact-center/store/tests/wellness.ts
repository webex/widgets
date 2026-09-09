import store, {AIAssistantRTDStatusEvent, AgentChannelStateChangedEvent, CC_EVENTS, WellnessBreakEvent} from '../src';
import {getFeatureFlags} from '../src/util';
import {mockCC} from '@webex/test-fixtures';

const wellnessEvent: WellnessBreakEvent = {
  agentId: 'agent-1',
  orgId: 'org-1',
  agentSessionId: 'session-1',
  actionEvent: 'SUGGEST_WELLNESS_BREAK',
};

describe('Agent Wellness Break store projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.store.cc = mockCC;
    store.store.logger = mockCC.LoggerProxy;
    store.store.agentId = 'agent-1';
    store.store.isAgentLoggedIn = true;
    store.store.isWellnessBreakEnabled = true;
    store.store.wellnessAgentSessionId = 'session-1';
    store.store.wellnessBreakState = {phase: 'idle'};
    store.store.wellnessEventSequence = 0;
    store.store.aiAssistantRtdStatus = {state: 'disconnected', generation: 0};
    store.store.isAgentStateControlEnabled = false;
    store.store.agentChannelTypes = [];
    store.store.agentChannelStateDetails = {};
    store.store.wellbeingBreakIdleCode = undefined;
    store.store.currentState = '0';
    store.store.lastStateChangeTimestamp = undefined;
    store.store.lastIdleCodeChangeTimestamp = undefined;
    store.store.legacyAgentState = '';
    store.store.legacyAuxCodeId = '';
    mockCC.webex = undefined;
    mockCC.getWellbeingBreakIdleCode.mockResolvedValue({
      id: 'wellbeing-break',
      name: 'WellbeingBreak',
      isSystem: true,
      isDefault: false,
    });
  });

  it('projects only the SDK effective enablement flag', () => {
    expect(getFeatureFlags({isWellnessBreakEnabled: true} as never)).toMatchObject({
      isWellnessBreakEnabled: true,
    });
    expect(
      getFeatureFlags({
        aiFeature: {agentWellbeing: {enable: true, wellnessBreakReminders: 'ENABLED'}},
      } as never)
    ).not.toHaveProperty('isWellnessBreakEnabled');
  });

  it('loads the system code without exposing it through normal idle codes', async () => {
    store.store.idleCodes = [
      {id: 'ordinary', name: 'Lunch', isSystem: false, isDefault: true},
      {id: 'wellbeing-break', name: 'WellbeingBreak', isSystem: true, isDefault: false},
    ];

    await store.loadWellbeingBreakIdleCode();

    expect(store.wellbeingBreakIdleCode?.id).toBe('wellbeing-break');
    expect(store.idleCodes.map(({id}) => id)).toEqual(['ordinary']);
  });

  it('accepts current-agent notifications regardless of their agent session id', () => {
    store.handleWellnessBreak(wellnessEvent);

    expect(store.wellnessBreakState.event).toEqual(wellnessEvent);
    expect(store.wellnessEventSequence).toBe(1);

    const mismatchedSessionEvent = {...wellnessEvent, agentSessionId: 'another-session'};
    store.handleWellnessBreak(mismatchedSessionEvent);
    expect(store.wellnessBreakState.event).toEqual(mismatchedSessionEvent);
    expect(store.wellnessEventSequence).toBe(2);
  });

  it('clears only pre-accept state when RTD disconnects', () => {
    store.setWellnessBreakState({phase: 'offer-pending', event: wellnessEvent});
    store.handleAIAssistantRtdStatus({state: 'disconnected', generation: 2});
    expect(store.wellnessBreakState).toEqual({phase: 'idle'});

    store.setWellnessBreakState({phase: 'playing', event: wellnessEvent});
    store.handleAIAssistantRtdStatus({state: 'disconnected', generation: 3});
    expect(store.wellnessBreakState.phase).toBe('playing');
  });

  it('ignores an older RTD connection generation', () => {
    const current: AIAssistantRTDStatusEvent = {state: 'connected', generation: 4};
    store.store.aiAssistantRtdStatus = current;
    store.handleAIAssistantRtdStatus({state: 'disconnected', generation: 3});
    expect(store.aiAssistantRtdStatus).toEqual(current);
  });

  it('updates Agent State Control snapshots only for the current session', () => {
    const update: AgentChannelStateChangedEvent = {
      agentId: 'agent-1',
      orgId: 'org-1',
      agentSessionId: 'session-1',
      channelType: 'telephony',
      agentChannelStateDetail: {
        agentState: 'Idle',
        pendingIdle: false,
        auxCodeId: 'wellbeing-break',
        stateChangeTimestamp: 1,
        stateChangeReason: 'wellness-break',
      },
      connectedChannels: ['telephony'],
      trackingId: 'tracking-1',
    };

    store.handleAgentChannelStateChanged(update);
    expect(store.isAgentStateControlEnabled).toBe(true);
    expect(store.agentChannelStateDetails.telephony?.auxCodeId).toBe('wellbeing-break');

    store.handleAgentChannelStateChanged({...update, agentSessionId: 'stale-session', channelType: 'chat'});
    expect(store.agentChannelStateDetails.chat).toBeUndefined();
  });

  it('projects the WellbeingBreak legacy state and timestamps used by the status timer', () => {
    store.handleStateChange({
      type: 'AgentStateChangeSuccess',
      agentSessionId: 'session-1',
      subStatus: 'Idle',
      auxCodeId: 'wellbeing-break',
      lastStateChangeTimestamp: 2_000,
      lastIdleCodeChangeTimestamp: 2_000,
      lastStateChangeReason: 'WellbeingBreak',
    });

    expect(store.currentState).toBe('wellbeing-break');
    expect(store.legacyAgentState).toBe('Idle');
    expect(store.legacyAuxCodeId).toBe('wellbeing-break');
    expect(store.lastStateChangeTimestamp).toBe(2_000);
    expect(store.lastIdleCodeChangeTimestamp).toBe(2_000);
  });

  it('derives configured ASC channels from the station-login snapshot when channelsMap is not exposed', () => {
    store.setupIncomingTaskHandler(mockCC);
    const loginHandler = mockCC.on.mock.calls.find(
      ([eventName]) => eventName === CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS
    )?.[1];

    loginHandler?.({
      agentId: 'agent-1',
      agentSessionId: 'session-1',
      subStatus: 'Idle',
      auxCodeId: 'meeting',
      agentChannelStateDetailMap: {
        telephony: {
          agentState: 'Idle',
          pendingIdle: false,
          auxCodeId: 'meeting',
          stateChangeTimestamp: 1,
          stateChangeReason: 'Meeting',
        },
      },
    });

    expect(store.isAgentStateControlEnabled).toBe(true);
    expect(store.agentChannelTypes).toEqual(['telephony']);
    expect(store.agentChannelStateDetails.telephony?.auxCodeId).toBe('meeting');
  });

  it('registers one stable listener for each SDK wellness event', () => {
    store.setupIncomingTaskHandler(mockCC);

    expect(mockCC.off).toHaveBeenCalledWith('WellnessBreak', store.handleWellnessBreak);
    expect(mockCC.on).toHaveBeenCalledWith('WellnessBreak', store.handleWellnessBreak);
    expect(mockCC.on).toHaveBeenCalledWith('AIAssistantRTDStatusChanged', store.handleAIAssistantRtdStatus);
    expect(mockCC.on).toHaveBeenCalledWith('AgentChannelReloginSuccess', store.handleAgentChannelRelogin);
    expect(mockCC.on).toHaveBeenCalledWith('AgentChannelStateChanged', store.handleAgentChannelStateChanged);
  });

  it('submits a flat, non-identifying behavioral metric through the SDK metrics boundary', () => {
    const submitBehavioralEvent = jest.fn();
    store.store.cc.webex = {internal: {newMetrics: {submitBehavioralEvent}}};

    store.submitBehavioralMetric({
      name: 'Wellness Break CTA User Request',
      agent: 'user',
      target: 'wellness_break_cta',
      verb: 'request',
    });

    expect(submitBehavioralEvent).toHaveBeenCalledWith({
      product: 'wxcc-widgets',
      agent: 'user',
      target: 'wellness_break_cta',
      verb: 'request',
      payload: {name: 'Wellness Break CTA User Request'},
    });
  });

  it('removes registration-level wellness listeners on logout', () => {
    store.setupIncomingTaskHandler(mockCC);
    const relogin = mockCC.on.mock.calls.find(([eventName]) => eventName === CC_EVENTS.AGENT_RELOGIN_SUCCESS)?.[1] as
      | ((payload: {agentSessionId: string}) => void)
      | undefined;
    relogin?.({agentSessionId: 'session-1'});
    const logout = mockCC.on.mock.calls.find(([eventName]) => eventName === CC_EVENTS.AGENT_LOGOUT_SUCCESS)?.[1] as
      | (() => void)
      | undefined;

    expect(logout).toBeDefined();
    logout?.();

    expect(mockCC.off).toHaveBeenCalledWith('WellnessBreak', store.handleWellnessBreak);
    expect(mockCC.off).toHaveBeenCalledWith('AIAssistantRTDStatusChanged', store.handleAIAssistantRtdStatus);
    expect(mockCC.off).toHaveBeenCalledWith('AgentChannelReloginSuccess', store.handleAgentChannelRelogin);
    expect(mockCC.off).toHaveBeenCalledWith('AgentChannelStateChanged', store.handleAgentChannelStateChanged);
  });
});
