import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import OutdialCallComponent from '../../../../src/components/task/OutdialCall/outdial-call';
import store from '@webex/cc-store';
import {mockCC} from '@webex/test-fixtures';
import {OutdialCallComponentProps} from '../../../../src/components/task/task.types';

describe('Outdial Call Component', () => {
  let customEvent: unknown;
  // Prevent warning 'CC-Widgets: UI Metrics: No logger found'
  store.store.logger = mockCC.LoggerProxy;

  // Helper function to get the tablist element (web component)
  const getTabList = async (container: HTMLElement) => {
    const tabList = container.querySelector('mdc-tablist');
    if (!tabList) {
      throw new Error('TabList not found');
    }
    return tabList;
  };

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

  beforeEach(() => {
    // Create a custom event that mimics what the mdc-input component would fire
    customEvent = new Event('input', {bubbles: true});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component correctly', async () => {
      const {container} = render(<OutdialCallComponent {...props} />);
      await screen.findByTestId('outdial-number-input');
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });
  });

  it('updates input value when typing directly', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');

    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent as Event);

    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('updates input value when clicking keypad buttons', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    const keypad = await screen.findByTestId('outdial-keypad-keys');
    const buttons = within(keypad).getAllByRole('button');
    fireEvent.click(buttons[0]); // '1'
    fireEvent.click(buttons[1]); // '2'
    fireEvent.click(buttons[2]); // '3'
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('calls startOutdial with correct payload when clicking call button', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent as Event);

    const callButton = await screen.findByTestId('outdial-call-button');
    fireEvent.click(callButton);

    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('allows special characters (* # +) from keypad', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    fireEvent.click(await screen.findByText('*'));
    fireEvent.click(await screen.findByText('#'));
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('shows error help text when invalid characters are entered', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: 'abc'},
    });
    fireEvent(input, customEvent as Event);
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('does not allow invalid characters when typing', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    const input = await screen.findByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123abc'},
    });
    fireEvent(input, customEvent as Event);
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('has no ANI entry options when the entry list is empty', async () => {
    const {container} = render(
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
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('sets selected ani when an option is selected', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    const option = await screen.findByText('name 1');
    expect(option).toBeInTheDocument();
    fireEvent.click(option);
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
  });

  it('does not allow empty input', async () => {
    const {container} = render(<OutdialCallComponent {...props} />);
    await screen.findByTestId('outdial-call-button');
    // Remove IDs to avoid snapshot issues with dynamic IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
    expect(container).toMatchSnapshot();
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

    it('renders with address book enabled', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      await screen.findByTestId('outdial-number-input');
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('switches to address book tab', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0]; // First tab is address book
      fireEvent.click(addressBookTab);
      await screen.findByTestId('outdial-address-book-container');
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('displays address book entries', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);
      await screen.findByText('John Doe');
      await screen.findByText('Jane Smith');
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('selects an address book entry', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);
      const entry = await screen.findByText('John Doe');
      fireEvent.click(entry);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('renders address book search input', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);
      const searchInput = await screen.findByTestId('outdial-address-book-search-input');
      expect(searchInput).toBeInTheDocument();
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
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
      await screen.findByText('No address book entries found.');
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('switches back to dial pad from address book', async () => {
      const {container} = render(<OutdialCallComponent {...addressBookProps} />);
      const tabList = await waitFor(() => getTabList(container));
      const tabs = within(tabList as HTMLElement).getAllByRole('tab');
      const addressBookTab = tabs[0];
      fireEvent.click(addressBookTab);
      await screen.findByTestId('outdial-address-book-container');
      const dialPadTab = tabs[1]; // Second tab is dial pad
      fireEvent.click(dialPadTab);
      await screen.findByTestId('outdial-keypad-keys');
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });
  });
});
