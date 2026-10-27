import React, {useEffect, useRef, useState} from 'react';

import type {CallControlComponentProps, CallControlMenuType} from '../task.types';
import './call-control.styles.scss';
import {PopoverNext, TooltipNext, Text, ButtonCircle} from '@momentum-ui/react-collaboration';
import type {PopoverInstance} from '@momentum-ui/react-collaboration';
import {Icon, Button, Select, Option, Dialog} from '@momentum-design/components/dist/react';
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
  handleWrapupReasonChange,
  handleAudioRef,
  getMediaType,
  isTelephonyMediaType,
  buildCallControlButtons,
  filterButtonsForConsultation,
  getConsultFilterPhase,
  updateCallStateFromTask,
  applyWxAppTelephonyControlVisibility,
} from './call-control.utils';
import {withMetrics} from '@webex/cc-ui-logging';

function CallControlComponent(props: CallControlComponentProps) {
  const [selectedWrapupReason, setSelectedWrapupReason] = useState<string | null>(null);
  const [selectedWrapupId, setSelectedWrapupId] = useState<string | null>(null);
  const [agentMenu, setAgentMenu] = useState<{
    type: CallControlMenuType;
    inDialog: boolean;
    hasSummary: boolean;
  } | null>(null);
  const [isMuteButtonDisabled, setIsMuteButtonDisabled] = useState(false);
  const agentPopovers = useRef<Record<string, PopoverInstance | undefined>>({});

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

  useEffect(() => {
    updateCallStateFromTask(currentTask, setIsRecording, logger);
  }, [currentTask, logger]);

  useEffect(() => {
    setAgentMenu(null);
  }, [currentTask?.data?.interactionId]);

  useEffect(() => {
    if (aiSummary?.midCall && aiSummary.midCall.state !== 'omitted') {
      setAgentMenu((menu) => (menu && !menu.hasSummary ? {...menu, hasSummary: true} : menu));
    }
  }, [aiSummary?.midCall]);

  const handletoggleHold = () => {
    handleToggleHoldUtil(isHeld, toggleHold, logger);
  };

  const handleMuteToggle = () => {
    handleMuteToggleUtil(toggleMute, setIsMuteButtonDisabled, logger);
  };

  const handleWrapupCallLocal = () => {
    handleWrapupCallUtil(
      selectedWrapupReason,
      selectedWrapupId,
      wrapupCall,
      setSelectedWrapupReason,
      setSelectedWrapupId,
      logger
    );
  };

  const handleWrapupChange = (text, value) => {
    handleWrapupChangeUtil(text, value, setSelectedWrapupReason, setSelectedWrapupId, logger);
  };

  const handleTargetSelect = (
    id: string,
    name: string,
    type: DestinationType,
    allowParticipantsToInteract: boolean
  ) => {
    handleTargetSelectUtil(
      id,
      name,
      type,
      allowParticipantsToInteract,
      agentMenu?.type ?? null,
      consultCall,
      transferCall,
      setConsultAgentName,
      setLastTargetType,
      logger
    );
  };

  const currentMediaType = getMediaType(
    currentTask.data.interaction.mediaType as MediaChannelType,
    currentTask.data.interaction.mediaChannel as MediaChannelType,
    logger
  );

  const mediaType = currentTask.data.interaction.mediaType as MediaChannelType;
  const isTelephony = isTelephonyMediaType(mediaType, logger);

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

              if (button.menuType) {
                const action = button.menuType === 'Transfer' ? 'Transfer' : 'Consult';
                const availableDestinations =
                  button.menuType === 'Keypad'
                    ? []
                    : action === 'Transfer'
                      ? (controls.consultTransferDestinations?.transfer ?? [])
                      : (controls.consultTransferDestinations?.consult ?? []);

                const isSummaryDialog =
                  isTelephony &&
                  button.menuType !== 'Keypad' &&
                  (agentMenu ? agentMenu.inDialog : Boolean(aiSummary?.midCall));
                const menuVisible = agentMenu?.type === button.menuType;
                const openAgentMenu = () => {
                  if (agentMenu?.type === button.menuType) return;
                  setAgentMenu({
                    type: button.menuType as CallControlMenuType,
                    inDialog: isSummaryDialog,
                    hasSummary: Boolean(aiSummary?.midCall && aiSummary.midCall.state !== 'omitted'),
                  });
                  logger.info(`CC-Widgets: CallControl: showing ${button.menuType} menu`, {
                    module: 'call-control.tsx',
                    method: 'openAgentMenu',
                  });
                  if (button.menuType !== 'Keypad' && availableDestinations.includes('agent')) {
                    loadBuddyAgents(action);
                  }
                  if (button.menuType !== 'Keypad' && isTelephony) {
                    void aiSummary?.requestMidCallSummary?.(action === 'Transfer' ? 'TRANSFER' : 'CONSULT');
                  }
                };
                const finishAgentMenu = (cancelSummary: boolean) => {
                  if (agentMenu?.type !== button.menuType) return;
                  if (isTelephony && button.menuType !== 'Keypad') {
                    if (cancelSummary) {
                      aiSummary?.cancelMidCallSummary?.(action === 'Transfer' ? 'TRANSFER' : 'CONSULT');
                    }
                    aiSummary?.resetMidCallSummaryExclusion?.();
                  }
                  agentPopovers.current[button.menuType]?.hide();
                  setAgentMenu(null);
                };
                const closeAgentMenu = () => finishAgentMenu(false);
                const cancelAgentMenu = () => finishAgentMenu(true);
                const trigger = (
                  <TooltipNext
                    triggerComponent={
                      <ButtonCircle
                        className={button.className}
                        aria-label={button.tooltip}
                        aria-haspopup={isSummaryDialog ? 'dialog' : undefined}
                        aria-expanded={isSummaryDialog ? menuVisible : undefined}
                        onPress={isSummaryDialog ? openAgentMenu : undefined}
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
                );
                const menuContent = menuVisible ? (
                  button.menuType === 'Keypad' ? (
                    <CallControlDtmfKeypad
                      key={currentTask?.data?.interactionId ?? 'no-interaction'}
                      onDigitPress={sendDtmf}
                      logger={logger}
                      disabled={button.disabled}
                    />
                  ) : (
                    <ConsultTransferPopoverComponent
                      onClose={closeAgentMenu}
                      onCancel={cancelAgentMenu}
                      inDialog={isSummaryDialog}
                      isTelephony={isTelephony}
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
                      summary={aiSummary?.midCall}
                      onSummaryRequest={aiSummary?.requestMidCallSummary}
                      isConferenceInProgress={controls?.main?.exitConference?.isVisible ?? false}
                      logger={logger}
                    />
                  )
                ) : null;

                if (isSummaryDialog) {
                  return (
                    <React.Fragment key={button.menuType}>
                      {trigger}
                      <Dialog
                        visible={menuVisible}
                        headerText={`${action} Request`}
                        closeButtonAriaLabel="Close popover"
                        onClose={closeAgentMenu}
                        className="call-control-summary-dialog agent-popover"
                        data-testid={`call-control:${action.toLowerCase()}-dialog`}
                      >
                        <div slot="dialog-body" className="call-control-summary-dialog__body">
                          {menuContent}
                        </div>
                      </Dialog>
                    </React.Fragment>
                  );
                }

                return (
                  <PopoverNext
                    key={button.menuType}
                    onShow={openAgentMenu}
                    onHide={() => {
                      setAgentMenu((menu) => (menu?.type === button.menuType ? null : menu));
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
                    closeButtonPlacement={
                      isTelephony &&
                      (agentMenu?.hasSummary || Boolean(aiSummary?.midCall)) &&
                      button.menuType !== 'Keypad'
                        ? 'none'
                        : 'top-right'
                    }
                    closeButtonProps={{
                      'aria-label': 'Close popover',
                      onPress: cancelAgentMenu,
                      outline: true,
                    }}
                    triggerComponent={trigger}
                  >
                    {menuContent}
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
              onShow={() => aiSummary?.requestPostCallSummary?.()}
              color="primary"
              delay={[0, 0]}
              placement={aiSummary?.postCall ? 'bottom-end' : 'bottom-start'}
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
                  selectedReasonId={selectedWrapupId ?? undefined}
                  onReasonChange={(reason) => handleWrapupChange(reason.name, reason.id)}
                  onComplete={handleWrapupCallLocal}
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
                    disabled={selectedWrapupId && selectedWrapupReason ? false : true}
                  >
                    {SUBMIT_WRAP_UP}
                  </Button>
                </>
              )}
            </PopoverNext>
          </div>
        )}
      </div>
    </>
  );
}

const CallControlComponentWithMetrics = withMetrics(CallControlComponent, 'CallControl');
export default CallControlComponentWithMetrics;
