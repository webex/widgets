import React from 'react';
import '@testing-library/jest-dom';
import {render, act} from '@testing-library/react';
import ConsultTransferEmptyState from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-empty-state';

const mockUIDProps = (container) => {
  container
    .querySelectorAll('[id^="mdc-input"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-input-id'));
  container
    .querySelectorAll('[id^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-tooltip-id'));
  container
    .querySelectorAll('[aria-describedby^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('aria-describedby', 'mock-aria-describedby'));
};

describe('ConsultTransferEmptyState Snapshots', () => {
  const defaultProps = {
    message: 'No agents or queues available',
  };

  describe('Rendering - Tests for UI elements and visual states of ConsultTransferEmptyState component', () => {
    it('should render the component with default message', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferEmptyState {...defaultProps} />);
      });

      const container = screen.container.querySelector('.consult-empty-state');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with custom message', async () => {
      const customProps = {...defaultProps, message: 'No items found'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferEmptyState {...customProps} />);
      });

      const container = screen.container.querySelector('.consult-empty-state');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with long message', async () => {
      const longMessageProps = {
        ...defaultProps,
        message:
          'This is a very long message that might wrap to multiple lines to test how the component handles extended text content',
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferEmptyState {...longMessageProps} />);
      });

      const container = screen.container.querySelector('.consult-empty-state');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with empty message', async () => {
      const emptyMessageProps = {...defaultProps, message: ''};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferEmptyState {...emptyMessageProps} />);
      });

      const container = screen.container.querySelector('.consult-empty-state');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with HTML characters in message', async () => {
      const htmlMessageProps = {...defaultProps, message: 'No agents & queues <available>'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferEmptyState {...htmlMessageProps} />);
      });

      const container = screen.container.querySelector('.consult-empty-state');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with special characters in message', async () => {
      const specialMessageProps = {...defaultProps, message: 'No agents/queues! @#$%^&*()'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferEmptyState {...specialMessageProps} />);
      });

      const container = screen.container.querySelector('.consult-empty-state');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
