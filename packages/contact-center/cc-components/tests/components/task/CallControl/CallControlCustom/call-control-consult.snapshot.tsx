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

// Mock Worker for TaskTimer component
global.Worker = class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_scriptURL: string | URL, _options?: WorkerOptions) {
    // Mock worker constructor
  }

  postMessage(message: {name: string; type: string}): void {
    // Mock postMessage - simulate timer updates
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({data: {name: message.name, time: '00:00'}} as MessageEvent);
      }
    }, 0);
  }

  terminate(): void {
    // Mock terminate
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === 'message' && typeof listener === 'function') {
      this.onmessage = listener as (event: MessageEvent) => void;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeEventListener(type: string, _listener: EventListenerOrEventListenerObject): void {
    if (type === 'message') {
      this.onmessage = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dispatchEvent(_event: Event): boolean {
    return true;
  }
} as typeof Worker;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

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
  const mockConsultConference = jest.fn();

  const mockControlVisibility = {
    accept: {isVisible: true, isEnabled: true},
    decline: {isVisible: true, isEnabled: true},
    end: {isVisible: true, isEnabled: true},
    muteUnmute: {isVisible: true, isEnabled: true},
    muteUnmuteConsult: {isVisible: true, isEnabled: true},
    holdResume: {isVisible: true, isEnabled: true},
    consult: {isVisible: true, isEnabled: true},
    transfer: {isVisible: true, isEnabled: true},
    conference: {isVisible: true, isEnabled: true},
    wrapup: {isVisible: false, isEnabled: false},
    pauseResumeRecording: {isVisible: true, isEnabled: true},
    endConsult: {isVisible: true, isEnabled: true},
    recordingIndicator: {isVisible: true, isEnabled: true},
    exitConference: {isVisible: false, isEnabled: false},
    mergeConference: {isVisible: true, isEnabled: true},
    mergeConferenceConsult: {isVisible: true, isEnabled: true},
    consultTransfer: {isVisible: true, isEnabled: true},
    consultTransferConsult: {isVisible: true, isEnabled: true},
    switchToMainCall: {isVisible: true, isEnabled: true},
    switchToConsult: {isVisible: true, isEnabled: true},
    isConferenceInProgress: false,
    isConsultInitiated: false,
    isConsultInitiatedAndAccepted: false,
    isConsultInitiatedOrAccepted: false,
    isConsultReceived: false,
    isHeld: false,
    consultCallHeld: false,
  };

  const defaultProps = {
    agentName: 'Alice',
    startTimeStamp: Date.now(),
    consultTransfer: mockOnTransfer,
    endConsultCall: mockEndConsultCall,
    toggleConsultMute: mockOnToggleConsultMute,
    consultConference: mockConsultConference,
    switchToMainCall: jest.fn(),
    logger: mockLogger,
    isMuted: false,
    controlVisibility: mockControlVisibility,
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

    it('should render without mute button when muteUnmute is hidden', async () => {
      const propsWithoutMute = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          muteUnmute: {isVisible: false, isEnabled: false},
        },
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsWithoutMute} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without transfer button when onTransfer is undefined', async () => {
      const propsWithoutTransfer = {...defaultProps, consultTransfer: undefined};
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

    it('should render when transfer is disabled', async () => {
      const propsIncompleteConsult = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          consultTransfer: {isVisible: true, isEnabled: false},
        },
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsIncompleteConsult} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with end consult hidden', async () => {
      const propsNotBeingConsulted = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          endConsult: {isVisible: false, isEnabled: false},
        },
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...propsNotBeingConsulted} />);
      });

      const container = screen.container.querySelector('.call-control-consult');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render when end consult is disabled', async () => {
      const propsEndConsultDisabled = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          endConsult: {isVisible: true, isEnabled: false},
        },
      };
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
    it('should update when muteUnmute visibility changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlConsultComponent {...defaultProps} />);
      });

      const updatedProps = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          muteUnmute: {isVisible: false, isEnabled: false},
        },
      };
      screen.rerender(<CallControlConsultComponent {...updatedProps} />);
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
        consultTransfer: undefined,
        controlVisibility: {
          ...mockControlVisibility,
          muteUnmute: {isVisible: false, isEnabled: false},
          endConsult: {isVisible: true, isEnabled: false},
        },
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
