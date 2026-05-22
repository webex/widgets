import React from 'react';
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import CampaignTask from '../../../../src/components/task/CampaignTask/campaign-task';
import {CampaignTaskProps} from '../../../../src/components/task/task.types';
import {makeMockCampaignTask} from '@webex/test-fixtures';

// ── Mocks ────────────────────────────────────────────────────────────

// Capture the onTimeout callback from the most recent CampaignCountdown render
let capturedOnTimeout: (() => void) | undefined;

jest.mock('../../../../src/components/task/CampaignCountdown/campaign-countdown', () => {
  const MockCountdown = ({onTimeout}: {onTimeout?: () => void}) => {
    capturedOnTimeout = onTimeout;
    return <span data-testid="mock-countdown">Time left: 00:30</span>;
  };
  MockCountdown.displayName = 'CampaignCountdown';
  return {__esModule: true, default: MockCountdown};
});

jest.mock('../../../../src/components/task/TaskTimer/index', () => {
  const MockTaskTimer = () => <span data-testid="mock-task-timer">00:00</span>;
  MockTaskTimer.displayName = 'TaskTimer';
  return {__esModule: true, default: MockTaskTimer};
});

jest.mock('../../../../src/components/task/CampaignErrorDialog/campaign-error-dialog', () => {
  const MockDialog = ({errorType, onClose}: {errorType: string; onClose: () => void}) => (
    <div data-testid="campaign-error-dialog" data-error-type={errorType}>
      <button data-testid="campaign-error-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
  MockDialog.displayName = 'CampaignErrorDialog';
  return {__esModule: true, default: MockDialog};
});

jest.mock('../../../../src/components/task/CampaignTask/CampaignTaskPopover/campaign-task-popover', () => {
  const MockPopover = () => <div data-testid="campaign-task-popover" />;
  MockPopover.displayName = 'CampaignTaskPopover';
  return {__esModule: true, default: MockPopover};
});

jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (component: React.ComponentType<Record<string, unknown>>) => component,
}));

// ── Helpers ──────────────────────────────────────────────────────────

const createDefaultProps = (overrides: Partial<CampaignTaskProps> = {}): CampaignTaskProps => ({
  task: makeMockCampaignTask(),
  acceptPreviewContact: jest.fn().mockResolvedValue(undefined),
  skipPreviewContact: jest.fn().mockResolvedValue(undefined),
  removePreviewContact: jest.fn().mockResolvedValue(undefined),
  cancelPreviewContact: jest.fn().mockResolvedValue(undefined),
  isBrowser: false,
  logger: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  },
  ...overrides,
});

const renderComponent = (overrides: Partial<CampaignTaskProps> = {}) =>
  render(<CampaignTask {...createDefaultProps(overrides)} />);

