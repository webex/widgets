import React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import store from '@webex/cc-store';
import {TaskList, IncomingTask, CallControl, CallControlCAD, OutdialCall, RealTimeTranscript} from '@webex/cc-task';
import type {AISummaryStatusDetail, CallControlProps} from '@webex/cc-task';
import {DigitalChannels} from '@webex/cc-digital-channels';
import {AIAssistant} from '@webex/cc-ai-assistant';

type AISummaryStatusCallback = NonNullable<CallControlProps['onAISummaryStatusChange']>;

const CallControlWebComponentAdapter: React.FC<CallControlProps & {container?: HTMLElement}> = (props) => {
  const callControlProps = {...props};
  delete callControlProps.container;
  return React.createElement(CallControl, callControlProps);
};

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
    hasCampaignPreviewEnabled: 'boolean',
  },
});

const WebStationLogin = r2wc(StationLogin, {
  props: {
    onLogin: 'function',
    onLogout: 'function',
  },
});

const WebCallControlBase = r2wc(CallControlWebComponentAdapter, {
  props: {
    onHoldResume: 'function',
    onEnd: 'function',
    onWrapUp: 'function',
    onRecordingToggle: 'function',
    conferenceEnabled: 'boolean',
    // No transform: r2wc forwards property assignments without attribute conversion or reflection.
    onAISummaryStatusChange: undefined,
  },
}) as CustomElementConstructor & {observedAttributes: string[]};

const statusCallbackProperty = Object.getOwnPropertyDescriptor(
  WebCallControlBase.prototype,
  'onAISummaryStatusChange'
)!;

class WebCallControl extends WebCallControlBase {
  static get observedAttributes(): string[] {
    return WebCallControlBase.observedAttributes.filter(
      (attribute) => attribute.toLowerCase() !== 'on-aisummary-status-change'
    );
  }

  constructor() {
    super();

    if (Object.prototype.hasOwnProperty.call(this, 'onAISummaryStatusChange')) {
      const instance = this as {onAISummaryStatusChange?: AISummaryStatusCallback};
      const onAISummaryStatusChange = instance.onAISummaryStatusChange;
      delete instance.onAISummaryStatusChange;
      this.onAISummaryStatusChange = onAISummaryStatusChange;
    }
  }

  get onAISummaryStatusChange(): AISummaryStatusCallback | undefined {
    return statusCallbackProperty.get!.call(this) as AISummaryStatusCallback | undefined;
  }

  set onAISummaryStatusChange(value: AISummaryStatusCallback | undefined) {
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError('onAISummaryStatusChange must be a function or undefined');
    }

    statusCallbackProperty.set!.call(this, value);
  }
}

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
const WebRealTimeTranscript = r2wc(RealTimeTranscript, {
  props: {
    liveTranscriptEntries: 'json',
    className: 'string',
  },
});

const WebDigitalChannels = r2wc(DigitalChannels, {});

const WebAIAssistant = r2wc(AIAssistant, {
  props: {
    onOpen: 'function',
    onMinimize: 'function',
    onRestore: 'function',
    onClose: 'function',
    onFullScreenToggle: 'function',
    onRealTimeAssistReceived: 'function',
    onWellnessBreakOffered: 'function',
    onWellnessBreakAccepted: 'function',
    onWellnessBreakStarted: 'function',
    onWellnessBreakEnded: 'function',
    onWellnessBreakError: 'function',
    wellnessAudioUrl: 'string',
    wellnessBreakOverlayTarget: 'string',
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
  {name: 'widget-cc-realtime-transcript', component: WebRealTimeTranscript},
  {name: 'widget-cc-digital-channels', component: WebDigitalChannels},
  {name: 'widget-cc-ai-assistant', component: WebAIAssistant},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});

export {store};
export type {AISummaryStatusDetail};
