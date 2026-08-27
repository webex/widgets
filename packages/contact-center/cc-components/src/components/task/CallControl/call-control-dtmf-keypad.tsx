import React, {useEffect, useRef, useState} from 'react';
import {Button, Input, Spinner} from '@momentum-design/components/dist/react';
import {DIALPAD_BUTTONS, DTMF_KEYPAD_PLACEHOLDER} from '../OutdialCall/constants';
import type {ILogger} from '@webex/cc-store';

const DTMF_DIGIT_PATTERN = /^[0-9*#]$/;
const DTMF_INPUT_SANITIZE = /[^0-9*#]/g;

export type CallControlDtmfKeypadProps = {
  onDigitPress: (digit: string) => void | Promise<void>;
  logger?: ILogger;
  disabled?: boolean;
};

/**
 * In-call DTMF keypad for wxApp telephony sessions (Extension login).
 * Each key press sends a single tone via SDK task.transmitDtmf().
 */
const CallControlDtmfKeypad: React.FunctionComponent<CallControlDtmfKeypadProps> = ({
  onDigitPress,
  logger,
  disabled = false,
}) => {
  const [dialNumber, setDialNumber] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const transmissionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const transmissionGenerationRef = useRef(0);

  useEffect(() => {
    return () => {
      transmissionGenerationRef.current += 1;
    };
  }, []);

  const transmitDigit = (digit: string) => {
    if (disabled) return;

    setDialNumber((prev) => prev + digit);
    logger?.info(`CC-Widgets: CallControl: DTMF digit pressed`, {
      module: 'call-control-dtmf-keypad.tsx',
      method: 'transmitDigit',
    });

    const generation = transmissionGenerationRef.current;
    setPendingCount((count) => count + 1);
    transmissionQueueRef.current = transmissionQueueRef.current
      .then(async () => {
        if (generation !== transmissionGenerationRef.current) {
          return;
        }
        await onDigitPress(digit);
      })
      .catch(() => undefined)
      .finally(() => {
        if (generation !== transmissionGenerationRef.current) {
          return;
        }
        setPendingCount((count) => Math.max(0, count - 1));
      });
  };

  const handleInputChange = (e: unknown) => {
    const inputValue = (e as React.ChangeEvent<HTMLInputElement>).target.value;
    setDialNumber(inputValue.replace(DTMF_INPUT_SANITIZE, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      return;
    }
    if (DTMF_DIGIT_PATTERN.test(e.key)) {
      e.preventDefault();
      transmitDigit(e.key);
    }
  };

  return (
    <div className="call-control-dtmf-keypad" data-testid="call-control-keypad">
      <div className="call-control-dtmf-input-wrapper">
        <Input
          className="call-control-dtmf-input"
          id="call-control-dtmf-input"
          name="call-control-dtmf-input"
          data-testid="call-control-keypad-input"
          placeholder={DTMF_KEYPAD_PLACEHOLDER}
          value={dialNumber}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label={DTMF_KEYPAD_PLACEHOLDER}
          disabled={disabled}
        />
        {pendingCount > 0 && (
          <Spinner className="call-control-dtmf-spinner" size="small" data-testid="call-control-keypad-spinner" />
        )}
      </div>
      <ul className="call-control-dtmf-keys" data-testid="call-control-keypad-keys">
        {DIALPAD_BUTTONS.map(({val, label}) => (
          <li key={val}>
            <Button
              className="call-control-dtmf-key"
              onClick={() => transmitDigit(val)}
              aria-label={`DTMF ${val}`}
              disabled={disabled}
            >
              <span className="call-control-dtmf-key-content">
                <span className="call-control-dtmf-key-digit">{val}</span>
                {label ? <span className="call-control-dtmf-key-label">{label}</span> : null}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CallControlDtmfKeypad;
