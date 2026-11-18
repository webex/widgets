# Implementation Plan — W1: cc-components GranularAgentState

> **Navigation:** [AGENTS.md](../../../../../AGENTS.md) → [SPEC_INDEX.md](../../../../../ai-docs/SPEC_INDEX.md) → [ARCHITECTURE.md](../../../../../ai-docs/ARCHITECTURE.md)

> Plan for [`task-w1.md`](./task-w1.md) under [`epic.md`](./epic.md).

## Task Context
Build the presentational layer for the V2 widget and export it, mirroring the V1 `UserState` component layout.

## Current Context (code-grounded)
- `cc-components/src/components/UserState/` is the V1 reference; `withMetrics`, `formatTime`, and `ErrorBoundary` are shared infra.
- `GranularAgentState/` components exist on the V2 branch; exports were missing from `cc-components/src/index.ts`.

## Proposed Approach & Sequencing
1. Keep the `GranularAgentState/` components (pill, avatar, preview, menu, manage view) + utils + constants + types.
2. Keep `formatDuration` (hh:mm:ss) — it is not equivalent to shared `formatTime` and the preview needs it.
3. Export the consumed public surface from `cc-components/src/index.ts`: `GranularAgentStateComponent`, granular types, the four consumed utils, and `AVAILABLE_AUX_CODE_ID`.

## API / Interface Changes
New cc-components exports; see [`../../design/contracts/granular-agent-state-widget.md`](../../design/contracts/granular-agent-state-widget.md).

## Backward-Compat / Rollback
Additive; `UserState` untouched.

## Implementation Caveats
Exported util/constant names must match what the granular package imports from `@webex/cc-components`.

## Manual Validation
`yarn workspace @webex/cc-components build` clean.

## AI Docs Impact
Update the cc-components module spec with the `GranularAgentState` components.

## References
- [`task-w1.md`](./task-w1.md)

## Logs and Metrics

- `withMetrics` HOC wraps `GranularAgentStateComponent` to emit render/interaction metrics via the shared metrics pipeline.
- `formatTime` and `formatDuration` are pure utils with no logging; errors propagate to the calling component.
- No new backend metrics; component-level telemetry follows the existing `cc-components` pattern.

## PR Split Strategy

- All `GranularAgentState/` components, utils, constants, types, and scss land as a single cohesive commit since they are tightly coupled presentational pieces.
- The `cc-components/src/index.ts` export additions land in the same commit to keep the package importable.

## Documentation Updates

- Update the `cc-components` module spec to document the new `GranularAgentState` component directory and its exports.
- Add component prop documentation for `GranularAgentStateComponent` and its sub-components.
