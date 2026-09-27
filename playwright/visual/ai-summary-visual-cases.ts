export type UXSourceId =
  | 'UX-001'
  | 'UX-002'
  | 'UX-003'
  | 'UX-004'
  | 'UX-005'
  | 'UX-006'
  | 'UX-007'
  | 'UX-008'
  | 'UX-009'
  | 'UX-010';

export type UXScreenshotId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07-UX' | 'S08' | 'S09' | 'S10';
// Capture coverage is independent of acceptance: S10 is measured, but its
// completion availability remains a requirement-owned structural override.
export type AISummaryScreenshotBackedSourceId = UXSourceId;

export type AISummaryMode = 'mid-call-initiator' | 'mid-call-receiver' | 'post-call';

export type AISummaryVisualVariantId = 'dl' | 'desktop-light';

export type AISummaryStructuralEvidenceReason = 'no-sealed-screenshot' | 'requirement-availability-override';

export type AISummaryVisualFontFace = {
  readonly id: string;
  readonly family: 'Inter';
  readonly sourcePackagePath: string;
  readonly emittedUrlPath: string;
  readonly sha256: string;
  readonly format: 'woff2';
  readonly style: 'normal';
  readonly weight: '100 900';
  readonly stretch: 'normal';
  readonly display: 'block';
  readonly sampleGlyphs: string;
  readonly requiredFaces: readonly {
    readonly style: 'normal';
    readonly weight: '400' | '500' | '600' | '700';
    readonly sizePx: 16;
  }[];
};

export type AISummaryVisualFontManifest = {
  readonly schemaVersion: 1;
  readonly closed: true;
  readonly hostSelector: '#root';
  readonly evidenceSelector: '[data-testid="consult-transfer:summary"], [data-testid="wrap-up-summary"]';
  readonly cssVariable: '--mds-font-family-primary';
  readonly fonts: readonly AISummaryVisualFontFace[];
};

export const AI_SUMMARY_VISUAL_FONT_MANIFEST = {
  schemaVersion: 1,
  closed: true,
  hostSelector: '#root',
  evidenceSelector: '[data-testid="consult-transfer:summary"], [data-testid="wrap-up-summary"]',
  cssVariable: '--mds-font-family-primary',
  fonts: [
    {
      id: 'momentum-ui-core-inter-variable',
      family: 'Inter',
      sourcePackagePath: 'node_modules/@momentum-ui/core/fonts/Inter.var.woff2',
      emittedUrlPath: '/fonts/Inter.var.woff2',
      sha256: '85f08b5f51e36ca7e961a033c6bb61d7f0e44aa0984646383ecac648e98fdcc8',
      format: 'woff2',
      style: 'normal',
      weight: '100 900',
      stretch: 'normal',
      display: 'block',
      sampleGlyphs: 'AI Summary Wrap-Up Billing helpful copied unavailable 0123456789 $29.99',
      requiredFaces: [
        {style: 'normal', weight: '400', sizePx: 16},
        {style: 'normal', weight: '500', sizePx: 16},
        {style: 'normal', weight: '600', sizePx: 16},
        {style: 'normal', weight: '700', sizePx: 16},
      ],
    },
  ],
} as const satisfies AISummaryVisualFontManifest;

export type AISummaryDeclaredToCanonicalAlias = {
  readonly declared: {
    readonly sourceId: 'UX-007';
    readonly screenshotId: 'S07-UX';
    readonly variantId: 'desktop-light';
  };
  readonly canonical: {
    readonly evidenceId: 'S07';
    readonly variantId: 'dl';
  };
  readonly sha256: string;
};

export type AISummaryResolvedVisualEvidenceIdentity = {
  readonly declared: {
    readonly sourceId: AISummaryScreenshotBackedSourceId;
    readonly screenshotId: UXScreenshotId;
    readonly variantId: AISummaryVisualVariantId;
    readonly registryKey: string;
    readonly sha256: string;
  };
  readonly canonical: {
    readonly evidenceId: string;
    readonly variantId: string;
    readonly registryKey: string;
    readonly sha256: string;
  };
  readonly registryKey: string;
  readonly scenarioId: string;
  readonly renderPath: readonly [string, string];
  readonly declaredToCanonicalAlias?: AISummaryDeclaredToCanonicalAlias;
};

export type AISummaryStructuralAssertion =
  | {
      readonly kind: 'testId';
      readonly testId: string;
      readonly expected: 'present' | 'absent';
      readonly description: string;
    }
  | {
      readonly kind: 'selector';
      readonly selector: string;
      readonly expected: 'present' | 'absent';
      readonly description: string;
    }
  | {
      readonly kind: 'role';
      readonly role: 'button' | 'dialog' | 'textbox' | 'radio' | 'heading';
      readonly name: string;
      readonly expected: 'present' | 'absent';
      readonly exact?: boolean;
      readonly description: string;
    }
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly expected: 'present' | 'absent';
      readonly description: string;
    }
  | {
      readonly kind: 'state';
      readonly key:
        | 'clipboardWrites'
        | 'counterTransition'
        | 'focusTarget'
        | 'requestCounts'
        | 'responseStatus'
        | 'viewport'
        | 'forcedColors';
      readonly expected: string;
      readonly description: string;
    };

