import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {withMetrics} from '@webex/cc-ui-logging';
import {Input, Button, Icon, Tab, TabList, Avatar, Spinner} from '@momentum-design/components/dist/react';
import {AddressBookEntry} from '@webex/contact-center';
// Migrate from @momentum-ui/react-collaboration to @momentum-design/components
// Currently using SelectNext for controlled selection behavior with proper onSelectionChange and onOpenChange support
// bug ticket: https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6990
import {SelectNext} from '@momentum-ui/react-collaboration';
import {Item} from '@react-stately/collections';

import {OutdialAniEntry, OutdialCallComponentProps} from '../task.types';
import {OutdialStrings, KEY_LIST} from './constants';
import {DEFAULT_PAGE_SIZE} from '../constants';
import {createInitials, debounce} from '../CallControl/CallControlCustom/call-control-custom.utils';
import {useIntersectionObserver} from '../../../hooks';

import './outdial-call.style.scss';

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
  const {
    logger,
    startOutdial,
    getOutdialANIEntries,
    isTelephonyTaskActive,
    getAddressBookEntries,
    isAddressBookEnabled = true,
  } = props;

  const TABS = {
    DIAL_PAD: 'dial_pad',
    ADDRESS_BOOK: 'address_book',
  };

  // State Hooks
  const [selectedTab, setSelectedTab] = useState(TABS.DIAL_PAD);
  const [destination, setDestination] = useState('');
  const [isValidNumber, setIsValidNumber] = useState('');
  const [selectedANI, setSelectedANI] = useState(undefined);
  const [addressBookLoading, setAddressBookLoading] = useState(false);
  const [addressBookPage, setAddressBookPage] = useState(0);
  const [selectedAddressBookEntry, setSelectedAddressBookEntry] = useState<string | null>(null);
  const [addressBookSearch, setAddressBookSearch] = useState('');
  const [addressBookEntries, setAddressBookEntries] = useState<AddressBookEntry[]>([]);
  const [outdialANIList, setOutdialANIList] = useState<OutdialAniEntry[]>([]);
  const [hasMoreAddressBookEntries, setHasMoreAddressBookEntries] = useState(true);
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

  const fetchAddressBookEntries = async (page = 0, search = '') => {
    try {
      const result = await getAddressBookEntries({page, pageSize: DEFAULT_PAGE_SIZE, search});

      logger?.log(`CC-Widgets: Task: Address book entries fetched: ${result.data.length}`, {
        module: 'OutdialCallComponent',
        method: 'fetchAddressBookEntries',
      });

      setAddressBookEntries((prevEntries) => [...prevEntries, ...result.data]);

      // Check if there are more entries to load
      if (result.data.length < DEFAULT_PAGE_SIZE) {
        setHasMoreAddressBookEntries(false);
      } else {
        setHasMoreAddressBookEntries(true);
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error fetching address book entries: ${error.toString()}`, {
        module: 'OutdialCallComponent',
        method: 'fetchAddressBookEntries',
      });
      setAddressBookEntries([]);
      setHasMoreAddressBookEntries(false);
    }
  };

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

  const handleAddressBookTabClick = async () => {
    setDestination('');
    setSelectedTab(TABS.ADDRESS_BOOK);
    if (addressBookEntries.length === 0) {
      setAddressBookLoading(true);
      await fetchAddressBookEntries();
      setAddressBookLoading(false);
    }
  };

  const handleDiapadTabClick = () => {
    setSelectedAddressBookEntry(null);
    // Don't clear destination - preserve selected address book entry number
    setSelectedTab(TABS.DIAL_PAD);
  };

  const handleAddressBookSearchChange = debounce(async (e: unknown) => {
    (e as React.ChangeEvent<HTMLInputElement>).preventDefault();
    const inputValue = (e as React.ChangeEvent<HTMLInputElement>).target.value;
    setAddressBookEntries([]);
    setAddressBookSearch(inputValue);
    setAddressBookLoading(true);
    setAddressBookPage(0);

    try {
      await fetchAddressBookEntries(0, inputValue);
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error fetching address book entries: ${error}`, {
        module: 'OutdialCallComponent',
        method: 'handleAddressBookSearchChange',
      });
    } finally {
      setAddressBookLoading(false);
    }
  }, 500);

  const handleAddressBookEntryClick = (number: string, id: string) => {
    setSelectedAddressBookEntry(id);
    setDestination(number);
    validateOutboundNumber(number);
  };

  // Infinite scroll: Load more entries when scrolling to bottom
  const loadMoreAddressBookEntries = useCallback(async () => {
    if (addressBookLoading || !hasMoreAddressBookEntries) return;

    setAddressBookLoading(true);
    const nextPage = addressBookPage + 1;
    setAddressBookPage(nextPage);

    try {
      await fetchAddressBookEntries(nextPage, addressBookSearch);
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error loading more address book entries: ${error}`, {
        module: 'OutdialCallComponent',
        method: 'loadMoreAddressBookEntries',
      });
    } finally {
      setAddressBookLoading(false);
    }
  }, [addressBookLoading, hasMoreAddressBookEntries, addressBookPage, addressBookSearch]);

  // Set up IntersectionObserver for infinite scroll
  const observerTarget = useIntersectionObserver({
    onIntersect: loadMoreAddressBookEntries,
    enabled: hasMoreAddressBookEntries && !addressBookLoading,
    options: {threshold: 1.0},
  });

  const renderAddressBook = () => {
    return (
      <section className="address-book" data-testid="outdial-address-book-container">
        <Input
          className="address-book-search-input"
          id="outdial-address-book-search-input"
          name="outdial-address-book-search-input"
          data-testid="outdial-address-book-search-input"
          placeholder={OutdialStrings.ADDRESS_BOOK_SEARCH_PLACEHOLDER}
          value={addressBookSearch}
          onInput={handleAddressBookSearchChange}
        />

        <ul className="address-book-entries">
          {addressBookEntries.length > 0 ? (
            <>
              {addressBookEntries.map((entry: AddressBookEntry) => (
                <li
                  key={entry.id}
                  className={`address-book-entry ${selectedAddressBookEntry === entry.id ? 'selected' : ''}`}
                  onClick={() => handleAddressBookEntryClick(entry.number, entry.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${entry.name}`}
                  onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleAddressBookEntryClick(entry.number, entry.id);
                    }
                  }}
                >
                  <Avatar initials={createInitials(entry.name)} />
                  <div>
                    <p>{entry.name}</p>
                    <p>{entry.number}</p>
                  </div>
                </li>
              ))}
              {/* Sentinel element for infinite scroll */}
              {hasMoreAddressBookEntries && (
                <div ref={observerTarget} className="address-book-observer">
                  {addressBookLoading && (
                    <div className="address-book-loading-container">
                      <Spinner variant="button" size="small" />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : addressBookLoading ? (
            <div className="address-book-loading-container">
              <Spinner variant="button" />
            </div>
          ) : (
            <p>No address book entries found.</p>
          )}
        </ul>
      </section>
    );
  };

  const renderDiapad = () => {
    return (
      <section className="keypad" data-testid="outdial-call-container">
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
      </section>
    );
  };

  return (
    <article className={`outdial-container ${isAddressBookEnabled ? 'height-28-5rem' : ''}`}>
      {isAddressBookEnabled && (
        <>
          <TabList activeTabId={selectedTab} dataAriaLabel="Outdial call tabs" className="tab-list">
            <Tab
              iconName="contact-card-bold"
              tabId={TABS.ADDRESS_BOOK}
              aria-controls={TABS.ADDRESS_BOOK}
              variant="glass"
              onClick={handleAddressBookTabClick}
            ></Tab>

            <Tab
              iconName="dialpad-bold"
              tabId={TABS.DIAL_PAD}
              aria-controls={TABS.DIAL_PAD}
              variant="glass"
              onClick={handleDiapadTabClick}
            ></Tab>
          </TabList>

          {selectedTab === TABS.ADDRESS_BOOK && (
            <div
              id={TABS.ADDRESS_BOOK}
              role="tabpanel"
              aria-labelledby={TABS.ADDRESS_BOOK}
              className="address-book-container"
            >
              {renderAddressBook()}
            </div>
          )}
          {selectedTab === TABS.DIAL_PAD && (
            <div id={TABS.DIAL_PAD} role="tabpanel" aria-labelledby={TABS.DIAL_PAD} className="keypad">
              {renderDiapad()}
            </div>
          )}
        </>
      )}

      {!isAddressBookEnabled && renderDiapad()}

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
