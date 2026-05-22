import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignTaskListItem from '../../../../src/components/task/CampaignTask/CampaignTaskListItem/campaign-task-list-item';
import {CampaignTaskListItemProps} from '../../../../src/components/task/task.types';
import {
  CAMPAIGN_ACCEPT,
  CAMPAIGN_CONNECTING,
  CAMPAIGN_SKIP,
  CAMPAIGN_REMOVE,
  CAMPAIGN_ACTIONS_LABEL,
} from '../../../../src/components/task/constants';

// Mock child components that rely on browser APIs (Web Workers, timers)
jest.mock('../../../../src/components/task/CampaignCountdown/campaign-countdown', () => {
  const MockCountdown = () => <span data-testid="mock-countdown">Time left: 00:30</span>;
  MockCountdown.displayName = 'CampaignCountdown';
  return {__esModule: true, default: MockCountdown};
});

jest.mock('../../../../src/components/task/TaskTimer/index', () => {
  const MockTaskTimer = () => <span data-testid="mock-task-timer">00:00</span>;
  MockTaskTimer.displayName = 'TaskTimer';
  return {__esModule: true, default: MockTaskTimer};
});

const defaultProps: CampaignTaskListItemProps = {
  title: 'John Doe',
  phoneNumber: '+1-408-555-0002',
  customerName: 'John Doe',
  timeoutTimestamp: String(Date.now() + 30000),
  isAcceptClicked: false,
  isAccepted: false,
  isAcceptDisabled: false,
  isSkipDisabled: false,
  isRemoveDisabled: false,
  onAccept: jest.fn(),
  onSkip: jest.fn(),
  onRemove: jest.fn(),
  onTimeout: jest.fn(),
  logger: undefined,
};

const renderComponent = (overrides: Partial<CampaignTaskListItemProps> = {}) =>
  render(<CampaignTaskListItem {...defaultProps} {...overrides} />);

