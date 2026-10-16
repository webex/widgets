import {act} from '@testing-library/react';
import type {AISummaryStatusDetail} from '../src';
import type {CallControlProps} from '@webex/cc-task';

type AISummaryStatusCallback = NonNullable<CallControlProps['onAISummaryStatusChange']>;
type RecordedCallControlProps = CallControlProps & Record<string, unknown>;
type WebCallControlElement = HTMLElement & {
  onAISummaryStatusChange?: AISummaryStatusCallback;
};

const CALL_CONTROL_TAG = 'widget-cc-call-control';
const AI_ASSISTANT_TAG = 'widget-cc-ai-assistant';
const AI_SUMMARY_DASHED_ATTRIBUTE = 'on-aisummary-status-change';
const AI_SUMMARY_LOWER_ATTRIBUTE = 'onaisummarystatuschange';
const mockCallControlProps: RecordedCallControlProps[] = [];
const mockCallControl = jest.fn((props: RecordedCallControlProps) => {
  mockCallControlProps.push(props);
  return null;
});

jest.mock('@webex/cc-station-login', () => ({StationLogin: () => null}));
jest.mock('@webex/cc-user-state', () => ({UserState: () => null}));
jest.mock('@webex/cc-digital-channels', () => ({DigitalChannels: () => null}));
jest.mock('@webex/cc-ai-assistant', () => ({AIAssistant: () => null}));
jest.mock('@webex/cc-store', () => ({__esModule: true, default: {}}));
jest.mock('@webex/cc-task', () => ({
  TaskList: () => null,
  IncomingTask: () => null,
  CallControl: mockCallControl,
  CallControlCAD: () => null,
  OutdialCall: () => null,
  RealTimeTranscript: () => null,
}));

const callbackGlobalNames = [
  'aiSummaryGlobalCallback',
  'mockOnHoldResumeGlobal',
  'mockOnEndGlobal',
  'mockOnWrapUpGlobal',
  'mockOnRecordingToggleGlobal',
] as const;
const allRegisteredTags = [
  'widget-cc-user-state',
  'widget-cc-station-login',
  'widget-cc-incoming-task',
  'widget-cc-task-list',
  CALL_CONTROL_TAG,
  'widget-cc-outdial-call',
  'widget-cc-call-control-cad',
  'widget-cc-realtime-transcript',
  'widget-cc-digital-channels',
  AI_ASSISTANT_TAG,
] as const;

const windowGlobals = window as unknown as Partial<Record<(typeof callbackGlobalNames)[number], unknown>>;
const preUpgradeStatusCallback = jest.fn<void, [AISummaryStatusDetail]>();
let preUpgradeElement: WebCallControlElement;

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const latestCallControlProps = () => {
  const props = mockCallControlProps[mockCallControlProps.length - 1];

  if (!props) {
    throw new Error('Expected CallControl to receive props');
  }

  expect(props).not.toHaveProperty('container');
  return props;
};

const expectObservedAttributes = (tagName: string, expectedAttributes: string[]) => {
  const ctor = customElements.get(tagName) as CustomElementConstructor & {
    observedAttributes?: string[];
  };

  expect(ctor).toBeDefined();
  expect(ctor.observedAttributes ?? []).toEqual(expectedAttributes);
};

const createStatusCallback = () => jest.fn<void, [AISummaryStatusDetail]>();

const installLegacyCallbackGlobals = () => {
  const callbacks = {
    onHoldResume: jest.fn(),
    onEnd: jest.fn(),
    onWrapUp: jest.fn(),
    onRecordingToggle: jest.fn(),
  };

  windowGlobals.mockOnHoldResumeGlobal = callbacks.onHoldResume;
  windowGlobals.mockOnEndGlobal = callbacks.onEnd;
  windowGlobals.mockOnWrapUpGlobal = callbacks.onWrapUp;
  windowGlobals.mockOnRecordingToggleGlobal = callbacks.onRecordingToggle;

  return callbacks;
};

const invokeRecordedCallback = (callback: unknown) => {
  expect(callback).toEqual(expect.any(Function));
  (callback as () => void)();
};

beforeAll(async () => {
  preUpgradeElement = document.createElement(CALL_CONTROL_TAG) as WebCallControlElement;
  preUpgradeElement.onAISummaryStatusChange = preUpgradeStatusCallback;
  expect(Object.prototype.hasOwnProperty.call(preUpgradeElement, 'onAISummaryStatusChange')).toBe(true);
  document.body.appendChild(preUpgradeElement);

  await act(async () => {
    await import('../src/wc');
    await customElements.whenDefined(CALL_CONTROL_TAG);
  });
});

afterEach(async () => {
  await act(async () => {
    document.body.innerHTML = '';
  });
  mockCallControl.mockClear();
  mockCallControlProps.length = 0;

  for (const name of callbackGlobalNames) {
    delete windowGlobals[name];
  }
});

