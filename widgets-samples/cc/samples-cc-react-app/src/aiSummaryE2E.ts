import type {WithWebex} from '@webex/cc-store';
import type {AISummaryStatusDetail} from '@webex/cc-widgets';

type AISummaryE2EWebex = WithWebex['webex'] & {
  authorization?: {
    initiateLogin?: () => void;
  };
  once?: (event: string, callback: () => void) => void;
};

export type AISummaryE2EWebexConstructorProbe = {
  version: 1;
  packageEntry: '@webex/contact-center';
  constructorVersion?: string;
  hasAuthorization: boolean;
  hasCc: boolean;
  hasSameInstanceAuthorizationAndCc: boolean;
  errorName?: string;
};

export type AISummaryE2EBridge = {
  version: 1;
  webex: AISummaryE2EWebex;
  emitTask?: (event: string, payload: unknown) => void;
  emitCC?: (event: string, payload: unknown) => void;
  setTaskPhase?: (phase: 'connected' | 'wrapup') => void;
  setCapabilities?: (capabilities: {
    midCallEnabled: boolean;
    postCallEnabled: boolean;
    actionTimestamp?: number;
  }) => void;
  enqueueSettlement?: (
    queue: 'midCall' | 'postCall' | 'midCallResponse' | 'postCallResponse',
    settlement: unknown
  ) => void;
  resolveDeferred?: (id: string, payload: unknown) => void;
  rejectDeferred?: (id: string, reason: unknown) => void;
  mutateTask?: (mutation: 'hold' | 'resume' | 'transfer-owner' | 'conference-start' | 'wrapped-up') => void;
  recordAISummaryStatusDetail?: (detail: AISummaryStatusDetail) => void;
  setStatusCallbackThrows?: (shouldThrow: boolean) => void;
  recordWebexConstructorProbe?: (probe: AISummaryE2EWebexConstructorProbe) => void;
  getDiagnostics?: () => unknown;
  readSummaryState?: () => AISummaryStoreObservation;
  setOwner?: (agentId: string) => Promise<void>;
  registerAgent?: () => Promise<void>;
  requestMidCallSummary?: () => Promise<unknown>;
  requestPostCallSummary?: (selectionRevision: number) => Promise<unknown>;
};

export type AISummaryStoreObservation = {
  agentId: string;
  states: {
    kind: string;
    role: string;
    ownerKey: {interactionId: string; agentId: string; ownershipGeneration: number};
    counters: {viewed: number; edited: number; copied: number};
    contentRevision: number;
    feedbackStatus?: string;
  }[];
  pendingRequests: number;
};

declare global {
  interface Window {
    __WEBEX_CC_AI_SUMMARY_E2E__?: AISummaryE2EBridge;
  }
}

const AI_SUMMARY_E2E_QUERY = 'ai-summary-e2e';

export const isAISummaryE2ENavigation = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get(AI_SUMMARY_E2E_QUERY) === '1';
};

export const getAISummaryE2EBridge = (): AISummaryE2EBridge | undefined => {
  if (!isAISummaryE2ENavigation()) {
    return undefined;
  }

  const bridge = window.__WEBEX_CC_AI_SUMMARY_E2E__;
  if (!bridge || bridge.version !== 1 || !bridge.webex || !bridge.webex.cc) {
    throw new Error('AI Summary E2E bridge v1 is required for ai-summary-e2e=1 navigation');
  }

  return bridge;
};
