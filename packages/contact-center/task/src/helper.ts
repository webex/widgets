import {useEffect, useCallback, useState, useMemo} from 'react';
import {AddressBookEntriesResponse, AddressBookEntrySearchParams, ITask} from '@webex/contact-center';
import {
  useCallControlProps,
  UseTaskListProps,
  UseTaskProps,
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
} from '@webex/cc-store';
import {getControlsVisibility} from './Utils/task-util';
import {TIMER_LABEL_CONSULTING} from './Utils/constants';
import {calculateStateTimerData, calculateConsultTimerData} from './Utils/timer-utils';
import {useHoldTimer} from './Utils/useHoldTimer';
import {OutdialAniEntriesResponse} from '@webex/contact-center/dist/types/services/config/types';

const ENGAGED_LABEL = 'ENGAGED';
const ENGAGED_USERNAME = 'Engaged';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {deviceType, onTaskAccepted, onTaskDeclined, onTaskSelected, logger, taskList} = props;
  const isBrowser = deviceType === 'BROWSER';

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

  return {taskList, acceptTask, declineTask, onTaskSelect, isBrowser};
};

export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onRejected, deviceType, incomingTask, logger} = props;
  const isBrowser = deviceType === 'BROWSER';
  const isDeclineButtonEnabled = store.isDeclineButtonEnabled;

  const taskAssignCallback = () => {
    try {
      if (onAccepted) onAccepted({task: incomingTask});
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in taskAssignCallback - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'taskAssignCallback',
      });
    }
  };

  const taskRejectCallback = () => {
    try {
      if (onRejected) onRejected({task: incomingTask});
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error in taskRejectCallback - ${error.message}`, {
        module: 'useIncomingTask',
        method: 'taskRejectCallback',
      });
    }
  };

  useEffect(() => {
    try {
      if (!incomingTask) return;
      store.setTaskCallback(
        TASK_EVENTS.TASK_ASSIGNED,
        () => {
          try {
            if (onAccepted) onAccepted({task: incomingTask});
          } catch (error) {
            logger?.error(`CC-Widgets: Task: Error in TASK_ASSIGNED callback - ${error.message}`, {
              module: 'useIncomingTask',
              method: 'TASK_ASSIGNED_callback',
            });
          }
        },
        incomingTask.data.interactionId
      );
      store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_END, taskRejectCallback, incomingTask?.data.interactionId);

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
  }, [incomingTask]);

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
    isBrowser,
    isDeclineButtonEnabled,
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
    deviceType,
    featureFlags,
    isMuted,
    conferenceEnabled,
    agentId,
  } = props;
  const [isRecording, setIsRecording] = useState(true);
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);
  const [loadingBuddyAgents, setLoadingBuddyAgents] = useState(false);
  const [consultAgentName, setConsultAgentName] = useState<string>('Consult Agent');
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [secondsUntilAutoWrapup, setsecondsUntilAutoWrapup] = useState<number | null>(null);

  // State timer labels and timestamps
  const [stateTimerLabel, setStateTimerLabel] = useState<string | null>(null);
  const [stateTimerTimestamp, setStateTimerTimestamp] = useState<number>(0);

  // Consult timer labels and timestamps
  const [consultTimerLabel, setConsultTimerLabel] = useState<string>(TIMER_LABEL_CONSULTING);
  const [consultTimerTimestamp, setConsultTimerTimestamp] = useState<number>(0);
  const [lastTargetType, setLastTargetType] = useState<TargetType>(TARGET_TYPE.AGENT);
  const [conferenceParticipants, setConferenceParticipants] = useState<Participant[]>([]);

  // Use custom hook for hold timer management
  const holdTime = useHoldTimer(currentTask);

  useEffect(() => {
    if (currentTask && store?.cc?.agentConfig?.agentId) {
      const participants = getConferenceParticipants(currentTask, store.cc.agentConfig.agentId);
      setConferenceParticipants(participants);
    }
  }, [currentTask]);
  // Function to extract consulting agent information
  const extractConsultingAgent = useCallback(() => {
    try {
      if (!currentTask?.data?.interaction?.participants) return;

      const {interaction} = currentTask.data;
      const myAgentId = store.cc.agentConfig?.agentId;

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

              if (phoneNumber && phoneNumber !== consultAgentName) {
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
          return participant && participant.id !== myAgentId && participant.pType === 'Agent';
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
        // Fallback: Use old logic if consult media not found
        const otherAgents = Object.values(interaction.participants || {}).filter(
          (participant): participant is Participant =>
            (participant as Participant).pType === 'Agent' && (participant as Participant).id !== myAgentId
        );

        // In a conference with multiple agents, find the agent currently being consulted
        // Priority: 1) consultState="consulting" 2) most recent consultTimestamp
        let foundAgent: {id: string; name: string} | null = null;

        if (otherAgents.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const consultingAgent = otherAgents.find((agent: any) => agent.consultState === 'consulting');

          if (consultingAgent) {
            foundAgent = {
              id: consultingAgent.id,
              name: consultingAgent.name,
            };
          } else {
            // Fallback: Find agent with most recent consultTimestamp
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const agentWithMostRecentTimestamp = otherAgents.reduce((latest: any, current: any) => {
              const currentTimestamp = current.consultTimestamp || current.joinTimestamp || 0;
              const latestTimestamp = latest ? latest.consultTimestamp || latest.joinTimestamp || 0 : 0;
              return currentTimestamp >= latestTimestamp ? current : latest;
            }, null);

            if (agentWithMostRecentTimestamp) {
              foundAgent = {
                id: agentWithMostRecentTimestamp.id,
                name: agentWithMostRecentTimestamp.name,
              };
            }
          }
        }

        if (foundAgent) {
          setConsultAgentName(foundAgent.name);
          logger.info(`Consulting agent detected (fallback): ${foundAgent.name} ${foundAgent.id}`, {
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
  }, [currentTask, logger, lastTargetType, consultAgentName, setConsultAgentName]);

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

  const loadBuddyAgents = useCallback(async () => {
    try {
      setLoadingBuddyAgents(true);
      const agents = await store.getBuddyAgents();
      logger.info(`Loaded ${agents.length} buddy agents`, {module: 'helper.ts', method: 'loadBuddyAgents'});
      setBuddyAgents(agents);
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error loading buddy agents - ${error.message || error}`, {
        module: 'useCallControl',
        method: 'loadBuddyAgents',
      });
      setBuddyAgents([]);
    } finally {
      setLoadingBuddyAgents(false);
    }
  }, [logger]);

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
        const mediaType = currentTask?.data?.interaction?.mediaType;
        return await store.getQueues(mediaType, {page, pageSize, search});
      } catch (error) {
        logger?.error(`CC-Widgets: Task: Error fetching queues (paginated) - ${error.message || error}`, {
          module: 'useCallControl',
          method: 'getQueuesFetcher',
        });
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
    },
    [logger, currentTask]
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

  const wrapupCallCallback = ({wrapUpAuxCodeId}) => {
    try {
      const wrapUpReason = store.wrapupCodes.find((code) => code.id === wrapUpAuxCodeId)?.name;
      if (onWrapUp) {
        onWrapUp({
          task: currentTask,
          wrapUpReason: wrapUpReason,
        });
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
    store.setTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, interactionId);

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.CONTACT_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.CONTACT_RECORDING_RESUMED, resumeRecordingCallback, interactionId);
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
      console.log('Mute control not available', controlVisibility);
      if (!controlVisibility?.muteUnmute) {
        logger.warn('Mute control not available', {module: 'useCallControl', method: 'toggleMute'});
        return;
      }

      logger.info('toggleMute() called', {module: 'useCallControl', method: 'toggleMute'});

      // Store the intended new state
      const intendedMuteState = !isMuted;

      try {
        await currentTask.toggleMute();

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
      await currentTask.resume(findMediaResourceId(currentTask, 'consult'));
      logger.info('switchToMainCall success', {module: 'useCallControl', method: 'switchToMainCall'});
    } catch (error) {
      logger.error(`Error switchToMainCall: ${error}`, {module: 'useCallControl', method: 'switchToMainCall'});
      throw error;
    }
  };

  const switchToConsult = async () => {
    try {
      await currentTask.hold(findMediaResourceId(currentTask, 'mainCall'));
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
      logError(`Error ending consult call: ${error}`, 'endConsultCall');
      throw error;
    }
  };

  const consultTransfer = async () => {
    if (!currentTask?.data) {
      logError('Cannot transfer consult call: currentTask or data is missing', 'consultTransfer');
      return;
    }

    try {
      if (currentTask.data.isConferenceInProgress) {
        logger.info('Conference in progress, using transferConference', {
          module: 'useCallControl',
          method: 'transferCall',
        });
        await currentTask.transferConference();
      } else {
        logger.info('Consult transfer initiated', {module: 'useCallControl', method: 'consultTransfer'});
        await currentTask.consultTransfer();
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

  const controlVisibility = useMemo(
    () => getControlsVisibility(deviceType, featureFlags, currentTask, agentId, conferenceEnabled, logger),
    [deviceType, featureFlags, currentTask, agentId, conferenceEnabled, logger]
  );

  // Add useEffect for auto wrap-up timer
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (currentTask?.autoWrapup && controlVisibility?.wrapup) {
      try {
        // Initialize time left from the autoWrapup object
        const initialTimeLeft = currentTask.autoWrapup.getTimeLeftSeconds();
        setsecondsUntilAutoWrapup(initialTimeLeft);

        // Update timer every second
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

    // Clear the interval when component unmounts or when auto wrap-up is no longer active
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [currentTask?.autoWrapup, controlVisibility?.wrapup]);

  // Calculate state timer label and timestamp using utils
  // Priority: Wrap Up > Post Call
  useEffect(() => {
    const stateTimerData = calculateStateTimerData(currentTask, controlVisibility, agentId);
    setStateTimerLabel(stateTimerData.label);
    setStateTimerTimestamp(stateTimerData.timestamp);
  }, [currentTask, controlVisibility, agentId]);

  // Calculate consult timer label and timestamp using utils
  useEffect(() => {
    const consultTimerData = calculateConsultTimerData(currentTask, controlVisibility, agentId);
    setConsultTimerLabel(consultTimerData.label);
    setConsultTimerTimestamp(consultTimerData.timestamp);
  }, [currentTask, controlVisibility, agentId]);

  return {
    currentTask,
    endCall,
    toggleHold,
    toggleRecording,
    toggleMute,
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
    controlVisibility,
    secondsUntilAutoWrapup,
    cancelAutoWrapup,
    conferenceParticipants,
    getAddressBookEntries,
    getEntryPoints,
    getQueuesFetcher,
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
      return Object.values(taskList).some((task) => task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER);
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
      const outdialArgs = origin ? [destination, origin] : [destination];

      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      cc.startOutdial(...outdialArgs)
        .then((response) => {
          logger.info('Outdial call started', response);
        })
        .catch((error: Error) => {
          logger.error(`${error}`, {
            module: 'widget-OutdialCall#helper.ts',
            method: 'startOutdial',
          });
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
