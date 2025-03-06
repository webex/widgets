import {
  IStoreWrapper,
  IStore,
  InitParams,
  TASK_EVENTS,
  CC_EVENTS,
  IWrapupCode,
  WithWebex,
  ICustomState,
  IdleCode,
  IContactCenter,
  ITask,
} from './store.types';
import Store from './store';
import {runInAction} from 'mobx';

class StoreWrapper implements IStoreWrapper {
  store: IStore;
  onTaskRejected?: (reason: string) => void;

  constructor() {
    this.store = Store.getInstance();
  }

  // Proxy all methods and properties of the original store
  get teams() {
    return this.store.teams;
  }
  get loginOptions() {
    return this.store.loginOptions;
  }
  get cc() {
    return this.store.cc;
  }
  get logger() {
    return this.store.logger;
  }
  get idleCodes() {
    return this.store.idleCodes.filter((code) => {
      return code.name === 'RONA' || !code.isSystem;
    });
  }
  get agentId() {
    return this.store.agentId;
  }

  get deviceType() {
    return this.store.deviceType;
  }
  get wrapupCodes() {
    return this.store.wrapupCodes;
  }
  get currentTask() {
    return this.store.currentTask;
  }
  get isAgentLoggedIn() {
    return this.store.isAgentLoggedIn;
  }
  get taskList() {
    return this.store.taskList;
  }

  get incomingTask() {
    return this.store.incomingTask;
  }

  get wrapupRequired() {
    return this.store.wrapupRequired;
  }

  get currentState() {
    return this.store.currentState;
  }

  get lastStateChangeTimestamp() {
    return this.store.lastStateChangeTimestamp;
  }

  get lastIdleCodeChangeTimestamp() {
    return this.store.lastIdleCodeChangeTimestamp;
  }

  get showMultipleLoginAlert() {
    return this.store.showMultipleLoginAlert;
  }

  get currentTheme() {
    return this.store.currentTheme;
  }

  get customState() {
    return this.store.customState;
  }

  setCurrentTheme = (theme: string): void => {
    this.store.currentTheme = theme;
  };

  setShowMultipleLoginAlert = (value: boolean): void => {
    this.store.showMultipleLoginAlert = value;
  };

  setDeviceType = (option: string): void => {
    this.store.deviceType = option;
  };

  setCurrentState = (state: string): void => {
    runInAction(() => {
      this.store.currentState = state;
      this.store.customState = null;
    });
  };

  setLastStateChangeTimestamp = (timestamp: number): void => {
    runInAction(() => {
      this.store.lastStateChangeTimestamp = timestamp;
    });
  };

  setLastIdleCodeChangeTimestamp = (timestamp: number): void => {
    runInAction(() => {
      this.store.lastIdleCodeChangeTimestamp = timestamp;
    });
  };

  setIsAgentLoggedIn = (value: boolean): void => {
    this.store.isAgentLoggedIn = value;
  };

  setWrapupRequired = (value: boolean): void => {
    this.store.wrapupRequired = value;
  };

  setCurrentTask = (task: ITask): void => {
    runInAction(() => {
      this.store.currentTask = task;
    });
  };

  setIncomingTask = (task: ITask): void => {
    this.store.incomingTask = task;
  };

  setTaskList = (taskList: ITask[]): void => {
    this.store.taskList = taskList;
  };

  setWrapupCodes = (wrapupCodes: IWrapupCode[]): void => {
    this.store.wrapupCodes = wrapupCodes;
  };

  setState = (state: ICustomState | IdleCode): void => {
    if ('reset' in state) {
      runInAction(() => {
        this.store.customState = null;
      });
      return;
    }
    if ('id' in state) {
      runInAction(() => {
        this.setCurrentState(state.id);
        this.store.customState = null;
      });
    } else {
      runInAction(() => {
        this.store.customState = state;
      });
    }
  };

