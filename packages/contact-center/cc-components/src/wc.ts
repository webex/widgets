import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';
import StationLoginComponent from './components/StationLogin/station-login';
import CallControlComponent from './components/task/CallControl/call-control';
import CallControlCADComponent from './components/task/CallControl/call-control';
import IncomingTaskComponent from './components/task/IncomingTask/incoming-task';
import TaskListComponent from './components/task/TaskList/task-list';
import OutdialCallComponent from './components/task/OutdialCall/outdial-call';

// WebUserState component
const WebUserState = r2wc(UserStateComponent, {
  props: {
    //  type '"string" | "number" | "boolean" | "function" | "json"
    idleCodes: 'json',
    setAgentStatus: 'function',
    isSettingAgentStatus: 'boolean',
    elapsedTime: 'number',
    lastIdleStateChangeElapsedTime: 'number',
    currentState: 'string',
    customState: 'json',
    logger: 'function',
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
    logger: 'function',
  },
});
if (!customElements.get('component-cc-station-login')) {
  customElements.define('component-cc-station-login', WebStationLogin);
}

const commonPropsForCallControl: Record<string, 'string' | 'number' | 'boolean' | 'function' | 'json'> = {
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
  consultTransferOptions: 'json',
};

const WebCallControlCADComponent = r2wc(CallControlCADComponent, {
  props: commonPropsForCallControl,
});
const WebCallControl = r2wc(CallControlComponent, {
  props: commonPropsForCallControl,
});

if (!customElements.get('component-cc-call-control-cad')) {
  customElements.define('component-cc-call-control-cad', WebCallControlCADComponent);
}

if (!customElements.get('component-cc-call-control')) {
  customElements.define('component-cc-call-control', WebCallControl);
}

const WebIncomingTask = r2wc(IncomingTaskComponent, {
  props: {
    incomingTask: 'json',
    isBrowser: 'boolean',
    accept: 'function',
    reject: 'function',
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
    logger: 'function',
  },
});
if (!customElements.get('component-cc-task-list')) {
  customElements.define('component-cc-task-list', WebTaskList);
}

const WebOutdialCallComponent = r2wc(OutdialCallComponent);
if (!customElements.get('component-cc-out-dial-call')) {
  customElements.define('component-cc-out-dial-call', WebOutdialCallComponent);
}
