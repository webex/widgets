# Feature Spec — WXCC-15791: Granular Agent State Control V2 (Widgets)

> **Navigation:** [AGENTS.md](../../../../AGENTS.md) → [SPEC_INDEX.md](../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../ARCHITECTURE.md)

> Start here → repo [`AGENTS.md`](../../../../AGENTS.md) · router [`SPEC_INDEX.md`](../../../SPEC_INDEX.md) · architecture [`ARCHITECTURE.md`](../../../ARCHITECTURE.md). Then design [`feature-design.md`](../design/feature-design.md) → contracts [`design/contracts/`](../design/contracts/) → tests [`test-strategy.md`](../test-strategy.md) → tasks [`tasks/widgets-v2-channel-availability/epic.md`](../tasks/widgets-v2-channel-availability/epic.md).
> **Cross-repo dependency:** consumes the SDK V2 surface in `webex-js-sdk/packages/@webex/contact-center/ai-docs/features/WXCC-15791-user-granular-agent-state/`; the SDK work must land/publish first.

## Metadata
| Field | Value |
|---|---|
| Feature / ticket key | WXCC-15791 |
| Title | Granular Agent State Control V2 (Widgets) |
| Status | implemented |
| Change class | contract-affecting + ui |
| created_by / approved_by / date | SDD intake / — / 2026-09-21 |
| Generated from | `feature-spec` @ SDLC template library `0.2.0` |

## Problem & Goal (WHAT + WHY)
**What:** Add a new `widget-cc-granular-agent-state` widget (separate package, same architectural hierarchy as the V1 `user-state` widget) that renders a per-channel agent-state selector — header pill, hover preview, state menu, and a "Manage channel availability" view — reading the SDK's V2 per-channel data through the MobX store.
**Why:** Blended agents need to be Available on some channels (e.g. Chat) while Idle on others (e.g. Voice). The V1 `user-state` widget only sets one global state. A separate V2 widget delivers per-channel control while preserving the V1 UI and interaction flow; the SDK-pinned session version selects which one the host renders. The V1 helper also guards access to response timestamp fields.

## Stakeholders & Open Questions
| Stakeholder / role | Interest | Sign-off needed? |
|---|---|---|
| CC agents | Per-channel availability | yes |
| Widget maintainers | Clean package separation from `user-state` | yes |
| SDK maintainers | V2 surface consumed as-is via the store | yes |

**Open questions:**
- **Q-1 SDK V2 publish timing** — owner: SDK team — blocks: bumping the store's `@webex/contact-center` dependency for release — status: open.

## Scope
**In scope:**
- **Store V2 surface** (`@webex/cc-store`): observables `isGranularAgentStateActive`, `channelStatesMap`; action `refreshAgentStateControl()` reading `cc.getAgentStateControl().active`/`getChannelStates()`; wire `agent:channelStateChange` + `agent:channelReloginSuccess`; refresh on register/login/relogin; reset on logout.
- **cc-components** `GranularAgentState/` presentational components (pill, avatar, preview, state menu, manage view) + types + utils, exported from `cc-components/src/index.ts`.
- **New `@webex/cc-granular-agent-state` package**: observer widget + `ErrorBoundary` gate + `useGranularAgentState` hook + types.
- **cc-widgets**: r2wc registration of `widget-cc-granular-agent-state` + React re-export + package dependency.
- React sample app integration, including selection persistence for the new widget, is in scope (W-R-10).
- Unit tests for store additions, components, hook, and widget.

**Out of scope:**
- Any change to the V1 `user-state` widget behavior/appearance.
- Independent idle-code selection for each channel in the Manage view, RONA/`pendingIdle` UX, WebRTC-disconnect handling.
- i18n (English label constants), WC sample app, E2E Playwright (follow-ups). The React sample app integration is included.
- SDK/backend changes.

**Open decisions:** none.

