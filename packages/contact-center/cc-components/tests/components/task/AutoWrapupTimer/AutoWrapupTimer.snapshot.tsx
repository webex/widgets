import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import AutoWrapupTimer from '../../../../src/components/task/AutoWrapupTimer/AutoWrapupTimer';
import {AutoWrapupTimerProps} from '../../../../src/components/task/task.types';
import * as autoWrapupUtils from '../../../../src/components/task/AutoWrapupTimer/AutoWrapupTimer.utils';

describe('AutoWrapupTimer Snapshots', () => {
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
      expect(normalContainer).toMatchSnapshot();

      unmountNormal();

      // Urgent state (5 seconds, with cancel button)
      const urgentProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 5,
        allowCancelAutoWrapup: true,
      };

      const {container: urgentContainer, unmount: unmountUrgent} = await render(<AutoWrapupTimer {...urgentProps} />);
      expect(urgentContainer).toMatchSnapshot();

      unmountUrgent();

      // Edge case: Zero seconds with cancel button
      const zeroProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 0,
        allowCancelAutoWrapup: true,
      };

      const {container: zeroContainer} = await render(<AutoWrapupTimer {...zeroProps} />);
      expect(zeroContainer).toMatchSnapshot();
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
      expect(container).toMatchSnapshot();

      const cancelButton = container.querySelector('mdc-button');

      // Single click interaction
      fireEvent.click(cancelButton!);
      expect(container).toMatchSnapshot();

      const buttonAfterClick = container.querySelector('mdc-button');

      // Multiple clicks to test stability
      fireEvent.click(buttonAfterClick!);
      fireEvent.click(buttonAfterClick!);
      expect(container).toMatchSnapshot();
    });
  });
});
