import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import USEmergencyNumberPresentational from '../../src/us-emergency-number/us-emergency-number.presentational';
import '@testing-library/jest-dom';

describe('USEmergencyNumberPresentational', () => {
  afterEach(cleanup);
  it('renders the component name', () => {
    const props = {name: 'USEmergencyNumber'};
    render(<USEmergencyNumberPresentational {...props} />);
    const heading = screen.getByTestId('us-emergency-number-heading');
    expect(heading).toHaveTextContent('USEmergencyNumber');
  });
});
