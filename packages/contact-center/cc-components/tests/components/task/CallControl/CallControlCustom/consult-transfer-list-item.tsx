import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsultTransferListComponent from '../../../../../src/components/task/CallControl/CallControlCustom/consult-transfer-list-item';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

jest.mock('lottie-web');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

// This test suite was previously skipped but is now enabled for 100% coverage
describe('CallControlListItemPresentational', () => {
  const mockOnButtonPress = jest.fn();
  const defaultProps = {
    title: 'John Doe',
    subtitle: 'Manager',
    buttonIcon: 'test-icon',
    onButtonPress: mockOnButtonPress,
    className: 'custom-class',
    logger: loggerMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with title, subtitle, and correct initials', async () => {
    const screen = await render(<ConsultTransferListComponent {...defaultProps} />);

    // Verify main list item container
    const listItem = screen.container.querySelector('.call-control-list-item');
    expect(listItem).toBeInTheDocument();
    expect(listItem).toHaveClass('custom-class');
    expect(listItem).toHaveAttribute('role', 'listitem');
    expect(listItem).toHaveAttribute('aria-label', 'John Doe');
    expect(listItem).toHaveAttribute('data-size', '50');
    expect(listItem).toHaveAttribute('data-padded', 'true');
    expect(listItem).toHaveAttribute('data-interactive', 'true');
    expect(listItem).toHaveAttribute('data-disabled', 'false');
    expect(listItem).toHaveAttribute('data-shape', 'rectangle');
    expect(listItem).toHaveAttribute('tabindex', '0');

    // Verify avatar section
    const avatarWrapper = screen.container.querySelector('.md-avatar-wrapper');
    expect(avatarWrapper).toBeInTheDocument();
    expect(avatarWrapper).toHaveAttribute('role', 'img');
    expect(avatarWrapper).toHaveAttribute('data-size', '32');
    expect(avatarWrapper).toHaveAttribute('data-color', 'default');
    expect(avatarWrapper).toHaveAttribute('aria-hidden', 'false');

    // Verify initials display
    const initialsSpan = screen.container.querySelector('.md-avatar-wrapper-children');
    expect(initialsSpan).toBeInTheDocument();
    expect(initialsSpan).toHaveTextContent('JD');
    expect(initialsSpan).toHaveAttribute('aria-hidden', 'true');

    // Verify middle section with title and subtitle (class-based layout)
    const middleSection = screen.container.querySelector('[data-position="middle"]');
    expect(middleSection).toBeInTheDocument();
    expect(middleSection).toHaveClass('call-control-list-item-middle');

    // Verify title text
    const textElements = screen.container.querySelectorAll('mdc-text');
    expect(textElements[0]).toHaveTextContent('John Doe');
    expect(textElements[0]).toHaveAttribute('tagname', 'div');
    expect(textElements[0]).toHaveAttribute('type', 'body-large-regular');
    expect(textElements[0]).toHaveClass('call-control-list-item-title');

    // Verify subtitle text
    expect(textElements[1]).toHaveTextContent('Manager');
    expect(textElements[1]).toHaveAttribute('tagname', 'div');
    expect(textElements[1]).toHaveAttribute('type', 'body-midsize-regular');
    expect(textElements[1]).toHaveClass('call-control-list-item-subtitle');

    // Verify end section with button
    const endSection = screen.container.querySelector('[data-position="end"]');
    expect(endSection).toBeInTheDocument();

    // Verify hover button container
    const hoverButton = screen.container.querySelector('.hover-button');
    expect(hoverButton).toBeInTheDocument();

    // Verify button attributes
    const button = screen.container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-color', 'join');
    expect(button).toHaveAttribute('data-size', '32');
    expect(button).toHaveAttribute('data-disabled', 'false');
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button).toHaveAttribute('type', 'button');

    // Verify icon
    const icon = screen.container.querySelector('mdc-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('name', 'test-icon');
  });

  it('handles button click correctly', async () => {
    const screen = await render(<ConsultTransferListComponent {...defaultProps} />);

    // Click the button
    const button = screen.container.querySelector('button');
    fireEvent.click(button!);

    // Verify onButtonPress was called
    expect(mockOnButtonPress).toHaveBeenCalledTimes(1);
  });

  it('renders without subtitle when not provided', async () => {
    const propsWithoutSubtitle = {
      ...defaultProps,
      subtitle: undefined,
    };

    const screen = await render(<ConsultTransferListComponent {...propsWithoutSubtitle} />);

    // Should only have one mdc-text element (title only)
    const titleOnlyElements = screen.container.querySelectorAll('mdc-text');
    expect(titleOnlyElements).toHaveLength(1);
    expect(titleOnlyElements[0]).toHaveTextContent('John Doe');
  });
});
