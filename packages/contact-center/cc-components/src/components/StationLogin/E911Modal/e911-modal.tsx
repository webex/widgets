import React, {useRef, useEffect, useState} from 'react';
import {Button, Text, Icon, Checkbox} from '@momentum-design/components/dist/react';
import {E911ModalProps} from './e911-modal.types';
import {E911ModalLabels} from './e911-modal.constants';
import './e911-modal.style.scss';

const E911Modal: React.FC<E911ModalProps> = ({isOpen, onSaveAndContinue, onCancel}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleCancel = () => {
    setIsChecked(false);
    onCancel();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      setIsChecked(false);
    }

    const handleNativeCancel = (event: Event) => {
      event.preventDefault();
      handleCancel();
    };

    dialog.addEventListener('cancel', handleNativeCancel);

    return () => {
      dialog.removeEventListener('cancel', handleNativeCancel);
    };
  }, [isOpen, onCancel]);

  const handleSaveAndContinue = () => {
    if (isChecked) {
      onSaveAndContinue();
    }
  };

  return (
    <dialog ref={dialogRef} className="e911-modal" data-testid="e911-modal">
      <div className="e911-modal-content">
        <div className="e911-modal-header">
          <Text tagname="h2" type="body-large-bold" className="e911-modal-title">
            {E911ModalLabels.TITLE}
          </Text>
          <Button
            size={32}
            variant="tertiary"
            color="default"
            prefix-icon="cancel-bold"
            type="button"
            role="button"
            aria-label="Close"
            onClick={handleCancel}
            className="e911-close-button"
            data-testid="e911-close-button"
          />
        </div>

        <div className="e911-warning-box">
          <div className="e911-warning-title">
            <Icon name="warning-filled" size={1} />
            <Text tagname="span" type="body-midsize-bold">
              {E911ModalLabels.WARNING_TITLE}
            </Text>
          </div>
          <Text tagname="p" type="body-midsize-regular" className="e911-warning-message">
            {E911ModalLabels.WARNING_MESSAGE}
          </Text>
          <a href="#" className="e911-help-link" data-testid="e911-help-link">
            {E911ModalLabels.HELP_LINK_TEXT}
          </a>
        </div>

        <div className="e911-dialing-section">
          <Text tagname="h3" type="body-midsize-bold" className="e911-dialing-title">
            {E911ModalLabels.DIALING_TITLE}
          </Text>
          <Text tagname="p" type="body-midsize-regular" className="e911-dialing-message">
            {E911ModalLabels.DIALING_MESSAGE}
          </Text>
        </div>

        <div className="e911-checkbox-container">
          <Checkbox
            data-testid="e911-checkbox"
            checked={isChecked}
            // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
            onchange={handleCheckboxChange}
            label={E911ModalLabels.CHECKBOX_LABEL}
          />
        </div>

        <div className="e911-modal-footer">
          <Button variant="secondary" onClick={handleCancel} data-testid="e911-cancel-button" className="white-button">
            {E911ModalLabels.CANCEL}
          </Button>
          <Button onClick={handleSaveAndContinue} disabled={!isChecked} data-testid="e911-save-button">
            {E911ModalLabels.SAVE_AND_CONTINUE}
          </Button>
        </div>
      </div>
    </dialog>
  );
};

export default E911Modal;
