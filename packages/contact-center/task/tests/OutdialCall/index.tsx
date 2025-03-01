import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import * as helper from '../../src/helper';
import {OutdialCall} from '../../src/OutdialCall';

// Mock the cc store.
jest.mock('@webex/cc-store', () => ({
  cc: {
    agentConfig: {
      outDialEp: 'mock-entry-point'
    }
  },
  logger: {},
}));

describe('Outdial Call Component', () => {

  it('renders OutDialCallPresentational with correct props', () => {
    
    const useOutdialCallSpy = jest.spyOn(helper, 'useOutdialCall');

    render(<OutdialCall />);

    // Verify that useOutdialCall hook is called with the correct props.
    expect(useOutdialCallSpy).toHaveBeenCalledWith({
      cc: {
        agentConfig: {
          outDialEp: 'mock-entry-point'
        }
      },
      logger: {},
    });
  });
});
