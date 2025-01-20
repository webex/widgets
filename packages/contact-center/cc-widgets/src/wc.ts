import r2wc from '@r2wc/react-to-web-component';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import store from '@webex/cc-store';
import {TaskList, IncomingTask, CallControl} from '@webex/cc-task';

const WebUserState = r2wc(UserState);
const WebIncomingTask = r2wc(IncomingTask, {
  props: {
    onAccepted: 'function',
    onDeclined: 'function',
  },
});

const WebTaskList = r2wc(TaskList, {
  props: {
    onTaskAccepted: 'function',
    onTaskDeclined: 'function',
  },
});

const WebStationLogin = r2wc(StationLogin, {
  props: {
    onLogin: 'function',
    onLogout: 'function',
  },
});

const WebCallControl = r2wc(CallControl, {
  props: {
    onHoldResume: 'function',
    onEnd: 'function',
    onWrapup: 'function',
  },
});

if (!customElements.get('widget-cc-user-state')) {
  customElements.define('widget-cc-user-state', WebUserState);
}

if (!customElements.get('widget-cc-station-login')) {
  customElements.define('widget-cc-station-login', WebStationLogin);
}

if (!customElements.get('widget-cc-incoming-task')) {
  customElements.define('widget-cc-incoming-task', WebIncomingTask);
}

if (!customElements.get('widget-cc-task-list')) {
  customElements.define('widget-cc-task-list', WebTaskList);
}

if (!customElements.get('widget-cc-call-control')) {
  customElements.define('widget-cc-call-control', WebCallControl);
}

export {store};
