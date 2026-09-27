# Contact Center AI summary SDK contract

This document describes the concrete SDK API consumed by the widget store. Product behavior,
role-specific rendering, eligibility, counters, accessibility, privacy, and sequencing are governed
by [`requirement.md`](requirement.md). This API alignment was approved during alpha recovery on
2026-09-27; it does not remove any product requirement.

The inspected source is the clean sibling `webex-js-sdk` checkout, branch `cc-summaries`, commit
`15f3da706d84c10bc632abe252cea202a70ae212`. The sealed package is
`@webex/contact-center@3.12.0-cc-summaries.15f3da706d84`, selected through the private root's
`file:./vendor/contact-center-cc-summaries.tgz` resolution. The exact tarball, installed-file and
declaration hashes live in `design/default/sdk_package_lock.json`; that seal is historical evidence
and is not rewritten merely to claim passing validation. A subsequent approved SDK fix requires
a new honest build/admission record.

## Public Task methods

```typescript
requestPostCallSummary(): Promise<AISummary>;
sendPostCallSummaryResponse(response: AISummaryResponse): Promise<void>;
requestMidCallSummary(action: AISummaryAction): Promise<AISummary>;
sendMidCallSummaryResponse(response: AISummaryResponse, action: AISummaryAction): Promise<void>;
readonly aiSummaryCapabilities: Readonly<AISummaryCapabilities>;
```

Initiating mid-call and post-call content is delivered through the request Promise. There is no
public `TASK_POST_CALL_SUMMARY`, `TASK_MID_CALL_SUMMARY`, or
`TASK_MID_CALL_SUMMARY_FOR_RECEIVING_AGENT` export in this SDK. The older proposed
`PostCallSummaryEventPayload`, `MidCallSummaryEventPayload`, and
`MidCallSummaryReceivingAgentPayload` exports do not exist either. Consumers use the public
`AISummary` result type and the two Task events below.

## Task events

| SDK enum member | Event string | Payload / behavior |
| --- | --- | --- |
| `TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED` | `task:midCallSummaryReceived` | Receiving-agent `AISummary` content; the store validates correlation and the restricted adaptive-card rendering contract. |
| `TASK_EVENTS.TASK_FEATURE_ENABLEMENT` | `task:featureEnablement` | Interaction-scoped `AISummaryFeatureEnablement`; only exact boolean `true` enables a capability. |

Subscribe on the matching Task and remove the exact listener at lifecycle cleanup. Receiving-agent
eligibility begins only when its content event arrives. Capability events alone do not establish
receiving-agent content eligibility. SDK TaskManager routes backend post-call/mid-call messages to
the internal request correlation machinery; widgets must not subscribe to invented public aliases.

```typescript
task.on(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, onFeatureEnablement);
task.on(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, onReceivingSummary);
const initiatingSummary = await task.requestMidCallSummary('CONSULT');
const postCallSummary = await task.requestPostCallSummary();
// Matching lifecycle cleanup:
task.off(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, onFeatureEnablement);
task.off(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, onReceivingSummary);
```

These examples describe the SDK boundary. Production widgets access it only through `@webex/cc-store`.

## Exported payload types

The following fields are read from the packed public declarations. Optional fields remain optional;
widgets must validate untrusted incoming values at runtime.
`AISummaryCapabilities` is the declaration-local alias used by `ITask`; it is not independently
re-exported by the package entrypoint. Consumers can derive it from `ITask['aiSummaryCapabilities']`.

```typescript
type AISummaryAction = 'CONSULT' | 'TRANSFER';
type AISummaryFeedback = 'none' | 'thumbs_up' | 'thumbs_down';
type AISummaryState = 'DEFAULT' | 'EXCLUDED' | 'IGNORED' | 'MID_CALL_CANCELLED' | 'NOT_RECEIVED';

type AISummarySections = {
  initialContactReason?: string;
  additionalContactReasons?: string;
  additionalContext?: string;
  keyActionsTaken?: string;
  nextSteps?: string;
  reasonForTransferOrConsult?: string;
};

type AISummary = {
  conversationId: string;
  adaptiveCard?: Record<string, unknown>;
  adaptiveCardId?: string;
  editAdaptiveCard?: Record<string, unknown>;
  editAdaptiveCardId?: string;
  areTranscriptsAvailable?: boolean;
  languageCode?: string;
  resolution?: string;
  sections?: AISummarySections;
  suggestedWrapUpCodes?: Array<{name: string; [key: string]: unknown}>;
  suggestedWrapUpCodesMessage?: string;
  summaryText?: string;
  timestamp?: number;
  [key: string]: unknown;
};

type AISummaryFeatureEnablement = {
  interactionId: string;
  midCallEnabled?: boolean;
  postCallEnabled?: boolean;
  actionTimestamp?: number;
  [key: string]: unknown;
};
type AISummaryCapabilities = Required<Pick<AISummaryFeatureEnablement, 'midCallEnabled' | 'postCallEnabled'>>;

type AISummaryResponse = {
  summary: AISummarySections | string;
  feedback: AISummaryFeedback;
  state: AISummaryState;
  numberOfTimesViewed: number;
  numberOfTimesEdited: number;
  numberOfTimesCopied: number;
  summaryReceived?: boolean;
  wrapUpCode?: string;
};
```

