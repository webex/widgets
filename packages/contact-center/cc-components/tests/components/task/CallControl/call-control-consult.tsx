/* eslint-disable react/prop-types */
import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlConsultComponent from '../../../../src/components/task/CallControl/CallControlCustom/call-control-consult';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonCircle: (props) => (
    <button data-testid={props['data-testid']} onClick={props.onPress}>
      {props.children}
    </button>
  ),
  TooltipNext: (props) => (
    <div data-testid="TooltipNext">
      {props.triggerComponent}
      {props.children}
    </div>
  ),
  Text: (props) => <p {...props}>{props.children}</p>,
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
});
