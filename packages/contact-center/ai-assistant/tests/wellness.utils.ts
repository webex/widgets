import type {ITask} from '@webex/cc-store';
import type {WellnessBreakRecoveryMarkerV1} from '../src/wellness/wellness-internal.types';
import {
  areAllTasksSafeForWellness,
  createWellnessRecoveryMarker,
  getWellnessRecoveryDecision,
  parseWellnessRecoveryMarker,
} from '../src/wellness/wellness.utils';

const task = (state: string, wrapUpRequired = false): ITask =>
  ({data: {interaction: {state}, wrapUpRequired}}) as ITask;

describe('Agent Wellness Break lifecycle decisions', () => {
  it('requires every task, including wrap-up and campaign tasks, to be terminal', () => {
    expect(areAllTasksSafeForWellness({one: task('completed'), two: task('terminated')})).toBe(true);
    expect(areAllTasksSafeForWellness({one: task('connected')})).toBe(false);
    expect(areAllTasksSafeForWellness({one: task('completed', true)})).toBe(false);
    expect(areAllTasksSafeForWellness({one: task('new')})).toBe(false);
  });

  it('stores only minimal same-session recovery data and rejects malformed markers', () => {
    const marker = createWellnessRecoveryMarker({
      agentSessionId: 'session-1',
      preBreakLegacyState: 'Idle',
      preBreakLegacyAuxCodeId: 'lunch',
    });

    expect(marker).toEqual({
      version: 1,
      agentSessionId: 'session-1',
      preBreakLegacyState: 'Idle',
      preBreakLegacyAuxCodeId: 'lunch',
    });
    expect(parseWellnessRecoveryMarker(JSON.stringify(marker))).toEqual(marker);
    expect(parseWellnessRecoveryMarker('{bad-json')).toBeUndefined();
    expect(
      parseWellnessRecoveryMarker(JSON.stringify({version: 1, agentSessionId: 'session-1', preBreakLegacyAuxCodeId: 7}))
    ).toBeUndefined();
  });

  it('restores only a matching session that still owns WellbeingBreak', () => {
    const marker: WellnessBreakRecoveryMarkerV1 = {
      version: 1,
      agentSessionId: 'session-1',
      preBreakLegacyState: 'Idle',
      preBreakLegacyAuxCodeId: 'lunch',
    };

    expect(
      getWellnessRecoveryDecision({
        marker,
        agentSessionId: 'session-1',
        wellnessAuxCodeId: 'wellness',
        legacyStateKnown: true,
        legacyAuxCodeId: 'wellness',
      })
    ).toBe('restore');
    expect(
      getWellnessRecoveryDecision({
        marker,
        agentSessionId: 'different-session',
        wellnessAuxCodeId: 'wellness',
        legacyStateKnown: true,
        legacyAuxCodeId: 'wellness',
      })
    ).toBe('discard');
    expect(
      getWellnessRecoveryDecision({
        marker,
        agentSessionId: 'session-1',
        wellnessAuxCodeId: 'wellness',
        legacyStateKnown: false,
      })
    ).toBe('wait');
    expect(
      getWellnessRecoveryDecision({
        marker,
        agentSessionId: 'session-1',
        wellnessAuxCodeId: 'wellness',
        legacyStateKnown: true,
        legacyAuxCodeId: 'external-state',
      })
    ).toBe('clear');
  });
});
