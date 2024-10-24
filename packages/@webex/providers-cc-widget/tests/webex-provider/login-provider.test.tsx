import React from 'react';
import {render, screen} from '@testing-library/react';
import {LoginProvider, useCommonData} from '../../src/webex-provider/login-provider';
import '@testing-library/jest-dom';

const TestComponent = () => {
  const {loginState, isAvailable, ccSdk} = useCommonData();

  return (
    <div>
      <span data-testid="login-state">{loginState}</span>
      <span data-testid="availability">{isAvailable ? 'Available' : 'Unavailable'}</span>
      <span data-testid="sdk-type">{ccSdk ? 'SDK Present' : 'SDK Missing'}</span>
    </div>
  );
};

describe('LoginProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provides default context values', () => {
    render(
      <LoginProvider>
        <TestComponent />
      </LoginProvider>
    );

    // These values are coming from the default context values
    expect(screen.getByTestId('login-state')).toHaveTextContent('');
    expect(screen.getByTestId('availability')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('sdk-type')).toHaveTextContent('SDK Present');
  });
});
