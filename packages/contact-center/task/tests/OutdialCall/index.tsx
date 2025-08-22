import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {OutdialCall} from '../../src/OutdialCall';
import store from '@webex/cc-store';

// Mock dependencies
jest.mock('@webex/cc-store', () => ({
  cc: {},
  logger: {
    info: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  onErrorCallback: jest.fn(),
}));

describe('OutdialCall Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('render OutdialCallComponent with correct props', () => {
    const useOutdialCallSpy = jest.spyOn(helper, 'useOutdialCall');
    render(<OutdialCall />);
    expect(useOutdialCallSpy).toHaveBeenCalledTimes(1);
    expect(useOutdialCallSpy).toHaveBeenCalledWith({
      cc: {},
      logger: {
        info: expect.any(Function),
        error: expect.any(Function),
        log: expect.any(Function),
        warn: expect.any(Function),
      },
    });
  });

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error and call the callback', () => {
      // Mock the useOutdialCall to throw an error
      jest.spyOn(helper, 'useOutdialCall').mockImplementation(() => {
        throw new Error('Test error in useOutdialCall');
      });

      const {container} = render(<OutdialCall />);

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(store.onErrorCallback).toHaveBeenCalledWith('OutdialCall', Error('Test error in useOutdialCall'));
    });
    it('should render empty fragment when ErrorBoundary catches an error and call the callback', () => {
      // Mock the useOutdialCall to throw an error
      jest.spyOn(helper, 'useOutdialCall').mockImplementation(() => {
        throw new Error('Test error in useOutdialCall');
      });
      store.onErrorCallback = undefined;

      const {container} = render(<OutdialCall />);

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(store.onErrorCallback).toBeUndefined();
    });
  });
});
