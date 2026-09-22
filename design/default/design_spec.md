# Design Specification: WxCC AI Assistant Mid-Call and Post-Call Summaries

## Overview

This design adds voice-only AI summaries to the existing Contact Center widgets without changing the SDK or Artificer. `@webex/cc-store` remains the only SDK boundary. The existing call-control and AI Assistant containers consume observable, interaction-scoped view models; presentation components remain SDK-free. The existing `<widget-cc-call-control>` tag is retained and receives one optional content-free function property. The existing AI Assistant adaptive-card renderer is reused for receiving-agent content.

The product decisions in `requirement.md` are closed for this run. Earlier human-approval gates are removed. SDK readiness is instead a deterministic D0 package-identity and contract probe. On the target machine, the intended SDK checkout is `/Users/pkesari/Desktop/WorkProjects/webex-js-sdk` (widgets-relative `../../webex-js-sdk`). It was verified clean on branch `cc-summaries` at commit `50602eea08dfc72df57d038529049e46f064f6c5`. That exact path, branch, and commit are the SDK source identity for this run. Under Node 22.14 and the repository-pinned Yarn 3.4.1, the Contact Center production build compiled all 58 source files, declaration emission succeeded, all 33 Contact Center unit suites passed with 1,040 tests, and source style validation reported zero errors. A package probe confirmed that the packed workspace contains both runtime output and declarations while keeping `agentName` internal to the mid-call transport contract. D0 must still rebuild, pack, hash, and seal its exact artifact and must fail closed if the identity changes or any deterministic build or contract probe is nonzero; it must never substitute another checkout or the currently installed package.

The UX authority is requirement version v005, SHA-256 `171ebf24011ff7d28089ddbbd622e4a1ab30557a28c90b9921c9f27c529e81eb`, and the sealed local UX manifest SHA-256 `56bc18d0aec9ce2c89e60deb4610765ab7e75400c73eaec438fb977741c74907`. Figma MCP was not used.

## Feature Disposition Matrix

