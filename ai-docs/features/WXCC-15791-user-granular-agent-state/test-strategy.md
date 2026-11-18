# Test Strategy — WXCC-15791: Granular Agent State Control V2 (Widgets)

> **Navigation:** [AGENTS.md](../../../AGENTS.md) → [SPEC_INDEX.md](../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../ARCHITECTURE.md)

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
| W-R-3..7 manage view | rows/toggles, All logic, Apply changed-only, preservation of unconfirmed choices during partial state updates, Cancel no-op | cc-components GranularAgentState tests |
| W-R-8 gate | renders for V2 session; renders null for V1 | `granular-agent-state/tests/granular-agent-state/index.tsx` |
| W-R-9 registration | build + r2wc type-check | `cc-widgets` build |
| W-R-11/12 pill/menu | primary channel pill, preview, menu search/actions | cc-components tests |

## Integration Tests
Build chain compiles store → cc-components → granular-agent-state → cc-widgets using store-owned V2 compatibility types aligned with the SDK PR; optional runtime getters keep older published SDKs safe until the SDK release is available. r2wc registration type-checks the component props.

## System / E2E Tests
Deferred (follow-up): React sample app manual verification against a V2 tenant.

## Coverage Summary
| Area | Status |
|---|---|
| store V2 surface | `store/tests/store.ts` covers defaults and `refreshAgentStateControl` scenarios |
| store event wiring | `store/tests/storeEventsWrapper.ts` covers V2 event handlers (`handleChannelStateChange`, `handleChannelStateChangeFailed`, channel relogin registration) |
| granular package | Hook tests cover state changes, no-op requests, SDK rejection, and worker lifecycle; widget tests cover V1/V2 gating and error handling |
| build chain | store/cc-components/granular-agent-state/cc-widgets build clean |

## Gaps / Risks
- The current PR checks pass the consumer build matrix. Manual end-to-end login and behavior against a V2 tenant have not been verified in this test strategy.
- E2E automation and manual sample-app verification against a V2 tenant remain follow-ups; sample preference migration is implemented but has no dedicated automated test.
