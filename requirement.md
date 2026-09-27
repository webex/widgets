# Requirement: Add WxCC AI Assistant mid-call and post-call summary widgets

## Branch

ai-assistant-summary

## Description

Add voice-only AI-generated mid-call and post-call summaries to the existing Contact Center widgets. The implementation must preserve the existing Contact Center package dependency direction: UI components do not call the SDK directly, the task and AI Assistant containers orchestrate UI behavior, and `@webex/cc-store` remains the SDK boundary.

This requirement is the product authority for the decisions below. `ai-summary.md` is the behavioral and wire-contract authority, while the conforming Contact Center SDK implementation is the public TypeScript API authority. When they conflict, the explicit decisions in this requirement govern widget behavior; otherwise the SDK adapter must accurately translate the concrete SDK contract without inventing methods, fields, events, or retries. In particular, the intended public feature-enablement surface is the task-owned `TASK_EVENTS.TASK_FEATURE_ENABLEMENT` / `task:featureEnablement` API from the `cc-summaries` branch.

The in-development SDK source is expected on the `cc-summaries` branch of the sibling `webex-js-sdk` checkout. A development package may be built for this run, but it must be made immutable before use by recording the SDK repository path, branch, Git commit, staged package version, build command, packed tarball SHA-256, and public declaration hashes. The upstream monorepo intentionally assigns publishable package versions during release packaging, so the clean source workspace manifest is not required to contain `version`. D0 must leave that checkout byte-for-byte clean, create an isolated stage at the recorded commit, and assign the deterministic development version `<registry-base>-cc-summaries.<12-character-commit>`, where `<registry-base>` is the plain `X.Y.Z` base of the sole existing publishable `@webex/contact-center` dependency after removing any prerelease suffix. The staged and packed manifests, lock receipt, and tarball must all record that exact version. This run does not require that development-only version to be published to a registry: the private root may select the sealed tarball, while every publishable workspace manifest must retain a plain registry-resolvable dependency and every packed widget artifact must exclude the private override and vendored tarball. The widget must never fall back to the currently installed non-conforming `@webex/contact-center` package during validation.

Figma MCP must not be used for this run. The local Figma scene-graph JSON, text JSON, and screenshots declared under `## UX Sources` are the complete design inputs. For visible conflicts use this precedence: screenshot, matching scene-graph/text JSON, then the written accessibility/product table in this requirement. Screenshots are visual ground truth; scene-graph JSON is structural and measurement authority; text JSON is copy authority.

### REQ-001: SDK package identity and public contracts

- Build `@webex/contact-center` from the exact `cc-summaries` source commit with Node 22.14 and the SDK repository's pinned Yarn version.
- In an isolated stage at that commit, assign the deterministic development version defined above, build the workspace, and pack it into a local tarball usable by this widget repository. Record the branch, commit, staged and packed package version, build command, tarball hash, declaration paths, and declaration hashes in a repository-owned lock receipt.
- Verify the public declarations and runtime behavior for:
  - `task.requestPostCallSummary(): Promise<AISummary>`;
  - `task.sendPostCallSummaryResponse(response: AISummaryResponse): Promise<void>`;
  - `task.requestMidCallSummary(action: AISummaryAction): Promise<AISummary>`;
  - `task.sendMidCallSummaryResponse(response: AISummaryResponse, action: AISummaryAction): Promise<void>`;
  - `TASK_EVENTS.TASK_FEATURE_ENABLEMENT` / `task:featureEnablement` on the matching `Task`, with `AISummaryFeatureEnablement` fields `interactionId`, optional `midCallEnabled`, optional `postCallEnabled`, and optional UTC `actionTimestamp`;
  - initiating-agent mid-call and post-call `Promise<AISummary>` results, and receiving-agent `AISummary` content on `TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED` / `task:midCallSummaryReceived`, as documented in `ai-summary.md`.
