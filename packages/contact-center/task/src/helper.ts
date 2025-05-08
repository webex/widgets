import {useEffect, useCallback, useState, useRef, useMemo} from 'react';
import {ITask} from '@webex/plugin-cc';
import {useCallControlProps, UseTaskListProps, UseTaskProps, Participant} from './task.types';
import {useOutdialCallProps} from '@webex/cc-components';
import store, {TASK_EVENTS, BuddyDetails, DestinationType, ContactServiceQueue} from '@webex/cc-store';
import {getControlsVisibility} from './Utils/task-util';

// Hook for managing the task list
export const useTaskList = (props: UseTaskListProps) => {
  const {deviceType, onTaskAccepted, onTaskDeclined, logger, taskList} = props;
  const isBrowser = deviceType === 'BROWSER';

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useTaskList#${method}`,
    });
  };

  useEffect(() => {
    store.setTaskAssigned(function (task) {
      if (onTaskAccepted) onTaskAccepted(task);
    });

    store.setTaskRejected(function (task, reason) {
      console.log('Task rejected:', task, reason);
      if (onTaskDeclined) onTaskDeclined(task);
    });
  }, []);

  const acceptTask = (task: ITask) => {
    task.accept().catch((error: Error) => {
      logError(`Error accepting task: ${error}`, 'acceptTask');
    });
  };

  const declineTask = (task: ITask) => {
    task.decline().catch((error: Error) => {
      logError(`Error declining task: ${error}`, 'declineTask');
    });
  };
  const onTaskSelect = (task: ITask) => {
    store.setCurrentTask(task);
  };

  return {taskList, acceptTask, declineTask, onTaskSelect, isBrowser};
};

export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onDeclined, deviceType, incomingTask, logger} = props;
  const isBrowser = deviceType === 'BROWSER';

  const taskAssignCallback = () => {
    if (onAccepted) onAccepted(incomingTask);
  };

  const taskRejectCallback = () => {
    if (onDeclined) onDeclined(incomingTask);
  };

  useEffect(() => {
    if (!incomingTask) return;
    store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask?.data.interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    };
  }, [incomingTask]);

  const logError = (message: string, method: string) => {
    logger.error(message, {
      module: 'widget-cc-task#helper.ts',
      method: `useIncomingTask#${method}`,
    });
  };

  const accept = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask.accept(taskId).catch((error: Error) => {
      logError(`Error accepting incoming task: ${error}`, 'accept');
    });
  };

  const decline = () => {
    const taskId = incomingTask?.data.interactionId;
    if (!taskId) return;

    incomingTask.decline(taskId).catch((error: Error) => {
      logError(`Error declining incoming task: ${error}`, 'decline');
    });
  };

  return {
    incomingTask,
    accept,
    decline,
    isBrowser,
  };
};