export type AISummaryVisualCase = {
  readonly kind: 'screenshot';
  readonly sourceId: AISummaryScreenshotBackedSourceId;
  readonly screenshotId: UXScreenshotId;
  readonly canonicalEvidenceId: 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07' | 'S08' | 'S09' | 'S10';
  readonly acceptanceOverride?: 'requirement-availability-override';
  readonly stateId: string;
  readonly variantId: AISummaryVisualVariantId;
  readonly mode: AISummaryMode;
  readonly screenshotPath: string;
  readonly sceneGraphPath: string;
  readonly textContentPath: string;
  readonly screenshotSha256: string;
  readonly scale: 2;
  readonly crop: readonly [number, number, number, number];
  readonly panelWidth?: number;
  readonly declaredToCanonicalAlias?: AISummaryDeclaredToCanonicalAlias;
  readonly scenario: string;
};

export type AISummaryStructuralCase = {
  readonly kind: 'structural';
  readonly stateId: string;
  readonly mode: AISummaryMode | 'host';
  readonly action?: 'CONSULT' | 'TRANSFER' | 'COPY' | 'LIKE' | 'DISLIKE' | 'WRAP_UP' | 'RETRY';
  readonly sourceId?: UXSourceId;
  readonly screenshotId?: UXScreenshotId;
  readonly extrapolatedFrom?: UXScreenshotId;
  readonly scenario: string;
  readonly messageId?: string;
  readonly productConfirmationRef?: string;
  readonly evidenceReason: AISummaryStructuralEvidenceReason;
  readonly assertions: readonly AISummaryStructuralAssertion[];
};

type AISummaryStructuralCaseDefinition = Omit<AISummaryStructuralCase, 'assertions' | 'evidenceReason'>;

export const UX_SOURCE_TO_SCREENSHOT = {
  'UX-001': 'S01',
  'UX-002': 'S02',
  'UX-003': 'S03',
  'UX-004': 'S04',
  'UX-005': 'S05',
  'UX-006': 'S06',
  'UX-007': 'S07-UX',
  'UX-008': 'S08',
  'UX-009': 'S09',
  'UX-010': 'S10',
} as const satisfies Record<UXSourceId, UXScreenshotId>;

export type AISummaryVisualArgs = {
  [SourceId in AISummaryScreenshotBackedSourceId]: readonly [SourceId, (typeof UX_SOURCE_TO_SCREENSHOT)[SourceId]];
}[AISummaryScreenshotBackedSourceId];

type AssertAISummaryVisualArgs<T extends AISummaryVisualArgs> = T;
type _AcceptUX007Tuple = AssertAISummaryVisualArgs<readonly ['UX-007', 'S07-UX']>;
// @ts-expect-error UX-001 is bound only to S01.
type _RejectMismatchedUX001Tuple = AssertAISummaryVisualArgs<readonly ['UX-001', 'S07-UX']>;
// @ts-expect-error UX-007 is bound only to S07-UX.
type _RejectMismatchedUX007Tuple = AssertAISummaryVisualArgs<readonly ['UX-007', 'S01']>;
type _AcceptMeasuredS10Tuple = AssertAISummaryVisualArgs<readonly ['UX-010', 'S10']>;