- The `task:featureEnablement` payload is interaction-scoped. Missing or malformed capability fields are treated as unavailable, never as enabled.
- Receiving-agent eligibility begins only when the receiving-agent content event arrives. There is no separate pre-content eligibility event.
- The same `interactionId` is retained across consult-to-transfer promotion, additional transfers, and conference changes.
- Summary request cancellation is not supported. The widget must use an interaction/agent/owner generation token to ignore settlements that are no longer current.
- The SDK request timeout is 15 seconds for consult/transfer behavior. While the request is pending, further consult/transfer initiation is disabled. The widget does not propagate or render a response delivered after the SDK timeout.
- There is no automatic client retry for unauthorized, offline, unavailable, empty, disabled, timeout, or generic request failure. A user-visible Retry action, where supplied by the approved post-call UX, starts a fresh SDK request.
- Repeated transport requests are tolerated by the backend. Each explicit user request still calls the SDK, and the UI uses the response with the greatest monotonic UTC `actionTimestamp`; equal timestamps use last arrival. A stale lower timestamp cannot replace newer visible state.

### REQ-002: Feature eligibility, state isolation, and channels

- Only voice interactions are eligible.
- Eligibility is the conjunction of the current voice interaction, a matching `task:featureEnablement` record from that `Task`, the applicable `midCallEnabled` or `postCallEnabled` flag, the relevant content/request lifecycle, and current agent authorization.
- State is keyed by `interactionId` plus agent identity and an ownership generation. Never show one interaction's summary, counters, feedback, error, or pending request in another interaction.
- Preserve mid-call state across hold/resume and task end; clear it when wrap-up completes, when the interaction changes, on sign-out, or when the SDK session ends.
- Preserve a successfully submitted post-call summary until the interaction changes. If the post-call response fails after wrap-up, retain the exact frozen failed response until the backend `AgentWrappedUp` event arrives, then discard it.
- Unauthorized or initialization-failure states omit the summary section. A successful-looking payload that cannot be rendered under the approved role-specific contract shows `The summary is not available` in the summary location.
- Agent Desktop-native slot integration is out of scope. This feature changes only the existing CC widgets and their established host surfaces.

### REQ-003: Initiating-agent mid-call summary

- Consult and transfer both support summaries.
- The initiating/requesting agent requests a summary while preparing consult or transfer and sees it in the existing consult/transfer popover after destination results.
- Ignore adaptive card JSON for this role.
- Prefer structured typed sections when present. Collapse them, in SDK-defined order, into labeled key-value text in the bottom-most text box of the popover. If typed sections are absent, render non-empty `summaryText` in that text box.
- The initiating-agent summary may be edited. Preserve text-only rendering and map edits back to the SDK response payload shape without HTML injection.
- Copy, like, and dislike controls are exposed. A copy is successful only after the OS clipboard promise fulfills. No confirmation is required before copying, and the operating system controls clipboard lifetime.
- Mid-call response submission occurs before the existing consult/transfer API call. The existing consult/transfer APIs and their public signatures remain unchanged.

### REQ-004: Receiving-agent mid-call summary

- The receiving agent displays the SDK-provided adaptive card directly in the existing AI Assistant panel, opened from a `View summary` notification.
- For this role, ignore typed sections and `summaryText`; the adaptive card is the render contract.
- Reuse the existing restricted `AdaptiveCardRenderer` and its text-only fallback/security boundary. Do not add arbitrary HTML execution, remote script execution, or new adaptive-card action types.
- Expose view, copy, like, and dislike controls. Feedback is sent through the SDK; a 200 response is sufficient confirmation before painting the selected state.
- If the card cannot be rendered, show `The summary is not available` in the panel. Do not fall back to initiating-agent typed/plain content for this role.

### REQ-005: Post-call summary and wrap-up

