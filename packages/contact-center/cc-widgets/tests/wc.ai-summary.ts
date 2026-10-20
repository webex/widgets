import {act} from '@testing-library/react';
import type {CallControlProps} from '@webex/cc-task';

type RecordedCallControlProps = CallControlProps & Record<string, unknown>;

const CALL_CONTROL_TAG = 'widget-cc-call-control';
const AI_ASSISTANT_TAG = 'widget-cc-ai-assistant';
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

describe('CallControl web component', () => {
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

  it('passes the existing CallControl web component props while stripping the r2wc container prop', async () => {
    const element = document.createElement(CALL_CONTROL_TAG);
    const callbacks = installLegacyCallbackGlobals();

    await act(async () => {
      element.setAttribute('on-hold-resume', 'mockOnHoldResumeGlobal');
      element.setAttribute('on-end', 'mockOnEndGlobal');
      element.setAttribute('on-wrap-up', 'mockOnWrapUpGlobal');
      element.setAttribute('on-recording-toggle', 'mockOnRecordingToggleGlobal');
      element.setAttribute('conference-enabled', 'true');
      document.body.appendChild(element);
    });

    const props = latestCallControlProps();
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
