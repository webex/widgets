import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {IncomingTask} from '../../src';
import store from '@webex/cc-store';
import '@testing-library/jest-dom';

jest.mock('@webex/cc-components', () => {
  return {
    IncomingTaskComponent: () => <div>IncomingTaskComponent</div>,
  };
});

// Mock the store
jest.mock('@webex/cc-store', () => ({
  cc: {},
  deviceType: 'BROWSER',
  dialNumber: '12345',
}));

const onAcceptedCb = jest.fn();
const onRejectedCb = jest.fn();

describe('IncomingTask Component', () => {
  it('renders IncomingTaskPresentational with correct props', () => {
    const useIncomingTaskSpy = jest.spyOn(helper, 'useIncomingTask');

    const mockTask = {
      data: {interactionId: '12345'},
    };

    // Mock the return value of the useIncomingTask hook
    useIncomingTaskSpy.mockReturnValue({
      incomingTask: mockTask,
      accept: jest.fn(),
      reject: jest.fn(),
      isBrowser: true,
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
});
