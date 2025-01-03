import React from 'react';
import {render, screen} from '@testing-library/react';
import {UserState} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

// Mock the store import
jest.mock('@webex/cc-store', () => {return {
  cc: {},
  idleCodes: [],
  agentId: 'testAgentId'
}});

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
  });

  it('renders UserStatePresentational with correct props', () => {
    const useUserStateSpy = jest.spyOn(helper, 'useUserState');
    
    render(<UserState/>);

    expect(useUserStateSpy).toHaveBeenCalledWith({cc: {}, idleCodes: [], agentId: 'testAgentId'});
    const heading = screen.getByTestId('user-state-title');
    expect(heading).toHaveTextContent('Agent State');
  });
});