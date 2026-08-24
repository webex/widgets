import {useEffect, useCallback, useState, useMemo, useRef} from 'react';
import {
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  ITask,
  TaskUIControls,
  getDefaultUIControls,
} from '@webex/contact-center';
import {
  useCallControlProps,
  UseTaskListProps,
  UseTaskProps,
  UseRealTimeTranscriptInternalProps,
  RealTimeTranscriptEntry,
  useOutdialCallProps,
  TargetType,
  TARGET_TYPE,
} from './task.types';
import store, {
  TASK_EVENTS,
  BuddyDetails,
  DestinationType,
  PaginatedListParams,
  getConferenceParticipants,
  Participant,
  findMediaResourceId,
  MEDIA_TYPE_TELEPHONY_LOWER,
  RealTimeTranscriptionData,
} from '@webex/cc-store';
import {shouldShowWxAppTelephonyControls} from './wxapp-task.utils';
import {
  getTelephonyToastDisplay,
  reportWxAppTelephonyFailure,
  TelephonyToastAction,
  withOfferActionUserMessage,
  WxAppTelephonyErrorDisplay,
} from './wxapp-error.utils';
import {
  TIMER_LABEL_CONSULTING,
  TIMER_LABEL_CONSULT_REQUESTED,
  TIMER_LABEL_CONSULT_ON_HOLD,
  TIMER_LABEL_WRAP_UP,
} from './Utils/constants';
import {isCampaignPreviewTask} from './Utils/task-util';
import {calculateStateTimerData, calculateConsultTimerData, findLatestConsultMedia} from './Utils/timer-utils';
import {deriveMainCadHoldState} from './Utils/main-cad-hold.util';
import {writeConsultHoldAnchor, clearConsultHoldAnchor} from './Utils/task-util';
import {useHoldTimer} from './Utils/useHoldTimer';
import {OutdialAniEntriesResponse} from '@webex/contact-center/dist/types/services/config/types';

const ENGAGED_LABEL = 'ENGAGED';
const ENGAGED_USERNAME = 'Engaged';

const getTranscriptSpeaker = (role?: string): string => {
  const normalizedRole = role?.toUpperCase();
  if (normalizedRole === 'AGENT') return 'You';
  if (normalizedRole === 'CUSTOMER' || normalizedRole === 'CALLER') return 'Customer';

  return normalizedRole || 'Unknown';
};

const mapTranscriptLineToEntry = (
  transcriptionData: Partial<RealTimeTranscriptionData>,
  currentTaskId: string
): RealTimeTranscriptEntry => {
  const speaker = getTranscriptSpeaker(transcriptionData.role);
  const timestamp =
    typeof transcriptionData.publishTimestamp === 'number' ? transcriptionData.publishTimestamp : Date.now();

  return {
    id: `${currentTaskId}-${transcriptionData.messageId}`,
    speaker,
    message: transcriptionData.content,
    timestamp,
    displayTime: new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
    isCustomer: speaker === 'Customer',
  };
};

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {onTaskAccepted, onTaskDeclined, onTaskSelected, logger, taskList} = props;
  const [taskActionErrors, setTaskActionErrors] = useState<Record<string, WxAppTelephonyErrorDisplay | null>>({});

  const clearTaskActionError = useCallback((interactionId: string) => {
    setTaskActionErrors((prev) => {
      if (!prev[interactionId]) return prev;
      const next = {...prev};
      delete next[interactionId];
      return next;
    });
  }, []);

  const setTaskActionError = useCallback(
    (interactionId: string, error: unknown, action: string) => {
      const parsed = reportWxAppTelephonyFailure(error, {widget: 'TaskList', action}, logger, store.onErrorCallback);
      setTaskActionErrors((prev) => ({...prev, [interactionId]: withOfferActionUserMessage(parsed, action)}));
    },
    [logger]
  );

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useTaskList#${method}`,
    });
  };

  useEffect(() => {
    try {
      if (onTaskAccepted) {
        store.setTaskAssigned(function (task) {
          try {
            logger.log(`CC-Widgets: taskAssigned event for ${task.data.interactionId}`, {
              module: 'useTaskList',
              method: 'setTaskAssigned',
            });
            onTaskAccepted(task);
          } catch (error) {
            logger?.error(`CC-Widgets: Task: Error in taskAssigned callback - ${error.message}`, {
              module: 'useTaskList',
              method: 'setTaskAssigned',
            });
          }
        });
      }

      if (onTaskDeclined) {
        store.setTaskRejected(function (task, reason) {
          try {
            logger.log(`CC-Widgets: taskRejected event for ${task.data.interactionId}`, {
              module: 'useTaskList',
              method: 'setTaskRejected',
            });
            onTaskDeclined(task, reason);
          } catch (error) {
            logger?.error(`CC-Widgets: Task: Error in taskRejected callback - ${error.message}`, {
              module: 'useTaskList',
              method: 'setTaskRejected',
            });
          }
        });
      }

      if (onTaskSelected) {
        store.setTaskSelected(function (task: ITask, isClicked: boolean) {
          try {
            onTaskSelected({task, isClicked});
          } catch (error) {
            logger?.error(`CC-Widgets: Task: Error in taskSelected callback - ${error.message}`, {
              module: 'useTaskList',
              method: 'setTaskSelected',
            });
          }
        });
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in useTaskList useEffect - ${error.message}`, {
        module: 'useTaskList',
        method: 'useEffect',
      });
    }
  }, []);

  const acceptTask = (task: ITask) => {
    try {
      logger.info(`CC-Widgets: acceptTask called for ${task.data.interactionId}`, {
        module: 'useTaskList',
        method: 'acceptTask',
      });
      task.accept().catch((error) => {
        setTaskActionError(task.data.interactionId, error, 'acceptTask');
        logError(`CC-Widgets: Error accepting task: ${error}`, 'acceptTask');
      });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in acceptTask - ${error.message}`, {
        module: 'useTaskList',
        method: 'acceptTask',
      });
    }
  };

  const declineTask = (task: ITask) => {
    try {
      logger.info(`CC-Widgets: declineTask called for ${task.data.interactionId}`, {
        module: 'useTaskList',
        method: 'declineTask',
      });
      task.decline().catch((error) => {
        setTaskActionError(task.data.interactionId, error, 'declineTask');
        logError(`CC-Widgets: Error declining task: ${error}`, 'declineTask');
      });
      logger.log(`CC-Widgets: incoming task declined for ${task.data.interactionId}`, {
        module: 'useTaskList',
        method: 'declineTask',
      });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in declineTask - ${error.message}`, {
        module: 'useTaskList',
        method: 'declineTask',
      });
    }
  };
  const onTaskSelect = (task: ITask) => {
    try {
      store.setCurrentTask(task, true);
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in onTaskSelect - ${error.message}`, {
        module: 'useTaskList',
        method: 'onTaskSelect',
      });
    }
  };

  return {taskList, acceptTask, declineTask, onTaskSelect, taskActionErrors, clearTaskActionError};
};

