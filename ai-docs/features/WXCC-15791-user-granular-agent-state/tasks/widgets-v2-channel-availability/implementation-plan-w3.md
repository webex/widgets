# Implementation Plan — W3: Tests & Sample App

> **Navigation:** [AGENTS.md](../../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../../ai-docs/SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../../ai-docs/ARCHITECTURE.md)

> Plan for [`task-w3.md`](./task-w3.md) under [`epic.md`](./epic.md).

## Task Context
Cover the store V2 surface and widget gate/hook with unit tests, and integrate the V2 widget into the React sample app.

## Current Context (code-grounded)
- `store/tests/store.ts` and `store/tests/storeEventsWrapper.ts` exist for V1.
- `granular-agent-state/tests/*` exist for the widget + hook.

## Proposed Approach & Sequencing
1. `store/tests/store.ts`: add V2 default assertions + a `refreshAgentStateControl` describe (no-op / populate / getter-absent fallback).
2. `store/tests/storeEventsWrapper.ts`: add V2 fields + `refreshAgentStateControl` to the store mock so lifecycle handlers that call it don't break.
3. `granular-agent-state` tests: type the global `Worker` mock to `typeof Worker`.
4. Sample app: render `GranularAgentState` when `store.isGranularAgentStateActive`, else `UserState`.

## Build / CI / Deployment Impact
Runs under existing Jest configs; build chain must stay green.

## Backward-Compat / Rollback
Test-only + sample-only; no production impact.

## Implementation Caveats
The PR checks include passing consumer build jobs for esbuild, parcel, rollup, vite, and webpack. Manual login and behavior against a V2 tenant remain to be verified.

## Manual Validation
Store and granular package unit suites pass; the build chain is clean.

## AI Docs Impact
Update [`../../test-strategy.md`](../../test-strategy.md) status.

## References
- [`task-w3.md`](./task-w3.md) · [`../../test-strategy.md`](../../test-strategy.md)

## Logs and Metrics

- No production log/metric changes (test-only task).
- Verify store V2 surface tests exercise `refreshAgentStateControl()` warn-level logging on getter failure.

## PR Split Strategy

- Store test additions (`store/tests/store.ts` and `store/tests/storeEventsWrapper.ts`) land as one commit.
- `granular-agent-state` test updates (Worker mock typing, gate + hook tests) land as a second commit.
- Sample app integration (`App.tsx` conditional rendering) lands as a lightweight third commit.

## Documentation Updates

- Update [`../../test-strategy.md`](../../test-strategy.md) with the available test and CI results.
- Document sample app V2 widget rendering behavior in the sample app README if present.
