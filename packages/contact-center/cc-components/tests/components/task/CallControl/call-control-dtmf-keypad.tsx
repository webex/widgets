import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlDtmfKeypad from '../../../../src/components/task/CallControl/call-control-dtmf-keypad';
import {KEY_LIST} from '../../../../src/components/task/OutdialCall/constants';
import {mockCC} from '@webex/test-fixtures';

describe('CallControlDtmfKeypad', () => {
  const onDigitPress = jest.fn();
  const logger = mockCC.LoggerProxy;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all DTMF keys', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    await waitFor(() => {
      expect(keypad.querySelectorAll('.call-control-dtmf-key')).toHaveLength(KEY_LIST.length);
    });

    KEY_LIST.forEach((key) => {
      expect(within(keypad).getByText(key)).toBeInTheDocument();
    });
  });

  it('calls onDigitPress and logs when a digit is pressed', async () => {
    render(<CallControlDtmfKeypad onDigitPress={onDigitPress} logger={logger} />);

    const keypad = await screen.findByTestId('call-control-keypad-keys');
    fireEvent.click(within(keypad).getByText('5'));

    expect(onDigitPress).toHaveBeenCalledWith('5');
    expect(logger.info).toHaveBeenCalledWith('CC-Widgets: CallControl: DTMF digit pressed', {
      module: 'call-control-dtmf-keypad.tsx',
      method: 'handleDigitPress',
    });
  });
});