export const useRealTimeTranscript = (props: UseRealTimeTranscriptInternalProps) => {
  const {liveTranscriptEntries = [], className, currentTaskId, realtimeTranscriptionData = []} = props;
  const mappedRealtimeEntries = useMemo<RealTimeTranscriptEntry[]>(() => {
    if (!currentTaskId) return liveTranscriptEntries;

    const transcriptLines = realtimeTranscriptionData;
    if (!transcriptLines.length) {
      return liveTranscriptEntries;
    }

    return transcriptLines.map((line) => mapTranscriptLineToEntry(line, currentTaskId));
  }, [currentTaskId, realtimeTranscriptionData, liveTranscriptEntries]);

  return {
    liveTranscriptEntries: mappedRealtimeEntries,
    className,
  };
};

export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onRejected, incomingTask, logger} = props;
  const [offerActionError, setOfferActionError] = useState<WxAppTelephonyErrorDisplay | null>(null);

  const clearOfferActionError = useCallback(() => {
    setOfferActionError(null);
  }, []);

  useEffect(() => {
    setOfferActionError(null);
  }, [incomingTask?.data?.interactionId]);

  const acceptControl = incomingTask?.uiControls?.main?.accept ?? {isVisible: false, isEnabled: false};
  const sdkDeclineControl = incomingTask?.uiControls?.main?.decline ?? {isVisible: false, isEnabled: false};

  logger?.info('CC-Widgets: IncomingTask uiControls snapshot', {
    module: 'useIncomingTask',
    method: 'render',
    interactionId: incomingTask?.data?.interactionId,
    accept: acceptControl,
    decline: sdkDeclineControl,
  });
  const declineControl = {
    ...sdkDeclineControl,
    isEnabled: sdkDeclineControl.isEnabled || store.isDeclineButtonEnabled,
  };

  const taskAssignCallback = useCallback(() => {
    try {
      if (onAccepted) onAccepted({task: incomingTask});
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in taskAssignCallback - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'taskAssignCallback',
      });
    }
  }, [onAccepted, incomingTask, logger]);

  const taskRejectCallback = useCallback(() => {
    try {
      if (onRejected) onRejected({task: incomingTask});
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in taskRejectCallback - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'taskRejectCallback',
      });
    }
  }, [onRejected, incomingTask, logger]);

  useEffect(() => {
    try {
      if (!incomingTask) return;
      store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_END, taskRejectCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_OUTDIAL_FAILED, taskRejectCallback, incomingTask?.data.interactionId);

      return () => {
        try {
          store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
          store.removeTaskCallback(
            TASK_EVENTS.TASK_CONSULT_ACCEPTED,
            taskAssignCallback,
            incomingTask?.data.interactionId
          );
          store.removeTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
          store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
          store.removeTaskCallback(TASK_EVENTS.TASK_CONSULT_END, taskRejectCallback, incomingTask?.data.interactionId);
          store.removeTaskCallback(
            TASK_EVENTS.TASK_OUTDIAL_FAILED,
            taskRejectCallback,
            incomingTask?.data.interactionId
          );
        } catch (error) {
          logger?.error(`CC-Widgets: Task: Error in useIncomingTask cleanup - ${error.message}`, {
            module: 'useIncomingTask',
            method: 'useEffect_cleanup',
          });
        }
      };
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in useIncomingTask useEffect - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'useEffect',
      });
    }
  }, [incomingTask, taskAssignCallback, taskRejectCallback]);

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useIncomingTask#${method}`,
    });
  };

  const accept = () => {
    try {
      logger.info(`CC-Widgets: incomingTask.accept() called`, {
        module: 'useIncomingTask',
        method: 'accept',
      });
      if (!incomingTask?.data.interactionId) return;
      incomingTask.accept().catch((error) => {
        const parsed = reportWxAppTelephonyFailure(
          error,
          {widget: 'IncomingTask', action: 'accept'},
          logger,
          store.onErrorCallback
        );
        setOfferActionError(withOfferActionUserMessage(parsed, 'accept'));
        logError(`CC-Widgets: Error accepting incoming task: ${error}`, 'accept');
      });
      logger.log(`CC-Widgets: incomingTask accepted`, {
        module: 'useIncomingTask',
        method: 'accept',
      });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in accept - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'accept',
      });
    }
  };

  const reject = () => {
    try {
      logger.info(`CC-Widgets: incomingTask.reject() called`, {
        module: 'useIncomingTask',
        method: 'reject',
      });
      if (!incomingTask?.data.interactionId) return;
      incomingTask.decline().catch((error) => {
        const parsed = reportWxAppTelephonyFailure(
          error,
          {widget: 'IncomingTask', action: 'reject'},
          logger,
          store.onErrorCallback
        );
        setOfferActionError(withOfferActionUserMessage(parsed, 'reject'));
        logError(`CC-Widgets: Error rejecting incoming task: ${error}`, 'reject');
      });
      logger.log(`CC-Widgets: incomingTask rejected`, {
        module: 'useIncomingTask',
        method: 'reject',
      });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in reject - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'reject',
      });
    }
  };

  return {
    incomingTask,
    accept,
    reject,
    acceptControl,
    declineControl,
    offerActionError,
    clearOfferActionError,
  };
};

