import React from 'react';
import {render} from '@testing-library/react';
import DialNumberUI from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-dial-number';

describe('DialNumberUI snapshot', () => {
  const loggerMock = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  const onButtonPressMock = jest.fn();
  const defaultProps = {
    title: 'Dial Number',
    buttonIcon: 'call',
    onButtonPress: onButtonPressMock,
    logger: loggerMock,
  };

  it('matches snapshot', () => {
    const {container} = render(<DialNumberUI {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });
});
