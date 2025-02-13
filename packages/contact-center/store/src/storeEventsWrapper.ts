import {IStoreWrapper, IStore, InitParams, TASK_EVENTS, CC_EVENTS} from './store.types';
import {ITask} from '@webex/plugin-cc';
import Store from './store';
import {runInAction} from 'mobx';

class StoreWrapper implements IStoreWrapper {
  private store: IStore;

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
    return this.store.idleCodes;
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

  get customStatus() {
    return this.store.customStatus;
  }

  get lastStateChangeTimestamp() {
    return this.store.lastStateChangeTimestamp;
  }

  get showMultipleLoginAlert() {
    return this.store.showMultipleLoginAlert;
  }

  get currentTheme() {
    return this.store.currentTheme;
  }

  setCurrentTheme(theme: string): void {
    return this.store.setCurrentTheme(theme);
  }

  setShowMultipleLoginAlert(value: boolean): void {
    return this.store.setShowMultipleLoginAlert(value);
  }

  setDeviceType(option: string): void {
    return this.store.setDeviceType(option);
  }

  setCurrentState(state: string): void {
    return this.store.setCurrentState(state);
  }

  setLastStateChangeTimestamp(timestamp: Date): void {
    return this.store.setLastStateChangeTimestamp(timestamp);
  }

  setIsAgentLoggedIn(value: boolean): void {
    return this.store.setIsAgentLoggedIn(value);
  }

  setCustomStatus(status: 'RONA' | 'WRAPUP' | 'ENGAGED' | ''): void {
    return this.store.setCustomStatus(status);
  }

  init(options: InitParams): Promise<void> {
    return this.store.init(options).then(() => {
      this.setupIncomingTaskHandler();
    });
  }

  handleTaskRemove = (taskId: string) => {
    // Remove the task from the taskList
    const taskToRemove = this.store.taskList.find((task) => task.data.interactionId === taskId);
    if (taskToRemove) {
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned(taskId));
      taskToRemove.off(TASK_EVENTS.TASK_END, ({wrapupRequired}: {wrapupRequired: boolean}) =>
        this.handleTaskEnd(taskToRemove, wrapupRequired)
      );
      taskToRemove.off(TASK_EVENTS.TASK_REJECT, () => this.handleTaskRemove(taskId));
    }
    const updateTaskList = this.store.taskList.filter((task) => task.data.interactionId !== taskId);

    runInAction(() => {
      this.store.setTaskList(updateTaskList);
      this.store.setWrapupRequired(false);
      this.store.setCustomStatus('');

      // Remove the task from currentTask or incomingTask if it is the same task
      if (this.store.currentTask?.data.interactionId === taskId) {
        this.store.setCurrentTask(null);
      }

      if (this.store.incomingTask?.data.interactionId === taskId) {
        this.store.setIncomingTask(null);
      }
    });
  };

  handleTaskEnd = (task: ITask, wrapupRequired: boolean) => {
    // TODO: SDK needs to send only 1 event on end : https://jira-eng-gpk2.cisco.com/jira/browse/SPARK-615785
    if (task.data.interaction.state === 'connected') {
      this.store.setCustomStatus('WRAPUP');
      this.store.setWrapupRequired(true);
      return;
    } else if (task.data.interaction.state !== 'connected' && this.store.wrapupRequired !== true) {
      this.handleTaskRemove(task.data.interactionId);
    }
  };

  handleTaskAssigned = (task: ITask) => () => {
    runInAction(() => {
      this.store.setCurrentTask(task);
      this.store.setIncomingTask(null);
    });
  };

  handleIncomingTask = (task: ITask) => {
    this.store.setIncomingTask(task);
    if (this.store.taskList.some((t) => t.data.interactionId === task.data.interactionId)) {
      // Task already present in the taskList
      return;
    }

    // Attach event listeners to the task
    task.on(TASK_EVENTS.TASK_END, ({wrapupRequired}: {wrapupRequired: boolean}) => {
      this.handleTaskEnd(task, wrapupRequired);
    });

    // When we receive TASK_ASSIGNED the task was accepted by the agent and we need wrap up
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned(task));

    // When we receive TASK_REJECT sdk changes the agent status
    // When we receive TASK_REJECT that means the task was not accepted by the agent and we wont need wrap up
    task.on(TASK_EVENTS.TASK_REJECT, () => this.handleTaskRemove(task.data.interactionId));

    this.store.setTaskList([...this.store.taskList, task]);
  };

  handleStateChange = (data) => {
    if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
      const DEFAULT_CODE = '0'; // Default code when no aux code is present
      this.store.setCurrentState(data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE);

      const startTime = data.lastStateChangeTimestamp;
      this.store.setLastStateChangeTimestamp(new Date(startTime));
    }
  };

  handleMultiLoginCloseSession = (data) => {
    if (data && typeof data === 'object' && data.type === 'AgentMultiLoginCloseSession') {
      this.store.setShowMultipleLoginAlert(true);
    }
  };

  handleTaskHydrate = (task: ITask) => {
    this.store.setCurrentTask(task);
    this.store.setTaskList([...this.store.taskList, task]);

    const {interaction, agentId} = task.data;
    const {state, isTerminated, participants} = interaction;

    // Update call control states
    if (isTerminated) {
      // wrapup
      const wrapupRequired = state === 'wrapUp' && !participants[agentId].isWrappedUp;
      this.store.setWrapupRequired(wrapupRequired);

      return;
    }
  };

  setupIncomingTaskHandler() {
    const ccSDK = this.store.cc;

    ccSDK.on(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);

    ccSDK.on(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
    ccSDK.on(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
    ccSDK.on(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);

    return () => {
      ccSDK.off(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.off(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.off(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.off(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
    };
  }
}

// Create and export a single instance of the wrapper
const storeWrapper = new StoreWrapper();
export default storeWrapper;