export const useCallControl = (props: useCallControlProps) => {
  const {
    currentTask,
    onHoldResume,
    onEnd,
    onWrapUp,
    onRecordingToggle,
    onToggleMute,
    logger,
    isMuted,
    agentId,
    conferenceEnabled = true,
    enableWxBetterTogether = false,
  } = props;
  const [isRecording, setIsRecording] = useState(true);
  const [controls, setControls] = useState<TaskUIControls>(currentTask?.uiControls ?? getDefaultUIControls());
  const [holdDataVersion, setHoldDataVersion] = useState(0);
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);
  const [loadingBuddyAgents, setLoadingBuddyAgents] = useState(false);
  const [consultAgentName, setConsultAgentName] = useState<string>('Consult Agent');
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [secondsUntilAutoWrapup, setsecondsUntilAutoWrapup] = useState<number | null>(null);
  const [telephonyToast, setTelephonyToast] = useState<{
    error: WxAppTelephonyErrorDisplay;
    action: TelephonyToastAction;
  } | null>(null);

  const showTelephonyToast = useCallback(
    (error: unknown, action: TelephonyToastAction) => {
      const parsed = reportWxAppTelephonyFailure(error, {widget: 'CallControl', action}, logger, store.onErrorCallback);
      setTelephonyToast({error: getTelephonyToastDisplay(parsed, action), action});
    },
    [logger]
  );

  const dismissTelephonyToast = useCallback(() => {
    setTelephonyToast(null);
  }, []);

  // State timer labels and timestamps
  const [stateTimerLabel, setStateTimerLabel] = useState<string | null>(null);
  const [stateTimerTimestamp, setStateTimerTimestamp] = useState<number>(0);

  // Consult timer labels and timestamps
  const [consultTimerLabel, setConsultTimerLabel] = useState<string>(TIMER_LABEL_CONSULTING);
  const [consultTimerTimestamp, setConsultTimerTimestamp] = useState<number>(0);
  const initialControls = currentTask?.uiControls;
  const prevIsConsultingRef = useRef(
    !!(initialControls?.consult?.endConsult?.isVisible || initialControls?.main?.endConsult?.isVisible)
  );
  const consultVisibilityRef = useRef(
    !!(initialControls?.consult?.endConsult?.isVisible || initialControls?.main?.endConsult?.isVisible)
  );
  const [lastTargetType, setLastTargetType] = useState<TargetType>(TARGET_TYPE.AGENT);
  const [conferenceParticipants, setConferenceParticipants] = useState<Participant[]>([]);
  const lastWrapupAuxCodeIdRef = useRef<string | null>(null);

  // Subscribe to SDK-computed UI control updates
  useEffect(() => {
    if (!currentTask) {
      setControls(getDefaultUIControls());
      return;
    }
    setControls(currentTask.uiControls ?? getDefaultUIControls());
    const onControlsUpdated = (updatedControls: TaskUIControls) => {
      setControls(updatedControls);
    };
    currentTask.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, onControlsUpdated);
    const bumpHoldDataVersion = () => setHoldDataVersion((version) => version + 1);
    // Agent 2 receives AgentContactHeld/Unheld (TASK_HOLD/TASK_RESUME), not TASK_SWITCH_CALL.
    currentTask.on(TASK_EVENTS.TASK_SWITCH_CALL, bumpHoldDataVersion);
    currentTask.on(TASK_EVENTS.TASK_HOLD, bumpHoldDataVersion);
    currentTask.on(TASK_EVENTS.TASK_RESUME, bumpHoldDataVersion);
    return () => {
      currentTask.off(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, onControlsUpdated);
      currentTask.off(TASK_EVENTS.TASK_SWITCH_CALL, bumpHoldDataVersion);
      currentTask.off(TASK_EVENTS.TASK_HOLD, bumpHoldDataVersion);
      currentTask.off(TASK_EVENTS.TASK_RESUME, bumpHoldDataVersion);
    };
  }, [currentTask]);

  // MobX — read task.data media during render so hold updates without TASK_* events.
  void (
    currentTask?.data?.interaction?.media &&
    Object.values(currentTask.data.interaction.media).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (media: any) => (media?.mType === 'mainCall' || media?.mType === 'main') && media?.isHold === true
    )
  );
  void (
    currentTask?.data?.interaction?.media &&
    Object.values(currentTask.data.interaction.media).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (media: any) => media?.mType === 'consult' && media?.isHold === true
    )
  );
  void holdDataVersion;

  const {isHeld, interaction, holdTimestampMs} = deriveMainCadHoldState({
    currentTask,
    controls,
    agentId,
    holdDataVersion,
  });
  const holdTime = useHoldTimer(isHeld, holdTimestampMs, holdDataVersion, interaction?.interactionId);

  useEffect(() => {
    const isConsulting = !!(controls?.consult?.endConsult?.isVisible || controls?.main?.endConsult?.isVisible);
    const wasConsulting = consultVisibilityRef.current;

    if (wasConsulting && !isConsulting) {
      setConsultAgentName('Consult Agent');
      setConsultTimerLabel(TIMER_LABEL_CONSULTING);
      setConsultTimerTimestamp(0);
      setLastTargetType(TARGET_TYPE.AGENT);
      store.setIsQueueConsultInProgress(false);
      store.setCurrentConsultQueueId(null);
      store.setLastConsultDestination(null);
      store.setConsultStartTimeStamp(null);
    }

    consultVisibilityRef.current = isConsulting;
  }, [controls?.consult?.endConsult?.isVisible, controls?.main?.endConsult?.isVisible]);

  useEffect(() => {
    if (currentTask && store?.cc?.agentConfig?.agentId) {
      const participants = getConferenceParticipants(currentTask, store.cc.agentConfig.agentId);
      setConferenceParticipants(participants);
    }
  }, [currentTask, controls]);
  // Function to extract consulting agent information
  const extractConsultingAgent = useCallback(() => {
    try {
      // currentTask.data can briefly lag behind the freshest state-machine snapshot.
      // Prefer the latest taskData so consult UI always reflects the newest consult leg.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latestTaskData = (currentTask as any)?.state?.context?.taskData;
      const interaction = latestTaskData?.interaction ?? currentTask?.data?.interaction;
      if (!interaction?.participants) return;

      const myAgentId = store.cc.agentConfig?.agentId;
      const currentDestination = store.lastConsultDestination;
      const destinationType = currentDestination?.destinationType;
      const destinationId = currentDestination?.to;

      // For Entry Point or Dial Number consults, check if destination agent has joined
      if (lastTargetType === TARGET_TYPE.ENTRY_POINT || lastTargetType === TARGET_TYPE.DIAL_NUMBER) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const consultDestinationAgentName = (interaction as any).callProcessingDetails?.consultDestinationAgentName;

        if (consultDestinationAgentName) {
          // Destination agent has joined, show their name
          setConsultAgentName(consultDestinationAgentName);
          logger.info(`${lastTargetType} consult answered - showing agent name: ${consultDestinationAgentName}`, {
            module: 'widget-cc-task#helper.ts',
            method: 'useCallControl#extractConsultingAgent',
          });
        } else {
          // Still ringing - find the EP/DN participant in the consult media
          const consultMediaResourceId = findMediaResourceId(currentTask, 'consult');

          if (consultMediaResourceId && interaction.media?.[consultMediaResourceId]) {
            const consultMedia = interaction.media[consultMediaResourceId];
            // Find the participant in consult media who is not the current agent
            const consultParticipantId = consultMedia.participants?.find(
              (participantId: string) => participantId !== myAgentId
            );

            if (consultParticipantId && interaction.participants[consultParticipantId]) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const participant = interaction.participants[consultParticipantId] as any;
              const phoneNumber = participant.dn || participant.id;
              const matchesCurrentDestination =
                !destinationId || participant.epId === destinationId || participant.id === destinationId;

              if (phoneNumber && matchesCurrentDestination) {
                setConsultAgentName(phoneNumber);
                logger.info(`${lastTargetType} consult ringing - showing phone number: ${phoneNumber}`, {
                  module: 'widget-cc-task#helper.ts',
                  method: 'useCallControl#extractConsultingAgent',
                });
              }
            }
          }
        }
        return;
      }

      // For regular agent consults, find the agent in the consult media
      const consultMediaResourceId = findMediaResourceId(currentTask, 'consult');

      if (consultMediaResourceId && interaction.media?.[consultMediaResourceId]) {
        const consultMedia = interaction.media[consultMediaResourceId];
        // Find the agent participant in consult media who is not the current agent
        const consultParticipantId = consultMedia.participants?.find((participantId: string) => {
          const participant = interaction.participants[participantId];
          const matchesDestination =
            destinationType !== 'agent' ||
            !destinationId ||
            participantId === destinationId ||
            participant?.id === destinationId;
          return participant && participant.id !== myAgentId && participant.pType === 'Agent' && matchesDestination;
        });

        if (consultParticipantId && interaction.participants[consultParticipantId]) {
          const consultAgent = interaction.participants[consultParticipantId];
          setConsultAgentName(consultAgent.name || consultAgent.id);
          logger.info(`Consulting agent detected: ${consultAgent.name} ${consultAgent.id}`, {
            module: 'widget-cc-task#helper.ts',
            method: 'useCallControl#extractConsultingAgent',
          });
        }
      } else {
        // When consult media is temporarily missing, trust the current consult
        // destination instead of broad participant fallbacks that can be stale.
        if (destinationType === 'agent' && destinationId && interaction.participants?.[destinationId]) {
          const targetedAgent = interaction.participants[destinationId];
          setConsultAgentName(targetedAgent.name || targetedAgent.id);
          logger.info(`Consulting agent detected (destination): ${targetedAgent.name} ${targetedAgent.id}`, {
            module: 'widget-cc-task#helper.ts',
            method: 'useCallControl#extractConsultingAgent',
          });
        }
      }
    } catch (error) {
      console.log('error', error);
      logger.error(`CC-Widgets: Task: Error in extractConsultingAgent - ${error.message}`, {
        module: 'useCallControl',
        method: 'extractConsultingAgent',
      });
    }
  }, [currentTask, logger, lastTargetType]);

  // Extract main call timestamp whenever currentTask changes
  useEffect(() => {
    extractConsultingAgent();

    if (!currentTask?.data?.interaction?.participants || !agentId) {
      return;
    }

    const participant = currentTask.data.interaction.participants[agentId];

    if (!participant) {
      return;
    }

    // Main call timer - use joinTimestamp
    if (participant.joinTimestamp) {
      setStartTimestamp(participant.joinTimestamp);
    }
  }, [currentTask, agentId, extractConsultingAgent]);

  const buddyAgentsRequestIdRef = useRef(0);

  const loadBuddyAgents = useCallback(
    async (action: 'Consult' | 'Transfer' = 'Consult') => {
      const requestId = ++buddyAgentsRequestIdRef.current;

      try {
        setLoadingBuddyAgents(true);
        const agents = await store.getBuddyAgents(action);
        if (requestId !== buddyAgentsRequestIdRef.current) return;

        logger.info(`Loaded ${agents.length} buddy agents`, {module: 'helper.ts', method: 'loadBuddyAgents'});
        setBuddyAgents(agents);
      } catch (error) {
        logger?.error(`CC-Widgets: Task: Error loading buddy agents - ${error.message || error}`, {
          module: 'useCallControl',
          method: 'loadBuddyAgents',
        });
        if (requestId !== buddyAgentsRequestIdRef.current) return;

        setBuddyAgents([]);
      } finally {
        if (requestId === buddyAgentsRequestIdRef.current) {
          setLoadingBuddyAgents(false);
        }
      }
    },
    [logger]
  );

  const getAddressBookEntries = useCallback(
    async ({page, pageSize, search}: PaginatedListParams) => {
      try {
        return await store.getAddressBookEntries({page, pageSize, search});
      } catch (error) {
        logger?.error(`CC-Widgets: Task: Error fetching address book entries - ${error.message || error}`, {
          module: 'useCallControl',
          method: 'getAddressBookEntries',
        });
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
    },
    [logger]
  );

  const getEntryPoints = useCallback(
    async ({page, pageSize, search}: PaginatedListParams) => {
      try {
        return await store.getEntryPoints({page, pageSize, search});
      } catch (error) {
        logger?.error(`CC-Widgets: Task: Error fetching entry points - ${error.message || error}`, {
          module: 'useCallControl',
          method: 'getEntryPoints',
        });
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
    },
    [logger]
  );

  const getQueuesFetcher = useCallback(
    async ({page, pageSize, search}: PaginatedListParams) => {
      try {
        return await store.getQueues({page, pageSize, search});
      } catch (error) {
        logger?.error(`CC-Widgets: Task: Error fetching queues (paginated) - ${error.message || error}`, {
          module: 'useCallControl',
          method: 'getQueuesFetcher',
        });
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
    },
    [logger]
  );

  const holdCallback = () => {
    try {
      if (onHoldResume) {
        onHoldResume({
          isHeld: true,
          task: currentTask,
        });
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in holdCallback - ${error.message}`, {
        module: 'useCallControl',
        method: 'holdCallback',
      });
    }
  };

  const resumeCallback = () => {
    try {
      if (onHoldResume) {
        onHoldResume({
          isHeld: false,
          task: currentTask,
        });
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in resumeCallback - ${error.message}`, {
        module: 'useCallControl',
        method: 'resumeCallback',
      });
    }
  };

  const endCallCallback = () => {
    try {
      if (onEnd) {
        onEnd({
          task: currentTask,
        });
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in endCallCallback - ${error.message}`, {
        module: 'useCallControl',
        method: 'endCallCallback',
      });
    }
  };

  const wrapupCallCallback = () => {
    try {
      if (lastWrapupAuxCodeIdRef.current) {
        const wrapUpReason = store.wrapupCodes.find((code) => code.id === lastWrapupAuxCodeIdRef.current)?.name;
        if (onWrapUp) {
          onWrapUp({
            task: currentTask,
            wrapUpReason: wrapUpReason,
          });
        }
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in wrapupCallCallback - ${error.message}`, {
        module: 'useCallControl',
        method: 'wrapupCallCallback',
      });
    }
  };

  const pauseRecordingCallback = () => {
    try {
      setIsRecording(false);
      onRecordingToggle({
        isRecording: false,
        task: currentTask,
      });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in pauseRecordingCallback - ${error.message}`, {
        module: 'useCallControl',
        method: 'pauseRecordingCallback',
      });
    }
  };

  const resumeRecordingCallback = () => {
    try {
      setIsRecording(true);
      onRecordingToggle({
        isRecording: true,
        task: currentTask,
      });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in resumeRecordingCallback - ${error.message}`, {
        module: 'useCallControl',
        method: 'resumeRecordingCallback',
      });
    }
  };

  useEffect(() => {
    if (!currentTask?.data?.interactionId) return;
    logger.log(`useCallControl init for task ${currentTask.data.interactionId}`, {
      module: 'useCallControl',
      method: 'useEffect-init',
    });

    const interactionId = currentTask.data.interactionId;

    store.setTaskCallback(
      // Should use holdCallback
      TASK_EVENTS.TASK_HOLD,
      holdCallback,
      interactionId
    );
    store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_WRAPUP, endCallCallback, interactionId); // Also call onEnd when entering wrapup
    store.setTaskCallback(TASK_EVENTS.TASK_WRAPPEDUP, wrapupCallCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, interactionId);

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_WRAPUP, endCallCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_WRAPPEDUP, wrapupCallCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, interactionId);
    };
  }, [currentTask]);

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useCallControl#${method}`,
    });
  };

  const toggleHold = (hold: boolean) => {
    try {
      logger.info(`toggleHold(${hold}) called`, {module: 'useCallControl', method: 'toggleHold'});
      if (hold) {
        currentTask
          .hold()
          .catch((e) => logger.error(`Hold failed: ${e}`, {module: 'useCallControl', method: 'toggleHold'}));
      } else {
        currentTask
          .resume()
          .catch((e) => logger.error(`Resume failed: ${e}`, {module: 'useCallControl', method: 'toggleHold'}));
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in toggleHold - ${error.message}`, {
        module: 'useCallControl',
        method: 'toggleHold',
      });
    }
  };

  const toggleRecording = () => {
    try {
      if (isRecording) {
        currentTask.pauseRecording().catch((error: Error) => {
          logError(`Error pausing recording: ${error}`, 'toggleRecording');
        });
      } else {
        currentTask.resumeRecording({autoResumed: false}).catch((error: Error) => {
          logError(`Error resuming recording: ${error}`, 'toggleRecording');
        });
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in toggleRecording - ${error.message}`, {
        module: 'useCallControl',
        method: 'toggleRecording',
      });
    }
  };

  const toggleMute = async () => {
    try {
      if (
        !controls?.main?.mute?.isVisible &&
        !controls?.consult?.mute?.isVisible &&
        !shouldShowWxAppTelephonyControls(enableWxBetterTogether, currentTask)
      ) {
        logger.warn('Mute control not available', {module: 'useCallControl', method: 'toggleMute'});
        return;
      }

      logger.info('toggleMute() called', {module: 'useCallControl', method: 'toggleMute'});

      // Store the intended new state
      const intendedMuteState = !isMuted;

      try {
        await currentTask.toggleMute({muted: intendedMuteState});

        // Only update state after successful SDK call
        store.setIsMuted(intendedMuteState);

        if (onToggleMute) {
          onToggleMute({
            isMuted: intendedMuteState,
            task: currentTask,
          });
        }

        logger.info(`Mute state toggled to: ${intendedMuteState}`, {module: 'useCallControl', method: 'toggleMute'});
      } catch (error) {
        logger.error(`toggleMute failed: ${error}`, {module: 'useCallControl', method: 'toggleMute'});
        showTelephonyToast(error, intendedMuteState ? 'mute' : 'unmute');

        if (onToggleMute) {
          onToggleMute({
            isMuted: isMuted,
            task: currentTask,
          });
        }
      }
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in toggleMute - ${error.message}`, {
        module: 'useCallControl',
        method: 'toggleMute',
      });
    }
  };

  const sendDtmf = async (digit: string) => {
    try {
      if (
        !controls?.main?.keypad?.isVisible &&
        !shouldShowWxAppTelephonyControls(enableWxBetterTogether, currentTask)
      ) {
        logger.warn('Keypad control not available', {module: 'useCallControl', method: 'sendDtmf'});
        return;
      }

      logger.info(`sendDtmf(${digit}) called`, {module: 'useCallControl', method: 'sendDtmf'});

      await currentTask.transmitDtmf({dtmf: digit});
    } catch (error) {
      logger.error(`sendDtmf failed: ${error}`, {module: 'useCallControl', method: 'sendDtmf'});
      showTelephonyToast(error, 'dtmf');
    }
  };

  const endCall = () => {
    try {
      logger.info('endCall() called', {module: 'useCallControl', method: 'endCall'});
      currentTask
        .end()
        .catch((e) => logger.error(`endCall failed: ${e}`, {module: 'useCallControl', method: 'endCall'}));
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in endCall - ${error.message}`, {
        module: 'useCallControl',
        method: 'endCall',
      });
    }
  };

  const wrapupCall = (wrapUpReason: string, auxCodeId: string) => {
    try {
      // Store auxCodeId for use in wrapupCallCallback
      lastWrapupAuxCodeIdRef.current = auxCodeId;

      currentTask
        .wrapup({wrapUpReason: wrapUpReason, auxCodeId: auxCodeId})
        .then(() => {
          const taskKeys = Object.keys(store.taskList);
          if (taskKeys.length > 0) {
            store.setCurrentTask(store.taskList[taskKeys[0]]);
            store.setState({
              developerName: ENGAGED_LABEL,
              name: ENGAGED_USERNAME,
            });
          }
        })
        .catch((error: Error) => {
          logError(`Error wrapping up call: ${error}`, 'wrapupCall');
        });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in wrapupCall - ${error.message}`, {
        module: 'useCallControl',
        method: 'wrapupCall',
      });
    }
  };

  const transferCall = async (to: string, type: DestinationType) => {
    try {
      await currentTask.transfer({to, destinationType: type});
      logger.info('transferCall success', {module: 'useCallControl', method: 'transferCall'});
    } catch (error) {
      logger.error(`Error transferring call: ${error}`, {module: 'useCallControl', method: 'transferCall'});
      throw error;
    }
  };

  const consultConference = async () => {
    try {
      await currentTask.consultConference();
      logger.info('consultConference success', {
        module: 'useCallControl',
        method: 'consultConference',
      });
    } catch (error) {
      logger.error(`Error consulting conference: ${error}`, {module: 'useCallControl', method: 'consultConference'});
      throw error;
    }
  };

  const switchToMainCall = async () => {
    try {
      await currentTask.switchCall();
      logger.info('switchToMainCall success', {module: 'useCallControl', method: 'switchToMainCall'});
    } catch (error) {
      logger.error(`Error switchToMainCall: ${error}`, {module: 'useCallControl', method: 'switchToMainCall'});
      throw error;
    }
  };

  const switchToConsult = async () => {
    try {
      await currentTask.switchCall();
      logger.info('switchToConsult success', {module: 'useCallControl', method: 'switchToConsult'});
    } catch (error) {
      logger.error(`Error switching to consult: ${error}`, {module: 'useCallControl', method: 'switchToConsult'});
      throw error;
    }
  };

  const exitConference = async () => {
    try {
      await currentTask.exitConference();
      logger.info('exitConference success', {module: 'useCallControl', method: 'exitConference'});
    } catch (error) {
      logger.error(`Error exiting conference: ${error}`, {module: 'useCallControl', method: 'exitConference'});
      throw error;
    }
  };

  const consultCall = async (
    consultDestination: string,
    destinationType: DestinationType,
    allowParticipantsToInteract: boolean
  ) => {
    const consultPayload = {
      to: consultDestination,
      destinationType: destinationType,
      holdParticipants: !allowParticipantsToInteract,
    };

    // Update target type at source before consult starts so extraction logic
    // does not use a stale previous consult target type.
    setLastTargetType(destinationType as TargetType);

    store.setLastConsultDestination({to: consultDestination, destinationType});

    if (destinationType === 'queue') {
      store.setIsQueueConsultInProgress(true);
      store.setCurrentConsultQueueId(consultDestination);
    }

    try {
      await currentTask.consult(consultPayload);
      store.setIsQueueConsultInProgress(false);
      if (destinationType === 'queue') {
        store.setCurrentConsultQueueId(null);
      }
    } catch (error) {
      if (destinationType === 'queue') {
        store.setIsQueueConsultInProgress(false);
        store.setCurrentConsultQueueId(null);
      }
      logError(`Error consulting call: ${error}`, 'consultCall');
      throw error;
    }
  };

  const endConsultCall = async () => {
    if (!currentTask?.data?.interactionId) {
      logError('Cannot end consult call: currentTask or interactionId is missing', 'endConsultCall');
      return;
    }

    const consultEndPayload = {
      isConsult: true,
      taskId: currentTask.data.interactionId,
      ...(store.isQueueConsultInProgress && {queueId: store.currentConsultQueueId}),
    };

    try {
      await currentTask.endConsult(consultEndPayload);
    } catch (error) {
      // Log error but don't throw - SDK retry mechanism will handle timing issues
      // If endConsult fails due to backend timing (called before CONSULTING_ACTIVE),
      // the SDK's requestEndConsultRetry will automatically retry when ready
      logError(`Error ending consult call (will retry automatically): ${error}`, 'endConsultCall');
    }
  };

  const consultTransfer = async () => {
    if (!currentTask?.data) {
      logError('Cannot transfer consult call: currentTask or data is missing', 'consultTransfer');
      return;
    }

    try {
      const shouldUseTransferConference =
        currentTask.data.isConferenceInProgress ||
        controls?.consult?.transferConference?.isVisible ||
        controls?.main?.transferConference?.isVisible;

      if (shouldUseTransferConference) {
        logger.info('Conference in progress, using transferConference', {
          module: 'useCallControl',
          method: 'consultTransfer',
        });
        await currentTask.transferConference();
      } else {
        let destination = store.lastConsultDestination;

        if (!destination?.to) {
          // After page refresh, lastConsultDestination is lost (in-memory only).
          // Recover the transfer target from the consult media's participants.
          const myAgentId = store.cc.agentConfig?.agentId;
          const {interaction} = currentTask.data;
          const consultMediaId = findMediaResourceId(currentTask, 'consult');
          const consultMedia = consultMediaId ? interaction?.media?.[consultMediaId] : null;

          let recoveredTo: string | null = null;
          let recoveredDestinationType: DestinationType = 'agent' as DestinationType;
          if (consultMedia?.participants) {
            for (const pid of consultMedia.participants) {
              const p = interaction?.participants?.[pid] as {id?: string; pType?: string; epId?: string} | undefined;
              if (!p || p.id === myAgentId) continue;
              if (p.pType === 'Agent') {
                recoveredTo = pid;
                recoveredDestinationType = 'agent' as DestinationType;
                break;
              }
              if (p.pType === 'EP-DN' && p.epId) {
                recoveredTo = p.epId;
                recoveredDestinationType = 'entryPoint' as DestinationType;
                break;
              }
            }
          }

          if (recoveredTo) {
            destination = {to: recoveredTo, destinationType: recoveredDestinationType};
            logger.info(`Recovered consult destination from interaction data: ${recoveredTo}`, {
              module: 'useCallControl',
              method: 'consultTransfer',
            });
          }
        }

        if (!destination?.to) {
          logError('Cannot transfer: consult destination not found', 'consultTransfer');
          return;
        }

        logger.info('Consult transfer initiated', {module: 'useCallControl', method: 'consultTransfer'});
        await currentTask.transfer(destination);
      }
    } catch (error) {
      logError(`Error transferring consult call: ${error}`, 'consultTransfer');
      throw error;
    }
  };

  const cancelAutoWrapup = () => {
    if (!currentTask) {
      logger.warn('CC-Widgets: CallControl: Cannot cancel auto-wrapup, currentTask is missing', {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#cancelAutoWrapup',
      });
      return;
    }

    logger.info('CC-Widgets: CallControl: wrap-up cancelled', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#cancelAutoWrapup',
    });
    currentTask.cancelAutoWrapupTimer();
  };

  // Derive stable primitives from MobX-observed task data so that effects
  // re-fire when the backend pushes fresh interaction/participant state —
  // not only when controls change.  `currentTask` is a MobX proxy whose
  // reference never changes, so effects would otherwise miss data-only
  // updates.
  const _interaction = currentTask?.data?.interaction;
  const _participant = _interaction?.participants?.[agentId];

  // Consult-timer primitives
  const _consultMedia = findLatestConsultMedia(_interaction);
  const consultMediaIsHold = !!_consultMedia?.isHold;
  const consultMediaId = _consultMedia?.mediaResourceId ?? '';
  const participantConsultState = _participant?.consultState ?? null;

  // State-timer (wrap-up / post-call) primitives
  const participantIsWrapUp = !!_participant?.isWrapUp;
  const participantWrapUpTimestamp = _participant?.wrapUpTimestamp ?? 0;
  const participantLastUpdated = _participant?.lastUpdated ?? 0;
  const participantCurrentState = _participant?.currentState ?? null;
  const interactionState = _interaction?.state ?? null;

  // Auto wrap-up timer.
  // `currentTask.autoWrapup` must remain a useEffect dependency so that when
  // the SDK sets it (after the initial wrapup render), React detects the
  // change on the next re-render and re-fires the effect.
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval>;

    if (currentTask?.autoWrapup && controls?.main?.wrapup) {
      try {
        const initialTimeLeft = currentTask.autoWrapup.getTimeLeftSeconds();
        setsecondsUntilAutoWrapup(initialTimeLeft);

        timerId = setInterval(() => {
          setsecondsUntilAutoWrapup((prevTime) => {
            if (prevTime && prevTime > 0) {
              return prevTime - 1;
            }
            return 0;
          });
        }, 1000);
      } catch (error) {
        logger.error('CC-Widgets: CallControl: Error initializing auto wrap-up timer', {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#autoWrapupTimer',
          error,
        });
      }
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [currentTask?.autoWrapup, controls?.main?.wrapup]);

  // Calculate state timer label and timestamp (Wrap Up / Post Call).
  // When the SDK sets wrapup controls visible (ContactEnded event), the
  // participant data may not yet contain the wrapup timestamp (it arrives
  // in the subsequent AgentWrapup event).  Bridge this gap by showing the
  // "Wrap Up" label immediately with Date.now() as a close approximation;
  // the timer auto-corrects when the real timestamp arrives.
  useEffect(() => {
    const stateTimerData = calculateStateTimerData(currentTask, controls, agentId);

    if (stateTimerData.label && stateTimerData.timestamp) {
      setStateTimerLabel(stateTimerData.label);
      setStateTimerTimestamp(stateTimerData.timestamp);
    } else if (controls?.main?.wrapup?.isVisible) {
      setStateTimerLabel(TIMER_LABEL_WRAP_UP);
      setStateTimerTimestamp((prev) => prev || Date.now());
    } else {
      setStateTimerLabel(stateTimerData.label);
      setStateTimerTimestamp(stateTimerData.timestamp);
    }
  }, [
    currentTask,
    controls,
    agentId,
    participantIsWrapUp,
    participantWrapUpTimestamp,
    participantLastUpdated,
    participantCurrentState,
    interactionState,
  ]);

  // Calculate consult timer label and timestamp.
  // The calculation relies on consult media's isHold + holdTimestamp as the
  // sole source of truth for "Consult on Hold" (same as the next branch).
  //
  // On hidden→visible transition (new consult starts), stale data from the
  // previous flow may produce "Consult on Hold". Override to safe defaults.
  // We never early-return — the calculation always runs — so that when data
  // is already fresh (e.g., Agent 1 accepts a consult and data says
  // "Consulting"), the correct label is applied immediately.
  useEffect(() => {
    const isConsulting = controls?.consult?.endConsult?.isVisible || controls?.main?.endConsult?.isVisible;
    const wasConsulting = prevIsConsultingRef.current;
    prevIsConsultingRef.current = !!isConsulting;

    const consultTimerData = calculateConsultTimerData(currentTask, controls, agentId);
    const justBecameConsulting = isConsulting && !wasConsulting;
    const interactionId = currentTask?.data?.interaction?.interactionId;

    const nextConsultLabel = consultTimerData.label;
    const nextConsultTimestamp = consultTimerData.timestamp;

    if (nextConsultLabel === TIMER_LABEL_CONSULT_ON_HOLD) {
      writeConsultHoldAnchor(interactionId, nextConsultTimestamp);
    } else {
      clearConsultHoldAnchor(interactionId);
    }

    if (justBecameConsulting && nextConsultLabel === TIMER_LABEL_CONSULT_ON_HOLD) {
      setConsultTimerLabel(TIMER_LABEL_CONSULT_REQUESTED);
      setConsultTimerTimestamp(0);
    } else {
      setConsultTimerLabel(nextConsultLabel);
      setConsultTimerTimestamp(nextConsultTimestamp);
    }
  }, [currentTask, controls, agentId, consultMediaIsHold, consultMediaId, participantConsultState]);

  const isCampaignCall = currentTask ? isCampaignPreviewTask(currentTask) : false;

  return {
    currentTask,
    isHeld,
    endCall,
    toggleHold,
    toggleRecording,
    toggleMute,
    sendDtmf,
    isMuted,
    wrapupCall,
    isRecording,
    setIsRecording,
    buddyAgents,
    loadingBuddyAgents,
    loadBuddyAgents,
    transferCall,
    consultCall,
    endConsultCall,
    consultTransfer,
    consultConference,
    switchToMainCall,
    switchToConsult,
    exitConference,
    consultAgentName,
    setConsultAgentName,
    holdTime,
    startTimestamp,
    stateTimerLabel,
    stateTimerTimestamp,
    consultTimerLabel,
    consultTimerTimestamp,
    lastTargetType,
    setLastTargetType,
    controls,
    conferenceEnabled,
    secondsUntilAutoWrapup,
    cancelAutoWrapup,
    conferenceParticipants,
    getAddressBookEntries,
    getEntryPoints,
    getQueuesFetcher,
    isCampaignCall,
    telephonyToast,
    dismissTelephonyToast,
  };
};

export const useOutdialCall = (props: useOutdialCallProps) => {
  const {cc, logger} = props;

  /**
   * Check if there's an active telephony task in the task list.
   * Returns true if any task in the task list is a telephony task.
   * Digital tasks (email, chat) should not prevent outdial calls.
   */
  const isTelephonyTaskActive = useMemo(() => {
    try {
      const taskList = store.taskList;
      if (!taskList || Object.keys(taskList).length === 0) {
        return false;
      }

      // Check if any task in the list is a telephony task
      return Object.values(taskList).some(
        (task: ITask) => task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER
      );
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error checking telephony task - ${error.message}`, {
        module: 'useOutdialCall',
        method: 'isTelephonyTaskActive',
      });
      return false;
    }
  }, [store.taskList, logger]);

  const startOutdial = (destination: string, origin: string = undefined) => {
    try {
      // Perform validation on destination number.
      if (!destination || !destination.trim()) {
        alert('Destination number is required, it cannot be empty');
        return;
      }

      // Only pass origin if it's defined and not empty
      const outdialRequest = origin ? cc.startOutdial(destination, origin) : cc.startOutdial(destination);

      outdialRequest
        .then(() => {
          logger.info('Outdial call started');
        })
        .catch((error: Error) => {
          logger.error(`${error}`, {
            module: 'widget-OutdialCall#helper.ts',
            method: 'startOutdial',
          });
          store.handleOutdialFailed(error.message || 'Outdial failed');
        });
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in startOutdial - ${error.message}`, {
        module: 'useOutdialCall',
        method: 'startOutdial',
      });
    }
  };

  /**
   * Fetches the Outdial ANI entries for the current agent.
   * @returns A promise with an array of Outdial ANI entries.
   */
  const getOutdialANIEntries = async (): Promise<OutdialAniEntriesResponse> => {
    try {
      const agentProfile = cc.agentConfig;
      const outdialANIId = agentProfile?.outdialANIId;
      if (!outdialANIId) {
        throw Error('No OutdialANI Id received.');
      }
      const result = await cc.getOutdialAniEntries({outdialANI: outdialANIId});
      return result;
    } catch (error) {
      logger.error(`CC-Widgets: Task: Error fetching Outdial ANI entries: ${error}`, {
        module: 'useOutdialCall',
        method: 'getOutdialANIEntries',
      });
      throw error;
    }
  };

  const getAddressBookEntries = async (params: AddressBookEntrySearchParams): Promise<AddressBookEntriesResponse> => {
    try {
      const result = await cc.addressBook.getEntries(params);
      return result;
    } catch (error) {
      logger.error(`CC-Widgets: Task: Error fetching address book entries: ${error}`, {
        module: 'useOutdialCall',
        method: 'getAddressBookEntries',
      });

      throw error;
    }
  };

  return {
    startOutdial,
    getOutdialANIEntries,
    getAddressBookEntries,
    isTelephonyTaskActive,
  };
};
