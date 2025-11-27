import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {IncomingTask} from '../../src';
import store from '@webex/cc-store';
import {mockTask} from '@webex/test-fixtures';
import '@testing-library/jest-dom';

// Mock the store
jest.mock('@webex/cc-store', () => ({
  cc: {},
  deviceType: 'BROWSER',
  dialNumber: '12345',
}));

const onAcceptedCb = jest.fn();
const onRejectedCb = jest.fn();

describe('IncomingTask Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders IncomingTaskPresentational with correct props', () => {
    const useIncomingTaskSpy = jest.spyOn(helper, 'useIncomingTask');

    // Mock the return value of the useIncomingTask hook
    useIncomingTaskSpy.mockReturnValue({
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
      isDeclineButtonEnabled: true,
    });

    render(<IncomingTask incomingTask={mockTask} onAccepted={onAcceptedCb} onRejected={onRejectedCb} />);

    // Assert that the useIncomingTask hook is called with the correct arguments
    expect(useIncomingTaskSpy).toHaveBeenCalledWith({
      incomingTask: mockTask,
      deviceType: store.deviceType,
      onAccepted: onAcceptedCb,
      onRejected: onRejectedCb,
    });
  });

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error and onErrorCallback is defined', () => {
      jest.spyOn(helper, 'useIncomingTask').mockImplementation(() => {
        throw new Error('Test error in useIncomingTask');
      });
      const mockOnErrorCallback = jest.fn();
      store.onErrorCallback = mockOnErrorCallback;
      const {container} = render(
        <IncomingTask incomingTask={mockTask} onAccepted={onAcceptedCb} onRejected={onRejectedCb} />
      );

      expect(container.firstChild).toBeNull();
      expect(mockOnErrorCallback).toHaveBeenCalledWith('IncomingTask', Error('Test error in useIncomingTask'));
      expect(mockOnErrorCallback).toHaveBeenCalledTimes(1);
    });

    it('should render empty fragment when ErrorBoundary catches an error and onErrorCallback is undefined', () => {
      jest.spyOn(helper, 'useIncomingTask').mockImplementation(() => {
        throw new Error('Test error without callback');
      });
      store.onErrorCallback = undefined;
      const {container} = render(
        <IncomingTask incomingTask={mockTask} onAccepted={onAcceptedCb} onRejected={onRejectedCb} />
      );

      expect(container.firstChild).toBeNull();
      // Should not throw, just render empty
    });
  });
});
