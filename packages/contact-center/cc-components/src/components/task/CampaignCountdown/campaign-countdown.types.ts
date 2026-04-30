import {ILogger} from '@webex/cc-store';

export interface CampaignCountdownProps {
  /**
   * Timeout duration in seconds.
   * Use this OR timeoutTimestamp, not both.
   */
  timeoutInSeconds?: number;

  /**
   * Epoch timestamp (in milliseconds) when the countdown should expire.
   * This is where `campaignPreviewOfferTimeout` from callProcessingDetails should be passed.
   * Can be provided as a string or number - will be parsed automatically.
   * Takes precedence over timeoutInSeconds if both are provided.
   */
  timeoutTimestamp?: string | number;

  /**
   * Callback fired when the countdown reaches zero
   */
  onTimeout?: () => void;

  /**
   * Logger instance for logging purposes
   */
  logger?: ILogger;
}
