import React, {useEffect, useRef, useState} from 'react';
import {ButtonCircle, TooltipNext, Text, PopoverNext} from '@momentum-ui/react-collaboration';
import type {PopoverInstance} from '@momentum-ui/react-collaboration';
import {Avatar, Icon} from '@momentum-design/components/dist/react';
import TaskTimer from '../../TaskTimer';
import {CallControlConsultComponentsProps} from '../../task.types';
import {createConsultButtons, getVisibleButtons, createTimerKey} from './call-control-custom.utils';
import ConsultTransferPopoverComponent from './consult-transfer-popover';
import {runMidCallActionBeforeTelephony} from '../call-control.utils';

const CallControlConsultComponent: React.FC<CallControlConsultComponentsProps> = ({
  agentName,
  consultTimerLabel,
  consultTimerTimestamp,
  consultTransfer,
  endConsultCall,
  consultConference,
  switchToMainCall,
  logger,
  isMuted,
  controls,
  toggleConsultMute,
  conferenceEnabled = true,
  enableWxBetterTogether = false,
  currentTask = null,
  aiSummary,
}) => {
  const [isMidCallActionPending, setIsMidCallActionPending] = useState(false);
  const midCallActionPendingRef = useRef(false);
  const existingPartyPopovers = useRef<Record<string, PopoverInstance | undefined>>({});
  // Use the label and timestamp calculated in helper.ts
  // Stable key based on timestamp to prevent timer resets
  const timerKey = createTimerKey(consultTimerTimestamp);

  // Use consultTimerTimestamp with fallback
  const effectiveTimestamp = consultTimerTimestamp || Date.now();
  const currentInteractionId =
    currentTask?.data?.interaction?.mainInteractionId ??
    currentTask?.data?.interactionId ??
    currentTask?.data?.interaction?.interactionId ??
    'no-interaction';

  useEffect(() => {
    midCallActionPendingRef.current = false;
    setIsMidCallActionPending(false);
  }, [currentInteractionId]);

  const setMidCallActionPending = (pending: boolean) => {
    midCallActionPendingRef.current = pending;
    setIsMidCallActionPending(pending);
  };

  const buttons = createConsultButtons(
    isMuted,
    controls,
    consultTransfer,
    toggleConsultMute,
    endConsultCall,
    consultConference,
    switchToMainCall,
    logger,
    conferenceEnabled,
    enableWxBetterTogether,
    currentTask
  );

  // Filter buttons that should be shown, then map them
  const visibleButtons = getVisibleButtons(buttons);

  return (
    <div className="call-control-consult">
      <div className="consult-header">
        <Avatar iconName="handset-filled" className="task-avatar" size={32} />
        <div>
          <Text tagName="p" type="body-large-bold" className="consult-agent-name">
            {agentName}
          </Text>
          <Text tagName="p" type="body-secondary" className="consult-sub-text">
            {consultTimerLabel}&nbsp;&bull;&nbsp;
            <TaskTimer key={timerKey} startTimeStamp={effectiveTimestamp} />
          </Text>
        </div>
      </div>

      <div className="consult-buttons consult-buttons-container">
        {visibleButtons.map((button) => {
          const existingPartySummary =
            button.key === 'transfer'
              ? aiSummary?.transfer
              : button.key === 'conference'
                ? aiSummary?.consult
                : undefined;
          const shouldRenderExistingPartyPopover = existingPartySummary !== undefined;

          if (shouldRenderExistingPartyPopover) {
            const popoverKey = `${button.key}:${currentInteractionId}`;
            const requestSummaryOnOpen = button.key === 'transfer' || existingPartySummary.state === 'omitted';
            const confirmLabel = button.key === 'conference' ? 'Merge' : button.tooltip;

            return (
              <PopoverNext
                key={popoverKey}
                color="primary"
                delay={[0, 0]}
                placement="bottom"
                showArrow
                variant="medium"
                interactive
                offsetDistance={2}
                className="agent-popover"
                trigger="click"
                setInstance={(instance) => {
                  existingPartyPopovers.current[popoverKey] =
                    typeof instance === 'function' ? instance(existingPartyPopovers.current[popoverKey]) : instance;
                }}
                closeButtonPlacement="none"
                triggerComponent={
                  <TooltipNext
                    triggerComponent={
                      <ButtonCircle
                        className={button.className}
                        disabled={button.disabled}
                        data-testid={`${button.key}-consult-btn`}
                      >
                        <Icon className={`${button.className}-icon`} name={button.icon} />
                      </ButtonCircle>
                    }
                    color="primary"
                    delay={[0, 0]}
                    placement="bottom-start"
                    type="description"
                    variant="small"
                    className="tooltip"
                  >
                    <p>{button.tooltip}</p>
                  </TooltipNext>
                }
              >
                <ConsultTransferPopoverComponent
                  key={popoverKey}
                  onClose={() => existingPartyPopovers.current[popoverKey]?.hide()}
                  isTelephony
                  destinationLayout="existing-party-action"
                  heading={button.tooltip}
                  buttonIcon={button.icon}
                  buddyAgents={[]}
                  loadingBuddyAgents={false}
                  onAgentSelect={() => undefined}
                  onQueueSelect={() => undefined}
                  onEntryPointSelect={() => undefined}
                  onDialNumberSelect={() => undefined}
                  action={button.key === 'transfer' ? 'Transfer' : 'Consult'}
                  summaryActionType={button.key === 'transfer' ? 'TRANSFER' : 'CONSULT'}
                  requestSummaryOnOpen={requestSummaryOnOpen}
                  availableDestinations={[]}
                  summary={existingPartySummary}
                  requestMidCallSummary={aiSummary?.requestMidCallSummary}
                  isActionPending={isMidCallActionPending}
                  existingPartyConfirmLabel={confirmLabel}
                  onExistingPartyConfirm={() => {
                    void runMidCallActionBeforeTelephony({
                      summary: existingPartySummary,
                      sendMidCallSummaryBeforeAction: aiSummary?.sendMidCallSummaryBeforeAction,
                      isPending: () => midCallActionPendingRef.current,
                      setPending: setMidCallActionPending,
                      runTelephonyAction: () => {
                        if (button.key === 'transfer') {
                          consultTransfer();
                        } else {
                          consultConference();
                        }
                        existingPartyPopovers.current[popoverKey]?.hide();
                      },
                      logger,
                      method: 'handleExistingPartyConfirm',
                    });
                  }}
                  logger={logger}
                />
              </PopoverNext>
            );
          }

          return (
            <TooltipNext
              key={button.key}
              triggerComponent={
                <ButtonCircle
                  className={button.className}
                  onPress={button.onClick}
                  disabled={button.disabled}
                  data-testid={`${button.key}-consult-btn`}
                >
                  <Icon className={`${button.className}-icon`} name={button.icon} />
                </ButtonCircle>
              }
              color="primary"
              delay={[0, 0]}
              placement="bottom-start"
              type="description"
              variant="small"
              className="tooltip"
            >
              <p>{button.tooltip}</p>
            </TooltipNext>
          );
        })}
      </div>
    </div>
  );
};

export default CallControlConsultComponent;
