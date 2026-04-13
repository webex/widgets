import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignErrorDialogComponent from '../../../../src/components/task/CampaignErrorDialog/campaign-error-dialog';
import {
  CampaignErrorDialogProps,
  CampaignErrorType,
  ERROR_TITLES,
  ERROR_MESSAGE,
} from '../../../../src/components/task/CampaignErrorDialog/campaign-error-dialog.types';

// Mock HTMLDialogElement methods
HTMLDialogElement.prototype.showModal = jest.fn();
HTMLDialogElement.prototype.close = jest.fn();

describe('CampaignErrorDialogComponent', () => {
  const mockOnClose = jest.fn();

  const defaultProps: CampaignErrorDialogProps = {
    errorType: 'ACCEPT_FAILED',
    isOpen: false,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (HTMLDialogElement.prototype.showModal as jest.Mock).mockClear();
    (HTMLDialogElement.prototype.close as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should render the dialog element', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} />);

      const dialog = screen.getByTestId('campaign-error-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass('campaign-error-dialog');
    });

    it('should render the correct title for ACCEPT_FAILED error type', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} errorType="ACCEPT_FAILED" isOpen={true} />);

      const title = screen.getByTestId('campaign-error-dialog-title');
      expect(title).toHaveTextContent(ERROR_TITLES.ACCEPT_FAILED);
      expect(title).toHaveTextContent("Can't accept contact");
    });

    it('should render the correct title for SKIP_FAILED error type', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} errorType="SKIP_FAILED" isOpen={true} />);

      const title = screen.getByTestId('campaign-error-dialog-title');
      expect(title).toHaveTextContent(ERROR_TITLES.SKIP_FAILED);
      expect(title).toHaveTextContent("Can't skip contact");
    });

    it('should render the correct title for REMOVE_FAILED error type', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} errorType="REMOVE_FAILED" isOpen={true} />);

      const title = screen.getByTestId('campaign-error-dialog-title');
      expect(title).toHaveTextContent(ERROR_TITLES.REMOVE_FAILED);
      expect(title).toHaveTextContent("Can't remove contact");
    });

    it('should render the error message', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      const message = screen.getByTestId('campaign-error-dialog-message');
      expect(message).toHaveTextContent(ERROR_MESSAGE);
      expect(message).toHaveTextContent(
        'We ran into an issue connecting you with this contact. Check your network connection and try again.'
      );
    });

    it('should render the OK button', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      const okButton = screen.getByTestId('campaign-error-dialog-ok-button');
      expect(okButton).toBeInTheDocument();
      expect(okButton).toHaveTextContent('OK');
    });
  });

  describe('Dialog Open/Close Behavior', () => {
    it('should call showModal when isOpen changes to true', () => {
      const {rerender} = render(<CampaignErrorDialogComponent {...defaultProps} isOpen={false} />);

      expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();

      rerender(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    });

    it('should call close when isOpen changes to false', () => {
      const {rerender} = render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      // Simulate dialog being open
      const dialog = screen.getByTestId('campaign-error-dialog') as HTMLDialogElement;
      Object.defineProperty(dialog, 'open', {value: true, writable: true});

      rerender(<CampaignErrorDialogComponent {...defaultProps} isOpen={false} />);

      expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when OK button is clicked', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      const okButton = screen.getByTestId('campaign-error-dialog-ok-button');
      fireEvent.click(okButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when native close event fires while isOpen is true', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      const dialog = screen.getByTestId('campaign-error-dialog');
      fireEvent(dialog, new Event('close'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when native close event fires while isOpen is false', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={false} />);

      const dialog = screen.getByTestId('campaign-error-dialog');
      fireEvent(dialog, new Event('close'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Error Type Mapping', () => {
    const errorTypes: CampaignErrorType[] = ['ACCEPT_FAILED', 'SKIP_FAILED', 'REMOVE_FAILED'];

    errorTypes.forEach((errorType) => {
      it(`should display correct title for ${errorType}`, () => {
        render(<CampaignErrorDialogComponent {...defaultProps} errorType={errorType} isOpen={true} />);

        const title = screen.getByTestId('campaign-error-dialog-title');
        expect(title).toHaveTextContent(ERROR_TITLES[errorType]);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      const dialog = screen.getByTestId('campaign-error-dialog');
      expect(dialog.tagName).toBe('DIALOG');
    });

    it('should have heading element for title', () => {
      render(<CampaignErrorDialogComponent {...defaultProps} isOpen={true} />);

      const title = screen.getByTestId('campaign-error-dialog-title');
      expect(title).toBeInTheDocument();
    });
  });
});
