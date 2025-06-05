import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlConsultComponent from '../../../../src/components/task/CallControl/CallControlCustom/call-control-consult';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

// eslint-disable-next-line react/display-name
jest.mock('../../../../src/components/task/TaskTimer', () => () => <span data-testid="TaskTimer">00:00</span>);

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('CallControlConsultComponent', () => {
  const mockOnTransfer = jest.fn();
  const mockEndConsultCall = jest.fn();
  const defaultProps = {
    agentName: 'Alice',
    startTimeStamp: Date.now(),
    onTransfer: mockOnTransfer,
    endConsultCall: mockEndConsultCall,
    consultCompleted: true,
    isAgentBeingConsulted: true,
    logger: loggerMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders agent name, consult label and task timer', () => {
    render(<CallControlConsultComponent {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    const consultText = screen.getByText(
      (content, element) => element?.className.includes('consult-sub-text') && content.includes('Consult')
    );
    expect(consultText).toBeInTheDocument();
  });

  it('calls onTransfer when transfer button is clicked', () => {
    render(<CallControlConsultComponent {...defaultProps} />);
    const transferButton = screen.getByTestId('transfer-consult-btn');
    fireEvent.click(transferButton);
    expect(mockOnTransfer).toHaveBeenCalled();
  });

  it('calls endConsultCall when cancel button is clicked', () => {
    render(<CallControlConsultComponent {...defaultProps} />);
    const cancelButton = screen.getByTestId('cancel-consult-btn');
    fireEvent.click(cancelButton);
    expect(mockEndConsultCall).toHaveBeenCalled();
  });

  it('displays correct state when consult is not completed', () => {
    render(<CallControlConsultComponent {...defaultProps} consultCompleted={false} />);
    const transferButton = screen.getByTestId('transfer-consult-btn');

    // Check the disabled attribute directly
    expect(transferButton).toHaveAttribute('disabled', '');

    const consultText = screen.getByText(
      (content, element) => element?.className.includes('consult-sub-text') && content.includes('Consult requested')
    );
    expect(consultText).toBeInTheDocument();
  });

  it('handles error when transfer button click fails', () => {
    const errorMockOnTransfer = jest.fn().mockImplementation(() => {
      throw new Error('Transfer failed');
    });

    const errorHandler = jest.fn();
    window.addEventListener('error', errorHandler);

    render(<CallControlConsultComponent {...defaultProps} onTransfer={errorMockOnTransfer} />);
    const transferButton = screen.getByTestId('transfer-consult-btn');

    fireEvent.click(transferButton);
    expect(errorMockOnTransfer).toHaveBeenCalled();
  });

  it('handles error when end consult button click fails', () => {
    const errorMockEndConsultCall = jest.fn().mockImplementation(() => {
      throw new Error('End consult failed');
    });

    const errorHandler = jest.fn();
    window.addEventListener('error', errorHandler);

    render(<CallControlConsultComponent {...defaultProps} endConsultCall={errorMockEndConsultCall} />);
    const cancelButton = screen.getByTestId('cancel-consult-btn');
    fireEvent.click(cancelButton);
    expect(errorMockEndConsultCall).toHaveBeenCalled();
  });

  it('does not render transfer button when isAgentBeingConsulted is false', () => {
    render(<CallControlConsultComponent {...defaultProps} isAgentBeingConsulted={false} />);
    expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();
  });

  it('does not render cancel button when both isEndConsultEnabled and isAgentBeingConsulted are false', () => {
    render(<CallControlConsultComponent {...defaultProps} isEndConsultEnabled={false} isAgentBeingConsulted={false} />);
    expect(screen.queryByTestId('cancel-consult-btn')).not.toBeInTheDocument();
  });

  it('renders cancel button when isEndConsultEnabled is true even if isAgentBeingConsulted is false', () => {
    render(<CallControlConsultComponent {...defaultProps} isEndConsultEnabled={true} isAgentBeingConsulted={false} />);
    expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();
  });

  it('logs transfer button click', () => {
    render(<CallControlConsultComponent {...defaultProps} />);
    const transferButton = screen.getByTestId('transfer-consult-btn');
    fireEvent.click(transferButton);
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControlConsult: transfer completed', {
      module: 'call-control-consult.tsx',
      method: 'handleTransfer',
    });
  });

  it('logs end consult button click', () => {
    render(<CallControlConsultComponent {...defaultProps} />);
    const cancelButton = screen.getByTestId('cancel-consult-btn');
    fireEvent.click(cancelButton);
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControlConsult: end consult completed', {
      module: 'call-control-consult.tsx',
      method: 'handleEndConsult',
    });
  });
});
