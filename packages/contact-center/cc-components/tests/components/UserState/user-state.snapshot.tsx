import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, act} from '@testing-library/react';
import UserStateComponent from '../../../src/components/UserState/user-state';
import {IUserState, AgentUserState} from '../../../src/components/UserState/user-state.types';

describe('UserState Component Snapshot', () => {
  const normalizeIds = (container: HTMLElement) => {
    // Normalize all mdc-tooltip IDs including those with UUIDs
    container.querySelectorAll('[id*="mdc-tooltip"]').forEach((el) => {
      console.log('Normalizing tooltip ID:', el.id);
      el.setAttribute('id', 'mdc-tooltip-test');
    });

    // Normalize all aria-describedby attributes referencing tooltips
    container.querySelectorAll('[aria-describedby]').forEach((el) => {
      if (el.getAttribute('aria-describedby')?.includes('mdc-tooltip')) {
        el.setAttribute('aria-describedby', 'mdc-tooltip-test');
      }
    });

    // Normalize input IDs
    container.querySelectorAll('[id^="mdc-input"]').forEach((el) => {
      el.setAttribute('id', 'mdc-input-test');
    });
  };

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
    it('renders correctly and matches snapshot', async () => {
      const {container} = render(<UserStateComponent {...props} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly with custom state', async () => {
      const {container} = render(<UserStateComponent {...props} customState={mockCustomState} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly with RONA state', async () => {
      const {container} = render(<UserStateComponent {...props} currentState="3" />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly with idle state', async () => {
      const {container} = render(<UserStateComponent {...props} currentState="1" />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Actions', () => {
    it('renders correctly when selecting a new state', async () => {
      const {container} = render(<UserStateComponent {...props} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const stateSelect = screen.getByTestId('state-select');

      await act(async () => {
        fireEvent(stateSelect, new CustomEvent('selectionChange', {detail: {value: '1'}}));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly when setting agent status', async () => {
      const {container} = render(<UserStateComponent {...props} isSettingAgentStatus={true} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly with negative elapsed time', async () => {
      const {container} = render(<UserStateComponent {...props} lastIdleStateChangeElapsedTime={-1} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('State Changes', () => {
    it('renders correctly when changing from available to idle', async () => {
      const {container, rerender} = render(<UserStateComponent {...props} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender(<UserStateComponent {...props} currentState="1" />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly when changing from available to RONA', async () => {
      const {container, rerender} = render(<UserStateComponent {...props} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender(<UserStateComponent {...props} currentState="3" />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });

    it('renders correctly when changing to custom state', async () => {
      const {container, rerender} = render(<UserStateComponent {...props} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      rerender(<UserStateComponent {...props} customState={mockCustomState} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      normalizeIds(container);
      expect(container).toMatchSnapshot();
    });
  });
});
