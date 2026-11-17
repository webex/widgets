# Task — W3: Unit Tests & Sample App Integration

> **Navigation:** [AGENTS.md](../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Start here → repo [`AGENTS.md`](../../../../AGENTS.md). Under [`epic.md`](./epic.md) ↔ plan [`implementation-plan-w3.md`](./implementation-plan-w3.md); implements [`../../design/feature-design.md`](../../design/feature-design.md).

## Metadata
| Field | Value |
|---|---|
| Task title | Unit tests & sample app integration |
| Parent epic | [`./epic.md`](./epic.md) |
| Task type | validation |
| Target repo(s) / module(s) | `webex/webex-widgets` · `store`, `granular-agent-state`, `cc-components`, `samples-cc-react-app` |
| Tracker key | WXCC-15791 |
| State | merged |
| Generated from | `task` @ SDLC template library `0.2.0` |

## Source Mapping
- Implements: Feature Design → Test Strategy; Spec W-R-10 (sample app).

## Primary Code Touchpoints
- `store/tests/store.ts` — `refreshAgentStateControl` surface tests + defaults.
- `store/tests/storeEventsWrapper.ts` — V2 event wiring + store mock fields.
- `granular-agent-state/tests/*` — gate + hook (Worker mock typed).
- `widgets-samples/cc/samples-cc-react-app/src/App.tsx` — render `GranularAgentState` when `store.isGranularAgentStateActive`, else `UserState`.

## Ownership Boundary
- Owns: the listed test files + sample app.
- Must NOT touch: production store/components/package → W1/W2.

## Multi-Repo Scope
| Target repo | Module | Why | Manifest / standing docs |
|---|---|---|---|
| `webex/webex-widgets` | tests + sample | N/A — single target repo | `ai-docs/` |

## Dependencies / Execution Stream
| This task | Depends on | Parallel-safe with | Wave |
|---|---|---|---|
| W3 | W1, W2 | — | 3 |

## Acceptance Criteria
- [ ] Store surface + event tests pass; granular package tests pass.
- [ ] Sample renders the V2 widget for V2 sessions, V1 otherwise.
- [ ] Build chain green.

## Verifier Exit Criteria
- [ ] `store/tests/store.ts` 19/19 and granular 12/12 pass; build chain clean. V1 `user-state` suite unchanged.

## Traceability
| Requirement | Code symbol | Test |
|---|---|---|
| W-R-1 | store surface | `store/tests/store.ts` |
| W-R-2/8 | hook + gate | `granular-agent-state/tests/*` |
| W-R-10 | sample | manual |

## Coverage Expectation
- Changed-line coverage per package gates; evidence: CI coverage report.

## Non-Goals

- Modifying production store, component, or widget package code (owned by W1/W2).
- Fixing pre-existing cc-components environmental test failures (SDK `WELLNESS_BREAK_NOTIFICATION_ACTIONS` resolution).
- Automating E2E tests for the sample app; sample validation is manual.
- Achieving 100% branch coverage; focus is on passing the per-package gates.
- Testing SDK-layer V2 behavior (owned by SDK repo T3).

## Cross-Cutting Prompts

- **Observability**: Are logs/metrics emitted for this task's state transitions?
- **Error handling**: Are failures surfaced to the consumer (event/callback/UI)?
- **Backward compatibility**: Does this change break existing V1 consumers?
- **Security**: Does this task handle any PII or authentication tokens?
