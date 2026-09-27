/** @jest-environment-options {"customExportConditions": ["node", "node-addons"]} */
import fs from 'fs';
import {createRequire} from 'module';
import path from 'path';
import ts from 'typescript';

import {aiSummaryFixtures} from '../../test-fixtures/src/aiSummaryFixtures';
import type {
  AISummary,
  AISummaryAction,
  AISummaryFeatureEnablement,
  AISummaryFeedback,
  AISummaryResponse,
  AISummarySections,
  AISummaryState,
  ITask,
  TASK_EVENTS,
  WrapupPayLoad,
} from '@webex/contact-center';

jest.unmock('@webex/contact-center');

const SDK_CONTRACT_ROOT_ENV = 'AI_SUMMARY_SDK_EXTRACT_ROOT';
const SDK_PACKAGE_NAME = '@webex/contact-center';
const SDK_SUMMARY_TIMEOUT_MS = 15000;
const MAIN_INTERACTION_ID = 'interaction-main-1';
const CONVERSATION_ID = 'conversation-main-1';
const AGENT_ID = 'agent-a';
const AGENT_NAME = 'Ada Lovelace';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false;

type Assert<Condition extends true> = Condition;
type OptionalKey<Value, Key extends keyof Value> = Pick<Partial<Value>, Key> extends Pick<Value, Key> ? true : false;

type PackedSDKContractAssertions = [
  Assert<Equal<`${(typeof TASK_EVENTS)['TASK_MID_CALL_SUMMARY_RECEIVED']}`, 'task:midCallSummaryReceived'>>,
  Assert<Equal<`${(typeof TASK_EVENTS)['TASK_FEATURE_ENABLEMENT']}`, 'task:featureEnablement'>>,
  Assert<Equal<OptionalKey<AISummary, 'timestamp'>, true>>,
  Assert<Equal<AISummary['timestamp'], number | undefined>>,
  Assert<Equal<'timestamp' extends keyof AISummaryResponse ? true : false, false>>,
  Assert<Equal<OptionalKey<AISummaryFeatureEnablement, 'midCallEnabled'>, true>>,
  Assert<Equal<OptionalKey<AISummaryFeatureEnablement, 'postCallEnabled'>, true>>,
  Assert<Equal<OptionalKey<AISummaryFeatureEnablement, 'actionTimestamp'>, true>>,
  Assert<Equal<ReturnType<ITask['requestPostCallSummary']>, Promise<AISummary>>>,
  Assert<Equal<ReturnType<ITask['requestMidCallSummary']>, Promise<AISummary>>>,
  Assert<Equal<ReturnType<ITask['sendPostCallSummaryResponse']>, Promise<void>>>,
  Assert<Equal<ReturnType<ITask['sendMidCallSummaryResponse']>, Promise<void>>>,
  Assert<Equal<ITask['aiSummaryCapabilities'], Readonly<{midCallEnabled: boolean; postCallEnabled: boolean}>>>,
  Assert<Equal<OptionalKey<AISummaryResponse, 'wrapUpCode'>, true>>,
  Assert<Equal<AISummaryAction, 'CONSULT' | 'TRANSFER'>>,
  Assert<Equal<AISummaryFeedback, 'none' | 'thumbs_up' | 'thumbs_down'>>,
];
const packedSDKContractAssertions: PackedSDKContractAssertions = [
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
];
void packedSDKContractAssertions;

type GeneratedSummaryFlags = {
  wrapUpSummariesEnabled: boolean;
  consultTransferSummariesEnabled: boolean;
};

type HttpRequestOptions = {
  uri: string;
  method: string;
  addAuthHeader: boolean;
  timeout?: number;
  body: Record<string, unknown>;
};

type HttpResponse = {
  statusCode: number;
  body?: Record<string, unknown>;
};

type WebexRequest = (options: HttpRequestOptions) => Promise<HttpResponse>;

type FakeWebex = {
  once: jest.MockedFunction<(eventName: string, listener: () => void) => void>;
  credentials: {
    getOrgId: () => string;
  };
  internal: {
    services: {
      get: (key: string) => string;
    };
  };
  request: jest.MockedFunction<WebexRequest>;
};

type SendEvent = (
  agentId: string,
  interactionId: string,
  eventType: string,
  eventName: string,
  eventMetaData?: Record<string, unknown>,
  languageCode?: string,
  trackingId?: string,
  publishTimestamp?: number,
  timeout?: number
) => Promise<Record<string, unknown>>;

type ApiAIAssistantRuntime = {
  sendEvent: SendEvent;
  requestAndWaitForRtd: (options: {
    correlationId: string;
    rtdEventType: string;
    timeoutMs: number;
    createTimeoutError: () => Error;
    agentId: string;
    interactionId: string;
    eventType: string;
    eventName: string;
    eventMetaData?: Record<string, unknown>;
    publishTimestamp?: number;
    timeout?: number;
  }) => Promise<unknown>;
  resolveFromRtdEvent: (rtdEventType: string, correlationId: string, payload: AISummary) => 'resolved' | 'not-found';
  clearAllRtdRequests: () => void;
  pendingRtdRequests: Map<string, unknown>;
};

