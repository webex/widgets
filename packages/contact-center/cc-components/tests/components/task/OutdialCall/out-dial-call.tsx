import React from 'react';
import {render, fireEvent, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import OutdialCallComponent from '../../../../src/components/task/OutdialCall/outdial-call';
import {KEY_LIST} from '../../../../src/components/task/OutdialCall/constants';
import store from '@webex/cc-store';
import {mockCC} from '@webex/test-fixtures';
import {OutdialCallComponentProps} from '../../../../src/components/task/task.types';

describe('OutdialCallComponent', () => {
  let customEvent;

  // Prevent warning 'CC-Widgets: UI Metrics: No logger found'
  store.store.logger = mockCC.LoggerProxy;

  beforeEach(() => {
    // Create a custom event that mimics what the mdc-input component would fire
    customEvent = new Event('input', {bubbles: true});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const props: OutdialCallComponentProps = {
    logger: mockCC.LoggerProxy,
    startOutdial: jest.fn(),
    getOutdialANIEntries: jest.fn().mockResolvedValue([
      {name: 'name 1', number: '1'},
      {name: 'name 2', number: '2'},
    ]),
    isTelephonyTaskActive: false,
    getAddressBookEntries: jest.fn().mockResolvedValue([]),
    isAddressBookEnabled: false,
  };
  describe('renders the component correctly, should render:', () => {
    it('article container', async () => {
      render(<OutdialCallComponent {...props} />);
      const article = await screen.findByTestId('outdial-call-container');
      expect(article).toBeInTheDocument();
      expect(article).toHaveClass('outdial-container');
    });

    it('dial number input', async () => {
      render(<OutdialCallComponent {...props} />);
      const outdialNumberInput = await screen.findByTestId('outdial-number-input');
      expect(outdialNumberInput).toBeInTheDocument();
      expect(outdialNumberInput).toHaveClass('outdial-input');
      expect(outdialNumberInput).toHaveAttribute('help-text');
      expect(outdialNumberInput).toHaveAttribute('help-text-type', 'default');
      expect(outdialNumberInput).toHaveAttribute('name', 'outdial-number-input');
      expect(outdialNumberInput).toHaveValue('');
    });

    it('dial-pad keys', async () => {
      render(<OutdialCallComponent {...props} />);
      const keypadContainer = await screen.findByTestId('outdial-keypad-keys');
      const keypadKeys = within(keypadContainer).getAllByRole('button');
      expect(keypadKeys).toHaveLength(KEY_LIST.length);
      keypadKeys.forEach((button) => {
        expect(button).toHaveClass('key');
        expect(button).toHaveAttribute('color', 'default');
        expect(button).toHaveAttribute('data-btn-type', 'pill');
        expect(button).toHaveAttribute('size', '32');
        expect(button).toHaveAttribute('tabindex', '0');
        expect(button).toHaveAttribute('type', 'button');
        expect(button).toHaveAttribute('variant', 'primary');
      });
    });

    it('outdial ani option select', async () => {
      render(<OutdialCallComponent {...props} />);
      const outdialAniSelect = await screen.findByTestId('outdial-ani-option-select');
      expect(outdialAniSelect).toBeInTheDocument();
    });

    it('call button', async () => {
      render(<OutdialCallComponent {...props} />);
      const callButton = await screen.findByTestId('outdial-call-button');
      expect(callButton).toBeDisabled();
      expect(callButton).toHaveAttribute('color', 'default');
      expect(callButton).toHaveAttribute('data-btn-type', 'icon');
      expect(callButton).toHaveAttribute('prefix-icon', 'handset-regular');
      expect(callButton).toHaveAttribute('size', '40');
      expect(callButton).toHaveAttribute('tabindex', '-1');
      expect(callButton).toHaveAttribute('type', 'button');
      expect(callButton).toHaveAttribute('variant', 'primary');
    });
  });

  it('updates input value when typing directly', async () => {
    render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');

    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent);

    await waitFor(() => {
      expect(input).toHaveAttribute('value', '123');
    });
  });

  it('updates input value when clicking keypad buttons', async () => {
    render(<OutdialCallComponent {...props} />);
    const keypad = await screen.findByTestId('outdial-keypad-keys');
    const buttons = within(keypad).getAllByRole('button');
    fireEvent.click(buttons[0]); // '1'
    fireEvent.click(buttons[1]); // '2'
    fireEvent.click(buttons[2]); // '3'
    expect(await screen.findByTestId('outdial-number-input')).toHaveValue('123');
  });

  it('calls startOutdial with correct payload when clicking call button', async () => {
    render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent);

    const callButton = await screen.findByTestId('outdial-call-button');
    fireEvent.click(callButton);

    await waitFor(() => {
      expect(props.startOutdial).toHaveBeenCalledWith('123', undefined);
    });
  });

  it('allows special characters (* # +) from keypad', async () => {
    render(<OutdialCallComponent {...props} />);
    fireEvent.click(await screen.findByText('*'));
    fireEvent.click(await screen.findByText('#'));
    expect(await screen.findByTestId('outdial-number-input')).toHaveValue('*#');
  });

  it('shows error help text when invalid characters are entered', async () => {
    render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: 'abc'},
    });
    fireEvent(input, customEvent);
    await waitFor(() => expect(input).toHaveAttribute('help-text', 'Incorrect format.'));
  });

  it('does not allow invalid characters when typing', async () => {
    render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123abc'},
    });
    fireEvent(input, customEvent);
    await waitFor(() => expect(input).toHaveAttribute('help-text', 'Incorrect format.'));
  });

  it('has no ANI entry options when the entry list is empty', async () => {
    render(
      <OutdialCallComponent
        logger={props.logger}
        startOutdial={props.startOutdial}
        getOutdialANIEntries={jest.fn().mockResolvedValue([])}
        isTelephonyTaskActive={false}
        getAddressBookEntries={jest.fn().mockResolvedValue([])}
        isAddressBookEnabled={false}
      />
    );
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);

    // Should still show the placeholder option
    const placeholderOption = await screen.findByTestId('outdial-ani-option-none');
    expect(placeholderOption).toBeInTheDocument();

    // But should not show 'name 1' or 'name 2'
    expect(screen.queryByTestId('outdial-ani-option-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('outdial-ani-option-2')).not.toBeInTheDocument();
  });

  it('sets selected ani when an option is selected', async () => {
    render(<OutdialCallComponent {...props} />);
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    const option = await screen.findByTestId('outdial-ani-option-1');
    expect(option).toBeInTheDocument();
    fireEvent.click(option);
    await waitFor(() => {
      expect(option).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('does not allow empty input', async () => {
    render(<OutdialCallComponent {...props} />);
    const callButton = await screen.findByTestId('outdial-call-button');
    expect(callButton).toBeDisabled();
  });

  it('disables call button when there is an active telephony task', async () => {
    render(<OutdialCallComponent {...props} isTelephonyTaskActive={true} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent);

    const callButton = await screen.findByTestId('outdial-call-button');
    expect(callButton).toBeDisabled();
  });

  it('enables call button when there is no telephony task (digital task active)', async () => {
    render(<OutdialCallComponent {...props} isTelephonyTaskActive={false} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent);

    await waitFor(() => {
      const callButton = screen.getByTestId('outdial-call-button');
      expect(callButton).not.toBeDisabled();
    });
  });

  it('shows placeholder option to clear ANI selection', async () => {
    render(<OutdialCallComponent {...props} />);
    const select = await screen.findByTestId('outdial-ani-option-select');
    expect(select).toBeInTheDocument();
  });

  it('allows unselecting ANI by selecting placeholder option', async () => {
    const mockStartOutdial = jest.fn();
    render(<OutdialCallComponent {...props} startOutdial={mockStartOutdial} />);

    // Enter a destination
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent);

    // Initially, call should be without origin
    const callButton = await screen.findByTestId('outdial-call-button');
    fireEvent.click(callButton);

    await waitFor(() => {
      expect(mockStartOutdial).toHaveBeenCalledWith('123', undefined);
    });

    mockStartOutdial.mockClear();
  });

  it('shows arrow-down icon by default', async () => {
    render(<OutdialCallComponent {...props} />);
    const arrowIcon = await screen.findByTestId('select-arrow-icon');
    expect(arrowIcon).toBeInTheDocument();
    expect(arrowIcon).toHaveAttribute('name', 'arrow-down-bold');
  });

  it('passes origin parameter when ANI is selected', async () => {
    const mockStartOutdial = jest.fn();
    render(<OutdialCallComponent {...props} startOutdial={mockStartOutdial} />);

    // Enter a destination
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '+14698041796'},
    });
    fireEvent(input, customEvent);

    // Wait for button to update
    await waitFor(() => {
      const callButton = screen.getByTestId('outdial-call-button');
      expect(callButton).not.toBeDisabled();
    });

    // Select an ANI
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    const aniOption = await screen.findByTestId('outdial-ani-option-1');
    fireEvent.click(aniOption);

    // Make the call
    const callButton = await screen.findByTestId('outdial-call-button');
    fireEvent.click(callButton);

    await waitFor(() => {
      expect(mockStartOutdial).toHaveBeenCalledWith('+14698041796', '1');
    });
  });

  it('does not pass origin parameter when placeholder is selected', async () => {
    const mockStartOutdial = jest.fn();
    render(<OutdialCallComponent {...props} startOutdial={mockStartOutdial} />);

    // Enter a destination
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '+14698041796'},
    });
    fireEvent(input, customEvent);

    await waitFor(() => {
      const callButton = screen.getByTestId('outdial-call-button');
      expect(callButton).not.toBeDisabled();
    });

    // First select an ANI
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    const aniOption = await screen.findByTestId('outdial-ani-option-1');
    fireEvent.click(aniOption);

    // Then select the placeholder to clear
    fireEvent.click(select);
    const placeholderOption = await screen.findByTestId('outdial-ani-option-none');
    fireEvent.click(placeholderOption);

    // Make the call
    const callButton = await screen.findByTestId('outdial-call-button');
    fireEvent.click(callButton);

    await waitFor(() => {
      expect(mockStartOutdial).toHaveBeenCalledWith('+14698041796', undefined);
    });
  });

  describe('Address Book functionality', () => {
    const addressBookProps: OutdialCallComponentProps = {
      ...props,
      isAddressBookEnabled: true,
      getAddressBookEntries: jest.fn().mockResolvedValue({
        data: [
          {id: '1', name: 'John Doe', number: '+14691234567'},
          {id: '2', name: 'Jane Smith', number: '+14699876543'},
        ],
        total: 2,
      }),
    };

    // Helper function to get the tablist element (web component)
    const getTabList = async (container: HTMLElement) => {
      const tabList = container.querySelector('mdc-tablist');
      if (!tabList) {
        throw new Error('TabList not found');
      }
      return tabList;
    };

    it('does not show tabs when address book is disabled', async () => {
      const {container} = render(<OutdialCallComponent {...props} />);
      const tabList = container.querySelector('mdc-tablist');
      expect(tabList).not.toBeInTheDocument();
    });

    it('shows tabs by default when isAddressBookEnabled prop is not provided', async () => {
      const propsWithoutAddressBookFlag = {
        logger: mockCC.LoggerProxy,
        startOutdial: jest.fn(),
        getOutdialANIEntries: jest.fn().mockResolvedValue([]),
        isTelephonyTaskActive: false,
        getAddressBookEntries: jest.fn().mockResolvedValue({data: [], total: 0}),
      };
      const {container} = render(<OutdialCallComponent {...propsWithoutAddressBookFlag} />);
      const tabList = await waitFor(() => container.querySelector('mdc-tablist'));
      expect(tabList).toBeInTheDocument();
    });

    it('shows tabs when address book is enabled', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      expect(tabList).toBeInTheDocument();
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('switches to address book tab and loads entries', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0]; // First tab is address book
      fireEvent.click(addressBookTab);

      // Verify address book container is shown
      const addressBookContainer = await screen.findByTestId('outdial-address-book-container');
      expect(addressBookContainer).toBeInTheDocument();

      // Verify entries are loaded
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Verify getAddressBookEntries was called
      expect(addressBookProps.getAddressBookEntries).toHaveBeenCalled();
    });

    it('renders address book search input', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const searchInput = await screen.findByTestId('outdial-address-book-search-input');
      expect(searchInput).toBeInTheDocument();
      // Note: Web components don't always expose props as HTML attributes
    });

    it('selects an address book entry and populates destination', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      // Wait for entries to load
      const johnDoe = await screen.findByText('John Doe');
      fireEvent.click(johnDoe);

      // Switch back to dial pad to verify destination was set
      const dialPadTab = tabs[1];
      fireEvent.click(dialPadTab);

      const input = await screen.findByTestId('outdial-number-input');
      await waitFor(() => {
        expect(input).toHaveValue('+14691234567');
      });
    });

    it('allows making a call with address book selected number', async () => {
      const mockStartOutdial = jest.fn();
      const {container} = render(<OutdialCallComponent {...addressBookProps} startOutdial={mockStartOutdial} />);

      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      // Select an entry
      const janeDoe = await screen.findByText('Jane Smith');
      fireEvent.click(janeDoe);

      // Make the call
      const callButton = await screen.findByTestId('outdial-call-button');
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(mockStartOutdial).toHaveBeenCalledWith('+14699876543', undefined);
      });
    });

    it('shows empty state when no address book entries', async () => {
      const emptyProps = {
        ...addressBookProps,
        getAddressBookEntries: jest.fn().mockResolvedValue({
          data: [],
          total: 0,
        }),
      };

      const {container} = render(<OutdialCallComponent {...emptyProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('No address book entries found.')).toBeInTheDocument();
      });
    });

    it('clears destination when switching from dial pad to address book', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);

      // Enter a number on dial pad
      const input = await screen.findByTestId('outdial-number-input');
      Object.defineProperty(customEvent, 'target', {
        writable: false,
        value: {value: '123'},
      });
      fireEvent(input, customEvent);

      await waitFor(() => {
        expect(input).toHaveValue('123');
      });

      // Switch to address book
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      // Switch back to dial pad
      const dialPadTab = tabs[1];
      fireEvent.click(dialPadTab);

      // Destination should be cleared
      const inputAfter = await screen.findByTestId('outdial-number-input');
      expect(inputAfter).toHaveValue('');
    });

    it('searches address book entries', async () => {
      const mockSearch = jest.fn().mockResolvedValue({
        data: [{id: '1', name: 'John Doe', number: '+14691234567'}],
        total: 1,
      });

      const searchProps = {
        ...addressBookProps,
        getAddressBookEntries: mockSearch,
      };

      const {container} = render(<OutdialCallComponent {...searchProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const searchInput = await screen.findByTestId('outdial-address-book-search-input');

      // Create a custom event for the search input
      const searchEvent = new Event('input', {bubbles: true});
      Object.defineProperty(searchEvent, 'target', {
        writable: false,
        value: {value: 'John'},
      });

      fireEvent(searchInput, searchEvent);

      // Wait for debounced search (500ms + some buffer)
      await waitFor(
        () => {
          // First call is initial load with page: 0, pageSize: 25, search: ''
          // Second call should be search with page: 0, pageSize: 25, search: 'John'
          expect(mockSearch).toHaveBeenCalledWith({page: 0, pageSize: 25, search: 'John'});
        },
        {timeout: 1000}
      );
    });

    it('handles address book loading error gracefully', async () => {
      const errorProps = {
        ...addressBookProps,
        getAddressBookEntries: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const {container} = render(<OutdialCallComponent {...errorProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('No address book entries found.')).toBeInTheDocument();
      });
    });

    it('validates phone number from address book entry', async () => {
      const invalidPhoneProps = {
        ...addressBookProps,
        getAddressBookEntries: jest.fn().mockResolvedValue({
          data: [{id: '1', name: 'Invalid Contact', number: 'invalid'}],
          total: 1,
        }),
      };

      const {container} = render(<OutdialCallComponent {...invalidPhoneProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const invalidContact = await screen.findByText('Invalid Contact');
      fireEvent.click(invalidContact);

      // Switch to dial pad to check validation
      const dialPadTab = tabs[1];
      fireEvent.click(dialPadTab);

      const input = await screen.findByTestId('outdial-number-input');
      await waitFor(() => {
        expect(input).toHaveAttribute('help-text', 'Incorrect format.');
      });
    });

    it('applies selected class to chosen address book entry', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const johnDoe = await screen.findByText('John Doe');
      const listItem = johnDoe.closest('li');

      // Initially should not have selected class
      expect(listItem).not.toHaveClass('selected');

      fireEvent.click(johnDoe);

      // After selection should have selected class
      await waitFor(() => {
        expect(listItem).toHaveClass('selected');
      });
    });

    it('allows keyboard navigation for address book entries', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const johnDoe = await screen.findByText('John Doe');
      const listItem = johnDoe.closest('li');

      // Test Enter key
      fireEvent.keyDown(listItem!, {key: 'Enter'});

      const dialPadTab = tabs[1];
      fireEvent.click(dialPadTab);

      const input = await screen.findByTestId('outdial-number-input');
      await waitFor(() => {
        expect(input).toHaveValue('+14691234567');
      });
    });

    it('handles space key for address book entry selection', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const janeDoe = await screen.findByText('Jane Smith');
      const listItem = janeDoe.closest('li');

      // Test Space key
      fireEvent.keyDown(listItem!, {key: ' '});

      const dialPadTab = tabs[1];
      fireEvent.click(dialPadTab);

      const input = await screen.findByTestId('outdial-number-input');
      await waitFor(() => {
        expect(input).toHaveValue('+14699876543');
      });
    });

    it('clears input after successful call from address book', async () => {
      const mockStartOutdial = jest.fn();
      const {container} = render(<OutdialCallComponent {...addressBookProps} startOutdial={mockStartOutdial} />);

      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      const johnDoe = await screen.findByText('John Doe');
      fireEvent.click(johnDoe);

      const callButton = await screen.findByTestId('outdial-call-button');
      fireEvent.click(callButton);

      // Switch to dial pad
      const dialPadTab = tabs[1];
      fireEvent.click(dialPadTab);

      const input = await screen.findByTestId('outdial-number-input');
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Infinite scroll functionality', () => {
    // Mock IntersectionObserver
    let mockIntersectionObserver: jest.Mock;
    let intersectionCallback: IntersectionObserverCallback;

    // Helper function to get the tablist element (web component)
    const getTabList = async (container: HTMLElement) => {
      const tabList = container.querySelector('mdc-tablist');
      if (!tabList) {
        throw new Error('TabList not found');
      }
      return tabList;
    };

    beforeEach(() => {
      mockIntersectionObserver = jest.fn().mockImplementation((callback) => {
        intersectionCallback = callback;
        return {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
      delete (global as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver;
    });

    it('renders sentinel element for infinite scroll when there are more entries', async () => {
      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: jest.fn().mockResolvedValue({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `Contact ${i}`,
            number: `+1469000${i}`,
          })),
          total: 50,
        }),
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      const observerElement = container.querySelector('.address-book-observer');
      expect(observerElement).toBeInTheDocument();
    });

    it('does not render sentinel element when no more entries to load', async () => {
      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: jest
          .fn()
          .mockResolvedValueOnce({
            data: Array.from({length: 10}, (_, i) => ({
              id: `${i}`,
              name: `Contact ${i}`,
              number: `+1469000${i}`,
            })),
            total: 10,
          })
          .mockResolvedValueOnce({
            data: [],
            total: 10,
          }),
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      // Trigger intersection to load more
      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      await waitFor(() => {
        if (intersectionCallback) {
          intersectionCallback([mockEntry], {} as IntersectionObserver);
        }
      });

      // Wait for loading to complete
      await waitFor(() => {
        const observerElement = container.querySelector('.address-book-observer');
        expect(observerElement).not.toBeInTheDocument();
      });
    });

    it('loads more entries when scrolling to bottom', async () => {
      const mockGetAddressBook = jest
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `Contact ${i}`,
            number: `+1469000${i}`,
          })),
          total: 50,
        })
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i + 25}`,
            name: `Contact ${i + 25}`,
            number: `+1469000${i + 25}`,
          })),
          total: 50,
        });

      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: mockGetAddressBook,
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      // Wait for initial entries
      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      // Verify initial call
      expect(mockGetAddressBook).toHaveBeenCalledWith({page: 0, pageSize: 25, search: ''});

      // Trigger intersection observer
      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      if (intersectionCallback) {
        intersectionCallback([mockEntry], {} as IntersectionObserver);
      }

      // Wait for second page to load
      await waitFor(() => {
        expect(mockGetAddressBook).toHaveBeenCalledWith({page: 1, pageSize: 25, search: ''});
      });

      // Verify new entries are appended
      await waitFor(() => {
        expect(screen.getByText('Contact 25')).toBeInTheDocument();
      });

      // Verify old entries are still present
      expect(screen.getByText('Contact 0')).toBeInTheDocument();
    });

    it('shows loading spinner while loading more entries', async () => {
      let resolvePromise:
        | ((value: {data: Array<{id: string; name: string; number: string}>; total: number}) => void)
        | undefined;
      const loadingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockGetAddressBook = jest
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `Contact ${i}`,
            number: `+1469000${i}`,
          })),
          total: 50,
        })
        .mockImplementationOnce(() => loadingPromise);

      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: mockGetAddressBook,
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      // Trigger intersection observer
      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      if (intersectionCallback) {
        intersectionCallback([mockEntry], {} as IntersectionObserver);
      }

      // Check for spinner
      await waitFor(() => {
        const spinner = container.querySelector('mdc-spinner');
        expect(spinner).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({
        data: Array.from({length: 25}, (_, i) => ({
          id: `${i + 25}`,
          name: `Contact ${i + 25}`,
          number: `+1469000${i + 25}`,
        })),
        total: 50,
      });
    });

    it('does not load more entries when already loading', async () => {
      const mockGetAddressBook = jest
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `Contact ${i}`,
            number: `+1469000${i}`,
          })),
          total: 50,
        })
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i + 25}`,
            name: `Contact ${i + 25}`,
            number: `+1469000${i + 25}`,
          })),
          total: 50,
        });

      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: mockGetAddressBook,
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      // Verify initial call
      expect(mockGetAddressBook).toHaveBeenCalledTimes(1);

      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      // Trigger intersection observer once
      if (intersectionCallback) {
        intersectionCallback([mockEntry], {} as IntersectionObserver);
      }

      // Wait for second page to load
      await waitFor(() => {
        expect(screen.getByText('Contact 25')).toBeInTheDocument();
      });

      // Should have been called exactly twice (initial + one scroll)
      expect(mockGetAddressBook).toHaveBeenCalledTimes(2);
    });

    it('handles error while loading more entries', async () => {
      const mockGetAddressBook = jest
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `Contact ${i}`,
            number: `+1469000${i}`,
          })),
          total: 50,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: mockGetAddressBook,
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      if (intersectionCallback) {
        intersectionCallback([mockEntry], {} as IntersectionObserver);
      }

      // Wait for error to be handled
      await waitFor(() => {
        expect(mockGetAddressBook).toHaveBeenCalledTimes(2);
      });

      // After error, entries are cleared and no more entries flag is set
      await waitFor(() => {
        expect(screen.queryByText('Contact 0')).not.toBeInTheDocument();
      });

      // Observer element should not be present anymore (no more entries)
      const observerElement = container.querySelector('.address-book-observer');
      expect(observerElement).not.toBeInTheDocument();
    });

    it('stops loading when returned data is less than page size', async () => {
      const mockGetAddressBook = jest
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `Contact ${i}`,
            number: `+1469000${i}`,
          })),
          total: 30,
        })
        .mockResolvedValueOnce({
          data: Array.from({length: 5}, (_, i) => ({
            id: `${i + 25}`,
            name: `Contact ${i + 25}`,
            number: `+1469000${i + 25}`,
          })),
          total: 30,
        });

      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: mockGetAddressBook,
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('Contact 0')).toBeInTheDocument();
      });

      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      if (intersectionCallback) {
        intersectionCallback([mockEntry], {} as IntersectionObserver);
      }

      // Wait for second page to load
      await waitFor(() => {
        expect(screen.getByText('Contact 25')).toBeInTheDocument();
      });

      // Observer element should not be present anymore
      await waitFor(() => {
        const observerElement = container.querySelector('.address-book-observer');
        expect(observerElement).not.toBeInTheDocument();
      });
    });

    it('maintains scroll pagination with search', async () => {
      const mockGetAddressBook = jest
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i}`,
            name: `John ${i}`,
            number: `+1469000${i}`,
          })),
          total: 50,
        })
        .mockResolvedValueOnce({
          data: Array.from({length: 25}, (_, i) => ({
            id: `${i + 25}`,
            name: `John ${i + 25}`,
            number: `+1469000${i + 25}`,
          })),
          total: 50,
        });

      const addressBookProps: OutdialCallComponentProps = {
        ...props,
        isAddressBookEnabled: true,
        getAddressBookEntries: mockGetAddressBook,
      };

      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);

      await waitFor(() => {
        expect(screen.getByText('John 0')).toBeInTheDocument();
      });

      // Search
      const searchInput = await screen.findByTestId('outdial-address-book-search-input');
      const searchEvent = new Event('input', {bubbles: true});
      Object.defineProperty(searchEvent, 'target', {
        writable: false,
        value: {value: 'John'},
      });
      fireEvent(searchInput, searchEvent);

      // Wait for debounced search
      await waitFor(
        () => {
          expect(mockGetAddressBook).toHaveBeenCalledWith({page: 0, pageSize: 25, search: 'John'});
        },
        {timeout: 1000}
      );

      // Trigger load more with search term
      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('.address-book-observer'),
      } as IntersectionObserverEntry;

      if (intersectionCallback) {
        intersectionCallback([mockEntry], {} as IntersectionObserver);
      }

      await waitFor(() => {
        expect(mockGetAddressBook).toHaveBeenCalledWith({page: 1, pageSize: 25, search: 'John'});
      });
    });
  });
});