- Request and display the post-call summary in the existing wrap-up popover after reason selection and before the Complete Wrap-Up control.
- Each user request calls `task.requestPostCallSummary()` and replaces the display with the newest response; the backend may generate different LLM output for every call.
- Ignore adaptive card JSON for post-call rendering.
- When structured sections are present, render all labeled sections in SDK-defined order and allow the approved editable fields to be edited.
- When structured sections are absent and non-empty `summaryText` is present, render it as an unlabeled paragraph in the summary text area.
- Complete wrap-up first, freeze the exact edited response/counters/feedback, then call `sendPostCallSummaryResponse` once. The task is no longer callable for summary artifacts after wrap-up.
- Feedback is carried only in the final post-call response; there is no pre-wrap-up feedback API. Like/dislike selection before wrap-up is local pending state and is submitted with the final response.
- If wrap-up fails, keep the editable draft and allow the full wrap-up action to be tried again. If wrap-up succeeds and the summary response fails, keep the exact frozen failed response, show the content-free callback state `response-failed`, do not retry that response, and discard it only on `AgentWrappedUp`.
- The visible Retry control after a summary-generation failure requests a fresh post-call summary. It is not a response-only retry.

### REQ-006: Additional transfers and conferences

- On A to B to C transfer, Agent C receives a new summary covering the complete A+B history. Agent B's prior summary is discarded when C's summary becomes valid. The common interaction ID is retained and Agent C starts new counters.
- The new summary is available during transfer preparation. Consult-then-transfer and direct transfer use the same summary rules.
- The SDK's 15-second request timeout disables a further consult attempt while pending. Independently, an ownership-generation check must prevent an old agent's settlement from replacing the current agent's state.
- Adding a conference participant requests a new, per-agent summary covering the call from its beginning. The existing summary remains visible only until that agent's new summary arrives, then is discarded.
- The participant receiving the current consult is the receiving agent before conference establishment. After establishment there is no single receiving agent; each agent sees only that agent's generated summary.
- Summary generation continues when participants join or leave. If two participants remain, the session becomes a call. The oldest remaining initiating agent is the host.
- The final post-call summary includes the conference segment. Concurrent events are correlated by the common interaction ID plus agent identity and ownership generation.

### REQ-007: Host callback and compatibility

- Keep `<widget-cc-call-control></widget-cc-call-control>` and every existing property/callback compatible.
- Add this optional, content-free callback as a JavaScript function property:

```typescript
onAISummaryStatusChange?: (
  detail:
    | {kind: 'mid-call' | 'post-call'; state: 'available' | 'unavailable'}
    | {kind: 'post-call'; state: 'submitted' | 'response-failed'}
) => void;
```

- Never include summary text, interaction IDs, customer information, counters, or raw errors in callback details.
- Hosts that do not set the callback observe no behavior change.

### REQ-008: Feedback and counters

- Like and dislike are mutually exclusive. Selecting either option sends the applicable mid-call SDK update; after success the chosen option is highlighted. Selecting the other option sends a new update and replaces the highlight. Re-selecting the current option sends another update and leaves it highlighted.
- For post-call, selection is locally pending until the final response. Show `Pending submission` while pending and `Submission not confirmed` after response failure; remove the description after confirmed success.
- Maintain viewed, edited, and copied counters for a given agent within an interaction and ownership generation.
- Increment viewed for every successful UI action that reveals the summary.
- Increment edited for every accepted edit action that changes summary content.
- Increment copied only after the clipboard write fulfills.
- Failed, blocked, stale, or no-op actions do not increment.
- Preserve counters across hold/resume and same-agent remounts. Start new counters when ownership moves to another agent, including Agent C. Clear them at the same terminal boundary as their summary state.

### REQ-009: Accessibility, copy, layout, and theme

- Use these exact accessible labels/tooltips: `View summary`, `This is helpful`, `This isn't helpful`, `Copy Summary`, and post-call `Retry`. Tooltip text remains identical to the accessible label.
- Use `Having trouble generating summary` for every visible summary-generation error category.
- When a focused control disappears, remove it and move focus to the next focusable control in document order; if none remains in the summary, move to the established containing-panel target. Loading, content updates, and expand/collapse do not otherwise move focus.
- Announcements and ARIA live regions are not supported for this feature. Do not add feature-owned live-region behavior.
- Source locale is `en-US`. Keep message IDs so future localization remains possible, but do not add translation infrastructure.
- RTL layout is out of scope. Set dynamic summary content to `dir="auto"` so embedded bidirectional text does not reorder adjacent controls.
- Follow existing cc-calling-widget container sizing and theme behavior. Wrap text to prevent horizontal scrolling and use a vertical scrollbar when summary content exceeds available height. Do not introduce feature-only default/dark/customer theme maps.
- Preserve existing forced-colors/focus behavior where inherited; use semantic existing tokens and never use color as the only state indicator.

