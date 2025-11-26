# UI Logging — agent.md

**Scope:** UI metrics and logging utilities mirrored from `packages/contact-center/ui-logging`.  
**Primary audience:** Contributors instrumenting widgets/components.

## Responsibilities

- Provide utilities/components for metrics and logging (e.g., `metricsLogger.ts`, `withMetrics.tsx`).

## Key abstractions / APIs

- Public API via `src/index.ts`.

## Dependencies & interactions

- Used by widgets/components to emit metrics and logs.

## Invariants & constraints

- Avoid emitting sensitive data. Centralize metric names and payload shapes. <!-- TODO: document taxonomy -->

## How to extend or modify

- Add new metric helpers or HOCs; update tests accordingly.

## Testing & quality gates

- Tests in `packages/contact-center/ui-logging/tests/*`.

## Observability

- Acts as the observability bridge for UI.

## Security & compliance

- Ensure payloads are sanitized and free of PII.

## Related docs

- **Root index:** [../../../agent.md](../../../agent.md)
- **Repo rules:** [../../../rules.md](../../../rules.md)
- **Tooling:** [../../../toolings/tooling.md](../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../cc-components/agent.md](../cc-components/agent.md), [../cc-widgets/agent.md](../cc-widgets/agent.md), [../store/agent.md](../store/agent.md), [../test-fixtures/agent.md](../test-fixtures/agent.md), [../station-login/agent.md](../station-login/agent.md), [../task/agent.md](../task/agent.md), [../user-state/agent.md](../user-state/agent.md)
- **Children:** (none)

## Source map

- `packages/contact-center/ui-logging/src/*`
- `packages/contact-center/ui-logging/tests/*`

<!-- TODOs -->


