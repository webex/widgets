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

    // Verify consult header structure
    const consultHeader = screen.container.querySelector('.consult-header');
    expect(consultHeader).toBeInTheDocument();

    // Verify avatar with correct attributes
    const avatar = screen.container.querySelector('.task-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('size', '32');

    // Verify consult sub-text
    const consultSubText = screen.container.querySelector('.consult-sub-text');
    expect(consultSubText).toBeInTheDocument();

    // Verify all buttons are present with correct attributes
    const muteButton = screen.getByTestId('mute-consult-btn');
    expect(muteButton).toBeInTheDocument();
    expect(muteButton).toHaveAttribute('data-disabled', 'false');
    expect(muteButton).toHaveAttribute('type', 'button');
    expect(muteButton).toHaveAttribute('data-color', 'primary');
    expect(muteButton).toHaveAttribute('data-size', '40');
    expect(muteButton).toHaveClass('call-control-button');

    const transferButton = screen.getByTestId('transfer-consult-btn');
    expect(transferButton).toBeInTheDocument();
    expect(transferButton).toHaveAttribute('data-disabled', 'false'); // enabled when consultCompleted is true
    expect(transferButton).toHaveAttribute('type', 'button');
    expect(transferButton).toHaveAttribute('data-color', 'primary');
    expect(transferButton).toHaveAttribute('data-size', '40');
    expect(transferButton).toHaveClass('call-control-button');

    const cancelButton = screen.getByTestId('cancel-consult-btn');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('data-disabled', 'false');
    expect(cancelButton).toHaveAttribute('type', 'button');
    expect(cancelButton).toHaveAttribute('data-color', 'primary');
    expect(cancelButton).toHaveAttribute('data-size', '40');
    expect(cancelButton).toHaveClass('call-control-consult-button-cancel');

    // Verify button container
    const buttonContainer = screen.container.querySelector('.consult-buttons-container');
    expect(buttonContainer).toBeInTheDocument();

    // Verify icons are present
    expect(screen.container.querySelector('.call-control-button-icon')).toBeInTheDocument();
    expect(screen.container.querySelector('.call-control-consult-button-cancel-icon')).toBeInTheDocument();
  });

  it('handles button clicks correctly', async () => {
    const screen = await render(<CallControlConsultComponent {...defaultProps} />);

    // Test mute button
    const muteButton = screen.getByTestId('mute-consult-btn');
    expect(muteButton).toHaveAttribute('data-disabled', 'false');
    expect(muteButton).toHaveAttribute('type', 'button');
    expect(muteButton).toHaveAttribute('data-color', 'primary');
    fireEvent.click(muteButton);
    expect(mockOnToggleConsultMute).toHaveBeenCalledTimes(1);

    // Test transfer button
    const transferButton = screen.getByTestId('transfer-consult-btn');
    expect(transferButton).toHaveAttribute('data-disabled', 'false'); // Should be enabled when consultCompleted is true
    expect(transferButton).toHaveAttribute('type', 'button');
    expect(transferButton).toHaveAttribute('data-color', 'primary');
    fireEvent.click(transferButton);
    expect(mockOnTransfer).toHaveBeenCalledTimes(1);

    // Test end consult button
    const cancelButton = screen.getByTestId('cancel-consult-btn');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('data-disabled', 'false');
    expect(cancelButton).toHaveAttribute('type', 'button');
    fireEvent.click(cancelButton);
    expect(mockEndConsultCall).toHaveBeenCalledTimes(1);
  });

  it('conditionally renders buttons based on props', async () => {
    const propsWithoutMute = {...defaultProps, muteUnmute: false};
    const screen = await render(<CallControlConsultComponent {...propsWithoutMute} />);

    // Mute button should not be rendered when muteUnmute is false
    expect(screen.queryByTestId('mute-consult-btn')).not.toBeInTheDocument();

    // Verify remaining buttons and their attributes
    const transferButton = screen.getByTestId('transfer-consult-btn');
    expect(transferButton).toBeInTheDocument();
    expect(transferButton).toHaveAttribute('data-disabled', 'false');
    expect(transferButton).toHaveAttribute('type', 'button');
    expect(transferButton).toHaveClass('call-control-button');

    const cancelButton = screen.getByTestId('cancel-consult-btn');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('data-disabled', 'false');
    expect(cancelButton).toHaveAttribute('type', 'button');
    expect(cancelButton).toHaveClass('call-control-consult-button-cancel');
  });

  it('handles case when onTransfer is undefined (covers line 52)', async () => {
    const propsWithoutTransfer = {...defaultProps, onTransfer: undefined};
    const screen = await render(<CallControlConsultComponent {...propsWithoutTransfer} />);

    // Component should still render without transfer functionality
    expect(screen.container.querySelector('.call-control-consult')).toBeInTheDocument();

    // Verify remaining buttons and their attributes
    const muteButton = screen.getByTestId('mute-consult-btn');
    expect(muteButton).toBeInTheDocument();
    expect(muteButton).toHaveAttribute('data-disabled', 'false');
    expect(muteButton).toHaveAttribute('type', 'button');
    expect(muteButton).toHaveClass('call-control-button');

    const cancelButton = screen.getByTestId('cancel-consult-btn');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('data-disabled', 'false');
    expect(cancelButton).toHaveAttribute('type', 'button');
    expect(cancelButton).toHaveClass('call-control-consult-button-cancel');

    // Transfer button should NOT be present when onTransfer is undefined
    expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();
  });

  it('renders with muted state correctly', async () => {
    const mutedProps = {...defaultProps, isMuted: true};
    const screen = await render(<CallControlConsultComponent {...mutedProps} />);

    const muteButton = screen.getByTestId('mute-consult-btn');
    expect(muteButton).toBeInTheDocument();
    expect(muteButton).toHaveAttribute('data-disabled', 'false');
    expect(muteButton).toHaveAttribute('type', 'button');
    expect(muteButton).toHaveAttribute('data-color', 'primary');
    expect(muteButton).toHaveAttribute('data-size', '40');
    expect(muteButton).toHaveClass('call-control-button-muted');

    // Verify the muted icon is present
    const mutedIcon = screen.container.querySelector('.call-control-button-muted-icon');
    expect(mutedIcon).toBeInTheDocument();
  });

  it('tests button disabled states and tooltips', async () => {
    const propsWithIncompleteConsult = {...defaultProps, consultCompleted: false};
    const screen = await render(<CallControlConsultComponent {...propsWithIncompleteConsult} />);

    // Transfer button should be disabled when consultCompleted is false
    const transferButton = screen.getByTestId('transfer-consult-btn');
    expect(transferButton).toHaveAttribute('data-disabled', 'true');
    expect(transferButton).toHaveAttribute('disabled', '');
    expect(transferButton).toHaveAttribute('type', 'button');
    expect(transferButton).toHaveAttribute('data-color', 'primary');

    // Verify tooltip containers are present
    const tooltips = screen.container.querySelectorAll('.md-tooltip-label');
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('verifies button icons and classes in different states', async () => {
    const screen = await render(<CallControlConsultComponent {...defaultProps} />);

    // Verify unmuted microphone icon
    const muteIcon = screen.container.querySelector('.call-control-button-icon');
    expect(muteIcon).toBeInTheDocument();

    // Verify transfer icon (next-bold)
    const transferIcon = screen.container.querySelector('.call-control-button-icon');
    expect(transferIcon).toBeInTheDocument();

    // Verify cancel/end consult icon
    const cancelIcon = screen.container.querySelector('.call-control-consult-button-cancel-icon');
    expect(cancelIcon).toBeInTheDocument();
  });

  it('verifies accessibility attributes for all buttons', async () => {
    const screen = await render(<CallControlConsultComponent {...defaultProps} />);

    // Check mute button accessibility
    const muteButton = screen.getByTestId('mute-consult-btn');
    expect(muteButton).toHaveAttribute('aria-describedby');

    // Check transfer button accessibility
    const transferButton = screen.getByTestId('transfer-consult-btn');
    expect(transferButton).toHaveAttribute('aria-describedby');

    // Check cancel button accessibility
    const cancelButton = screen.getByTestId('cancel-consult-btn');
    expect(cancelButton).toHaveAttribute('aria-describedby');

    const mergeButton = screen.queryByTestId('conference-consult-btn');
    expect(mergeButton).toHaveAttribute('aria-describedby');

    // Verify tooltip labels exist and have content
    const tooltipLabels = screen.container.querySelectorAll('.md-tooltip-label p');
    expect(tooltipLabels.length).toBe(4);
    expect(tooltipLabels[0]).toHaveTextContent('Mute');
    expect(tooltipLabels[1]).toHaveTextContent('Transfer Consult');
    expect(tooltipLabels[2]).toHaveTextContent('Consult Conference');
    expect(tooltipLabels[3]).toHaveTextContent('End Consult');
  });
});