### REQ-010: Privacy, security, and errors

- Keep summary data in memory. Do not write it to localStorage, sessionStorage, IndexedDB, URLs, logs, analytics, screenshots outside test fixtures, or callback payloads.
- Clipboard export occurs only on a direct user gesture. The widget imposes no lifetime restriction after the OS accepts the data.
- Render typed/plain summary values as text. Receiving-agent adaptive cards must pass through the existing restricted renderer and error boundary.
- Normalize SDK failures without exposing raw payloads or sensitive error details. Unauthorized and initialization failures hide the summary surface; other generation failures show the approved generic error copy.
- New telemetry events, identifiers, dimensions, duration tracking, and failure vocabulary are out of scope.

### REQ-011: UX evidence and reconstruction

- Use every declared scene-graph/text pair and screenshot. Do not call Figma MCP.
- Implement screenshot-visible copy and layout first, then use scene-graph structure/text evidence for details not legible in the screenshot, then use the written decisions in this requirement.
- The single mid-call source is authoritative for its represented panel. Extrapolate missing mid-call control states from the corresponding post-call controls without inventing a new visual language.
- Run the required render/compare/refine loop against every screenshot-backed state and record structural-only classifications for any implemented state without a screenshot.

### REQ-012: Tests and release validation

- Add deterministic raw SDK fixtures for feature enablement, initiating typed/plain mid-call, receiving adaptive-card mid-call, structured/plain post-call, malformed/unsupported payloads, every error, transfers, conferences, feedback, counters, and stale/out-of-order events.
- Add SDK declaration/runtime contract tests against the packed `cc-summaries` package.
- Add store validation/event-routing tests, component tests, CallControl and AI Assistant integration tests, and public callback type/runtime tests.
- Add deterministic concurrency tests for interaction switches, ownership changes, hold/resume, request timeout, unmount, repeated requests, timestamp ordering, wrap-up success/failure, response failure, AgentWrappedUp cleanup, and zero unhandled rejections.
- Add browser tests for both panels, keyboard/focus behavior, copy, feedback, responsive overflow, and automated accessibility. No manual screen-reader receipt or live-region test is required.
- Add visual comparisons for every screenshot-backed state using the sealed Figma JSON inputs. Run build, type-check, unit, browser, accessibility, visual, privacy, DAG provenance, and release checks without weakening existing repository gates.

## UX Sources

Screenshot and variant identifiers are stable local evidence keys. The variant identifier `dl` means the supplied desktop-light rendering; compact identifiers are used only to keep deterministic prompt projections within the installed runtime's bounded evidence envelope.

- UX-001:
  - Type: figma-json
  - Scene graph: .ccwidgets/midcall/figma_target_8061_880455_compact.json
  - Text content: .ccwidgets/midcall/figma_target_8061_880455_text.json
  - State mapping: JNY-001:mid-call-summary
  - Fidelity: interaction-weighted
  - Screenshots:
    - S01 | JNY-001:mid-call-summary | dl | .ccwidgets/midcall/midcall.png

- UX-002:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_generating/figma_target_5669_263180_compact.json
  - Text content: .ccwidgets/postcall_generating/figma_target_5669_263180_text.json
  - State mapping: JNY-002:generating
  - Fidelity: interaction-weighted
  - Screenshots:
    - S02 | JNY-002:generating | dl | .ccwidgets/postcall_generating/postcall_generating.png

