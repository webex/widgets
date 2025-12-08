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
        currentTask={undefined}
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
});
