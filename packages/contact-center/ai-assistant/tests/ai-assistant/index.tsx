import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {runInAction} from 'mobx';
import {AIAssistant} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';
import '@testing-library/jest-dom';

jest.mock('@webex/cc-store', () => {
  const {observable} = jest.requireActual('mobx');
  const storeMock = {
    cc: {
      apiAIAssistant: {
        getRealTimeAssistance: jest.fn(),
        sendRealTimeAssistanceUserAction: jest.fn(),
      },
    },
    currentTask: {data: {interactionId: 'interaction-1'}},
    agentId: 'agent-1',
    agentProfile: {},
    featureFlags: {isSuggestedResponsesEnabled: true},
    realTimeAssist: {},
    receiverView: undefined,
    onErrorCallback: undefined,
    clearRealTimeAssist: jest.fn(),
    recordAISummaryViewed: jest.fn(),
    recordAISummaryCopied: jest.fn(),
    setMidCallSummaryFeedback: jest.fn(),
    getAISummaryViewModel: jest.fn(function () {
      return this.receiverView;
    }),
  };

  return {
    __esModule: true,
    default: observable.object(storeMock, {
      cc: observable.ref,
      currentTask: observable.ref,
      agentProfile: observable.ref,
      featureFlags: observable.ref,
      realTimeAssist: observable.ref,
      receiverView: observable.ref,
      onErrorCallback: observable.ref,
      getAISummaryViewModel: false,
      clearRealTimeAssist: false,
      recordAISummaryViewed: false,
      recordAISummaryCopied: false,
      setMidCallSummaryFeedback: false,
    }),
  };
});

type ReceiverSummaryView = {
  surface: 'omitted' | 'unavailable' | 'generic-error' | 'content';
  eligible: boolean;
  requestPending: boolean;
  content?: {type: 'card'; adaptiveCard: unknown};
  contentRevision?: number;
  counters: {viewed: number; copied: number; edited: number; liked: number; disliked: number};
  feedback: 'none' | 'like' | 'dislike';
  midCallFeedbackPending: boolean;
  actionType?: 'CONSULT' | 'TRANSFER';
  ownerKey?: {interactionId: string; agentId: string; ownershipGeneration: number};
};

type StoreMock = {
  cc: {
    apiAIAssistant: {
      getRealTimeAssistance: jest.Mock;
      sendRealTimeAssistanceUserAction: jest.Mock;
    };
  };
  currentTask?: {data: {interactionId: string}};
  agentId: string;
  agentProfile: Record<string, unknown>;
  featureFlags: {isSuggestedResponsesEnabled: boolean};
  realTimeAssist: Record<string, unknown>;
  receiverView?: ReceiverSummaryView;
  onErrorCallback?: jest.Mock;
  clearRealTimeAssist: jest.Mock;
  recordAISummaryViewed: jest.Mock;
  recordAISummaryCopied: jest.Mock;
  setMidCallSummaryFeedback: jest.Mock;
  getAISummaryViewModel: jest.Mock;
};
const storeMock = store as unknown as StoreMock;

const receiverSummaryView = (surface: ReceiverSummaryView['surface']): ReceiverSummaryView => ({
  surface,
  eligible: true,
  requestPending: false,
  counters: {viewed: 0, copied: 0, edited: 0, liked: 0, disliked: 0},
  feedback: 'none',
  midCallFeedbackPending: false,
  ownerKey: {interactionId: 'interaction-1', agentId: 'agent-1', ownershipGeneration: 1},
});

