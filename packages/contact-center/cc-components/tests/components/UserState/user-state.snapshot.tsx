import React from 'react';
import '@testing-library/jest-dom';
import {render, fireEvent, act} from '@testing-library/react';
import {IUserState} from '../../../src/components/UserState/user-state.types';

import UserStateComponent from '../../../src/components/UserState/user-state';
import * as userStateUtils from '../../../src/components/UserState/user-state.utils';

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

describe('UserState Component Snapshots', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockSetAgentStatus = jest.fn();
  const mockOnStateChange = jest.fn();

  const defaultProps: IUserState = {
    idleCodes: [
      {id: '0', name: 'Available', isSystem: true},
      {id: '1', name: 'Break', isSystem: false},
      {id: '2', name: 'Training', isSystem: false},
      {id: '3', name: 'RONA', isSystem: true},
      {id: '4', name: 'ENGAGED', isSystem: true},
    ],
    setAgentStatus: mockSetAgentStatus,
    isSettingAgentStatus: false,
    errorMessage: '',
    elapsedTime: 3661, // 1 hour, 1 minute, 1 second
    lastIdleStateChangeElapsedTime: 1800, // 30 minutes
    currentState: '1',
    currentTheme: 'LIGHT',
    customState: null,
    onStateChange: mockOnStateChange,
    logger: mockLogger,
  };

  // Mock all utility functions
  const mockGetDropdownClass = jest.fn(() => 'idle');
  const mockGetIconStyle = jest.fn(() => ({class: 'idle', iconName: 'recents-presence-filled'}));
  const mockGetTooltipText = jest.fn(() => 'Availability State');
  const mockHandleSelectionChange = jest.fn();
  const mockSortDropdownItems = jest.fn((items) => items);
  const mockGetPreviousSelectableState = jest.fn(() => '0');
  const mockGetSelectedKey = jest.fn(() => '1');
  const mockBuildDropdownItems = jest.fn(() => [
    {id: '0', name: 'Available'},
    {id: '1', name: 'Break'},
    {id: '2', name: 'Training'},
  ]);

  beforeEach(() => {
    // Mock all utility functions
    jest.spyOn(userStateUtils, 'getDropdownClass').mockImplementation(mockGetDropdownClass);
    jest.spyOn(userStateUtils, 'getIconStyle').mockImplementation(mockGetIconStyle);
    jest.spyOn(userStateUtils, 'getTooltipText').mockImplementation(mockGetTooltipText);
    jest.spyOn(userStateUtils, 'handleSelectionChange').mockImplementation(mockHandleSelectionChange);
    jest.spyOn(userStateUtils, 'sortDropdownItems').mockImplementation(mockSortDropdownItems);
    jest.spyOn(userStateUtils, 'getPreviousSelectableState').mockImplementation(mockGetPreviousSelectableState);
    jest.spyOn(userStateUtils, 'getSelectedKey').mockImplementation(mockGetSelectedKey);
    jest.spyOn(userStateUtils, 'buildDropdownItems').mockImplementation(mockBuildDropdownItems);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Rendering - Tests for UI elements and visual states of UserState component', () => {
    it('should render the component with correct elements', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render elapsed time without lastIdleStateChangeElapsedTime when negative', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} lastIdleStateChangeElapsedTime={-1} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should not render elapsed time when customState is present', async () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} customState={customState} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render elapsed time with disabled class when isSettingAgentStatus is true', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} isSettingAgentStatus={true} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Interactions', () => {
    it('should call handleSelectionChange when an option is selected', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} />);
      });
      const select = screen.getByTestId('state-select').parentElement?.querySelector('select');
      fireEvent.change(select, {target: {value: '0'}});

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle custom state rendering and interactions', async () => {
      let screen;
      const customState = {name: 'Custom Engaged', developerName: 'ENGAGED'};

      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} customState={customState} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('State Management', () => {
    it('should update when customState changes', async () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};

      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} />);
      });

      screen.rerender(<UserStateComponent {...defaultProps} customState={customState} />);
      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle RONA and ENGAGED states correctly', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} currentState="3" />);
      });

      screen.rerender(<UserStateComponent {...defaultProps} />);

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();

      screen.rerender(<UserStateComponent {...defaultProps} currentState="4" />);
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle elapsed time formatting correctly', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} elapsedTime={125} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();

      screen.rerender(<UserStateComponent {...defaultProps} elapsedTime={3725} lastIdleStateChangeElapsedTime={300} />);
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle currentState not found in idleCodes (|| "" fallback case)', async () => {
      const propsWithMissingCurrentState = {
        ...defaultProps,
        currentState: 'nonexistent-id', // This ID doesn't exist in idleCodes
        idleCodes: [
          {id: '0', name: 'Available', isSystem: true},
          {id: '1', name: 'Break', isSystem: false},
        ],
      };

      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...propsWithMissingCurrentState} />);
      });

      const container = screen.getByTestId('user-state-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
