import React from 'react';
import {render} from '@testing-library/react';
import {UserState} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';
jest.mock('@webex/cc-components', () => {
  return {
    UserStateComponent: () => <div>UserStateComponent</div>,
  };
});

// Mock the store import
jest.mock('@webex/cc-store', () => {
  return {
    cc: {
      on: jest.fn(),
      off: jest.fn(),
    },
    idleCodes: [],
    agentId: 'testAgentId',
  };
});

describe('UserState Component', () => {
  let workerMock;

  beforeEach(() => {
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

  it('renders UserStateComponent with correct props', () => {
    const useUserStateSpy = jest.spyOn(helper, 'useUserState');

    render(<UserState />);
    expect(useUserStateSpy).toHaveBeenCalledTimes(1);
    expect(useUserStateSpy).toHaveBeenCalledWith({
      cc: {
        on: expect.any(Function),
        off: expect.any(Function),
      },
      idleCodes: [],
      agentId: 'testAgentId',
    });
  });
});
