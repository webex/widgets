import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';
import StationLoginComponent from './components/StationLogin/station-login';
import CallControlComponent from './components/task/CallControl/call-control';
import IncomingTaskComponent from './components/task/IncomingTask/incoming-task';
import TaskListComponent from './components/task/TaskList/task-list';

const WebUserState = r2wc(UserStateComponent, {
  props: {
    //  type '"string" | "number" | "boolean" | "function" | "json"
    idleCodes: 'json',
    setAgentStatus: 'function',
    isSettingAgentStatus: 'boolean',
    errorMessage: 'string',
    elapsedTime: 'number',
    lastIdleStateChangeElapsedTime: 'number',
    currentState: 'string',
    customState: 'json',
    currentTheme: 'string',
    onStateChange: 'function',
  },
});
if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}

const WebStationLogin = r2wc(StationLoginComponent, {
  props: {
    teams: 'json',
    loginOptions: 'json',
    login: 'function',
    logout: 'function',
    loginSuccess: 'json',
    loginFailure: 'json',
    logoutSuccess: 'json',
    setDeviceType: 'function',
    setDialNumber: 'function',
    setTeam: 'function',
    isAgentLoggedIn: 'boolean',
    handleContinue: 'function',
    deviceType: 'string',
    showMultipleLoginAlert: 'boolean',
  },
});
if (!customElements.get('component-cc-station-login')) {
  customElements.define('component-cc-station-login', WebStationLogin);
}

const WebCallControl = r2wc(CallControlComponent, {
  props: {
    currentTask: 'json',
    audioRef: 'json',
    wrapupCodes: 'json',
    wrapupRequired: 'boolean',
    toggleHold: 'function',
    toggleRecording: 'function',
    endCall: 'function',
    wrapupCall: 'function',
    isHeld: 'boolean',
    setIsHeld: 'function',
  },
});
if (!customElements.get('component-cc-call-control')) {
  customElements.define('component-cc-call-control', WebCallControl);
}

const WebIncomingTask = r2wc(IncomingTaskComponent, {
  props: {
    incomingTask: 'json',
    isBrowser: 'boolean',
    accept: 'function',
    decline: 'function',
  },
});
if (!customElements.get('component-cc-incoming-task')) {
  customElements.define('component-cc-incoming-task', WebIncomingTask);
}

const WebTaskList = r2wc(TaskListComponent, {
  props: {
    currentTask: 'json',
    taskList: 'json',
    isBrowser: 'boolean',
    acceptTask: 'function',
    declineTask: 'function',
  },
});
if (!customElements.get('component-cc-task-list')) {
  customElements.define('component-cc-task-list', WebTaskList);
}
