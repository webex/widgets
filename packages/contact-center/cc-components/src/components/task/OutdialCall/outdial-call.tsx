import React, {useEffect, useMemo, useState} from 'react';
import {OutdialAniEntry, OutdialCallComponentProps} from '../task.types';
import './outdial-call.style.scss';
import {withMetrics} from '@webex/cc-ui-logging';
import {Input, Button, Option, Select} from '@momentum-design/components/dist/react';
import {OutdialStrings, KEY_LIST} from './constants';

/**
 * OutdialCallComponent renders a dialpad UI for agents to initiate outbound calls.
 * It allows input of a destination number, selection of an ANI, and validates input.
 *
 * This component provides a keypad interface for entering a destination number, validates the input,
 * allows selection of an ANI (Automatic Number Identification), and triggers an outbound call action.
 *
 * @param props - Properties for the OutdialCallComponent.
 * @property startOutdial - Function to initiate the outdial call with the entered destination number.
 */
const OutdialCallComponent: React.FunctionComponent<OutdialCallComponentProps> = (props) => {
  const {logger, startOutdial, getOutdialANIEntries} = props;

  // State Hooks
  const [destination, setDestination] = useState('');
  const [isValidNumber, setIsValidNumber] = useState('');
  const [selectedANI, setSelectedANI] = useState(undefined);
  const [outdialANIList, setOutdialANIList] = useState<OutdialAniEntry[]>([]);

  // Validate the input format using regex from agent desktop
  const regExForDnSpecialChars = useMemo(
    () => new RegExp('^[+1][0-9]{3,18}$|^[*#][+1][0-9*#:]{3,18}$|^[0-9*#]{3,18}$'),
    []
  );

  // useEffect and useState to allow for async fetching of outdial ANI entries
  useEffect(() => {
    // Give Select an empty list if outdial ANI entries are not provided
    const updateOutdialANIList = async () => {
      try {
        const result = await getOutdialANIEntries();
        setOutdialANIList(result);
      } catch (error) {
        logger?.error(`CC-Widgets: Task: Error fetching outdial ANI entries: ${error}`, {
          module: 'OutdialCallComponent',
          method: 'updateOutdialANIList',
        });
        setOutdialANIList([]);
      }
    };
    updateOutdialANIList();
  }, []);

  /**
   * validateOutboundNumber
   * @param value the dial number to validate
   * If the input is invalid, sets an error message on dial number input
   */
  const validateOutboundNumber = (value: string) => {
    if (value && !regExForDnSpecialChars.test(value)) {
      setIsValidNumber(OutdialStrings.INCORRECT_DN_FORMAT);
    } else {
      setIsValidNumber('');
    }
  };

  /**
   * handleOnClick
   * @param value The key value pressed
   * Appends the pressed key to the destination input field
   */
  const handleOnClick = (value: string) => {
    setDestination(destination + value);
    validateOutboundNumber(destination + value);
  };

  return (
    <article className="keypad" data-testid="outdial-call-container">
      <Input
        className="outdial-input"
        id="outdial-number-input"
        name="outdial-number-input"
        data-testid="outdial-number-input"
        helpText={isValidNumber}
        helpTextType={isValidNumber ? 'error' : 'default'}
        placeholder={OutdialStrings.DN_PLACEHOLDER}
        value={destination}
        onChange={(e: unknown) => {
          const inputValue = (e as React.ChangeEvent<HTMLInputElement>).target.value;
          setDestination(inputValue);
          validateOutboundNumber(inputValue);
        }}
      />
      <ul className="keys" data-testid="outdial-keypad-keys">
        {KEY_LIST.map((key) => (
          <li key={key}>
            <Button className="key button" onClick={() => handleOnClick(key)}>
              {key}
            </Button>
          </li>
        ))}
      </ul>
      <Select
        className="outdial-input"
        label={OutdialStrings.ANI_SELECT_LABEL}
        id="outdial-ani-option-select"
        name="outdial-ani-option-select"
        data-testid="outdial-ani-option-select"
        placeholder={OutdialStrings.ANI_SELECT_PLACEHOLDER}
        onChange={(event: CustomEvent) => {
          setSelectedANI(event.detail.value);
        }}
      >
        {outdialANIList.map((option: OutdialAniEntry, index: number) => {
          return (
            <Option
              selected={option.number === selectedANI}
              key={index}
              value={option.number}
              name={`outdial-ani-option-${index}`}
              data-testid={`outdial-ani-option-${index}`}
            >
              {option.name}
            </Option>
          );
        })}
      </Select>
      <Button
        data-testid="outdial-call-button"
        prefixIcon={'handset-regular'}
        onClick={() => startOutdial(destination, selectedANI)}
        disabled={!!isValidNumber || !destination}
        size={40}
      />
    </article>
  );
};

const OutdialCallComponentWithMetrics = withMetrics(OutdialCallComponent, 'OutdialCall');
export default OutdialCallComponentWithMetrics;
