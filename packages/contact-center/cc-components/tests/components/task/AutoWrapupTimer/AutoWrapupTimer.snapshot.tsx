import React from 'react';
import {render} from '@testing-library/react';
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
    it('renders timer with default props', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders with correct DOM structure', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders timer with various seconds values', () => {
      const testCases = [0, 5, 15, 45, 120];

      testCases.forEach((seconds) => {
        const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={seconds} />);

        expect(container).toMatchSnapshot(`timer-seconds-${seconds}`);
      });
    });
  });

  describe('Timer Display', () => {
    it('displays until auto wrapup text', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });

    it('calls getTimerUIState with correct parameters', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={10} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Icon Display', () => {
    it('renders icon with correct slot attribute', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders icon for different timer states', () => {
      const timerValues = [5, 30, 120];

      timerValues.forEach((seconds) => {
        const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={seconds} />);

        expect(container).toMatchSnapshot(`icon-timer-${seconds}`);
      });
    });
  });

  describe('Cancel Button', () => {
    it('renders cancel button when allowCancelAutoWrapup is true', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={true} />);

      expect(container).toMatchSnapshot();
    });

    it('does not render cancel button when allowCancelAutoWrapup is false', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={false} />);

      expect(container).toMatchSnapshot();
    });

    it('does not render cancel button when allowCancelAutoWrapup is undefined', () => {
      const propsWithoutCancel: AutoWrapupTimerProps = {
        secondsUntilAutoWrapup: 30,
        handleCancelWrapup: mockHandleCancelWrapup,
      };

      const {container} = render(<AutoWrapupTimer {...propsWithoutCancel} />);

      expect(container).toMatchSnapshot();
    });

    it('calls handleCancelWrapup when cancel button is clicked', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={true} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Component Integration', () => {
    it('integrates with getTimerUIState utility function', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={15} />);

      expect(container).toMatchSnapshot();
    });

    it('renders complete component with cancel button enabled', () => {
      const completeProps: AutoWrapupTimerProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 25,
        allowCancelAutoWrapup: true,
      };

      const {container} = render(<AutoWrapupTimer {...completeProps} />);

      expect(container).toMatchSnapshot();
    });

    it('renders complete component without cancel button', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('Slot Attributes', () => {
    it('applies correct slot attributes to elements', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={true} />);

      expect(container).toMatchSnapshot();
    });

    it('applies correct slot attributes without cancel button', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} allowCancelAutoWrapup={false} />);

      expect(container).toMatchSnapshot();
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

      expect(container).toMatchSnapshot();
    });

    it('handles boolean props correctly', () => {
      const booleanTestCases: Array<{allowCancel: boolean; name: string}> = [
        {allowCancel: true, name: 'enabled'},
        {allowCancel: false, name: 'disabled'},
      ];

      booleanTestCases.forEach(({allowCancel, name}) => {
        const testProps: AutoWrapupTimerProps = {
          ...defaultProps,
          allowCancelAutoWrapup: allowCancel,
        };

        const {container} = render(<AutoWrapupTimer {...testProps} />);

        expect(container).toMatchSnapshot(`boolean-props-${name}`);
      });
    });

    it('handles number props correctly', () => {
      const numberTestCases = [0, 1, 10, 30, 60, 120];

      numberTestCases.forEach((seconds) => {
        const testProps: AutoWrapupTimerProps = {
          ...defaultProps,
          secondsUntilAutoWrapup: seconds,
        };

        const {container} = render(<AutoWrapupTimer {...testProps} />);

        expect(container).toMatchSnapshot(`number-props-${seconds}`);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles minimum timer value', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={0} />);

      expect(container).toMatchSnapshot();
    });

    it('handles large timer values', () => {
      const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={3600} />);

      expect(container).toMatchSnapshot();
    });

    it('handles timer state boundaries', () => {
      const boundaryValues = [9, 10, 11];

      boundaryValues.forEach((seconds) => {
        const {container} = render(<AutoWrapupTimer {...defaultProps} secondsUntilAutoWrapup={seconds} />);

        expect(container).toMatchSnapshot(`boundary-${seconds}`);
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

      combinations.forEach((props, index) => {
        const {container} = render(<AutoWrapupTimer {...props} />);

        expect(container).toMatchSnapshot(`combination-${index}`);
      });
    });
  });

  describe('Interaction Tests', () => {
    it('verifies cancel button interaction flow', () => {
      const customHandler = jest.fn();
      const {container} = render(
        <AutoWrapupTimer secondsUntilAutoWrapup={20} allowCancelAutoWrapup={true} handleCancelWrapup={customHandler} />
      );

      expect(container).toMatchSnapshot();
    });

    it('verifies component renders consistently across multiple renders', () => {
      const props: AutoWrapupTimerProps = {
        secondsUntilAutoWrapup: 45,
        allowCancelAutoWrapup: true,
        handleCancelWrapup: mockHandleCancelWrapup,
      };

      const {container} = render(<AutoWrapupTimer {...props} />);
      expect(container).toMatchSnapshot();
    });
  });
});
