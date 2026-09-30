import React, {useState} from 'react';
import {Button, Text, Tooltip} from '@momentum-design/components/dist/react';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import type {WellnessBreakRequestCardProps} from '../ai-assistant.types';
import {
  WELLNESS_NOTICE_COPY,
  WELLNESS_SUGGESTION_COPY,
  WELLNESS_SUGGESTION_TOOLTIP_FALLBACK,
} from './wellness-break-copy';
let requestButtonSequence = 0;

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
  const tooltip = notificationText || WELLNESS_SUGGESTION_TOOLTIP_FALLBACK;
  const noticeText =
    notice === 'not-allowed' && notificationText ? notificationText : notice ? WELLNESS_NOTICE_COPY[notice] : '';
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
          {WELLNESS_SUGGESTION_COPY}
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
