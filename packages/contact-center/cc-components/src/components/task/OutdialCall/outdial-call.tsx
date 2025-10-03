import React, {useState} from 'react';
import {OutdialCallComponentProps} from '../task.types';
import './outdial-call.style.scss';
import {withMetrics} from '@webex/cc-ui-logging';
import {Input, Button, Option, Select, Tab} from '@momentum-design/components/dist/react';
import {OutdialStrings, KEY_LIST} from './constants';

/**
 * @interface OutdialANIEntry
 * Interface representing an ANI (Automatic Number Identification) entry returned by the
 * List Outdial ANI Entries API call.
 *
 * @property {string} organizationId - The organization ID the ANI is associated with.
 * @property {string} id - ID of this contact center ANI entry.
 * @property {number} version - The version number of the ANI entry.
 * @property {string} name - The name assigned to the ANI entry.
 * @property {string} number - The phone number associated with the ANI entry.
 * @property {number} createdTime - The timestamp(in epoch millis) when the ANI entry was created.
 * @property {number} lastUpdatedTime - The timestamp(in epoch millis) when the ANI entry was last updated.
 */
interface OutdialANIEntry {
  organizationId?: string;
  id?: string;
  version?: number;
  name: string;
  number: string;
  createdTime?: number;
  lastUpdatedTime?: number;
}
// Note: Only 'name' and 'number' are needed in this component.

/**
 * OutdialCallComponent renders a dialpad UI for agents to initiate outbound calls.
 * It allows input of a destination number, selection of an ANI, and validates input.
 *
 * This component provides a keypad interface for entering a destination number, validates the input,
 * allows selection of an ANI (Automatic Number Identification), and triggers an outbound call action.
 *
 * @param props - Properties for the OutdialCallComponent.
 * @property startOutdial - Function to initiate the outdial call with the entered destination number.
 * @property dialNumberRegex - Optional regular expression provided by the CC Store for validating destination number format.
 */
const OutdialCallComponent: React.FunctionComponent<OutdialCallComponentProps> = (props) => {
  const {startOutdial, dialNumberRegex} = props;

  // State Hooks
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [selectedANI, setSelectedANI] = useState('');

  const outdialANIEntries: OutdialANIEntry[] = [
    {number: '+1(234)567-8910', name: 'name 1'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 3'},
    {number: '+1(019)876-5432', name: 'name 4'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
    {number: '+1(019)876-5432', name: 'name 2'},
  ];

  /**
   * updateOutboundNumber
   * @param e The input change event
   * Updates the destination state with validated input
   * If the input is invalid, sets an error message
   */
  const updateOutboundNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only valid input that is digits, #, *, and +
    const VALID_KEYPAD_CHARS = /[\d#*+]/g;
    const inputValue = e.target.value;
    const filteredValue = inputValue.match(VALID_KEYPAD_CHARS)?.join('') || '';
    setDestination(inputValue);

    // Validate the input format
    const regexForDn = new RegExp(dialNumberRegex ?? '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}');

    if (inputValue !== filteredValue || (inputValue && !regexForDn.test(inputValue))) {
      setError(OutdialStrings.INCORRECT_DN_FORMAT);
    } else {
      setError('');
    }
  };

  /**
   * handleKeyPress
   * @param value The key value pressed
   * Appends the pressed key to the destination input field
   */
  const handleKeyPress = (value: string) => {
    updateOutboundNumber({target: {value: destination + value}} as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="keypad">
      <div role="tablist" id="outdial-tablist">
        <Tab
          active={true}
          text={OutdialStrings.DIALPAD_LABEL}
          iconName={'dialpad-bold'}
          tabId="dialpad-tab"
          variant="pill"
          aria-controls="dialpad-panel"
        ></Tab>
      </div>
      <Input
        className="input"
        id="outdial-number-input"
        helpText={error}
        helpTextType={error ? 'error' : 'default'}
        placeholder={OutdialStrings.DN_PLACEHOLDER}
        value={destination}
        onChange={(e: unknown) => {
          updateOutboundNumber(e as React.ChangeEvent<HTMLInputElement>);
        }}
      />
      <div className="keys">
        {KEY_LIST.map((key) => (
          <Button key={key} className="key button" onClick={() => handleKeyPress(key)}>
            {key}
          </Button>
        ))}
      </div>
      <Select
        className="input"
        label={OutdialStrings.ANI_SELECT_LABEL}
        id="outdial-ani-option"
        name="outdial-ani-option"
        data-testid="outdial-ani-option-select"
        placeholder={OutdialStrings.ANI_SELECT_PLACEHOLDER}
        onChange={(event: CustomEvent) => {
          setSelectedANI(event.detail.value);
        }}
      >
        {outdialANIEntries.map((option: OutdialANIEntry, index: number) => {
          return (
            <Option
              selected={option.number === selectedANI}
              key={index}
              value={option.number}
              data-testid={`outdial-ani-option-${index}`}
            >
              {option.name}
            </Option>
          );
        })}
      </Select>
      <Button
        className="button"
        prefixIcon={'handset-regular'}
        onClick={() => startOutdial(destination)}
        disabled={!!error || !destination}
      />
    </div>
  );
};

const OutdialCallComponentWithMetrics = withMetrics(OutdialCallComponent, 'OutdialCall');
export default OutdialCallComponentWithMetrics;
