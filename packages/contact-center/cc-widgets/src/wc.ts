import r2wc from '@r2wc/react-to-web-component';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import store from '@webex/cc-store';
import {TaskList, IncomingTask, CallControl, CallControlCAD, OutdialCall} from '@webex/cc-task';
import {DigitalChannels} from '@webex/cc-digital-channels';
import {AIAssistant} from '@webex/cc-ai-assistant';

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
    conferenceEnabled: 'boolean',
  },
});

const WebCallControlCAD = r2wc(CallControlCAD, {
  props: {
    onHoldResume: 'function',
    onEnd: 'function',
    onWrapUp: 'function',
    onRecordingToggle: 'function',
    conferenceEnabled: 'boolean',
  },
});

const WebOutdialCall = r2wc(OutdialCall, {});

const WebDigitalChannels = r2wc(DigitalChannels, {});

const WebAIAssistant = r2wc(AIAssistant, {
  props: {
    onOpen: 'function',
    onMinimize: 'function',
    onRestore: 'function',
    onClose: 'function',
    onClearChat: 'function',
    onFullScreenToggle: 'function',
    onSuggestionReceived: 'function',
    className: 'string',
  },
});

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
  {name: 'widget-cc-digital-channels', component: WebDigitalChannels},
  {name: 'widget-cc-ai-assistant', component: WebAIAssistant},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});

export {store};
