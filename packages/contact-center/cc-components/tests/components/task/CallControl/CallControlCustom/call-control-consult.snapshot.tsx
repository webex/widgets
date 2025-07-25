import React from 'react';
import '@testing-library/jest-dom';
import {render, fireEvent, act} from '@testing-library/react';
import CallControlConsultComponent from '../../../../../src/components/task/CallControl/CallControlCustom/call-control-consult';

const mockUIDProps = (container) => {
  container
    .querySelectorAll('[id^="mdc-input"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-input-id'));
  container
    .querySelectorAll('[id^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-tooltip-id'));
  container
    .querySelectorAll('[aria-describedby^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('aria-describedby', 'mock-aria-describedby'));
};

// Mock the TaskTimer component to provide consistent snapshots
// eslint-disable-next-line react/display-name
jest.mock('../../../../../src/components/task/TaskTimer', () => () => <span data-testid="TaskTimer">00:00</span>);

describe('CallControlConsultComponent Snapshots', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };

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
    logger: mockLogger,
    muteUnmute: true,
    isMuted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Tests for UI elements and visual states of CallControlConsult component', () => {
    it('should render the component with all control buttons', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with muted state', async () => {
      const mutedProps = {...defaultProps, isMuted: true};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...mutedProps} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without mute button when muteUnmute is false', async () => {
      const propsWithoutMute = {...defaultProps, muteUnmute: false};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsWithoutMute} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without transfer button when onTransfer is undefined', async () => {
      const propsWithoutTransfer = {...defaultProps, onTransfer: undefined};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsWithoutTransfer} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with different agent name', async () => {
      const propsWithDifferentAgent = {...defaultProps, agentName: 'Bob Johnson'};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsWithDifferentAgent} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render when consultCompleted is false', async () => {
      const propsIncompleteConsult = {...defaultProps, consultCompleted: false};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsIncompleteConsult} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render when isAgentBeingConsulted is false', async () => {
      const propsNotBeingConsulted = {...defaultProps, isAgentBeingConsulted: false};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsNotBeingConsulted} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render when isEndConsultEnabled is false', async () => {
      const propsEndConsultDisabled = {...defaultProps, isEndConsultEnabled: false};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsEndConsultDisabled} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Interactions', () => {
    it('should call mockOnToggleConsultMute when mute button is clicked', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      const muteButton = screen.getByTestId('mute-consult-btn');
      fireEvent.click(muteButton);

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should call mockOnTransfer when transfer button is clicked', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      const transferButton = screen.getByTestId('transfer-consult-btn');
      fireEvent.click(transferButton);

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should call mockEndConsultCall when cancel button is clicked', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      const cancelButton = screen.getByTestId('cancel-consult-btn');
      fireEvent.click(cancelButton);

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('State Management', () => {
    it('should update when muteUnmute prop changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      screen.rerender(<CallControlConsultComponent {...defaultProps} muteUnmute={false} />);
      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when isMuted prop changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      screen.rerender(<CallControlConsultComponent {...defaultProps} isMuted={true} />);
      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle combination of props: no mute, no transfer, disabled end consult', async () => {
      const complexProps = {
        ...defaultProps,
        muteUnmute: false,
        onTransfer: undefined,
        isEndConsultEnabled: false,
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...complexProps} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle edge case with empty agent name', async () => {
      const propsEmptyAgent = {...defaultProps, agentName: ''};
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsEmptyAgent} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