`AISummaryResponse` has no timestamp field. The SDK generates transport timestamps when sending.
Result ordering reads `AISummary.timestamp`; feature-enablement ordering reads
`AISummaryFeatureEnablement.actionTimestamp`. The store normalizes these into its internal ordering
model and prevents a lower timestamp or stale ownership generation from replacing current state.

## Rendering and response composition

Initiating mid-call and post-call content use supported structured section strings, then nonblank
`summaryText` if structured content is absent. They ignore adaptive cards. Receiving-agent content
uses the restricted adaptive-card renderer and ignores structured/plain alternatives. An unsupported
successful response displays `The summary is not available` under the product eligibility rules.

Structured response keys are the SDK keys above. Labels are presentation data and never become
wire keys. Preserve original section bytes and accepted edits, including intentionally cleared
values; do not send rendered labels or inject HTML. `resolution` is optional display-only Outcome
metadata outside `AISummarySections` and must not become an additional submitted section.

The shared `AISummaryState` union applies to both post-call and mid-call responses. The SDK accepts
an empty `summary` string with `state: 'NOT_RECEIVED'`, zero counters, and `feedback: 'none'` for an
unavailable mid-call summary. It does not require a prior successful request to send this response;
it derives correlation from the Task if no retained request context exists. This supports the
required unavailable-response invocation before consult/transfer while preserving telephony progress
after a failed summary response. `summaryReceived` is accepted in the public type but the inspected
SDK does not forward it as a transport field.

## SDK transport and sequencing

| Operation | Backend event |
| --- | --- |
| Request post-call | `GET_POST_CALL_SUMMARY` |
| Request CONSULT mid-call | `GET_MID_CALL_CONSULT_SUMMARY` |
| Request TRANSFER mid-call | `GET_MID_CALL_TRANSFER_SUMMARY` |
| Send post-call response | `POST_CALL_SUMMARY_RESPONSE` |
| Send CONSULT mid-call response | `MID_CALL_CONSULT_SUMMARY_RESPONSE` |
| Send TRANSFER mid-call response | `MID_CALL_TRANSFER_SUMMARY_RESPONSE` |

The SDK sends these through `ApiAIAssistant.sendEvent` as `CTI_EVENT`, using the Task's interaction,
agent, and conversation correlation. Request conversation identity is
`task.data.interaction.mainInteractionId` when present, otherwise the Task interaction ID.
Response sends retain successful request correlation when available. Response metadata contains the
summary, feedback, state and counters; post-call adds `wrapUpCode`, while mid-call adds `agentName`.
Widgets supply the selected wrap-up code ID, not its display label.

The SDK request/transport timeout is 15,000 ms. There is no public summary cancellation method.
The widget does not automatically retry failures or propagate late results after timeout. A supported
explicit post-call Retry starts a fresh request. The HTTP transport's fulfilled/rejected Promise is
the send confirmation boundary; `webex.request` rejects failed HTTP requests. Tests must simulate a
503 by rejecting that transport Promise, not by resolving a fake success object with status 503.

Mid-call response submission precedes the existing consult/transfer action. A pending generation
disables further initiation. Complete wrap-up first, using the existing wrap-up API and payload,
then send the frozen post-call response exactly once through the same captured Task reference.
No response-only retry is added. The packed runtime probe verifies that the captured Task can send
after its wrap-up Promise fulfills. This retained operation does not permit arbitrary new summary
requests after terminal cleanup.

The store must retain interaction/agent/generation ownership, stale-result rejection, per-role
content and counters, and the final frozen post-call response as specified in `requirement.md`.
SDK implementation details do not remove transfer/conference or terminal cleanup requirements.

## Validation and known sealed-package defect

`packages/contact-center/store/tests/ai-summary-contract.ts` loads the actual candidate package
entrypoint, with HTTP fakes only at the transport boundary. It checks public method signatures,
feature events, receiver events, CONSULT/TRANSFER correlation, 15-second timeout cleanup, failed
HTTP sends, unavailable mid-call responses, and same-Task post-wrap-up response submission. Its
TypeScript compiler probe resolves `@webex/contact-center` to the same candidate's declarations.

`tooling/src/ai-summary-sdk-lock.js verify-sdk` always extracts the hash-matched tarball and validates
its reachable public declaration graph before running that suite. Legacy receipts without
`packedRuntimeHarness` do not skip validation. Installed bytes and lock checksum are also checked;
an installed conforming package cannot hide a malformed candidate declaration.

At the inspected commit, `ApiAIAssistant.requestAndWaitForRtd` clears the previous same-type,
same-conversation request's timer and replaces the pending map entry without rejecting its Promise.
A CONSULT request superseded by TRANSFER therefore remains pending indefinitely. The regression
requiring that superseded Promise to settle remains failing and blocks SDK verification. Fixing this
requires explicit SDK repair and a new built/sealed candidate; changing an event alias or silently
removing the regression does not resolve it.

## Widget release evidence

SDK admission, widget package inspection, and final release evidence are separate checks. Local
development may use the private root resolution; SDK descriptors in workspace artifacts and root
dependency maps must be plain registry SemVer. Packing inspects actual archive paths and manifests,
rejects vendored archives, and compares the actual file list to its recorded receipt.

Release gates require explicit passing status, repository-contained evidence paths, matching SHA-256
bytes, and the current release HEAD. A hash-shaped string or a missing status is not proof of a pass.
Existing archived flow evidence remains unchanged. Only actually executed passing checks may produce
new success evidence. Widget logs/callbacks never include summary content, identifiers or raw errors.
