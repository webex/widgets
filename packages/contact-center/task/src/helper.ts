import {useEffect, useCallback, useState, useRef, useMemo} from 'react';
import {ITask} from '@webex/contact-center';
import {useCallControlProps, UseTaskListProps, UseTaskProps, Participant, useOutdialCallProps} from './task.types';
import store, {TASK_EVENTS, BuddyDetails, DestinationType, ContactServiceQueue} from '@webex/cc-store';
import {findHoldTimestamp, getControlsVisibility} from './Utils/task-util';

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
    consultInitiated,
    deviceType,
    featureFlags,
    isMuted,
  } = props;
  const [isHeld, setIsHeld] = useState<boolean | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(true);
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);
  const [queues, setQueues] = useState<ContactServiceQueue[]>([]);
  const [consultAgentName, setConsultAgentName] = useState<string>('Consult Agent');
  const [consultAgentId, setConsultAgentId] = useState<string>(null);
  const [holdTime, setHoldTime] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const [secondsUntilAutoWrapup, setsecondsUntilAutoWrapup] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [lastTargetType, setLastTargetType] = useState<'agent' | 'queue'>('agent');

  const workerScript = `
    let intervalId = null;
    self.onmessage = function(e) {
      if (e.data.type === 'start') {
        const eventTime = e.data.eventTime;
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
          const elapsed = Math.floor((Date.now() - eventTime) / 1000);
          self.postMessage({ type: 'elapsedTime', elapsed });
        }, 1000);
      }
      if (e.data.type === 'stop') {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      }
    };
  `;

  useEffect(() => {
    // Clean up previous worker if any
    if (workerRef.current) {
      if (typeof workerRef.current.postMessage === 'function') {
        workerRef.current.postMessage({type: 'stop'});
      }
      if (typeof workerRef.current.terminate === 'function') {
        workerRef.current.terminate();
      }
      workerRef.current = null;
    }

    // Get holdTimestamp from the interaction object
    const holdTimestamp = currentTask?.data?.interaction
      ? findHoldTimestamp(currentTask.data.interaction, 'mainCall', logger)
      : null;

    if (holdTimestamp) {
      const holdTimeMs = holdTimestamp < 10000000000 ? holdTimestamp * 1000 : holdTimestamp;
      const blob = new Blob([workerScript], {type: 'application/javascript'});
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      // Set initial holdTime immediately for instant UI update
      setHoldTime(Math.floor((Date.now() - holdTimeMs) / 1000));

      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'elapsedTime') setHoldTime(e.data.elapsed);
        if (e.data.type === 'stop') setHoldTime(0);
      };

      workerRef.current.postMessage({type: 'start', eventTime: holdTimeMs});
    } else {
      setHoldTime(0);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [currentTask?.data?.interaction]);
  // Function to extract consulting agent information
  const extractConsultingAgent = useCallback(() => {
    try {
      if (!currentTask?.data?.interaction?.participants) return;

      const {interaction} = currentTask.data;
      const myAgentId = store.cc.agentConfig?.agentId;

      // Find all agent participants except the current agent
      const otherAgents = Object.values(interaction.participants || {}).filter(
        (participant): participant is Participant =>
          (participant as Participant).pType === 'Agent' && (participant as Participant).id !== myAgentId
      );

      // Pick the first other agent (should only be one in a consult)
      const foundAgent = otherAgents.length > 0 ? {id: otherAgents[0].id, name: otherAgents[0].name} : null;

      if (foundAgent) {
        setConsultAgentName(foundAgent.name);
        setConsultAgentId(foundAgent.id);
        logger.info(`Consulting agent detected: ${foundAgent.name} ${foundAgent.id}`, {
          module: 'widget-cc-task#helper.ts',
          method: 'useCallControl#extractConsultingAgent',
        });
      }
    } catch (error) {
      console.log('error', error);
      logger.error(`CC-Widgets: Task: Error in extractConsultingAgent - ${error.message}`, {
        module: 'useCallControl',
        method: 'extractConsultingAgent',
      });
    }
  }, [currentTask, logger, consultInitiated]);

  // Check for consulting agent whenever currentTask changes
  useEffect(() => {
    extractConsultingAgent();
    if (
      currentTask?.data?.interaction?.participants &&
      store?.cc?.agentConfig?.agentId &&
      currentTask.data.interaction.participants[store.cc.agentConfig.agentId]?.joinTimestamp
    ) {
      setStartTimestamp(currentTask.data.interaction.participants[store.cc.agentConfig.agentId].joinTimestamp);
    }
  }, [currentTask, extractConsultingAgent, consultInitiated]);

  const loadBuddyAgents = useCallback(async () => {
    try {
      const agents = await store.getBuddyAgents();
      logger.info(`Loaded ${agents.length} buddy agents`, {module: 'helper.ts', method: 'loadBuddyAgents'});
      setBuddyAgents(agents);
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error loading buddy agents - ${error.message || error}`, {
        module: 'useCallControl',
        method: 'loadBuddyAgents',
      });
      setBuddyAgents([]);
    }
  }, [logger]);

  const loadQueues = useCallback(async () => {
    try {
      const queues = await store.getQueues();
      setQueues(queues);
    } catch (error) {
      logger?.error(`CC-Widgets: Task: Error loading queues - ${error.message || error}`, {
        module: 'useCallControl',
        method: 'loadQueues',
      });
      setQueues([]);
    }
  }, [logger]);

  const holdCallback = () => {
    try {
      setIsHeld(true);
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
      setIsHeld(false);
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
    if (!currentTask) return;
    logger.log(`useCallControl init for task ${currentTask.data.interactionId}`, {
      module: 'useCallControl',
      method: 'useEffect-init',
    });

    store.setTaskCallback(
      // Should use holdCallback
      TASK_EVENTS.TASK_HOLD,
      holdCallback,
      currentTask.data.interactionId
    );
    store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, currentTask.data.interactionId);

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, currentTask.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, currentTask.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, currentTask.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, currentTask.data.interactionId);
      store.removeTaskCallback(
        TASK_EVENTS.CONTACT_RECORDING_PAUSED,
        pauseRecordingCallback,
        currentTask.data.interactionId
      );
      store.removeTaskCallback(
        TASK_EVENTS.CONTACT_RECORDING_RESUMED,
        resumeRecordingCallback,
        currentTask.data.interactionId
      );
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
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
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
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      await currentTask.transfer({to, destinationType: type});
      logger.info('transferCall success', {module: 'useCallControl', method: 'transferCall'});
    } catch (error) {
      logger.error(`Error transferring call: ${error}`, {module: 'useCallControl', method: 'transferCall'});
      throw error;
    }
  };

  const consultCall = async (consultDestination: string, destinationType: DestinationType) => {
    const consultPayload = {
      to: consultDestination,
      destinationType: destinationType,
    };

    if (destinationType === 'queue') {
      store.setIsQueueConsultInProgress(true);
      store.setCurrentConsultQueueId(consultDestination);
      store.setConsultInitiated(true);
    }

    try {
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      await currentTask.consult(consultPayload);
      store.setIsQueueConsultInProgress(false);
      if (destinationType === 'queue') {
        store.setCurrentConsultQueueId(null);
      } else {
        store.setConsultInitiated(true);
      }
    } catch (error) {
      if (destinationType === 'queue') {
        store.setIsQueueConsultInProgress(false);
        store.setCurrentConsultQueueId(null);
        store.setConsultInitiated(false);
      }
      logError(`Error consulting call: ${error}`, 'consultCall');
      throw error;
    }
  };

  const endConsultCall = async () => {
    const consultEndPayload = {
      isConsult: true,
      taskId: currentTask.data.interactionId,
      ...(store.isQueueConsultInProgress && {queueId: store.currentConsultQueueId}),
    };

    try {
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      await currentTask.endConsult(consultEndPayload);
    } catch (error) {
      logError(`Error ending consult call: ${error}`, 'endConsultCall');
      throw error;
    }
  };

  const consultTransfer = async (transferDestination: string, destinationType: DestinationType) => {
    const consultTransferPayload = {
      to: transferDestination,
      destinationType: destinationType,
    };
    try {
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      await currentTask.consultTransfer(consultTransferPayload);
      store.setConsultInitiated(true);
    } catch (error) {
      logError(`Error transferring consult call: ${error}`, 'consultTransfer');
      throw error;
    }
  };

  const cancelAutoWrapup = () => {
    logger.info('CC-Widgets: CallControl: wrap-up cancelled', {
      module: 'widget-cc-task#helper.ts',
      method: 'useCallControl#cancelAutoWrapup',
    });
    currentTask.cancelAutoWrapupTimer();
  };

  const controlVisibility = useMemo(
    () => getControlsVisibility(deviceType, featureFlags, currentTask, logger),
    [deviceType, featureFlags, currentTask, logger]
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
          //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
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

  return {
    currentTask,
    endCall,
    toggleHold,
    toggleRecording,
    toggleMute,
    isMuted,
    wrapupCall,
    isHeld,
    setIsHeld,
    isRecording,
    setIsRecording,
    buddyAgents,
    loadBuddyAgents,
    queues,
    loadQueues,
    transferCall,
    consultCall,
    endConsultCall,
    consultTransfer,
    consultAgentName,
    setConsultAgentName,
    consultAgentId,
    setConsultAgentId,
    holdTime,
    startTimestamp,
    lastTargetType,
    setLastTargetType,
    controlVisibility,
    secondsUntilAutoWrapup,
    cancelAutoWrapup,
  };
};

export const useOutdialCall = (props: useOutdialCallProps) => {
  const {cc, logger} = props;

  const startOutdial = (destination: string) => {
    try {
      // Perform validation on destination number.
      if (!destination || !destination.trim()) {
        alert('Destination number is required, it cannot be empty');
        return;
      }
      //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
      cc.startOutdial(destination)
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

  return {
    startOutdial,
  };
};
