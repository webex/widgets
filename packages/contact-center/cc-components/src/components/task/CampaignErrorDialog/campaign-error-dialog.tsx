import React, {useEffect, useRef} from 'react';
import {Button, Text} from '@momentum-design/components/dist/react';
import {CampaignErrorDialogProps, ERROR_TITLES, ERROR_MESSAGE} from './campaign-error-dialog.types';
import {withMetrics} from '@webex/cc-ui-logging';
import './campaign-error-dialog.style.scss';

const CampaignErrorDialog: React.FunctionComponent<CampaignErrorDialogProps> = ({errorType, isOpen, onClose}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="campaign-error-dialog"
      data-testid="campaign-error-dialog"
      onKeyDown={handleKeyDown}
      aria-labelledby="campaign-error-dialog-title"
    >
      <Text
        id="campaign-error-dialog-title"
        tagname="h2"
        type="body-large-bold"
        className="campaign-error-dialog-title"
        data-testid="campaign-error-dialog-title"
      >
        {ERROR_TITLES[errorType]}
      </Text>
      <Text
        id="campaign-error-dialog-message"
        tagname="p"
        type="body-midsize-regular"
        className="campaign-error-dialog-message"
        data-testid="campaign-error-dialog-message"
      >
        {ERROR_MESSAGE}
      </Text>
      <div className="campaign-error-dialog-actions">
        <Button onClick={onClose} data-testid="campaign-error-dialog-ok-button">
          OK
        </Button>
      </div>
    </dialog>
  );
};

const CampaignErrorDialogWithMetrics = withMetrics(CampaignErrorDialog, 'CampaignErrorDialog');
export default CampaignErrorDialogWithMetrics;
