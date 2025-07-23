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
    it('renders timer with default props', () => {
      render(<AutoWrapupTimer {...defaultProps} />);

      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
      expect(getTimerUIStateSpy).toHaveBeenCalledWith(30);
    });

    it('renders with correct DOM structure', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container.querySelector('mdc-listitem')).toBeInTheDocument();
      expect(container.querySelector('.wrapup-timer-label')).toBeInTheDocument();
      expect(container.querySelector('mdc-icon')).toBeInTheDocument();
      expect(container.querySelectorAll('mdc-text')).toHaveLength(2);
    });

    it('renders timer with various seconds values', () => {
      const testCases = [0, 5, 15, 45, 120];

      testCases.forEach((seconds) => {
        getTimerUIStateSpy.mockClear();

        const {unmount} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={seconds} />);

        expect(getTimerUIStateSpy).toHaveBeenCalledWith(seconds);
        expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Timer Display', () => {
    it('displays until auto wrapup text', () => {
      render(<AutoWrapupTimer {...defaultProps} />);

      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
    });

    it('calls getTimerUIState with correct parameters', () => {
      render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={10} />);

      expect(getTimerUIStateSpy).toHaveBeenCalledWith(10);
      expect(getTimerUIStateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Icon Display', () => {
    it('renders icon with correct slot attribute', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      const icon = container.querySelector('mdc-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('slot', 'leading-controls');
    });

    it('renders icon for different timer states', () => {
      const timerValues = [5, 30, 120];

      timerValues.forEach((seconds) => {
        const {container, unmount} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={seconds} />);

        const icon = container.querySelector('mdc-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('slot', 'leading-controls');

        unmount();
      });
    });
  });

  describe('Cancel Button', () => {
    it('renders cancel button when allowCancelAutoWrapup is true', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={true} />);

      const cancelButton = container.querySelector('mdc-button');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAttribute('slot', 'trailing-controls');
      expect(cancelButton).toHaveTextContent(CANCEL);
    });

    it('does not render cancel button when allowCancelAutoWrapup is false', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={false} />);

      const cancelButton = container.querySelector('mdc-button');
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('does not render cancel button when allowCancelAutoWrapup is undefined', () => {
      const propsWithoutCancel: AutoWrapupTimerProps = {
        secondsUntilAutoWrapup: 30,
        handleCancelWrapup: mockHandleCancelWrapup,
      };

      const {container} = render(<AutoWrapupTimer {...propsWithoutCancel} />);

      const cancelButton = container.querySelector('mdc-button');
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('calls handleCancelWrapup when cancel button is clicked', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={true} />);

      const cancelButton = container.querySelector('mdc-button');
      fireEvent.click(cancelButton!);

      expect(mockHandleCancelWrapup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Integration', () => {
    it('integrates with getTimerUIState utility function', () => {
      render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={15} />);

      expect(getTimerUIStateSpy).toHaveBeenCalledWith(15);
      expect(getTimerUIStateSpy).toHaveBeenCalledTimes(1);
    });

    it('renders complete component with cancel button enabled', () => {
      const completeProps: AutoWrapupTimerProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 25,
        allowCancelAutoWrapup: true,
      };

      const {container} = render(<AutoWrapupTimer {...completeProps} />);

      expect(container.querySelector('mdc-listitem')).toBeInTheDocument();
      expect(container.querySelector('mdc-icon')).toBeInTheDocument();
      expect(container.querySelector('.wrapup-timer-label')).toBeInTheDocument();
      expect(container.querySelector('mdc-button')).toBeInTheDocument();
      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
      expect(screen.getByText(CANCEL)).toBeInTheDocument();
    });

    it('renders complete component without cancel button', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container.querySelector('mdc-listitem')).toBeInTheDocument();
      expect(container.querySelector('mdc-icon')).toBeInTheDocument();
      expect(container.querySelector('.wrapup-timer-label')).toBeInTheDocument();
      expect(container.querySelector('mdc-button')).not.toBeInTheDocument();
      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
    });
  });

  describe('Slot Attributes', () => {
    it('applies correct slot attributes to elements', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={true} />);

      const icon = container.querySelector('mdc-icon');
      const timerLabel = container.querySelector('.wrapup-timer-label');
      const texts = container.querySelectorAll('mdc-text');
      const button = container.querySelector('mdc-button');

      expect(icon).toHaveAttribute('slot', 'leading-controls');
      expect(timerLabel).toHaveAttribute('slot', 'leading-controls');
      expect(texts[0]).toHaveAttribute('slot', 'leading-controls');
      expect(texts[1]).toHaveAttribute('slot', 'leading-controls');
      expect(button).toHaveAttribute('slot', 'trailing-controls');
    });

    it('applies correct slot attributes without cancel button', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={false} />);

      const icon = container.querySelector('mdc-icon');
      const timerLabel = container.querySelector('.wrapup-timer-label');
      const texts = container.querySelectorAll('mdc-text');

      expect(icon).toHaveAttribute('slot', 'leading-controls');
      expect(timerLabel).toHaveAttribute('slot', 'leading-controls');
      expect(texts[0]).toHaveAttribute('slot', 'leading-controls');
      expect(texts[1]).toHaveAttribute('slot', 'leading-controls');
    });
  });

  describe('Props Validation', () => {
    it('handles function props correctly', () => {
      const customCancelHandler = jest.fn();
      const propsWithCustomHandler: AutoWrapupTimerProps = {
        ...defaultProps,
        handleCancelWrapup: customCancelHandler,
        allowCancelAutoWrapup: true,
      };

      const {container} = render(<AutoWrapupTimer {...propsWithCustomHandler} />);

      const cancelButton = container.querySelector('mdc-button');
      fireEvent.click(cancelButton!);

      expect(customCancelHandler).toHaveBeenCalledTimes(1);
    });

    it('handles boolean props correctly', () => {
      const booleanTestCases: Array<{allowCancel: boolean; name: string}> = [
        {allowCancel: true, name: 'enabled'},
        {allowCancel: false, name: 'disabled'},
      ];

      booleanTestCases.forEach(({allowCancel}) => {
        const testProps: AutoWrapupTimerProps = {
          ...defaultProps,
          allowCancelAutoWrapup: allowCancel,
        };

        const {container, unmount} = render(<AutoWrapupTimer {...testProps} />);

        const cancelButton = container.querySelector('mdc-button');

        if (allowCancel) {
          expect(cancelButton).toBeInTheDocument();
        } else {
          expect(cancelButton).not.toBeInTheDocument();
        }

        unmount();
      });
    });

    it('handles number props correctly', () => {
      const numberTestCases = [0, 1, 10, 30, 60, 120];

      numberTestCases.forEach((seconds) => {
        getTimerUIStateSpy.mockClear();

        const testProps: AutoWrapupTimerProps = {
          ...defaultProps,
          secondsUntilAutoWrapup: seconds,
        };

        const {unmount} = render(<AutoWrapupTimer {...testProps} />);

        expect(getTimerUIStateSpy).toHaveBeenCalledWith(seconds);
        expect(getTimerUIStateSpy).toHaveBeenCalledTimes(1);

        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles minimum timer value', () => {
      render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={0} />);

      expect(getTimerUIStateSpy).toHaveBeenCalledWith(0);
      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
    });

    it('handles large timer values', () => {
      render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={3600} />);

      expect(getTimerUIStateSpy).toHaveBeenCalledWith(3600);
      expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();
    });

    it('handles timer state boundaries', () => {
      const boundaryValues = [9, 10, 11];

      boundaryValues.forEach((seconds) => {
        getTimerUIStateSpy.mockClear();

        const {unmount} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={seconds} />);

        expect(getTimerUIStateSpy).toHaveBeenCalledWith(seconds);

        unmount();
      });
    });

    it('handles component state with different prop combinations', () => {
      const combinations: Array<AutoWrapupTimerProps> = [
        {
          secondsUntilAutoWrapup: 5,
          allowCancelAutoWrapup: true,
          handleCancelWrapup: mockHandleCancelWrapup,
        },
        {
          secondsUntilAutoWrapup: 30,
          allowCancelAutoWrapup: false,
          handleCancelWrapup: mockHandleCancelWrapup,
        },
        {
          secondsUntilAutoWrapup: 0,
          handleCancelWrapup: mockHandleCancelWrapup,
        },
      ];

      combinations.forEach((props) => {
        getTimerUIStateSpy.mockClear();

        const {container, unmount} = render(<AutoWrapupTimer {...props} />);

        expect(getTimerUIStateSpy).toHaveBeenCalledWith(props.secondsUntilAutoWrapup);
        expect(screen.getByText(UNTIL_AUTO_WRAPUP)).toBeInTheDocument();

        const cancelButton = container.querySelector('mdc-button');
        if (props.allowCancelAutoWrapup) {
          expect(cancelButton).toBeInTheDocument();
        } else {
          expect(cancelButton).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });

  describe('Interaction Tests', () => {
    it('verifies cancel button interaction flow', () => {
      const customHandler = jest.fn();
      const {container} = render(
        <AutoWrapupTimer secondsUntilAutoWrapup={20} allowCancelAutoWrapup={true} handleCancelWrapup={customHandler} />
      );

      const cancelButton = container.querySelector('mdc-button');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveTextContent(CANCEL);

      fireEvent.click(cancelButton!);
      fireEvent.click(cancelButton!);

      expect(customHandler).toHaveBeenCalledTimes(2);
    });

    it('verifies component renders consistently across multiple renders', () => {
      const props: AutoWrapupTimerProps = {
        secondsUntilAutoWrapup: 45,
        allowCancelAutoWrapup: true,
        handleCancelWrapup: mockHandleCancelWrapup,
      };

      const {container: container1, unmount: unmount1} = render(<AutoWrapupTimer {...props} />);
      expect(container1.querySelector('mdc-listitem')).toBeInTheDocument();
      expect(container1.querySelector('mdc-button')).toBeInTheDocument();
      unmount1();

      const {container: container2, unmount: unmount2} = render(<AutoWrapupTimer {...props} />);
      expect(container2.querySelector('mdc-listitem')).toBeInTheDocument();
      expect(container2.querySelector('mdc-button')).toBeInTheDocument();
      unmount2();
    });
  });
});
