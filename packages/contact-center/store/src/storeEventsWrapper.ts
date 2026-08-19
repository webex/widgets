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
  RESERVED_LABEL,
  RESERVED_USERNAME,
  ContactServiceQueuesResponse,
  ContactServiceQueueSearchParams,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  Profile,
  AgentLoginProfile,
  ERROR_TRIGGERING_IDLE_CODES,
  RealTimeTranscriptionEventPayload,
  RealTimeAssistPayload,
} from './store.types';
import Store from './store';
import {
  DEVICE_TYPE_BROWSER,
  MEDIA_TYPE_TELEPHONY_LOWER,
  CAMPAIGN_PREVIEW_OUTBOUND_TYPES,
  CAMPAIGN_PREVIEW_CAMPAIGN_TYPES,
} from './store.types';
import {runInAction} from 'mobx';
import {isIncomingTask} from './task-utils';
import {SUGGESTED_RESPONSE_EVENT, TASK_MULTI_LOGIN_HYDRATE} from './constants';

const CONSULT_TRANSFER_CHANNELS = {
  telephony: 'TELEPHONY',
  chat: 'CHAT',
  social: 'SOCIAL_CHANNEL',
  email: 'EMAIL',
} as const;

const getSupportedMediaType = (mediaType?: string): keyof typeof CONSULT_TRANSFER_CHANNELS | undefined => {
  const normalizedMediaType = typeof mediaType === 'string' ? mediaType.toLowerCase() : '';

  return normalizedMediaType in CONSULT_TRANSFER_CHANNELS
    ? (normalizedMediaType as keyof typeof CONSULT_TRANSFER_CHANNELS)
    : undefined;
};

const getTaskChannelFilter = (entityType: 'queue' | 'entryPoint', mediaType?: string): string | undefined => {
  const supportedMediaType = getSupportedMediaType(mediaType);
  const channelType = supportedMediaType ? CONSULT_TRANSFER_CHANNELS[supportedMediaType] : undefined;

  if (!channelType || channelType === 'TELEPHONY') return undefined;

  const typeField = entityType === 'queue' ? 'queueType' : 'entryPointType';

  return `${typeField}==INBOUND;channelType==${channelType};active==true`;
};

class StoreWrapper implements IStoreWrapper {
  store: IStore;
  onIncomingTask: ({task}: {task: ITask}) => void;
  onTaskRejected?: (task: ITask, reason: string) => void;
  onOutdialFailed?: (reason: string) => void;
  onTaskAssigned?: (task: ITask) => void;
  onTaskSelected?: (task: ITask, isClicked: boolean) => void;
  onErrorCallback?: (widgetName: string, error: Error) => void;
  private realtimeTranscriptionListeners: Record<string, (payload: RealTimeTranscriptionEventPayload) => void> = {};
  // Keyed by interactionId; the task is tracked alongside the listener so a
  // replacement task object (task:hydrate / task:merged) gets rebound.
  private realTimeAssistListeners: Record<string, {task: ITask; listener: (payload: RealTimeAssistPayload) => void}> =
    {};

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

  get isDeclineButtonEnabled() {
    return this.store.isDeclineButtonEnabled;
  }

  get isDigitalChannelsInitialized() {
    return this.store.isDigitalChannelsInitialized;
  }

  get dataCenter() {
    return this.store.dataCenter;
  }

  get realtimeTranscriptionData() {
    return this.store.realtimeTranscriptionData;
  }

  get acceptedCampaignIds() {
    return this.store.acceptedCampaignIds;
  }

  get realTimeAssist() {
    return this.store.realTimeAssist;
  }

  setDataCenter = (value: string): void => {
    this.store.dataCenter = value;
  };

  get currentConsultQueueId() {
    return this.store.currentConsultQueueId;
  }

  get lastConsultDestination() {
    return this.store.lastConsultDestination;
  }