export const AI_SUMMARY_VISUAL_CASES = [
  {
    kind: 'screenshot',
    sourceId: 'UX-001',
    screenshotId: 'S01',
    canonicalEvidenceId: 'S01',
    stateId: 'JNY-001:mid-call-summary',
    variantId: 'dl',
    mode: 'mid-call-initiator',
    screenshotPath: '.ccwidgets/midcall/midcall.png',
    sceneGraphPath: '.ccwidgets/midcall/figma_target_8061_880455_compact.json',
    textContentPath: '.ccwidgets/midcall/figma_target_8061_880455_text.json',
    screenshotSha256: '5fee49d4111bb9b5a950e441821abc001aa99a39fdd6607b7169e2754654db0f',
    scale: 2,
    crop: [0, 0, 482, 582],
    scenario: 'mid-call consult summary below the shared destination renderer',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-002',
    screenshotId: 'S02',
    canonicalEvidenceId: 'S02',
    stateId: 'JNY-002:generating',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_generating/postcall_generating.png',
    sceneGraphPath: '.ccwidgets/postcall_generating/figma_target_5669_263180_compact.json',
    textContentPath: '.ccwidgets/postcall_generating/figma_target_5669_263180_text.json',
    screenshotSha256: '0de0aeb692ae83a922898009577b11d9d027b21c8653b05c947ba03e64bc8a21',
    scale: 2,
    crop: [0, 0, 442, 621],
    scenario: 'post-call summary generation in the wrap-up popover',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-003',
    screenshotId: 'S03',
    canonicalEvidenceId: 'S03',
    stateId: 'JNY-002:editing',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_edit/postcall_summary_edit.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_edit/figma_target_5669_263754_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_edit/figma_target_5669_263754_text.json',
    screenshotSha256: '92b2ef6fe8473c96f422ebcfece7699d5e3360503921ff40e36b281e355ba6f1',
    scale: 2,
    crop: [0, 0, 443, 621],
    scenario: 'post-call editable structured summary',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-004',
    screenshotId: 'S04',
    canonicalEvidenceId: 'S04',
    stateId: 'JNY-002:like-hover',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_hover_thumbsup/postcall_summary_hover_thumbsup.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_hover_thumbsup/figma_target_5669_264384_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_hover_thumbsup/figma_target_5669_264384_text.json',
    screenshotSha256: '3f9013a7a0772aeef98b55bf8e301957c74dca912d500e87dfeaf12f55fc50ca',
    scale: 2,
    crop: [0, 0, 403, 624],
    scenario: 'post-call like hover with fixed tooltip geometry',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-005',
    screenshotId: 'S05',
    canonicalEvidenceId: 'S05',
    stateId: 'JNY-002:like-selected',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_selected_thumbsup/postcall_summary_selected_thumbsup.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_selected_thumbsup/figma_target_5669_264503_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_selected_thumbsup/figma_target_5669_264503_text.json',
    screenshotSha256: '3628b688d6d84ee61ed1c22e1b77ee6aabb7026656ff8d9d15739b549bdeeeca',
    scale: 2,
    crop: [0, 0, 402, 622],
    scenario: 'post-call like selected with pending submission description',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-006',
    screenshotId: 'S06',
    canonicalEvidenceId: 'S06',
    stateId: 'JNY-002:dislike-hover',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_hover_thumbsdown/postcall_summary_hover_thumbsdown.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_hover_thumbsdown/figma_target_5669_264622_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_hover_thumbsdown/figma_target_5669_264622_text.json',
    screenshotSha256: '098c803e608ce2cc2f8c79ec12208a41ce5ba8ee2ffc66f2071801e2b4872641',
    scale: 2,
    crop: [-2, -1, 433, 621],
    panelWidth: 400,
    scenario: 'post-call dislike hover with fixed tooltip geometry',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-007',
    screenshotId: 'S07-UX',
    canonicalEvidenceId: 'S07',
    stateId: 'JNY-002:dislike-selected',
    variantId: 'desktop-light',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_selected_thumbsdown/postcall_summary_selected_thumbsdown.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_selected_thumbsdown/figma_target_5669_264860_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_selected_thumbsdown/figma_target_5669_264860_text.json',
    screenshotSha256: '7510c740d754cd9e612fc0cfb8ec080682f66a927e941c705cfe13d167920203',
    scale: 2,
    crop: [0, 0, 403, 622],
    declaredToCanonicalAlias: {
      declared: {
        sourceId: 'UX-007',
        screenshotId: 'S07-UX',
        variantId: 'desktop-light',
      },
      canonical: {
        evidenceId: 'S07',
        variantId: 'dl',
      },
      sha256: '7510c740d754cd9e612fc0cfb8ec080682f66a927e941c705cfe13d167920203',
    },
    scenario: 'post-call dislike selected normalized from S07-UX to S07 dl evidence',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-008',
    screenshotId: 'S08',
    canonicalEvidenceId: 'S08',
    stateId: 'JNY-002:copy-hover',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_hover_copy/postcall_summary_hover_copy.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_hover_copy/figma_target_4920_216835_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_hover_copy/figma_target_4920_216835_text.json',
    screenshotSha256: '3b1e78288b4316b4c1575f38112d924c319431f8f07bdcd88a11343a9fee6e21',
    scale: 2,
    crop: [-39, -9, 441, 632],
    scenario: 'post-call copy hover with primary label stability',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-009',
    screenshotId: 'S09',
    canonicalEvidenceId: 'S09',
    stateId: 'JNY-002:copy-selected',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_selected_copy/postcall_summary_selected_copy.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_selected_copy/figma_target_4920_216954_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_selected_copy/figma_target_4920_216954_text.json',
    screenshotSha256: '71e19e3be8da9045fce78e674006cd8963bd95f15642ff6a3884686db5c5e4b1',
    scale: 2,
    crop: [0, 0, 403, 624],
    scenario: 'post-call copied confirmation with 1500 ms reset contract',
  },
  {
    kind: 'screenshot',
    sourceId: 'UX-010',
    screenshotId: 'S10',
    canonicalEvidenceId: 'S10',
    stateId: 'JNY-002:error',
    variantId: 'dl',
    mode: 'post-call',
    screenshotPath: '.ccwidgets/postcall_summary_error/postcall_summary_error.png',
    sceneGraphPath: '.ccwidgets/postcall_summary_error/figma_target_5669_264979_compact.json',
    textContentPath: '.ccwidgets/postcall_summary_error/figma_target_5669_264979_text.json',
    screenshotSha256: '6d54cafe81f3693a16017e19adff9aaaf4a1adbae67b779a3f49d6c1fda15ff5',
    scale: 2,
    crop: [0, 0, 443, 621],
    acceptanceOverride: 'requirement-availability-override',
    scenario:
      'terminal generation error; enabled Complete Wrap-Up intentionally differs from the target; measured diff is diagnostic, not automatic approval',
  },
] as const satisfies readonly AISummaryVisualCase[];

export const AI_SUMMARY_VISUAL_CASE_REGISTRY: readonly AISummaryVisualCase[] = AI_SUMMARY_VISUAL_CASES;

export const getAISummaryVisualArgs = (visualCase: AISummaryVisualCase): AISummaryVisualArgs => {
  switch (visualCase.sourceId) {
    case 'UX-001':
      if (visualCase.screenshotId !== 'S01') throw new Error('UX-001 must be bound to S01');
      return ['UX-001', 'S01'];
    case 'UX-002':
      if (visualCase.screenshotId !== 'S02') throw new Error('UX-002 must be bound to S02');
      return ['UX-002', 'S02'];
    case 'UX-003':
      if (visualCase.screenshotId !== 'S03') throw new Error('UX-003 must be bound to S03');
      return ['UX-003', 'S03'];
    case 'UX-004':
      if (visualCase.screenshotId !== 'S04') throw new Error('UX-004 must be bound to S04');
      return ['UX-004', 'S04'];
    case 'UX-005':
      if (visualCase.screenshotId !== 'S05') throw new Error('UX-005 must be bound to S05');
      return ['UX-005', 'S05'];
    case 'UX-006':
      if (visualCase.screenshotId !== 'S06') throw new Error('UX-006 must be bound to S06');
      return ['UX-006', 'S06'];
    case 'UX-007':
      if (visualCase.screenshotId !== 'S07-UX') throw new Error('UX-007 must be bound to S07-UX');
      return ['UX-007', 'S07-UX'];
    case 'UX-008':
      if (visualCase.screenshotId !== 'S08') throw new Error('UX-008 must be bound to S08');
      return ['UX-008', 'S08'];
    case 'UX-009':
      if (visualCase.screenshotId !== 'S09') throw new Error('UX-009 must be bound to S09');
      return ['UX-009', 'S09'];
    case 'UX-010':
      if (visualCase.screenshotId !== 'S10') throw new Error('UX-010 must be bound to S10');
      return ['UX-010', 'S10'];
  }
};

