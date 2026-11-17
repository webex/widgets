# Implementation Plan — W2: Store V2 Surface, Package & Registration

> **Navigation:** [AGENTS.md](../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

> Plan for [`task-w2.md`](./task-w2.md) under [`epic.md`](./epic.md).

## Task Context
Add the additive store V2 surface, the `@webex/cc-granular-agent-state` package, and r2wc registration so the widget compiles and runs against the SDK V2 surface.

## Current Context (code-grounded)
- `store/src/` had no V2 observables/action/wiring; the widget + hook already read `store.isGranularAgentStateActive`/`channelStatesMap` and call `store.refreshAgentStateControl()`.
- `cc-widgets/src/wc.ts` registers the other widgets via r2wc.

## Proposed Approach & Sequencing
1. `store.ts`: add the two observables + `refreshAgentStateControl()` (reads `cc.getAgentStateControl().active`/`getChannelStates()`); call it in `registerCC`.
2. `store.types.ts`: re-export SDK V2 types; add V2 getters to `IContactCenter`; add fields to `IStore`; add `CC_EVENTS` channel events.
3. `storeEventsWrapper.ts`: add getters + `handleChannelStateChange` (on `AGENT_CHANNEL_STATE_CHANGE`) + `handleChannelStateChangeFailed` (on `AGENT_CHANNEL_STATE_CHANGE_FAILED`); wire `agent:channelStateChange`/`agent:channelStateChangeFailed` on/off in `addEventListeners`/`removeEventListeners`; wire `agent:channelReloginSuccess` via `bootstrapSession` forEach loop; refresh on login/relogin; reset in `cleanUpStore`.
4. `granular-agent-state` package: observer widget + ErrorBoundary gate + `useGranularAgentState` hook + types + index.
5. `cc-widgets`: r2wc `widget-cc-granular-agent-state` in `wc.ts`, re-export in `index.ts`, add the package dependency.

## API / Interface Changes
Store surface per [`../../design/contracts/store-v2-surface.md`](../../design/contracts/store-v2-surface.md); widget per [`granular-agent-state-widget.md`](../../design/contracts/granular-agent-state-widget.md).

## Backward-Compat / Rollback
Additive; V1 surface + `user-state` widget unchanged. Rollback = remove the package + store V2 surface.

## Build / CI / Deployment Impact
`yarn install` links the new workspace dependency; build order store → cc-components → granular-agent-state → cc-widgets. Widgets build against the SDK V2 types (local dist until the SDK publishes).

## Implementation Caveats
- `refreshAgentStateControl()` is a silent no-op when `cc.getAgentStateControl` is absent (returns immediately). When `getChannelStates()` is absent, `??` falls back to `{}`. On throw, the catch logs the error and retains previous observable values (no reset to defaults).
- Listener registration must stay idempotent.

## Manual Validation
Build chain compiles clean; store unit suite green.

## AI Docs Impact
Update the store module spec (V2 surface) and cc-widgets/granular module specs.

## References
- [`task-w2.md`](./task-w2.md)

## Logs and Metrics

- `refreshAgentStateControl()` logs getter failures at warn level and retains previous values.
- Store event wiring (`handleChannelStateChange`) logs received V2 events at debug level.
- `ErrorBoundary` in the widget gate calls `store.onErrorCallback('GranularAgentState', err)` for error tracking.
- Listener registration/teardown logged at debug level to diagnose lifecycle issues.

## PR Split Strategy

- Store V2 surface (`store.ts`, `store.types.ts`, `storeEventsWrapper.ts`) lands as one reviewable commit.
- `@webex/cc-granular-agent-state` package (observer widget + hook + types) lands as a second commit.
- `cc-widgets` registration (`wc.ts`, `index.ts`, `package.json` dep) lands as a third lightweight commit.

## Documentation Updates

- Update the store module spec to document V2 observables, `refreshAgentStateControl()`, and V2 event wiring.
- Update the `cc-widgets` module spec to document `widget-cc-granular-agent-state` registration.
- Add module spec for the new `@webex/cc-granular-agent-state` package.