  setTaskRejected = (callback: ((reason: string) => void) | undefined): void => {
    this.onTaskRejected = callback;
  };

  setCCCallback = (event: CC_EVENTS | TASK_EVENTS, callback) => {
    if (!callback) return;
    this.store.cc.on(event, callback);
  };

  setTaskCallback = (event: TASK_EVENTS, callback, taskId: string) => {
    if (!callback) return;
    const task = this.store.taskList.find((task) => task.data.interactionId === taskId);
    if (!task) return;
    task.on(event, callback);
  };

  removeCCCallback = (event: CC_EVENTS) => {
    this.store.cc.off(event);
  };

  removeTaskCallback = (event: TASK_EVENTS, callback, taskId: string) => {
    if (!callback) return;
    const task = this.store.taskList.find((task) => task.data.interactionId === taskId);
    if (!task) return;
    task.off(event, callback);
  };

  init(options: InitParams): Promise<void> {
    return this.store.init(options, this.setupIncomingTaskHandler);
  }

  registerCC = (webex?: WithWebex['webex']) => {
    return this.store.registerCC(webex);
  };

  handleTaskRemove = (event) => {
    const taskId = event;
    // Remove the task from the taskList
    const taskToRemove = this.store.taskList.find((task) => task.data.interactionId === taskId);
    if (taskToRemove) {
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
      taskToRemove.off(TASK_EVENTS.TASK_END, () => this.handleTaskEnd(taskToRemove));
      taskToRemove.off(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(taskToRemove.interactionId, reason));
    }
    const updateTaskList = this.store.taskList.filter((task) => task.data.interactionId !== taskId);

    runInAction(() => {
      this.setTaskList(updateTaskList);
      this.setWrapupRequired(false);

      // Remove the task from currentTask or incomingTask if it is the same task
      if (this.store.currentTask?.data.interactionId === taskId) {
        this.setCurrentTask(null);
      }

      if (this.store.incomingTask?.data.interactionId === taskId) {
        this.setIncomingTask(null);
      }

      // reset the custom state
      this.setState({
        reset: true,
      });
    });
  };

  handleTaskEnd = (event) => {
    // If the call is ended by agent we get the task object in event.data
    // If the call is ended by customer we get the task object directly

    const task = event.data ? event.data : event;
    // TODO -- SDK needs to send only 1 event on end : https://jira-eng-gpk2.cisco.com/jira/browse/SPARK-615785

    if (task.interaction.state === 'connected') {
      this.setWrapupRequired(true);
      return;
    } else if (task.interaction.state !== 'connected' && this.store.wrapupRequired !== true) {
      this.handleTaskRemove(task.interactionId);
    }
  };

  handleTaskAssigned = (event) => {
    const task = event;
    runInAction(() => {
      this.setCurrentTask(task);
      this.setIncomingTask(null);
      this.setState({
        developerName: 'ENGAGED',
        name: 'Engaged',
      });
    });
  };

  handleTaskWrapUp = (event) => {
    const task = event;
    this.setWrapupRequired(false);
    this.handleTaskRemove(task.interactionId);
  };

  handleIncomingTask = (event) => {
    const task: ITask = event;
    if (this.store.taskList.some((t) => t.data.interactionId === task.data.interactionId)) {
      // Task already present in the taskList
      return;
    }

    // Attach event listeners to the task
    task.on(TASK_EVENTS.TASK_END, () => this.handleTaskEnd(task));

    // When we receive TASK_ASSIGNED the task was accepted by the agent and we need wrap up
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);

    // When we receive TASK_REJECT sdk changes the agent status
    // When we receive TASK_REJECT that means the task was not accepted by the agent and we wont need wrap up
    task.on(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(task.data.interactionId, reason));

    task.on(TASK_EVENTS.AGENT_WRAPPEDUP, this.handleTaskWrapUp);

