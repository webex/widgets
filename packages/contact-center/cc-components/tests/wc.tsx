import '@testing-library/jest-dom';
import '../src/wc';
import {handleWrapupCall} from '../src/components/task/CallControl/call-control.utils';
import type {WrapupCompletionResult} from '../src/components/task/task.types';

type ComponentCallControlElement = HTMLElement & {
  currentTask?: unknown;
  wrapupCall?: (reason: string, id: string) => void;
};

const loggerMock = {
  info: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
};

const currentTask = {
  data: {
    interactionId: 'interaction-1',
    agentId: 'agent-1',
    mediaResourceId: 'media-resource-1',
    interaction: {
      mediaType: 'telephony',
      mediaChannel: 'telephony',
      participants: {},
    },
  },
};

describe('@webex/cc-components/wc', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    delete (window as unknown as Record<string, unknown>).legacyWrapupCall;
  });

  it('keeps component call-control tags and wrapupCall function prop mapping registered', () => {
    const callControlCtor = customElements.get('component-cc-call-control') as CustomElementConstructor & {
      observedAttributes?: string[];
    };
    const callControlCADCtor = customElements.get('component-cc-call-control-cad') as CustomElementConstructor & {
      observedAttributes?: string[];
    };

    expect(callControlCtor).toBeDefined();
    expect(callControlCADCtor).toBeDefined();
    expect(callControlCtor.observedAttributes ?? []).toContain('wrapup-call');
    expect(callControlCADCtor.observedAttributes ?? []).toContain('wrapup-call');
  });

  it('normalizes a void-returning component custom-element wrapupCall property as legacy success', async () => {
    const element = document.createElement('component-cc-call-control') as ComponentCallControlElement;
    const hostInvocation = jest.fn();

    function legacyWrapupCall(this: HTMLElement, reason: string, id: string): void {
      hostInvocation(reason, id, this);
    }

    (window as unknown as Record<string, unknown>).legacyWrapupCall = legacyWrapupCall;
    element.currentTask = currentTask;
    element.wrapupCall = legacyWrapupCall;
    document.body.appendChild(element);

    const setSelectedWrapupReason = jest.fn();
    const setSelectedWrapupId = jest.fn();

    await expect(
      handleWrapupCall(
        'Customer Issue',
        'wrap1',
        element.wrapupCall as unknown as (reason: string, id: string) => Promise<WrapupCompletionResult>,
        setSelectedWrapupReason,
        setSelectedWrapupId,
        loggerMock
      )
    ).resolves.toEqual({wrapup: 'succeeded', response: 'not-required'});

    expect(hostInvocation).toHaveBeenCalledWith('Customer Issue', 'wrap1', element);
    expect(setSelectedWrapupReason).toHaveBeenCalledWith(null);
    expect(setSelectedWrapupId).toHaveBeenCalledWith(null);
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: CallControl: wrapup completed', {
      module: 'call-control.tsx',
      method: 'handleWrapupCall',
    });
  });
});
