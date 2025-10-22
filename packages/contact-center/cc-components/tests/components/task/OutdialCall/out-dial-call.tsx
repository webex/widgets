import React from 'react';
import {render, fireEvent, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import OutdialCallComponent from '../../../../src/components/task/OutdialCall/outdial-call';
import {KEY_LIST, OutdialStrings} from '../../../../src/components/task/OutdialCall/constants';
import store from '@webex/cc-store';
import {mockCC} from '@webex/test-fixtures';
import {OutdialCallComponentProps} from 'packages/contact-center/cc-components/src/components/task/task.types';

describe('OutdialCallComponent', () => {
  let customEvent;

  // Prevent warning 'CC-Widgets: UI Metrics: No logger found'
  store.store.logger = mockCC.LoggerProxy;

  beforeEach(() => {
    // Create a custom event that mimics what the mdc-input component would fire
    customEvent = new Event('change', {bubbles: true});
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
  };
  describe('renders the component correctly, should render:', () => {
    it('article container', async () => {
      render(<OutdialCallComponent {...props} />);
      const article = await screen.findByTestId('outdial-call-container');
      expect(article).toBeInTheDocument();
      expect(article).toHaveClass('keypad');
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
        expect(button).toHaveClass('key button');
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
      expect(outdialAniSelect).toHaveClass('outdial-input');
      expect(outdialAniSelect).toHaveAttribute('help-text-type', 'default');
      expect(outdialAniSelect).toHaveAttribute('label', OutdialStrings.ANI_SELECT_LABEL);
      expect(outdialAniSelect).toHaveAttribute('name', 'outdial-ani-option-select');
      expect(outdialAniSelect).toHaveTextContent(/name 1/);
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
    await screen.findByTestId('outdial-ani-option-1');
    fireEvent.click(await screen.findByText('1'));
    fireEvent.click(await screen.findByText('2'));
    fireEvent.click(await screen.findByText('3'));
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

    waitFor(() => {
      expect(props.getOutdialANIEntries).toHaveBeenCalledWith('123', undefined);
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
    render(<OutdialCallComponent startOutdial={props.startOutdial} outdialANIEntries={[]} />);
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    expect(await screen.queryByText('name 1')).not.toBeInTheDocument();
  });

  it('sets selected ani when an option is selected', async () => {
    render(<OutdialCallComponent {...props} />);
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    const option = await screen.findByText('name 1');
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
});