## Requirements
| Req ID | Requirement (WHAT) | Rationale (WHY) | Acceptance | State |
|---|---|---|---|---|
| W-R-1 | Store exposes `isGranularAgentStateActive`, `channelStatesMap` as MobX observables, refreshed by `refreshAgentStateControl()` on register/login/relogin and on `agent:channelStateChange`; reset on logout. Per-channel capacity is available via `channelStatesMap[channelType].totalChannelCount`. | Widgets need reactive per-channel state; the store is the sole SDK gateway. | Observables populate after V2 login; reset to defaults on logout. | Implemented |
| W-R-2 | `useGranularAgentState` calls `cc.setAgentState({state, auxCodeId, agentId, lastStateChangeReason, channelType[]})` (SDK routes to V2); on success refreshes the store + `onStateChange?()`; on failure logs, no rethrow; empty channel list is a no-op. | Batched per-channel changes, same pattern as V1 `useUserState`. | One SDK call per target state; store refreshes on success. | Implemented |
| W-R-3 | `ManageChannelAvailability` renders Back + header, an "All" row, and per-channel rows for configured channels (Voice, Chat, Email, Social; capacity > 0). | Visual per-channel control, desktop parity. | Rows match configured channels. | Implemented |
| W-R-4 | Each channel row shows icon, name, "State : {displayState}", and a Momentum `Toggle` (ON only when `agentState === 'Available' && !pendingIdle`). RONA, Engaged, and WrapUp are OFF so the agent can set them Available. | A non-Idle state is not the same as Available. | Icon/name/label/toggle per row. | Implemented |
| W-R-5 | "All" toggle sets every channel to one target locally; its checked state derives from the per-channel toggles. | Quick set-all, single source of truth. | "All" reflects individual toggles. | Implemented |
| W-R-6 | Apply is disabled until a toggle differs (or a request is in flight); sends only changed channels — one Available request, then one Idle request using the last-set idle code. SDK updates merge into the view baseline without discarding channel choices not yet confirmed by the server. If Available fails, Idle is not sent; if there is no idle code, the Idle request is skipped. In either case the Manage view stays open and shows an error banner. | A failed or partial request must not erase the remaining channel choices. | Changed-only payload; Idle runs only after Available succeeds; unconfirmed choices remain editable after state updates. | Implemented |
| W-R-7 | Cancel/Back discard local changes and return to the menu with no API calls. | Undo without side effects. | No calls on cancel. | Implemented |
| W-R-8 | Widget renders only when `store.isGranularAgentStateActive`; otherwise `null` and the hook never runs. Host chooses `UserState` (V1) vs `GranularAgentState` (V2). | V1 agents see no change. | Renders null on V1. | Implemented |
| W-R-9 | Registered as `widget-cc-granular-agent-state` via r2wc in `cc-widgets/src/wc.ts` (`onStateChange:'function'`) and re-exported from `cc-widgets/src/index.ts`. | WC + React consumption paths. | Element registered; React export present. | Implemented |
| W-R-10 | React sample app renders `GranularAgentState` when selected and `store.isGranularAgentStateActive`, else `UserState` when selected for V1. Restored `selectedWidgets` preferences are merged with current defaults so new widget options appear for existing sample users. | Working demo that remains compatible with saved user preferences. | Sample shows the selected state widget for the active SDK session version; older preferences do not hide both state controls. | Implemented |
| W-R-11 | Header pill shows the primary channel avatar + "{displayState} - {elapsed}" + other channel avatars + chevron; hover shows `ChannelStatePreview` (per-channel avatar/state/hh:mm:ss timer); renders nothing with no primary channel. | At-a-glance aggregate + per-channel state. | Pill + preview per description. | Implemented |
| W-R-12 | Clicking the pill opens `GranularStateMenu`: search; multi-channel block (Set Available all / Manage > / Set Idle all) + idle codes; single-channel plain Available + idle codes; closes on action/outside/Escape. | Desktop parity for primary affordances. | Menu behavior per description. | Implemented |

## Acceptance Criteria
- Store wires the V2 events and refreshes reactively; resets on logout (W-R-1).
- Hook calls `cc.setAgentState({channelType[]})` and refreshes on success (W-R-2).
- Manage view renders Back/header/All/per-channel rows with correct icon/name/label/toggle (W-R-3, W-R-4).
- All derives from and drives individual toggles; Apply enabled only on diff, changed-only, Available-then-Idle; unconfirmed selections survive SDK state updates (W-R-5, W-R-6).
- Cancel/Back make no API calls (W-R-7).
- Widget renders null on V1 sessions (W-R-8); custom element registered + React export (W-R-9); sample selections migrate across added defaults (W-R-10).
- Pill/preview/menu behave per W-R-11/W-R-12.
- All touched packages build; store/component/hook/widget unit suites green. V1 `user-state` suite unchanged.

## Success & Guardrail Metrics
| Metric | Type | Baseline | Target / bound | How measured |
|---|---|---|---|---|
| V1 regression | guardrail | 0 | 0 | `user-state` unit suite unchanged + green |
| Touched-package build/unit failures | guardrail | 0 | 0 | Build + Jest |
| Per-channel Apply success | success | n/a | ≥99% confirmed | `agent:channelStateChange` events matching request (metrics HOC) |

## Prior-Work Register
| Existing artifact | How it relates | Reuse / extend / supersede |
|---|---|---|
| `cc-user-state` widget + `useUserState` | V1 widget hierarchy to mirror | reuse pattern (new package) |
| `@webex/cc-store` | Sole SDK gateway | extend (additive V2 surface) |
| `@webex/cc-components` `withMetrics`, `formatTime`, `ErrorBoundary` | Shared component infra | reuse |