- UX-003:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_edit/figma_target_5669_263754_compact.json
  - Text content: .ccwidgets/postcall_summary_edit/figma_target_5669_263754_text.json
  - State mapping: JNY-002:editing
  - Fidelity: interaction-weighted
  - Screenshots:
    - S03 | JNY-002:editing | dl | .ccwidgets/postcall_summary_edit/postcall_summary_edit.png

- UX-004:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_hover_thumbsup/figma_target_5669_264384_compact.json
  - Text content: .ccwidgets/postcall_summary_hover_thumbsup/figma_target_5669_264384_text.json
  - State mapping: JNY-002:like-hover
  - Fidelity: interaction-weighted
  - Screenshots:
    - S04 | JNY-002:like-hover | dl | .ccwidgets/postcall_summary_hover_thumbsup/postcall_summary_hover_thumbsup.png

- UX-005:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_selected_thumbsup/figma_target_5669_264503_compact.json
  - Text content: .ccwidgets/postcall_summary_selected_thumbsup/figma_target_5669_264503_text.json
  - State mapping: JNY-002:like-selected
  - Fidelity: interaction-weighted
  - Screenshots:
    - S05 | JNY-002:like-selected | dl | .ccwidgets/postcall_summary_selected_thumbsup/postcall_summary_selected_thumbsup.png

- UX-006:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_hover_thumbsdown/figma_target_5669_264622_compact.json
  - Text content: .ccwidgets/postcall_summary_hover_thumbsdown/figma_target_5669_264622_text.json
  - State mapping: JNY-002:dislike-hover
  - Fidelity: interaction-weighted
  - Screenshots:
    - S06 | JNY-002:dislike-hover | dl | .ccwidgets/postcall_summary_hover_thumbsdown/postcall_summary_hover_thumbsdown.png

- UX-007:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_selected_thumbsdown/figma_target_5669_264860_compact.json
  - Text content: .ccwidgets/postcall_summary_selected_thumbsdown/figma_target_5669_264860_text.json
  - State mapping: JNY-002:dislike-selected
  - Fidelity: interaction-weighted
  - Screenshots:
    - S07-UX | JNY-002:dislike-selected | desktop-light | .ccwidgets/postcall_summary_selected_thumbsdown/postcall_summary_selected_thumbsdown.png

- UX-008:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_hover_copy/figma_target_4920_216835_compact.json
  - Text content: .ccwidgets/postcall_summary_hover_copy/figma_target_4920_216835_text.json
  - State mapping: JNY-002:copy-hover
  - Fidelity: interaction-weighted
  - Screenshots:
    - S08 | JNY-002:copy-hover | dl | .ccwidgets/postcall_summary_hover_copy/postcall_summary_hover_copy.png

- UX-009:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_selected_copy/figma_target_4920_216954_compact.json
  - Text content: .ccwidgets/postcall_summary_selected_copy/figma_target_4920_216954_text.json
  - State mapping: JNY-002:copy-selected
  - Fidelity: interaction-weighted
  - Screenshots:
    - S09 | JNY-002:copy-selected | dl | .ccwidgets/postcall_summary_selected_copy/postcall_summary_selected_copy.png

- UX-010:
  - Type: figma-json
  - Scene graph: .ccwidgets/postcall_summary_error/figma_target_5669_264979_compact.json
  - Text content: .ccwidgets/postcall_summary_error/figma_target_5669_264979_text.json
  - State mapping: JNY-002:error
  - Fidelity: interaction-weighted
  - Screenshots:
    - S10 | JNY-002:error | dl | .ccwidgets/postcall_summary_error/postcall_summary_error.png

### JNY-001: Review a mid-call consult or transfer summary

