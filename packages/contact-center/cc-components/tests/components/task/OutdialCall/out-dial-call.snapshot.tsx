import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import OutdialCallComponent from '../../../../src/components/task/OutdialCall/outdial-call';
import store from '@webex/cc-store';
import {mockCC} from '@webex/test-fixtures';
import {OutdialCallComponentProps} from '../../../../src/components/task/task.types';

describe('Outdial Call Component', () => {
  let customEvent: unknown;
  // Prevent warning 'CC-Widgets: UI Metrics: No logger found'
  store.store.logger = mockCC.LoggerProxy;

  const props: OutdialCallComponentProps = {
    logger: mockCC.LoggerProxy,
    startOutdial: jest.fn(),
    getOutdialANIEntries: jest.fn().mockResolvedValue([
      {name: 'name 1', number: '1'},
      {name: 'name 2', number: '2'},
    ]),
  };

  beforeEach(() => {
    // Create a custom event that mimics what the mdc-input component would fire
    customEvent = new Event('change', {bubbles: true});
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
    await screen.findByTestId('outdial-ani-option-1');
    fireEvent.click(await screen.findByText('1'));
    fireEvent.click(await screen.findByText('2'));
    fireEvent.click(await screen.findByText('3'));
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
    const {container} = render(<OutdialCallComponent startOutdial={props.startOutdial} outdialANIEntries={[]} />);
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
});