    this.setIncomingTask(task);
    this.setTaskList([...this.store.taskList, task]);
  };

  handleStateChange = (data) => {
    if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
      const DEFAULT_CODE = '0'; // Default code when no aux code is present
      this.setCurrentState(data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE);

      this.setLastStateChangeTimestamp(data.lastStateChangeTimestamp);
      this.setLastIdleCodeChangeTimestamp(data.lastIdleCodeChangeTimestamp);
    }
  };

  handleMultiLoginCloseSession = (data) => {
    if (data && typeof data === 'object' && data.type === 'AgentMultiLoginCloseSession') {
      this.setShowMultipleLoginAlert(true);
    }
  };

  handleTaskHydrate = (event) => {
    const task = event;
    task.on(TASK_EVENTS.TASK_END, () => this.handleTaskEnd(task));

    // When we receive TASK_ASSIGNED the task was accepted by the agent and we need wrap up
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);

    // When we receive TASK_REJECT sdk changes the agent status
    // When we receive TASK_REJECT that means the task was not accepted by the agent and we wont need wrap up
    task.on(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(task.data.interactionId, reason));

    task.on(TASK_EVENTS.AGENT_WRAPPEDUP, this.handleTaskWrapUp);

    if (!this.store.taskList.some((t) => t.data.interactionId === task.data.interactionId)) {
      this.setTaskList([...this.store.taskList, task]);
    }

    this.setCurrentTask(task);

    const {interaction, agentId} = task.data;
    const {state, isTerminated, participants} = interaction;

    // Update call control states
    if (isTerminated) {
      // wrapup
      const wrapupRequired = state === 'wrapUp' && !participants[agentId].isWrappedUp;
      this.setWrapupRequired(wrapupRequired);

      return;
    }
  };

  handleTaskReject = (taskId: string, reason: string) => {
    if (this.onTaskRejected) {
      this.onTaskRejected(reason || 'No reason provided');
    }
    this.handleTaskRemove(taskId);
  };

  cleanUpStore = () => {
    runInAction(() => {
      this.setIsAgentLoggedIn(false);
      this.setDeviceType('');
      this.setIncomingTask(null);
      this.setCurrentTask(null);
      this.setTaskList([]);
      this.setWrapupRequired(false);
      this.setLastStateChangeTimestamp(undefined);
      this.setLastIdleCodeChangeTimestamp(undefined);
      this.setShowMultipleLoginAlert(false);
    });
  };

  setupIncomingTaskHandler = (ccSDK: IContactCenter) => {
    let listenersAdded = false;

    const handleLogOut = () => {
      this.cleanUpStore();
      removeEventListeners();
      listenersAdded = false;
    };

    const addEventListeners = () => {
      ccSDK.on(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
      ccSDK.on(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.on(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.on(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.on(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
    };

    const removeEventListeners = () => {
      ccSDK.off(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
      ccSDK.off(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.off(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.off(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.off(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
    };

    // TODO: https://jira-eng-gpk2.cisco.com/jira/browse/SPARK-626777 Implement the de-register method and close the listener there

    const handleLogin = (payload) => {
      runInAction(() => {
        this.setIsAgentLoggedIn(true);
        this.setDeviceType(payload.deviceType);
        this.setCurrentState(payload.auxCodeId?.trim() !== '' ? payload.auxCodeId : '0');
        this.setLastStateChangeTimestamp(payload.lastStateChangeTimestamp);
        this.setLastIdleCodeChangeTimestamp(payload.lastIdleCodeChangeTimestamp);
      });
    };

    ccSDK.on(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);

    [CC_EVENTS.AGENT_DN_REGISTERED, CC_EVENTS.AGENT_RELOGIN_SUCCESS].forEach((event) => {
      ccSDK.on(`${event}`, () => {
        if (!listenersAdded) {
          addEventListeners();
          listenersAdded = true;
        }
      });
    });
  };
}

// Create and export a single instance of the wrapper
const storeWrapper = new StoreWrapper();
export default storeWrapper;
