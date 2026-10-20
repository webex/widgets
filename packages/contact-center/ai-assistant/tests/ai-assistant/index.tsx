import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {runInAction} from 'mobx';
import {AIAssistant} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';
import type {AISummaryEntry} from '@webex/cc-store';
import '@testing-library/jest-dom';

jest.mock('@webex/cc-store', () => {
  const {observable} = jest.requireActual('mobx');
  const storeMock = {
    cc: observable.object(
      {
        apiAIAssistant: observable.object(
          {
            aiSummaries: {},
            getRealTimeAssistance: jest.fn(),
            sendRealTimeAssistanceUserAction: jest.fn(),
          },
          {aiSummaries: observable.ref}
        ),
      },
      {apiAIAssistant: observable.ref}
    ),
    currentTask: {data: {interactionId: 'interaction-1'}},
    agentId: 'agent-1',
    agentProfile: {},
    featureFlags: {isSuggestedResponsesEnabled: true},
    realTimeAssist: {},
    onErrorCallback: undefined,
    clearRealTimeAssist: jest.fn(),
    recordAISummaryCopied: jest.fn(),
    setReceiverSummaryFeedback: jest.fn(),
  };

  const observableStore = observable.object(storeMock, {
    cc: observable.ref,
    currentTask: observable.ref,
    agentProfile: observable.ref,
    featureFlags: observable.ref,
    realTimeAssist: observable.ref,
    onErrorCallback: observable.ref,
    clearRealTimeAssist: false,
    recordAISummaryCopied: false,
    setReceiverSummaryFeedback: false,
  });
  return {__esModule: true, default: observableStore};
});

type StoreMock = {
  cc: {
    apiAIAssistant: {
      aiSummaries: Record<string, {receiver?: AISummaryEntry}>;
      getRealTimeAssistance: jest.Mock;
      sendRealTimeAssistanceUserAction: jest.Mock;
    };
  };
  currentTask?: {data: {interactionId: string}};
  agentId: string;
  agentProfile: Record<string, unknown>;
  featureFlags: {isSuggestedResponsesEnabled: boolean};
  realTimeAssist: Record<string, unknown>;
  onErrorCallback?: jest.Mock;
  clearRealTimeAssist: jest.Mock;
  recordAISummaryCopied: jest.Mock;
  setReceiverSummaryFeedback: jest.Mock;
};
const storeMock = store as unknown as StoreMock;

const receiverEntry = (overrides: Partial<AISummaryEntry> = {}): AISummaryEntry => ({
  status: 'ready',
  response: {
    summary: 'Receiver summary',
    feedback: 'none',
    state: 'DEFAULT',
    numberOfTimesViewed: 1,
    numberOfTimesEdited: 0,
    numberOfTimesCopied: 0,
  },
  action: 'TRANSFER',
  content: {
    conversationId: 'interaction-1',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'TextBlock', text: 'Receiver summary'}],
    },
  },
  ...overrides,
});

const setReceiverEntry = (receiver?: AISummaryEntry): void => {
  runInAction(() => {
    storeMock.cc.apiAIAssistant.aiSummaries = receiver ? {'interaction-1': {receiver}} : {};
  });
};

const deferred = <T,>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

