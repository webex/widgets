import store, {CC_EVENTS, WellnessBreakEvent} from '../src';
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

  it('ignores a stale system-code response after logout', async () => {
    let resolveIdleCode: ((value: Awaited<ReturnType<typeof mockCC.getWellbeingBreakIdleCode>>) => void) | undefined;
    mockCC.getWellbeingBreakIdleCode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveIdleCode = resolve;
        })
    );

    const pendingLoad = store.loadWellbeingBreakIdleCode();
    store.store.isAgentLoggedIn = false;
    resolveIdleCode?.({
      id: 'wellbeing-break',
      name: 'WellbeingBreak',
      isSystem: true,
      isDefault: false,
    });
    await pendingLoad;

    expect(store.wellbeingBreakIdleCode).toBeUndefined();
    expect(store.wellnessBreakState).toEqual({phase: 'idle'});
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

  it('ignores wellness notifications while the agent is logged out', () => {
    store.store.isAgentLoggedIn = false;

    store.handleWellnessBreak(wellnessEvent);

    expect(store.wellnessBreakState).toEqual({phase: 'idle'});
    expect(store.wellnessEventSequence).toBe(0);
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

  it('registers one stable SDK wellness listener', () => {
    store.setupIncomingTaskHandler(mockCC);

    expect(mockCC.off).toHaveBeenCalledWith('WellnessBreak', store.handleWellnessBreak);
    expect(mockCC.on).toHaveBeenCalledWith('WellnessBreak', store.handleWellnessBreak);
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

  it('keeps the registration-level wellness listener across logout and relogin', () => {
    store.setupIncomingTaskHandler(mockCC);
    const relogin = mockCC.on.mock.calls.find(([eventName]) => eventName === CC_EVENTS.AGENT_RELOGIN_SUCCESS)?.[1] as
      | ((payload: {agentSessionId: string}) => void)
      | undefined;
    relogin?.({agentSessionId: 'session-1'});
    const logout = mockCC.on.mock.calls.find(([eventName]) => eventName === CC_EVENTS.AGENT_LOGOUT_SUCCESS)?.[1] as
      | (() => void)
      | undefined;

    expect(logout).toBeDefined();
    const wellnessOffCount = mockCC.off.mock.calls.filter(([eventName]) => eventName === 'WellnessBreak').length;
    logout?.();

    expect(mockCC.off.mock.calls.filter(([eventName]) => eventName === 'WellnessBreak')).toHaveLength(wellnessOffCount);
  });
});
