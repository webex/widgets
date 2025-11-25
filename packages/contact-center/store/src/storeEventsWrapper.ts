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
  BuddyDetails,
  ENGAGED_LABEL,
  ENGAGED_USERNAME,
  ContactServiceQueue,
  ContactServiceQueueSearchParams,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  Profile,
  AgentLoginProfile,
  ERROR_TRIGGERING_IDLE_CODES,
} from './store.types';
import Store from './store';
import {
  DEVICE_TYPE_BROWSER,
  MEDIA_TYPE_TELEPHONY_LOWER,
  MEDIA_TYPE_TELEPHONY_UPPER,
  AGENT_STATE_AVAILABLE,
} from './store.types';
import {runInAction} from 'mobx';
import {isIncomingTask} from './task-utils';

class StoreWrapper implements IStoreWrapper {
  store: IStore;
  onIncomingTask: ({task}: {task: ITask}) => void;
  onTaskRejected?: (task: ITask, reason: string) => void;
  onOutdialFailed?: (reason: string) => void;
  onTaskAssigned?: (task: ITask) => void;
  onTaskSelected?: (task: ITask, isClicked: boolean) => void;
  onErrorCallback?: (widgetName: string, error: Error) => void;

  constructor() {
    this.store = Store.getInstance();
  }

