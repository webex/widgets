import type {AISummaryContent, AISummaryEditableField, AISummaryPostCallSectionKey} from '@webex/cc-store';
import {normalizeAISummaryPayload} from '../../../../packages/contact-center/store/src/ai-summary';

// Use the real adapter, not a screenshot-only read-only branch. Keys remain the
// approved post-call editable contract and labels resolve in cc-components.
export const POST_CALL_VISUAL_PAYLOAD = {
  conversationId: 'ai-summary-visual-interaction',
  sections: {
    initialContactReason:
      'Help activating a new Webex plan.\nAdditional contact reason(s): Inquiry about transferring meeting history from a previous Webex account.',
    additionalContext: 'Customer also asked about transferring meeting history.',
    keyActionsTaken: '\u2022 Guided activation via browser\n\u2022 Linked plan to correct account',
    nextSteps: '\u2022 Support team resolving sync issue (48 hrs)\n\u2022 Customer will get email + SMS once done',
  },
  resolution: 'Activation complete. Meeting history transfer pending sync fix (unsolved).',
} satisfies {
  conversationId: string;
  sections: Partial<Record<AISummaryPostCallSectionKey, string>>;
  resolution: string;
};

export const createPostCallVisualContent = (): Extract<AISummaryContent, {type: 'sections'}> => {
  const normalized = normalizeAISummaryPayload({
    raw: POST_CALL_VISUAL_PAYLOAD,
    role: 'post-call',
    expectedInteractionId: POST_CALL_VISUAL_PAYLOAD.conversationId,
  });
  if (
    normalized.kind !== 'success' ||
    normalized.content.type !== 'sections' ||
    normalized.content.sections.length !== Object.keys(POST_CALL_VISUAL_PAYLOAD.sections).length
  ) {
    throw new Error('Visual fixture does not satisfy the production post-call contract');
  }
  return normalized.content;
};

export const applyVisualSummaryEdit = (
  content: Exclude<AISummaryContent, {type: 'card'}>,
  field: AISummaryEditableField
): Exclude<AISummaryContent, {type: 'card'}> => {
  if (content.type === 'text') {
    return field.key === 'summaryText' ? {...content, summaryText: field.value} : content;
  }
  return {
    ...content,
    sections: content.sections.map((section) =>
      section.editable && section.key === field.key ? {...section, value: field.value} : section
    ),
  };
};