type ApiAIAssistantConstructor = new (webex: FakeWebex) => ApiAIAssistantRuntime;

type ContactFake = {
  wrapup: jest.MockedFunction<
    (payload: {interactionId: string; data: WrapupPayLoad}) => Promise<Record<string, unknown>>
  >;
};

type TaskDataLike = {
  interactionId: string;
  wrapUpRequired: boolean;
  interaction: {
    mainInteractionId: string;
    interactionId: string;
    mediaType: string;
  };
};

type SdkTaskRuntime = ITask & {
  configureAISummary: (
    apiAIAssistant: ApiAIAssistantRuntime,
    getGeneratedSummaryFlags: () => GeneratedSummaryFlags
  ) => void;
  setFeatureEnablement: (enablement: AISummaryFeatureEnablement, emitEvent?: boolean) => void;
  emitPendingFeatureEnablement: () => void;
  clearFeatureEnablement: () => void;
  emit: (eventName: string, payload: unknown) => boolean;
  listenerCount: (eventName: string) => number;
  removeAllListeners?: (eventName?: string) => void;
  stopStateMachine?: () => void;
};

type TaskConstructor = new (
  contact: ContactFake,
  data: TaskDataLike,
  uiControlConfig: Record<string, unknown>,
  wrapupData: unknown,
  agentId: string,
  agentName: string
) => SdkTaskRuntime;

