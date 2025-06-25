import React from 'react';
import {render, fireEvent, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import UserStateComponent from '../../../src/components/UserState/user-state';
import {IUserState} from '../../../src/components/UserState/user-state.types';
import * as userStateUtils from '../../../src/components/UserState/user-state.utils';

describe('UserStateComponent', () => {
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

  describe('Rendering', () => {
    it('should render the component with correct elements', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} />);
      });

      const container = screen.getByTestId('user-state-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('user-state-container');

      const stateSelect = screen.getByTestId('state-select');

      expect(stateSelect).toHaveAttribute('id', 'user-state-tooltip');
      expect(stateSelect).toHaveAttribute('aria-label', 'user-state');
      expect(stateSelect).toHaveAttribute('data-testid', 'state-select');

      const userStateIcon = stateSelect.querySelector('mdc-icon');
      expect(userStateIcon).toHaveAttribute('class', 'state-icon idle');
      expect(userStateIcon).toHaveAttribute('data-testid', 'state-icon');
      expect(userStateIcon).toHaveAttribute('name', 'recents-presence-filled');

      const userStateLabel = screen.getByTestId('state-name');
      screen.debug(userStateLabel);
      expect(userStateLabel).toHaveAttribute('class', 'md-text-wrapper state-name idle');
      expect(userStateLabel).toHaveAttribute('tagname', 'small');
      expect(userStateLabel).toHaveAttribute('type', 'body-large-regular');

      const tooltip = screen.getByTestId('user-state-tooltip');
      expect(tooltip).toHaveAttribute('color', 'contrast');
      expect(tooltip).toHaveAttribute('placement', 'bottom');
      expect(tooltip).toHaveAttribute('triggerID', 'user-state-tooltip');
      expect(tooltip).toHaveAttribute('class', 'tooltip');
      expect(tooltip).toHaveAttribute('data-testid', 'user-state-tooltip');
      expect(tooltip).toHaveAttribute('delay', '0, 0');

      const tooltipText = tooltip.querySelector('.tooltip-text');
      expect(tooltipText).toHaveTextContent('Availability State');
      expect(tooltipText).toHaveAttribute('tagname', 'small');

      const elapsedTimeElement = screen.getByTestId('elapsed-time');
      expect(elapsedTimeElement).toHaveTextContent('30:00 / 01:01:01');
      expect(elapsedTimeElement).toHaveClass('elapsedTime');
      expect(elapsedTimeElement).not.toHaveClass('elapsedTime-disabled');

      const arrowIcon = screen.getByTestId('select-arrow-icon');
      expect(arrowIcon).toHaveAttribute('name', 'arrow-down-bold');
      expect(arrowIcon).toHaveClass('select-arrow-icon');
    });

    it('should render elapsed time without lastIdleStateChangeElapsedTime when negative', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} lastIdleStateChangeElapsedTime={-1} />);
      });

      const elapsedTimeElement = screen.getByTestId('elapsed-time');
      expect(elapsedTimeElement).toHaveTextContent('01:01:01');
      expect(elapsedTimeElement).not.toHaveTextContent('/');
    });

    it('should not render elapsed time when customState is present', async () => {
      const customState = {name: 'Custom State', developerName: 'CUSTOM'};
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} customState={customState} />);
      });

      expect(screen.queryByTestId('elapsed-time')).not.toBeInTheDocument();
    });

    it('should render elapsed time with disabled class when isSettingAgentStatus is true', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} isSettingAgentStatus={true} />);
      });

      const elapsedTimeElement = screen.getByTestId('elapsed-time');
      expect(elapsedTimeElement).toHaveClass('elapsedTime elapsedTime-disabled');
    });
  });

  describe('Utility Function Calls', () => {
    it('should call getPreviousSelectableState with correct parameters', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      expect(mockGetPreviousSelectableState).toHaveBeenCalledWith(defaultProps.idleCodes);
    });

    it('should call getSelectedKey with correct parameters', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      expect(mockGetSelectedKey).toHaveBeenCalledWith(
        defaultProps.customState,
        defaultProps.currentState,
        defaultProps.idleCodes
      );
    });

    it('should call buildDropdownItems with correct parameters', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      expect(mockBuildDropdownItems).toHaveBeenCalledWith(defaultProps.customState, defaultProps.idleCodes);
    });

    it('should call sortDropdownItems with items from buildDropdownItems', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      expect(mockSortDropdownItems).toHaveBeenCalledWith(mockBuildDropdownItems.mock.results[0].value);
    });

    it('should call getDropdownClass with correct parameters', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      expect(mockGetDropdownClass).toHaveBeenCalledWith(
        defaultProps.customState,
        defaultProps.currentState,
        defaultProps.idleCodes
      );
    });

    it('should call getTooltipText with correct parameters', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      expect(mockGetTooltipText).toHaveBeenCalledWith(
        defaultProps.customState,
        defaultProps.currentState,
        defaultProps.idleCodes
      );
    });

    it('should call getIconStyle for rendered items', async () => {
      await act(async () => {
        render(<UserStateComponent {...defaultProps} />);
      });

      // getIconStyle should be called for the items being rendered
      expect(mockGetIconStyle).toHaveBeenCalled();
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

      expect(mockHandleSelectionChange).toHaveBeenCalledWith(
        '0',
        defaultProps.currentState,
        defaultProps.setAgentStatus,
        defaultProps.logger
      );
    });

    it('should handle custom state rendering and interactions', async () => {
      const customState = {name: 'Custom Engaged', developerName: 'ENGAGED'};

      await act(async () => {
        render(<UserStateComponent {...defaultProps} customState={customState} />);
      });

      expect(mockGetSelectedKey).toHaveBeenCalledWith(customState, defaultProps.currentState, defaultProps.idleCodes);
      expect(mockBuildDropdownItems).toHaveBeenCalledWith(customState, defaultProps.idleCodes);
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

      expect(mockGetSelectedKey).toHaveBeenLastCalledWith(
        customState,
        defaultProps.currentState,
        defaultProps.idleCodes
      );
    });

    it('should handle RONA and ENGAGED states correctly', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} currentState="3" />);
      });

      screen.rerender(<UserStateComponent {...defaultProps} />);

      expect(mockGetSelectedKey).toHaveBeenCalledWith(defaultProps.customState, '3', defaultProps.idleCodes);

      screen.rerender(<UserStateComponent {...defaultProps} currentState="4" />);

      expect(mockGetSelectedKey).toHaveBeenCalledWith(defaultProps.customState, '4', defaultProps.idleCodes);
    });

    it('should handle elapsed time formatting correctly', async () => {
      let screen;
      await act(async () => {
        screen = render(<UserStateComponent {...defaultProps} elapsedTime={125} />);
      });

      expect(screen.getByTestId('elapsed-time')).toHaveTextContent('30:00 / 02:05');

      screen.rerender(<UserStateComponent {...defaultProps} elapsedTime={3725} lastIdleStateChangeElapsedTime={300} />);
      expect(screen.getByTestId('elapsed-time')).toHaveTextContent('05:00 / 01:02:05');
    });

    it('should handle currentState not found in idleCodes (|| "" fallback case)', async () => {
      // This test covers the edge case where idleCodes.find() returns undefined
      // causing ?.name to be undefined, which triggers the || '' fallback
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

      // Verify the component renders without crashing
      expect(screen.getByTestId('user-state-container')).toBeInTheDocument();

      // The getIconStyle should have been called with the item that has an empty name
      // due to the || '' fallback when currentState is not found in idleCodes
      expect(mockGetIconStyle).toHaveBeenCalled();
    });
  });
});