const receiverContentView = (overrides: Partial<ReceiverSummaryView> = {}): ReceiverSummaryView => ({
  ...receiverSummaryView('content'),
  content: {
    type: 'card',
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [{type: 'TextBlock', text: 'Receiver summary'}],
    },
  },
  contentRevision: 7,
  actionType: 'TRANSFER',
  ...overrides,
});

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
    storeMock.receiverView = undefined;
    storeMock.onErrorCallback = undefined;
    storeMock.recordAISummaryViewed.mockReturnValue(true);
    storeMock.recordAISummaryCopied.mockReturnValue(true);
    storeMock.cc.apiAIAssistant.sendRealTimeAssistanceUserAction.mockResolvedValue(undefined);
    storeMock.setMidCallSummaryFeedback.mockResolvedValue({outcome: 'confirmed'});
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

  it('queries the store receiver view model with the current task and omits the trigger for omitted surfaces', () => {
    storeMock.receiverView = receiverSummaryView('omitted');

    render(<AIAssistant />);

    expect(storeMock.getAISummaryViewModel).toHaveBeenCalledWith('mid-call', 'receiver', storeMock.currentTask);
    expect(screen.queryByTestId('ai-assistant:view-summary')).not.toBeInTheDocument();
  });

  it('re-renders the receiver summary branch when the observable surface changes', async () => {
    storeMock.receiverView = receiverSummaryView('unavailable');
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    expect(screen.getByTestId('ai-summary:unavailable')).toBeInTheDocument();

    runInAction(() => {
      storeMock.receiverView = receiverSummaryView('generic-error');
    });

    await waitFor(() => expect(screen.getByTestId('ai-summary:error')).toBeInTheDocument());
    expect(screen.queryByTestId('ai-summary:unavailable')).not.toBeInTheDocument();
  });

  it('records the receiver summary view before opening the current revision', async () => {
    storeMock.receiverView = receiverContentView();
    storeMock.recordAISummaryViewed.mockReturnValue(true);
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(storeMock.recordAISummaryViewed).toHaveBeenCalledWith('mid-call', 'receiver', 7, storeMock.currentTask);
    expect(storeMock.recordAISummaryViewed).toHaveBeenCalledTimes(1);
  });

  it('opens a receiver summary even when Real-time Assist is disabled', async () => {
    storeMock.featureFlags = {isSuggestedResponsesEnabled: false};
    storeMock.receiverView = receiverContentView();
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    expect(await screen.findByTestId('ai-assistant:receiver-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant:landing')).not.toBeInTheDocument();
    expect(storeMock.recordAISummaryViewed).toHaveBeenCalledWith('mid-call', 'receiver', 7, storeMock.currentTask);
  });

  it('routes receiver copy and feedback through the store with the current revision and action type', async () => {
    storeMock.receiverView = receiverContentView();
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    fireEvent.click(await screen.findByRole('button', {name: 'Copy Summary'}));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(storeMock.recordAISummaryCopied).toHaveBeenCalledWith('mid-call', 'receiver', 7, storeMock.currentTask);

    fireEvent.click(screen.getByRole('button', {name: 'This is helpful'}));

    await waitFor(() =>
      expect(storeMock.setMidCallSummaryFeedback).toHaveBeenCalledWith(
        'receiver',
        'like',
        'TRANSFER',
        7,
        storeMock.currentTask
      )
    );
  });

  it('projects receiver feedback pending state as disabled controls without painting a selection', async () => {
    storeMock.receiverView = receiverContentView({
      requestPending: true,
      midCallFeedbackPending: true,
      feedback: 'none',
    });
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));

    const like = await screen.findByRole('button', {name: 'This is helpful'});
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'false');
  });

  it('replaces receiver feedback projections only after the store confirms the selection', async () => {
    const feedbackSend = deferred<{outcome: 'confirmed'}>();
    storeMock.receiverView = receiverContentView();
    storeMock.setMidCallSummaryFeedback.mockImplementationOnce(() => {
      runInAction(() => {
        storeMock.receiverView = receiverContentView({
          requestPending: true,
          midCallFeedbackPending: true,
          feedback: 'none',
        });
      });
      return feedbackSend.promise;
    });
    render(<AIAssistant />);

    fireEvent.click(screen.getByTestId('ai-assistant:view-summary'));
    const like = await screen.findByRole('button', {name: 'This is helpful'});
    fireEvent.click(like);

    await waitFor(() => expect(like).toBeDisabled());
    expect(like).toHaveAttribute('aria-pressed', 'false');

    feedbackSend.resolve({outcome: 'confirmed'});
    runInAction(() => {
      storeMock.receiverView = receiverContentView({feedback: 'like'});
    });

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
