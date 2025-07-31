import React from 'react';
import '@testing-library/jest-dom';
import {render, fireEvent, act} from '@testing-library/react';
import ConsultTransferListComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-list-item';

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

// Mock lottie-web
jest.mock('lottie-web');

describe('ConsultTransferListComponent Snapshots', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };

  const mockOnButtonPress = jest.fn();

  const defaultProps = {
    title: 'John Doe',
    subtitle: 'Manager',
    buttonIcon: 'test-icon',
    onButtonPress: mockOnButtonPress,
    className: 'custom-class',
    logger: mockLogger,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Tests for UI elements and visual states of ConsultTransferListComponent component', () => {
    it('should render the component with title and subtitle', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with long name generating different initials', async () => {
      const longNameProps = {...defaultProps, title: 'Alexander Benjamin Christopher'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...longNameProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with single name', async () => {
      const singleNameProps = {...defaultProps, title: 'John'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...singleNameProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without subtitle', async () => {
      const noSubtitleProps = {...defaultProps, subtitle: ''};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...noSubtitleProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with different className', async () => {
      const customClassProps = {...defaultProps, className: 'different-custom-class'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...customClassProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with different button icon', async () => {
      const differentIconProps = {...defaultProps, buttonIcon: 'different-icon'};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...differentIconProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render without className', async () => {
      const noClassProps = {...defaultProps, className: undefined};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...noClassProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with special characters in title', async () => {
      const specialCharsProps = {...defaultProps, title: "John O'Connor & Jane"};
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...specialCharsProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with long subtitle', async () => {
      const longSubtitleProps = {
        ...defaultProps,
        subtitle: 'Senior Manager of Customer Relations and Business Development',
      };
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...longSubtitleProps} />);
      });

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Interactions', () => {
    it('should render component after button click', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      const button = screen.container.querySelector('button');
      if (button) {
        fireEvent.click(button);
      }

      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render component after list item click', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      const listItem = screen.container.querySelector('.call-control-list-item');
      fireEvent.click(listItem);

      mockUIDProps(listItem);
      expect(listItem).toMatchSnapshot();
    });

    it('should render component after keyboard interaction', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      const listItem = screen.container.querySelector('.call-control-list-item');
      fireEvent.keyDown(listItem, {key: 'Enter', code: 'Enter'});

      mockUIDProps(listItem);
      expect(listItem).toMatchSnapshot();
    });
  });

  describe('State Management', () => {
    it('should update when title changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      screen.rerender(<ConsultTransferListComponent {...defaultProps} title="Jane Smith" />);
      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when subtitle changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      screen.rerender(<ConsultTransferListComponent {...defaultProps} subtitle="Senior Manager" />);
      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when buttonIcon changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<ConsultTransferListComponent {...defaultProps} />);
      });

      screen.rerender(<ConsultTransferListComponent {...defaultProps} buttonIcon="new-icon" />);
      const container = screen.container.querySelector('.call-control-list-item');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