const AI_SUMMARY_STRUCTURAL_CASE_DEFINITIONS = [
  {
    kind: 'structural',
    stateId: 'receiver:adaptive-card-ready',
    mode: 'mid-call-receiver',
    scenario: 'receiver card renders as sibling to shared AISummary controls',
  },
  {
    kind: 'structural',
    stateId: 'receiver:unrenderable-card',
    mode: 'mid-call-receiver',
    scenario: 'receiver unrenderable content falls back to unavailable copy',
  },
  {
    kind: 'structural',
    stateId: 'summary:hidden-authorization',
    mode: 'host',
    scenario: 'authorization failure omits summary surfaces',
  },
  {
    kind: 'structural',
    stateId: 'summary:hidden-initialization',
    mode: 'host',
    scenario: 'initialization failure omits summary surfaces',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:omitted-consult',
    mode: 'mid-call-initiator',
    action: 'CONSULT',
    scenario: 'consult popover keeps destination renderer with summary omitted',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:omitted-transfer',
    mode: 'mid-call-initiator',
    action: 'TRANSFER',
    scenario: 'transfer popover keeps destination renderer with summary omitted',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:transfer-summary-panel',
    mode: 'mid-call-initiator',
    action: 'TRANSFER',
    messageId: 'aiSummary.midCall.transferHeading',
    productConfirmationRef:
      'D8 structural receipt: action parity with CONSULT pending product/content-owner finalization',
    scenario: 'transfer heading uses the dedicated structural-only message id',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:generating',
    mode: 'mid-call-initiator',
    extrapolatedFrom: 'S02',
    scenario: 'mid-call generating extrapolates shared loading copy from UX-002',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:editing',
    mode: 'mid-call-initiator',
    extrapolatedFrom: 'S03',
    scenario: 'mid-call editing uses SDK section order without post-call reason controls',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:like-hover',
    mode: 'mid-call-initiator',
    action: 'LIKE',
    extrapolatedFrom: 'S04',
    scenario: 'mid-call like hover waits for SDK-confirmed paint',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:like-selected',
    mode: 'mid-call-initiator',
    action: 'LIKE',
    extrapolatedFrom: 'S05',
    scenario: 'mid-call like selected is SDK-success gated',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:dislike-hover',
    mode: 'mid-call-initiator',
    action: 'DISLIKE',
    extrapolatedFrom: 'S06',
    scenario: 'mid-call dislike hover waits for SDK-confirmed paint',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:dislike-selected',
    mode: 'mid-call-initiator',
    action: 'DISLIKE',
    extrapolatedFrom: 'S07-UX',
    scenario: 'mid-call dislike selected is SDK-success gated',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:copy-hover',
    mode: 'mid-call-initiator',
    action: 'COPY',
    extrapolatedFrom: 'S08',
    scenario: 'mid-call copy hover changes only the copy affordance',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:copy-confirmed',
    mode: 'mid-call-initiator',
    action: 'COPY',
    extrapolatedFrom: 'S09',
    scenario: 'mid-call copy confirmation uses the shared 1500 ms contract',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:generation-error',
    mode: 'mid-call-initiator',
    extrapolatedFrom: 'S10',
    scenario: 'mid-call generation error uses the common UX-010 title/subcopy without Retry',
  },
  {
    kind: 'structural',
    stateId: 'initiating:unavailable',
    mode: 'mid-call-initiator',
    scenario: 'initiating incompatible success renders unavailable copy',
  },
  {
    kind: 'structural',
    stateId: 'post-call:unavailable',
    mode: 'post-call',
    scenario: 'post-call incompatible success renders unavailable copy',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:pending-consult',
    mode: 'mid-call-initiator',
    action: 'CONSULT',
    scenario: 'consult request pending keeps destination controls focusable with aria-disabled',
  },
  {
    kind: 'structural',
    stateId: 'mid-call:pending-transfer',
    mode: 'mid-call-initiator',
    action: 'TRANSFER',
    scenario: 'transfer request pending keeps destination controls focusable with aria-disabled',
  },
  {
    kind: 'structural',
    stateId: 'post-call:generation-error-completion-escape',
    mode: 'post-call',
    action: 'WRAP_UP',
    sourceId: 'UX-010',
    screenshotId: 'S10',
    scenario: 'terminal post-call generation error still enables Complete Wrap-Up as not-required',
  },
  {
    kind: 'structural',
    stateId: 'post-call:zero-match-reason-query',
    mode: 'post-call',
    messageId: 'aiSummary.postCall.noReasonMatches',
    scenario: 'zero reason matches render static non-live copy',
  },
  {
    kind: 'structural',
    stateId: 'post-call:outcome-absent',
    mode: 'post-call',
    scenario: 'omitted resolution has no Outcome row or reserved space',
  },
  {
    kind: 'structural',
    stateId: 'post-call:feedback-pending',
    mode: 'post-call',
    action: 'LIKE',
    messageId: 'aiSummary.feedback.pendingSubmission',
    scenario: 'post-call feedback paints immediately and describes pending submission',
  },
  {
    kind: 'structural',
    stateId: 'post-call:feedback-not-confirmed',
    mode: 'post-call',
    action: 'DISLIKE',
    messageId: 'aiSummary.feedback.submissionNotConfirmed',
    scenario: 'post-call response failure keeps read-only feedback description',
  },
  {
    kind: 'structural',
    stateId: 'post-call:response-submitted',
    mode: 'post-call',
    scenario: 'submitted response removes feedback description',
  },
  {
    kind: 'structural',
    stateId: 'post-call:response-failed',
    mode: 'post-call',
    scenario: 'failed response tombstone remains until matching AgentWrappedUp',
  },
  {
    kind: 'structural',
    stateId: 'post-call:legacy-ineligible',
    mode: 'post-call',
    scenario: 'ineligible wrap-up preserves legacy Select and Submit & Wrap up flow',
  },
  {
    kind: 'structural',
    stateId: 'lifecycle:interaction-hold-retains',
    mode: 'host',
    scenario: 'hold and resume retain summary state',
  },
  {
    kind: 'structural',
    stateId: 'lifecycle:transfer-ownership',
    mode: 'host',
    scenario: 'cross-agent transfer clears predecessor and starts successor counters at zero',
  },
  {
    kind: 'structural',
    stateId: 'lifecycle:conference-ownership',
    mode: 'host',
    scenario: 'conference regeneration retains prior same-agent content until replacement',
  },
] as const satisfies readonly AISummaryStructuralCaseDefinition[];

