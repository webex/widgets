import React from 'react';
import {Button, Text} from '@momentum-design/components/dist/react';
import type {WellnessBreakOfferCardProps} from '../ai-assistant.types';

export const WELLNESS_BREAK_APPROVAL_COPY =
  'This break is pre-approved by your organization for your well-being. You deserve it.';

const WellnessBreakOfferCard: React.FC<WellnessBreakOfferCardProps> = ({event, disabled, onAccept, onLater}) => {
  const actionText = event?.actionText?.trim() || WELLNESS_BREAK_APPROVAL_COPY;

  return (
    <section
      className="wellness-break-card"
      data-testid="wellness-break:offer-card"
      aria-label="Well-being break offer"
    >
      <Text tagname="h3" type="body-midsize-bold" className="wellness-break-card__title">
        Well-being break scheduled
      </Text>
      <Text tagname="p" type="body-small-regular" className="wellness-break-card__message">
        {actionText}
      </Text>
      <div className="wellness-break-card__actions">
        <Button
          type="button"
          variant="primary"
          size={32}
          disabled={disabled}
          onClick={onAccept}
          data-testid="wellness-break:accept"
        >
          Take a break
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={32}
          disabled={disabled}
          onClick={onLater}
          data-testid="wellness-break:later"
        >
          Later
        </Button>
      </div>
    </section>
  );
};

export default WellnessBreakOfferCard;
