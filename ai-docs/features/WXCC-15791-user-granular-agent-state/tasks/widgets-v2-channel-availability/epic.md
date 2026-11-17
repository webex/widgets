# Epic — Widgets V2 Granular Agent State

> **Navigation:** [AGENTS.md](../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Start here → repo [`AGENTS.md`](../../../../AGENTS.md) · router [`SPEC_INDEX.md`](../../../../SPEC_INDEX.md). Delivers [`../../design/feature-design.md`](../../design/feature-design.md); child tasks → [`task-w1.md`](./task-w1.md), [`task-w2.md`](./task-w2.md), [`task-w3.md`](./task-w3.md).

## Metadata
| Field | Value |
|---|---|
| Epic title | Widgets V2 Granular Agent State |
| Parent feature | [`../../design/feature-design.md`](../../design/feature-design.md) (and [`../../spec/feature-spec.md`](../../spec/feature-spec.md)) |
| Service group / capability | V2 per-channel agent-state widget |
| Tracker / Epic key | WXCC-15791 |
| Status | ready |
| Generated from | `epic` @ SDLC template library `0.2.0` |

## Scope — the slice of the design this epic delivers
A separate V2 widget mirroring the V1 `user-state` hierarchy: cc-components presentational layer, the `@webex/cc-granular-agent-state` package, the additive store V2 surface, and r2wc registration. The React sample is a follow-up. The V1 `user-state` widget is untouched. Lands as one PR.

## Mapped Design Sections
| Feature design section | What this epic delivers |
|---|---|
| Functional-Block Decomposition | store surface, components, package, registration |
| Interface & Contract Definitions | store V2 surface + widget contracts |

## Summary of Changes (per service / module)
- **`cc-components`:** `GranularAgentState/` components + exports.
- **`store`:** V2 observables + `refreshAgentStateControl()` + event wiring.
- **`granular-agent-state` (new):** observer widget + gate + hook.
- **`cc-widgets`:** r2wc + re-export + dependency.
- **sample app:** V2 widget integration.

## Baseline vs This Epic
| Capability | Already shipped (baseline) | Added by this epic |
|---|---|---|
| V1 `user-state` widget | yes (unchanged) | — |
| V2 per-channel widget + store surface | — | this epic |

## Child Tasks
| Task | One-line | PR-sized? | Task doc | Tracker key |
|---|---|---|---|---|
| W1 | cc-components `GranularAgentState` components + exports | yes | [`task-w1.md`](./task-w1.md) | WXCC-15791 |
| W2 | Store V2 surface + `granular-agent-state` package + cc-widgets r2wc | yes | [`task-w2.md`](./task-w2.md) | WXCC-15791 |
| W3 | Unit tests + sample app integration | yes | [`task-w3.md`](./task-w3.md) | WXCC-15791 |

## Sequencing & Dependencies
| Task | Depends on | Parallel-safe with | Wave |
|---|---|---|---|
| W1 | — | — | 1 |
| W2 | W1 | — | 2 |
| W3 | W1, W2 | — | 3 |

## Rollout Order
1. SDK V2 published; bump store `@webex/contact-center` dep.
2. Ship widget (gated by `store.isGranularAgentStateActive`).
3. Enable `manageChannelAvailability` on agent profiles progressively.

## Exit Criteria
- [ ] V2 widget registered + exported; store V2 surface wired; V1 `user-state` unchanged.
- [ ] Build chain green; store + granular package unit suites green.