export type AISummaryVisualSourceTuple = AISummaryVisualArgs;
type AISummaryStructuralStateId = (typeof AI_SUMMARY_STRUCTURAL_CASE_DEFINITIONS)[number]['stateId'];

type AISummaryStructuralEvidenceContract = Pick<AISummaryStructuralCase, 'assertions' | 'evidenceReason'>;

const presentTestId = (testId: string, description: string): AISummaryStructuralAssertion => ({
  kind: 'testId',
  testId,
  expected: 'present',
  description,
});

const absentTestId = (testId: string, description: string): AISummaryStructuralAssertion => ({
  kind: 'testId',
  testId,
  expected: 'absent',
  description,
});

const presentRole = (
  role: Extract<AISummaryStructuralAssertion, {kind: 'role'}>['role'],
  name: string,
  description: string
): AISummaryStructuralAssertion => ({
  kind: 'role',
  role,
  name,
  expected: 'present',
  exact: true,
  description,
});

const absentRole = (
  role: Extract<AISummaryStructuralAssertion, {kind: 'role'}>['role'],
  name: string,
  description: string
): AISummaryStructuralAssertion => ({
  kind: 'role',
  role,
  name,
  expected: 'absent',
  exact: true,
  description,
});

const presentText = (text: string, description: string): AISummaryStructuralAssertion => ({
  kind: 'text',
  text,
  expected: 'present',
  description,
});

const absentText = (text: string, description: string): AISummaryStructuralAssertion => ({
  kind: 'text',
  text,
  expected: 'absent',
  description,
});

const presentSelector = (selector: string, description: string): AISummaryStructuralAssertion => ({
  kind: 'selector',
  selector,
  expected: 'present',
  description,
});

const absentSelector = (selector: string, description: string): AISummaryStructuralAssertion => ({
  kind: 'selector',
  selector,
  expected: 'absent',
  description,
});

const stateAssertion = (
  key: Extract<AISummaryStructuralAssertion, {kind: 'state'}>['key'],
  expected: string,
  description: string
): AISummaryStructuralAssertion => ({
  kind: 'state',
  key,
  expected,
  description,
});

const contract = (
  assertions: readonly AISummaryStructuralAssertion[],
  evidenceReason: AISummaryStructuralEvidenceReason = 'no-sealed-screenshot'
): AISummaryStructuralEvidenceContract => ({assertions, evidenceReason});

const NO_SUMMARY_SURFACE_ASSERTIONS = [
  absentSelector('[data-testid^="ai-summary:"]', 'No AI Summary DOM node is rendered for the hidden or omitted state.'),
  absentTestId('consult-transfer:summary', 'The consult/transfer summary container is absent.'),
  absentTestId('wrap-up-summary:body', 'The wrap-up summary body is absent.'),
] as const satisfies readonly AISummaryStructuralAssertion[];

const MID_CALL_CONTENT_ASSERTIONS = [
  presentTestId('consult-transfer:summary', 'The mid-call summary surface is rendered in the voice popover.'),
  presentTestId('ai-summary:content', 'The shared summary content renderer is present.'),
  presentRole('button', 'Copy Summary', 'The copy action is reachable for the mid-call summary.'),
] as const satisfies readonly AISummaryStructuralAssertion[];

const POST_CALL_CONTENT_ASSERTIONS = [
  presentTestId('wrap-up-summary', 'The post-call wrap-up panel is rendered.'),
  presentTestId('wrap-up-summary:body', 'The post-call summary body is rendered.'),
  presentTestId('ai-summary:content', 'The shared summary content renderer is present.'),
  presentRole('button', 'Complete Wrap-Up', 'The completion action remains reachable.'),
] as const satisfies readonly AISummaryStructuralAssertion[];

