import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import AutoWrapupTimer from '../../../../src/components/task/AutoWrapupTimer/AutoWrapupTimer';
import {AutoWrapupTimerProps} from '../../../../src/components/task/task.types';
import * as autoWrapupUtils from '../../../../src/components/task/AutoWrapupTimer/AutoWrapupTimer.utils';
import {UNTIL_AUTO_WRAPUP, CANCEL} from '../../../../src/components/task/constants';

describe('AutoWrapupTimer', () => {
  const mockHandleCancelWrapup = jest.fn();

  const defaultProps: AutoWrapupTimerProps = {
    secondsUntilAutoWrapup: 30,
    allowCancelAutoWrapup: false,
    handleCancelWrapup: mockHandleCancelWrapup,
  };

  const getTimerUIStateSpy = jest.spyOn(autoWrapupUtils, 'getTimerUIState');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    getTimerUIStateSpy.mockRestore();
  });

  describe('Rendering', () => {
    it('should display timer states and elements correctly across normal, urgent, and zero second scenarios', async () => {
      // Normal state (30 seconds, no cancel button)
      const {container: normalContainer, unmount: unmountNormal} = await render(<AutoWrapupTimer {...defaultProps} />);

      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
      expect(screen.getByText('00:30')).toBeInTheDocument();
      expect(getTimerUIStateSpy).toHaveBeenCalledWith(30);

      const normalListItem = normalContainer.querySelector('mdc-listitem');
      const normalIcon = normalContainer.querySelector('mdc-icon');
      const normalTimerLabel = normalContainer.querySelector('.wrapup-timer-label');
      const normalTexts = normalContainer.querySelectorAll('mdc-text');

      expect(normalListItem).toHaveClass('wrapup-timer-container');
      expect(normalListItem).not.toHaveClass('urgent');
      expect(normalIcon).toHaveClass('wrapup-timer-icon');
      expect(normalIcon).not.toHaveClass('urgent');
      expect(normalIcon).toHaveAttribute('name', 'recents-bold');
      expect(normalIcon).toHaveAttribute('slot', 'leading-controls');
      expect(normalTimerLabel).toHaveAttribute('slot', 'leading-controls');
      expect(normalTexts).toHaveLength(2);
      expect(normalTexts[0]).toHaveAttribute('type', 'body-large-bold');
      expect(normalTexts[1]).toHaveAttribute('type', 'body-large-regular');
      expect(normalContainer.querySelector('mdc-button')).not.toBeInTheDocument();

      unmountNormal();

      // Urgent state (5 seconds, with cancel button)
      const urgentProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 5,
        allowCancelAutoWrapup: true,
      };

      const {container: urgentContainer, unmount: unmountUrgent} = await render(<AutoWrapupTimer {...urgentProps} />);

      expect(screen.getByText('00:05')).toBeInTheDocument();
      expect(screen.getByText(CANCEL)).toBeInTheDocument();
      expect(getTimerUIStateSpy).toHaveBeenCalledWith(5);

      const urgentListItem = urgentContainer.querySelector('mdc-listitem');
      const urgentIcon = urgentContainer.querySelector('mdc-icon');
      const urgentButton = urgentContainer.querySelector('mdc-button');

      expect(urgentListItem).toHaveClass('wrapup-timer-container', 'urgent');
      expect(urgentIcon).toHaveClass('wrapup-timer-icon', 'urgent');
      expect(urgentIcon).toHaveAttribute('name', 'alert-active-bold');
      expect(urgentButton).toBeInTheDocument();
      expect(urgentButton).toHaveAttribute('slot', 'trailing-controls');
      expect(urgentButton).toHaveAttribute('variant', 'secondary');
      expect(urgentButton).toHaveAttribute('role', 'button');
      expect(urgentButton).toHaveAttribute('size', '32');
      expect(urgentButton).toHaveAttribute('color', 'default');
      expect(urgentButton).toHaveAttribute('type', 'button');
      expect(urgentButton).toHaveAttribute('tabindex', '0');

      unmountUrgent();

      // Edge case: Zero seconds with cancel button
      const zeroProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 0,
        allowCancelAutoWrapup: true,
      };

      const {container: zeroContainer} = await render(<AutoWrapupTimer {...zeroProps} />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(getTimerUIStateSpy).toHaveBeenCalledWith(0);

      const zeroListItem = zeroContainer.querySelector('mdc-listitem');
      const zeroIcon = zeroContainer.querySelector('mdc-icon');
      const zeroButton = zeroContainer.querySelector('mdc-button');

      expect(zeroListItem).toHaveClass('wrapup-timer-container', 'urgent');
      expect(zeroIcon).toHaveAttribute('name', 'alert-active-bold');
      expect(zeroButton).toBeInTheDocument();
      expect(zeroButton).toHaveAttribute('variant', 'secondary');
      expect(zeroButton).toHaveAttribute('color', 'default');
      expect(zeroButton).toHaveAttribute('size', '32');
      expect(zeroButton).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Actions', () => {
    it('should trigger callback and maintain component stability on cancel button interactions', async () => {
      const interactionProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 3,
        allowCancelAutoWrapup: true,
      };

      const {container} = await render(<AutoWrapupTimer {...interactionProps} />);

      expect(screen.getByText('00:03')).toBeInTheDocument();
      expect(screen.getByText(CANCEL)).toBeInTheDocument();
      expect(mockHandleCancelWrapup).toHaveBeenCalledTimes(0);

      const cancelButton = container.querySelector('mdc-button');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAttribute('variant', 'secondary');
      expect(cancelButton).toHaveAttribute('slot', 'trailing-controls');

      // Single click interaction
      fireEvent.click(cancelButton!);

      expect(mockHandleCancelWrapup).toHaveBeenCalledTimes(1);
      expect(screen.getByText('00:03')).toBeInTheDocument();
      expect(screen.getByText(CANCEL)).toBeInTheDocument();

      const listItemAfterClick = container.querySelector('mdc-listitem');
      const iconAfterClick = container.querySelector('mdc-icon');
      const buttonAfterClick = container.querySelector('mdc-button');

      expect(listItemAfterClick).toHaveClass('wrapup-timer-container', 'urgent');
      expect(iconAfterClick).toHaveAttribute('name', 'alert-active-bold');
      expect(buttonAfterClick).toBeInTheDocument();

      // Multiple clicks to test stability
      fireEvent.click(buttonAfterClick!);
      fireEvent.click(buttonAfterClick!);

      expect(mockHandleCancelWrapup).toHaveBeenCalledTimes(3);

      // Verify DOM stability after interactions
      expect(container.querySelector('mdc-listitem')).toBeInTheDocument();
      expect(container.querySelector('mdc-icon')).toBeInTheDocument();
      expect(container.querySelector('mdc-button')).toBeInTheDocument();
      expect(container.querySelector('.wrapup-timer-label')).toBeInTheDocument();
      expect(container.querySelectorAll('mdc-text')).toHaveLength(2);
    });
  });
});
