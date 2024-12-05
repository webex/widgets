import React from 'react';
import {render, screen} from '@testing-library/react';
import {UserState} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

// Mock the store import
jest.mock('@webex/cc-store', () => {return {
  cc: {}
}});

describe('UserState Component', () => {
  it('renders UserStatePresentational with correct props', () => {
    const useUserStateSpy = jest.spyOn(helper, 'useUserState');
    
    render(<UserState/>);

    expect(useUserStateSpy).toHaveBeenCalledWith({cc: {}});
    const heading = screen.getByTestId('user-state-title');
    expect(heading).toHaveTextContent('Agent State');
  });
});