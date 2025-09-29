import React, {useState} from 'react';
import './consult-transfer-dial-number.scss';
import {ButtonCircle} from '@momentum-ui/react-collaboration';
import {Icon, Input} from '@momentum-design/components/dist/react';
import {ConsultTransferDialNumberComponentProps} from '../../task.types';
import {handleButtonPress, onInputDialNumber} from '../call-control.utils';

const DialNumberUI: React.FC<ConsultTransferDialNumberComponentProps> = (props) => {
  const {buttonIcon, onButtonPress, logger} = props;

  const [value, setValue] = useState('');
  return (
    <div className="consult-transfer-dial-number-container">
      <Input
        id="consult-transfer-dial-number-input"
        data-testid="consult-transfer-dial-number-input"
        value={value}
        onInput={(e) => onInputDialNumber(e, setValue)}
        placeholder="Enter Dial Number"
        className="consult-transfer-dial-number-input"
      />
      <ButtonCircle
        onPress={() => handleButtonPress(logger, onButtonPress, value)}
        size={28}
        color="join"
        className="consult-transfer-dial-number-btn"
        data-testid="dial-number-btn"
      >
        <Icon name={buttonIcon} />
      </ButtonCircle>
    </div>
  );
};

export default DialNumberUI;
