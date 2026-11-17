# Test Strategy — WXCC-15791: Granular Agent State Control V2 (Widgets)

> **Navigation:** [AGENTS.md](../../AGENTS.md) → [SPEC_INDEX.md](../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../ARCHITECTURE.md)

> Test plan for [`spec/feature-spec.md`](./spec/feature-spec.md) / [`design/feature-design.md`](./design/feature-design.md).

## Metadata
| Field | Value |
|---|---|
| Feature key | WXCC-15791 |
| Test levels | unit (Jest + RTL) |
| Generated from | `test-strategy` @ SDLC template library `0.2.0` |

## References
- Spec: [`spec/feature-spec.md`](./spec/feature-spec.md) · Design: [`design/feature-design.md`](./design/feature-design.md)
- Suites: `store/tests/store.ts`, `store/tests/storeEventsWrapper.ts`, `granular-agent-state/tests/*`, `cc-components` GranularAgentState tests.

## Test Config Variables
| Variable | Value |
|---|---|
| Runner | Jest + RTL, jsdom |
| Command | `yarn workspace @webex/<pkg> test:unit` |
| Build chain | store → cc-components → cc-granular-agent-state → cc-widgets |

## Use Cases → Tests
| Requirement | Test | Suite |
|---|---|---|
| W-R-1 store surface | `refreshAgentStateControl` no-op / populate / getter-absent fallback; defaults; logout reset | `store/tests/store.ts` |
| W-R-1 event wiring | Implemented in `storeEventsWrapper.ts` (channel relogin bootstraps profile/team/refresh; `agent:channelStateChangeFailed` logs and refreshes). Asserted in `store/tests/storeEventsWrapper.ts`: `handleChannelStateChange` calls `refreshAgentStateControl()`; `handleChannelStateChangeFailed` logs error and calls refresh; event listener registration verified. | `store/tests/storeEventsWrapper.ts` |
| W-R-2 hook | `cc.setAgentState({channelType})`; success refresh + `onStateChange`; failure logged; empty = no-op | `granular-agent-state/tests/helper.ts` |
| W-R-3..7 manage view | rows/toggles, "All" logic, Apply changed-only, Cancel no-op | cc-components GranularAgentState tests |
| W-R-8 gate | renders for V2 session; renders null for V1 | `granular-agent-state/tests/granular-agent-state/index.tsx` |
| W-R-9 registration | build + r2wc type-check | `cc-widgets` build |
| W-R-11/12 pill/menu | primary channel pill, preview, menu search/actions | cc-components tests |

## Integration Tests
Build chain compiles store → cc-components → granular-agent-state → cc-widgets against the (local) SDK V2 types; r2wc registration type-checks the component props.

## System / E2E Tests
Deferred (follow-up): React sample app manual verification against a V2 tenant.

## Coverage Summary
| Area | Status |
|---|---|
| store V2 surface | `store/tests/store.ts` 32 tests pass (incl. V2 surface tests for `refreshAgentStateControl` scenarios) |
| store event wiring | `store/tests/storeEventsWrapper.ts` covers V2 event handlers (`handleChannelStateChange`, `handleChannelStateChangeFailed`, channel relogin registration) |
| granular package | 13 tests pass (10 in `tests/helper.ts` + 3 in `tests/granular-agent-state/index.tsx`) |
| build chain | store/cc-components/granular-agent-state/cc-widgets build clean |

## Gaps / Risks
- cc-components has a **pre-existing, environmental** suite failure (SDK `WELLNESS_BREAK_NOTIFICATION_ACTIONS` resolution under jest) unrelated to this feature; V2 component logic is validated by the granular package tests + build.
- E2E and WC-sample coverage are follow-ups.
