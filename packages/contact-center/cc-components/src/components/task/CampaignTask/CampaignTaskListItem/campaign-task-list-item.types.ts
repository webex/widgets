import {ILogger} from '@webex/cc-store';

/**
 * Properties for the CampaignTaskListItem component.
 *
 * Renders the ListItem row shared between the CampaignTask card
 * and CampaignTaskPopover: avatar, title, phone, countdown, and
 * Accept / Skip / Remove action buttons.
 */
export interface CampaignTaskListItemProps {
  /** Display title (customer name or caller identifier). */
  title: string;

  /** Phone number to show as secondary label. */
  phoneNumber?: string;

  /** Customer name — used to decide whether to show phone as secondary label. */
  customerName?: string;

  /** Campaign preview offer timeout timestamp (ms string). */
  timeoutTimestamp?: string;

  /** Whether the Accept button has been clicked (shows "Connecting..." state). */
  isAcceptClicked: boolean;

  /** Whether the campaign preview has been accepted by the backend (call controls visible). */
  isAccepted: boolean;

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

  /** Logger instance. */
  logger?: ILogger;

  /** Optional CSS class name applied to the ListItem. */
  className?: string;

  /** Optional test ID prefix for data-testid attributes. */
  testIdPrefix?: string;
}
