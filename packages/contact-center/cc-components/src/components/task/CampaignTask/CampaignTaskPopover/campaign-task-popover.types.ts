import {ILogger, ITask} from '@webex/cc-store';

/**
 * Properties for the CampaignTaskPopover component.
 *
 * Displays a hover popover over the campaign preview task with the
 * ListItem row (avatar, title, phone, countdown, action buttons)
 * and a two-column scrollable data panel of global variables.
 */
export interface CampaignTaskPopoverProps {
  /** The campaign preview task. */
  task: ITask;

  /** Logger instance for logging purposes. */
  logger?: ILogger;

  /** ID of the trigger element that opens the popover on hover. */
  triggerId: string;

  /** Whether the Accept button has been clicked (shows "Connecting..." state). */
  isAcceptClicked: boolean;

  /** Whether the Accept button is disabled. */
  isAcceptDisabled: boolean;

  /** Whether the Skip button is disabled. */
  isSkipDisabled: boolean;

  /** Whether the Remove button is disabled. */
  isRemoveDisabled: boolean;

  /** Handler for Accept button click. */
  onAccept: () => void;

  /** Handler for Skip button click. */
  onSkip: () => void;

  /** Handler for Remove button click. */
  onRemove: () => void;

  /** Handler for countdown timeout. */
  onTimeout: () => void;

  /** Timestamp (ms) when the campaign call was accepted — used for the handle time timer. */
  handleTimestamp?: number;
}