- Actor: voice agent initiating or receiving a consult, transfer, or conference participant addition
- Preconditions: an active voice interaction, matching interaction-scoped capability, and current-agent summary eligibility
- Steps: initiate or receive consult/transfer; wait up to 15 seconds; open View summary; inspect role-specific content; optionally edit when initiating; copy or select feedback; continue consult/transfer
- Required states: mid-call-summary
- Keyboard/focus behavior: all controls are reachable in document order; disappearing focused controls move focus to the next focusable control; content changes do not otherwise move focus
- Screen-reader behavior: controls have the exact accessible names in REQ-009; no feature-owned announcement or live-region behavior is added
- Theme/form-factor expectations: existing cc-calling-widget theme and container behavior, wrapped text, vertical overflow, desktop widget widths, and dynamic content with dir auto

### JNY-002: Generate, review, edit, and submit a post-call summary

- Actor: voice agent completing wrap-up
- Preconditions: a voice interaction in wrap-up with post-call capability enabled and a selected wrap-up reason
- Steps: request summary; observe generating; inspect structured or plain content; edit; copy; choose feedback; complete wrap-up; submit the frozen final response; handle generation or response failure
- Required states: generating, editing, like-hover, like-selected, dislike-hover, dislike-selected, copy-hover, copy-selected, error
- Keyboard/focus behavior: summary follows reason selection and precedes Complete Wrap-Up; all actions are keyboard reachable; disappearing focused controls move focus forward; scrolling remains vertical
- Screen-reader behavior: controls and errors use the exact accessible names/descriptions in REQ-009; no feature-owned announcement or live-region behavior is added
- Theme/form-factor expectations: screenshot hierarchy is preserved with existing widget theme tokens, responsive wrapping, vertical overflow, visible focus, and no feature-only RTL layout

## Out of Scope

- Non-voice channels.
- Agent Desktop-native summary slot implementation.
- New backend or SDK implementation work.
- Client-side automatic retries or summary-request cancellation.
- Response-only retry after a wrapped post-call response failure.
- New telemetry events or metrics.
- Localization infrastructure, RTL layout, or feature-owned live regions/announcements.
- New custom-element tags or breaking changes to existing host contracts.
- Persistent summary storage or clipboard lifetime control after the OS accepts a user-initiated copy.

## Acceptance Criteria

- AC-01: The widget consumes a locally packed `@webex/contact-center` build only when its recorded `cc-summaries` commit, package version, tarball hash, declarations, and runtime probes match the lock receipt.
- AC-02: Voice eligibility follows matching task-owned `task:featureEnablement` data and never leaks state between interactions or agents.
- AC-03: Initiating-agent consult/transfer renders typed sections or plain `summaryText` in the popover and ignores adaptive cards.
- AC-04: Receiving-agent consult/transfer renders the adaptive card in the existing AI Assistant panel and ignores typed/plain fields.
- AC-05: Post-call renders labeled structured sections or an unlabeled plain paragraph and ignores adaptive cards.
- AC-06: Consult, direct transfer, consult-to-transfer, additional transfer, and conference behaviors follow REQ-006 with a stable interaction ID and per-agent ownership generation.
- AC-07: Every explicit post-call request calls the SDK; no automatic retry occurs; the highest timestamp wins.
- AC-08: Wrap-up precedes the single final post-call response. A response failure is retained until `AgentWrappedUp`, never retried, and reported only through the content-free callback state.
- AC-09: The optional `onAISummaryStatusChange` callback is backward compatible and emits no content or identifiers.
- AC-10: View/edit/copy counters increment only on successful actions, survive same-agent hold/remount, and reset for a new agent owner.
- AC-11: Copy requires a direct user gesture and increments only after clipboard fulfillment.
- AC-12: Feedback behavior, labels, tooltips, descriptions, generic error copy, and focus movement match REQ-008 and REQ-009.
- AC-13: Unauthorized/initialization failure omits the summary; an unrenderable otherwise-successful payload displays `The summary is not available`.
- AC-14: Summary data is absent from persistence, URLs, logs, telemetry, and host callback details.
- AC-15: All ten Figma JSON source pairs and screenshots are sealed and mapped to declared journey states; Figma MCP is not used.
- AC-16: Component, integration, concurrency, browser, accessibility, visual, privacy, build, type-check, and release validations pass with no unhandled rejection or weakened existing gate.
