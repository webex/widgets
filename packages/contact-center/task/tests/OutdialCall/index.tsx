import React from 'react';
import {render} from '@testing-library/react';
import OutdialCall from '../../../cc-components/src/components/OutdialCall/out-dial-call';
import {useOutdialCall} from '../../src/helper';

// Mock dependencies
jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: {
    cc: {
      // Add mock CC methods/properties as needed
    },
    logger: {
      // Add mock logger methods
      info: jest.fn(),
      error: jest.fn(),
    },
  },
}));

jest.mock('../helper', () => ({
  useOutdialCall: jest.fn(),
}));

describe('OutdialCall Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOutdialCall as jest.Mock).mockReturnValue({});
  });

  it('renders without crashing', () => {
    const {container} = render(<OutdialCall />);
    expect(container).toBeTruthy();
  });

  it('calls useOutdialCall with correct props', () => {
    render(<OutdialCall />);
    expect(useOutdialCall).toHaveBeenCalledWith({
      cc: store.cc,
      logger: store.logger,
    });
  });

  it('passes correct props to presentational component', () => {
    const mockOutdialCallResult = {
      someProperty: 'test',
    };
    (useOutdialCall as jest.Mock).mockReturnValue(mockOutdialCallResult);

    const {container} = render(<OutdialCall />);
    expect(container).toMatchSnapshot();
  });
});
