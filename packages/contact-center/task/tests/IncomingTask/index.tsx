import React from 'react';
import {render, screen} from '@testing-library/react';
import * as helper from '../../src/helper';
import {IncomingTask} from '../../src';
import store from '@webex/cc-store';
import '@testing-library/jest-dom';

// Mock the store
jest.mock('@webex/cc-store', () => ({
  cc: {},
  selectedLoginOption: 'BROWSER',
  onAccepted: jest.fn(),
  onDeclined: jest.fn(),
}));

describe('IncomingTask Component', () => {
  it('renders IncomingTaskPresentational with correct props', () => {
    const useIncomingTaskSpy = jest.spyOn(helper, 'useIncomingTask');

    // Mock the return value of the useIncomingTask hook
    useIncomingTaskSpy.mockReturnValue({
      currentTask: null,
      setCurrentTask: jest.fn(),
      answered: false,
      ended: false,
      missed: false,
      accept: jest.fn(),
      decline: jest.fn(),
      isBrowser: true,
    });

    render(<IncomingTask />);

    // Assert that the useIncomingTask hook is called with the correct arguments
    expect(useIncomingTaskSpy).toHaveBeenCalledWith({
      cc: store.cc,
      selectedLoginOption: store.selectedLoginOption,
      onAccepted: store.onAccepted,
      onDeclined: store.onDeclined,
    });
  });
});
