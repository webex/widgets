// Outbound Dial Labels and/or Strings
export const OutdialStrings = {
  ANI_SELECT_LABEL: 'Outdial ANI',
  ANI_SELECT_PLACEHOLDER: 'Enter Outdial ANI',
  CALL_BUTTON_ARIA_LABEL: 'Start Outdial Call',
  DN_PLACEHOLDER: 'Enter number to dial',
  INCORRECT_DN_FORMAT: 'Incorrect format.',
  OUTDIAL_CALL: 'Outdial Call',
  ADDRESS_BOOK_SEARCH_PLACEHOLDER: 'Search by Name/Number',
  ADDRESS_BOOK_NO_RESULTS: 'No address book entries found.',
  TAB_ADDRESS_BOOK: 'Address Book',
  TAB_DIALPAD: 'Dialpad',
};

// Utility Constants
export const DTMF_KEYPAD_PLACEHOLDER = 'Enter the number';

/** Dialpad key metadata — mirrors Agent Desktop DIALPAD_BUTTONS_ARRAY (visual labels only). */
export const DIALPAD_BUTTONS = [
  {val: '1', label: ''},
  {val: '2', label: 'ABC'},
  {val: '3', label: 'DEF'},
  {val: '4', label: 'GHI'},
  {val: '5', label: 'JKL'},
  {val: '6', label: 'MNO'},
  {val: '7', label: 'PQRS'},
  {val: '8', label: 'TUV'},
  {val: '9', label: 'WXYZ'},
  {val: '*', label: ''},
  {val: '0', label: '+'},
  {val: '#', label: ''},
] as const;

export const KEY_LIST = DIALPAD_BUTTONS.map(({val}) => val);
export const TABS = {
  DIAL_PAD: 'dial_pad',
  ADDRESS_BOOK: 'address_book',
};
