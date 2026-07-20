import React, {useEffect, useState} from 'react';
import {Button, Text, Icon, Checkbox, Dialog} from '@momentum-design/components/dist/react';
import {E911ModalProps} from './e911-modal.types';
import {E911ModalLabels} from './e911-modal.constants';
import './e911-modal.style.scss';

const E911Modal: React.FC<E911ModalProps> = ({isOpen, onSaveAndContinue, onCancel}) => {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsChecked(false);
    }
  }, [isOpen]);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleCancel = () => {
    setIsChecked(false);
    onCancel();
  };

  const handleSaveAndContinue = () => {
    if (isChecked) {
      onSaveAndContinue();
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
      </div>

      <Button slot="footer-button-secondary" onClick={handleCancel} data-testid="e911-cancel-button">
        {E911ModalLabels.CANCEL}
      </Button>
      <Button
        slot="footer-button-primary"
        onClick={handleSaveAndContinue}
        disabled={!isChecked}
        data-testid="e911-save-button"
      >
        {E911ModalLabels.SAVE_AND_CONTINUE}
      </Button>
    </Dialog>
  );
};

export default E911Modal;
