import {IStoreWrapper, IStore, InitParams, TASK_EVENTS} from './store.types';
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

  setSelectedLoginOption(option: string): void {
    return this.store.setSelectedLoginOption(option);
  }

  init(options: InitParams): Promise<void> {
    return this.store.init(options).then(() => {
      this.setupIncomingTaskHandler();
    });
  }

  handleTaskRemove = (taskId: string) => {
    const taskToRemove = this.store.taskList.find((task) => task.data.interactionId === taskId);
    if (taskToRemove) {
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned(taskId));
      taskToRemove.off(TASK_EVENTS.TASK_END, ({wrapupRequired}: {wrapupRequired: boolean}) =>
        this.handleTaskEnd(taskId, wrapupRequired)
      );
    }
    const updateTaskList = this.store.taskList.filter((task) => task.data.interactionId !== taskId);
    runInAction(() => {
      this.store.setTaskList(updateTaskList);
      this.store.setCurrentTask(null);
      this.store.setWrapupRequired(false);
    });
  };

  handleTaskEnd = (taskId: string, wrapupRequired: boolean) => {
    // Task has been ended based on wrapupRequired we either set wrapupRequired or remove the task
    if (wrapupRequired) {
      this.store.setWrapupRequired(wrapupRequired);
    } else {
      this.handleTaskRemove(taskId);
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
    task.on(TASK_EVENTS.TASK_END, ({wrapupRequired}: {wrapupRequired: boolean}) =>
      this.handleTaskEnd(task.data.interactionId, wrapupRequired)
    );
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned(task));
    this.store.setTaskList([...this.store.taskList, task]);
  };

  setupIncomingTaskHandler() {
    const ccSDK = this.store.cc;

    ccSDK.on(TASK_EVENTS.TASK_INCOMING, (task) => {
      this.handleIncomingTask(task);
    });
  }
}

// Create and export a single instance of the wrapper
const storeWrapper = new StoreWrapper();
export default storeWrapper;