describe('CampaignTaskListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────

  it('should render the title', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-task-title')).toHaveTextContent('John Doe');
  });

  it('should render the phone number when customerName and phoneNumber differ', () => {
    renderComponent({customerName: 'John Doe', phoneNumber: '+1-408-555-0002'});
    expect(screen.getByTestId('campaign-task-phone')).toHaveTextContent('+1-408-555-0002');
  });

  it('should NOT render phone when phoneNumber equals customerName', () => {
    renderComponent({customerName: 'John Doe', phoneNumber: 'John Doe'});
    expect(screen.queryByTestId('campaign-task-phone')).not.toBeInTheDocument();
  });

  it('should NOT render phone when customerName is undefined', () => {
    renderComponent({customerName: undefined});
    expect(screen.queryByTestId('campaign-task-phone')).not.toBeInTheDocument();
  });

  it('should render the campaign avatar', () => {
    const {container} = renderComponent();
    const avatar = container.querySelector('[slot="leading-controls"]');
    expect(avatar).toBeInTheDocument();
  });

  // ── Countdown / Handle Timer toggle ────────────────────────────────

  it('should render countdown when not accepted', () => {
    renderComponent({isAcceptClicked: false});
    expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should still render countdown when accept clicked but not yet confirmed by backend', () => {
    renderComponent({isAcceptClicked: true, isAccepted: false});
    expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should NOT render countdown when accepted by backend', () => {
    renderComponent({isAcceptClicked: true, isAccepted: true, handleTimestamp: Date.now()});
    expect(screen.queryByTestId('mock-countdown')).not.toBeInTheDocument();
  });

  it('should render handle time timer when accepted by backend with handleTimestamp', () => {
    renderComponent({isAcceptClicked: true, isAccepted: true, handleTimestamp: Date.now()});
    expect(screen.getByTestId('mock-task-timer')).toBeInTheDocument();
  });

  it('should NOT render handle time timer when not accepted', () => {
    renderComponent({isAcceptClicked: false});
    expect(screen.queryByTestId('mock-task-timer')).not.toBeInTheDocument();
  });

  it('should NOT render handle time timer when handleTimestamp is undefined', () => {
    renderComponent({isAcceptClicked: true, handleTimestamp: undefined});
    expect(screen.queryByTestId('mock-task-timer')).not.toBeInTheDocument();
  });

  // ── Action buttons visibility ──────────────────────────────────────

  it('should render Accept, Skip, and Remove buttons when not accepted', () => {
    renderComponent({isAcceptClicked: false});
    expect(screen.getByTestId('campaign-task-actions')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  it('should show Connecting button and disabled Skip/Remove when accept clicked but not confirmed', () => {
    renderComponent({isAcceptClicked: true, isAccepted: false});
    expect(screen.getByTestId('campaign-task-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-connecting-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-connecting-button')).toHaveTextContent(CAMPAIGN_CONNECTING);
    expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  it('should NOT render any action buttons when campaign is accepted by backend', () => {
    renderComponent({isAcceptClicked: true, isAccepted: true, handleTimestamp: Date.now()});
    expect(screen.queryByTestId('campaign-task-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-skip-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-remove-button')).not.toBeInTheDocument();
  });

  // ── Button disabled states ─────────────────────────────────────────

  it('should pass disabled prop to Accept button when isAcceptDisabled is true', () => {
    renderComponent({isAcceptDisabled: true});
    const button = screen.getByTestId('campaign-task-accept-button');
    // Momentum web components set disabled as a JS property via @lit/react;
    // JSDOM does not upgrade custom elements so we verify the property directly.
    expect((button as unknown as {disabled: boolean}).disabled).toBe(true);
  });

  it('should pass disabled prop to Skip button when isSkipDisabled is true', () => {
    renderComponent({isSkipDisabled: true});
    const button = screen.getByTestId('campaign-task-skip-button');
    expect((button as unknown as {disabled: boolean}).disabled).toBe(true);
  });

  it('should pass disabled prop to Remove button when isRemoveDisabled is true', () => {
    renderComponent({isRemoveDisabled: true});
    const button = screen.getByTestId('campaign-task-remove-button');
    expect((button as unknown as {disabled: boolean}).disabled).toBe(true);
  });

  // ── Button click handlers ──────────────────────────────────────────

  it('should call onAccept when Accept button is clicked', () => {
    const onAccept = jest.fn();
    renderComponent({onAccept});
    fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('should call onSkip when Skip button is clicked', () => {
    const onSkip = jest.fn();
    renderComponent({onSkip});
    fireEvent.click(screen.getByTestId('campaign-task-skip-button'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('should call onRemove when Remove button is clicked', () => {
    const onRemove = jest.fn();
    renderComponent({onRemove});
    fireEvent.click(screen.getByTestId('campaign-task-remove-button'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it('should set correct aria-label on the actions container', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-task-actions')).toHaveAttribute('aria-label', CAMPAIGN_ACTIONS_LABEL);
  });

  it('should set correct aria-labels on action buttons', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-task-accept-button')).toHaveAttribute('aria-label', CAMPAIGN_ACCEPT);
    expect(screen.getByTestId('campaign-task-skip-button')).toHaveAttribute('aria-label', CAMPAIGN_SKIP);
    expect(screen.getByTestId('campaign-task-remove-button')).toHaveAttribute('aria-label', CAMPAIGN_REMOVE);
  });

  // ── Custom testIdPrefix ────────────────────────────────────────────

  it('should use custom testIdPrefix for data-testid attributes', () => {
    renderComponent({testIdPrefix: 'campaign-popover'});
    expect(screen.getByTestId('campaign-popover-list-item')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-popover-title')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-popover-accept-button')).toBeInTheDocument();
  });

  // ── No timeout timestamp ───────────────────────────────────────────

  it('should NOT render countdown when timeoutTimestamp is undefined', () => {
    renderComponent({timeoutTimestamp: undefined, isAcceptClicked: false});
    expect(screen.queryByTestId('mock-countdown')).not.toBeInTheDocument();
  });
});
