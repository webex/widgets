import React from 'react';
import {render, fireEvent, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import OutdialCallComponent from '../../../../src/components/task/OutdialCall/outdial-call';
import store from '@webex/cc-store';

describe('OutdialCallComponent', () => {
  const mockStartOutdial = jest.fn();
  const KEY_LIST = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  let customEvent;

  // Prevent warning 'CC-Widgets: UI Metrics: No logger found'
  store.store.logger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    startOutdial: mockStartOutdial,
    outdialANIEntries: [
      {name: 'name 1', number: '1'},
      {name: 'name 2', number: '2'},
    ],
  };

  beforeEach(() => {
    // Create a custom event that mimics what the mdc-input component would fire
    customEvent = new Event('change', {bubbles: true});
    mockStartOutdial.mockClear();
  });

  it('renders the component correctly', () => {
    render(<OutdialCallComponent {...props} />);
    expect(screen.getByTestId('outdial-number-input')).toBeInTheDocument();
    KEY_LIST.forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
    expect(screen.getByTestId('outdial-ani-option-select')).toBeInTheDocument();
    expect(screen.getByTestId('outdial-call-button')).toBeInTheDocument();
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

  it('updates input value when clicking keypad buttons', () => {
    render(<OutdialCallComponent {...props} />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    expect(screen.getByTestId('outdial-number-input')).toHaveValue('123');
  });

  it('calls startOutdial with correct payload when clicking call button', () => {
    render(<OutdialCallComponent {...props} />);
    const input = screen.getByTestId('outdial-number-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '123'},
    });
    fireEvent(input, customEvent);

    const callButton = screen.getByTestId('outdial-call-button');
    fireEvent.click(callButton);

    expect(mockStartOutdial).toHaveBeenCalledWith('123');
  });

  it('allows special characters (* # +) from keypad', () => {
    render(<OutdialCallComponent {...props} />);
    fireEvent.click(screen.getByText('*'));
    fireEvent.click(screen.getByText('#'));
    expect(screen.getByTestId('outdial-number-input')).toHaveValue('*#');
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
    render(<OutdialCallComponent startOutdial={mockStartOutdial} outdialANIEntries={[]} />);
    const select = await screen.findByTestId('outdial-ani-option-select');
    fireEvent.click(select);
    expect(screen.queryByText('name 1')).not.toBeInTheDocument();
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
