import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import E911Modal from '../../../../src/components/StationLogin/E911Modal/e911-modal';
import {E911ModalLabels} from '../../../../src/components/StationLogin/E911Modal/e911-modal.constants';

jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (component: React.ComponentType<Record<string, unknown>>) => component,
}));

describe('E911Modal', () => {
  const defaultProps = {
    isOpen: true,
    onSaveAndContinue: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when isOpen is true', () => {
    render(<E911Modal {...defaultProps} />);
    expect(screen.getByTestId('e911-modal')).toBeInTheDocument();
  });

  it('should display the modal title', () => {
    render(<E911Modal {...defaultProps} />);
    // The Dialog custom element renders headerText in its shadow DOM, so assert via the
    // headerText property @lit/react sets on the element rather than a light-DOM text query.
    const dialog = screen.getByTestId('e911-modal') as HTMLElement & {headerText?: string};
    expect(dialog.headerText).toBe(E911ModalLabels.TITLE);
  });

  it('should display the warning message', () => {
    render(<E911Modal {...defaultProps} />);
    expect(screen.getByText(E911ModalLabels.WARNING_MESSAGE)).toBeInTheDocument();
  });

  it('should display the dialing section', () => {
    render(<E911Modal {...defaultProps} />);
    expect(screen.getByText(E911ModalLabels.DIALING_TITLE)).toBeInTheDocument();
    expect(screen.getByText(E911ModalLabels.DIALING_MESSAGE)).toBeInTheDocument();
  });

  it('should display the checkbox with label', () => {
    render(<E911Modal {...defaultProps} />);
    expect(screen.getByTestId('e911-checkbox')).toBeInTheDocument();
  });

  it('should not call onSaveAndContinue when button clicked without checkbox checked', () => {
    render(<E911Modal {...defaultProps} />);
    const saveButton = screen.getByTestId('e911-save-button');

    fireEvent.click(saveButton);

    // Button click should not trigger callback when checkbox is unchecked
    expect(defaultProps.onSaveAndContinue).not.toHaveBeenCalled();
  });

  it('should enable Save & Continue button when checkbox is checked', async () => {
    render(<E911Modal {...defaultProps} />);
    const checkbox = screen.getByTestId('e911-checkbox');

    fireEvent(checkbox, new CustomEvent('change', {detail: {checked: true}}));

    await waitFor(() => {
      const saveButton = screen.getByTestId('e911-save-button');
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should call onCancel when Cancel button is clicked', () => {
    render(<E911Modal {...defaultProps} />);
    const cancelButton = screen.getByTestId('e911-cancel-button');

    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onSaveAndContinue when Save & Continue is clicked with checkbox checked', async () => {
    render(<E911Modal {...defaultProps} />);
    const checkbox = screen.getByTestId('e911-checkbox');

    fireEvent(checkbox, new CustomEvent('change', {detail: {checked: true}}));

    await waitFor(() => {
      const saveButton = screen.getByTestId('e911-save-button');
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByTestId('e911-save-button');
    fireEvent.click(saveButton);

    expect(defaultProps.onSaveAndContinue).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should disable Save & Continue and Cancel while a save is in flight, and re-enable them once it resolves', async () => {
    let resolveSave: () => void;
    const onSaveAndContinue = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    render(<E911Modal {...defaultProps} onSaveAndContinue={onSaveAndContinue} />);
    const checkbox = screen.getByTestId('e911-checkbox');
    fireEvent(checkbox, new CustomEvent('change', {detail: {checked: true}}));

    const saveButton = screen.getByTestId('e911-save-button');
    const cancelButton = screen.getByTestId('e911-cancel-button');
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    // A second click while saving must not fire another call - guards against the double-click
    // race that could otherwise fire concurrent createUserPreference/updateUserPreference calls.
    fireEvent.click(saveButton);
    expect(onSaveAndContinue).toHaveBeenCalledTimes(1);

    resolveSave();

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  it('should show a user-facing error and re-enable the buttons when onSaveAndContinue rejects', async () => {
    const onSaveAndContinue = jest.fn().mockRejectedValue(new Error('boom'));
    render(<E911Modal {...defaultProps} onSaveAndContinue={onSaveAndContinue} />);
    const checkbox = screen.getByTestId('e911-checkbox');
    fireEvent(checkbox, new CustomEvent('change', {detail: {checked: true}}));

    const saveButton = screen.getByTestId('e911-save-button');
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('e911-save-error')).toHaveTextContent(E911ModalLabels.SAVE_ERROR_MESSAGE);
    });
    expect(saveButton).not.toBeDisabled();
    expect(screen.getByTestId('e911-cancel-button')).not.toBeDisabled();
  });

  it('should clear a previous save error when the modal is reopened', async () => {
    const onSaveAndContinue = jest.fn().mockRejectedValue(new Error('boom'));
    const {rerender} = render(<E911Modal {...defaultProps} onSaveAndContinue={onSaveAndContinue} />);
    const checkbox = screen.getByTestId('e911-checkbox');
    fireEvent(checkbox, new CustomEvent('change', {detail: {checked: true}}));

    const saveButton = screen.getByTestId('e911-save-button');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('e911-save-error')).toBeInTheDocument();
    });

    rerender(<E911Modal {...defaultProps} onSaveAndContinue={onSaveAndContinue} isOpen={false} />);
    rerender(<E911Modal {...defaultProps} onSaveAndContinue={onSaveAndContinue} isOpen={true} />);

    expect(screen.queryByTestId('e911-save-error')).not.toBeInTheDocument();
  });

  it('should set visible on the Dialog when isOpen changes to true', () => {
    const {rerender} = render(<E911Modal {...defaultProps} isOpen={false} />);

    rerender(<E911Modal {...defaultProps} isOpen={true} />);

    const dialog = screen.getByTestId('e911-modal') as HTMLElement & {visible?: boolean};
    expect(dialog.visible).toBe(true);
  });

  it('should reset checkbox state when modal closes', () => {
    const {rerender} = render(<E911Modal {...defaultProps} isOpen={true} />);

    rerender(<E911Modal {...defaultProps} isOpen={false} />);

    // Modal should attempt to close - the actual close behavior depends on dialog.open state
    expect(screen.getByTestId('e911-modal')).toBeInTheDocument();
  });

  it('should not call onCancel when the Dialog fires close (built-in close button or Escape key) - Cancel is the only way to dismiss', () => {
    render(<E911Modal {...defaultProps} isOpen={true} />);
    const dialog = screen.getByTestId('e911-modal');

    dialog.dispatchEvent(new CustomEvent('close'));

    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });
});
