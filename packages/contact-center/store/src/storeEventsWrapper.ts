// storeWrapper.ts

import {IStoreWrapper, IStore, InitParams, TASK_EVENTS} from './store.types';
import {ITask} from '@webex/plugin-cc';
import Store from './store'; // Import your original store

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

  get selectedLoginOption() {
    return this.store.selectedLoginOption;
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
  get deviceType() {
    return this.store.deviceType;
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

  setCurrentTask(task: any): void {
    return this.store.setCurrentTask(task);
  }

  setSelectedLoginOption(option: string): void {
    return this.store.setSelectedLoginOption(option);
  }

  init(options: InitParams): Promise<void> {
    console.log('Shreyas: Initializing store with options', options);
    return this.store.init(options).then(() => {
      console.log('Shreyas: Store initialized, setting up incoming task handler');
      this.setupIncomingTaskHandler();
    });
  }

  handleTaskRemoved = (taskId: string, wrapupRequired: boolean) => {
    console.log('Shreyas: Handling task removal for taskId', taskId);
    const taskToRemove = this.store.taskList.find((task) => task.data.interactionId === taskId);
    this.store.wrapupRequired = wrapupRequired;

    if (taskToRemove) {
      console.log('Shreyas: Task found, cleaning up listeners for taskId', taskId);
      // Clean up listeners on the task
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned(taskId));
      taskToRemove.off(TASK_EVENTS.TASK_END, ({wrapupRequired}: {wrapupRequired: boolean}) =>
        this.handleTaskRemoved(taskId, wrapupRequired)
      );
    }

    this.store.taskList = this.store.taskList.filter((task) => task.data.interactionId !== taskId);
    console.log('Shreyas: Task removed, updated task list', this.store.taskList);
  };

  handleTaskAssigned = (task: ITask) => () => {
    this.store.incomingTask = null;
    this.setCurrentTask(task);
  };

  handleIncomingTask = (task: ITask) => {
    console.log('Shreyas: Handling incoming task', task);
    this.store.incomingTask = task;
    console.log('Shreyas: setted incomingTask in store');
    if (this.store.taskList.some((t) => t.data.interactionId === task.data.interactionId)) {
      console.log('Shreyas: Task already present in the taskList', task.data.interactionId);
      // Task already present in the taskList
      return;
    }

    // Attach event listeners to the task
    console.log('Shreyas: Attaching event listeners to the task', task.data.interactionId);
    task.on(TASK_EVENTS.TASK_END, ({wrapupRequired}: {wrapupRequired: boolean}) =>
      this.handleTaskRemoved(task.data.interactionId, wrapupRequired)
    );
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned(task));

    this.store.taskList = [...this.store.taskList, task];
    console.log('Shreyas: Task added to task list', this.store.taskList);
  };

  setupIncomingTaskHandler() {
    console.log('Shreyas: Setting up incoming task handler');
    const ccSDK = this.store.cc;

    ccSDK.on(TASK_EVENTS.TASK_INCOMING, (task) => {
      console.log('Shreyas: Incoming task event received', task);
      this.handleIncomingTask(task);
    });
  }
}

// Create and export a single instance of the wrapper
const storeWrapper = new StoreWrapper();
export default storeWrapper;
