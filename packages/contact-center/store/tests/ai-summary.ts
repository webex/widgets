import {aiSummaryFixtures} from '../../test-fixtures/src/aiSummaryFixtures';
import {
  acceptAISummaryContent,
  advanceAISummaryOwnerState,
  chooseAISummaryFreshness,
  composeMidCallResponse,
  composePostCallResponse,
  createAISummaryOwnerState,
  editAISummaryContent,
  mapAISummaryError,
  nextPostCallGeneration,
  normalizeAISummaryFeatureEnablement,
  normalizeAISummaryPayload,
  projectAISummarySurface,
  recordAISummaryCopied,
  recordAISummaryViewed,
  reduceAISummaryCapability,
  resolveAISummaryCanonicalInteraction,
  setAISummaryFeedback,
} from '../src/ai-summary';
import type {AISummaryMidCallOwnerState, AISummaryPostCallOwnerState} from '../src/store.types';

const ownerKey = {interactionId: 'interaction-main-1', agentId: 'agent-a', ownershipGeneration: 1};

describe('ai-summary SDK-independent boundary', () => {
  it('keeps the D1 group inventory exact and SDK error fixtures internally consistent', () => {
    expect(Object.keys(aiSummaryFixtures).sort()).toEqual(
      [
        'featureEnablement',
        'initiatingMidCall',
        'receivingMidCall',
        'postCall',
        'malformed',
        'errors',
        'ordering',
        'transfers',
        'conferences',
        'feedback',
        'counters',
        'wrapUp',
        'postWrapUpSend',
      ].sort()
    );
    for (const error of [aiSummaryFixtures.errors.disabled, aiSummaryFixtures.errors.timeout]) {
      expect(error.data.errorCode).toBe(error.message);
    }
  });

  it('derives canonical identity only from stable main candidates', () => {
    expect(resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.stableMain.task)).toEqual({
      kind: 'valid',
      interactionId: 'interaction-main-1',
    });
    expect(resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.mainInteractionIdOnly.task)).toEqual({
      kind: 'valid',
      interactionId: 'interaction-main-1',
    });
    expect(resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.mainCallMediaOnly.task)).toEqual({
      kind: 'valid',
      interactionId: 'interaction-main-1',
    });
    expect(
      resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.conflictingStableCandidates.task)
    ).toEqual({
      kind: 'invalid',
      reason: 'conflicting-stable-identity',
    });
    expect(resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.mainAliasRejected.task)).toEqual({
      kind: 'invalid',
      reason: 'missing-stable-identity',
    });
    expect(resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.mapKeyOnlyRejected.task)).toEqual({
      kind: 'invalid',
      reason: 'missing-stable-identity',
    });
    expect(resolveAISummaryCanonicalInteraction(aiSummaryFixtures.conferences.legScopedOnlyRejected.task)).toEqual({
      kind: 'invalid',
      reason: 'missing-stable-identity',
    });
  });

  it('normalizes only top-level capability fields and orders untimestamped observations by arrival', () => {
    const enabled = normalizeAISummaryFeatureEnablement(aiSummaryFixtures.featureEnablement.enabled, 1);
    const invalid = normalizeAISummaryFeatureEnablement(
      aiSummaryFixtures.malformed.featureEnablementNonNumericActionTimestamp,
      2
    );
    const disabled = normalizeAISummaryFeatureEnablement(aiSummaryFixtures.featureEnablement.missingActionTimestamp, 3);
    const flagsOmitted = normalizeAISummaryFeatureEnablement(aiSummaryFixtures.featureEnablement.flagsOmitted, 4);
    const nonBoolean = normalizeAISummaryFeatureEnablement(
      aiSummaryFixtures.malformed.featureEnablementNonBooleanFlag,
      5
    );

    expect(reduceAISummaryCapability(enabled, invalid)).toBe(enabled);
    expect(reduceAISummaryCapability(enabled, disabled)).toMatchObject({kind: 'valid', enabled: false});
    expect(flagsOmitted).toMatchObject({kind: 'valid', enabled: false, timestamp: {present: true, value: 1004}});
    expect(nonBoolean).toMatchObject({kind: 'valid', enabled: false});
  });

  it('maps SDK summary errors and safe transport indicators to sanitized categories', () => {
    expect(mapAISummaryError(aiSummaryFixtures.errors.timeout)).toBe('timeout');
    expect(mapAISummaryError(new Error('POST_CALL_SUMMARY_TIMEOUT'))).toBe('timeout');
    expect(mapAISummaryError(aiSummaryFixtures.errors.disabled)).toBe('disabled');
    expect(mapAISummaryError(aiSummaryFixtures.errors.initialization)).toBe('initialization');
    expect(mapAISummaryError(aiSummaryFixtures.errors.unauthorized)).toBe('unauthorized');
    expect(mapAISummaryError(aiSummaryFixtures.errors.unavailable)).toBe('unavailable');
    expect(mapAISummaryError(aiSummaryFixtures.errors.offline)).toBe('offline');
    expect(mapAISummaryError(aiSummaryFixtures.errors.generic)).toBe('generic');
  });

  it('normalizes role-compatible payloads, drops unknown sections, and discards mismatched conversations', () => {
    const typed = normalizeAISummaryPayload({
      raw: {
        ...aiSummaryFixtures.initiatingMidCall.typedSections,
        sections: {
          ...aiSummaryFixtures.initiatingMidCall.typedSections.sections,
          unknown: 'Drop me',
        },
      },
      role: 'initiator',
      expectedInteractionId: 'interaction-main-1',
    });

    expect(typed.kind).toBe('success');
    if (typed.kind === 'success' && typed.content.type === 'sections') {
      expect(typed.content.sections.map((section) => section.key)).toEqual([
        'reasonForTransferOrConsult',
        'additionalContext',
        'keyActionsTaken',
      ]);
    }

    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.ordering.mismatchedConversation.payload,
        role: 'initiator',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'discarded-interaction-mismatch', interactionId: 'other-interaction'});
  });

  it('accepts initiator text and sections while rejecting receiver-only card payloads', () => {
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.initiatingMidCall.typedSections,
        role: 'initiator',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'success', role: 'initiator', content: {type: 'sections'}});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.initiatingMidCall.plainText,
        role: 'initiator',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'success', role: 'initiator', content: {type: 'text'}});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.initiatingMidCall.cardOnlyUnsupported,
        role: 'initiator',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'unsupported', role: 'initiator'});
  });

  it('accepts receiver cards while rejecting initiator/post-call text shapes', () => {
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.receivingMidCall.adaptiveCard,
        role: 'receiver',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'success', role: 'receiver', content: {type: 'card'}});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.receivingMidCall.typedOnlyUnsupported,
        role: 'receiver',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'unsupported', role: 'receiver'});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.receivingMidCall.plainOnlyUnsupported,
        role: 'receiver',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'unsupported', role: 'receiver'});
  });

  it('accepts post-call text and sections while rejecting card-only payloads', () => {
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.postCall.structured,
        role: 'post-call',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'success', role: 'post-call', content: {type: 'sections'}});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.postCall.plainText,
        role: 'post-call',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'success', role: 'post-call', content: {type: 'text'}});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.postCall.cardOnlyUnsupported,
        role: 'post-call',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'unsupported', role: 'post-call'});
  });

  it('retains only exact SDK section keys and values without presentation labels', () => {
    const normalized = normalizeAISummaryPayload({
      raw: {
        conversationId: 'interaction-main-1',
        timestamp: 2003,
        sections: {
          reasonForTransferOrConsult: 'Customer needs billing help.',
          additionalContext: 'Verified the account.',
        },
      },
      role: 'initiator',
      expectedInteractionId: 'interaction-main-1',
    });

    expect(normalized.kind).toBe('success');
    if (normalized.kind === 'success' && normalized.content.type === 'sections') {
      expect(normalized.content.sections).toEqual([
        {key: 'reasonForTransferOrConsult', value: 'Customer needs billing help.', editable: true},
        {key: 'additionalContext', value: 'Verified the account.', editable: true},
      ]);
    }
  });

  it('falls back to non-blank summaryText when declared sections are absent or blank', () => {
    const normalized = normalizeAISummaryPayload({
      raw: {
        conversationId: 'interaction-main-1',
        timestamp: 2004,
        sections: {
          reasonForTransferOrConsult: '  ',
          unknown: 'Ignored unknown value.',
        },
        summaryText: '  Plain text with original bytes.  ',
      },
      role: 'initiator',
      expectedInteractionId: 'interaction-main-1',
    });

    expect(normalized.kind).toBe('success');
    if (normalized.kind === 'success') {
      expect(normalized.content).toEqual({type: 'text', summaryText: '  Plain text with original bytes.  '});
    }
  });

  it('requires receiver card records and ignores typed/plain receiver render sources', () => {
    const mixed = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.receivingMidCall.adaptiveCard,
      role: 'receiver',
      expectedInteractionId: 'interaction-main-1',
    });
    const invalidCard = normalizeAISummaryPayload({
      raw: {...aiSummaryFixtures.receivingMidCall.adaptiveCard, adaptiveCard: null},
      role: 'receiver',
      expectedInteractionId: 'interaction-main-1',
    });

    expect(mixed.kind).toBe('success');
    if (mixed.kind === 'success') {
      expect(mixed.content.type).toBe('card');
    }
    expect(invalidCard).toMatchObject({kind: 'unsupported', role: 'receiver'});
  });

  it('routes unsupported content only through normalized unsupported results', () => {
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.initiatingMidCall.cardOnlyUnsupported,
        role: 'initiator',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'unsupported'});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.receivingMidCall.adaptiveCard,
        role: 'receiver',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'success'});
    expect(
      normalizeAISummaryPayload({
        raw: aiSummaryFixtures.receivingMidCall.plainOnlyUnsupported,
        role: 'receiver',
        expectedInteractionId: 'interaction-main-1',
      })
    ).toMatchObject({kind: 'unsupported'});
    expect(mapAISummaryError({category: 'unsupported'})).toBe('generic');
  });

  it('retains post-call resolution separately and omits absent, undefined, and empty resolution', () => {
    const present = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.postCall.resolutionPresent,
      role: 'post-call',
      expectedInteractionId: 'interaction-main-1',
    });
    const absent = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.postCall.resolutionAbsent,
      role: 'post-call',
      expectedInteractionId: 'interaction-main-1',
    });
    const empty = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.postCall.resolutionEmptyBoundary,
      role: 'post-call',
      expectedInteractionId: 'interaction-main-1',
    });

    expect(present.kind).toBe('success');
    if (present.kind === 'success' && present.content.type === 'sections') {
      expect(present.content.resolution).toBe('Correction approved');
      expect(present.content.sections.map((section) => section.key)).toEqual(['initialContactReason', 'nextSteps']);
    }
    for (const result of [absent, empty]) {
      expect(result.kind).toBe('success');
      if (result.kind === 'success' && result.content.type === 'sections') {
        expect(result.content.resolution).toBeUndefined();
      }
    }
  });

  it('uses exact optional timestamp ordering and owner-role arrival fallback', () => {
    const present = aiSummaryFixtures.ordering.presentGreaterTimestamp;
    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'initiator', arrivalOrder: 1, timestamp: {present: true, value: present.previous.timestamp}},
        {ownerRole: 'initiator', arrivalOrder: 2, timestamp: {present: true, value: present.incoming.timestamp}}
      )
    ).toBe('incoming');

    const lower = aiSummaryFixtures.ordering.presentLowerTimestamp;
    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'initiator', arrivalOrder: 2, timestamp: {present: true, value: lower.previous.timestamp}},
        {ownerRole: 'initiator', arrivalOrder: 3, timestamp: {present: true, value: lower.incoming.timestamp}}
      )
    ).toBe('current');

    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'receiver', arrivalOrder: 1, timestamp: {present: false}},
        {ownerRole: 'receiver', arrivalOrder: 2, timestamp: {present: false}}
      )
    ).toBe('incoming');
    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'receiver', arrivalOrder: 1, timestamp: {present: true, value: 10}},
        {ownerRole: 'receiver', arrivalOrder: 2, timestamp: {present: false}}
      )
    ).toBe('incoming');
    const mixedOmittedPresent = aiSummaryFixtures.ordering.mixedOmittedPresent;
    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'receiver', arrivalOrder: 1, timestamp: {present: false}},
        {
          ownerRole: 'receiver',
          arrivalOrder: 2,
          timestamp: {present: true, value: mixedOmittedPresent.incoming.timestamp},
        }
      )
    ).toBe('incoming');

    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'post-call', arrivalOrder: 4, timestamp: {present: true, value: 3000}, ownerGeneration: 1},
        {ownerRole: 'post-call', arrivalOrder: 3, timestamp: {present: true, value: 2500}, ownerGeneration: 2}
      )
    ).toBe('incoming');
    expect(
      chooseAISummaryFreshness(
        {ownerRole: 'post-call', arrivalOrder: 4, timestamp: {present: true, value: 3000}, ownerGeneration: 2},
        {ownerRole: 'post-call', arrivalOrder: 5, timestamp: {present: true, value: 3500}, ownerGeneration: 1}
      )
    ).toBe('stale');
    expect(
      chooseAISummaryFreshness(
        {
          ownerRole: 'post-call',
          arrivalOrder: 4,
          timestamp: {present: true, value: 3000},
          ownerGeneration: 2,
          postCallGeneration: 1,
        },
        {
          ownerRole: 'post-call',
          arrivalOrder: 3,
          timestamp: {present: true, value: 2500},
          ownerGeneration: 2,
          postCallGeneration: 2,
        }
      )
    ).toBe('incoming');
    expect(
      chooseAISummaryFreshness(
        {
          ownerRole: 'post-call',
          arrivalOrder: 4,
          timestamp: {present: true, value: 3000},
          ownerGeneration: 2,
          postCallGeneration: 2,
        },
        {
          ownerRole: 'post-call',
          arrivalOrder: 5,
          timestamp: {present: true, value: 3500},
          ownerGeneration: 2,
          postCallGeneration: 1,
        }
      )
    ).toBe('stale');
  });

  it('isolates mid-call and post-call owner state, counters, revisions, edits, copies, and feedback guards', () => {
    const normalized = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.initiatingMidCall.typedSections,
      role: 'initiator',
      expectedInteractionId: 'interaction-main-1',
    });
    expect(normalized.kind).toBe('success');
    if (normalized.kind !== 'success') {
      return;
    }
    const initial = createAISummaryOwnerState({
      kind: 'mid-call',
      role: 'initiator',
      ownerKey,
      actionType: 'CONSULT',
    });
    const ready = acceptAISummaryContent(initial, normalized.content, 11) as AISummaryMidCallOwnerState;
    const firstView = recordAISummaryViewed(ready, 11);
    const secondView = recordAISummaryViewed(firstView.state, 11);
    const noopEdit = editAISummaryContent(
      secondView.state,
      {key: 'reasonForTransferOrConsult', value: 'Customer needs billing help.'},
      11,
      12
    );
    const edited = editAISummaryContent(secondView.state, {key: 'reasonForTransferOrConsult', value: ''}, 11, 12);
    const staleCopy = recordAISummaryCopied(edited.state, 11);
    const copied = recordAISummaryCopied(edited.state, 12);
    const liked = setAISummaryFeedback(copied.state, 'like', 12);

    expect(ready.counters.viewed).toBe(0);
    expect(firstView.accepted).toBe(true);
    expect(secondView.accepted).toBe(true);
    expect(noopEdit.accepted).toBe(true);
    expect(noopEdit.state).toBe(secondView.state);
    expect(edited.accepted).toBe(true);
    expect(edited.state.contentRevision).toBe(12);
    expect(copied.accepted).toBe(true);
    expect(staleCopy.accepted).toBe(false);
    expect(liked.accepted).toBe(true);
    expect(liked.state.counters).toMatchObject({viewed: 2, edited: 1, copied: 1, liked: 1});
    expect(composeMidCallResponse(liked.state as AISummaryMidCallOwnerState)).toMatchObject({
      summary: expect.objectContaining({reasonForTransferOrConsult: ''}),
      feedback: 'thumbs_up',
      numberOfTimesViewed: 2,
    });
  });

  it('advances owner states by carrying same-agent content or resetting cross-agent views', () => {
    const normalized = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.initiatingMidCall.typedSections,
      role: 'initiator',
      expectedInteractionId: 'interaction-main-1',
    });
    expect(normalized.kind).toBe('success');
    if (normalized.kind !== 'success') {
      return;
    }
    const initial = createAISummaryOwnerState({
      kind: 'mid-call',
      role: 'initiator',
      ownerKey,
      actionType: 'TRANSFER',
    });
    const ready = acceptAISummaryContent(initial, normalized.content, 12) as AISummaryMidCallOwnerState;
    const viewed = recordAISummaryViewed(ready, 12).state as AISummaryMidCallOwnerState;
    const successorOwnerKey = {...ownerKey, ownershipGeneration: 2};
    const carried = advanceAISummaryOwnerState(
      viewed,
      successorOwnerKey,
      'carry-forward'
    ) as AISummaryMidCallOwnerState;
    const reset = advanceAISummaryOwnerState(
      viewed,
      {...ownerKey, agentId: 'agent-b', ownershipGeneration: 3},
      'reset'
    ) as AISummaryMidCallOwnerState;

    expect(carried).toMatchObject({
      ownerKey: successorOwnerKey,
      contentRevision: 12,
      counters: expect.objectContaining({viewed: 1}),
      feedback: 'none',
      actionType: 'TRANSFER',
      midCallFeedbackPending: false,
    });
    expect(carried.content).toEqual(viewed.content);
    expect(reset.content).toBeUndefined();
    expect(reset).toMatchObject({
      contentRevision: 0,
      counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
      feedback: 'none',
      actionType: 'TRANSFER',
    });
  });

  it('models post-call-specific fields, feedback status, and response composition without outcome leakage', () => {
    const normalized = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.postCall.structured,
      role: 'post-call',
      expectedInteractionId: 'interaction-main-1',
    });
    expect(normalized.kind).toBe('success');
    if (normalized.kind !== 'success') {
      return;
    }
    const initial = createAISummaryOwnerState({
      kind: 'post-call',
      role: 'post-call',
      ownerKey,
      postCallGeneration: 4,
    });
    const ready = acceptAISummaryContent(initial, normalized.content, 12) as AISummaryPostCallOwnerState;
    const rated = setAISummaryFeedback(ready, 'dislike', 12);

    expect(rated.accepted).toBe(true);
    expect(rated.state).toMatchObject({
      kind: 'post-call',
      postCallFeedbackPending: true,
      feedbackStatus: 'pending',
      agentWrappedUpObserved: false,
    });
    expect(composePostCallResponse(rated.state as AISummaryPostCallOwnerState)).toMatchObject({
      summary: expect.objectContaining({initialContactReason: expect.any(String)}),
      feedback: 'thumbs_down',
    });
  });

  it('composes receiver card responses from deterministic card text and current counters', () => {
    const normalized = normalizeAISummaryPayload({
      raw: aiSummaryFixtures.receivingMidCall.adaptiveCard,
      role: 'receiver',
      expectedInteractionId: 'interaction-main-1',
    });
    expect(normalized.kind).toBe('success');
    if (normalized.kind !== 'success') {
      return;
    }
    const initial = createAISummaryOwnerState({
      kind: 'mid-call',
      role: 'receiver',
      ownerKey,
      actionType: 'TRANSFER',
    });
    const ready = acceptAISummaryContent(initial, normalized.content, 13) as AISummaryMidCallOwnerState;
    const viewed = recordAISummaryViewed(ready, 13);
    const copied = recordAISummaryCopied(viewed.state, 13);
    const liked = setAISummaryFeedback(copied.state, 'like', 13);

    expect(composeMidCallResponse(liked.state as AISummaryMidCallOwnerState)).toMatchObject({
      summary: 'Customer needs billing help.\nInvoice discrepancy is the active topic.',
      feedback: 'thumbs_up',
      numberOfTimesViewed: 1,
      numberOfTimesCopied: 1,
      summaryReceived: true,
    });
  });

  it('projects closed surfaces and post-call reason generation transitions', () => {
    expect(
      projectAISummarySurface({kind: 'mid-call', role: 'initiator', eligible: false, requestPending: false})
    ).toMatchObject({key: 'mid-call:initiator', surface: 'omitted'});
    expect(
      projectAISummarySurface({kind: 'mid-call', role: 'receiver', eligible: false, requestPending: false})
    ).toMatchObject({key: 'mid-call:receiver', surface: 'omitted'});
    expect(
      projectAISummarySurface({kind: 'post-call', role: 'post-call', eligible: false, requestPending: false})
    ).toMatchObject({key: 'post-call:post-call', surface: 'omitted'});
    expect(
      projectAISummarySurface({
        kind: 'mid-call',
        role: 'receiver',
        eligible: true,
        requestPending: false,
        result: {
          kind: 'unsupported',
          interactionId: 'interaction-main-1',
          role: 'receiver',
          timestamp: {present: false},
          arrivalOrder: 1,
        },
      }).surface
    ).toBe('unavailable');
    expect(
      projectAISummarySurface({
        kind: 'post-call',
        role: 'post-call',
        eligible: true,
        requestPending: false,
        result: {kind: 'error', category: 'timeout', role: 'post-call', interactionId: 'interaction-main-1'},
      }).surface
    ).toBe('generic-error');
    expect(
      projectAISummarySurface({
        kind: 'post-call',
        role: 'post-call',
        eligible: true,
        requestPending: true,
        result: {kind: 'error', category: 'timeout', role: 'post-call', interactionId: 'interaction-main-1'},
      }).surface
    ).toBe('generating');
    expect(
      projectAISummarySurface({
        kind: 'post-call',
        role: 'post-call',
        eligible: true,
        requestPending: false,
        result: {kind: 'error', category: 'unauthorized', role: 'post-call', interactionId: 'interaction-main-1'},
      })
    ).toMatchObject({eligible: false, surface: 'omitted'});
    expect(
      projectAISummarySurface({
        kind: 'mid-call',
        role: 'receiver',
        eligible: true,
        requestPending: false,
        result: {kind: 'error', category: 'initialization', role: 'receiver', interactionId: 'interaction-main-1'},
      })
    ).toMatchObject({eligible: false, surface: 'omitted'});
    const postCallState = createAISummaryOwnerState({
      kind: 'post-call',
      role: 'post-call',
      ownerKey,
      postCallGeneration: 5,
    }) as AISummaryPostCallOwnerState;
    expect(
      projectAISummarySurface({
        kind: 'post-call',
        role: 'post-call',
        eligible: true,
        requestPending: true,
        state: {...postCallState, postCallCompletionEscapeGeneration: 5},
      }).completionEscape
    ).toBe(true);
    expect(
      projectAISummarySurface({
        kind: 'post-call',
        role: 'post-call',
        eligible: true,
        requestPending: true,
        state: {...postCallState, postCallGeneration: 6, postCallCompletionEscapeGeneration: 5},
      }).completionEscape
    ).toBe(false);
    expect(
      projectAISummarySurface({
        kind: 'post-call',
        role: 'post-call',
        eligible: true,
        requestPending: false,
        state: {...postCallState, postCallCaptureRevision: 0},
      }).controlsDisabled
    ).toBe(true);

    expect(nextPostCallGeneration(3, {type: 'reason-commit', reasonId: 'r1', selectionRevision: 1}, 1)).toBe(4);
    expect(nextPostCallGeneration(4, {type: 'retry'}, 2)).toBe(2);
    expect(nextPostCallGeneration(4, {type: 'retry'})).toBe(4);
  });

  it('names the conference two-party host fixture for the SDK-bound integration suite', () => {
    expect(aiSummaryFixtures.conferences.twoPartyHost.expectedHostAgentId).toBe('agent-a');
  });
});
