import React, {useState, useCallback, useRef, useEffect} from 'react';
import {Button} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import CampaignErrorDialog from '../CampaignErrorDialog/campaign-error-dialog';
import GlobalVariablesPanel from '../GlobalVariablesPanel/global-variables-panel';
import CampaignTaskPopover from './CampaignTaskPopover/campaign-task-popover';
import CampaignTaskListItem from './CampaignTaskListItem/campaign-task-list-item';
import {CampaignErrorType} from '../CampaignErrorDialog/campaign-error-dialog.types';
import {
  CampaignTaskProps,
  CampaignAutoAction,
  CampaignCallProcessingDetails,
  CAMPAIGN_ACTION_ERROR_MAP,
  CampaignErrorActionType,
} from './campaign-task.types';
import {CallAssociatedDataMap, getCallerIdentifier} from '../task.types';
import {getAgentViewableGlobalVariables} from '../Task/task.utils';
import {CANCEL, CAMPAIGN_TASK_REGION_LABEL} from '../constants';
import './campaign-task.style.scss';

const LOG_MODULE = 'cc-components#campaign-task';

interface ParticipantWithJoin {
  hasJoined?: boolean;
  joinTimestamp?: number;
}

/**
 * Extract the agent's joinTimestamp from the task participants.
 * Looks up the agent by `agentId` so that we always read the correct
 * participant even when multiple participants have joined.
 * Returns `undefined` when the agent hasn't joined yet.
 */
const getAgentJoinTimestamp = (task: CampaignTaskProps['task'], agentId?: string): number | undefined => {
  const participants = task.data.interaction.participants as Record<string, ParticipantWithJoin> | undefined;

  if (!participants) return undefined;

  if (agentId && participants[agentId]) {
    const agent = participants[agentId];
    return agent.hasJoined && agent.joinTimestamp ? agent.joinTimestamp : undefined;
  }

  // Fallback: if agentId is not provided or not found, use first joined participant
  for (const participant of Object.values(participants)) {
    if (participant.hasJoined && participant.joinTimestamp) {
      return participant.joinTimestamp;
    }
  }

  return undefined;
};

const getCampaignCpd = (cpd: Record<string, unknown> | undefined): CampaignCallProcessingDetails => {
  if (!cpd) return {};
  return cpd as CampaignCallProcessingDetails;
};