describe('AIAssistant widget', () => {
  const innerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');

  beforeAll(() => {
    // Adaptive Cards writes plain text through innerText, which jsdom does not implement.
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent;
      },
      set(value: string) {
        this.textContent = value;
      },
    });
  });

  afterAll(() => {
    if (innerText) {
      Object.defineProperty(HTMLElement.prototype, 'innerText', innerText);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).innerText;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
    storeMock.currentTask = {data: {interactionId: 'interaction-1'}};
    storeMock.agentProfile = {};
    storeMock.featureFlags = {isSuggestedResponsesEnabled: true};
    storeMock.realTimeAssist = {};
    storeMock.cc.apiAIAssistant.aiSummaries = {};
    storeMock.onErrorCallback = undefined;
    storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction.mockResolvedValue(undefined);
    storeMock.recordAISummaryCopied.mockReturnValue(true);
    storeMock.setReceiverSummaryFeedback.mockResolvedValue(undefined);
  });

  it('renders launcher when chrome is closed', () => {
    render(<AIAssistant />);
    expect(screen.getByTestId('ai-assistant:launcher')).toBeInTheDocument();
  });

  it('offers the launcher and the landing page before an interaction starts', () => {
    storeMock.currentTask = undefined;
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByTestId('ai-assistant:landing')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:footer')).not.toBeInTheDocument();
  });

  it('offers the launcher and the landing page when the feature is disabled', () => {
    storeMock.featureFlags = {isSuggestedResponsesEnabled: false};
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByTestId('ai-assistant:landing')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:empty')).not.toBeInTheDocument();
  });

  it('renders RealTimeAssist inside the shared assistant panel', async () => {
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:launcher'));

    expect(screen.getByRole('dialog', {name: 'Cisco AI Assistant'})).toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:empty')).toBeInTheDocument();
    expect(within(screen.getByTestId('ai-assistant:body')).queryByTestId('ai-assistant:context-form')).toBeNull();

    fireEvent.click(screen.getByTestId('ai-assistant:get-suggestions'));

    expect(
      await within(screen.getByTestId('ai-assistant:body')).findByTestId('ai-assistant:context-form')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('ai-assistant:footer')).queryByTestId('ai-assistant:context-form')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant:disclaimer')).toHaveTextContent(
      'I can make mistakes, so check my responses.'
    );
  });

  it('passes through className to root', () => {
    const {container} = render(<AIAssistant className="my-host-class" />);
    expect(container.querySelector('.my-host-class')).toBeInTheDocument();
  });

  it('should omit the View summary trigger until a receiver summary arrives for the current interaction', () => {
    runInAction(() => {
      storeMock.cc.apiAIAssistant.aiSummaries = {'other-interaction': {receiver: receiverEntry()}};
    });
    render(<AIAssistant />);
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
  });

  it('re-renders the receiver summary branch when the observable surface changes', async () => {
    setReceiverEntry(receiverEntry({content: {conversationId: 'interaction-1', areTranscriptsAvailable: false}}));
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    expect(screen.getByTestId('ai-summary:unavailable')).toBeInTheDocument();

    setReceiverEntry(receiverEntry({status: 'error', content: undefined}));

    await waitFor(() => expect(screen.getByTestId('ai-summary:error')).toBeInTheDocument());
    expect(screen.queryByTestId('ai-summary:unavailable')).not.toBeInTheDocument();
  });

  it('should open the receiver summary from the View summary trigger', async () => {
    setReceiverEntry(receiverEntry());
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
  });

  it('opens a receiver summary even when Real-time Assist is disabled', async () => {
    storeMock.featureFlags = {isSuggestedResponsesEnabled: false};
    setReceiverEntry(receiverEntry());
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();
  });

  it('delegates receiver copies and feedback with the displayed SDK content', async () => {
    const entry = receiverEntry();
    setReceiverEntry(entry);
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    fireEvent.click(await screen.findByRole('button', {name: 'Copy Summary'}));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Receiver summary'));
    await waitFor(() =>
      expect(storeMock.recordAISummaryCopied).toHaveBeenCalledWith('receiver', entry.content, storeMock.currentTask)
    );
    expect(storeMock.cc.apiAIAssistant.aiSummaries['interaction-1'].receiver?.content).toBe(entry.content);

    fireEvent.click(screen.getByRole('button', {name: 'This is helpful'}));

    await waitFor(() =>
      expect(storeMock.setReceiverSummaryFeedback).toHaveBeenCalledWith(
        'thumbs_up',
        entry.content,
        storeMock.currentTask
      )
    );
  });

  it('keeps received content visible while a refresh loads or fails', () => {
    const entry = receiverEntry();
    for (const status of ['loading', 'error'] as const) {
      setReceiverEntry({...entry, status});
      expect(helper.getReceiverSummary(store.currentTask)).toMatchObject({surface: 'content', content: entry.content});
    }
  });

  it('omits a receiver summary while a request has no content', () => {
    setReceiverEntry(receiverEntry({status: 'loading', content: undefined}));

    expect(helper.getReceiverSummary(store.currentTask)).toBeUndefined();
  });

  it('shows the unavailable fallback for receiver content without a card', async () => {
    setReceiverEntry(receiverEntry({content: {conversationId: 'interaction-1', summaryText: 'Text-only summary'}}));
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-summary:unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Copy Summary'})).not.toBeInTheDocument();
  });

  it('retains the displayed SDK content for the store to reject stale callbacks', () => {
    setReceiverEntry(receiverEntry());
    const displayedTask = storeMock.currentTask;
    const summary = helper.getReceiverSummary(store.currentTask);
    expect(summary?.surface).toBe('content');
    if (summary?.surface !== 'content') return;

    const replacement = receiverEntry();
    setReceiverEntry(replacement);

    storeMock.recordAISummaryCopied.mockReturnValueOnce(false);
    expect(summary.recordReceiverSummaryCopied()).toBe(false);
    expect(storeMock.recordAISummaryCopied).toHaveBeenCalledWith('receiver', summary.content, displayedTask);
    summary.setReceiverSummaryFeedback('thumbs_up');
    expect(storeMock.cc.apiAIAssistant.aiSummaries['interaction-1'].receiver?.response.numberOfTimesCopied).toBe(0);
    expect(storeMock.setReceiverSummaryFeedback).toHaveBeenCalledWith('thumbs_up', summary.content, displayedTask);
  });

  it('retains the displayed task for the store to reject stale callbacks', () => {
    setReceiverEntry(receiverEntry());
    const displayedTask = storeMock.currentTask;
    const summary = helper.getReceiverSummary(store.currentTask);
    expect(summary?.surface).toBe('content');
    if (summary?.surface !== 'content') return;

    runInAction(() => {
      storeMock.currentTask = {data: {interactionId: 'interaction-1'}};
    });

    storeMock.recordAISummaryCopied.mockReturnValueOnce(false);
    expect(summary.recordReceiverSummaryCopied()).toBe(false);
    expect(storeMock.recordAISummaryCopied).toHaveBeenCalledWith('receiver', summary.content, displayedTask);
    summary.setReceiverSummaryFeedback('thumbs_up');
    expect(storeMock.cc.apiAIAssistant.aiSummaries['interaction-1'].receiver?.response.numberOfTimesCopied).toBe(0);
    expect(storeMock.setReceiverSummaryFeedback).toHaveBeenCalledWith('thumbs_up', summary.content, displayedTask);
  });

  it('projects receiver feedback pending state as disabled controls without painting a selection', async () => {
    setReceiverEntry(receiverEntry({feedbackPending: true}));
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    const like = await screen.findByRole('button', {name: 'This is helpful'});
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'false');
  });

  it('replaces receiver feedback projections only after the store confirms the selection', async () => {
    const feedbackSend = deferred<void>();
    setReceiverEntry(receiverEntry());
    storeMock.setReceiverSummaryFeedback.mockImplementationOnce(() => {
      setReceiverEntry(receiverEntry({feedbackPending: true}));
      return feedbackSend.promise;
    });
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    const like = await screen.findByRole('button', {name: 'This is helpful'});
    fireEvent.click(like);

    await waitFor(() => expect(like).toBeDisabled());
    expect(like).toHaveAttribute('aria-pressed', 'false');

    feedbackSend.resolve();
    const confirmed = receiverEntry();
    confirmed.response.feedback = 'thumbs_up';
    setReceiverEntry(confirmed);

    await waitFor(() =>
      expect(screen.getByRole('button', {name: 'This is helpful'})).toHaveAttribute('aria-pressed', 'true')
    );
  });

  it('routes errors thrown in the hook to store.onErrorCallback', () => {
    const onErrorCallback = jest.fn();
    storeMock.onErrorCallback = onErrorCallback;
    jest.spyOn(helper, 'useAiAssistant').mockImplementation(() => {
      throw new Error('Boom');
    });

    const {container} = render(<AIAssistant />);
    expect(container.firstChild).toBeNull();
    expect(onErrorCallback).toHaveBeenCalledWith('AIAssistant', expect.any(Error));
  });
});
