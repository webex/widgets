import React, {useEffect, useMemo, useState} from 'react';
import {OutdialAniEntry, OutdialCallComponentProps} from '../task.types';
import './outdial-call.style.scss';
import {withMetrics} from '@webex/cc-ui-logging';
import {Input, Button, Icon} from '@momentum-design/components/dist/react';
// Migrate from @momentum-ui/react-collaboration to @momentum-design/components
// Currently using SelectNext for controlled selection behavior with proper onSelectionChange and onOpenChange support
// bug ticket: https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6990
import {SelectNext} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';
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
 * @property isTelephonyTaskActive - Boolean indicating if there's an active telephony task.
 */
const OutdialCallComponent: React.FunctionComponent<OutdialCallComponentProps> = (props) => {
  const {logger, startOutdial, getOutdialANIEntries, isTelephonyTaskActive} = props;

  // State Hooks
  const [destination, setDestination] = useState('');
  const [isValidNumber, setIsValidNumber] = useState('');
  const [selectedANI, setSelectedANI] = useState<string | undefined>(undefined);
  const [outdialANIList, setOutdialANIList] = useState<OutdialAniEntry[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

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
        onInput={(e: unknown) => {
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
      <div className="outdial-ani-select-container">
        <Icon
          className="outdial-select-arrow-icon"
          name={isSelectOpen ? 'arrow-up-bold' : 'arrow-down-bold'}
          title=""
          data-testid="select-arrow-icon"
        />

        <SelectNext
          className="outdial-input"
          label={OutdialStrings.ANI_SELECT_LABEL}
          id="outdial-ani-option-select"
          data-testid="outdial-ani-option-select"
          placeholder={OutdialStrings.ANI_SELECT_PLACEHOLDER}
          selectedKey={selectedANI || null}
          onSelectionChange={(key: React.Key) => {
            const value = key as string;
            // Set to undefined if key is 'none' or null
            const newANI = !value || value === 'none' ? undefined : value;
            setSelectedANI(newANI);
          }}
          onOpenChange={(isOpen: boolean) => setIsSelectOpen(isOpen)}
          items={[
            {id: 'none', name: OutdialStrings.ANI_SELECT_PLACEHOLDER},
            ...outdialANIList.map((ani) => ({id: ani.number, name: ani.name})),
          ]}
          direction="bottom"
          showBorder
        >
          {(item: {id: string; name: string}) => (
            <Item key={item.id} textValue={item.name} data-testid={`outdial-ani-option-${item.id}`}>
              <div className="outdial-ani-option-name">{item.name}</div>
            </Item>
          )}
        </SelectNext>
      </div>
      <Button
        data-testid="outdial-call-button"
        prefixIcon={'handset-regular'}
        className="outDialCallButton"
        onClick={() => {
          startOutdial(destination, selectedANI);
          // Clear input field after initiating the call
          setDestination('');
          setIsValidNumber('');
        }}
        disabled={!!isValidNumber || !destination || !!isTelephonyTaskActive}
        size={40}
      />
    </article>
  );
};

const OutdialCallComponentWithMetrics = withMetrics(OutdialCallComponent, 'OutdialCall');
export default OutdialCallComponentWithMetrics;