const AI_SUMMARY_STRUCTURAL_CASE_ASSERTIONS = {
  'receiver:adaptive-card-ready': contract([
    presentRole('dialog', 'Cisco AI Assistant', 'The AI Assistant panel owns the receiver summary surface.'),
    presentTestId('ai-assistant:receiver-summary', 'The receiver adaptive-card summary branch is rendered.'),
    presentText('Browser receiver summary', 'The injected receiver adaptive card text is visible after activation.'),
    absentRole('button', 'Top-level action', 'Adaptive Card submit actions are stripped from the receiver summary.'),
  ]),
  'receiver:unrenderable-card': contract([
    presentRole('dialog', 'Cisco AI Assistant', 'The AI Assistant panel owns the fallback.'),
    presentTestId('ai-summary:unavailable', 'Unsupported receiver content uses the shared unavailable state.'),
    presentText('The summary is not available', 'The receiver fallback copy is visible.'),
  ]),
  'summary:hidden-authorization': contract(NO_SUMMARY_SURFACE_ASSERTIONS),
  'summary:hidden-initialization': contract(NO_SUMMARY_SURFACE_ASSERTIONS),
  'mid-call:omitted-consult': contract([
    ...NO_SUMMARY_SURFACE_ASSERTIONS,
    presentRole('radio', 'Agent', 'The consult destination renderer remains mounted without summary DOM.'),
  ]),
  'mid-call:omitted-transfer': contract([
    ...NO_SUMMARY_SURFACE_ASSERTIONS,
    presentRole('radio', 'Agent', 'The transfer destination renderer remains mounted without summary DOM.'),
  ]),
  'mid-call:transfer-summary-panel': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    presentText('Here’s a transfer summary—they’ll get a copy.', 'The transfer-specific heading is rendered.'),
  ]),
  'mid-call:generating': contract([
    presentTestId('consult-transfer:summary', 'The mid-call summary container is present while loading.'),
    presentTestId('ai-summary:generating', 'The mid-call loading state is visible.'),
  ]),
  'mid-call:editing': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    presentRole('textbox', 'Summary', 'Plain mid-call content is editable through the shared editor.'),
  ]),
  'mid-call:like-hover': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    presentText('This is helpful', 'The like affordance remains labelled for hover/focus.'),
  ]),
  'mid-call:like-selected': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    stateAssertion('responseStatus', 'mid-call-feedback-confirmed', 'Feedback selection is confirmed by transport.'),
  ]),
  'mid-call:dislike-hover': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    presentText("This isn't helpful", 'The dislike affordance remains labelled for hover/focus.'),
  ]),
  'mid-call:dislike-selected': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    stateAssertion('responseStatus', 'mid-call-feedback-confirmed', 'Dislike selection is confirmed by transport.'),
  ]),
  'mid-call:copy-hover': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    presentText('Copy Summary', 'The copy affordance remains labelled for hover/focus.'),
  ]),
  'mid-call:copy-confirmed': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    presentText('Copied', 'The copy confirmation state is visible after clipboard fulfillment.'),
    stateAssertion(
      'clipboardWrites',
      'mid-call:+1',
      'A fulfilled mid-call copy increments the clipboard counter once.'
    ),
  ]),
  'mid-call:generation-error': contract([
    presentTestId(
      'consult-transfer:summary',
      'The mid-call summary container is present for visible generation errors.'
    ),
    presentTestId('ai-summary:error', 'The shared error state is visible.'),
    absentRole('button', 'Retry', 'Mid-call generation errors do not expose a retry action.'),
  ]),
  'initiating:unavailable': contract([
    presentTestId('consult-transfer:summary', 'The initiator unavailable state stays scoped to the mid-call popover.'),
    presentTestId('ai-summary:unavailable', 'Unsupported initiator content uses unavailable copy.'),
  ]),
  'post-call:unavailable': contract([
    presentTestId('wrap-up-summary', 'The post-call wrap-up panel is rendered.'),
    presentTestId('ai-summary:unavailable', 'Unsupported post-call content uses unavailable copy.'),
  ]),
  'mid-call:pending-consult': contract([
    presentTestId('consult-transfer:summary', 'The consult pending state renders the summary container.'),
    presentTestId('ai-summary:generating', 'The pending consult request shows loading state.'),
    stateAssertion('requestCounts', 'midCall:1', 'Opening the consult panel issues exactly one mid-call request.'),
  ]),
  'mid-call:pending-transfer': contract([
    presentTestId('consult-transfer:summary', 'The transfer pending state renders the summary container.'),
    presentTestId('ai-summary:generating', 'The pending transfer request shows loading state.'),
    stateAssertion('requestCounts', 'midCall:1', 'Opening the transfer panel issues exactly one mid-call request.'),
  ]),
  'post-call:generation-error-completion-escape': contract(
    [
      presentTestId('wrap-up-summary', 'The post-call wrap-up panel is rendered for terminal generation failures.'),
      presentTestId('ai-summary:error', 'The shared post-call generation error is visible.'),
      presentText('Having trouble generating summary', 'The UX-010 source title is rendered exactly.'),
      presentText(
        'It could be a lost connection or something else. Could you check your connection or try again later?',
        'The UX-010 source subcopy is rendered exactly.'
      ),
      presentRole('button', 'Complete Wrap-Up', 'Completion remains enabled for not-required response escape.'),
      presentRole(
        'button',
        'Retry',
        'Post-call generation failures retain fresh-generation Retry, not response resend.'
      ),
      stateAssertion(
        'responseStatus',
        'post-call-generation-error-completion-enabled',
        'The committed-reason completion action is enabled for the requirement-availability override.'
      ),
    ],
    'requirement-availability-override'
  ),
  'post-call:zero-match-reason-query': contract([
    presentTestId('wrap-up-summary', 'The post-call wrap-up panel is rendered.'),
    presentText('No wrap-up reasons match your search.', 'Zero-match reason search copy is visible.'),
  ]),
  'post-call:outcome-absent': contract([
    ...POST_CALL_CONTENT_ASSERTIONS,
    absentText('Outcome', 'Absent resolution omits the Outcome label.'),
    absentSelector('[data-ai-summary-section-key="resolution"]', 'Absent resolution reserves no Outcome row.'),
    stateAssertion(
      'clipboardWrites',
      'post-call:outcome-absent-excludes-outcome',
      'Copied text excludes any Outcome line.'
    ),
  ]),
  'post-call:feedback-pending': contract([
    ...POST_CALL_CONTENT_ASSERTIONS,
    presentText('Pending submission', 'Pending feedback status is described.'),
  ]),
  'post-call:feedback-not-confirmed': contract([
    ...POST_CALL_CONTENT_ASSERTIONS,
    presentText('Submission not confirmed', 'Rejected feedback/response keeps the not-confirmed description.'),
    absentRole('button', 'Retry', 'Rejected response state has no resend/retry affordance.'),
  ]),
  'post-call:response-submitted': contract([
    ...POST_CALL_CONTENT_ASSERTIONS,
    absentText('Pending submission', 'Submitted response clears pending feedback description.'),
    absentText('Submission not confirmed', 'Submitted response clears failed feedback description.'),
  ]),
  'post-call:response-failed': contract([
    ...POST_CALL_CONTENT_ASSERTIONS,
    presentText('Submission not confirmed', 'Failed response keeps read-only content with not-confirmed status.'),
    absentRole('button', 'Retry', 'Response-failed has no manual resend affordance.'),
    stateAssertion(
      'responseStatus',
      'post-call-response-failed-no-resend',
      'The post-call response is attempted once and not retried.'
    ),
  ]),
  'post-call:legacy-ineligible': contract(
    [
      absentTestId('wrap-up-summary', 'The AI Summary wrap-up panel is absent when post-call summary is ineligible.'),
      presentTestId('call-control:wrapup-select', 'Legacy Select control remains available.'),
      presentRole('button', 'Submit wrap-up', 'Legacy Submit wrap-up action remains available.'),
    ],
    'requirement-availability-override'
  ),
  'lifecycle:interaction-hold-retains': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    stateAssertion(
      'counterTransition',
      'hold-retains-content',
      'Hold/resume retains the current summary content and counters.'
    ),
  ]),
  'lifecycle:transfer-ownership': contract([
    absentTestId('ai-summary:content', 'The successor generation does not display predecessor content.'),
    presentTestId('ai-summary:generating', 'The authenticated successor requests its own generation.'),
    stateAssertion(
      'counterTransition',
      'transfer-successor-zero',
      'Successor ownership starts with zero summary counters.'
    ),
  ]),
  'lifecycle:conference-ownership': contract([
    ...MID_CALL_CONTENT_ASSERTIONS,
    stateAssertion(
      'counterTransition',
      'conference-retains-until-replacement',
      'Conference carry-forward retains content until replacement arrives.'
    ),
  ]),
} as const satisfies Record<AISummaryStructuralStateId, AISummaryStructuralEvidenceContract>;

