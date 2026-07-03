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

const renderComponent = async (overrides: Partial<CampaignTaskListItemProps> = {}) =>
  await render(<CampaignTaskListItem {...defaultProps} {...overrides} />);

describe('CampaignTaskListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────

  it('should render the title', async () => {
    await renderComponent();
    expect(await screen.findByTestId('campaign-task-title')).toHaveTextContent('John Doe');
  });

  it('should render the phone number when customerName and phoneNumber differ', async () => {
    await renderComponent({customerName: 'John Doe', phoneNumber: '+1-408-555-0002'});
    expect(await screen.findByTestId('campaign-task-phone')).toHaveTextContent('+1-408-555-0002');
  });

  it('should NOT render phone when phoneNumber equals customerName', async () => {
    await renderComponent({customerName: 'John Doe', phoneNumber: 'John Doe'});
    expect(screen.queryByTestId('campaign-task-phone')).not.toBeInTheDocument();
  });

  it('should NOT render phone when customerName is undefined', async () => {
    await renderComponent({customerName: undefined});
    expect(screen.queryByTestId('campaign-task-phone')).not.toBeInTheDocument();
  });

  it('should render the campaign avatar', async () => {
    const {container} = await renderComponent();
    const avatar = container.querySelector('[slot="leading-controls"]');
    expect(avatar).toBeInTheDocument();
  });

  // ── Countdown / Handle Timer toggle ────────────────────────────────

  it('should render countdown when not accepted', async () => {
    await renderComponent({isAcceptClicked: false});
    expect(await screen.findByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should still render countdown when accept clicked but not yet confirmed by backend', async () => {
    await renderComponent({isAcceptClicked: true, isAccepted: false});
    expect(await screen.findByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should NOT render countdown when accepted by backend', async () => {
    await renderComponent({isAcceptClicked: true, isAccepted: true, handleTimestamp: Date.now()});
    expect(screen.queryByTestId('mock-countdown')).not.toBeInTheDocument();
  });

  it('should render handle time timer when accepted by backend with handleTimestamp', async () => {
    await renderComponent({isAcceptClicked: true, isAccepted: true, handleTimestamp: Date.now()});
    expect(await screen.findByTestId('mock-task-timer')).toBeInTheDocument();
  });

  it('should NOT render handle time timer when not accepted', async () => {
    await renderComponent({isAcceptClicked: false});
    expect(screen.queryByTestId('mock-task-timer')).not.toBeInTheDocument();
  });

  it('should render handle time timer when timerDisplayMode is handle-time', async () => {
    await renderComponent({isAcceptClicked: false, handleTimestamp: Date.now(), timerDisplayMode: 'handle-time'});
    expect(await screen.findByTestId('mock-task-timer')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-countdown')).not.toBeInTheDocument();
  });

  it('should NOT render handle time timer when handleTimestamp is undefined', async () => {
    await renderComponent({isAcceptClicked: true, handleTimestamp: undefined});
    expect(screen.queryByTestId('mock-task-timer')).not.toBeInTheDocument();
  });

  // ── Action buttons visibility ──────────────────────────────────────

  it('should render Accept, Skip, and Remove buttons when not accepted', async () => {
    await renderComponent({isAcceptClicked: false});
    expect(await screen.findByTestId('campaign-task-actions')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-task-accept-button')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  it('should show Connecting button and disabled Skip/Remove when accept clicked but not confirmed', async () => {
    await renderComponent({isAcceptClicked: true, isAccepted: false});
    expect(await screen.findByTestId('campaign-task-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
    const connectingBtn = await screen.findByTestId('campaign-task-connecting-button');
    expect(connectingBtn).toBeInTheDocument();
    expect(connectingBtn).toHaveTextContent(CAMPAIGN_CONNECTING);
    expect(await screen.findByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  it('should NOT render any action buttons when campaign is accepted by backend', async () => {
    await renderComponent({isAcceptClicked: true, isAccepted: true, handleTimestamp: Date.now()});
    expect(screen.queryByTestId('campaign-task-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-skip-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-remove-button')).not.toBeInTheDocument();
  });

  // ── Button disabled states ─────────────────────────────────────────

  it('should pass disabled prop to Accept button when isAcceptDisabled is true', async () => {
    await renderComponent({isAcceptDisabled: true});
    const button = await screen.findByTestId('campaign-task-accept-button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('should pass disabled prop to Skip button when isSkipDisabled is true', async () => {
    await renderComponent({isSkipDisabled: true});
    const button = await screen.findByTestId('campaign-task-skip-button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('should pass disabled prop to Remove button when isRemoveDisabled is true', async () => {
    await renderComponent({isRemoveDisabled: true});
    const button = await screen.findByTestId('campaign-task-remove-button');
    expect(button).toHaveProperty('disabled', true);
  });

  // ── Button click handlers ──────────────────────────────────────────

  it('should call onAccept when Accept button is clicked', async () => {
    const onAccept = jest.fn();
    await renderComponent({onAccept});
    fireEvent.click(await screen.findByTestId('campaign-task-accept-button'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('should call onSkip when Skip button is clicked', async () => {
    const onSkip = jest.fn();
    await renderComponent({onSkip});
    fireEvent.click(await screen.findByTestId('campaign-task-skip-button'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('should call onRemove when Remove button is clicked', async () => {
    const onRemove = jest.fn();
    await renderComponent({onRemove});
    fireEvent.click(await screen.findByTestId('campaign-task-remove-button'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it('should set correct aria-label on the actions container', async () => {
    await renderComponent();
    expect(await screen.findByTestId('campaign-task-actions')).toHaveAttribute('aria-label', CAMPAIGN_ACTIONS_LABEL);
  });

  it('should set correct aria-labels on action buttons', async () => {
    await renderComponent();
    expect(await screen.findByTestId('campaign-task-accept-button')).toHaveAttribute('aria-label', CAMPAIGN_ACCEPT);
    expect(await screen.findByTestId('campaign-task-skip-button')).toHaveAttribute('aria-label', CAMPAIGN_SKIP);
    expect(await screen.findByTestId('campaign-task-remove-button')).toHaveAttribute('aria-label', CAMPAIGN_REMOVE);
  });

  // ── Custom testIdPrefix ────────────────────────────────────────────

  it('should use custom testIdPrefix for data-testid attributes', async () => {
    await renderComponent({testIdPrefix: 'campaign-popover'});
    expect(await screen.findByTestId('campaign-popover-list-item')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-popover-title')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-popover-accept-button')).toBeInTheDocument();
  });

  // ── No timeout timestamp ───────────────────────────────────────────

  it('should NOT render countdown when timeoutTimestamp is undefined', async () => {
    await renderComponent({timeoutTimestamp: undefined, isAcceptClicked: false});
    expect(screen.queryByTestId('mock-countdown')).not.toBeInTheDocument();
  });
});
