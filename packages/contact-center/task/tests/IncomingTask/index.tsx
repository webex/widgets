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
}));

const onAcceptedCb = jest.fn();
const onDeclinedCb = jest.fn();

describe('IncomingTask Component', () => {
  it('renders IncomingTaskPresentational with correct props', () => {
    const useIncomingTaskSpy = jest.spyOn(helper, 'useIncomingTask');

    // Mock the return value of the useIncomingTask hook
    useIncomingTaskSpy.mockReturnValue({
      incomingTask: null,
      accept: jest.fn(),
      decline: jest.fn(),
      isBrowser: true,
    });

    render(<IncomingTask onAccepted={onAcceptedCb} onDeclined={onDeclinedCb} />);

    // Assert that the useIncomingTask hook is called with the correct arguments
    expect(useIncomingTaskSpy).toHaveBeenCalledWith({
      deviceType: store.deviceType,
      onAccepted: onAcceptedCb,
      onDeclined: onDeclinedCb,
    });
  });
});