export const AI_SUMMARY_STRUCTURAL_CASES: readonly AISummaryStructuralCase[] =
  AI_SUMMARY_STRUCTURAL_CASE_DEFINITIONS.map((entry) => ({
    ...entry,
    ...AI_SUMMARY_STRUCTURAL_CASE_ASSERTIONS[entry.stateId],
  }));

export const AI_SUMMARY_STRUCTURAL_CASE_REGISTRY: readonly AISummaryStructuralCase[] = AI_SUMMARY_STRUCTURAL_CASES;

export const getVisualCase = (sourceId: UXSourceId, screenshotId: UXScreenshotId): AISummaryVisualCase => {
  const visualCase = AI_SUMMARY_VISUAL_CASES.find(
    (entry) => entry.sourceId === sourceId && entry.screenshotId === screenshotId
  );
  if (!visualCase) {
    throw new Error(`Unknown AI Summary visual tuple: ${sourceId}/${screenshotId}`);
  }
  return visualCase;
};

export const resolveAISummaryVisualEvidenceIdentity = (
  visualCase: AISummaryVisualCase
): AISummaryResolvedVisualEvidenceIdentity => {
  const declared = {
    sourceId: visualCase.sourceId,
    screenshotId: visualCase.screenshotId,
    variantId: visualCase.variantId,
    registryKey: `${visualCase.sourceId}/${visualCase.screenshotId}`,
    sha256: visualCase.screenshotSha256,
  };
  const alias = visualCase.declaredToCanonicalAlias;

  if (visualCase.sourceId !== 'UX-007') {
    if (alias) {
      throw new Error(`Only UX-007 may declare a canonical evidence alias: ${visualCase.sourceId}`);
    }
    if (visualCase.canonicalEvidenceId !== visualCase.screenshotId) {
      throw new Error(`Non-UX-007 visual case must not remap evidence: ${visualCase.sourceId}`);
    }
    if (visualCase.variantId !== 'dl') {
      throw new Error(`Non-UX-007 visual case must keep the dl variant: ${visualCase.sourceId}`);
    }
    return {
      declared,
      canonical: {
        evidenceId: visualCase.sourceId,
        variantId: visualCase.screenshotId,
        registryKey: declared.registryKey,
        sha256: visualCase.screenshotSha256,
      },
      registryKey: declared.registryKey,
      scenarioId: declared.registryKey,
      renderPath: [visualCase.sourceId, visualCase.screenshotId],
    };
  }

  if (!alias) {
    throw new Error('UX-007 must declare the S07-UX/desktop-light to S07/dl evidence alias');
  }
  if (
    alias.declared.sourceId !== 'UX-007' ||
    alias.declared.screenshotId !== 'S07-UX' ||
    alias.declared.variantId !== 'desktop-light' ||
    alias.canonical.evidenceId !== 'S07' ||
    alias.canonical.variantId !== 'dl'
  ) {
    throw new Error('UX-007 evidence alias must map exactly S07-UX/desktop-light to S07/dl');
  }
  if (visualCase.screenshotId !== alias.declared.screenshotId || visualCase.variantId !== alias.declared.variantId) {
    throw new Error('UX-007 declared visual tuple disagrees with its evidence alias');
  }
  if (visualCase.canonicalEvidenceId !== alias.canonical.evidenceId) {
    throw new Error('UX-007 canonical evidence id disagrees with its evidence alias');
  }
  if (visualCase.screenshotSha256 !== alias.sha256) {
    throw new Error('UX-007 declared-to-canonical alias hash disagrees with the sealed screenshot hash');
  }

  const registryKey = `${alias.canonical.evidenceId}/${alias.canonical.variantId}`;
  return {
    declared,
    canonical: {
      evidenceId: alias.canonical.evidenceId,
      variantId: alias.canonical.variantId,
      registryKey,
      sha256: alias.sha256,
    },
    registryKey,
    scenarioId: registryKey,
    renderPath: [alias.canonical.evidenceId, alias.canonical.variantId],
    declaredToCanonicalAlias: alias,
  };
};

