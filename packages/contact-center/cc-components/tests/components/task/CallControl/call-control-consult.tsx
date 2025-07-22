import React from 'react';
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlConsultComponent from '../../../../src/components/task/CallControl/CallControlCustom/call-control-consult';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// eslint-disable-next-line react/display-name
jest.mock('../../../../src/components/task/TaskTimer', () => () => <span data-testid="TaskTimer">00:00</span>);

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

  describe('Component Rendering and Basic Functionality', () => {
    it('should render with basic props and handle various configurations', async () => {
      // Test basic rendering
      const {unmount} = render(<CallControlConsultComponent {...defaultProps} />);
      await act(async () => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByTestId('TaskTimer')).toBeInTheDocument();
        expect(screen.getByText(/Consulting/)).toBeInTheDocument();
      });
      unmount();

      // Test consult not completed
      const {unmount: unmount2} = render(
        <CallControlConsultComponent {...{...defaultProps, consultCompleted: false}} />
      );
      expect(screen.getByText(/Consult requested/)).toBeInTheDocument();
      const transferBtn = screen.getByTestId('transfer-consult-btn');
      expect(transferBtn).toBeDisabled();
      unmount2();

      // Test muted state
      const {unmount: unmount3} = render(<CallControlConsultComponent {...{...defaultProps, isMuted: true}} />);
      const muteBtn = screen.getByTestId('mute-consult-btn');
      expect(muteBtn).toHaveClass('call-control-button-muted');
      unmount3();

      // Test without muteUnmute - component will be re-rendered so test separately
      render(<CallControlConsultComponent {...{...defaultProps, muteUnmute: false}} />);
      expect(screen.queryByTestId('mute-consult-btn')).not.toBeInTheDocument();
    });

    it('should handle timer key generation and agent display', () => {
      const timestamp = 1234567890;
      render(<CallControlConsultComponent {...{...defaultProps, startTimeStamp: timestamp}} />);

      expect(screen.getByTestId('TaskTimer')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('Button Interactions and State Management', () => {
    it('should handle transfer button click and logging', async () => {
      const {unmount} = render(<CallControlConsultComponent {...defaultProps} />);

      const transferButton = screen.getByTestId('transfer-consult-btn');

      await act(async () => {
        fireEvent.click(transferButton);
      });

      expect(loggerMock.info).toHaveBeenCalledWith(
        'CC-Widgets: CallControlConsult: transfer button clicked',
        expect.any(Object)
      );
      expect(mockOnTransfer).toHaveBeenCalled();
      expect(loggerMock.log).toHaveBeenCalledWith(
        'CC-Widgets: CallControlConsult: transfer completed',
        expect.any(Object)
      );
      unmount();
    });

    it('should handle end consult button click and logging', async () => {
      const {unmount} = render(<CallControlConsultComponent {...defaultProps} />);

      const cancelButton = screen.getByTestId('cancel-consult-btn');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(loggerMock.info).toHaveBeenCalledWith(
        'CC-Widgets: CallControlConsult: end consult clicked',
        expect.any(Object)
      );
      expect(mockEndConsultCall).toHaveBeenCalled();
      expect(loggerMock.log).toHaveBeenCalledWith(
        'CC-Widgets: CallControlConsult: end consult completed',
        expect.any(Object)
      );
      unmount();
    });

    it('should handle mute toggle with disabled state and timeout', async () => {
      const {unmount} = render(<CallControlConsultComponent {...defaultProps} />);

      const muteButton = screen.getByTestId('mute-consult-btn');

      await act(async () => {
        fireEvent.click(muteButton);
      });

      expect(mockOnToggleConsultMute).toHaveBeenCalled();
      expect(muteButton).toBeDisabled();

      // Fast-forward timer to re-enable button
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(muteButton).not.toBeDisabled();
      });
      unmount();
    });
  });

  describe('Button Visibility and Configuration', () => {
    it('should handle different button visibility configurations', () => {
      // Test no transfer button when not agent being consulted
      const {rerender, unmount} = render(
        <CallControlConsultComponent {...{...defaultProps, isAgentBeingConsulted: false}} />
      );
      expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();

      // Test no cancel button when both flags are false
      rerender(
        <CallControlConsultComponent {...{...defaultProps, isEndConsultEnabled: false, isAgentBeingConsulted: false}} />
      );
      expect(screen.queryByTestId('cancel-consult-btn')).not.toBeInTheDocument();

      // Test cancel button when isEndConsultEnabled is true
      rerender(
        <CallControlConsultComponent {...{...defaultProps, isEndConsultEnabled: true, isAgentBeingConsulted: false}} />
      );
      expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();

      // Test no transfer button when onTransfer is null
      rerender(<CallControlConsultComponent {...{...defaultProps, onTransfer: undefined}} />);
      expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();

      // Test mute button presence based on muteUnmute flag
      rerender(<CallControlConsultComponent {...{...defaultProps, muteUnmute: false}} />);
      expect(screen.queryByTestId('mute-consult-btn')).not.toBeInTheDocument();

      rerender(<CallControlConsultComponent {...{...defaultProps, muteUnmute: true}} />);
      expect(screen.getByTestId('mute-consult-btn')).toBeInTheDocument();
      unmount();
    });

    it('should apply correct CSS classes and states', () => {
      const {rerender, unmount} = render(<CallControlConsultComponent {...defaultProps} />);

      // Test muted state CSS
      const muteBtn = screen.getByTestId('mute-consult-btn');
      expect(muteBtn).toHaveClass('call-control-button');

      rerender(<CallControlConsultComponent {...{...defaultProps, isMuted: true}} />);
      const mutedBtn = screen.getByTestId('mute-consult-btn');
      expect(mutedBtn).toHaveClass('call-control-button-muted');

      // Test transfer button CSS
      const transferBtn = screen.getByTestId('transfer-consult-btn');
      expect(transferBtn).toHaveClass('call-control-button');

      // Test cancel button CSS
      const cancelBtn = screen.getByTestId('cancel-consult-btn');
      expect(cancelBtn).toHaveClass('call-control-consult-button-cancel');
      unmount();
    });
  });

  describe('Edge Cases and Conditional Logic', () => {
    it('should handle missing onTransfer prop gracefully', () => {
      const {unmount} = render(<CallControlConsultComponent {...{...defaultProps, onTransfer: undefined}} />);

      // Transfer button should not be visible
      expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();
      unmount();
    });

    it('should handle button tooltip content correctly', () => {
      const {rerender, unmount} = render(<CallControlConsultComponent {...defaultProps} />);

      // Check tooltips are rendered (content is in TooltipNext)
      expect(screen.getByText('Transfer Consult')).toBeInTheDocument();
      expect(screen.getByText('End Consult')).toBeInTheDocument();
      expect(screen.getByText('Mute')).toBeInTheDocument(); // Actual tooltip text from constants

      // Test muted tooltip
      rerender(<CallControlConsultComponent {...{...defaultProps, isMuted: true}} />);
      expect(screen.getByText('Unmute')).toBeInTheDocument(); // Actual tooltip text from constants
      unmount();
    });

    it('should handle all button states combinations', () => {
      // Test all buttons visible
      const {unmount} = render(<CallControlConsultComponent {...defaultProps} />);
      expect(screen.getByTestId('mute-consult-btn')).toBeInTheDocument();
      expect(screen.getByTestId('transfer-consult-btn')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();
      unmount();

      // Test only cancel button (minimal config)
      const {unmount: unmount2} = render(
        <CallControlConsultComponent
          {...{
            ...defaultProps,
            muteUnmute: false,
            isAgentBeingConsulted: false,
            onTransfer: undefined,
          }}
        />
      );
      expect(screen.queryByTestId('mute-consult-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('transfer-consult-btn')).not.toBeInTheDocument();
      expect(screen.getByTestId('cancel-consult-btn')).toBeInTheDocument();
      unmount2();
    });
  });

  describe('Error Handling', () => {
    it('should handle button error scenarios and log appropriately', async () => {
      // Test mute toggle error with logging (this one doesn't throw, just logs)
      const errorMuteToggle = jest.fn().mockImplementation(() => {
        throw new Error('Mute failed');
      });

      const {unmount} = render(
        <CallControlConsultComponent {...{...defaultProps, onToggleConsultMute: errorMuteToggle}} />
      );
      const muteBtn = screen.getByTestId('mute-consult-btn');

      await act(async () => {
        fireEvent.click(muteBtn);
      });

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Mute toggle failed:'),
        expect.objectContaining({
          module: 'call-control-consult.tsx',
          method: 'handleConsultMuteToggle',
        })
      );

      // Button should still be re-enabled after timeout even with error
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(muteBtn).not.toBeDisabled();
      });
      unmount();
    });
  });
});