  // Proxy all methods and properties of the original store
  get featureFlags() {
    return this.store.featureFlags;
  }

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
      return Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(code.name) || !code.isSystem;
    });
  }
  get agentId() {
    return this.store.agentId;
  }

  get deviceType() {
    return this.store.deviceType;
  }

  get teamId() {
    return this.store.teamId;
  }

  get dialNumber() {
    return this.store.dialNumber;
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

  get consultStartTimeStamp() {
    return this.store.consultStartTimeStamp;
  }

  get callControlAudio() {
    return this.store.callControlAudio;
  }

  get isQueueConsultInProgress() {
    return this.store.isQueueConsultInProgress;
  }

  get currentConsultQueueId() {
    return this.store.currentConsultQueueId;
  }

  get isEndConsultEnabled() {
    return this.store.isEndConsultEnabled;
  }

  get allowConsultToQueue() {
    return this.store.allowConsultToQueue;
  }

  get agentProfile() {
    return this.store.agentProfile;
  }

  get isMuted() {
    return this.store.isMuted;
  }

  get isAddressBookEnabled() {
    return this.store.isAddressBookEnabled;
  }

  setIsMuted = (value: boolean): void => {
    runInAction(() => {
      this.store.isMuted = value;
    });
  };

  setCurrentTheme = (theme: string): void => {
    this.store.currentTheme = theme;
  };

  setShowMultipleLoginAlert = (value: boolean): void => {
    this.store.showMultipleLoginAlert = value;
  };

  setDeviceType = (option: string): void => {
    this.store.deviceType = option;
  };

  setTeamId = (id: string): void => {
    this.store.teamId = id;
  };

  setDialNumber = (input: string): void => {
    this.store.dialNumber = input;
  };

  setCurrentState = (state: string): void => {
    runInAction(() => {
      this.store.currentState = state;
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

  setCurrentTask = (task: ITask | null, isClicked: boolean = false): void => {
    // Don't assign the task as current task is incoming
    if (isIncomingTask(task, this.agentId)) return;

    runInAction(() => {
      // Determine if the new task is the same as the current task
      let isSameTask = false;
      if (task && this.currentTask) {
        isSameTask = task.data.interactionId === this.currentTask.data.interactionId;
      }

      // Update the current task
      this.store.currentTask = task ? Object.assign(Object.create(Object.getPrototypeOf(task)), task) : null;

      if (this.onTaskSelected && !isSameTask && typeof isClicked !== 'undefined') {
        this.onTaskSelected(task, isClicked);
      }
    });
  };

  setOnError = (callback: (widgetName: string, error: Error) => void) => {
    this.onErrorCallback = (widgetName: string, error: Error) => {
      // @ts-expect-error - test error boundary
      this.store.cc.webex.internal.newMetrics.submitBehavioralEvent({
        product: 'wxcc-widgets',
        agent: 'browser',
        target: 'browser',
        verb: 'error',
        payload: {
          widgets: widgetName,
          name: error.name,
          message: error.message,
        },
      });
      callback(widgetName, error);
    };
  };

  refreshTaskList = (): void => {
    runInAction(() => {
      this.store.taskList = this.store.cc.taskManager.getAllTasks();
      const taskListKeys = Object.keys(this.store.taskList);

      if (taskListKeys.length === 0) {
        if (this.currentTask) {
          this.handleTaskRemove(this.currentTask);
        }
        this.setCurrentTask(null);
        this.setState({reset: true});
      } else if (this.currentTask && this.store.taskList[this.currentTask.data.interactionId]) {
        this.setCurrentTask(this.store.taskList[this.currentTask?.data?.interactionId]);
      } else if (taskListKeys.length > 0) {
        if (this.currentTask) {
          this.handleTaskRemove(this.currentTask);
        }
        this.setCurrentTask(this.store.taskList[taskListKeys[0]]);
      }
    });
  };

  setWrapupCodes = (wrapupCodes: IWrapupCode[]): void => {
    this.store.wrapupCodes = wrapupCodes;
  };

  setConsultStartTimeStamp = (timestamp: number): void => {
    this.store.consultStartTimeStamp = timestamp;
  };

  setCallControlAudio = (audio: MediaStream | null): void => {
    this.store.callControlAudio = audio;
  };

  setIsQueueConsultInProgress = (value: boolean): void => {
    runInAction(() => {
      this.store.isQueueConsultInProgress = value;
    });
  };

  setCurrentConsultQueueId = (queueId: string | null): void => {
    runInAction(() => {
      this.store.currentConsultQueueId = queueId;
    });
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
      });
    } else {
      runInAction(() => {
        this.store.customState = state;
      });
    }
  };

  setIncomingTaskCb = (callback: ({task}: {task: ITask}) => void): void => {
    this.onIncomingTask = callback;
  };

  setTaskRejected = (callback: ((task: ITask, reason: string) => void) | undefined): void => {
    this.onTaskRejected = callback;
  };

  setOutdialFailed = (callback: ((reason: string) => void) | undefined): void => {
    this.onOutdialFailed = callback;
  };

  setTaskAssigned = (callback: ((task: ITask) => void) | undefined): void => {
    this.onTaskAssigned = callback;
  };

  setTaskSelected = (callback: ((task: ITask, isClicked?: boolean) => void) | undefined): void => {
    if (callback && this.currentTask) {
      callback(this.currentTask);
    }
    this.onTaskSelected = callback;
  };

  setCCCallback = (event: CC_EVENTS | TASK_EVENTS, callback) => {
    if (!callback) return;
    this.store.logger.info(`CC-Widgets: setCCCallback(): registering CC event '${event}'`, {
      module: 'storeEventsWrapper.ts',
      method: 'setCCCallback',
    });
    this.store.cc.on(event, callback);
  };

  setTaskCallback = (event: TASK_EVENTS, callback, taskId: string) => {
    if (!callback) return;
    const task = this.store.taskList[taskId];
    if (!task) return;
    task.on(event, callback);
  };

  setAgentProfile = (profile: AgentLoginProfile) => {
    runInAction(() => {
      this.store.agentProfile = {
        ...this.store.agentProfile,
        profileType: profile.profileType || undefined,
        mmProfile: profile.mmProfile || undefined,
        orgId: profile.orgId || undefined,
        roles: profile.roles || undefined,
        deviceType: profile.deviceType || undefined,
      };
    });
  };

  removeCCCallback = (event: CC_EVENTS) => {
    this.store.logger.info(`CC-Widgets: removeCCCallback(): removing CC event '${event}'`, {
      module: 'storeEventsWrapper.ts',
      method: 'removeCCCallback',
    });
    this.store.cc.off(event);
  };

  removeTaskCallback = (event: TASK_EVENTS, callback, taskId: string) => {
    if (!callback) return;
    const task = this.store.taskList[taskId];
    if (!task) return;
    task.off(event, callback);
  };

  init(options: InitParams): Promise<void> {
    return this.store.init(options, this.setupIncomingTaskHandler);
  }

  registerCC = (webex?: WithWebex['webex']) => {
    return this.store.registerCC(webex);
  };

  handleTaskRemove = (taskToRemove: ITask) => {
    if (taskToRemove) {
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
      taskToRemove.off(TASK_EVENTS.TASK_END, this.handleTaskEnd);
      taskToRemove.off(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(taskToRemove, reason));
      taskToRemove.off(TASK_EVENTS.TASK_OUTDIAL_FAILED, (reason) => this.handleOutdialFailed(reason));
      taskToRemove.off(TASK_EVENTS.AGENT_WRAPPEDUP, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
      taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_END, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
      taskToRemove.off(TASK_EVENTS.AGENT_CONSULT_CREATED, this.handleConsultCreated);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
      taskToRemove.off(TASK_EVENTS.AGENT_OFFER_CONTACT, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_ENDED, this.handleConferenceEnded);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_JOINED, this.handleConferenceStarted);
      taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_LEFT, this.handleConferenceEnded);
      taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.handleConferenceEnded);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);
      if (this.deviceType === DEVICE_TYPE_BROWSER) {
        taskToRemove.off(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
        this.setCallControlAudio(null);
      }
    }

    runInAction(() => {
      if (taskToRemove && this.store.currentTask?.data.interactionId === taskToRemove.data.interactionId) {
        this.setCurrentTask(null);
      }

      this.setState({
        reset: true,
      });
      this.refreshTaskList();
    });
  };

  handleTaskMuteState = (task: ITask): void => {
    const isBrowser = this.deviceType === DEVICE_TYPE_BROWSER;
    const webRtcEnabled = this.featureFlags?.webRtcEnabled;
    const isTelephony = task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER;

    if (isBrowser && isTelephony && webRtcEnabled) {
      this.setIsMuted(false);
    }
  };

  handleTaskEnd = () => {
    this.refreshTaskList();
  };

  handleTaskAssigned = (event) => {
    const task = event;
    if (this.onTaskAssigned) {
      this.onTaskAssigned(task);
    }
    runInAction(() => {
      this.setCurrentTask(task);
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
    });
  };

  handleTaskMedia = (track) => {
    this.setCallControlAudio(new MediaStream([track]));
  };

  // Case to handle multi session
  handleConsultCreated = () => {
    this.refreshTaskList();
    this.setConsultStartTimeStamp(Date.now());
  };

  handleConsulting = () => {
    this.refreshTaskList();
    this.setConsultStartTimeStamp(Date.now());
  };

  handleConsultEnd = () => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.refreshTaskList();
    this.setConsultStartTimeStamp(null);
  };

  handleConsultOffer = () => {
    this.refreshTaskList();
  };

  handleConsultAccepted = (event) => {
    const task = event;
    runInAction(() => {
      this.refreshTaskList();
      this.setConsultStartTimeStamp(Date.now());
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
      if (this.deviceType === DEVICE_TYPE_BROWSER) {
        task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
      }
    });
  };

  handleConsultQueueCancelled = () => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.setConsultStartTimeStamp(null);
    this.refreshTaskList();
  };

  handleConferenceStarted = () => {
    runInAction(() => {
      this.setIsQueueConsultInProgress(false);
      this.setCurrentConsultQueueId(null);
      this.setConsultStartTimeStamp(null);
    });
    this.refreshTaskList();
  };

  handleConferenceEnded = () => {
    this.refreshTaskList();
  };

  /**
   * Register all task event listeners
   * @param task - The task to register event listeners for
   */
  private registerTaskEventListeners = (task: ITask): void => {
    // Attach event listeners to the task
    task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);

    // When we receive TASK_ASSIGNED the task was accepted by the agent and we need wrap up
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
    task.on(TASK_EVENTS.AGENT_OFFER_CONTACT, this.refreshTaskList);
    task.on(TASK_EVENTS.AGENT_CONSULT_CREATED, this.handleConsultCreated);
    task.on(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);

    // When we receive TASK_REJECT sdk changes the agent status
    // When we receive TASK_REJECT that means the task was not accepted by the agent and we wont need wrap up
    task.on(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(task, reason));

    // When we receive TASK_OUTDIAL_FAILED the outdial call failed
    task.on(TASK_EVENTS.TASK_OUTDIAL_FAILED, (reason) => this.handleOutdialFailed(reason));

    task.on(TASK_EVENTS.AGENT_WRAPPEDUP, this.refreshTaskList);

    task.on(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
    task.on(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
    task.on(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);
    task.on(TASK_EVENTS.TASK_CONSULT_END, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_ENDED, this.handleConferenceEnded);
    task.on(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_JOINED, this.handleConferenceStarted);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT, this.handleConferenceEnded);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
    task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);

    // Register media event listener for browser devices
    if (this.deviceType === DEVICE_TYPE_BROWSER) {
      task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
    }
  };

  handleIncomingTask = (event) => {
    const task: ITask = event;

    // Register all task event listeners
    this.registerTaskEventListeners(task);

    // In case of consulting we check if the task is already in the task list
    // If it is, we dont have to send the incoming task callback
    if (this.onIncomingTask && !this.taskList[task.data.interactionId]) {
      this.onIncomingTask({task});
      this.handleTaskMuteState(task);
    }

    // We should update the task list in the store after sending the incoming task callback
    this.refreshTaskList();
  };

  handleStateChange = (data) => {
    this.store.logger.info('CC-Widgets: handleStateChange(): agent state changed', {
      module: 'storeEventsWrapper.ts',
      method: 'handleStateChange',
    });
    if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
      const DEFAULT_CODE = '0'; // Default code when no aux code is present
      this.setCurrentState(data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE);

      this.setLastStateChangeTimestamp(data.lastStateChangeTimestamp);
      this.setLastIdleCodeChangeTimestamp(data.lastIdleCodeChangeTimestamp);
    }
  };

  handleMultiLoginCloseSession = (data) => {
    this.store.logger.info('CC-Widgets: handleMultiLoginCloseSession(): multi-login alert', {
      module: 'storeEventsWrapper.ts',
      method: 'handleMultiLoginCloseSession',
    });
    if (data && typeof data === 'object' && data.type === 'AgentMultiLoginCloseSession') {
      this.setShowMultipleLoginAlert(true);
    }
  };

  handleTaskMerged = (event) => {
    const task = event;
    this.registerTaskEventListeners(task);
    this.refreshTaskList();
  };

  handleTaskHydrate = (event) => {
    const task = event;

    // Register all task event listeners
    this.registerTaskEventListeners(task);

    this.refreshTaskList();

    this.setCurrentTask(task);
    if (task.data.interaction.state === 'consulting') {
      if (task.data.isConsulted) {
        // this.setConsultAccepted(true);
      }
      this.setConsultStartTimeStamp(Date.now());
    }

    if (
      (['wrapUp', 'connected'].includes(task.data.interaction.state) && !task.data.isConsulted) ||
      task.data.wrapUpRequired
    ) {
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
    }

    const {interaction} = task.data;
    const {isTerminated} = interaction;

    // Update call control states
    if (isTerminated) {
      if (!task.data.wrapUpRequired) {
        this.setState({reset: true});
      }

      return;
    }
  };

  handleTaskReject = (task: ITask, reason: string) => {
    if (this.onTaskRejected) {
      this.onTaskRejected(task, reason || 'No reason provided');
    }
    this.refreshTaskList();
  };

  handleOutdialFailed = (reason: string) => {
    if (this.onOutdialFailed) {
      this.onOutdialFailed(reason || 'No reason provided');
    }
  };

  getBuddyAgents = async (
    mediaType: string = this.currentTask.data.interaction.mediaType
  ): Promise<Array<BuddyDetails>> => {
    try {
      const response = await this.store.cc.getBuddyAgents({
        //@ts-expect-error  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        mediaType: mediaType ?? MEDIA_TYPE_TELEPHONY_LOWER,
        state: AGENT_STATE_AVAILABLE,
      });
      return 'data' in response ? response.data.agentList : [];
    } catch (error) {
      this.store.logger.error('Error fetching buddy agents:', error);
      throw error;
    }
  };

  getQueues = async (
    mediaType: string = this.currentTask.data.interaction.mediaType ?? MEDIA_TYPE_TELEPHONY_UPPER,
    params?: ContactServiceQueueSearchParams
  ): Promise<{
    data: ContactServiceQueue[];
    meta: {page: number; pageSize: number; total: number; totalPages: number};
  }> => {
    try {
      const upperMediaType = mediaType.toUpperCase();
      const response = await this.store.cc.getQueues(params);
      const data = Array.isArray(response) ? response : response.data;
      const filtered = data.filter((queue) => queue.channelType === upperMediaType);
      const page = Array.isArray(response) ? 0 : (response.meta?.page ?? 0);
      const totalPages = Array.isArray(response) ? 1 : (response.meta?.totalPages ?? 1);
      const pageSize = Array.isArray(response) ? filtered.length : (response.meta?.pageSize ?? filtered.length);
      const total = Array.isArray(response)
        ? filtered.length
        : ((response as {meta?: {total?: number}}).meta?.total ?? filtered.length);
      return {data: filtered, meta: {page, pageSize, total, totalPages}};
    } catch (error) {
      this.store.logger.error('Error fetching queues:', error);
      throw error;
    }
  };

  getEntryPoints = async (params?: EntryPointSearchParams): Promise<EntryPointListResponse> => {
    try {
      const response: EntryPointListResponse = await this.store.cc.getEntryPoints(params);
      return response;
    } catch (error) {
      this.store.logger.error('Error fetching entry points:', error);
      throw error;
    }
  };

  getAddressBookEntries = async (params?: AddressBookEntrySearchParams): Promise<AddressBookEntriesResponse> => {
    try {
      if (!this.store.isAddressBookEnabled) {
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
      const response: AddressBookEntriesResponse = await this.store.cc.addressBook.getEntries(params ?? {});
      return response;
    } catch (error) {
      this.store.logger.error('Error fetching address book entries:', error);
      throw error;
    }
  };

  cleanUpStore = () => {
    this.store.logger.info('CC-Widgets: cleanUpStore(): resetting store on logout', {
      module: 'storeEventsWrapper.ts',
      method: 'cleanUpStore',
    });
    runInAction(() => {
      this.setIsAgentLoggedIn(false);
      this.setDeviceType('AGENT_DN');
      this.setDialNumber('');
      this.setCurrentTask(null);
      this.refreshTaskList();
      this.setLastStateChangeTimestamp(undefined);
      this.setLastIdleCodeChangeTimestamp(undefined);
      this.setShowMultipleLoginAlert(false);
      this.setConsultStartTimeStamp(undefined);
      this.setTeamId('');
    });
  };

  setupIncomingTaskHandler = (ccSDK: IContactCenter) => {
    let listenersAdded = false;

    const handleLogOut = () => {
      this.store.logger.log('CC-Widgets: setupIncomingTaskHandler(): logging out agent', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#handleLogOut',
      });
      this.setAgentProfile({});
      this.cleanUpStore();
      removeEventListeners();
      listenersAdded = false;
    };

    const addEventListeners = () => {
      this.store.logger.info('CC-Widgets: setupIncomingTaskHandler(): adding CC SDK listeners', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#addEventListeners',
      });
      ccSDK.on(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
      ccSDK.on(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.on(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.on(TASK_EVENTS.TASK_MERGED, this.handleTaskMerged);
      ccSDK.on(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.on(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
    };

    const removeEventListeners = () => {
      this.store.logger.info('CC-Widgets: setupIncomingTaskHandler(): removing CC SDK listeners', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#removeEventListeners',
      });
      ccSDK.off(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
      ccSDK.off(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.off(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.off(TASK_EVENTS.TASK_MERGED, this.handleTaskMerged);
      ccSDK.off(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.off(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
    };

    // TODO: https://jira-eng-gpk2.cisco.com/jira/browse/SPARK-626777 Implement the de-register method and close the listener there

    const handleLogin = (payload: Profile) => {
      this.store.logger.log('CC-Widgets: logging in the agent', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#handleLogin',
      });
      runInAction(() => {
        this.setAgentProfile(payload);
        this.setIsAgentLoggedIn(true);
        this.setDeviceType(payload.deviceType);
        this.setDialNumber(payload.dn);
        // @ts-expect-error To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        this.setCurrentState(payload.auxCodeId?.trim() !== '' ? payload.auxCodeId : '0');
        this.setLastStateChangeTimestamp(payload.lastStateChangeTimestamp);
        this.setLastIdleCodeChangeTimestamp(payload.lastIdleCodeChangeTimestamp);
        // @ts-expect-error To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        this.setTeamId(payload.teamId);
      });
    };

    ccSDK.on(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);

    [CC_EVENTS.AGENT_DN_REGISTERED, CC_EVENTS.AGENT_RELOGIN_SUCCESS].forEach((event) => {
      ccSDK.on(`${event}`, (payload) => {
        this.store.logger.info(`CC-Widgets: setupIncomingTaskHandler(): event '${event}' received`, {
          module: 'storeEventsWrapper.ts',
          method: 'setupIncomingTaskHandler',
        });
        runInAction(() => {
          if (event === CC_EVENTS.AGENT_RELOGIN_SUCCESS) {
            this.setAgentProfile(payload);
            this.setTeamId(payload.teamId);
          }
        });
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