type PackedRuntime = {
  packageRoot: string;
  Task: TaskConstructor;
  ApiAIAssistant: ApiAIAssistantConstructor;
  TASK_EVENTS: {
    TASK_MID_CALL_SUMMARY_RECEIVED: 'task:midCallSummaryReceived';
    TASK_FEATURE_ENABLEMENT: 'task:featureEnablement';
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const readConstructor = <Constructor>(moduleValue: unknown, exportName: string): Constructor => {
  const candidate = isRecord(moduleValue) ? (moduleValue[exportName] ?? moduleValue.default) : undefined;
  if (typeof candidate !== 'function') {
    throw new Error(`Missing packed SDK constructor: ${exportName}`);
  }
  return candidate as Constructor;
};

const isSubPath = (parent: string, candidate: string): boolean => {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const resolveContractPackageRoot = (): {
  packageRoot: string;
  packageJson: Record<string, unknown>;
  mainPath: string;
} => {
  const configuredRoot = process.env[SDK_CONTRACT_ROOT_ENV];
  const packageRoot = configuredRoot ?? path.dirname(createRequire(__filename).resolve(`${SDK_PACKAGE_NAME}/package`));
  if (!path.isAbsolute(packageRoot)) {
    throw new Error(`${SDK_CONTRACT_ROOT_ENV} must be an absolute package root`);
  }
  const canonicalRoot = fs.realpathSync(packageRoot);
  const packageJsonPath = path.join(canonicalRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as unknown;
  if (!isRecord(packageJson) || packageJson.name !== SDK_PACKAGE_NAME) {
    throw new Error(`${SDK_CONTRACT_ROOT_ENV} must point at ${SDK_PACKAGE_NAME}`);
  }
  if (typeof packageJson.main !== 'string' || packageJson.main.trim() === '') {
    throw new Error(`${SDK_CONTRACT_ROOT_ENV} package manifest must declare main`);
  }
  if (typeof packageJson.types !== 'string' || packageJson.types.trim() === '') {
    throw new Error(`${SDK_CONTRACT_ROOT_ENV} package manifest must declare types`);
  }
  const mainPath = fs.realpathSync(path.resolve(canonicalRoot, packageJson.main));
  const typesPath = fs.realpathSync(path.resolve(canonicalRoot, packageJson.types));
  if (mainPath !== canonicalRoot && !isSubPath(canonicalRoot, mainPath)) {
    throw new Error(`${SDK_CONTRACT_ROOT_ENV} package main escapes package root`);
  }
  if (typesPath !== canonicalRoot && !isSubPath(canonicalRoot, typesPath)) {
    throw new Error(`${SDK_CONTRACT_ROOT_ENV} package types escape package root`);
  }
  return {packageRoot: canonicalRoot, packageJson, mainPath};
};

const loadPackedRuntime = (): PackedRuntime => {
  const {packageRoot, mainPath} = resolveContractPackageRoot();
  const packageRequire = createRequire(path.join(packageRoot, 'package.json'));
  const mainModule = packageRequire(mainPath) as unknown;
  const Task = readConstructor<TaskConstructor>(mainModule, 'Task');
  const ApiAIAssistant = readConstructor<ApiAIAssistantConstructor>(mainModule, 'ApiAIAssistant');
  const taskEvents = isRecord(mainModule) ? mainModule.TASK_EVENTS : undefined;
  const requiredTaskEvents = {
    TASK_MID_CALL_SUMMARY_RECEIVED: 'task:midCallSummaryReceived',
    TASK_FEATURE_ENABLEMENT: 'task:featureEnablement',
  } as const;
  if (!isRecord(taskEvents)) {
    throw new Error('Packed SDK TASK_EVENTS export is invalid');
  }
  for (const [memberName, eventName] of Object.entries(requiredTaskEvents)) {
    if (taskEvents[memberName] !== eventName) {
      throw new Error(`Packed SDK TASK_EVENTS.${memberName} is invalid`);
    }
  }
  return {
    packageRoot,
    Task,
    ApiAIAssistant,
    TASK_EVENTS: requiredTaskEvents,
  };
};

const runtime = loadPackedRuntime();

const createFakeWebex = (request?: jest.MockedFunction<WebexRequest>): FakeWebex => ({
  once: jest.fn(),
  credentials: {
    getOrgId: () => 'org-1',
  },
  internal: {
    services: {
      get: () => 'https://api.wxcc-us1.cisco.com',
    },
  },
  request: request ?? jest.fn<ReturnType<WebexRequest>, Parameters<WebexRequest>>(),
});

const makeTaskHarness = (request?: jest.MockedFunction<WebexRequest>) => {
  const contact: ContactFake = {
    wrapup: jest.fn(async (payload) => ({accepted: true, payload})),
  };
  const task = new runtime.Task(
    contact,
    {
      interactionId: MAIN_INTERACTION_ID,
      wrapUpRequired: false,
      interaction: {
        mainInteractionId: CONVERSATION_ID,
        interactionId: MAIN_INTERACTION_ID,
        mediaType: 'telephony',
      },
    },
    {},
    undefined,
    AGENT_ID,
    AGENT_NAME
  );
  const api = new runtime.ApiAIAssistant(createFakeWebex(request));
  task.configureAISummary(api, () => ({
    wrapUpSummariesEnabled: true,
    consultTransferSummariesEnabled: true,
  }));
  task.setFeatureEnablement({
    interactionId: MAIN_INTERACTION_ID,
    midCallEnabled: true,
    postCallEnabled: true,
    actionTimestamp: aiSummaryFixtures.featureEnablement.enabled.actionTimestamp,
  });
  return {api, contact, task};
};

const stopTask = (task: SdkTaskRuntime) => {
  task.removeAllListeners?.();
  task.stopStateMachine?.();
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const responsePayload = (wrapUpCode?: string): AISummaryResponse => ({
  summary: 'Final committed summary.',
  feedback: 'thumbs_up',
  state: 'DEFAULT',
  numberOfTimesViewed: 1,
  numberOfTimesEdited: 0,
  numberOfTimesCopied: 0,
  ...(wrapUpCode ? {wrapUpCode} : {}),
});

describe('AI summary packed SDK contract', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('loads the sealed packed runtime root instead of the workspace mock', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(runtime.packageRoot, 'package.json'), 'utf8')) as unknown;
    expect(isRecord(packageJson) ? packageJson.name : undefined).toBe(SDK_PACKAGE_NAME);
    expect(typeof runtime.Task).toBe('function');
    expect(typeof runtime.ApiAIAssistant).toBe('function');
    expect(runtime.TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED).toBe('task:midCallSummaryReceived');
    expect(runtime.TASK_EVENTS.TASK_FEATURE_ENABLEMENT).toBe('task:featureEnablement');
  });

  it('preserves exact optionality for public AI summary declarations', () => {
    const present = {
      conversationId: MAIN_INTERACTION_ID,
      timestamp: aiSummaryFixtures.ordering.presentGreaterTimestamp.incoming.timestamp,
      summaryText: aiSummaryFixtures.ordering.presentGreaterTimestamp.incoming.summaryText,
    } satisfies AISummary;
    const omitted = {
      conversationId: MAIN_INTERACTION_ID,
      summaryText: aiSummaryFixtures.ordering.omittedTimestampPair.incoming.summaryText,
    } satisfies AISummary;
    const enablement = {
      interactionId: MAIN_INTERACTION_ID,
    } satisfies AISummaryFeatureEnablement;
    const sections = {
      initialContactReason: 'Customer needs billing help.',
      additionalContactReasons: 'Customer also asked about late fees.',
      additionalContext: 'Customer prefers email follow-up.',
      keyActionsTaken: 'Verified account details.',
      nextSteps: 'Consult billing.',
      reasonForTransferOrConsult: 'Billing dispute requires specialist support.',
    } satisfies AISummarySections;
    const state = 'DEFAULT' satisfies AISummaryState;
    const response = responsePayload();
    const postCallPayload = {
      conversationId: MAIN_INTERACTION_ID,
      adaptiveCard: {type: 'AdaptiveCard'},
      adaptiveCardId: 'post-card-1',
      languageCode: 'en-US',
      summaryText: 'Post-call summary.',
      areTranscriptsAvailable: true,
      timestamp: 31,
    } satisfies AISummary;
    const midCallPayload = {
      conversationId: MAIN_INTERACTION_ID,
      adaptiveCard: {type: 'AdaptiveCard'},
      adaptiveCardId: 'mid-card-1',
      languageCode: 'en-US',
      summaryText: 'Mid-call summary.',
      areTranscriptsAvailable: true,
      timestamp: 32,
    } satisfies AISummary;
    const receivingPayload = {
      conversationId: MAIN_INTERACTION_ID,
      adaptiveCard: {type: 'AdaptiveCard'},
      adaptiveCardId: 'receiving-card-1',
      languageCode: 'en-US',
      summaryText: 'Receiving-agent summary.',
      timestamp: 33,
    } satisfies AISummary;

    expect(present.timestamp).toBe(20);
    expect(Object.prototype.hasOwnProperty.call(omitted, 'timestamp')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(enablement, 'midCallEnabled')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(enablement, 'postCallEnabled')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(enablement, 'actionTimestamp')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(response, 'timestamp')).toBe(false);
    expect([postCallPayload.timestamp, midCallPayload.timestamp, receivingPayload.timestamp]).toEqual([31, 32, 33]);
    expect(sections.initialContactReason).toContain('billing');
    expect(state).toBe('DEFAULT');
  });

  it('compiles conforming D1 fixture members against packed AI summary declarations', () => {
    // Jest transpiles TypeScript without checking it. Resolve the SDK import to
    // the same extracted candidate used by the runtime, not node_modules.
    const configPath = path.resolve(__dirname, '../tsconfig.test.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
    const program = ts.createProgram([__filename], {
      ...parsed.options,
      noEmit: true,
      baseUrl: path.dirname(configPath),
      paths: {'@webex/contact-center': [path.join(runtime.packageRoot, 'dist/types/index.d.ts')]},
    });
    const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
    expect(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).toEqual([]);
    const featureEnablements = [
      aiSummaryFixtures.featureEnablement.enabled,
      aiSummaryFixtures.featureEnablement.disabled,
      aiSummaryFixtures.featureEnablement.midCallOnly,
      aiSummaryFixtures.featureEnablement.postCallOnly,
      aiSummaryFixtures.featureEnablement.flagsOmitted,
      aiSummaryFixtures.featureEnablement.missingActionTimestamp,
      aiSummaryFixtures.featureEnablement.staleOlderEnabled,
      aiSummaryFixtures.featureEnablement.mismatchedInteraction,
    ] satisfies readonly AISummaryFeatureEnablement[];
    const summaries = [
      aiSummaryFixtures.initiatingMidCall.typedSections,
      aiSummaryFixtures.initiatingMidCall.plainText,
      aiSummaryFixtures.initiatingMidCall.cardOnlyUnsupported,
      aiSummaryFixtures.receivingMidCall.adaptiveCard,
      aiSummaryFixtures.receivingMidCall.remoteImageWithText,
      aiSummaryFixtures.receivingMidCall.remoteImageOnly,
      aiSummaryFixtures.receivingMidCall.typedOnlyUnsupported,
      aiSummaryFixtures.receivingMidCall.plainOnlyUnsupported,
      aiSummaryFixtures.postCall.structured,
      aiSummaryFixtures.postCall.plainText,
      aiSummaryFixtures.postCall.cardOnlyUnsupported,
      aiSummaryFixtures.postCall.resolutionPresent,
      aiSummaryFixtures.postCall.resolutionAbsent,
      aiSummaryFixtures.postCall.resolutionUndefinedBoundary,
      aiSummaryFixtures.postCall.resolutionEmptyBoundary,
    ] satisfies readonly AISummary[];
    const sectionRecords = [
      aiSummaryFixtures.initiatingMidCall.typedSections.sections,
      aiSummaryFixtures.receivingMidCall.adaptiveCard.sections,
      aiSummaryFixtures.postCall.structured.sections,
      aiSummaryFixtures.postCall.resolutionPresent.sections,
      aiSummaryFixtures.postCall.resolutionAbsent.sections,
    ] satisfies readonly AISummarySections[];
    const actions = [
      aiSummaryFixtures.transfers.consult.actionType,
      aiSummaryFixtures.transfers.transfer.actionType,
      aiSummaryFixtures.transfers.agentAToBToC.hops[0].actionType,
      aiSummaryFixtures.transfers.agentAToBToC.hops[1].actionType,
    ] satisfies readonly AISummaryAction[];
    const feedbackValues = [
      aiSummaryFixtures.feedback.none.feedback,
      aiSummaryFixtures.feedback.thumbsUp.feedback,
      aiSummaryFixtures.feedback.thumbsDown.feedback,
      aiSummaryFixtures.feedback.toggleBackToNone.feedback,
    ] satisfies readonly AISummaryFeedback[];
    const states = [
      'DEFAULT',
      'EXCLUDED',
      'IGNORED',
      'MID_CALL_CANCELLED',
      'NOT_RECEIVED',
    ] satisfies readonly AISummaryState[];
    const responses = [
      aiSummaryFixtures.postWrapUpSend.fulfilled.sendCalls[0].payload,
      aiSummaryFixtures.postWrapUpSend.rejected.sendCalls[0].payload,
    ] satisfies readonly AISummaryResponse[];
    const wrapupPayloads = [
      aiSummaryFixtures.postWrapUpSend.fulfilled.wrapupCall.payload,
      aiSummaryFixtures.postWrapUpSend.rejected.wrapupCall.payload,
    ] satisfies readonly WrapupPayLoad[];

    expect(featureEnablements).toHaveLength(8);
    expect(summaries).toHaveLength(15);
    expect(sectionRecords[0]).toHaveProperty('reasonForTransferOrConsult');
    expect(actions).toEqual(['CONSULT', 'TRANSFER', 'CONSULT', 'TRANSFER']);
    expect(feedbackValues).toEqual(['none', 'thumbs_up', 'thumbs_down', 'none']);
    expect(states).toHaveLength(5);
    expect(responses.every((response) => !Object.prototype.hasOwnProperty.call(response, 'summaryText'))).toBe(true);
    expect(wrapupPayloads.every((payload) => String(payload.auxCodeId) !== String(payload.wrapUpReason))).toBe(true);
    expect(aiSummaryFixtures.postWrapUpSend.fulfilled.sendCalls).toHaveLength(1);
    expect(aiSummaryFixtures.postWrapUpSend.rejected.sendCalls).toHaveLength(1);
  });

  it('emits feature enablement from the matching Task and removes task-owned listeners', () => {
    const {task} = makeTaskHarness();
    const events: AISummaryFeatureEnablement[] = [];
    const listener = (enablement: AISummaryFeatureEnablement) => events.push(enablement);

    try {
      task.clearFeatureEnablement();
      task.on(runtime.TASK_EVENTS.TASK_FEATURE_ENABLEMENT, listener);
      task.setFeatureEnablement({
        interactionId: 'other-interaction',
        midCallEnabled: true,
        postCallEnabled: true,
        actionTimestamp: 1,
      });
      expect(events).toEqual([]);
      expect(task.aiSummaryCapabilities).toEqual({midCallEnabled: false, postCallEnabled: false});

      task.setFeatureEnablement(aiSummaryFixtures.featureEnablement.enabled);

      expect(events).toEqual([aiSummaryFixtures.featureEnablement.enabled]);
      expect(task.aiSummaryCapabilities).toEqual({midCallEnabled: true, postCallEnabled: true});
      task.off(runtime.TASK_EVENTS.TASK_FEATURE_ENABLEMENT, listener);
      expect(task.listenerCount(runtime.TASK_EVENTS.TASK_FEATURE_ENABLEMENT)).toBe(0);
    } finally {
      stopTask(task);
    }
  });

  it('exposes the receiver summary event on the real Task event surface', () => {
    const {task} = makeTaskHarness();
    const summaryEvents = [
      [runtime.TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, aiSummaryFixtures.receivingMidCall.adaptiveCard],
    ] as const;

    try {
      for (const [eventName, payload] of summaryEvents) {
        const listener = jest.fn();
        task.on(eventName, listener);
        expect(task.listenerCount(eventName)).toBe(1);
        task.emit(eventName, payload);
        expect(listener).toHaveBeenCalledWith(payload);
        task.off(eventName, listener);
        expect(task.listenerCount(eventName)).toBe(0);
      }
    } finally {
      stopTask(task);
    }
  });

  it('correlates CONSULT and TRANSFER mid-call requests and responses through the real Task runtime', async () => {
    const {api, task} = makeTaskHarness();
    const sendEventMock: jest.MockedFunction<SendEvent> = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(
      async () => ({accepted: true})
    );
    api.sendEvent = sendEventMock;

    try {
      for (const action of ['CONSULT', 'TRANSFER'] satisfies AISummaryAction[]) {
        const request = task.requestMidCallSummary(action);
        await flushMicrotasks();
        const requestCall = sendEventMock.mock.calls.at(-1);
        expect(requestCall).toEqual(
          expect.arrayContaining([
            AGENT_ID,
            MAIN_INTERACTION_ID,
            'CTI_EVENT',
            action === 'CONSULT' ? 'GET_MID_CALL_CONSULT_SUMMARY' : 'GET_MID_CALL_TRANSFER_SUMMARY',
          ])
        );
        expect(requestCall?.[4]).toEqual(
          expect.objectContaining({
            conversationId: CONVERSATION_ID,
            clientType: 'WxCC',
          })
        );
        expect(requestCall?.[8]).toBe(SDK_SUMMARY_TIMEOUT_MS);

        expect(
          api.resolveFromRtdEvent('MID_CALL_SUMMARY', CONVERSATION_ID, {
            conversationId: CONVERSATION_ID,
            timestamp: action === 'CONSULT' ? 2000 : 2001,
            summaryText: `${action} summary`,
          })
        ).toBe('resolved');
        await expect(request).resolves.toEqual(
          expect.objectContaining({
            conversationId: CONVERSATION_ID,
            timestamp: action === 'CONSULT' ? 2000 : 2001,
            summaryText: `${action} summary`,
          })
        );

        await task.sendMidCallSummaryResponse(responsePayload(), action);
        const responseCall = sendEventMock.mock.calls.at(-1);
        expect(responseCall?.[3]).toBe(
          action === 'CONSULT' ? 'MID_CALL_CONSULT_SUMMARY_RESPONSE' : 'MID_CALL_TRANSFER_SUMMARY_RESPONSE'
        );
        expect(responseCall?.[4]).toEqual(
          expect.objectContaining({
            action: responseCall?.[3],
            agentName: AGENT_NAME,
            conversationId: CONVERSATION_ID,
            summary: 'Final committed summary.',
          })
        );
        expect(responseCall?.[8]).toBe(SDK_SUMMARY_TIMEOUT_MS);
      }
      expect(api.pendingRtdRequests.size).toBe(0);
    } finally {
      stopTask(task);
      api.clearAllRtdRequests();
    }
  });

  describe.each([
    {label: 'post-call', action: undefined, eventType: 'POST_CALL_SUMMARY'},
    {label: 'CONSULT', action: 'CONSULT', eventType: 'MID_CALL_SUMMARY'},
    {label: 'TRANSFER', action: 'TRANSFER', eventType: 'MID_CALL_SUMMARY'},
  ] satisfies readonly {label: string; action: AISummaryAction | undefined; eventType: string}[])(
    '$label Task result and send contract',
    ({action, eventType}) => {
      it.each(['present', 'omitted'])('response timestamp field %s', async (presence) => {
        const {api, task} = makeTaskHarness();
        api.sendEvent = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(async () => ({accepted: true}));
        const request = action ? task.requestMidCallSummary(action) : task.requestPostCallSummary();
        void request.catch(() => undefined);
        try {
          await flushMicrotasks();
          const payload: AISummary = {
            conversationId: CONVERSATION_ID,
            summaryText: 'Synthetic response timestamp proof.',
            ...(presence === 'present' ? {timestamp: 192837465} : {}),
          };
          expect(api.resolveFromRtdEvent(eventType, CONVERSATION_ID, payload)).toBe('resolved');
          const result = await request;
          expect(result).toEqual(payload);
          expect(Object.prototype.hasOwnProperty.call(result, 'timestamp')).toBe(presence === 'present');
          if (presence === 'present') expect(result.timestamp).toBe(192837465);
          expect(api.pendingRtdRequests.size).toBe(0);
        } finally {
          stopTask(task);
          api.clearAllRtdRequests();
        }
      });

      it('propagates HTTP 503 rejection through the real Task response method', async () => {
        const http: jest.MockedFunction<WebexRequest> = jest.fn();
        http.mockResolvedValueOnce({statusCode: 202, body: {accepted: true}});
        http.mockRejectedValueOnce(Object.assign(new Error('Synthetic unavailable transport'), {statusCode: 503}));
        const {task} = makeTaskHarness(http);
        const send = () =>
          action
            ? task.sendMidCallSummaryResponse(responsePayload(), action)
            : task.sendPostCallSummaryResponse(responsePayload('aux-code-1'));
        try {
          await expect(send()).resolves.toBeUndefined();
          await expect(send()).rejects.toBeDefined();
          expect(http).toHaveBeenCalledTimes(2);
          for (const [request] of http.mock.calls) {
            expect(request.timeout).toBe(SDK_SUMMARY_TIMEOUT_MS);
            expect(request.body.eventName).toBe(
              action ? `MID_CALL_${action}_SUMMARY_RESPONSE` : 'POST_CALL_SUMMARY_RESPONSE'
            );
            expect(request.body.publishTimestamp).toEqual(expect.any(Number));
          }
        } finally {
          stopTask(task);
        }
      });
    }
  );

  it('settles a superseded same-conversation CONSULT request when TRANSFER replaces it', async () => {
    jest.useFakeTimers();
    const {api, task} = makeTaskHarness();
    const sendEventMock: jest.MockedFunction<SendEvent> = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(
      async () => ({accepted: true})
    );
    api.sendEvent = sendEventMock;
    let consultSettlement: 'pending' | 'fulfilled' | 'rejected' = 'pending';

    try {
      const consult = task.requestMidCallSummary('CONSULT');
      const observedConsult = consult.then(
        () => {
          consultSettlement = 'fulfilled';
        },
        () => {
          consultSettlement = 'rejected';
        }
      );
      await flushMicrotasks();
      expect(sendEventMock.mock.calls.at(-1)?.[3]).toBe('GET_MID_CALL_CONSULT_SUMMARY');
      expect(api.pendingRtdRequests.size).toBe(1);
      expect(jest.getTimerCount()).toBe(1);

      const transfer = task.requestMidCallSummary('TRANSFER');
      // Observe rejection immediately, including assertion-failure cleanup.
      void transfer.catch(() => undefined);
      await flushMicrotasks();
      expect(sendEventMock.mock.calls.at(-1)?.[3]).toBe('GET_MID_CALL_TRANSFER_SUMMARY');
      expect(api.pendingRtdRequests.size).toBe(1);
      expect(jest.getTimerCount()).toBe(1);
      expect(
        api.resolveFromRtdEvent('MID_CALL_SUMMARY', CONVERSATION_ID, {
          conversationId: CONVERSATION_ID,
          timestamp: 3001,
          summaryText: 'TRANSFER summary',
        })
      ).toBe('resolved');
      await expect(transfer).resolves.toEqual(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          summaryText: 'TRANSFER summary',
        })
      );
      expect(api.pendingRtdRequests.size).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
      // Superseding the request must settle the old caller, not abandon its
      // Promise when the SDK clears the previous timeout/map entry.
      await flushMicrotasks();
      expect(consultSettlement).toBe('rejected');
      await observedConsult;
    } finally {
      stopTask(task);
      api.clearAllRtdRequests();
    }
  });

  it('keeps RTD requests open through 14999 ms, rejects at 15000 ms, and cleans resources', async () => {
    jest.useFakeTimers();
    const {api, task} = makeTaskHarness();
    const sendEventMock: jest.MockedFunction<SendEvent> = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(
      async () => ({accepted: true})
    );
    api.sendEvent = sendEventMock;
    let settled = false;
    const baselineListenerCounts = Object.fromEntries(
      Object.values(runtime.TASK_EVENTS).map((eventName) => [eventName, task.listenerCount(eventName)])
    );

    try {
      const request = task.requestPostCallSummary();
      const observed = request.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        }
      );

      await flushMicrotasks();
      expect(sendEventMock).toHaveBeenCalledTimes(1);
      expect(api.pendingRtdRequests.size).toBe(1);
      expect(jest.getTimerCount()).toBe(1);

      jest.advanceTimersByTime(SDK_SUMMARY_TIMEOUT_MS - 1);
      await flushMicrotasks();
      expect(settled).toBe(false);
      expect(api.pendingRtdRequests.size).toBe(1);
      expect(jest.getTimerCount()).toBe(1);

      jest.advanceTimersByTime(1);
      await expect(request).rejects.toBeDefined();
      await observed;
      expect(settled).toBe(true);
      expect(api.pendingRtdRequests.size).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
      expect(
        Object.fromEntries(
          Object.values(runtime.TASK_EVENTS).map((eventName) => [eventName, task.listenerCount(eventName)])
        )
      ).toEqual(baselineListenerCounts);
      expect(
        api.resolveFromRtdEvent('POST_CALL_SUMMARY', CONVERSATION_ID, {
          conversationId: CONVERSATION_ID,
          summaryText: 'Late summary must be discarded.',
        })
      ).toBe('not-found');
    } finally {
      stopTask(task);
      api.clearAllRtdRequests();
    }
  });

  it.each(['CONSULT', 'TRANSFER'] satisfies AISummaryAction[])(
    'settles %s success at 14999 ms and removes the deadline before 15000 ms',
    async (action) => {
      jest.useFakeTimers();
      const {api, task} = makeTaskHarness();
      api.sendEvent = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(async () => ({accepted: true}));
      const request = task.requestMidCallSummary(action);
      void request.catch(() => undefined);
      try {
        await flushMicrotasks();
        jest.advanceTimersByTime(SDK_SUMMARY_TIMEOUT_MS - 1);
        const payload: AISummary = {conversationId: CONVERSATION_ID, summaryText: 'On-time summary.'};
        expect(api.resolveFromRtdEvent('MID_CALL_SUMMARY', CONVERSATION_ID, payload)).toBe('resolved');
        await expect(request).resolves.toEqual(payload);
        jest.advanceTimersByTime(1);
        expect(api.pendingRtdRequests.size).toBe(0);
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        stopTask(task);
        api.clearAllRtdRequests();
      }
    }
  );

  it('uses no-network HTTP fakes for 202 success and 503 send failure', async () => {
    const requestMock: jest.MockedFunction<WebexRequest> = jest.fn();
    requestMock.mockResolvedValueOnce({statusCode: 202, body: {accepted: true}});
    const api = new runtime.ApiAIAssistant(createFakeWebex(requestMock));

    await expect(
      api.sendEvent(
        AGENT_ID,
        MAIN_INTERACTION_ID,
        'CTI_EVENT',
        'POST_CALL_SUMMARY_RESPONSE',
        {conversationId: CONVERSATION_ID},
        undefined,
        undefined,
        1234,
        SDK_SUMMARY_TIMEOUT_MS
      )
    ).resolves.toEqual({accepted: true});
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        addAuthHeader: true,
        method: 'POST',
        timeout: SDK_SUMMARY_TIMEOUT_MS,
        uri: 'https://api-ai-assistant.produs1.ciscoccservice.com/event',
      })
    );
    expect(requestMock.mock.calls[0]?.[0].body).toEqual(
      expect.objectContaining({
        agentId: AGENT_ID,
        eventName: 'POST_CALL_SUMMARY_RESPONSE',
        eventType: 'CTI_EVENT',
        orgId: 'org-1',
        publishTimestamp: 1234,
      })
    );
    expect(requestMock.mock.calls[0]?.[0].body.eventDetails).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          actionTimeStamp: expect.any(String),
          conversationId: CONVERSATION_ID,
          interactionId: MAIN_INTERACTION_ID,
        }),
      })
    );

    // webex.request rejects non-success HTTP responses at its transport boundary.
    requestMock.mockRejectedValueOnce(Object.assign(new Error('Service unavailable'), {statusCode: 503}));
    await expect(
      api.sendEvent(AGENT_ID, MAIN_INTERACTION_ID, 'CTI_EVENT', 'POST_CALL_SUMMARY_RESPONSE', {
        conversationId: CONVERSATION_ID,
      })
    ).rejects.toBeDefined();
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it.each(['CONSULT', 'TRANSFER'] satisfies AISummaryAction[])(
    'sends NOT_RECEIVED for %s without a successful summary request',
    async (action) => {
      const {api, task} = makeTaskHarness();
      const sendEventMock: jest.MockedFunction<SendEvent> = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(
        async () => ({accepted: true})
      );
      api.sendEvent = sendEventMock;
      try {
        await expect(
          task.sendMidCallSummaryResponse(
            {
              ...responsePayload(),
              summary: '',
              state: 'NOT_RECEIVED',
              feedback: 'none',
              numberOfTimesViewed: 0,
            },
            action
          )
        ).resolves.toBeUndefined();
        expect(sendEventMock).toHaveBeenCalledTimes(1);
        expect(sendEventMock.mock.calls[0]?.[3]).toBe(`MID_CALL_${action}_SUMMARY_RESPONSE`);
        expect(sendEventMock.mock.calls[0]?.[4]).toEqual(
          expect.objectContaining({
            conversationId: CONVERSATION_ID,
            summary: '',
            state: 'NOT_RECEIVED',
            feedback: 'none',
          })
        );
      } finally {
        stopTask(task);
      }
    }
  );

  it('awaits wrap-up before exactly one post-call response on the same Task', async () => {
    const {api, contact, task} = makeTaskHarness();
    const postWrapUpSequence = aiSummaryFixtures.postWrapUpSend.fulfilled;
    const [sendCall] = postWrapUpSequence.sendCalls;
    const sequence: string[] = [];
    contact.wrapup.mockImplementation(async (payload) => {
      sequence.push(postWrapUpSequence.wrapupCall.method);
      return {accepted: true, payload};
    });
    const sendEventMock: jest.MockedFunction<SendEvent> = jest.fn<ReturnType<SendEvent>, Parameters<SendEvent>>(
      async () => {
        sequence.push(sendCall.method);
        return {accepted: true};
      }
    );
    api.sendEvent = sendEventMock;

    try {
      expect(sendCall.payload.wrapUpCode).toBe(postWrapUpSequence.wrapupCall.payload.auxCodeId);
      await task.wrapup(postWrapUpSequence.wrapupCall.payload);
      await task.sendPostCallSummaryResponse(sendCall.payload);

      expect(sequence).toEqual([postWrapUpSequence.wrapupCall.method, sendCall.method]);
      expect(contact.wrapup).toHaveBeenCalledWith({
        interactionId: MAIN_INTERACTION_ID,
        data: postWrapUpSequence.wrapupCall.payload,
      });
      expect(sendEventMock).toHaveBeenCalledTimes(1);
      expect(sendEventMock.mock.calls[0]?.[0]).toBe(AGENT_ID);
      expect(sendEventMock.mock.calls[0]?.[1]).toBe(MAIN_INTERACTION_ID);
      expect(sendEventMock.mock.calls[0]?.[3]).toBe('POST_CALL_SUMMARY_RESPONSE');
      expect(sendEventMock.mock.calls[0]?.[4]).toEqual(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          feedback: sendCall.payload.feedback,
          numberOfTimesEdited: sendCall.payload.numberOfTimesEdited,
          summary: sendCall.payload.summary,
          wrapUpCode: sendCall.payload.wrapUpCode,
        })
      );
      expect(sendEventMock.mock.calls[0]?.[4]).not.toEqual(
        expect.objectContaining({
          wrapUpCode: postWrapUpSequence.wrapupCall.payload.wrapUpReason,
        })
      );
      expect(sendCall.settlement).toEqual({type: 'fulfilled', value: undefined});
    } finally {
      stopTask(task);
    }
  });
});
