# Agent Wellness Break — widgets implementation contract (WXCC-12423)

Status: implemented for Widgets and aligned with `@webex/contact-center` 3.12.0-next.126 on 2026-09-22;
final live-flow verification is pending with a wellness-enabled test agent.

## Scope and ownership

`@webex/cc-store` projects the SDK's effective enablement, current station session, system-owned
`WellbeingBreak` code, `WellnessBreak` event, and legacy state. It uses only the wellness API that the
SDK publishes from its package root.
`@webex/cc-ai-assistant` owns request/offer actions, safe-state orchestration, timers, media, recovery,
and host callbacks. `@webex/cc-components` remains props-only. `@webex/cc-widgets` mirrors the public
surface through `widget-cc-ai-assistant` and distributes lazy media chunks.

## Behavioral contract

- `SUGGEST_WELLNESS_BREAK` enables a manual request. A successful HTTP 202 leaves it pending until an
  independent `PROVIDE_WELLNESS_BREAK` or `WELLNESS_BREAK_NOT_ALLOWED` event.
- The suggestion CTA follows Desktop empty-state eligibility: active Real-time Assist content takes
  precedence; otherwise the centered wellness suggestion replaces the normal landing content. Its
  hover/focus tooltip uses the trimmed event `actionText`, falling back to the pre-approved-break copy.
- Manual request availability is one-shot. Requesting a break, receiving `PROVIDE`/`NOT_ALLOWED`,
  declining or timing out an offer, rotating the session, and completing/restoring a break all
  consume it. Only a later `SUGGEST_WELLNESS_BREAK` enables it again.
- Eligible suggestions, offer/request states, acknowledgements, completion notices, status, and errors
  own the assistant body while visible; the normal landing or Real-time Assist surface is not stacked
  beneath them.
- A provided offer expires after five minutes and emits `NO_RESPONSE` once. Session rotation invalidates
  it without a response action. When the assistant panel is closed or minimized,
  a Desktop-style actionable toast exposes the same Take a break and Later actions; opening the panel
  shows the offer in the assistant body without duplicating the toast.
- Wellness notification eligibility is scoped to the current agent and organization, not to equality
  with the notification-provided `agentSessionId`. The widget calls `requestWellnessBreak()` without
  arguments and calls `respondToWellnessBreak({action})` without identity fields. The SDK supplies its
  active registration and login/relogin context rather than accepting notification identity metadata.
- Agent acceptance changes state before sending `ACCEPTED`. A pending manual request approved by
  `PROVIDE` changes state without a duplicate action. Repeated clicks are guarded so a direct offer
  sends at most one acceptance request.
- **Later** on a direct offer consumes the offer locally and sends exactly one `REJECTED` response; it
  never changes agent state. Delivery failure is reported through the existing error callback/metric.
- Backend copy is event-specific and plain text: suggestion `actionText` is the CTA tooltip, direct
  `PROVIDE` `actionText` is the offer body, and `WELLNESS_BREAK_NOT_ALLOWED` `actionText` is the denial
  body. Blank text uses the approved local fallback for that state.
- Start requires exact legacy `Idle / WellbeingBreak` confirmation, all `store.taskList` entries safe,
  and a two-second event settle window. Waiting copy mentions current
  work only while `store.taskList` contains an actual blocking task.
- The User State widget renders the system-owned `WellbeingBreak` code as the current, timed state while
  it is active, without adding it to the manually selectable idle-code list or echoing SDK-driven entry
  and restoration transitions back through `setAgentState`.
- Playback is 5 seconds starting, 60 seconds playing (copy changes at 40 seconds), and 5 seconds ending.
  Audio and animation are independently lazy-loaded during the starting countdown. The full-bleed
  animation holds its first frame behind the inline `5 4 3 2 1` start sequence, plays with the 60-second
  timeline, then holds its final frame behind the ending sequence; audio is rewound and starts with playback.
- Restoration returns agents to their captured Available or legacy idle-code state (for example,
  `Meeting`), tries three times with ten-second spacing, and has five bounded background recovery attempts.
  Before playback, an incompatible external/RONA transition cancels and restores;
  during playback/ending it does not interrupt the timeline.
- A host-scoped `sessionStorage` marker contains only its version, station session, and captured legacy
  state and idle code. Refresh never replays an offer, action, or media.
- The full-screen dialog is independent of assistant chrome, traps focus, ignores Escape, restores focus,
  exposes live announcements, and honors reduced motion without changing timing. Its rounded canvas,
  full-bleed animation crop, overlaid phase copy, and bottom progress treatment follow Desktop.