describe('widget-cc-call-control AI summary status property', () => {
  it('recovers a pre-definition own status callback property during custom element upgrade', () => {
    expect(Object.prototype.hasOwnProperty.call(preUpgradeElement, 'onAISummaryStatusChange')).toBe(false);
    expect(preUpgradeElement.onAISummaryStatusChange).toBe(preUpgradeStatusCallback);
    expect(latestCallControlProps().onAISummaryStatusChange).toBe(preUpgradeStatusCallback);
  });

  it('keeps registered tags and observed attributes on the documented web component surface', () => {
    for (const tagName of allRegisteredTags) {
      expect(customElements.get(tagName)).toBeDefined();
    }

    expectObservedAttributes(CALL_CONTROL_TAG, [
      'on-hold-resume',
      'on-end',
      'on-wrap-up',
      'on-recording-toggle',
      'conference-enabled',
    ]);
    expectObservedAttributes(AI_ASSISTANT_TAG, [
      'on-open',
      'on-minimize',
      'on-restore',
      'on-close',
      'on-full-screen-toggle',
      'on-real-time-assist-received',
      'on-wellness-break-offered',
      'on-wellness-break-accepted',
      'on-wellness-break-started',
      'on-wellness-break-ended',
      'on-wellness-break-error',
      'wellness-audio-url',
      'wellness-break-overlay-target',
      'class-name',
    ]);
  });

  it('forwards pre-connection assignment, replacement, removal, and reconnect through CallControl', async () => {
    const element = document.createElement(CALL_CONTROL_TAG) as WebCallControlElement;
    const first = createStatusCallback();
    const second = createStatusCallback();

    await act(async () => {
      element.onAISummaryStatusChange = first;
      document.body.appendChild(element);
    });
    expect(latestCallControlProps().onAISummaryStatusChange).toBe(first);

    await act(async () => {
      element.onAISummaryStatusChange = second;
    });
    expect(latestCallControlProps().onAISummaryStatusChange).toBe(second);

    await act(async () => {
      element.remove();
      document.body.appendChild(element);
    });
    expect(latestCallControlProps().onAISummaryStatusChange).toBe(second);

    await act(async () => {
      element.onAISummaryStatusChange = undefined;
    });
    expect(latestCallControlProps().onAISummaryStatusChange).toBeUndefined();
  });

  it('leaves callback attributes inert and never reflects the status callback property', async () => {
    const attributeElement = document.createElement(CALL_CONTROL_TAG) as WebCallControlElement;
    const propertyElement = document.createElement(CALL_CONTROL_TAG) as WebCallControlElement;
    const globalCallback = createStatusCallback();
    const propertyCallback = createStatusCallback();
    const setAttributeSpy = jest.spyOn(propertyElement, 'setAttribute');

    windowGlobals.aiSummaryGlobalCallback = globalCallback;
    attributeElement.setAttribute(AI_SUMMARY_DASHED_ATTRIBUTE, 'aiSummaryGlobalCallback');
    attributeElement.setAttribute(AI_SUMMARY_LOWER_ATTRIBUTE, 'aiSummaryGlobalCallback');

    await act(async () => {
      document.body.appendChild(attributeElement);
    });
    expect(attributeElement.onAISummaryStatusChange).toBeUndefined();
    expect(latestCallControlProps().onAISummaryStatusChange).toBeUndefined();

    await act(async () => {
      document.body.appendChild(propertyElement);
    });
    mockCallControlProps.length = 0;
    setAttributeSpy.mockClear();

    await act(async () => {
      propertyElement.onAISummaryStatusChange = propertyCallback;
    });

    expect(latestCallControlProps().onAISummaryStatusChange).toBe(propertyCallback);
    expect(setAttributeSpy).not.toHaveBeenCalledWith(AI_SUMMARY_DASHED_ATTRIBUTE, expect.any(String));
    expect(setAttributeSpy).not.toHaveBeenCalledWith(AI_SUMMARY_LOWER_ATTRIBUTE, expect.any(String));
    expect(propertyElement.hasAttribute(AI_SUMMARY_DASHED_ATTRIBUTE)).toBe(false);
    expect(propertyElement.hasAttribute(AI_SUMMARY_LOWER_ATTRIBUTE)).toBe(false);
    expect(() => {
      (propertyElement as unknown as {onAISummaryStatusChange: unknown}).onAISummaryStatusChange =
        'aiSummaryGlobalCallback';
    }).toThrow(TypeError);
  });

  it('passes the existing CallControl web component props while stripping the r2wc container prop', async () => {
    const element = document.createElement(CALL_CONTROL_TAG) as WebCallControlElement;
    const statusCallback = createStatusCallback();
    const callbacks = installLegacyCallbackGlobals();

    await act(async () => {
      element.onAISummaryStatusChange = statusCallback;
      element.setAttribute('on-hold-resume', 'mockOnHoldResumeGlobal');
      element.setAttribute('on-end', 'mockOnEndGlobal');
      element.setAttribute('on-wrap-up', 'mockOnWrapUpGlobal');
      element.setAttribute('on-recording-toggle', 'mockOnRecordingToggleGlobal');
      element.setAttribute('conference-enabled', 'true');
      document.body.appendChild(element);
    });

    const props = latestCallControlProps();
    expect(props.onAISummaryStatusChange).toBe(statusCallback);
    expect(props.conferenceEnabled).toBe(true);

    invokeRecordedCallback(props.onHoldResume);
    invokeRecordedCallback(props.onEnd);
    invokeRecordedCallback(props.onWrapUp);
    invokeRecordedCallback(props.onRecordingToggle);

    expect(callbacks.onHoldResume).toHaveBeenCalledTimes(1);
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
    expect(callbacks.onWrapUp).toHaveBeenCalledTimes(1);
    expect(callbacks.onRecordingToggle).toHaveBeenCalledTimes(1);
  });
});
