import {useEffect, useCallback, useState} from 'react';
import {ITask} from '@webex/plugin-cc';
import {useCallControlProps, UseTaskListProps, UseTaskProps, Participant} from './task.types';
import {useOutdialCallProps} from '@webex/cc-components';
import store, {TASK_EVENTS, BuddyDetails, DestinationType} from '@webex/cc-store';

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
    if (!taskList || taskList.length === 0) return;
    let taskAssignCallback, taskRejectCallback;

    taskList.forEach((task) => {
      const taskId = task?.data.interactionId;
      if (!taskId) return;

      taskAssignCallback = () => {
        if (onTaskAccepted) onTaskAccepted(task);
      };

      taskRejectCallback = () => {
        if (onTaskDeclined) onTaskDeclined(task);
      };

      store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, taskId);
      store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, taskId);
    });

    return () => {
      taskList.forEach((task) => {
        const taskId = task?.data.interactionId;
        if (!taskId) return;

        store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, taskId);
        store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, taskId);
      });
    };
  }, [taskList]);

  const acceptTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task.accept(taskId).catch((error: Error) => {
      logError(`Error accepting task: ${error}`, 'acceptTask');
    });
  };

  const declineTask = (task: ITask) => {
    const taskId = task?.data.interactionId;
    if (!taskId) return;

    task.decline(taskId).catch((error: Error) => {
      logError(`Error declining task: ${error}`, 'declineTask');
    });
  };

  return {taskList, acceptTask, declineTask, isBrowser};
};

export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onDeclined, deviceType, incomingTask, logger} = props;
  const isBrowser = deviceType === 'BROWSER';

  const taskAssignCallback = () => {
    if (onAccepted) onAccepted();
  };

  const taskRejectCallback = () => {
    if (onDeclined) onDeclined();
  };

  useEffect(() => {
    if (!incomingTask) return;
    store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask?.data.interactionId);
    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask?.data.interactionId);
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
  const {currentTask, onHoldResume, onEnd, onWrapUp, logger} = props;
  const [isHeld, setIsHeld] = useState<boolean | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(true);
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);
  const [consultAgentName, setConsultAgentName] = useState<string>('Consult Agent');
  const [consultAgentId, setConsultAgentId] = useState<string>(null);

  // Function to extract consulting agent information
  const extractConsultingAgent = useCallback(() => {
    if (!currentTask || !currentTask.data || !currentTask.data.interaction) return;

    const {interaction} = currentTask.data;

    // Find consulting agent (any agent that is not the current agent)
    const foundAgent = Object.values(interaction.participants)
      .filter(
        (participant: Participant) => participant.pType === 'Agent' && participant.id !== store.cc.agentConfig.agentId
      )
      .map((agent: Participant) => ({
        id: agent.id,
        name: agent.name,
      }))[0];

    if (foundAgent) {
      setConsultAgentName(foundAgent.name);
      setConsultAgentId(foundAgent.id);
      logger.info(`Consulting agent detected: ${foundAgent.name} ${foundAgent.id}`, {
        module: 'widget-cc-task#helper.ts',
        method: 'useCallControl#extractConsultingAgent',
      });
    }
  }, [currentTask, consultAgentName, logger]);

  // Check for consulting agent whenever currentTask changes
  useEffect(() => {
    extractConsultingAgent();
  }, [currentTask, extractConsultingAgent]);

  const loadBuddyAgents = useCallback(async () => {
    try {
      const agents = await store.getBuddyAgents();
      setBuddyAgents(agents);
    } catch (error) {
      logger.error(`Error loading buddy agents: ${error}`, {module: 'helper.ts', method: 'loadBuddyAgents'});
      setBuddyAgents([]);
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

    try {
      await currentTask.consult(consultPayload);
      store.setConsultInitiated(true);
    } catch (error) {
      logError(`Error consulting call: ${error}`, 'consultCall');
      throw error;
    }
  };

  const endConsultCall = async () => {
    const consultEndPayload = {
      isConsult: true,
      taskId: currentTask.data.interactionId,
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
    transferCall,
    consultCall,
    endConsultCall,
    consultTransfer,
    consultAgentName,
    setConsultAgentName,
    consultAgentId,
    setConsultAgentId,
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
