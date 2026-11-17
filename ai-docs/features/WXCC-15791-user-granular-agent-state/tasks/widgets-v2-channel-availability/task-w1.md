# Task — W1: cc-components GranularAgentState Components & Exports

> **Navigation:** [AGENTS.md](../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Start here → repo [`AGENTS.md`](../../../../AGENTS.md). Under [`epic.md`](./epic.md) ↔ plan [`implementation-plan-w1.md`](./implementation-plan-w1.md); implements [`../../design/feature-design.md`](../../design/feature-design.md).

## Metadata
| Field | Value |
|---|---|
| Task title | cc-components GranularAgentState components & exports |
| Parent epic | [`./epic.md`](./epic.md) |
| Task type | UI |
| Target repo(s) / module(s) | `webex/webex-widgets` · `@webex/cc-components` |
| Tracker key | WXCC-15791 |
| State | merged |
| Generated from | `task` @ SDLC template library `0.2.0` |

## Source Mapping
- Implements: Feature Design → Functional-Block Decomposition (presentational layer) + UX Design.

## Primary Code Touchpoints
- `cc-components/src/components/GranularAgentState/` — `granular-agent-state.tsx` (pill, `withMetrics`, `formatTime`), `channel-avatar.tsx`, `channel-state-preview.tsx` (`formatDuration`), `granular-state-menu.tsx`, `manage-channel-availability.tsx`, `granular-agent-state.utils.ts`, `constant.ts`, types, scss.
- `cc-components/src/index.ts` — export `GranularAgentStateComponent`, the granular types, utils, and constants.

## Ownership Boundary
- Owns: `cc-components/src/components/GranularAgentState/**`, the added export block in `cc-components/src/index.ts`.
- Must NOT touch: `UserState/**` (V1) → unchanged; store/package/cc-widgets → W2.

## Multi-Repo Scope
| Target repo | Module | Why | Manifest / standing docs |
|---|---|---|---|
| `webex/webex-widgets` | `@webex/cc-components` | N/A — single target repo | `ai-docs/` |

## Dependencies / Execution Stream
| This task | Depends on | Parallel-safe with | Wave |
|---|---|---|---|
| W1 | — | — | 1 |

## Acceptance Criteria
- [ ] GranularAgentState components render pill, preview, menu, and manage view.
- [ ] Component + types + utils + `AVAILABLE_AUX_CODE_ID` exported from `cc-components/src/index.ts`.
- [ ] V1 `UserState` components unchanged.

## Verifier Exit Criteria
- [ ] `cc-components` builds; exports importable by the granular package.

## Traceability
| Requirement | Code symbol | Test |
|---|---|---|
| W-R-3..7 | `manage-channel-availability.tsx` + utils | cc-components tests |
| W-R-11/12 | `granular-agent-state.tsx`, `granular-state-menu.tsx` | cc-components tests |

## Coverage Expectation
- Changed-line coverage per cc-components gate; evidence: CI coverage report.

## Non-Goals

- Modifying V1 `UserState` components or their exports.
- Implementing the MobX store V2 surface or event wiring (owned by W2).
- Building the container widget package or r2wc registration (owned by W2).
- Writing unit tests or sample-app integration (owned by W3).
- Implementing pending-idle, RONA, or WebRTC-disconnect visuals (deferred parity exceptions).

## Cross-Cutting Prompts

- **Observability**: Are logs/metrics emitted for this task's state transitions?
- **Error handling**: Are failures surfaced to the consumer (event/callback/UI)?
- **Backward compatibility**: Does this change break existing V1 consumers?
- **Security**: Does this task handle any PII or authentication tokens?
