import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, act} from '@testing-library/react';
import UserStateComponent from '../../../src/components/UserState/user-state';
import {IUserState, AgentUserState} from '../../../src/components/UserState/user-state.types';
import {userStateLabels} from '../../../src/components/UserState/constant';
import {formatTime} from '../../../src/utils';

describe('UserState Component', () => {
  const mockIdleCodes = [
    {id: '0', name: AgentUserState.Available},
    {id: '1', name: 'Break'},
    {id: '2', name: 'Meeting'},
    {id: '3', name: AgentUserState.RONA},
  ];

  const mockCustomState = {
    name: 'Custom State',
    developerName: 'ENGAGED',
    id: 'custom-1',
  };

  const props: IUserState = {
    idleCodes: mockIdleCodes,
    setAgentStatus: jest.fn(),
    isSettingAgentStatus: false,
    errorMessage: '',
    elapsedTime: 300, // 5 minutes
    lastIdleStateChangeElapsedTime: 180, // 3 minutes
    currentState: '0',
    customState: undefined,
    currentTheme: 'light',
    onStateChange: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component correctly', async () => {
      render(<UserStateComponent {...props} />);

      await act(async () => {
        expect(screen.getByTestId('user-state-container')).toBeInTheDocument();
        expect(screen.getByTestId('state-select')).toBeInTheDocument();
        expect(screen.getByTestId('elapsed-time')).toHaveTextContent('03:00 / 05:00');
        expect(screen.getByTestId('select-arrow-icon')).toBeInTheDocument();
      });
    });

    it('renders all idle codes in dropdown', async () => {
      let container;
      await act(async () => {
        const result = render(<UserStateComponent {...props} />);
        container = result.container;
      });

      await act(async () => {
        const stateSelect = container.querySelector('[data-testid="state-select"]');
        if (!stateSelect) {
          throw new Error('State select element not found');
        }
        fireEvent.click(stateSelect);
      });

      await act(async () => {
        const stateItems = screen.getAllByTestId(/^state-item-/);
        expect(stateItems.map((item) => item.getAttribute('data-testid').replace('state-item-', ''))).toEqual([
          'Available',
          'Break',
          'Meeting',
        ]);
      });

      // RONA should not be in dropdown unless it's current state
      expect(screen.queryByText('RONA')).not.toBeInTheDocument();
    });

    it('renders with custom state', async () => {
      render(<UserStateComponent {...props} customState={mockCustomState} />);

      await act(async () => {
        expect(screen.getByTestId('user-state-container')).toHaveClass('user-state-container');
        expect(screen.getByTestId('state-icon')).toHaveClass('state-icon custom');

        expect(screen.queryByTestId('elapsed-time')).not.toBeInTheDocument();
      });
    });

    it('renders with RONA state when current', async () => {
      render(<UserStateComponent {...props} currentState="3" />);

      await act(async () => {
        expect(screen.getByTestId('user-state-container')).toHaveClass('user-state-container');
        expect(screen.getByTestId('state-icon')).toHaveClass('state-icon rona');
        const stateNames = screen.getAllByTestId('state-name');
        expect(stateNames.map((el) => el.textContent)).toContain('RONA');
      });
    });

    it('renders with idle state', async () => {
      render(<UserStateComponent {...props} currentState="1" />);

      await act(async () => {
        expect(screen.getByTestId('user-state-container')).toHaveClass('user-state-container');
        expect(screen.getByTestId('state-icon')).toHaveClass('state-icon idle');
      });
    });

    it('formats elapsed time correctly', async () => {
      render(<UserStateComponent {...props} />);

      await act(async () => {
        expect(screen.getByTestId('elapsed-time')).toHaveTextContent(
          `${formatTime(props.lastIdleStateChangeElapsedTime)} / ${formatTime(props.elapsedTime)}`
        );
      });
    });

    it('shows only total time when lastIdleStateChangeElapsedTime is negative', async () => {
      render(<UserStateComponent {...props} lastIdleStateChangeElapsedTime={-1} />);

      await act(async () => {
        expect(screen.getByTestId('elapsed-time')).toHaveTextContent(formatTime(props.elapsedTime));
      });
    });

    it('disables elapsed time during status change', async () => {
      render(<UserStateComponent {...props} isSettingAgentStatus={true} />);

      await act(async () => {
        expect(screen.getByTestId('elapsed-time')).toHaveClass('elapsedTime-disabled');
      });
    });
  });

  describe('Actions', () => {
    it('calls setAgentStatus when selecting a new state', async () => {
      let container;
      await act(async () => {
        const result = render(<UserStateComponent {...props} />);
        container = result.container;
      });

      await act(async () => {
        // Click to open dropdown
        const stateSelect = container.querySelector('[data-testid="state-select"]');
        if (!stateSelect) {
          throw new Error('State select element not found');
        }
        fireEvent.click(stateSelect);
      });

      let breakOption;
      await act(async () => {
        breakOption = await screen.findByTestId('state-item-Break');
      });

      await act(async () => {
        fireEvent.click(breakOption);
      });

      await act(async () => {
        expect(props.setAgentStatus).toHaveBeenCalledWith('1');
      });
    });

    it('shows correct tooltip text for available state', async () => {
      render(<UserStateComponent {...props} />);

      await act(async () => {
        expect(screen.getByText(userStateLabels.availableTooltip)).toBeInTheDocument();
      });
    });

    it('shows correct tooltip text for custom state with available', async () => {
      render(<UserStateComponent {...props} customState={mockCustomState} />);

      await act(async () => {
        expect(screen.getByText(userStateLabels.customWithAvailableTooltip)).toBeInTheDocument();
      });
    });

    it('shows correct tooltip text for custom state with idle', async () => {
      render(<UserStateComponent {...props} customState={mockCustomState} currentState="1" />);

      await act(async () => {
        expect(
          screen.getByText(userStateLabels.customWithIdleStateTooltip.replace(/{{.*?}}/g, 'Break'))
        ).toBeInTheDocument();
      });
    });
  });
});