- Behavioral lifecycle and agent-action metrics use Desktop's existing wellness event names and
  taxonomy through the Webex metrics transport. Properties remain bounded and exclude notification
  bodies, `actionText`, session identifiers, and interaction/customer data. Toast close and timeout
  emit only their Desktop-equivalent behavioral metrics; they do not invent backend user actions.

## Public surface

`IAIAssistantProps` adds `onWellnessBreakOffered`, `onWellnessBreakAccepted`,
`onWellnessBreakStarted`, `onWellnessBreakEnded`, `onWellnessBreakError`, `wellnessAudioUrl`, and
`wellnessBreakOverlayTarget`. The overlay target defaults to `viewport`; `assistant` scopes it to the
widget root, while React hosts may pass an `HTMLElement` to portal into a custom positioned container.
The serializable Web Component modes are `viewport` and `assistant`.
`WellnessBreakPhase`, `WellnessBreakErrorCode`, and `WellnessBreakError` are exported by both
`@webex/cc-ai-assistant` and the aggregate React entry.

The widget does not consume or expose State Control V2 or an AI Assistant RTD status event. These
surfaces are not part of the published SDK wellness contract.

The React sample exposes all three modes in an **AI Assistant → Wellness break overlay target** selector.
Its custom mode passes the bordered demo container's `HTMLElement`, making coverage behavior verifiable
without changing sample source.

During an active break, the selected scroll surface is locked and its prior inline styles are restored
on cleanup. This prevents the document scrollbar gutter from showing beside a viewport overlay. Wellness
offers, user actions, acknowledgements, denials/timeouts, and completion messages append to a chronological
assistant transcript. Closing, minimizing, reopening, receiving another wellness event, or rotating the
station session does not clear that transcript. Only the first header action, **Clear**, clears displayed
Real-time Assist and wellness history; it does not cancel an active offer/break or fabricate a backend action.

The landing feature list matches Desktop copy and icons exactly: `✨ Real-time Assist`, `🪷 Wellness breaks`,
and `✍🏻 Smart summaries`, with their approved Desktop descriptions.

## Media provenance

| Asset        | Approved source checksum                                           | Packaged checksum                                                  | Transformation                                            |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Light Lottie | `6a28e4866e52a1b463fb45e46aa53c4c531a8fc45c793251b75cfece73c91e21` | `d6eaa49aa6ee9956d22d3d3fb65c357a51f9d6b832c2939123c0584a4c3208d5` | Removed the missing `audio_0` asset and its type-6 layer. |
| Dark Lottie  | `5e9a5eec6f7e370e6c386a79c0bc12b43d4b397e9a9ac94dedbe58f1a93c2f46` | `193052c64943fd94d993916936ef6cb2a2c9fc642c9856892c6ddda983ec92ac` | Removed the missing `audio_0` asset and its type-6 layer. |
| Desktop MP3  | `19e4474587759c98638ade310b8873ad957e03686c5a8af04c9a5d272c81699b` | same                                                               | Unmodified 65.097-second source.                          |

The renderer, theme JSON, and audio URL module are dynamic imports. The MP3 is emitted as
`assets/wellness/WellnessBreakSound.mp3`; `wellnessAudioUrl` overrides it for CDN/subpath deployments.

Development-build entry sizes were compared against commit `4733dbcd` with the same toolchain:

| Package `dist/index.js`  |     Baseline | With wellness |     Delta |
| ------------------------ | -----------: | ------------: | --------: |
| `@webex/cc-components`   |  6,667,210 B |   6,657,766 B |  -9,444 B |
| `@webex/cc-ai-assistant` |  7,231,925 B |   7,299,093 B | +67,168 B |
| `@webex/cc-widgets`      | 45,710,210 B |  45,789,248 B | +79,038 B |

Imminent playback adds lazy assets of 2,603,884 B (MP3), 40,840 B (both transformed JSON chunks),
1,230 B (audio URL module), and 643,561 B (Lottie renderer). None are requested by the wellness UI gate
or initial bundle alone.

## Release gates

- Keep the store pinned to the published `@webex/contact-center` 3.12.0-next.126 build. Consume its
  wellness constants and types from the package root. Do not add local paths, tarballs, or structural
  copies of the SDK wellness contract.
- Retain the media redistribution approval and checksum record.
- Verify multi-client action idempotency with the backend.
- Approve the US English copy before GA.

## Samples and verification

The React and Web Component samples use real store/SDK events, expose the lifecycle callbacks, log only
lifecycle/error categories, and do not include a fake wellness event generator. Verify the legacy state
flow, active voice/digital work, RONA phase boundaries, refresh recovery, media failure, reduced motion,
focus restoration, and aggregate asset loading with a wellness-enabled test agent.