describe('CampaignTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnTimeout = undefined;
  });

  // ── Initial rendering ──────────────────────────────────────────────

  it('should render the campaign task section', async () => {
    renderComponent();
    expect(await screen.findByTestId('campaign-task')).toBeInTheDocument();
  });

  it('should render the task list item with title', async () => {
    renderComponent();
    expect(await screen.findByTestId('campaign-task-title')).toHaveTextContent('Jane Smith');
  });

  it('should render action buttons in initial state', async () => {
    renderComponent();
    expect(await screen.findByTestId('campaign-task-accept-button')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  it('should render the countdown in initial state', () => {
    renderComponent();
    expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should render the variables panel', () => {
    const task = makeMockCampaignTask({
      interaction: {
        callAssociatedData: {
          CampaignId: {
            name: 'CampaignId',
            displayName: 'Campaign',
            value: 'CM_001',
            type: 'STRING',
            agentEditable: false,
            agentViewable: true,
            global: true,
            isSecure: false,
            secureKeyId: '',
            secureKeyVersion: 0,
          },
        },
      },
    });
    renderComponent({task});
    expect(screen.getByTestId('global-variables-panel')).toBeInTheDocument();
  });

  // ── Cancel button (Browser mode) ──────────────────────────────────

  it('should render Cancel button when isBrowser is true', () => {
    renderComponent({isBrowser: true});
    expect(screen.getByTestId('campaign-task-cancel-button')).toBeInTheDocument();
  });

  it('should NOT render Cancel button when isBrowser is false', () => {
    renderComponent({isBrowser: false});
    expect(screen.queryByTestId('campaign-task-cancel-button')).not.toBeInTheDocument();
  });

  // ── Accept flow ────────────────────────────────────────────────────

  it('should show Connecting button and keep Skip/Remove visible after Accept is clicked', async () => {
    const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    expect(acceptPreviewContact).toHaveBeenCalledTimes(1);
    // Accept button replaced with Connecting button
    expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-connecting-button')).toBeInTheDocument();
    // Skip/Remove still visible (disabled)
    expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  it('should keep Cancel button visible after Accept is clicked (browser mode)', async () => {
    const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({isBrowser: true, acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    // Cancel still visible — hidden only when isAccepted becomes true
    expect(screen.getByTestId('campaign-task-cancel-button')).toBeInTheDocument();
  });

  it('should keep countdown visible after Accept is clicked (hidden only when backend confirms)', async () => {
    const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    // Countdown still visible — handle timer only shown when isAccepted
    expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
  });

  it('should show error dialog when accept fails', async () => {
    const acceptPreviewContact = jest.fn().mockRejectedValue(new Error('Network error'));
    renderComponent({acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('campaign-error-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-error-dialog')).toHaveAttribute('data-error-type', 'ACCEPT_FAILED');
    });
  });

  it('should re-enable buttons when accept fails', async () => {
    const acceptPreviewContact = jest.fn().mockRejectedValue(new Error('fail'));
    renderComponent({acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('campaign-task-accept-button')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-task-remove-button')).toBeInTheDocument();
    });
  });

  // ── Skip flow ──────────────────────────────────────────────────────

  it('should call skipPreviewContact and disable buttons when Skip is clicked', async () => {
    const skipPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({skipPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-skip-button'));
    });

    expect(skipPreviewContact).toHaveBeenCalledTimes(1);
    // After skip, buttons should be disabled (waiting for backend event)
    expect((screen.getByTestId('campaign-task-accept-button') as unknown as {disabled: boolean}).disabled).toBe(true);
  });

  it('should show error dialog when skip fails', async () => {
    const skipPreviewContact = jest.fn().mockRejectedValue(new Error('fail'));
    renderComponent({skipPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-skip-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('campaign-error-dialog')).toHaveAttribute('data-error-type', 'SKIP_FAILED');
    });
  });

  it('should not call skipPreviewContact when Skip is disabled', () => {
    const skipPreviewContact = jest.fn();
    const task = makeMockCampaignTask({cpd: {campaignPreviewSkipDisabled: 'true'}});
    renderComponent({task, skipPreviewContact});

    fireEvent.click(screen.getByTestId('campaign-task-skip-button'));
    expect(skipPreviewContact).not.toHaveBeenCalled();
  });

  // ── Remove flow ────────────────────────────────────────────────────

  it('should call removePreviewContact when Remove is clicked', async () => {
    const removePreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({removePreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-remove-button'));
    });

    expect(removePreviewContact).toHaveBeenCalledTimes(1);
  });

  it('should show error dialog when remove fails', async () => {
    const removePreviewContact = jest.fn().mockRejectedValue(new Error('fail'));
    renderComponent({removePreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-remove-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('campaign-error-dialog')).toHaveAttribute('data-error-type', 'REMOVE_FAILED');
    });
  });

  it('should not call removePreviewContact when Remove is disabled', () => {
    const removePreviewContact = jest.fn();
    const task = makeMockCampaignTask({cpd: {campaignPreviewRemoveDisabled: 'true'}});
    renderComponent({task, removePreviewContact});

    fireEvent.click(screen.getByTestId('campaign-task-remove-button'));
    expect(removePreviewContact).not.toHaveBeenCalled();
  });

  // ── Cancel flow (Browser mode) ─────────────────────────────────────

  it('should call cancelPreviewContact when Cancel is clicked', async () => {
    const cancelPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({isBrowser: true, cancelPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-cancel-button'));
    });

    expect(cancelPreviewContact).toHaveBeenCalledTimes(1);
  });

  it('should show error dialog when cancel fails', async () => {
    const cancelPreviewContact = jest.fn().mockRejectedValue(new Error('fail'));
    renderComponent({isBrowser: true, cancelPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-cancel-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('campaign-error-dialog')).toHaveAttribute('data-error-type', 'CANCEL_FAILED');
    });
  });

  // ── Error dialog close ─────────────────────────────────────────────

  it('should dismiss error dialog when close button is clicked', async () => {
    const acceptPreviewContact = jest.fn().mockRejectedValue(new Error('fail'));
    renderComponent({acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('campaign-error-dialog')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-error-close'));
    });

    expect(screen.queryByTestId('campaign-error-dialog')).not.toBeInTheDocument();
  });

  // ── Accept state persists across task data updates ─────────────────

  it('should hide buttons and show handle time once isAccepted becomes true', async () => {
    const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
    const task = makeMockCampaignTask();
    const {rerender} = render(<CampaignTask {...createDefaultProps({acceptPreviewContact, task})} />);

    // Accept the campaign
    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    // Still in connecting state — buttons visible but Accept replaced with Connecting
    expect(screen.getByTestId('campaign-task-connecting-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();

    // Backend confirms — isAccepted becomes true
    const updatedTask = makeMockCampaignTask({cpd: {campaignPreviewOfferTimeout: String(Date.now() + 60000)}});
    rerender(<CampaignTask {...createDefaultProps({acceptPreviewContact, task: updatedTask, isAccepted: true})} />);

    // Buttons should now be hidden — backend confirmed acceptance
    expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-connecting-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-skip-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campaign-task-remove-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-task-timer')).toBeInTheDocument();
  });

  // ── State reset on new contact after skip/remove ───────────────────

  it('should reset buttons when a new contact is offered (timeout changes while not accepted)', () => {
    const task1 = makeMockCampaignTask({cpd: {campaignPreviewOfferTimeout: '1000'}});
    const props = createDefaultProps({task: task1});
    const {rerender} = render(<CampaignTask {...props} />);

    // Buttons should be visible initially
    expect(screen.getByTestId('campaign-task-accept-button')).toBeInTheDocument();

    // Simulate new contact offer with different timeout
    const task2 = makeMockCampaignTask({cpd: {campaignPreviewOfferTimeout: '2000'}});
    rerender(<CampaignTask {...createDefaultProps({task: task2})} />);

    // Buttons should still be visible (reset occurred, state is fresh)
    expect(screen.getByTestId('campaign-task-accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-task-remove-button')).toBeInTheDocument();
  });

  // ── Disabled button guards ─────────────────────────────────────────

  it('should not call acceptPreviewContact when Accept is already disabled', async () => {
    const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({acceptPreviewContact});

    // Click accept to disable it
    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    // Now buttons are gone — the guard prevents double calls
    expect(acceptPreviewContact).toHaveBeenCalledTimes(1);
  });

  // ── Caller identifier fallback ─────────────────────────────────────

  it('should use ANI as title when customerName is not available', () => {
    const task = makeMockCampaignTask({
      interaction: {
        callAssociatedDetails: {ani: '+14085550001', dn: '', customerName: undefined},
        callAssociatedData: {},
      },
    });
    renderComponent({task});
    expect(screen.getByTestId('campaign-task-title')).toHaveTextContent('+14085550001');
  });

  // ── Timeout behavior (UI-only, no API calls) ─────────────────────

  describe('handleTimeout — consistent with Agent Desktop', () => {
    it('should NOT call acceptPreviewContact when countdown expires with ACCEPT autoAction', async () => {
      const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
      renderComponent({acceptPreviewContact});

      // Trigger timeout via the captured callback
      expect(capturedOnTimeout).toBeDefined();
      await act(async () => {
        capturedOnTimeout!();
      });

      // Accept API should NOT be called — backend handles auto-accept
      expect(acceptPreviewContact).not.toHaveBeenCalled();
      // UI shows Connecting state (accept clicked locally) — countdown still visible since !isAccepted
      expect(screen.getByTestId('campaign-task-connecting-button')).toBeInTheDocument();
      expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
    });

    it('should NOT call skipPreviewContact when countdown expires with SKIP autoAction', async () => {
      const skipPreviewContact = jest.fn().mockResolvedValue(undefined);
      const task = makeMockCampaignTask({cpd: {campaignPreviewAutoAction: 'SKIP'}});
      renderComponent({task, skipPreviewContact});

      expect(capturedOnTimeout).toBeDefined();
      await act(async () => {
        capturedOnTimeout!();
      });

      // Skip API should NOT be called — backend handles auto-skip
      expect(skipPreviewContact).not.toHaveBeenCalled();
      // Buttons should be disabled
      expect(screen.getByTestId('campaign-task-accept-button')).toHaveProperty('disabled', true);
      expect(screen.getByTestId('campaign-task-skip-button')).toHaveProperty('disabled', true);
      expect(screen.getByTestId('campaign-task-remove-button')).toHaveProperty('disabled', true);
    });

    it('should NOT call removePreviewContact when countdown expires with REMOVE autoAction', async () => {
      const removePreviewContact = jest.fn().mockResolvedValue(undefined);
      const task = makeMockCampaignTask({cpd: {campaignPreviewAutoAction: 'REMOVE'}});
      renderComponent({task, removePreviewContact});

      expect(capturedOnTimeout).toBeDefined();
      await act(async () => {
        capturedOnTimeout!();
      });

      // Remove API should NOT be called — backend handles auto-remove
      expect(removePreviewContact).not.toHaveBeenCalled();
      // Buttons should be disabled
      expect(screen.getByTestId('campaign-task-accept-button')).toHaveProperty('disabled', true);
    });

    it('should show Connecting button and disable Skip/Remove on timeout for ACCEPT autoAction', async () => {
      renderComponent();

      expect(capturedOnTimeout).toBeDefined();
      await act(async () => {
        capturedOnTimeout!();
      });

      // After auto-accept timeout, Accept replaced with Connecting, Skip/Remove still visible but disabled
      expect(screen.queryByTestId('campaign-task-accept-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('campaign-task-connecting-button')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-task-skip-button')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-task-remove-button')).toBeInTheDocument();
    });

    it('should log a warning when autoAction is invalid/empty', async () => {
      const logger = {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
      };
      const task = makeMockCampaignTask({cpd: {campaignPreviewAutoAction: ''}});
      renderComponent({task, logger});

      expect(capturedOnTimeout).toBeDefined();
      await act(async () => {
        capturedOnTimeout!();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No valid auto-action configured'),
        expect.objectContaining({method: 'handleTimeout'})
      );
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it('should have correct aria-label on the section', () => {
    renderComponent();
    expect(screen.getByTestId('campaign-task')).toHaveAttribute('aria-label', 'Campaign preview contact');
  });

  it('should set aria-busy to true when accept is clicked', async () => {
    const acceptPreviewContact = jest.fn().mockResolvedValue(undefined);
    renderComponent({acceptPreviewContact});

    await act(async () => {
      fireEvent.click(screen.getByTestId('campaign-task-accept-button'));
    });

    expect(screen.getByTestId('campaign-task')).toHaveAttribute('aria-busy', 'true');
  });
});
