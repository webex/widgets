import React from 'react';
import {render, screen} from '@testing-library/react';
import {UserState} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';
import '@testing-library/jest-dom';

// Mock the store import
jest.mock('@webex/cc-store', () => {
  return {
    cc: {
      on: jest.fn(),
      off: jest.fn(),
    },
    idleCodes: [],
    agentId: 'testAgentId',
    logger: {
      log: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
    lastStateChangeTimestamp: new Date().getTime(),
    lastIdleCodeChangeTimestamp: undefined,
    customState: null,
    currentState: '0',
    wellbeingBreakIdleCode: undefined,
    wellnessIdleCodeLookupPending: false,
    onErrorCallback: jest.fn(),
  };
});

const mutableStore = store as unknown as {
  currentState: string;
  wellbeingBreakIdleCode?: {id: string; name: string; isSystem: boolean; isDefault: boolean};
  wellnessIdleCodeLookupPending: boolean;
};

describe('UserState Component', () => {
  let workerMock;
  const onStateChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mutableStore.currentState = '0';
    mutableStore.wellbeingBreakIdleCode = undefined;
    mutableStore.wellnessIdleCodeLookupPending = false;
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});

    workerMock = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    };

    global.Worker = jest.fn(() => workerMock);
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost:3000/12345');

    if (typeof window.HTMLElement.prototype.attachInternals !== 'function') {
      window.HTMLElement.prototype.attachInternals = jest.fn();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders UserStateComponent with correct props', () => {
    const useUserStateSpy = jest.spyOn(helper, 'useUserState');

    render(<UserState onStateChange={onStateChange} />);
    expect(useUserStateSpy).toHaveBeenCalledTimes(1);
    expect(useUserStateSpy).toHaveBeenCalledWith({
      cc: {
        on: expect.any(Function),
        off: expect.any(Function),
      },
      idleCodes: [],
      agentId: 'testAgentId',
      currentState: '0',
      customState: null,
      lastStateChangeTimestamp: expect.any(Number),
      lastIdleCodeChangeTimestamp: undefined,
      isCurrentStateExternallyManaged: false,
      wellnessIdleCodeLookupPending: false,
      logger: {
        log: expect.any(Function),
        info: expect.any(Function),
        error: expect.any(Function),
        warn: expect.any(Function),
      },
      onStateChange: expect.any(Function),
    });
  });

  it('projects WellbeingBreak as an externally managed state', () => {
    const useUserStateSpy = jest.spyOn(helper, 'useUserState');
    mutableStore.currentState = 'wellness';
    mutableStore.wellbeingBreakIdleCode = {
      id: 'wellness',
      name: 'WellbeingBreak',
      isSystem: true,
      isDefault: false,
    };

    render(<UserState onStateChange={onStateChange} />);

    expect(useUserStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentState: 'wellness',
        idleCodes: [expect.objectContaining({id: 'wellness', name: 'WellbeingBreak'})],
        isCurrentStateExternallyManaged: true,
        wellnessIdleCodeLookupPending: false,
      })
    );
    expect(screen.getByTestId('elapsed-time')).toBeInTheDocument();
  });

  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error', () => {
      const mockOnErrorCallback = jest.fn();
      store.onErrorCallback = mockOnErrorCallback;
      // Mock the useUserState to throw an error
      jest.spyOn(helper, 'useUserState').mockImplementation(() => {
        throw new Error('Test error in useUserState');
      });

      const {container} = render(<UserState onStateChange={onStateChange} />);

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(mockOnErrorCallback).toHaveBeenCalledWith('UserState', Error('Test error in useUserState'));
      expect(mockOnErrorCallback).toHaveBeenCalledTimes(1);
    });
  });
});
