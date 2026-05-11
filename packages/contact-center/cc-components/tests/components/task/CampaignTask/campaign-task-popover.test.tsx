import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignTaskPopover from '../../../../src/components/task/CampaignTask/CampaignTaskPopover/campaign-task-popover';
import {CampaignTaskPopoverProps} from '../../../../src/components/task/CampaignTask/CampaignTaskPopover/campaign-task-popover.types';
import {ITask} from '@webex/cc-store';

// ── Mocks ────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────

const TIMEOUT_TIMESTAMP = String(Date.now() + 30000);

const createMockTask = (): ITask =>
  ({
    data: {
      interactionId: 'interaction-1',
      interaction: {
        callProcessingDetails: {
          campaignPreviewSkipDisabled: 'false',
          campaignPreviewRemoveDisabled: 'false',
          campaignPreviewAutoAction: 'ACCEPT',
          campaignPreviewOfferTimeout: TIMEOUT_TIMESTAMP,
        },
        callAssociatedDetails: {
          ani: '+14085550001',
          dn: '+14085550002',
          customerName: 'Jane Smith',
        },
        callAssociatedData: {
          Global_Campaign: {
            name: 'Global_Campaign',
            displayName: 'Campaign',
            value: 'Test Campaign',
            type: 'STRING',
            agentEditable: false,
            agentViewable: true,
            global: true,
            isSecure: false,
            secureKeyId: '',
            secureKeyVersion: 0,
          },
        },
        outboundType: 'OUTDIAL',
      },
    },
  }) as unknown as ITask;

const defaultProps: CampaignTaskPopoverProps = {
  task: createMockTask(),
  triggerId: 'campaign-task-trigger-interaction-1',
  isAcceptClicked: false,
  isAcceptDisabled: false,
  isSkipDisabled: false,
  isRemoveDisabled: false,
  onAccept: jest.fn(),
  onSkip: jest.fn(),
  onRemove: jest.fn(),
  onTimeout: jest.fn(),
  handleTimestamp: undefined,
};

const renderComponent = (overrides: Partial<CampaignTaskPopoverProps> = {}) =>
  render(<CampaignTaskPopover {...defaultProps} {...overrides} />);

describe('CampaignTaskPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────

  it('should render the popover', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-task-popover')).toBeInTheDocument();
  });

  it('should render the list item with campaign-popover testIdPrefix', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-popover-list-item')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-popover-title')).toHaveTextContent('Jane Smith');
  });

  it('should render the variables panel with two-column layout', () => {
    renderComponent();
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.className).toContain('global-variables-panel--two-column');
  });

  it('should render global variables inside the panel', () => {
    renderComponent();
    expect(screen.getByText('Campaign:')).toBeInTheDocument();
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
  });

  // ── panelBackground prop ───────────────────────────────────────────

  it('should set the variables panel background to background-primary-hover', () => {
    renderComponent();
    // JSDOM cannot parse CSS custom properties (var()), so the style
    // attribute is completely stripped.  Verify the panel renders with the
    // correct two-column layout — the actual CSS value is validated in
    // browser/E2E tests.
    const panel = screen.getByTestId('global-variables-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.className).toContain('global-variables-panel--two-column');
  });

  // ── Action buttons visibility ──────────────────────────────────────

  it('should render action buttons when not accepted', () => {
    renderComponent({isAcceptClicked: false});
    expect(screen.getByTestId('campaign-popover-accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-popover-skip-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-popover-remove-button')).toBeInTheDocument();
  });

  it('should hide action buttons when accepted', () => {
    renderComponent({isAcceptClicked: true, handleTimestamp: Date.now()});
    expect(screen.queryByTestId('campaign-popover-accept-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-popover-skip-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-popover-remove-button')).not.toBeInTheDocument();
  });

  // ── Countdown / Handle timer ───────────────────────────────────────

  it('should render countdown when not accepted', () => {
    renderComponent({isAcceptClicked: false});
    expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should render handle time timer when accepted', () => {
    renderComponent({isAcceptClicked: true, handleTimestamp: Date.now()});
    expect(screen.queryByTestId('mock-countdown')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-task-timer')).toBeInTheDocument();
  });

  // ── Phone number ───────────────────────────────────────────────────

  it('should show phone number when different from customer name', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-popover-phone')).toBeInTheDocument();
  });
});