## Contracts Delta
**Provides:** ADDED `widget-cc-granular-agent-state` custom element + `GranularAgentState` React export; ADDED (minimal cc-components surface) `GranularAgentStateComponent` + granular types + the four utils `getSelectableChannelTypes`/`buildChannelStates`/`getChannelsToChange`/`getLastSetIdleCode` + `AVAILABLE_AUX_CODE_ID`; ADDED store observables `isGranularAgentStateActive`/`channelStatesMap` + action `refreshAgentStateControl()`.
**Requires:** SDK V2 events (`agent:channelStateChange`, `agent:channelReloginSuccess`, `agent:channelStateChangeFailed`), types (`ChannelType`, `AgentChannelTypeStates`, `AgentStateControlStatus`), and methods (`cc.getAgentStateControl/getChannelStates`, `cc.setAgentState({channelType?})`). The SDK uses the agent profile's `manageChannelAvailability` to select the session version; the widget reads `getAgentStateControl().active` through the store as its render gate. There is no separate host `isGranularAgentStateEnabled` option.

Backward compatible: new widget/store surfaces are additive; V1 UI behavior and host contracts remain unchanged. The V1 response timestamp read is defensively guarded.

## Impacted Modules / Repos
| Module / repo | Impact | Manifest coverage state |
|---|---|---|
| `packages/contact-center/store` | V2 observables + `refreshAgentStateControl()` + event wiring | Partial |
| `packages/contact-center/cc-components` | New `GranularAgentState/` components + exports | Partial |
| `packages/contact-center/granular-agent-state` (NEW) | New widget package | New |
| `packages/contact-center/cc-widgets` | r2wc registration + re-export + dep | Partial |
| `widgets-samples/cc/samples-cc-react-app` | V2 widget integration | — |

## Feasibility & Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SDK V2 surface not yet published | high | high (release blocker) | Publish SDK + bump store dep before release (Q-1); dev builds against local SDK dist |
| SDK pins version after `agent:stationLoginSuccess` | med | med | Store refreshes on login + register + relogin; `refreshAgentStateControl()` is idempotent |
| Apply partial success (some channels fail) | med | med | Per-channel confirmation via store refresh on events; failures logged; `onStateChange` = request acceptance, not confirmation |

## Interaction / Scenario Matrix
| Scenario | Expected behavior | Covered by |
|---|---|---|
| V1 session mount | Widget renders null; hook never runs | W-R-8 |
| "All" ON + one channel toggled OFF | "All" turns OFF; Apply enabled | W-R-5 |
| No diff on Apply | Apply disabled | W-R-6 |
| `agent:channelStateChange` arrives | Store re-reads getters; widget re-renders | W-R-1 |
| V2 reload | `agent:channelReloginSuccess` bootstraps listeners, sets profile/team, refreshes | W-R-1 |
| Channel change fails | Store logs; no optimistic state | W-R-1 |

## UI Flow & Design
Pill → click → `GranularStateMenu` (search + set-all/manage/idle codes) → "Manage channel availability >" → per-channel toggles + Cancel/Apply. Only channels with capacity > 0 shown. Momentum Design tokens/rem. Reference: wxcc-desktop `GranularStateSelector*`. **Figma:** parity with desktop. Changes an existing flow? No — separate widget; V1 UI flow remains intact.

## Public API & Semver Impact
`@webex/cc-granular-agent-state`, `@webex/cc-store`, `@webex/cc-components`, and `@webex/cc-widgets` are currently versioned `1.28.0-ccwidgets.126`. The change adds the granular package and additive surfaces; no existing public exports are removed.

## Cross-Package Impact
Dependency/release order: SDK (publish first) → `cc-store` → `cc-components` → `cc-granular-agent-state` → `cc-widgets`.

## Spec State
| Section | State |
|---|---|
| Problem & Goal | complete |
| Stakeholders & Open Questions | complete |
| Scope | complete |
| Requirements | complete |
| Acceptance Criteria | complete |
| Success & Guardrail Metrics | complete |
| Prior-Work Register | complete |
| Contracts Delta | complete |
| Impacted Modules | complete |
| Conditional sections | complete |

## Change Log
| Date | Change | By | Why |
|---|---|---|---|
| 2026-09-21 | Created V2 widget spec (separate package) | developer | Capture |
| 2026-11-16 | Lean rewrite to the feature-spec template; store V2 surface implemented (`isGranularAgentStateActive`/`channelStatesMap`/`refreshAgentStateControl`); collapsed review follow-ups; confirmed separate V2 widget with V1 unchanged | review follow-up | Match implementation, remove duplication |
| 2026-11-16 | Docs refinement: flipped module spec from planned/draft to implemented; fixed widget contract export kind (named, not default); set status to implemented | review follow-up | Match docs to implemented reality |
| 2026-11-18 | Review pass: corrected sample scope, profile-based session selection, Manage Apply error behavior, and selectable idle-code scope | review follow-up | Keep requirements aligned with implementation |

## References
- Feature design: [`../design/feature-design.md`](../design/feature-design.md) · decomposition: [`../tasks/`](../tasks/)
- Test plan: [`../test-strategy.md`](../test-strategy.md)
- SDK feature: `webex-js-sdk/packages/@webex/contact-center/ai-docs/features/WXCC-15791-user-granular-agent-state/`
- wxcc-desktop reference: `GranularStateSelector*`
- Jira: https://jira-eng-sjc12.cisco.com/jira/browse/WXCC-15791
