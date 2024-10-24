import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, cleanup} from '@testing-library/react';

import * as USEmergencyNumberHooks from '../../src/us-emergency-number/us-emergency-number.hooks';
import USEmergencyNumber from '../../src/us-emergency-number/index';

describe.only('USEmergencyNumber', () => {
  afterEach(cleanup);
  it('widget is loaded correctly', () => {
    const usEmergencyNumberHooksSpy = jest
      .spyOn(USEmergencyNumberHooks, 'useUSEmergencyNumber')
      .mockReturnValue({name: 'MockUSEmergencyNumber'});

    render(<USEmergencyNumber />);

    expect(usEmergencyNumberHooksSpy).toHaveBeenCalledWith();

    const heading = screen.getByTestId('us-emergency-number-heading');
    expect(heading).toHaveTextContent('MockUSEmergencyNumber');
  });
});