  get isEndConsultEnabled() {
    return this.store.isEndConsultEnabled;
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

  setDigitalChannelsInitialized = (value: boolean): void => {
    runInAction(() => {
      this.store.isDigitalChannelsInitialized = value;
    });
  };

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

    // Don't promote a pending campaign preview as the current task.
    // The agent has joined the telephony reservation but hasn't accepted the
    // campaign preview yet (Accept/Skip/Remove buttons still showing).
    // CallControl should only render after the preview is explicitly accepted.
    // Allow accepted previews through even if the SDK hasn't transitioned the
    // state from 'new' yet — acceptedCampaignIds is the source of truth.
    // Clear currentTask so stale call-control state doesn't linger, but skip
    // the onTaskSelected callback to preserve its ITask contract.
    const isPendingPreview =
      task && this.isCampaignPreview(task) && !this.store.acceptedCampaignIds.has(task.data.interactionId);

    if (isPendingPreview) {
      runInAction(() => {
        this.store.currentTask = null;
      });

      return;
    }

    runInAction(() => {
      // Determine if the new task is the same as the current task.
      let isSameTask = false;
      if (task && this.currentTask) {
        isSameTask = this.getTaskInteractionId(task) === this.getTaskInteractionId(this.currentTask);
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
        // Ensure agent state is set to Available (auxCodeId '0') when no tasks remain
        // The backend should send AGENT_STATE_CHANGE, but in test environments it may not
        this.setCurrentState('0');
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

  setIsDeclineButtonEnabled = (value: boolean): void => {
    runInAction(() => {
      this.store.isDeclineButtonEnabled = value;
    });
  };

  setCurrentConsultQueueId = (queueId: string | null): void => {
    runInAction(() => {
      this.store.currentConsultQueueId = queueId;
    });
  };

  setLastConsultDestination = (destination: {to: string; destinationType: string} | null): void => {
    runInAction(() => {
      this.store.lastConsultDestination = destination;
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
        agentProfileID: profile.agentProfileID || undefined,
        isTimeoutDesktopInactivityEnabled: profile.isTimeoutDesktopInactivityEnabled || undefined,
        timeoutDesktopInactivityMins: profile.timeoutDesktopInactivityMins || undefined,
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
    return this.store.init(options, this.setupIncomingTaskHandler).catch((error) => {
      const err = error instanceof Error ? error : new Error(`Store initialization failed: ${String(error)}`);

      if (this.onErrorCallback) {
        this.onErrorCallback('Store', err);
      }

      throw err;
    });
  }

  registerCC = (webex?: WithWebex['webex']) => {
    return this.store.registerCC(webex);
  };

  handleTaskRemove = (taskToRemove: ITask) => {
    if (taskToRemove) {
      const taskId = taskToRemove.data?.interactionId;
      // Clean up accepted/dismissed campaign tracking now that the task is
      // fully removed (after wrapup).  This is safe because the task will
      // no longer render in any component.
      if (taskId && this.store.acceptedCampaignIds.has(taskId)) {
        this.removeAcceptedCampaign(taskId);
      }
      if (taskId && this.realtimeTranscriptionListeners[taskId]) {
        taskToRemove.off(CC_EVENTS.REAL_TIME_TRANSCRIPTION, this.realtimeTranscriptionListeners[taskId]);
        delete this.realtimeTranscriptionListeners[taskId];
      }
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
      taskToRemove.off(TASK_EVENTS.TASK_END, this.handleTaskEnd);
      taskToRemove.off(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(taskToRemove, reason));
      taskToRemove.off(TASK_EVENTS.TASK_OUTDIAL_FAILED, (reason) => this.handleOutdialFailed(reason));
      taskToRemove.off(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, this.handleUIControlsUpdated);
      taskToRemove.off(TASK_EVENTS.TASK_WRAPPEDUP, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);
      taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONTACT, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);
      taskToRemove.off(TASK_EVENTS.TASK_RECORDING_PAUSED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_RECORDING_RESUMED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
      taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);
      taskToRemove.off(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
      taskToRemove.off(TASK_EVENTS.TASK_SWITCH_CALL, this.handleSwitchCall);
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
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleCampaignPreviewReservation);
      taskToRemove.off(TASK_EVENTS.TASK_CAMPAIGN_CONTACT_UPDATED, this.refreshTaskList);
      if (this.deviceType === DEVICE_TYPE_BROWSER) {
        taskToRemove.off(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
        this.setCallControlAudio(null);
      }

      if (taskId && this.realTimeAssistListeners[taskId]) {
        const {task: listenerTask, listener} = this.realTimeAssistListeners[taskId];
        (listenerTask ?? taskToRemove).off(SUGGESTED_RESPONSE_EVENT, listener);
        delete this.realTimeAssistListeners[taskId];
      }
      if (taskId && this.store.realTimeAssist && this.store.realTimeAssist[taskId]) {
        runInAction(() => {
          const next = {...this.store.realTimeAssist};
          delete next[taskId];
          this.store.realTimeAssist = next;
        });
      }
    }

    runInAction(() => {
      if (taskToRemove) {
        const removedTaskId = taskToRemove.data?.interactionId;
        if (removedTaskId && this.store.currentTask?.data?.interactionId === removedTaskId) {
          this.store.realtimeTranscriptionData = [];
        }
      }
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

  /**
   * Checks if a task is a campaign preview interaction.
   * Matches agent desktop logic that checks both outboundType and campaignType.
   */
  private isCampaignPreview = (task: ITask): boolean => {
    const outboundType = task.data.interaction.outboundType ?? '';
    const cpd = task.data.interaction.callProcessingDetails as unknown as
      | Record<string, string | undefined>
      | undefined;
    const campaignType = cpd?.campaignType ?? '';

    return (
      CAMPAIGN_PREVIEW_OUTBOUND_TYPES.includes(outboundType) || CAMPAIGN_PREVIEW_CAMPAIGN_TYPES.includes(campaignType)
    );
  };

  /**
   * Handles the campaign preview reservation event (agent accepted the preview).
   * Transitions state from RESERVED to ENGAGED, matching agent desktop behavior.
   */
  addAcceptedCampaign = (interactionId: string): void => {
    runInAction(() => {
      this.store.acceptedCampaignIds = new Set(this.store.acceptedCampaignIds).add(interactionId);
    });
  };

  removeAcceptedCampaign = (interactionId: string): void => {
    runInAction(() => {
      const next = new Set(this.store.acceptedCampaignIds);
      next.delete(interactionId);
      this.store.acceptedCampaignIds = next;
    });
  };

  handleCampaignPreviewReservation = (event: ITask) => {
    const isCampaignPreview = this.isCampaignPreview(event);

    runInAction(() => {
      if (isCampaignPreview) {
        this.setState({
          developerName: RESERVED_LABEL,
          name: RESERVED_USERNAME,
        });
      } else {
        this.setState({
          developerName: ENGAGED_LABEL,
          name: ENGAGED_USERNAME,
        });
      }
    });
    this.refreshTaskList();
  };

  handleTaskEnd = () => {
    this.setIsDeclineButtonEnabled(false);

    this.refreshTaskList();
  };

  handleTaskAssigned = (event) => {
    const task = event;
    if (this.onTaskAssigned) {
      this.onTaskAssigned(task);
    }
    runInAction(() => {
      // For accepted campaign previews (state !== 'new'), record acceptance
      // before promoting to currentTask so setCurrentTask allows it through.
      if (this.isCampaignPreview(task) && task.data.interaction.state !== 'new') {
        this.addAcceptedCampaign(task.data.interactionId);
      }

      this.setCurrentTask(task);

      // Pending (state 'new') campaign previews keep agent in RESERVED
      if (this.isCampaignPreview(task) && task.data.interaction.state === 'new') {
        this.setState({
          developerName: RESERVED_LABEL,
          name: RESERVED_USERNAME,
        });
      } else {
        this.setState({
          developerName: ENGAGED_LABEL,
          name: ENGAGED_USERNAME,
        });
      }
    });
  };

  handleTaskMedia = (track) => {
    this.setCallControlAudio(new MediaStream([track]));
  };

  handleRealTimeAssist = (interactionId: string, payload: RealTimeAssistPayload) => {
    if (!interactionId || !payload?.data) return;
    runInAction(() => {
      const current = (this.store.realTimeAssist && this.store.realTimeAssist[interactionId]) || [];
      this.store.realTimeAssist = {
        ...(this.store.realTimeAssist || {}),
        [interactionId]: [...current, payload],
      };
    });
  };

  clearRealTimeAssist = (interactionId: string): void => {
    if (!interactionId) return;
    runInAction(() => {
      if (this.store.realTimeAssist?.[interactionId]) {
        const next = {...this.store.realTimeAssist};
        delete next[interactionId];
        this.store.realTimeAssist = next;
      }
    });
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
    this.setLastConsultDestination(null);
    this.refreshTaskList();
    this.setConsultStartTimeStamp(null);
  };

  handleConsultOffer = () => {
    this.refreshTaskList();
  };

  handleAutoAnswer = () => {
    this.setIsDeclineButtonEnabled(true);
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
    this.setLastConsultDestination(null);
    this.setConsultStartTimeStamp(null);
    this.refreshTaskList();
  };

  handleConferenceStarted = () => {
    runInAction(() => {
      this.setIsQueueConsultInProgress(false);
      this.setCurrentConsultQueueId(null);
      this.setLastConsultDestination(null);
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
  handleUIControlsUpdated = () => {
    this.refreshTaskList();
  };

  handleSwitchCall = () => {
    this.refreshTaskList();
  };

  private registerTaskEventListeners = (task: ITask): void => {
    task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
    task.on(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(task, reason));
    task.on(TASK_EVENTS.TASK_OUTDIAL_FAILED, (reason) => this.handleOutdialFailed(reason));

    // SDK-computed UI control updates
    task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, this.handleUIControlsUpdated);

    // Renamed events (SDK names)
    task.on(TASK_EVENTS.TASK_WRAPPEDUP, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);
    task.on(TASK_EVENTS.TASK_OFFER_CONTACT, this.refreshTaskList);

    // Fix: wire handleConsultEnd (was dead code — previously wired to refreshTaskList)
    task.on(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);

    // Fix: correct event names
    task.on(TASK_EVENTS.TASK_RECORDING_PAUSED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_RECORDING_RESUMED, this.refreshTaskList);

    task.on(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);
    task.on(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
    task.on(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
    task.on(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_JOINED, this.handleConferenceStarted);
    task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
    task.on(TASK_EVENTS.TASK_CONFERENCE_ENDED, this.handleConferenceEnded);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT, this.handleConferenceEnded);
    task.on(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);

    task.on(TASK_EVENTS.TASK_SWITCH_CALL, this.handleSwitchCall);
    task.on(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);

    // Campaign preview: transition RESERVED → ENGAGED when the agent accepts
    task.on(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleCampaignPreviewReservation);
    task.on(TASK_EVENTS.TASK_CAMPAIGN_CONTACT_UPDATED, this.refreshTaskList);

    const taskId = task.data?.interactionId;
    if (taskId && !this.realtimeTranscriptionListeners[taskId]) {
      this.realtimeTranscriptionListeners[taskId] = (payload: RealTimeTranscriptionEventPayload) =>
        this.handleRealtimeTranscription(payload);
    }
    if (taskId && this.realtimeTranscriptionListeners[taskId]) {
      task.on(CC_EVENTS.REAL_TIME_TRANSCRIPTION, this.realtimeTranscriptionListeners[taskId]);
    }

    if (this.deviceType === DEVICE_TYPE_BROWSER) {
      task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
    }

    // Avoid duplicate registration when this method is re-entered for the same
    // task, but do rebind when task:hydrate / task:merged supplies a
    // replacement object for the same interaction.
    if (taskId) {
      const existing = this.realTimeAssistListeners[taskId];
      if (existing?.task !== task) {
        existing?.task?.off(SUGGESTED_RESPONSE_EVENT, existing.listener);
        const listener = (payload: RealTimeAssistPayload) => this.handleRealTimeAssist(taskId, payload);
        this.realTimeAssistListeners[taskId] = {task, listener};
        task.on(SUGGESTED_RESPONSE_EVENT, listener);
      }
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

  /**
   * Handles the initial arrival of a campaign task.
   * The SDK emits TASK_CAMPAIGN_PREVIEW_RESERVATION for all campaign types.
   * Only standard and direct preview campaigns should enter RESERVED state
   * (the agent must explicitly accept/skip the preview contact).
   * Predictive and progressive campaigns go straight to the regular flow —
   * they will transition directly to ENGAGED via handleTaskAssigned.
   */
  handleIncomingCampaignPreview = (event: ITask) => {
    const task: ITask = event;

    this.registerTaskEventListeners(task);

    if (this.onIncomingTask && !this.taskList[task.data.interactionId]) {
      this.onIncomingTask({task});
      this.handleTaskMuteState(task);
    }

    // Only standard/direct preview campaigns enter RESERVED state.
    // Predictive and progressive campaigns skip RESERVED and will
    // transition to ENGAGED when handleTaskAssigned fires.
    if (this.isCampaignPreview(task)) {
      runInAction(() => {
        this.setState({
          developerName: RESERVED_LABEL,
          name: RESERVED_USERNAME,
        });
      });
    }

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
      // Don't show the multi-login modal if there's an active task
      // The modal blocks UI interactions and should not interfere with task handling
      if (this.currentTask) {
        this.store.logger.info('CC-Widgets: handleMultiLoginCloseSession(): skipping alert due to active task', {
          module: 'storeEventsWrapper.ts',
          method: 'handleMultiLoginCloseSession',
        });
        return;
      }
      this.setShowMultipleLoginAlert(true);
    }
  };

  handleTaskMerged = (event) => {
    const task = event;
    this.registerTaskEventListeners(task);
    this.refreshTaskList();
  };

  private getTaskInteractionId = (task: ITask | null | undefined): string | undefined => {
    return (
      task?.data?.interactionId ??
      // SDK task-class mode compatibility
      (task as ITask & {getInteractionId?: () => string})?.getInteractionId?.() ??
      (task as ITask & {getInteraction?: () => {id?: string}})?.getInteraction?.()?.id
    );
  };

  private getTaskInteractionState = (task: ITask | null | undefined): string | undefined => {
    return (
      task?.data?.interaction?.state ??
      // SDK task-class mode compatibility
      (task as ITask & {getInteractionState?: () => string})?.getInteractionState?.() ??
      (task as ITask & {getInteraction?: () => {state?: string}})?.getInteraction?.()?.state
    );
  };

  handleMultiLoginHydrate = (event) => {
    const task = event as ITask;
    if (!task) {
      this.store.logger.warn('CC-Widgets: handleMultiLoginHydrate(): task payload missing', {
        module: 'storeEventsWrapper.ts',
        method: 'handleMultiLoginHydrate',
      });
      return;
    }

    const interactionId = this.getTaskInteractionId(task);
    const interactionState = this.getTaskInteractionState(task);

    if (interactionId && this.store.taskList[interactionId] && interactionState === 'new') {
      return;
    }

    this.registerTaskEventListeners(task);

    // Mark accepted campaign previews BEFORE refreshTaskList so that
    // setCurrentTask's isPendingPreview guard allows them through.
    if (this.isCampaignPreview(task) && task.data.interaction.state !== 'new') {
      this.addAcceptedCampaign(task.data.interactionId);
    }

    this.refreshTaskList();
    this.handleTaskAssigned(task);
  };

  handleTaskHydrate = (event) => {
    const task = event;

    // Register all task event listeners
    this.registerTaskEventListeners(task);

    // Mark accepted campaign previews BEFORE refreshTaskList so that
    // setCurrentTask's isPendingPreview guard allows them through when
    // refreshTaskList internally promotes a task from the task list.
    if (this.isCampaignPreview(task) && task.data.interaction.state !== 'new') {
      this.addAcceptedCampaign(task.data.interactionId);
    }

    this.refreshTaskList();

    this.setCurrentTask(task);
    if (task.data.interaction.state === 'consulting') {
      if (task.data.isConsulted) {
        // this.setConsultAccepted(true);
      }
      this.setConsultStartTimeStamp(Date.now());
    }

    if (this.isCampaignPreview(task) && task.data.interaction.state === 'new') {
      this.setState({
        developerName: RESERVED_LABEL,
        name: RESERVED_USERNAME,
      });
    } else if (this.isCampaignPreview(task)) {
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
    } else if (
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

  handleRealtimeTranscription = (payload: RealTimeTranscriptionEventPayload) => {
    const transcriptData = payload.data;
    if (!transcriptData?.messageId) return;

    const content = transcriptData.content || '';
    if (!content) return;

    const role = transcriptData.role.toUpperCase();
    const publishTimestampRaw = transcriptData.publishTimestamp;
    const publishTimestamp =
      typeof publishTimestampRaw === 'number'
        ? publishTimestampRaw
        : Number.parseInt(`${publishTimestampRaw || Date.now()}`, 10);
    const normalizedPublishTimestamp = Number.isNaN(publishTimestamp) ? Date.now() : publishTimestamp;

    runInAction(() => {
      const transcriptLines = this.store.realtimeTranscriptionData || [];
      const newTranscriptData = {
        ...transcriptData,
        role,
        content,
        publishTimestamp: normalizedPublishTimestamp,
      };
      const hasExistingLine = transcriptLines.some((line) => line.messageId === transcriptData.messageId);

      this.store.realtimeTranscriptionData = hasExistingLine
        ? transcriptLines.map((line) =>
            line.messageId === transcriptData.messageId ? {...line, ...newTranscriptData} : line
          )
        : [...transcriptLines, newTranscriptData];
    });
  };

  getBuddyAgents = async (action: 'Consult' | 'Transfer' = 'Consult'): Promise<Array<BuddyDetails>> => {
    try {
      const mediaType = getSupportedMediaType(this.currentTask?.data?.interaction?.mediaType);
      const response = await this.store.cc.getBuddyAgents({
        action,
        ...(mediaType ? {mediaType} : {}),
      });
      return 'data' in response ? response.data.agentList : [];
    } catch (error) {
      this.store.logger.error('Error fetching buddy agents:', error);
      throw error;
    }
  };

  getQueues = async (params?: ContactServiceQueueSearchParams): Promise<ContactServiceQueuesResponse> => {
    try {
      const mediaType = this.currentTask?.data?.interaction?.mediaType;
      const filter = getTaskChannelFilter('queue', mediaType);

      return await this.store.cc.getQueues({
        ...(filter ? {filter} : {}),
        ...(params ?? {}),
      });
    } catch (error) {
      this.store.logger.error('Error fetching queues:', error);
      throw error;
    }
  };

  getEntryPoints = async (params?: EntryPointSearchParams): Promise<EntryPointListResponse> => {
    try {
      const mediaType = this.currentTask?.data?.interaction?.mediaType;
      const filter = getTaskChannelFilter('entryPoint', mediaType);

      return await this.store.cc.getEntryPoints({
        ...(filter ? {filter} : {}),
        ...(params ?? {}),
      });
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
      return await this.store.cc.addressBook.getEntries(params ?? {});
    } catch (error) {
      this.store.logger.error('Error fetching address book entries:', error);
      throw error;
    }
  };

  getAccessToken = async (): Promise<string> => {
    try {
      // @ts-expect-error - webex credentials API not typed
      const tokenInfo = await this.store.cc.webex.credentials.getUserToken();
      return tokenInfo.access_token;
    } catch (error) {
      this.store.logger.error('CC-Widgets: getAccessToken(): failed to get access token', {
        module: 'storeEventsWrapper.ts',
        method: 'getAccessToken',
        error,
      });
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
      this.setDigitalChannelsInitialized(false);
      this.store.realtimeTranscriptionData = [];
      this.store.acceptedCampaignIds = new Set();
      this.realtimeTranscriptionListeners = {};
      this.setLastConsultDestination(null);
      this.store.realTimeAssist = {};
      this.realTimeAssistListeners = {};
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
      ccSDK.on(TASK_MULTI_LOGIN_HYDRATE, this.handleMultiLoginHydrate);
      ccSDK.on(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.on(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.on(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleIncomingCampaignPreview);
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
      ccSDK.off(TASK_MULTI_LOGIN_HYDRATE, this.handleMultiLoginHydrate);
      ccSDK.off(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.off(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.off(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleIncomingCampaignPreview);
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
