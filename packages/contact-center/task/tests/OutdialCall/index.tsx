import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
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
    render(<OutdialCall isAddressBookEnabled={false} />);
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

  it('passes isAddressBookEnabled prop correctly when set to false', () => {
    const useOutdialCallSpy = jest.spyOn(helper, 'useOutdialCall').mockReturnValue({
      startOutdial: jest.fn(),
      getOutdialANIEntries: jest.fn(),
      getAddressBookEntries: jest.fn(),
      isTelephonyTaskActive: false,
    });

    const {container} = render(<OutdialCall isAddressBookEnabled={false} />);

    expect(useOutdialCallSpy).toHaveBeenCalled();
    // When address book is disabled, there should be no tablist
    expect(container.querySelector('mdc-tablist')).not.toBeInTheDocument();
    // The container should not have the additional height class
    expect(container.querySelector('.height-28-5rem')).not.toBeInTheDocument();
  });

  it('passes isAddressBookEnabled prop correctly when set to true', () => {
    const useOutdialCallSpy = jest.spyOn(helper, 'useOutdialCall').mockReturnValue({
      startOutdial: jest.fn(),
      getOutdialANIEntries: jest.fn(),
      getAddressBookEntries: jest.fn(),
      isTelephonyTaskActive: false,
    });

    const {container} = render(<OutdialCall isAddressBookEnabled={true} />);

    expect(useOutdialCallSpy).toHaveBeenCalled();
    // When address book is enabled, there should be a tablist
    expect(container.querySelector('mdc-tablist')).toBeInTheDocument();
    // The container should have the additional height class
    expect(container.querySelector('.height-28-5rem')).toBeInTheDocument();
  });

  it('enables address book by default when isAddressBookEnabled prop is not provided', () => {
    const useOutdialCallSpy = jest.spyOn(helper, 'useOutdialCall').mockReturnValue({
      startOutdial: jest.fn(),
      getOutdialANIEntries: jest.fn(),
      getAddressBookEntries: jest.fn(),
      isTelephonyTaskActive: false,
    });

    const {container} = render(<OutdialCall />);

    expect(useOutdialCallSpy).toHaveBeenCalled();
    // When no prop is provided, address book should be enabled by default
    expect(container.querySelector('mdc-tablist')).toBeInTheDocument();
    // The container should have the additional height class
    expect(container.querySelector('.height-28-5rem')).toBeInTheDocument();
  });

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error and call the callback', () => {
      // Mock the useOutdialCall to throw an error
      jest.spyOn(helper, 'useOutdialCall').mockImplementation(() => {
        throw new Error('Test error in useOutdialCall');
      });

      const {container} = render(<OutdialCall isAddressBookEnabled={false} />);

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

      const {container} = render(<OutdialCall isAddressBookEnabled={false} />);

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(store.onErrorCallback).toBeUndefined();
    });
  });
});
