// EmptyState.tsx

import React, {useState} from 'react';
import './consult-transfer-dial-number.scss';
import {ButtonCircle} from '@momentum-ui/react-collaboration';
import {Icon, Input} from '@momentum-design/components/dist/react';
import {ConsultTransferDialNumberComponentProps} from '../../task.types';

const DialNumberUI: React.FC<ConsultTransferDialNumberComponentProps> = (props) => {
  const {buttonIcon, onButtonPress, logger} = props;

  const handleButtonPress = () => {
    logger.info('Dial Number button pressed', {
      module: 'consult-transfer-dial-number.tsx',
      method: 'handleButtonPress',
    });
    onButtonPress(value);
  };

  const [value, setValue] = useState('');
  return (
    <div className="consult-transfer-dial-number-container">
      <Input
        id="dial-number-input"
        data-testid="dial-number-input"
        value={value}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        placeholder="Enter Dial Number"
        className="consult-transfer-dial-number-input"
      />
      <ButtonCircle
        onPress={handleButtonPress}
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
