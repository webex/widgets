import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';

import {CallControlAISummaryProps, CallControlComponentProps, CallControlMenuType} from '../task.types';
import './call-control.styles.scss';
import {PopoverNext, TooltipNext, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import type {PopoverInstance} from '@momentum-ui/react-collaboration';
import {Icon, Button, Select, Option} from '@momentum-design/components/dist/react';
import ConsultTransferPopoverComponent from './CallControlCustom/consult-transfer-popover';
import WrapUpSummary from './CallControlCustom/wrap-up-summary';
import CallControlDtmfKeypad from './call-control-dtmf-keypad';
import AutoWrapupTimer from '../AutoWrapupTimer/AutoWrapupTimer';
import type {MEDIA_CHANNEL as MediaChannelType} from '../task.types';
import {DestinationType} from '@webex/cc-store';
import {WRAP_UP, WRAP_UP_INTERACTION, WRAP_UP_REASON, SELECT, SUBMIT_WRAP_UP} from '../constants';
import {
  handleToggleHold as handleToggleHoldUtil,
  handleMuteToggle as handleMuteToggleUtil,
  handleWrapupCall as handleWrapupCallUtil,
  handleWrapupChange as handleWrapupChangeUtil,
  handleTargetSelect as handleTargetSelectUtil,
  handleCloseButtonPress,
  handleWrapupReasonChange,
  handleAudioRef,
  runMidCallActionBeforeTelephony,
  getMediaType,
  isTelephonyMediaType,
  buildCallControlButtons,
  filterButtonsForConsultation,
  getConsultFilterPhase,
  updateCallStateFromTask,
  applyWxAppTelephonyControlVisibility,
} from './call-control.utils';
import {withMetrics} from '@webex/cc-ui-logging';

type MidCallSummary = NonNullable<CallControlAISummaryProps['consult']>;

function CallControlComponent(props: CallControlComponentProps) {
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [agentMenuType, setAgentMenuType] = useState<CallControlMenuType | null>(null);
  const [isMuteButtonDisabled, setIsMuteButtonDisabled] = useState(false);
  const [isMidCallActionPending, setIsMidCallActionPending] = useState(false);
  const [isWrapupCompletionPending, setIsWrapupCompletionPending] = useState(false);
  const midCallActionPendingRef = useRef(false);
  const wrapupCompletionPromiseRef = useRef<Promise<unknown> | null>(null);
  const agentPopovers = useRef<Record<string, PopoverInstance | undefined>>({});
  const wrapUpSurfaceRef = useRef<HTMLDivElement | null>(null);
  const focusedWrapUpControlRef = useRef<HTMLElement | null>(null);

  const {
    currentTask,
    isHeld,
    toggleHold,
    toggleRecording,
    toggleMute,
    sendDtmf = () => undefined,
    isMuted,
    endCall,
    wrapupCall,
    wrapupCodes,
    isRecording,
    setIsRecording,
    buddyAgents,
    loadingBuddyAgents,
    loadBuddyAgents,
    transferCall,
    consultCall,
    exitConference,
    switchToConsult,
    consultConference,
    consultTransfer,
    callControlAudio,
    setConsultAgentName,
    setLastTargetType,
    controls,
    logger,
    secondsUntilAutoWrapup,
    cancelAutoWrapup,
    getAddressBookEntries,
    getEntryPoints,
    getQueuesFetcher,
    consultTransferOptions,
    aiSummary,
    conferenceEnabled = true,
    enableWxBetterTogether = false,
    agentDeviceType,
  } = props;

  useLayoutEffect(() => {
    const previous = focusedWrapUpControlRef.current;
    const active = document.activeElement;
    // Capability revocation replaces the entire summary with the legacy form.
    // Its stable parent owns focus recovery when the focused child is removed.
    if (previous && !previous.isConnected && (!active || active === document.body || !active.isConnected)) {
      wrapUpSurfaceRef.current?.focus();
    }
    if (previous && !previous.isConnected) focusedWrapUpControlRef.current = null;
  }, [aiSummary?.postCall]);

  useEffect(() => {
    updateCallStateFromTask(currentTask, setIsRecording, logger);
  }, [currentTask, logger]);

  useEffect(() => {
    setShowAgentMenu(false);
    setAgentMenuType(null);
    midCallActionPendingRef.current = false;
    wrapupCompletionPromiseRef.current = null;
    setIsMidCallActionPending(false);
    setIsWrapupCompletionPending(false);
  }, [currentTask?.data?.interactionId]);

  const handletoggleHold = () => {
    handleToggleHoldUtil(isHeld, toggleHold, logger);
  };

  const handleMuteToggle = () => {
    handleMuteToggleUtil(toggleMute, setIsMuteButtonDisabled, logger);
  };

  const runWrapupCompletion = (wrapupReason: string | null, wrapupId: string | null) => {
    const existingCompletion = wrapupCompletionPromiseRef.current;
    if (existingCompletion) {
      return existingCompletion;
    }

    setIsWrapupCompletionPending(true);
    const completion = handleWrapupCallUtil(
      wrapupReason,
      wrapupId,
      wrapupCall,
      setSelectedWrapupReason,
      setSelectedWrapupId,
      logger
    );
    wrapupCompletionPromiseRef.current = completion;
    void completion.then(
      () => {
        if (wrapupCompletionPromiseRef.current === completion) {
          wrapupCompletionPromiseRef.current = null;
          setIsWrapupCompletionPending(false);
        }
      },
      () => {
        if (wrapupCompletionPromiseRef.current === completion) {
          wrapupCompletionPromiseRef.current = null;
          setIsWrapupCompletionPending(false);
        }
      }
    );
    return completion;
  };

  const handleWrapupCallLocal = () => {
    void runWrapupCompletion(selectedWrapupReason, selectedWrapupId);
  };

  const handleWrapupChange = (text, value) => {
    handleWrapupChangeUtil(text, value, setSelectedWrapupReason, setSelectedWrapupId, logger);
  };

  const setMidCallActionPending = (pending: boolean) => {
    midCallActionPendingRef.current = pending;
    setIsMidCallActionPending(pending);
  };

  const runAfterMidCallSummary = (
    summary: MidCallSummary | undefined,
    method: string,
    runTelephonyAction: () => void | Promise<void>
  ) => {
    void runMidCallActionBeforeTelephony({
      summary,
      sendMidCallSummaryBeforeAction: aiSummary?.sendMidCallSummaryBeforeAction,
      isPending: () => midCallActionPendingRef.current,
      setPending: setMidCallActionPending,
      runTelephonyAction,
      logger,
      method,
    });
  };

  const handleTargetSelect = (
    id: string,
    name: string,
    type: DestinationType,
    allowParticipantsToInteract: boolean
  ) => {
    const summary = agentMenuType === 'Consult' ? aiSummary?.consult : aiSummary?.transfer;

    runAfterMidCallSummary(summary, 'handleTargetSelect', () =>
      handleTargetSelectUtil(
        id,
        name,
        type,
        allowParticipantsToInteract,
        agentMenuType,
        consultCall,
        transferCall,
        setConsultAgentName,
        setLastTargetType,
        logger
      )
    );
  };

  const currentMediaType = getMediaType(
    currentTask.data.interaction.mediaType as MediaChannelType,
    currentTask.data.interaction.mediaChannel as MediaChannelType,
    logger
  );

  const mediaType = currentTask.data.interaction.mediaType as MediaChannelType;
  const isTelephony = isTelephonyMediaType(mediaType, logger);
  const currentInteractionId =
    currentTask?.data?.interaction?.mainInteractionId ??
    currentTask?.data?.interactionId ??
    currentTask?.data?.interaction?.interactionId ??
    'no-interaction';

  const buttons = buildCallControlButtons(
    isMuted,
    isRecording,
    isMuteButtonDisabled,
    currentMediaType,
    controls,
    isHeld,
    handleMuteToggle,
    handletoggleHold,
    toggleRecording,
    endCall,
    exitConference,
    switchToConsult,
    consultTransfer,
    consultConference,
    logger,
    conferenceEnabled
  );

  const wxAppGatedButtons = applyWxAppTelephonyControlVisibility(
    buttons,
    currentTask,
    controls,
    isTelephony,
    enableWxBetterTogether,
    agentDeviceType
  );

  const consultFilterPhase = getConsultFilterPhase(currentTask, controls);
  const filteredButtons = filterButtonsForConsultation(wxAppGatedButtons, consultFilterPhase, isTelephony, logger);

  if (!currentTask) return null;

  return (
    <>
      <audio
        ref={(audioElement) => handleAudioRef(audioElement, callControlAudio, logger)}
        id="remote-audio"
        autoPlay
      ></audio>
      <div className="call-control-container" data-testid="call-control-container">
        {!controls?.main?.wrapup?.isVisible && (
          <div className="button-group">
            {filteredButtons.map((button, index) => {
              if (!button.isVisible) return null;

              const existingPartySummary =
                button.id === 'transferConsult'
                  ? aiSummary?.transfer
                  : button.id === 'conference'
                    ? aiSummary?.consult
                    : undefined;
              const shouldRenderExistingPartyPopover =
                isTelephony &&
                (button.id === 'transferConsult' || button.id === 'conference') &&
                existingPartySummary !== undefined;

              if (shouldRenderExistingPartyPopover) {
                const popoverKey = `${button.id}:${currentInteractionId}`;
                const confirmLabel = button.id === 'conference' ? 'Merge' : button.tooltip;
                const requestSummaryOnOpen =
                  button.id === 'transferConsult' || existingPartySummary.state === 'omitted';

                return (
                  <PopoverNext
                    key={popoverKey}
                    onHide={() => {
                      setShowAgentMenu(false);
                      setAgentMenuType(null);
                    }}
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
                      agentPopovers.current[popoverKey] =
                        typeof instance === 'function' ? instance(agentPopovers.current[popoverKey]) : instance;
                    }}
                    closeButtonPlacement="none"
                    triggerComponent={
                      <TooltipNext
                        key={index}
                        triggerComponent={
                          <ButtonCircle
                            className={button.className}
                            aria-label={button.tooltip}
                            disabled={button.disabled}
                            data-testid={button.dataTestId}
                          >
                            <Icon className={button.className + '-icon'} name={button.icon} />
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
                      onClose={() => agentPopovers.current[popoverKey]?.hide()}
                      isTelephony={isTelephony}
                      destinationLayout="existing-party-action"
                      heading={button.tooltip}
                      buttonIcon={button.icon}
                      buddyAgents={[]}
                      loadingBuddyAgents={false}
                      onAgentSelect={() => undefined}
                      onQueueSelect={() => undefined}
                      onEntryPointSelect={() => undefined}
                      onDialNumberSelect={() => undefined}
                      action={button.id === 'transferConsult' ? 'Transfer' : 'Consult'}
                      summaryActionType={button.id === 'transferConsult' ? 'TRANSFER' : 'CONSULT'}
                      requestSummaryOnOpen={requestSummaryOnOpen}
                      availableDestinations={[]}
                      consultTransferOptions={consultTransferOptions}
                      summary={existingPartySummary}
                      requestMidCallSummary={aiSummary?.requestMidCallSummary}
                      isActionPending={isMidCallActionPending}
                      existingPartyConfirmLabel={confirmLabel}
                      onExistingPartyConfirm={() =>
                        runAfterMidCallSummary(existingPartySummary, 'handleExistingPartyConfirm', async () => {
                          if (button.id === 'transferConsult') {
                            await consultTransfer();
                          } else {
                            await consultConference();
                          }
                          agentPopovers.current[popoverKey]?.hide();
                        })
                      }
                      logger={logger}
                    />
                  </PopoverNext>
                );
              }

              if (button.menuType) {
                const action = button.menuType === 'Transfer' ? 'Transfer' : 'Consult';
                const availableDestinations =
                  button.menuType === 'Keypad'
                    ? []
                    : action === 'Transfer'
                      ? (controls.consultTransferDestinations?.transfer ?? [])
                      : (controls.consultTransferDestinations?.consult ?? []);

                return (
                  <PopoverNext
                    key={index}
                    onShow={() => {
                      logger.info(`CC-Widgets: CallControl: showing ${button.menuType} popover`, {
                        module: 'call-control.tsx',
                        method: 'onShowPopover',
                      });
                      setShowAgentMenu(true);
                      setAgentMenuType(button.menuType as CallControlMenuType);
                      if (button.menuType !== 'Keypad' && availableDestinations.includes('agent')) {
                        loadBuddyAgents(action);
                      }
                    }}
                    onHide={() => {
                      setShowAgentMenu(false);
                      setAgentMenuType(null);
                    }}
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
                      agentPopovers.current[button.menuType] =
                        typeof instance === 'function' ? instance(agentPopovers.current[button.menuType]) : instance;
                    }}
                    closeButtonPlacement={isTelephony && button.menuType !== 'Keypad' ? 'none' : 'top-right'}
                    closeButtonProps={{
                      'aria-label': 'Close popover',
                      onPress: () => handleCloseButtonPress(setShowAgentMenu, setAgentMenuType, logger),
                      outline: true,
                    }}
                    triggerComponent={
                      <TooltipNext
                        key={index}
                        triggerComponent={
                          <ButtonCircle
                            className={button.className}
                            aria-label={button.tooltip}
                            disabled={button.disabled}
                            data-testid={button.dataTestId}
                          >
                            <Icon className={button.className + '-icon'} name={button.icon} />
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
                    {showAgentMenu && agentMenuType === button.menuType && button.menuType === 'Keypad' ? (
                      <CallControlDtmfKeypad
                        key={currentTask?.data?.interactionId ?? 'no-interaction'}
                        onDigitPress={sendDtmf}
                        logger={logger}
                        disabled={button.disabled}
                      />
                    ) : showAgentMenu && agentMenuType === button.menuType ? (
                      <ConsultTransferPopoverComponent
                        key={`${currentInteractionId}:${button.menuType}`}
                        onClose={() => {
                          agentPopovers.current[button.menuType]?.hide();
                          handleCloseButtonPress(setShowAgentMenu, setAgentMenuType, logger);
                        }}
                        isTelephony={isTelephony}
                        destinationLayout={isTelephony ? 'voice-radio' : 'non-voice-pill'}
                        interactionId={currentInteractionId}
                        heading={button.menuType}
                        buttonIcon={button.icon}
                        buddyAgents={buddyAgents}
                        loadingBuddyAgents={loadingBuddyAgents}
                        loadBuddyAgents={loadBuddyAgents}
                        getAddressBookEntries={getAddressBookEntries}
                        getEntryPoints={getEntryPoints}
                        getQueues={getQueuesFetcher}
                        onAgentSelect={(agentId, agentName, allowParticipantsToInteract) =>
                          handleTargetSelect(agentId, agentName, 'agent', allowParticipantsToInteract)
                        }
                        onQueueSelect={(queueId, queueName, allowParticipantsToInteract) =>
                          handleTargetSelect(queueId, queueName, 'queue', allowParticipantsToInteract)
                        }
                        onEntryPointSelect={(entryPointId, entryPointName, allowParticipantsToInteract) =>
                          handleTargetSelect(entryPointId, entryPointName, 'entryPoint', allowParticipantsToInteract)
                        }
                        onDialNumberSelect={(dialNumber, allowParticipantsToInteract) =>
                          handleTargetSelect(dialNumber, dialNumber, 'dialNumber', allowParticipantsToInteract)
                        }
                        action={action}
                        availableDestinations={availableDestinations}
                        consultTransferOptions={consultTransferOptions}
                        summary={action === 'Transfer' ? aiSummary?.transfer : aiSummary?.consult}
                        requestMidCallSummary={aiSummary?.requestMidCallSummary}
                        isActionPending={isMidCallActionPending}
                        isConferenceInProgress={controls?.main?.exitConference?.isVisible ?? false}
                        logger={logger}
                      />
                    ) : null}
                  </PopoverNext>
                );
              }
              return (
                <TooltipNext
                  key={index}
                  triggerComponent={
                    <ButtonCircle
                      className={button.className + (button.disabled ? ` ${button.className}-disabled` : '')}
                      data-testid={button.dataTestId}
                      onPress={button.onClick}
                      disabled={button.disabled}
                      aria-label={button.tooltip}
                    >
                      <Icon className={button.className + '-icon'} name={button.icon} />
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
        )}
        {controls?.main?.wrapup?.isVisible && (
          <div className="wrapup-group">
            <PopoverNext
              color="primary"
              delay={[0, 0]}
              placement="bottom-start"
              showArrow
              trigger="click"
              triggerComponent={
                <Button
                  size={28}
                  color="default"
                  variant="secondary"
                  postfix-icon="arrow-down-bold"
                  type="button"
                  role="button"
                  data-testid="call-control:wrapup-button"
                  id="call-control-wrapup-button"
                >
                  {WRAP_UP}
                </Button>
              }
              variant="medium"
              interactive
              offsetDistance={2}
              className="wrapup-popover"
            >
              <div
                ref={wrapUpSurfaceRef}
                tabIndex={-1}
                data-testid="call-control:wrapup-panel"
                onFocusCapture={(event) => {
                  focusedWrapUpControlRef.current = event.target as HTMLElement;
                }}
              >
                {currentTask.autoWrapup && (
                  <AutoWrapupTimer
                    secondsUntilAutoWrapup={secondsUntilAutoWrapup}
                    allowCancelAutoWrapup={false} // TODO: https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6752 change to currentTask.autoWrapup.allowCancelAutoWrapup when its made supported in multi session from SDK side
                    handleCancelWrapup={cancelAutoWrapup}
                  />
                )}

                {aiSummary?.postCall ? (
                  <WrapUpSummary
                    reasons={wrapupCodes ?? []}
                    summary={aiSummary.postCall}
                    initialReasonId={selectedWrapupId ?? undefined}
                    completionPending={isWrapupCompletionPending}
                    completionEscape={aiSummary.postCall.completionEscape}
                    onReasonChange={(reason) => handleWrapupChange(reason.name, reason.id)}
                    onReasonCommit={(reason, revision) => {
                      handleWrapupChange(reason.name, reason.id);
                      aiSummary.onPostCallReasonCommit?.(reason.id, revision);
                    }}
                    onComplete={(reason) => {
                      handleWrapupChange(reason.name, reason.id);
                      return runWrapupCompletion(reason.name, reason.id);
                    }}
                  />
                ) : (
                  <>
                    <Text className="wrapup-header" tagName={'small'} type="body-large-bold">
                      {WRAP_UP_INTERACTION}
                    </Text>
                    <Select
                      label={WRAP_UP_REASON}
                      help-text-type=""
                      data-aria-label="wrapup-reason"
                      toggletip-text=""
                      toggletip-placement=""
                      info-icon-aria-label=""
                      name=""
                      className="wrapup-select"
                      data-testid="call-control:wrapup-select"
                      placeholder={SELECT}
                      onChange={(event: CustomEvent) =>
                        handleWrapupReasonChange(event, wrapupCodes, handleWrapupChange, logger)
                      }
                    >
                      {wrapupCodes?.map((code) => (
                        <Option
                          key={code.id}
                          value={code.id}
                          label={code.name}
                          data-testid={`call-control:wrapup-reason-${code.name.toLowerCase()}`}
                        >
                          {code.name}
                        </Option>
                      ))}
                    </Select>
                    <Button
                      onClick={handleWrapupCallLocal}
                      variant="primary"
                      className="submit-wrapup-button"
                      data-testid="call-control:wrapup-submit"
                      aria-label="Submit wrap-up"
                      disabled={isWrapupCompletionPending || !(selectedWrapupId && selectedWrapupReason)}
                    >
                      {SUBMIT_WRAP_UP}
                    </Button>
                  </>
                )}
              </div>
            </PopoverNext>
          </div>
        )}
      </div>
    </>
  );
}

const CallControlComponentWithMetrics = withMetrics(CallControlComponent, 'CallControl');
export default CallControlComponentWithMetrics;
