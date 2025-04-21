/* eslint-disable react/prop-types */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlConsultComponent from '../../../../src/components/task/CallControl/CallControlCustom/call-control-consult';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonCircle: (props) => {
    // Extract non-DOM props
    const {onPress, ...domProps} = props;
    return (
      <button {...domProps} onClick={onPress}>
        {props.children}
      </button>
    );
  },
  TooltipNext: (props) => {
    const {triggerComponent, ...rest} = props;
    return (
      <div data-testid="TooltipNext">
        {triggerComponent}
        <div {...rest}>{props.children}</div>
      </div>
    );
  },
  Text: (props) => {
    return <p {...props}>{props.children}</p>;
  },
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Icon: (props) => <span data-testid="Icon">{props.name}</span>,
  Avatar: (props) => <div data-testid="Avatar">{props.iconName}</div>,
}));

// eslint-disable-next-line react/display-name
jest.mock('../../../../src/components/task/TaskTimer', () => () => <span data-testid="TaskTimer">00:00</span>);

describe('CallControlConsultComponent', () => {
  const mockOnTransfer = jest.fn();
  const mockEndConsultCall = jest.fn();
  const defaultProps = {
    agentName: 'Alice',
    startTimeStamp: Date.now(),
    onTransfer: mockOnTransfer,
    endConsultCall: mockEndConsultCall,
    consultCompleted: true,
    showTransfer: true,
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

    // Setup error spy instead of expecting thrown errors
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CallControlConsultComponent {...defaultProps} onTransfer={errorMockOnTransfer} />);
    const transferButton = screen.getByTestId('transfer-consult-btn');

    // No longer expecting error to be thrown to test runner
    fireEvent.click(transferButton);

    expect(errorMockOnTransfer).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();

    // Restore original console
    (console.error as jest.Mock).mockRestore();
  });

  it('handles error when end consult button click fails', () => {
    const errorMockEndConsultCall = jest.fn().mockImplementation(() => {
      throw new Error('End consult failed');
    });

    // Setup error spy instead of expecting thrown errors
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CallControlConsultComponent {...defaultProps} endConsultCall={errorMockEndConsultCall} />);
    const cancelButton = screen.getByTestId('cancel-consult-btn');

    // No longer expecting error to be thrown to test runner
    fireEvent.click(cancelButton);

    expect(errorMockEndConsultCall).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();

    // Restore original console
    (console.error as jest.Mock).mockRestore();
  });

  it('does not render transfer button when showTransfer is false', () => {
    render(<CallControlConsultComponent {...defaultProps} showTransfer={false} />);
    expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();
  });

  it('does not render cancel button when both isEndConsultEnabled and showTransfer are false', () => {
    render(<CallControlConsultComponent {...defaultProps} isEndConsultEnabled={false} showTransfer={false} />);
    expect(screen.queryByTestId('cancel-consult-btn')).not.toBeInTheDocument();
  });

  it('renders cancel button when isEndConsultEnabled is true even if showTransfer is false', () => {
    render(<CallControlConsultComponent {...defaultProps} isEndConsultEnabled={true} showTransfer={false} />);
    expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();
  });
});