export const useCallControl = (props: useCallControlProps) => {
  const {currentTask, onHoldResume, onEnd, onWrapUp, logger, consultInitiated, deviceType, featureFlags} = props;
  const [isHeld, setIsHeld] = useState<boolean | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(true);
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);
  const [queues, setQueues] = useState<ContactServiceQueue[]>([]);
  const [consultAgentName, setConsultAgentName] = useState<string>('Consult Agent');
  const [consultAgentId, setConsultAgentId] = useState<string>(null);
  const [holdTime, setHoldTime] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState<number>(0);
  const workerRef = useRef<Worker | null>(null);
  const [lastTargetType, setLastTargetType] = useState<'agent' | 'queue'>('agent');

  const workerScript = `
    let intervalId;
    const startTimer = (startTime) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        self.postMessage({type: 'elapsedTime', elapsedTime});
      }, 1000);
    };
    const stopTimer = () => {
      if (intervalId) clearInterval(intervalId);
      self.postMessage({type: 'stop'});
    };
    self.onmessage = (event) => {
      if (event.data.type === 'start') {
        const startTime = event.data.startTime;
        startTimer(startTime);
      }
      if (event.data.type === 'stop') {
        stopTimer();
      }
    };
  `;

  useEffect(() => {
    if (!workerRef.current?.postMessage) return;
    if (isHeld) {
      // Start the timer when the call is on hold
      workerRef.current?.postMessage({type: 'start', startTime: Date.now()});
    } else {
      // Stop the timer when the call is resumed
      workerRef.current?.postMessage({type: 'stop'});
    }
  }, [isHeld, workerRef.current?.postMessage]);

  // Function to extract consulting agent information
  const extractConsultingAgent = useCallback(() => {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;

    const {interaction} = currentTask.data;
    // consultInitiated
    // Find consulting agent (any agent that is not the current agent)
    const foundAgent = Object.values(interaction.participants)
      .filter(
        (participant: Participant) =>
          participant.pType === 'Agent' &&
          (consultInitiated
            ? participant.id !== store.cc.agentConfig.agentId
            : participant.id === store.cc.agentConfig.agentId)
      )
      .map((participant: Participant) => ({id: participant.id, name: participant.name}))[0];

    if (foundAgent) {
      setConsultAgentName(foundAgent.name);
      setConsultAgentId(foundAgent.id);
      logger.info(`Consulting agent detected: ${foundAgent.name} ${foundAgent.id}`, {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      });
    }
  }, [currentTask, consultAgentName, logger, consultInitiated]);

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
      setBuddyAgents(agents);
    } catch (error) {
      logger.error(`Error loading buddy agents: ${error}`, {module: 'helper.ts', method: 'loadBuddyAgents'});
      setBuddyAgents([]);
    }
  }, [logger]);

  const loadQueues = useCallback(async () => {
    try {
      const queues = await store.getQueues();
      setQueues(queues);
    } catch (error) {
      logError(`Error loading queues: ${error}`, 'loadQueues');
      setQueues([]);
    }
  }, [logger]);

  const holdCallback = () => {
    setIsHeld(true);
    if (onHoldResume) onHoldResume();
  };

  const resumeCallback = () => {
    setIsHeld(false);
    if (onHoldResume) onHoldResume();
  };

  const endCallCallback = () => {
    if (onEnd) onEnd();
  };

  const wrapupCallCallback = ({wrapUpAuxCodeId}) => {
    const wrapUpReason = store.wrapupCodes.find((code) => code.id === wrapUpAuxCodeId)?.name;
    if (onWrapUp) {
      onWrapUp({
        task: currentTask,
        wrapUpReason: wrapUpReason,
      });
    }
  };

  const pauseRecordingCallback = () => {
    setIsRecording(false);
  };

  const resumeRecordingCallback = () => {
    setIsRecording(true);
  };

  useEffect(() => {
    if (!currentTask) return;

    // Initialize the Web Worker
    const blob = new Blob([workerScript], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    workerRef.current.onmessage = (event) => {
      if (event.data.type === 'elapsedTime') {
        setHoldTime(event.data.elapsedTime);
      } else if (event.data.type === 'stop') {
        setHoldTime(0);
      }
    };

    store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.AGENT_WRAPPEDUP, wrapupCallCallback, currentTask.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.CONTACT_RECORDING_PAUSED, pauseRecordingCallback, currentTask.data.interactionId);
    store.setTaskCallback(
      TASK_EVENTS.CONTACT_RECORDING_RESUMED,
      resumeRecordingCallback,
      currentTask.data.interactionId
    );

    return () => {
      if (workerRef.current?.postMessage) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
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
    if (hold) {
      currentTask.hold().catch((error: Error) => {
        logError(`Error holding call: ${error}`, 'toggleHold');
      });

      return;
    }

    currentTask.resume().catch((error: Error) => {
      logError(`Error resuming call: ${error}`, 'toggleHold');
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      currentTask.pauseRecording().catch((error: Error) => {
        logError(`Error pausing recording: ${error}`, 'toggleRecording');
      });
    } else {
      currentTask.resumeRecording().catch((error: Error) => {
        logError(`Error resuming recording: ${error}`, 'toggleRecording');
      });
    }
  };

  const endCall = () => {
    currentTask.end().catch((error: Error) => {
      logError(`Error ending call: ${error}`, 'endCall');
    });
  };

  const wrapupCall = (wrapUpReason: string, auxCodeId: string) => {
    currentTask.wrapup({wrapUpReason: wrapUpReason, auxCodeId: auxCodeId}).catch((error: Error) => {
      logError(`Error wrapping up call: ${error}`, 'wrapupCall');
    });
  };

  const transferCall = async (transferDestination: string, destinationType: DestinationType) => {
    const transferPayload = {
      to: transferDestination,
      destinationType: destinationType,
    };

    try {
      await currentTask.transfer(transferPayload);
    } catch (error) {
      logError(`Error transferring call: ${error}`, 'transferCall');
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
      await currentTask.consultTransfer(consultTransferPayload);
      store.setConsultInitiated(true);
    } catch (error) {
      logError(`Error transferring consult call: ${error}`, 'consultTransfer');
      throw error;
    }
  };

  const controlVisibility = useMemo(
    () => getControlsVisibility(deviceType, featureFlags, currentTask),
    [deviceType, featureFlags, currentTask]
  );

  return {
    currentTask,
    endCall,
    toggleHold,
    toggleRecording,
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
  };
};

export const useOutdialCall = (props: useOutdialCallProps) => {
  const {cc, logger} = props;

  const startOutdial = (destination: string) => {
    // Perform validation on destination number.
    if (!destination || !destination.trim()) {
      alert('Destination number is required, it cannot be empty');
      return;
    }

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
  };

  return {
    startOutdial,
  };
};
