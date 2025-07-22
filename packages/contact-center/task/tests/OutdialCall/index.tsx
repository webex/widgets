import React from 'react';
import {render} from '@testing-library/react';
import * as helper from '../../src/helper';
import {OutdialCall} from '../../src/OutdialCall';

// Mock dependencies
jest.mock('@webex/cc-store', () => ({
  cc: {},
  logger: {
    info: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('OutdialCall Component', () => {
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
});
