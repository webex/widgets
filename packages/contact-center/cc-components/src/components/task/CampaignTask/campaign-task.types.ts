import {ILogger, ITask} from '@webex/cc-store';
import {CampaignErrorType} from '../CampaignErrorDialog/campaign-error-dialog.types';

/**
 * Auto-action to perform when the campaign preview offer times out.
 * Matches the values from callProcessingDetails.campaignPreviewAutoAction.
 */
export type CampaignAutoAction = 'ACCEPT' | 'SKIP' | 'REMOVE';

/**
 * Maps a CampaignAutoAction to the corresponding CampaignErrorType
 * used when the auto-action or manual action fails.
 */
export const CAMPAIGN_ACTION_ERROR_MAP: Record<CampaignAutoAction, CampaignErrorType> = {
  ACCEPT: 'ACCEPT_FAILED',
  SKIP: 'SKIP_FAILED',
  REMOVE: 'REMOVE_FAILED',
};

/**
 * Keys of CAMPAIGN_ACTION_ERROR_MAP — used to type the error handler in CampaignTask.
 */
export type CampaignErrorActionType = keyof typeof CAMPAIGN_ACTION_ERROR_MAP;

/**
 * Campaign-specific fields on `callProcessingDetails`.
 *
 * These fields are present at runtime on campaign preview reservation
 * events but are not yet part of the installed SDK type definitions.
 * This bridge type can be removed once the SDK package is updated.
 */
export interface CampaignCallProcessingDetails {
  /** Campaign name (not UUID) */
  campaignId?: string;
  /** Indicates if the skip action is disabled for campaign preview contacts */
  campaignPreviewSkipDisabled?: string;
  /** Indicates if the remove action is disabled for campaign preview contacts */
  campaignPreviewRemoveDisabled?: string;
  /** Auto-action to perform when campaign preview offer times out (ACCEPT, SKIP, REMOVE) */
  campaignPreviewAutoAction?: string;
  /** Timestamp (ms) when the campaign preview offer expires */
  campaignPreviewOfferTimeout?: string;
}

/**
 * Properties for the CampaignTask component.
 *
 * The component renders campaign preview contact details, action buttons
 * (Accept / Skip / Remove), a countdown timer, and an error dialog.
 * When the countdown expires the configured auto-action is triggered.
 *
 * Following the pattern used by the Task component, SDK operations are
 * passed in as callback props rather than passing the cc instance directly.
 */
export interface CampaignTaskProps {
  /**
   * The campaign preview task (AgentOfferCampaignReservation).
   * Campaign metadata is read from `task.data.interaction.callProcessingDetails`.
   */
  task: ITask;

  /**
   * Accepts the campaign preview contact and initiates the outbound call.
   * Wraps `cc.acceptPreviewContact({ interactionId, campaignId })`.
   */
  acceptPreviewContact: () => Promise<void>;

  /**
   * Skips the campaign preview contact and moves to the next one.
   * Wraps `cc.skipPreviewContact({ interactionId, campaignId })`.
   */
  skipPreviewContact: () => Promise<void>;

  /**
   * Removes the campaign preview contact from the campaign list.
   * Wraps `cc.removePreviewContact({ interactionId, campaignId })`.
   */
  removePreviewContact: () => Promise<void>;

  /**
   * Cancels the campaign preview call by ending the task.
   * Wraps `task.end()`.
   */
  cancelPreviewContact: () => Promise<void>;

  /**
   * Whether the agent is logged in with a Browser (WebRTC) device.
   * When true the Cancel button is rendered so the agent can end the
   * WebRTC call.  For AGENT_DN the phone handles hangup, so the Cancel
   * button is hidden — consistent with Agent Desktop behaviour.
   */
  isBrowser?: boolean;

  /**
   * Logger instance for logging purposes.
   */
  logger?: ILogger;

  /**
   * Whether this campaign preview has been accepted.
   * Driven by the store's `acceptedCampaignIds` set — survives component
   * remounts caused by transient task-list updates during the accept
   * transition.  When `true`, action buttons and countdown are hidden
   * and the handle-time timer is shown instead.
   */
  isAccepted?: boolean;

  /**
   * The logged-in agent's ID.  Used to look up the agent's participant
   * entry when reading `joinTimestamp` for the handle-time timer.
   */
  agentId?: string;
}
