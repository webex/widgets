import React, {useEffect, useState} from 'react';
import {Button, Text, Toast} from '@momentum-design/components/dist/react';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import type {WellnessBreakOfferToastProps} from '../ai-assistant.types';
import {WELLNESS_BREAK_APPROVAL_COPY} from './wellness-break-offer-card';

const WellnessBreakOfferToast: React.FC<WellnessBreakOfferToastProps> = ({
  visible,
  event,
  disabled,
  onAccept,
  onLater,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const actionText = event?.actionText?.trim() || WELLNESS_BREAK_APPROVAL_COPY;

  useEffect(() => setDismissed(false), [event]);

  if (!visible || dismissed) return null;

  const actAndDismiss = (action?: () => void) => {
    setDismissed(true);
    action?.();
  };

  return (
    <div className="wellness-break-toast-anchor" data-testid="wellness-break:offer-toast">
      <Toast
        variant="custom"
        headerText="Ready to pause and recharge?"
        closeButtonAriaLabel="Dismiss well-being break notification"
        onClose={() => actAndDismiss(onDismiss)}
      >
        <span className="wellness-break-toast__icon" slot="content-prefix" aria-hidden="true">
          <CiscoAIAssistantColorIcon size={20} />
        </span>
        <Text slot="toast-body-normal" tagname="span">
          {actionText}
        </Text>
        <Button
          slot="footer-button-secondary"
          type="button"
          variant="secondary"
          size={32}
          disabled={disabled}
          onClick={() => actAndDismiss(onLater)}
          data-testid="wellness-break:toast-later"
        >
          Later
        </Button>
        <Button
          slot="footer-button-primary"
          type="button"
          variant="primary"
          size={32}
          disabled={disabled}
          onClick={() => actAndDismiss(onAccept)}
          data-testid="wellness-break:toast-accept"
        >
          Take a break
        </Button>
      </Toast>
    </div>
  );
};

export default WellnessBreakOfferToast;
