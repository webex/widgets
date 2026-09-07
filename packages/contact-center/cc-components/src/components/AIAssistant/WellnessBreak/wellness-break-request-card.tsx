import React, {useState} from 'react';
import {Button, Text, Tooltip} from '@momentum-design/components/dist/react';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import type {WellnessBreakRequestCardProps} from '../ai-assistant.types';

const SUGGESTION_COPY = "Looks like it's a busy day. Here's how I can help you stay focussed and on top of your game";
const SUGGESTION_TOOLTIP_FALLBACK =
  'This break is pre-approved by your organization for your well-being. You deserve it.';
let requestButtonSequence = 0;

const NOTICE_COPY = {
  declined:
    "It's great to see your dedication. But remember, taking breaks can boost your productivity and your health.",
  'not-allowed':
    "I'm sorry, you've reached your well-being break limit today. Continue with your tasks, but remember to take care of yourself.",
  'no-response': "Looks like you're busy. I didn't get a response, so I'll check back with you shortly.",
  completed: "I hope you're feeling recharged after that well-being break. See you in your next break!",
} as const;

const WellnessBreakRequestCard: React.FC<WellnessBreakRequestCardProps> = ({
  phase,
  notice,
  disabled,
  actionText,
  onRequest,
}) => {
  const [requestButtonId] = useState(() => {
    requestButtonSequence += 1;
    return `wellness-break-request-${requestButtonSequence}`;
  });
  const notificationText = actionText?.trim();
  const tooltip = notificationText || SUGGESTION_TOOLTIP_FALLBACK;
  const noticeText =
    notice === 'not-allowed' && notificationText ? notificationText : notice ? NOTICE_COPY[notice] : '';
  const showRequestConversation = phase === 'request-pending' || notice === 'not-allowed';

  if (!notice && phase === 'idle') {
    return (
      <section
        className="wellness-break-suggestion"
        data-testid="wellness-break:request-card"
        aria-label="Well-being break"
      >
        <div className="wellness-break-suggestion__logo" aria-hidden="true">
          <CiscoAIAssistantColorIcon size={48} />
        </div>
        <Text tagname="p" type="body-large-regular" className="wellness-break-suggestion__message">
          {SUGGESTION_COPY}
        </Text>
        <Button
          id={requestButtonId}
          type="button"
          variant="secondary"
          size={32}
          disabled={disabled}
          onClick={onRequest}
          data-testid="wellness-break:request"
        >
          Take wellbeing break
        </Button>
        <Tooltip
          triggerID={requestButtonId}
          placement="bottom"
          tooltipType="description"
          color="contrast"
          delay="0, 0"
          data-testid="wellness-break:request-tooltip"
        >
          <Text tagname="span" type="body-small-regular">
            {tooltip}
          </Text>
        </Tooltip>
      </section>
    );
  }

  if (showRequestConversation) {
    return (
      <section
        className="wellness-break-conversation"
        data-testid="wellness-break:request-card"
        aria-label="Well-being break"
      >
        <Text tagname="p" type="body-small-regular" className="wellness-break-conversation__request">
          Take a break
        </Text>
        {notice ? (
          <div className="wellness-break-conversation__response" aria-live="polite">
            <span className="wellness-break-conversation__response-icon" aria-hidden="true">
              <CiscoAIAssistantColorIcon size={20} />
            </span>
            <Text tagname="p" type="body-midsize-bold">
              {noticeText}
            </Text>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="wellness-break-card" data-testid="wellness-break:request-card" aria-label="Well-being break">
      <Text tagname="h3" type="body-midsize-bold" className="wellness-break-card__title">
        {notice === 'completed' ? 'Well-being break completed' : 'Take a moment for your well-being'}
      </Text>
      {notice ? (
        <Text tagname="p" type="body-small-regular" className="wellness-break-card__message" aria-live="polite">
          {noticeText}
        </Text>
      ) : null}
    </section>
  );
};

export default WellnessBreakRequestCard;
