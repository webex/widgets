import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import TelephonyActionToast from '../../../../src/components/task/TelephonyActionToast/telephony-action-toast';

describe('TelephonyActionToast', () => {
  it('renders error message with error variant toast', () => {
    const onDismiss = jest.fn();

    render(
      <TelephonyActionToast
        error={{
          message: "Couldn't mute call. Please try again.",
          isWxAppTelephonyError: true,
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByTestId('telephony-action-toast')).toBeInTheDocument();
    expect(screen.getByText("Couldn't mute call. Please try again.")).toBeInTheDocument();
  });

  it('calls onDismiss when close is triggered', () => {
    const onDismiss = jest.fn();

    render(
      <TelephonyActionToast
        error={{
          message: "Action didn't work. Please try again.",
          isWxAppTelephonyError: true,
        }}
        onDismiss={onDismiss}
      />
    );

    const toast = screen.getByTestId('telephony-action-toast').querySelector('mdc-toast') as HTMLElement & {
      onClose?: () => void;
    };

    expect(toast).toBeTruthy();
    fireEvent(toast, new CustomEvent('close'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