const CampaignTask: React.FC<CampaignTaskProps> = ({
  task,
  acceptPreviewContact,
  skipPreviewContact,
  removePreviewContact,
  cancelPreviewContact,
  isBrowser = false,
  logger,
  isAccepted = false,
  agentId,
}) => {
  const cpd = task.data.interaction.callProcessingDetails;
  const campaignCpd = getCampaignCpd(cpd as unknown as Record<string, unknown>);
  const interactionId = task.data.interactionId;
  const timeoutTimestamp = campaignCpd.campaignPreviewOfferTimeout;
  const autoAction = (campaignCpd.campaignPreviewAutoAction ?? '') as CampaignAutoAction | '';

  // @ts-expect-error callAssociatedDetails not yet typed in SDK
  const callAssociatedDetails = task.data.interaction.callAssociatedDetails;
  const ani = callAssociatedDetails?.ani ?? '';
  const dn = callAssociatedDetails?.dn ?? '';
  const customerName = callAssociatedDetails?.customerName;
  const outboundType = task.data.interaction.outboundType;
  const title = customerName || getCallerIdentifier(ani, dn, outboundType);
  const phoneNumber = getCallerIdentifier(ani, dn, outboundType);

  const callAssociatedData = (task.data.interaction as unknown as {callAssociatedData?: CallAssociatedDataMap})
    .callAssociatedData;
  const latestGlobalVariables = getAgentViewableGlobalVariables(callAssociatedData);

  // Persist global variables across task updates — some store refreshes
  // replace the task with a snapshot that omits callAssociatedData.
  const globalVariablesRef = useRef(latestGlobalVariables);
  if (latestGlobalVariables.length > 0) {
    globalVariablesRef.current = latestGlobalVariables;
  }
  const globalVariables = globalVariablesRef.current;

  const [isAcceptClicked, setIsAcceptClicked] = useState<boolean>(isAccepted);
  const [handleTimestamp, setHandleTimestamp] = useState<number | undefined>(
    isAccepted ? (getAgentJoinTimestamp(task, agentId) ?? Date.now()) : undefined
  );
  const [isAcceptDisabled, setIsAcceptDisabled] = useState<boolean>(isAccepted);
  const [isSkipButtonDisabled, setIsSkipButtonDisabled] = useState<boolean>(
    isAccepted || campaignCpd.campaignPreviewSkipDisabled === 'true'
  );
  const [isRemoveButtonDisabled, setIsRemoveButtonDisabled] = useState<boolean>(
    isAccepted || campaignCpd.campaignPreviewRemoveDisabled === 'true'
  );
  const [errorType, setErrorType] = useState<CampaignErrorType | null>(null);

  const unmountedRef = useRef<boolean>(false);
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // Sync local state when the store-driven isAccepted prop changes.
  // This handles the case where the store marks the campaign as accepted
  // (e.g. via handleCampaignPreviewReservation) and the component was
  // already mounted.
  useEffect(() => {
    if (isAccepted && !isAcceptClicked) {
      setIsAcceptClicked(true);
      setHandleTimestamp(getAgentJoinTimestamp(task, agentId) ?? Date.now());
      setIsAcceptDisabled(true);
      setIsSkipButtonDisabled(true);
      setIsRemoveButtonDisabled(true);
    }
  }, [isAccepted]);

  // Once the server-side joinTimestamp arrives, align handleTimestamp
  // so the timer matches CallControlCAD exactly.
  useEffect(() => {
    if (!isAcceptClicked) return;
    const joinTs = getAgentJoinTimestamp(task, agentId);
    if (joinTs && joinTs !== handleTimestamp) {
      setHandleTimestamp(joinTs);
    }
  }, [task, isAcceptClicked]);

  // Reset local state when a new contact is offered on the same task (after skip/remove).
  // The SDK emits TASK_CAMPAIGN_CONTACT_UPDATED with updated callProcessingDetails;
  // we detect this by tracking the offerTimeout value which changes per contact.
  const prevTimeoutRef = useRef<string | undefined>(timeoutTimestamp);

  useEffect(() => {
    // Only reset when a new contact is offered after skip/remove (not after accept).
    // After accept the task data updates but should keep the accepted state.
    if (!isAccepted && prevTimeoutRef.current !== undefined && timeoutTimestamp !== prevTimeoutRef.current) {
      logger?.info('CC-Widgets: CampaignTask: New contact offered, resetting state', {
        module: LOG_MODULE,
        method: 'useEffect[timeoutTimestamp]',
      });
      setIsAcceptClicked(false);
      setHandleTimestamp(undefined);
      setIsAcceptDisabled(false);
      setIsSkipButtonDisabled(campaignCpd.campaignPreviewSkipDisabled === 'true');
      setIsRemoveButtonDisabled(campaignCpd.campaignPreviewRemoveDisabled === 'true');
      setIsCancelDisabled(false);
      setErrorType(null);
    }
    prevTimeoutRef.current = timeoutTimestamp;
  }, [
    timeoutTimestamp,
    isAccepted,
    campaignCpd.campaignPreviewSkipDisabled,
    campaignCpd.campaignPreviewRemoveDisabled,
    logger,
  ]);

  const disableAllButtons = useCallback((): void => {
    setIsAcceptDisabled(true);
    setIsSkipButtonDisabled(true);
    setIsRemoveButtonDisabled(true);
  }, []);

  const resetButtons = useCallback((): void => {
    setIsAcceptClicked(false);
    setIsAcceptDisabled(false);
    setIsSkipButtonDisabled(campaignCpd.campaignPreviewSkipDisabled === 'true');
    setIsRemoveButtonDisabled(campaignCpd.campaignPreviewRemoveDisabled === 'true');
  }, [campaignCpd.campaignPreviewSkipDisabled, campaignCpd.campaignPreviewRemoveDisabled]);

  const handleActionError = useCallback(
    (action: CampaignErrorActionType, method: string, error: unknown): void => {
      if (unmountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error(`CC-Widgets: CampaignTask: ${action} failed: ${errorMessage}`, {
        module: LOG_MODULE,
        method,
      });

      setErrorType(CAMPAIGN_ACTION_ERROR_MAP[action]);
      resetButtons();
    },
    [resetButtons, logger]
  );

  const handleAccept = useCallback((): void => {
    if (isAcceptDisabled) return;

    logger?.info('CC-Widgets: CampaignTask: Accept button clicked', {
      module: LOG_MODULE,
      method: 'handleAccept',
    });

    setIsAcceptClicked(true);
    setHandleTimestamp(Date.now());
    disableAllButtons();

    acceptPreviewContact().catch((error: unknown) => handleActionError('ACCEPT', 'handleAccept', error));
  }, [isAcceptDisabled, acceptPreviewContact, disableAllButtons, handleActionError, logger]);

  const handleSkip = useCallback((): void => {
    if (isSkipButtonDisabled) return;

    logger?.info('CC-Widgets: CampaignTask: Skip button clicked', {
      module: LOG_MODULE,
      method: 'handleSkip',
    });

    disableAllButtons();

    skipPreviewContact().catch((error: unknown) => handleActionError('SKIP', 'handleSkip', error));
  }, [isSkipButtonDisabled, skipPreviewContact, disableAllButtons, handleActionError, logger]);

  const handleRemove = useCallback((): void => {
    if (isRemoveButtonDisabled) return;

    logger?.info('CC-Widgets: CampaignTask: Remove button clicked', {
      module: LOG_MODULE,
      method: 'handleRemove',
    });

    disableAllButtons();

    removePreviewContact().catch((error: unknown) => handleActionError('REMOVE', 'handleRemove', error));
  }, [isRemoveButtonDisabled, removePreviewContact, disableAllButtons, handleActionError, logger]);

  const handleTimeout = useCallback((): void => {
    logger?.info('CC-Widgets: CampaignTask: Countdown expired, updating UI for auto-action', {
      module: LOG_MODULE,
      method: 'handleTimeout',
    });

    // Consistent with Agent Desktop: the UI only updates button states on
    // timeout — the backend executes the actual auto-action on its own
    // timer.  Calling the API from the UI would double-fire the action and
    // could auto-accept campaigns the agent never saw.
    switch (autoAction) {
      case 'ACCEPT':
        setIsAcceptClicked(true);
        setHandleTimestamp(Date.now());
        disableAllButtons();
        logger?.info('CC-Widgets: CampaignTask: Auto-accept UI state set, awaiting backend', {
          module: LOG_MODULE,
          method: 'handleTimeout',
        });
        break;
      case 'SKIP':
      case 'REMOVE':
        disableAllButtons();
        logger?.info(`CC-Widgets: CampaignTask: Auto-${autoAction.toLowerCase()} UI state set, awaiting backend`, {
          module: LOG_MODULE,
          method: 'handleTimeout',
        });
        break;
      default:
        logger?.warn('CC-Widgets: CampaignTask: No valid auto-action configured', {
          module: LOG_MODULE,
          method: 'handleTimeout',
        });
        break;
    }
  }, [autoAction, disableAllButtons, logger]);

  const [isCancelDisabled, setIsCancelDisabled] = useState<boolean>(false);

  const handleCancel = useCallback((): void => {
    if (isCancelDisabled) return;

    logger?.info('CC-Widgets: CampaignTask: Cancel button clicked', {
      module: LOG_MODULE,
      method: 'handleCancel',
    });

    setIsCancelDisabled(true);
    disableAllButtons();

    cancelPreviewContact().catch((error: unknown) => {
      if (unmountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error(`CC-Widgets: CampaignTask: Cancel failed: ${errorMessage}`, {
        module: LOG_MODULE,
        method: 'handleCancel',
      });

      setErrorType('CANCEL_FAILED');
      setIsCancelDisabled(false);
      resetButtons();
    });
  }, [isCancelDisabled, cancelPreviewContact, disableAllButtons, resetButtons, logger]);

  const handleErrorClose = useCallback((): void => {
    setErrorType(null);
  }, []);

  const campaignTaskTriggerId = `campaign-task-trigger-${interactionId}`;

  return (
    <section
      className="campaign-task"
      aria-label={CAMPAIGN_TASK_REGION_LABEL}
      aria-busy={isAcceptClicked}
      data-testid="campaign-task"
      id={campaignTaskTriggerId}
    >
      <CampaignTaskPopover
        task={task}
        logger={logger}
        triggerId={campaignTaskTriggerId}
        isAcceptClicked={isAcceptClicked}
        isAcceptDisabled={isAcceptDisabled}
        isSkipDisabled={isSkipButtonDisabled}
        isRemoveDisabled={isRemoveButtonDisabled}
        onAccept={handleAccept}
        onSkip={handleSkip}
        onRemove={handleRemove}
        onTimeout={handleTimeout}
        handleTimestamp={handleTimestamp}
      />
      <CampaignTaskListItem
        title={title}
        phoneNumber={phoneNumber}
        customerName={customerName}
        timeoutTimestamp={timeoutTimestamp}
        isAcceptClicked={isAcceptClicked}
        isAcceptDisabled={isAcceptDisabled}
        isSkipDisabled={isSkipButtonDisabled}
        isRemoveDisabled={isRemoveButtonDisabled}
        onAccept={handleAccept}
        onSkip={handleSkip}
        onRemove={handleRemove}
        onTimeout={handleTimeout}
        handleTimestamp={handleTimestamp}
        logger={logger}
        className="campaign-task-list-item"
      />

      <div className="campaign-task-expanded" data-testid="campaign-task-expanded">
        <GlobalVariablesPanel variables={globalVariables} />

        {isBrowser && !isAcceptClicked && (
          <Button
            variant="secondary"
            color="negative"
            onClick={handleCancel}
            disabled={isCancelDisabled}
            className="campaign-task-cancel-button"
            aria-label={CANCEL}
            data-testid="campaign-task-cancel-button"
            prefixIcon="cancel-bold"
          >
            {CANCEL}
          </Button>
        )}
      </div>

      {errorType !== null && <CampaignErrorDialog errorType={errorType} isOpen={true} onClose={handleErrorClose} />}
    </section>
  );
};

const CampaignTaskWithMetrics = withMetrics(CampaignTask, 'CampaignTask');
export default CampaignTaskWithMetrics;