export const assertAISummaryVisualRegistry = (): void => {
  if (!AI_SUMMARY_VISUAL_FONT_MANIFEST.closed || AI_SUMMARY_VISUAL_FONT_MANIFEST.fonts.length !== 1) {
    throw new Error('AI Summary visual font manifest must be a closed one-font Inter manifest');
  }
  const fontKeys = new Set<string>();
  const fonts: AISummaryVisualFontManifest['fonts'] = AI_SUMMARY_VISUAL_FONT_MANIFEST.fonts;
  for (const font of fonts) {
    const key = `${font.family}:${font.style}:${font.weight}:${font.emittedUrlPath}`;
    if (fontKeys.has(key)) {
      throw new Error(`AI Summary visual font manifest contains a duplicate font face: ${key}`);
    }
    fontKeys.add(key);
    if (
      font.family !== 'Inter' ||
      font.sourcePackagePath !== 'node_modules/@momentum-ui/core/fonts/Inter.var.woff2' ||
      font.emittedUrlPath !== '/fonts/Inter.var.woff2' ||
      !/^[a-f0-9]{64}$/.test(font.sha256) ||
      font.requiredFaces.length === 0 ||
      font.sampleGlyphs.length === 0
    ) {
      throw new Error(`AI Summary visual font manifest is not bound to the installed Inter variable font: ${key}`);
    }
  }
  const screenshotKeys = new Set(
    AI_SUMMARY_VISUAL_CASE_REGISTRY.map((entry) => `${entry.sourceId}:${entry.screenshotId}`)
  );
  if (screenshotKeys.size !== AI_SUMMARY_VISUAL_CASE_REGISTRY.length) {
    throw new Error('AI Summary visual registry contains duplicate screenshot tuples');
  }
  const canonicalKeys = new Set<string>();
  for (const visualCase of AI_SUMMARY_VISUAL_CASE_REGISTRY) {
    const evidenceIdentity = resolveAISummaryVisualEvidenceIdentity(visualCase);
    if (canonicalKeys.has(evidenceIdentity.registryKey)) {
      throw new Error(`AI Summary visual registry contains duplicate canonical key ${evidenceIdentity.registryKey}`);
    }
    canonicalKeys.add(evidenceIdentity.registryKey);
  }
  const structuralKeys = new Set(
    AI_SUMMARY_STRUCTURAL_CASE_REGISTRY.map((entry) => `${entry.stateId}:${entry.mode}:${entry.action ?? ''}`)
  );
  if (structuralKeys.size !== AI_SUMMARY_STRUCTURAL_CASE_REGISTRY.length) {
    throw new Error('AI Summary structural registry contains duplicate tuples');
  }
  for (const sourceId of Object.keys(UX_SOURCE_TO_SCREENSHOT) as UXSourceId[]) {
    const screenshotId = UX_SOURCE_TO_SCREENSHOT[sourceId];
    if (!screenshotKeys.has(`${sourceId}:${screenshotId}`)) {
      throw new Error(`AI Summary visual registry is missing ${sourceId}/${screenshotId}`);
    }
  }
  if (
    !AI_SUMMARY_STRUCTURAL_CASE_REGISTRY.some(
      (entry) => entry.stateId === 'post-call:generation-error-completion-escape'
    )
  ) {
    throw new Error('AI Summary structural registry is missing the UX-010 completion escape');
  }
  for (const structuralCase of AI_SUMMARY_STRUCTURAL_CASE_REGISTRY) {
    if (!structuralCase.evidenceReason) {
      throw new Error(`AI Summary structural registry is missing an evidence reason for ${structuralCase.stateId}`);
    }
    if (structuralCase.assertions.length === 0) {
      throw new Error(`AI Summary structural registry is missing DOM assertions for ${structuralCase.stateId}`);
    }
  }
};
