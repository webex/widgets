# Contract — Granular Agent State Widget

> **Navigation:** [AGENTS.md](../../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Interface contract for [`../feature-design.md`](../feature-design.md); product delta in [`../../spec/feature-spec.md`](../../spec/feature-spec.md).

## Metadata
| Field | Value |
|---|---|
| Interface | `@webex/cc-granular-agent-state` + `widget-cc-granular-agent-state` + cc-components exports |
| Direction | host → widget → store/components |
| Change | ADDED (new package + exports) |
| Semver | new package, cc-components and cc-widgets: `1.28.0-ccwidgets.126` |
| Kind | observable |
| Producer | Widget `granular-agent-state/index.tsx` (observer gate), `helper.ts` (`useGranularAgentState` hook) |
| Consumer(s) | Host integrators (via `widget-cc-granular-agent-state` custom element or React `GranularAgentState` export) |
| Canonical schema/API source | `granular-agent-state/src/granular-agent-state.types.ts`, `cc-components/src/components/GranularAgentState/` types |
| Generated from | SDLC feature-package/design/contracts template v0.2.0 |

## Summary
A new standalone V2 widget mirroring the V1 `user-state` hierarchy: presentational components in `@webex/cc-components`, a container package `@webex/cc-granular-agent-state`, and r2wc registration in `@webex/cc-widgets`.

## Definition
- **React component:** `GranularAgentState` (named export of `@webex/cc-granular-agent-state`), prop `onStateChange?: (payload) => void`.
- **Web Component:** `<widget-cc-granular-agent-state>` via `r2wc(GranularAgentState, {props:{onStateChange:'function'}})` in `cc-widgets/src/wc.ts`; re-exported from `cc-widgets/src/index.ts`.
- **cc-components exports** (from `cc-components/src/index.ts`, minimal — only what the package consumes): `GranularAgentStateComponent` (default of `GranularAgentState/granular-agent-state`), the `granular-agent-state.types`, the utils `getSelectableChannelTypes`, `buildChannelStates`, `getChannelsToChange`, `getLastSetIdleCode`, and `AVAILABLE_AUX_CODE_ID`. All other channel helpers/constants stay internal to the `GranularAgentState/` component.
- **Hook:** `useGranularAgentState({cc, agentId, idleCodes, channelStatesMap, logger, onStateChange})` calls `cc.setAgentState({state, auxCodeId, agentId, lastStateChangeReason, channelType[]})`.

## Behavior
- The widget is a mobx-react-lite `observer` wrapped in `react-error-boundary`; it renders the component only when `store.isGranularAgentStateActive`, else `null` (hook never runs).
- Manage Apply sends only changed channels (one Available request, then one Idle request using the last-set idle code). If Available fails, Idle is not sent; if no idle code exists, the Idle request is skipped. Both cases show an error banner and keep the Manage view open. Set-all menu actions close the menu when initiated; request failures are logged by the hook. `onStateChange` represents request acceptance; confirmed state arrives via store refresh on `agent:channelStateChange`.
- Component errors route to `store.onErrorCallback('GranularAgentState', error)`.

## Error / Failure Catalog
| Condition | Behavior |
|---|---|
| `cc.setAgentState` rejects | Hook logs (`CC-Widgets: GranularAgentState: Error setting agent state`), no rethrow |
| Empty channel list | No-op |
| Component render error | `ErrorBoundary` empty fallback + `onErrorCallback` |

## Backward Compatibility
V1 `user-state` interactions and `widget-cc-user-state` remain intact; response timestamp access is guarded for SDK response compatibility. The host selects V1 vs V2 from the SDK-backed store state.

## Validation
`granular-agent-state/tests/*` (gate, hook) and `cc-components` component tests; cc-widgets build verifies r2wc registration types.

## References
- Store surface: [`store-v2-surface.md`](./store-v2-surface.md)
