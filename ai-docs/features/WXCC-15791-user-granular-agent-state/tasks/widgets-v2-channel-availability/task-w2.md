# Task — W2: Store V2 Surface, Widget Package & r2wc Registration

> **Navigation:** [AGENTS.md](../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Start here → repo [`AGENTS.md`](../../../../AGENTS.md). Under [`epic.md`](./epic.md) ↔ plan [`implementation-plan-w2.md`](./implementation-plan-w2.md); implements [`../../design/feature-design.md`](../../design/feature-design.md).

## Metadata
| Field | Value |
|---|---|
| Task title | Store V2 surface, widget package & r2wc registration |
| Parent epic | [`./epic.md`](./epic.md) |
| Task type | UI |
| Target repo(s) / module(s) | `webex/webex-widgets` · `@webex/cc-store`, `@webex/cc-granular-agent-state`, `@webex/cc-widgets` |
| Tracker key | WXCC-15791 |
| State | merged |
| Generated from | `task` @ SDLC template library `0.2.0` |

## Source Mapping
- Implements: Feature Design → Functional-Block Decomposition (store surface, container package, registration).

## Primary Code Touchpoints
- `store/src/store.ts` — observables `isGranularAgentStateActive`/`channelStatesMap` + `refreshAgentStateControl()`; refresh in `registerCC`.
- `store/src/store.types.ts` — re-export SDK V2 types; `IContactCenter` V2 getters; `IStore` fields; `CC_EVENTS` channel events.
- `store/src/storeEventsWrapper.ts` — getters, `handleChannelStateChange` (on `AGENT_CHANNEL_STATE_CHANGE`: refreshes state), `handleChannelStateChangeFailed` (on `AGENT_CHANNEL_STATE_CHANGE_FAILED`: logs error and refreshes state), event wiring (on/off in `addEventListeners`/`removeEventListeners`), `AGENT_CHANNEL_RELOGIN_SUCCESS` wired via `bootstrapSession` forEach loop (refreshes profile/team/state), reset in `cleanUpStore`.
- `granular-agent-state/src/` — `granular-agent-state/index.tsx` (observer + ErrorBoundary gate), `helper.ts` (`useGranularAgentState`), `granular-agent-state.types.ts`, `index.ts`.
- `cc-widgets/src/wc.ts` — `r2wc(GranularAgentState, {props:{onStateChange:'function'}})` + `widget-cc-granular-agent-state`; `cc-widgets/src/index.ts` export; `cc-widgets/package.json` dependency.

## Ownership Boundary
- Owns: store V2 regions, the `granular-agent-state` package, cc-widgets registration/export/dep.
- Must NOT touch: cc-components components → W1; tests/sample → W3; V1 `user-state` package.

## Multi-Repo Scope
| Target repo | Module | Why | Manifest / standing docs |
|---|---|---|---|
| `webex/webex-widgets` | `cc-store`, `cc-granular-agent-state`, `cc-widgets` | N/A — single target repo | `ai-docs/` |

## Dependencies / Execution Stream
| This task | Depends on | Parallel-safe with | Wave |
|---|---|---|---|
| W2 | W1 | — | 2 |

## Acceptance Criteria
- [ ] Store exposes the V2 observables + `refreshAgentStateControl()`; refreshes on lifecycle/events; resets on logout.
- [ ] `@webex/cc-granular-agent-state` renders only when `store.isGranularAgentStateActive`.
- [ ] `widget-cc-granular-agent-state` registered + React-exported; dependency added.

## Verifier Exit Criteria
- [ ] Build chain store → cc-components → granular-agent-state → cc-widgets compiles clean.

## Traceability
| Requirement | Code symbol | Test |
|---|---|---|
| W-R-1 | `refreshAgentStateControl` + event wiring | `store/tests/*` |
| W-R-2 | `useGranularAgentState` | `granular-agent-state/tests/helper.ts` |
| W-R-8 | observer gate | `granular-agent-state/tests/.../index.tsx` |
| W-R-9 | `wc.ts` r2wc | cc-widgets build |

## Coverage Expectation
- Store changed-line coverage per gate; evidence: CI coverage report.

## Non-Goals

- Building or modifying presentational components in `cc-components` (owned by W1).
- Writing unit tests or sample-app integration (owned by W3).
- Adding a `setAgentStateV2` store action; the SDK routes by session version.
- Modifying V1 `user-state` widget package or its store surface.
- Implementing a second feature flag in the widget layer; gating is `store.isGranularAgentStateActive` only.

## Cross-Cutting Prompts

- **Observability**: Are logs/metrics emitted for this task's state transitions?
- **Error handling**: Are failures surfaced to the consumer (event/callback/UI)?
- **Backward compatibility**: Does this change break existing V1 consumers?
- **Security**: Does this task handle any PII or authentication tokens?
