import '@testing-library/jest-dom';
import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import store from '@webex/cc-store';

import * as helper from '../../src/helper';
import {StationLogin} from '../../src/station-login/index';

describe('StationLogin', () => {
  afterEach(cleanup);

  it('CheckboxWithLabel changes the text after click', () => {
    const stationLoginHelperSpy = jest.spyOn(helper, 'useStationLogin').mockReturnValue({name: 'MockStationLogin'});

    render(<StationLogin />);

    expect(stationLoginHelperSpy).toHaveBeenCalledWith({}, store);

    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('MockStationLogin');
  });
});