| Fix # | Disposition | Reference |
| --- | --- | --- |
| REQ-001 | Addressed | requirement.md:L17-L35; [Component: SDK Package Lock and Contract Probe](#component-sdk-package-lock-and-contract-probe) |
| REQ-002 | Addressed | requirement.md:L36-L45; [Component: Interaction Summary Store](#component-interaction-summary-store) |
| REQ-003 | Addressed | requirement.md:L46-L55; [Component: Mid-Call Call Control Integration](#component-mid-call-call-control-integration) |
| REQ-004 | Addressed | requirement.md:L56-L63; [Component: Receiving-Agent AI Assistant Integration](#component-receiving-agent-ai-assistant-integration) |
| REQ-005 | Addressed | requirement.md:L64-L75; [Component: Post-Call Wrap-Up and Host Callback](#component-post-call-wrap-up-and-host-callback) |
| REQ-006 | Addressed | requirement.md:L76-L85; [Component: Interaction Summary Store](#component-interaction-summary-store) and [Component: Mid-Call Call Control Integration](#component-mid-call-call-control-integration) |
| REQ-007 | Addressed | requirement.md:L86-L101; [Component: Post-Call Wrap-Up and Host Callback](#component-post-call-wrap-up-and-host-callback) |
| REQ-008 | Addressed | requirement.md:L102-L112; [Component: Interaction Summary Store](#component-interaction-summary-store) and [Component: Shared Summary Presentation](#component-shared-summary-presentation) |
| REQ-009 | Addressed | requirement.md:L113-L123; [Component: Shared Summary Presentation](#component-shared-summary-presentation) |
| REQ-010 | Addressed | requirement.md:L124-L131; [Component: Interaction Summary Store](#component-interaction-summary-store) and [Component: Shared Summary Presentation](#component-shared-summary-presentation) |
| REQ-011 | Addressed | requirement.md:L132-L138; [Component: UX Evidence and Release Validation](#component-ux-evidence-and-release-validation) |
| REQ-012 | Addressed | requirement.md:L139-L146; [Component: UX Evidence and Release Validation](#component-ux-evidence-and-release-validation) |
| AC-01 | Addressed | requirement.md:L276; [Component: SDK Package Lock and Contract Probe](#component-sdk-package-lock-and-contract-probe) |
| AC-02 | Addressed | requirement.md:L277; [Component: Interaction Summary Store](#component-interaction-summary-store) |
| AC-03 | Addressed | requirement.md:L278; [Component: Mid-Call Call Control Integration](#component-mid-call-call-control-integration) |
| AC-04 | Addressed | requirement.md:L279; [Component: Receiving-Agent AI Assistant Integration](#component-receiving-agent-ai-assistant-integration) |
| AC-05 | Addressed | requirement.md:L280; [Component: Post-Call Wrap-Up and Host Callback](#component-post-call-wrap-up-and-host-callback) |
| AC-06 | Addressed | requirement.md:L281; [Component: Mid-Call Call Control Integration](#component-mid-call-call-control-integration) |
| AC-07 | Addressed | requirement.md:L282; [Component: Interaction Summary Store](#component-interaction-summary-store) |
| AC-08 | Addressed | requirement.md:L283; [Component: Post-Call Wrap-Up and Host Callback](#component-post-call-wrap-up-and-host-callback) |
| AC-09 | Addressed | requirement.md:L284; [Component: Post-Call Wrap-Up and Host Callback](#component-post-call-wrap-up-and-host-callback) |
| AC-10 | Addressed | requirement.md:L285; [Component: Interaction Summary Store](#component-interaction-summary-store) |
| AC-11 | Addressed | requirement.md:L286; [Component: Shared Summary Presentation](#component-shared-summary-presentation) |
| AC-12 | Addressed | requirement.md:L287; [Component: Shared Summary Presentation](#component-shared-summary-presentation) |
| AC-13 | Addressed | requirement.md:L288; [Component: Shared Summary Presentation](#component-shared-summary-presentation) |
| AC-14 | Addressed | requirement.md:L289; [Component: Interaction Summary Store](#component-interaction-summary-store) |
| AC-15 | Addressed | requirement.md:L290; [Component: UX Evidence and Release Validation](#component-ux-evidence-and-release-validation) |
| AC-16 | Addressed | requirement.md:L291; [Component: UX Evidence and Release Validation](#component-ux-evidence-and-release-validation) |

## Current State and Reuse Analysis

The repository already has the correct dependency direction and most of the required integration seams:

- `packages/contact-center/store/src/store.ts` and `storeEventsWrapper.ts` own the SDK object, task listener registration, MobX state, task replacement, hold/resume, conference, task-end, and wrapped-up routing. This is the only acceptable place to call or subscribe to the summary SDK contract.
- `packages/contact-center/task/src/CallControl/index.tsx` adapts observable store data into `CallControlComponent`; `helper.ts` already coordinates consult, transfer, wrap-up, conference, and task listener lifetimes.
- `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/consult-transfer-popover.tsx` renders consult/transfer results, while `call-control.tsx` renders reason selection and the Complete Wrap-Up control. These are the insertion points required by the approved placement rules.
- `packages/contact-center/ai-assistant/src/ai-assistant/index.tsx` is an observer container backed by the same store. `packages/contact-center/cc-components/src/components/AIAssistant/AdaptiveCardRenderer` already supplies the restricted adaptive-card and error-boundary path required for receiving agents.
- `packages/contact-center/cc-widgets/src/wc.ts` registers `widget-cc-call-control` through r2wc and already declares function-valued host properties. Adding `onAISummaryStatusChange` there is additive and does not create an HTML attribute contract or another custom-element tag.
- Jest workspace tests and the root Playwright harness already exist. New AI-summary suites extend these mechanisms; they do not create a second test stack.

The currently installed `@webex/contact-center` declarations do not establish the clarified contract. The required source checkout is available and deterministically buildable at the verified `cc-summaries` identity above. Generated widget code must not use casts, stale installed output, or guessed symbols to bypass that contract. D0 supplies the repository-owned immutable package and receipt first; every consumer builds against it.

## Target Architecture and Package Layout

The target data flow is:

```text
cc:featureEnablement and Task summary events
  -> @webex/cc-store SDK adapter, validator, owner-generation reducer
     -> initiating-agent call-control view model
     -> receiving-agent AI Assistant view model
     -> post-call wrap-up view model
        -> SDK-free @webex/cc-components presentation
           -> optional content-free widget-cc-call-control callback
```

Planned package ownership:

```text
design/default/sdk_package_lock.json         immutable SDK package receipt
vendor/contact-center-cc-summaries.tgz       exact locally packed SDK artifact
tooling/                                     SDK and final release verifiers
packages/contact-center/test-fixtures/       raw valid, malformed, race, and failure payloads
packages/contact-center/store/               validation, SDK calls/events, state, retention
packages/contact-center/cc-components/       text/card presentation and controls
packages/contact-center/task/                consult/transfer and wrap-up orchestration
packages/contact-center/ai-assistant/         receiving-agent container integration
packages/contact-center/cc-widgets/           optional host callback registration
playwright/                                  browser, accessibility, and visual evidence
```

The store key is `(interactionId, agentId, ownershipGeneration)`. A generation increments whenever ownership moves to a different agent or a transfer/conference request establishes a new current owner. `actionTimestamp` is compared only inside the same key; greater values win and equal values use last arrival. Promise settlements and events capture the key plus a request generation and are discarded if it no longer matches. No SDK cancellation is invented.

## Component: SDK Package Lock and Contract Probe

This component addresses REQ-001 and AC-01. DAG owners are D0-sdk-package-contract and D9-release-validation.

D0 accepts the SDK checkout only when its canonical path is `/Users/pkesari/Desktop/WorkProjects/webex-js-sdk`, `git rev-parse --abbrev-ref HEAD` is exactly `cc-summaries`, `git rev-parse HEAD` is exactly `50602eea08dfc72df57d038529049e46f064f6c5`, and the worktree is clean. The primary source locator is `WEBEX_JS_SDK_DIR`; for this target machine it must be set to that absolute path. If the variable is absent, the verifier may inspect only the documented widgets-relative candidate `../../webex-js-sdk`, resolving it canonically before comparison. It runs the SDK's pinned Yarn through Corepack under Node 22.14, performs the documented build, packs the `@webex/contact-center` workspace, copies the tarball into `vendor/`, pins the widgets dependency to the file artifact, and refreshes `yarn.lock` in immutable mode. It rechecks path, branch, commit, and cleanliness immediately after build and pack so a moving or locally modified source cannot be sealed.

`design/default/sdk_package_lock.json` records schema version, absolute source path for local audit, branch, commit, package name/version, Node and Yarn versions, exact build and pack commands, tarball repository path and SHA-256, and every declaration file/hash used by the probe. The receipt is regenerated from facts; no pass boolean is trusted.

The contract test imports both declarations and built runtime exports and proves the four Task methods, `AGENT_EVENTS.FEATURE_ENABLEMENT === 'cc:featureEnablement'`, the three Task event values, all payload fields, numeric counters/timestamps, typed section keys, receiving-agent adaptive-card fields, and absence of invented cancellation or pre-content eligibility APIs. It runs a fake-clock probe that proves `AI_SUMMARY_REQUEST_TIMEOUT_MS === 20_000` while receiver-buffer and orphan-retention durations remain `30_000`. If the source still implements the older 30-second request default described in `ai-summary.md`, D0 stops and reports the contract discrepancy instead of changing SDK source or weakening the widget requirement.

## Component: Interaction Summary Store

This component addresses REQ-002, REQ-006, REQ-008, REQ-010, AC-02, AC-06, AC-07, AC-08, AC-10, AC-11, AC-13, and AC-14. DAG owners are D1-summary-contract-fixtures, D2-interaction-summary-store, and D9-release-validation.

The store adds closed, discriminated state rather than retaining raw payloads in components:

- Capability records hold `interactionId`, `midCallEnabled`, `postCallEnabled`, and monotonic UTC `actionTimestamp`. Missing, malformed, cross-interaction, non-voice, unauthorized, or initialization-failure input is unavailable.
- Request state is `idle`, `loading`, `ready`, `generation-error`, or `unsupported`. Role is `initiator`, `receiver`, or `post-call`. Content is either normalized typed sections, normalized plain text, or a validated adaptive-card object; role-incompatible fields are discarded immediately.
- Mid-call response state holds numeric viewed/edited/copied counters, feedback, edited typed sections, and action type. Post-call response state additionally holds wrap-up code and a lifecycle of editable, frozen-after-wrap-up, submitted, or response-failed.
- Raw summary content never enters logger arguments, callback details, URL state, persistence APIs, analytics, or metrics. The store exposes only content-free status and sanitized category codes.

The store subscribes to `cc:featureEnablement`, `task:midCallSummary`, `task:midCallSummaryForReceivingAgent`, `task:postCallSummary`, and the existing wrapped-up lifecycle event. Listener ownership follows task hydration and replacement exactly as current real-time-assist listeners do. Receiving-agent eligibility starts only with its content event. Hold/resume and task end preserve mid-call state; wrap-up completion, interaction change, sign-out, or SDK-session end clears it. Successful post-call state clears on interaction change. Frozen response-failure state clears only on the backend wrapped-up event.

Every explicit user request calls the SDK. The client performs no automatic retry. A user Retry after generation failure creates a new request and replaces content only when the response is current by timestamp and generation. A 20-second pending mid-call guard disables further consult/transfer initiation. A late or stale settlement cannot mutate current state even if the underlying SDK event still fires.

For A-to-B-to-C transfer, the common interaction ID remains, ownership generation advances for C, C starts counters at zero, and B's summary remains only until C's valid summary is committed. A conference addition follows the same per-agent generation rule and requests history from call start. Participant removal does not clear another current participant's state. Consult-then-transfer and direct transfer share the same reducer transitions.

Viewed increments after a successful reveal action, edited after an accepted content-changing edit, and copied only after `navigator.clipboard.writeText` fulfills. Failed, blocked, stale, and no-op actions do not increment. Counters persist for the same key across hold/resume and remount and reset for a different agent generation.

## Component: Shared Summary Presentation

This component addresses REQ-008, REQ-009, REQ-010, AC-11, AC-12, and AC-13. DAG owners are D3-shared-summary-presentation and D9-release-validation.

SDK-free `AISummaryContent`, `AISummaryActions`, and `AISummaryError` components accept normalized props and callbacks. Typed initiating-agent fields render in SDK-defined order as labeled key-value text; post-call typed fields render as individually labeled editable sections. Plain initiating-agent mid-call text fills the bottom-most popover text box; plain post-call text is an unlabeled paragraph in the summary area. All typed and plain values use React text nodes and `dir="auto"`.

Receiving-agent content delegates only to the existing restricted `AdaptiveCardRenderer`. It does not execute scripts, expand adaptive-card actions, or fall back to typed/plain fields. A successful-looking but role-unrenderable payload shows `The summary is not available`. Unauthorized and initialization-failure states omit the summary surface. All other generation categories show `Having trouble generating summary`.

Actions expose the exact accessible label and identical tooltip: `View summary`, `This is helpful`, `This isn't helpful`, `Copy Summary`, and post-call `Retry`. Like/dislike are mutually exclusive. Mid-call selection waits for a successful SDK update before painting; re-selection sends another update and remains selected; opposite selection sends another update and replaces it. Post-call selection is local pending state included only in the final response. It shows `Pending submission`, changes to `Submission not confirmed` after response failure, and removes the description after confirmed success.

No feature-owned live region or announcement is added. When a focused control is actually removed, focus moves to the next focusable control in document order or the existing panel focus target. Loading, ready updates, expand/collapse, and text refresh do not otherwise move focus. Existing semantic theme tokens, visible focus, and forced-colors behavior are inherited. Content wraps with no horizontal scrollbar and receives a bounded vertical scroll region using the same container behavior as call control.

## Component: Receiving-Agent AI Assistant Integration

This component addresses REQ-004 and AC-04. DAG owners are D4-receiving-ai-assistant and D9-release-validation.

The AI Assistant observer reads the current receiver view model from the store. A current receiving-agent event creates a content-free `View summary` notification; opening it increments viewed and reveals the validated adaptive card in the existing AI Assistant panel. Copy serializes the renderer's approved text representation only on direct user gesture. Like/dislike call the mid-call SDK response/update path, and a successful HTTP response is sufficient confirmation.

The container ignores `sections` and `summaryText` for this role. It keeps the existing real-time-assist behavior isolated so an AI-summary event cannot overwrite unrelated assistant cards. Task replacement rebinds listeners through the store; unmount removes component subscriptions without cancelling the SDK request. A stale agent-generation event is discarded.

## Component: Mid-Call Call Control Integration

This component addresses REQ-003, REQ-006, AC-03, and AC-06. DAG owners are D5-mid-call-call-control and D9-release-validation.

Opening consult or transfer creates an initiating-agent request for the exact action type and disables another consult/transfer action while the 20-second request is pending. Destination results remain first; the `View summary` trigger and summary region render after results. Structured fields are collapsed in SDK order into labeled key-value lines in the bottom-most text box. If structured fields are absent, non-empty `summaryText` is used. Adaptive-card JSON is ignored.

The initiator may edit text, copy, like, or dislike. Before the existing consult/transfer API runs, orchestration freezes the current edited sections and counters and calls `sendMidCallSummaryResponse` once with the correct action type and agent name. The existing consult/transfer method signatures are unchanged. Cancel sends the SDK's approved cancelled state and does not invoke the downstream action. Direct transfer, consult-to-transfer, additional transfer, and conference addition all use the same owner-generation safeguards and current interaction ID.

## Component: Post-Call Wrap-Up and Host Callback

This component addresses REQ-005, REQ-007, AC-05, AC-07, AC-08, and AC-09. DAG owners are D6-post-call-wrap-up, D7-host-status-callback, and D9-release-validation.

After a wrap-up reason is selected, the summary region appears before Complete Wrap-Up. Each explicit request calls `requestPostCallSummary`; adaptive cards are ignored. Typed sections render in declared order and permitted fields are editable. If typed sections are absent, non-empty `summaryText` renders as one unlabeled paragraph. Retry after generation failure is a fresh request, not a response retry.

Submitting first invokes the existing wrap-up path. If it fails, the editable draft remains and the full action can be retried. When wrap-up succeeds, the store freezes the exact edited typed response, counters, feedback, and wrap-up code, then calls `sendPostCallSummaryResponse` once. On response success it records submitted. On response failure it retains that exact frozen payload, emits content-free `response-failed`, offers no response-only retry, and waits for the backend wrapped-up event before discarding it.

The optional callback is exactly:

```typescript
onAISummaryStatusChange?: (
  detail:
    | {kind: 'mid-call' | 'post-call'; state: 'available' | 'unavailable'}
    | {kind: 'post-call'; state: 'submitted' | 'response-failed'}
) => void;
```

It is threaded through `CallControlProps`, invoked from content-free store transitions, and declared as a function prop in the existing r2wc registration. No summary content, interaction or customer identifier, counter, feedback, or raw error is exposed. Omitting the callback preserves current behavior and the existing tag.

## Component: UX Evidence and Release Validation

This component addresses REQ-011, REQ-012, AC-15, and AC-16. DAG owners are D8-browser-ux-validation and D9-release-validation.

The local Figma JSON pairs and PNG screenshots are immutable test inputs. Browser fixtures drive both journeys through deterministic SDK mocks and export render evidence at the sealed source dimensions. The visual loop compares each rendered PNG with its sealed source, records the runtime comparison receipt, fixes production CSS/components, and repeats within the runtime's five-iteration policy. States without screenshots receive a structural-only receipt tied to their journey and behavior tests.

Release validation rehashes the SDK package lock, requirement, design, DAG, UX manifest, sources, screenshots, and test outputs; builds all affected workspaces; runs type, unit, browser, accessibility, visual, privacy, and provenance checks; and verifies zero unhandled promise rejection. It does not alter source or mark review that did not occur.

## Figma JSON Reconstruction Assessment

Figma MCP was not used. The acquisition mode is `json`, the UX source identity SHA-256 is `50073d2c12591ac4c682e8599c1ecae9f2797cae9ed85542bfebf068b5ebfecb`, and the UX source-manifest SHA-256 is `a266410383fc773812cd0a3352313d8db5e3e3828d5e584aaeee1df42709f162`.

### State and Node Mapping

| Source | Root node | Journey state | Scene raw SHA-256 | Text raw SHA-256 | Screenshot and SHA-256 | Size |
| --- | --- | --- | --- | --- | --- | --- |
| UX-001 | 8061:880455 | JNY-001:mid-call-summary | 7183f1b874339e30a7c820179d63fabc500a1721f2206194a3fe9c4317880603 | 804b66441dcd6a1ae3c43d3907bd255c3db2a1457539b3f7e3888d593320d666 | S01 / 5fee49d4111bb9b5a950e441821abc001aa99a39fdd6607b7169e2754654db0f | 964x1164 |
| UX-002 | 5669:263180 | JNY-002:generating | 2c1ade086aaf3bea8f9719f37b6e3a06ca1d7e93737cea58b368bd49efbffd4a | 42921d9839a89fa948acd22563579a62472b14a8cc6121b2d0c7883d5b71f3ce | S02 / 0de0aeb692ae83a922898009577b11d9d027b21c8653b05c947ba03e64bc8a21 | 884x1242 |
| UX-003 | 5669:263754 | JNY-002:editing | 9e9378e384df92e816a3c05e7faff8c800da2e1f6334e149a9522e24c837aa66 | 58457c269bf1c9efff9f43e63a92f33a7b08f8f18ad43653403084b5cb46fc50 | S03 / 92b2ef6fe8473c96f422ebcfece7699d5e3360503921ff40e36b281e355ba6f1 | 886x1242 |
| UX-004 | 5669:264384 | JNY-002:like-hover | e084f1942b911286d4eb58e7db3082130e808e12c5197fba565d069860966e13 | c4e6025190ce7f9f6b0b81fabb3eb80c4686f69f5fb4b2ac3769896d203000b1 | S04 / 3f9013a7a0772aeef98b55bf8e301957c74dca912d500e87dfeaf12f55fc50ca | 806x1248 |
| UX-005 | 5669:264503 | JNY-002:like-selected | 4330bf697349d52df2493b1675343d5d27c60075eddc0a6a96258b29f0fa79fb | 6a08810d6325a5cb7290712373047c61ed1044e7ca6f708d3ab202f80ad4ba00 | S05 / 3628b688d6d84ee61ed1c22e1b77ee6aabb7026656ff8d9d15739b549bdeeeca | 804x1244 |
| UX-006 | 5669:264622 | JNY-002:dislike-hover | 41f147d96db6b2133f0f6994561cc577b0ae121ad9cf966cfdcc300f8b6d9f8e | f22fa4cce01a2cc8cb9d7ce334c261176fce196116ea190ef06d5f9c26242268 | S06 / 098c803e608ce2cc2f8c79ec12208a41ce5ba8ee2ffc66f2071801e2b4872641 | 866x1242 |
| UX-007 | 5669:264860 | JNY-002:dislike-selected | d78d2465ad40c21102a167d5cce976f1541e9a26e415f45069f91297c2ca6550 | 5dfe180ec35e38af7df336bbe1acba5b6a5e58c7c476a5fa7d60aacf96e1cc6d | S07-UX / 7510c740d754cd9e612fc0cfb8ec080682f66a927e941c705cfe13d167920203 | 806x1244 |
| UX-008 | 4920:216835 | JNY-002:copy-hover | 40d15e6e6e951c6ff05d451add94cde1e2a6ed1517489ba3c7153d104631eb61 | 15756650eb613cc81bfdc0d5aaa8f75f7e2009c66a79c28dd108ad39aab0caf7 | S08 / 3b1e78288b4316b4c1575f38112d924c319431f8f07bdcd88a11343a9fee6e21 | 882x1264 |
| UX-009 | 4920:216954 | JNY-002:copy-selected | 7b8b3f8148adb46ae59cf36ffdb63e9f81f0035f7d14a433840183df46926a7a | 059a61503ef5c9eb452b7c03478bb94387143f9d2d84bc0bb433e18b8e003e33 | S09 / 71e19e3be8da9045fce78e674006cd8963bd95f15642ff6a3884686db5c5e4b1 | 806x1248 |
| UX-010 | 5669:264979 | JNY-002:error | 3ab596f96b5a49eb56822816be31f9d4f739bf79f4a50ad09521ccfc491b8de7 | 90de99f4579e9eacadf068fa6fb48eff70eadad76e97d342094363b22fe0dbaa | S10 / 6d54cafe81f3693a16017e19adff9aaaf4a1adbae67b779a3f49d6c1fda15ff5 | 886x1242 |

All source pairs also retain their pair and projection hashes in `.matrix/results/prog-mini-js/ux_input_manifest.json`; the table above records the gate-required raw subjects and their one-to-one state/screenshot bindings.

### Component Mapping

UX-001 maps the mid-call popover hierarchy to the consult/transfer summary region in D5. UX-002, UX-003, and UX-010 map generating, editing, and generation-error states to the wrap-up region in D6. UX-004 through UX-009 map hover and selected action styling to the shared action controls in D3. Receiving-agent adaptive-card layout reuses the established AI Assistant panel and renderer in D4; the written role contract governs because no separate receiving-panel screenshot was supplied.

### Layout Interpretation

The root nodes describe 400-480 CSS-pixel popovers while the screenshots are approximately two device pixels per CSS pixel. Implementation uses existing popover widths, logical block/inline spacing, and responsive containment rather than hard-coding screenshot bitmap dimensions. Summary content follows reason selection and precedes Complete Wrap-Up. Mid-call content follows destination results and uses the bottom-most text box. Text wraps, controls remain visible, and long content scrolls vertically inside the existing panel boundary without horizontal scrolling.

### Source Conflicts and Ambiguities

Screenshot-visible geometry and copy win over JSON, and JSON wins over prose. The single mid-call source does not depict every feedback/copy state, so D3 applies the corresponding post-call control treatment while preserving the mid-call container. `ai-summary.md` documents an older 30-second SDK default, while requirement.md fixes this run at 20 seconds; the D0 contract probe treats 20 seconds as blocking. Figma content examples do not choose role payload precedence; requirement.md does: initiator and post-call ignore cards, receiver ignores typed/plain content. Figma offers no authority for Agent Desktop-native placement, localization, feature-owned live regions, telemetry, or extra themes, all of which remain outside scope.

### Typography and Exact Text

The sealed text JSON and screenshots establish `Generating summary...`, `Summary of your conversation`, `Choose a reason to wrap up`, `Complete wrap-up`, `AI-generated`, `Retry`, and `Having trouble generating summary`. Requirement.md supplies exact tooltips and accessible labels when the source does not expose them. Existing Momentum typography and semantic tokens are reused; no copied font metrics or feature-only token map is introduced. Dynamic user content is plain text with `dir="auto"`.

### Interaction and Accessibility

The two journeys cover request, loading, ready, edit, hover, selected, copy, generation error, wrap-up response result, and ownership change. Keyboard order follows DOM order. Removed focused controls advance focus; ordinary state changes do not. Screen reader names match visible tooltips, but the feature deliberately adds no announcement or live-region behavior. Selected feedback has a non-color indication. Clipboard writes require a direct gesture and report success only through local control state and counters.

### Render Compare Refine Plan

D8 renders every screenshot-backed state at the exact sealed pixel dimensions and one-device-scale comparison configuration required by the runtime plan, exports the sealed target, produces rendered and diff PNGs plus JSON records, and binds them to the source identity. Geometry, hierarchy, content, interactions, focus, and accessibility are blocking under interaction-weighted fidelity; justified inherited-theme color variance is documented. Production code is corrected and rerendered until the runtime threshold is met or a concrete platform constraint is recorded, within five iterations. Structural-only states still require browser behavior and accessibility evidence.

## UX Evidence and Productionization

The production UX contract covers responsive widths, keyboard operation, screen reader labels, loading, ready, error, empty/unsupported, browser execution, long-content overflow, and current-theme behavior. Ten sealed PNGs are visual ground truth and ten scene/text pairs are structural and copy authority. The implementation must not derive production assets from screenshots or embed those screenshots in the widget.

Browser evidence includes initiating and receiving mid-call roles, post-call generating/editing/action/error states, consult and transfer, additional transfer, conference addition/removal, hold/resume, rapid interaction switch, stale settlement, retry-as-new-request, wrap-up failure, response failure, and wrapped-up cleanup. Automated accessibility checks cover names, tooltips, tab order, focus recovery, contrast, forced colors inherited from the host, text wrapping, and `dir="auto"`; no manual screen-reader or feature-live-region receipt is claimed.

## Cross-Cutting Concerns

- Security and privacy: validate every SDK payload at the boundary; render text as text; route cards through the restricted renderer; never log or persist content; keep callback details content-free; allow OS clipboard egress only after direct gesture.
- Concurrency: bind all work to interaction, agent, owner generation, request generation, and timestamp. Remove listeners on task replacement and unmount. Ignore stale settlements and guarantee zero unhandled rejection.
- Error policy: hide unauthorized and initialization failure; show generic generation copy for other request failures; show unavailable copy for unrenderable success; never auto-retry; never retry a frozen response failure.
- Retention: preserve mid-call across hold/resume and task end through wrap-up, successful post-call until interaction change, and frozen response failure until backend wrapped-up. Clear on sign-out and SDK-session end.
- Compatibility: no SDK/workflow source edits, no new custom-element tag, no breaking props, no Agent Desktop integration, no new telemetry vocabulary, no translation stack, no RTL layout.
- Performance: keep normalized in-memory state bounded to active interactions, reuse memoized view models, avoid storing duplicate card/text bodies, and clean inactive generations deterministically.

## Test Strategy

1. SDK package tests prove the exact branch/commit/tarball/declaration/runtime contract and 20-second behavior before widget compilation.
2. Fixture and store tests cover valid and malformed capabilities, typed/plain/card role precedence, all normalized errors, timestamp and equal-arrival ordering, repeated requests, ownership changes, transfer/conference history rules, hold/remount retention, counters, feedback, wrap-up ordering, frozen response failure, and cleanup.
3. Component tests cover exact text, edit mapping, card restriction, unsupported fallback, copy fulfillment/rejection, feedback selection, focus recovery, wrapping, and callback detail allowlists.
4. Integration tests cover CallControl placement and sequencing, AI Assistant receiving flow, listener rebinding, r2wc function-property compatibility, and absent-callback behavior.
5. Playwright tests cover both journeys, keyboard, automated accessibility, responsive overflow, forced colors, direct clipboard gesture, rapid races, and every screenshot state. The Artificer render/compare/refine receipts bind the visual evidence.
6. Release tests run affected workspace type checks and unit tests, root build, browser suite, privacy scan, deterministic UX validation, DAG acceptance, and provenance/hash verification.

## Implementation DAG Summary

| Task | Purpose | Depends on |
| --- | --- | --- |
| D0-sdk-package-contract | Build, pack, pin, and probe exact `cc-summaries` SDK | none |
| D1-summary-contract-fixtures | Add immutable valid, failure, and race fixtures | D0 |
| D2-interaction-summary-store | Implement validation, reducer, SDK routing, retention, and counters | D0, D1 |
| D3-shared-summary-presentation | Implement SDK-free typed/plain/card-adjacent UI and actions | D1 |
| D4-receiving-ai-assistant | Integrate receiver events with existing AI Assistant renderer | D2, D3 |
| D5-mid-call-call-control | Integrate initiating consult/transfer summaries and sequencing | D2, D3 |
| D6-post-call-wrap-up | Integrate post-call request/edit/freeze/submit behavior | D2, D3, D5 |
| D7-host-status-callback | Add the optional content-free existing-tag callback | D4, D6 |
| D8-browser-ux-validation | Add browser, accessibility, concurrency, and visual evidence | D4, D5, D6, D7 |
| D9-release-validation | Verify all requirements, acceptance criteria, hashes, tests, and provenance | D8 |

Parallel work is limited to tasks with disjoint files. D4 and D5 may proceed together after D2/D3. D6 follows D5 because both touch call-control orchestration. D7 follows D6 because it threads the final status surface. D9 is edit-free except for its dedicated verifier and test files.
