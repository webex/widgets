import type {AgentChannelStateDetail, ITask, WellnessBreakRecoveryMarkerV1} from '@webex/cc-store';
import {
  areAllTasksSafeForWellness,
  areWellnessChannelsConfirmed,
  buildWellnessRestoreGroups,
  createWellnessRecoveryMarker,
  getWellnessRecoveryDecision,
  parseWellnessRecoveryMarker,
  shouldCancelWellnessBeforePlayback,
} from '../src/wellness/wellness.utils';

const channel = (agentState: string, auxCodeId: string | null, pendingIdle = false): AgentChannelStateDetail => ({
  agentState,
  auxCodeId,
  pendingIdle,
  stateChangeTimestamp: 1,
  stateChangeReason: '',
});

const task = (state: string, wrapUpRequired = false): ITask =>
  ({data: {interaction: {state}, wrapUpRequired}}) as ITask;

describe('Agent Wellness Break lifecycle decisions', () => {
  it('requires every task, including wrap-up and campaign tasks, to be terminal', () => {
    expect(areAllTasksSafeForWellness({one: task('completed'), two: task('terminated')})).toBe(true);
    expect(areAllTasksSafeForWellness({one: task('connected')})).toBe(false);
    expect(areAllTasksSafeForWellness({one: task('completed', true)})).toBe(false);
    expect(areAllTasksSafeForWellness({one: task('new')})).toBe(false);
  });

  it('confirms every configured ASC channel is in WellbeingBreak', () => {
    expect(
      areWellnessChannelsConfirmed(
        ['telephony', 'chat'],
        {
          telephony: channel('Idle', 'wellness'),
          chat: channel('Idle', 'wellness'),
        },
        'wellness'
      )
    ).toBe(true);
    expect(
      areWellnessChannelsConfirmed(['telephony', 'chat'], {telephony: channel('Idle', 'wellness')}, 'wellness')
    ).toBe(false);
  });

  it('cancels incompatible external state before playback but ignores it during playback', () => {
    const rona = channel('Idle', 'rona-system-code');
    expect(shouldCancelWellnessBeforePlayback('starting', rona, 'wellness')).toBe(true);
    expect(shouldCancelWellnessBeforePlayback('playing', rona, 'wellness')).toBe(false);
  });

  it('groups ASC restoration sequentially and leaves RONA unchanged', () => {
    expect(
      buildWellnessRestoreGroups({
        channelTypes: ['telephony', 'chat', 'email', 'social'],
        currentChannelStates: {
          telephony: channel('Idle', 'wellness'),
          chat: channel('Idle', 'wellness'),
          email: channel('Engaged', null),
          social: channel('Idle', 'rona'),
        },
        preBreakChannelStates: {
          telephony: {agentState: 'Available'},
          chat: {agentState: 'Idle', auxCodeId: 'lunch'},
          email: {agentState: 'Idle', auxCodeId: 'missing'},
          social: {agentState: 'Available'},
        },
        wellnessAuxCodeId: 'wellness',
        validIdleCodeIds: ['lunch', 'default'],
        defaultIdleCodeId: 'default',
      })
    ).toEqual([
      {state: 'Available', channelTypes: ['telephony', 'email']},
      {state: 'Idle', auxCodeId: 'lunch', channelTypes: ['chat']},
    ]);
  });

  it('clears a queued pending-idle transition during ASC restoration', () => {
    expect(
      buildWellnessRestoreGroups({
        channelTypes: ['telephony'],
        currentChannelStates: {telephony: channel('Available', null, true)},
        preBreakChannelStates: {telephony: {agentState: 'Idle', auxCodeId: 'lunch'}},
        wellnessAuxCodeId: 'wellness',
        validIdleCodeIds: ['lunch'],
      })
    ).toEqual([{state: 'Available', channelTypes: ['telephony']}]);
  });

  it('stores only minimal same-session recovery data and rejects malformed markers', () => {
    const marker = createWellnessRecoveryMarker({
      agentSessionId: 'session-1',
      stateModel: 'agent-state-control',
      channelTypes: ['telephony'],
      preBreakChannelStates: {telephony: {agentState: 'Idle', auxCodeId: 'lunch'}},
    });

    expect(marker).toEqual({
      version: 1,
      agentSessionId: 'session-1',
      stateModel: 'agent-state-control',
      channelTypes: ['telephony'],
      preBreakChannelStates: {telephony: {agentState: 'Idle', auxCodeId: 'lunch'}},
    });
    expect(parseWellnessRecoveryMarker(JSON.stringify(marker))).toEqual(marker);
    expect(parseWellnessRecoveryMarker('{bad-json')).toBeUndefined();
  });

  it('restores only a matching session that still owns WellbeingBreak', () => {
    const marker: WellnessBreakRecoveryMarkerV1 = {
      version: 1,
      agentSessionId: 'session-1',
      stateModel: 'agent-state-control',
      channelTypes: ['telephony'],
    };

    expect(
      getWellnessRecoveryDecision({
        marker,
        agentSessionId: 'session-1',
        wellnessAuxCodeId: 'wellness',
        legacyStateKnown: false,
        ascSnapshotKnown: true,
        currentChannelStates: {telephony: channel('Idle', 'wellness')},
      })
    ).toBe('restore');
    expect(
      getWellnessRecoveryDecision({
        marker,
        agentSessionId: 'different-session',
        wellnessAuxCodeId: 'wellness',
        legacyStateKnown: false,
        ascSnapshotKnown: true,
        currentChannelStates: {telephony: channel('Idle', 'wellness')},
      })
    ).toBe('discard');
  });
});
