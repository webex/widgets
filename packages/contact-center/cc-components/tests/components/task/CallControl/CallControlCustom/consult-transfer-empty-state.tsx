import React from 'react';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferEmptyState from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-empty-state';

describe('ConsultTransferEmptyState', () => {
  it('renders empty state with message', async () => {
    const message = 'No agents or queues available';
    const screen = await render(<ConsultTransferEmptyState message={message} />);

    // Verify main container
    const emptyStateContainer = screen.container.querySelector('.consult-empty-state');
    expect(emptyStateContainer).toBeInTheDocument();

    // Verify SVG placeholder
    const svgPlaceholder = screen.container.querySelector('.consult-empty-state-svg');
    expect(svgPlaceholder).toBeInTheDocument();

    // Verify message
    const messageElement = screen.container.querySelector('.consult-empty-message');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveTextContent(message);
  });

  it('renders with different message', async () => {
    const customMessage = 'No items found';
    const screen = await render(<ConsultTransferEmptyState message={customMessage} />);

    const messageElement = screen.container.querySelector('.consult-empty-message');
    expect(messageElement).toHaveTextContent(customMessage);
  });
});
