import '@testing-library/jest-dom';
import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';

import * as stationLoginHooks from '../../src/station-login/station-login.hooks';
import StationLogin from '../../src/station-login/index';

describe.only('StationLogin', () => {
  afterEach(cleanup);
  it('CheckboxWithLabel changes the text after click', () => {
    const stationLoginHooksSpy = jest
      .spyOn(stationLoginHooks, 'useStationLogin')
      .mockReturnValue({name: 'MockStationLogin'});

    render(<StationLogin />);

    expect(stationLoginHooksSpy).toHaveBeenCalledWith();

    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('MockStationLogin');
  });
});
