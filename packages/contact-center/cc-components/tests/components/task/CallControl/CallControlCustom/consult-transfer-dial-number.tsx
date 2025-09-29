import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent, render} from '@testing-library/react';
import DialNumberUI from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-dial-number';
import * as callControlUtils from '../../../../../src/components/task/CallControl/call-control.utils';

describe('DialNumberUI', () => {
  const loggerMock = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  const onButtonPressMock = jest.fn();
  const defaultProps = {
    title: 'Dial Number',
    buttonIcon: 'call',
    onButtonPress: onButtonPressMock,
    logger: loggerMock,
  };

  const mockHandleButtonPress = jest.fn();
  const mockOnInputDialNumber = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(callControlUtils, 'handleButtonPress').mockImplementation(mockHandleButtonPress);
    jest.spyOn(callControlUtils, 'onInputDialNumber').mockImplementation(mockOnInputDialNumber);
  });

  it('renders input and button', () => {
    const {getByTestId} = render(<DialNumberUI {...defaultProps} />);
    const input = getByTestId('consult-transfer-dial-number-input');
    expect(input).toBeInTheDocument();
    const button = getByTestId('dial-number-btn');
    expect(button).toBeInTheDocument();
  });

  it('calls onInputDialNumber utility when input event is fired', () => {
    const {getByTestId} = render(<DialNumberUI {...defaultProps} />);
    const numberInput = getByTestId('consult-transfer-dial-number-input');
    const event = new CustomEvent('input', {detail: {value: '12345'}});
    fireEvent(numberInput, event);
    expect(mockOnInputDialNumber).toHaveBeenCalled();
  });

  it('calls handleButtonPress utility when button is pressed', () => {
    const {getByTestId} = render(<DialNumberUI {...defaultProps} />);
    const numberInput = getByTestId('consult-transfer-dial-number-input');
    // Simulate entering a value before clicking the button
    const inputValue = '98765';
    const event = new CustomEvent('input', {detail: {value: inputValue}});
    mockOnInputDialNumber.mockImplementation((e, setValue) => setValue('98765'));
    fireEvent(numberInput, event);
    const button = getByTestId('dial-number-btn');
    fireEvent.click(button);
    // The value passed to handleButtonPress should be '98765'
    expect(mockHandleButtonPress).toHaveBeenCalledWith(loggerMock, onButtonPressMock, inputValue);
  });
});
