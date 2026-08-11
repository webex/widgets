import React, {useEffect, useState} from 'react';
import {Button, Text, Icon, Checkbox, Dialog} from '@momentum-design/components/dist/react';
import {E911ModalProps} from './e911-modal.types';
import {E911ModalLabels} from './e911-modal.constants';
import './e911-modal.style.scss';

const E911Modal: React.FC<E911ModalProps> = ({isOpen, onSaveAndContinue, onCancel}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setIsChecked(false);
      setIsSaving(false);
      setSaveError('');
    }
  }, [isOpen]);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleCancel = () => {
    setIsChecked(false);
    onCancel();
  };

  const handleSaveAndContinue = async () => {
    if (!isChecked || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      await onSaveAndContinue();
    } catch {
      setSaveError(E911ModalLabels.SAVE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog visible={isOpen} headerText={E911ModalLabels.TITLE} className="e911-modal" data-testid="e911-modal">
      <div slot="dialog-body">
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

        {saveError && (
          <Text tagname="p" type="body-midsize-regular" className="e911-save-error" data-testid="e911-save-error">
            {saveError}
          </Text>
        )}
      </div>

      <Button
        slot="footer-button-secondary"
        onClick={handleCancel}
        disabled={isSaving}
        data-testid="e911-cancel-button"
      >
        {E911ModalLabels.CANCEL}
      </Button>
      <Button
        slot="footer-button-primary"
        onClick={handleSaveAndContinue}
        disabled={!isChecked || isSaving}
        data-testid="e911-save-button"
      >
        {E911ModalLabels.SAVE_AND_CONTINUE}
      </Button>
    </Dialog>
  );
};

export default E911Modal;
