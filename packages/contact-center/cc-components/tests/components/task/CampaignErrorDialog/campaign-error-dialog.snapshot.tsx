import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignErrorDialogComponent from '../../../../src/components/task/CampaignErrorDialog/campaign-error-dialog';
import {CampaignErrorDialogProps} from '../../../../src/components/task/CampaignErrorDialog/campaign-error-dialog.types';

// Mock HTMLDialogElement methods
HTMLDialogElement.prototype.showModal = jest.fn();
HTMLDialogElement.prototype.close = jest.fn();

describe('CampaignErrorDialog Snapshots', () => {
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
    it('should match snapshot for ACCEPT_FAILED error type', () => {
      const {container} = render(
        <CampaignErrorDialogComponent {...defaultProps} errorType="ACCEPT_FAILED" isOpen={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for SKIP_FAILED error type', () => {
      const {container} = render(
        <CampaignErrorDialogComponent {...defaultProps} errorType="SKIP_FAILED" isOpen={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot for REMOVE_FAILED error type', () => {
      const {container} = render(
        <CampaignErrorDialogComponent {...defaultProps} errorType="REMOVE_FAILED" isOpen={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when dialog is closed', () => {
      const {container} = render(<CampaignErrorDialogComponent {...defaultProps} isOpen={false} />);
      expect(container).toMatchSnapshot();
    });
  });
});
