import React from 'react';
import {render, cleanup} from '@testing-library/react';
import StationLoginPresentational from '../../src/station-login/station-login.presentational';
import '@testing-library/jest-dom';

describe('StationLoginPresentational', () => {
  afterEach(cleanup);

  it('renders the station login presentational component', () => {
    const props = {
      name: 'StationLogin',
      selectLoginOption: jest.fn(),
      login: jest.fn(),
      logout: jest.fn()
    };
    
   
    
    render(
      <StationLoginPresentational {...props}/>
    );
  });
});
