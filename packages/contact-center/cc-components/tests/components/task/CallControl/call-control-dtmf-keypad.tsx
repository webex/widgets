import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlDtmfKeypad from '../../../../src/components/task/CallControl/call-control-dtmf-keypad';
import {
  DIALPAD_BUTTONS,
  DTMF_KEYPAD_PLACEHOLDER,
  KEY_LIST,
} from '../../../../src/components/task/OutdialCall/constants';
import {mockCC} from '@webex/test-fixtures';

describe('CallControlDtmfKeypad', () => {
  const onDigitPress = jest.fn().mockResolvedValue(undefined);
  const logger = mockCC.LoggerProxy;
  let customEvent: Event;

  beforeEach(() => {
    jest.clearAllMocks();
    customEvent = new Event('input', {bubbles: true});
  });

  it('renders input with Enter the number placeholder', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const input = await screen.findByTestId('call-control-keypad-input');
    expect(input).toHaveAttribute('aria-label', DTMF_KEYPAD_PLACEHOLDER);
  });

  it('renders all DTMF keys with letter labels on 2-9 and plus on 0', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    await waitFor(() => {
      expect(keypad.querySelectorAll('.call-control-dtmf-key')).toHaveLength(KEY_LIST.length);
    });

    expect(within(keypad).getByText('ABC')).toBeInTheDocument();
    expect(within(keypad).getByText('WXYZ')).toBeInTheDocument();
    expect(within(keypad).getByText('+')).toBeInTheDocument();

    DIALPAD_BUTTONS.forEach(({val}) => {
      expect(within(keypad).getByText(val, {selector: '.call-control-dtmf-key-digit'})).toBeInTheDocument();
    });
  });

  it('calls onDigitPress, updates input, and logs when a digit is pressed', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('5', {selector: '.call-control-dtmf-key-digit'}));

    await waitFor(() => {
      expect(onDigitPress).toHaveBeenCalledWith('5');
    });
    expect(await screen.findByTestId('call-control-keypad-input')).toHaveValue('5');
    expect(logger.info).toHaveBeenCalledWith('CC-Widgets: CallControl: DTMF digit pressed', {
      module: 'call-control-dtmf-keypad.tsx',
      method: 'transmitDigit',
    });
  });

  it('transmits and appends when typing a valid digit in the input', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const input = await screen.findByTestId('call-control-keypad-input');
    fireEvent.keyDown(input, {key: '3'});

    await waitFor(() => {
      expect(onDigitPress).toHaveBeenCalledWith('3');
    });
    expect(input).toHaveValue('3');
  });

  it('sanitizes pasted input without transmitting DTMF', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const input = await screen.findByTestId('call-control-keypad-input');
    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: '1a2-3*#'},
    });
    fireEvent(input, customEvent);

    expect(input).toHaveValue('123*#');
    expect(onDigitPress).not.toHaveBeenCalled();
  });

  it('allows backspace to update input without an extra transmit call', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const input = await screen.findByTestId('call-control-keypad-input');
    fireEvent.keyDown(input, {key: '5'});
    await waitFor(() => expect(onDigitPress).toHaveBeenCalledTimes(1));

    Object.defineProperty(customEvent, 'target', {
      writable: false,
      value: {value: ''},
    });
    fireEvent(input, customEvent);

    expect(input).toHaveValue('');
    expect(onDigitPress).toHaveBeenCalledTimes(1);
  });

  it('shows spinner while onDigitPress is pending', async () => {
    let resolvePress: (() => void) | undefined;
    const pendingPress = new Promise<void>((resolve) => {
      resolvePress = resolve;
    });
    const slowOnDigitPress = jest.fn().mockReturnValue(pendingPress);

    render(<CallControlDtmfKeypad onDigitPress={slowOnDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('1', {selector: '.call-control-dtmf-key-digit'}));

    expect(await screen.findByTestId('call-control-keypad-spinner')).toBeInTheDocument();

    resolvePress?.();
    await waitFor(() => {
      expect(screen.queryByTestId('call-control-keypad-spinner')).not.toBeInTheDocument();
    });
  });

  it('serializes rapid digit presses through the transmission queue', async () => {
    const callOrder: string[] = [];
    let resolveFirst: (() => void) | undefined;
    const firstPress = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const onDigitPress = jest
      .fn()
      .mockImplementationOnce(() => firstPress)
      .mockImplementation(async (digit: string) => {
        callOrder.push(digit);
      });

    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('1', {selector: '.call-control-dtmf-key-digit'}));
    fireEvent.click(within(keypad).getByText('2', {selector: '.call-control-dtmf-key-digit'}));

    await waitFor(() => {
      expect(onDigitPress).toHaveBeenCalledTimes(1);
    });

    resolveFirst?.();
    await waitFor(() => {
      expect(onDigitPress).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(callOrder).toEqual(['2']);
    });
  });

  it('does not transmit digits when disabled', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} disabled />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('1', {selector: '.call-control-dtmf-key-digit'}));

    expect(onDigitPress).not.toHaveBeenCalled();
  });

  it('resets dialNumber when remounted with a different key', async () => {
    const {rerender} = render(
      <CallControlDtmfKeypad key="interaction-a" onDigitPress={onDigitPress} logger={logger} />
    );

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('5', {selector: '.call-control-dtmf-key-digit'}));
    expect(await screen.findByTestId('call-control-keypad-input')).toHaveValue('5');

    rerender(<CallControlDtmfKeypad key="interaction-b" onDigitPress={onDigitPress} logger={logger} />);

    expect(await screen.findByTestId('call-control-keypad-input')).toHaveValue('');
  });

  it('discards queued digits when unmounted before transmission completes', async () => {
    let resolveFirst: (() => void) | undefined;
    const firstPress = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const slowOnDigitPress = jest
      .fn()
      .mockImplementationOnce(() => firstPress)
      .mockResolvedValue(undefined);

    const {unmount} = render(<CallControlDtmfKeypad onDigitPress={slowOnDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('1', {selector: '.call-control-dtmf-key-digit'}));
    fireEvent.click(within(keypad).getByText('2', {selector: '.call-control-dtmf-key-digit'}));

    await waitFor(() => {
      expect(slowOnDigitPress).toHaveBeenCalledTimes(1);
    });

    unmount();
    resolveFirst?.();

    await waitFor(() => {
      expect(slowOnDigitPress).toHaveBeenCalledTimes(1);
    });
  });

  it('discards queued digits when remounted with a different key before transmission completes', async () => {
    let resolveFirst: (() => void) | undefined;
    const firstPress = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const slowOnDigitPress = jest
      .fn()
      .mockImplementationOnce(() => firstPress)
      .mockResolvedValue(undefined);

    const {rerender} = render(
      <CallControlDtmfKeypad key="interaction-a" onDigitPress={slowOnDigitPress} logger={logger} />
    );

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('1', {selector: '.call-control-dtmf-key-digit'}));
    fireEvent.click(within(keypad).getByText('2', {selector: '.call-control-dtmf-key-digit'}));

    await waitFor(() => {
      expect(slowOnDigitPress).toHaveBeenCalledTimes(1);
    });

    rerender(<CallControlDtmfKeypad key="interaction-b" onDigitPress={slowOnDigitPress} logger={logger} />);
    resolveFirst?.();

    await waitFor(() => {
      expect(slowOnDigitPress).toHaveBeenCalledTimes(1);
    });
  });
});
