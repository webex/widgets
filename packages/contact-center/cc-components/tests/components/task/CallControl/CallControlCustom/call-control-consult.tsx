import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlConsultComponent from '../../../../../src/components/task/CallControl/CallControlCustom/call-control-consult';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock Worker for TaskTimer component
class MockWorker {
  public url: string;
  public onmessage: ((event: MessageEvent) => void) | null;

  constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = null;
  }

  postMessage(msg: unknown) {
    // Simulate worker timer behavior
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage!({data: msg} as MessageEvent);
      }, 0);
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.onmessage = listener;
    }
  }

  removeEventListener() {
    this.onmessage = null;
  }

  terminate() {
    // Mock terminate
  }
}

// Mock Worker and URL.createObjectURL for TaskTimer
(global as typeof globalThis).Worker = MockWorker as unknown as typeof Worker;
(global as typeof globalThis).URL.createObjectURL = jest.fn(() => 'blob:mock-url');

// Mock setTimeout for mute toggle tests
jest.useFakeTimers();

describe('CallControlConsultComponent', () => {
  const mockOnTransfer = jest.fn();
  const mockEndConsultCall = jest.fn();
  const mockOnToggleConsultMute = jest.fn();

  const defaultProps = {
    agentName: 'Alice',
    startTimeStamp: Date.now(),
    onTransfer: mockOnTransfer,
    endConsultCall: mockEndConsultCall,
    onToggleConsultMute: mockOnToggleConsultMute,
    consultCompleted: true,
    isAgentBeingConsulted: true,
    isEndConsultEnabled: true,
    logger: loggerMock,
    muteUnmute: true,
    isMuted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders consult component with agent information and control buttons', async () => {
    const screen = await render(<CallControlConsultComponent {...defaultProps} />);

    // Verify main structure
    expect(screen.container.querySelector('.call-control-consult')).toBeInTheDocument();
    expect(screen.container.querySelector('.consult-agent-name')).toHaveTextContent('Alice');
    expect(screen.container.querySelector('.task-text.task-text--secondary')).toBeInTheDocument();

    // Verify all buttons are present
    expect(screen.getByTestId('mute-consult-btn')).toBeInTheDocument();
    expect(screen.getByTestId('transfer-consult-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();
  });

  it('handles button clicks correctly', async () => {
    const screen = await render(<CallControlConsultComponent {...defaultProps} />);

    // Test mute button
    fireEvent.click(screen.getByTestId('mute-consult-btn'));
    expect(mockOnToggleConsultMute).toHaveBeenCalledTimes(1);

    // Test transfer button
    fireEvent.click(screen.getByTestId('transfer-consult-btn'));
    expect(mockOnTransfer).toHaveBeenCalledTimes(1);

    // Test end consult button
    fireEvent.click(screen.getByTestId('cancel-consult-btn'));
    expect(mockEndConsultCall).toHaveBeenCalledTimes(1);
  });

  it('conditionally renders buttons based on props', async () => {
    const propsWithoutMute = {...defaultProps, muteUnmute: false};
    const screen = await render(<CallControlConsultComponent {...propsWithoutMute} />);

    // Mute button should not be rendered when muteUnmute is false
    expect(screen.queryByTestId('mute-consult-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('transfer-consult-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();
  });

  it('handles case when onTransfer is undefined (covers line 52)', async () => {
    const propsWithoutTransfer = {...defaultProps, onTransfer: undefined};
    const screen = await render(<CallControlConsultComponent {...propsWithoutTransfer} />);

    // Component should still render without transfer functionality
    expect(screen.container.querySelector('.call-control-consult')).toBeInTheDocument();
    expect(screen.getByTestId('mute-consult-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();

    // Transfer button should NOT be present when onTransfer is undefined
    expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();
  });

  it('renders with muted state correctly', async () => {
    const mutedProps = {...defaultProps, isMuted: true};
    const screen = await render(<CallControlConsultComponent {...mutedProps} />);

    const muteButton = screen.getByTestId('mute-consult-btn');
    expect(muteButton).toBeInTheDocument();
    expect(muteButton).toHaveAttribute('data-disabled', 'false');
  });
});
