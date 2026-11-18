# Contract — Store V2 Surface

> **Navigation:** [AGENTS.md](../../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Interface contract for [`../feature-design.md`](../feature-design.md); product delta in [`../../spec/feature-spec.md`](../../spec/feature-spec.md).

## Metadata
| Field | Value |
|---|---|
| Interface | `@webex/cc-store` V2 observables + action |
| Direction | SDK events/getters → store → widgets |
| Change | ADDED (additive) |
| Semver | minor |
| Kind | observable |
| Producer | Store `store.ts` (`refreshAgentStateControl`), `storeEventsWrapper.ts` (event wiring + getters) |
| Consumer(s) | Widget components (`GranularAgentState` observer), Host integrators (via `StoreWrapper` getters) |
| Canonical schema/API source | `store/src/store.types.ts` (`IStore`, `IContactCenter` V2 getters) |
| Generated from | SDLC feature-package/design/contracts template v0.2.0 |

## Summary
The store gains a small additive V2 surface so widgets read per-channel state reactively without importing the SDK. All V1 store surface is unchanged.

## Definition
Observables (`IStore`, `store.ts`):
```typescript
isGranularAgentStateActive: boolean;                                   // default false
channelStatesMap: Partial<Record<ChannelType, AgentChannelTypeStates>>;// default {}
```
Action:
```typescript
refreshAgentStateControl(): void; // reads cc.getAgentStateControl().active,
                                  // cc.getChannelStates()
```
`store.types.ts` defines store-owned `ChannelType`, `AgentChannelTypeStates`, and `AgentStateControlStatus` shapes aligned with the companion SDK types, declares optional V2 getters on `IContactCenter`, and adds `CC_EVENTS.AGENT_CHANNEL_STATE_CHANGE` + `AGENT_CHANNEL_RELOGIN_SUCCESS`. The local type definitions keep the widgets workspace buildable against SDK releases predating V2; runtime access remains optional and guarded. The `StoreWrapper` (`storeEventsWrapper.ts`) exposes getters for the two observables and delegates `refreshAgentStateControl()`. Per-channel capacity is available via `channelStatesMap[channelType].totalChannelCount`.

## Behavior
- `refreshAgentStateControl()` is a no-op when `cc.getAgentStateControl` is absent; otherwise it reads both SDK getters (`getAgentStateControl()` and `getChannelStates()`) and publishes them (falls back to `{}` when the optional getter is absent).
- Wired to refresh on `registerCC()`, `agent:stationLoginSuccess`, `agent:reloginSuccess`, `agent:channelReloginSuccess`, and `agent:channelStateChange`.
- `agent:channelReloginSuccess` is added to the listener bootstrap (sets profile/team then refreshes).
- `cleanUpStore` (logout) resets `isGranularAgentStateActive=false`, `channelStatesMap={}`.

## Error / Failure Catalog
| Condition | Behavior |
|---|---|
| A getter throws | Keep the previous observable values. The action reads the SDK active flag and channel-state map into locals before assigning either observable. |
| `agent:channelStateChangeFailed` | Logged, then `refreshAgentStateControl()`. No optimistic write. |

## Backward Compatibility
Additive only; V1 observables/actions and the `user-state` widget are unchanged.

## Delivery & Ordering Guarantees
Listener registration is idempotent; repeated bootstraps add no duplicate handlers.

## Validation
`store/tests/store.ts` (`refreshAgentStateControl` no-op / populate / fallback) and `store/tests/storeEventsWrapper.ts`.

## References
- Widget: [`granular-agent-state-widget.md`](./granular-agent-state-widget.md)
