import r2wc from '@r2wc/react-to-web-component';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import store from '@webex/cc-store';
import {TaskList, IncomingTask, CallControl, CallControlCAD, OutdialCall, TaskTranscript} from '@webex/cc-task';
import {DigitalChannels} from '@webex/cc-digital-channels';

const WebUserState = r2wc(UserState, {
  props: {
    onStateChange: 'function',
  },
});

const WebIncomingTask = r2wc(IncomingTask, {
  props: {
    incomingTask: 'json',
    onAccepted: 'function',
    onRejected: 'function',
  },
});

const WebTaskList = r2wc(TaskList, {
  props: {
    onTaskAccepted: 'function',
    onTaskDeclined: 'function',
    onTaskSelected: 'function',
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
    onWrapUp: 'function',
    onRecordingToggle: 'function',
  },
});

const WebCallControlCAD = r2wc(CallControlCAD, {
  props: {
    onHoldResume: 'function',
    onEnd: 'function',
    onWrapUp: 'function',
    onRecordingToggle: 'function',
  },
});

const WebOutdialCall = r2wc(OutdialCall, {});
const WebTaskTranscript = r2wc(TaskTranscript, {
  props: {
    ivrTranscript: 'string',
    liveTranscriptEntries: 'json',
    activeTab: 'string',
    onTabChange: 'function',
    className: 'string',
  },
});

const WebDigitalChannels = r2wc(DigitalChannels, {});

// Whenever there is a new component, add the name of the component
// and the web-component to the components object
const components = [
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-incoming-task', component: WebIncomingTask},
  {name: 'widget-cc-task-list', component: WebTaskList},
  {name: 'widget-cc-call-control', component: WebCallControl},
  {name: 'widget-cc-outdial-call', component: WebOutdialCall},
  {name: 'widget-cc-call-control-cad', component: WebCallControlCAD},
  {name: 'widget-cc-task-transcript', component: WebTaskTranscript},
  {name: 'widget-cc-digital-channels', component: WebDigitalChannels},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});

export {store};
