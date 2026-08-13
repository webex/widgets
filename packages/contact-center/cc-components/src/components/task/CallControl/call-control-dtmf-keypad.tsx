import React from 'react';
import {Button} from '@momentum-design/components/dist/react';
import {KEY_LIST} from '../OutdialCall/constants';
import type {ILogger} from '@webex/cc-store';

export type CallControlDtmfKeypadProps = {
  onDigitPress: (digit: string) => void;
  logger?: ILogger;
};

/**
 * In-call DTMF keypad for wxApp telephony sessions (Extension login).
 * Each key press sends a single tone via SDK transmitDtmfOnWebex().
 */
const CallControlDtmfKeypad: React.FunctionComponent<CallControlDtmfKeypadProps> = ({onDigitPress, logger}) => {
  const handleDigitPress = (digit: string) => {
    logger?.info(`CC-Widgets: CallControl: DTMF digit pressed`, {
      module: 'call-control-dtmf-keypad.tsx',
      method: 'handleDigitPress',
    });
    onDigitPress(digit);
  };

  return (
    <ul className="call-control-dtmf-keys" data-testid="call-control-keypad-keys">
      {KEY_LIST.map((key) => (
        <li key={key}>
          <Button className="call-control-dtmf-key" onClick={() => handleDigitPress(key)} aria-label={`DTMF ${key}`}>
            {key}
          </Button>
        </li>
      ))}
    </ul>
  );
};

export default CallControlDtmfKeypad;
