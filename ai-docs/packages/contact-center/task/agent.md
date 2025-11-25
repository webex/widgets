# Task Widget — agent.md

**Scope:** Contact Center Task widget mirrored from `packages/contact-center/task`.  
**Primary audience:** Widget contributors, integrators.

## Responsibilities

- Render and manage task-related UI and controls (e.g., CallControl, IncomingTask, TaskList, OutdialCall, CAD).

## Key abstractions / APIs

- Public surface via `src/index.ts`.
- Feature modules under `src/*/index.tsx` (e.g., `CallControl`, `IncomingTask`, `TaskList`, `OutdialCall`, `CallControlCAD`).
- Shared helpers under `src/Utils/` and types under `src/task.types.ts`.

## Dependencies & interactions

- Consumes `cc-components` primitives and the shared `store` for task state.

## Invariants & constraints

- Follow React and TypeScript patterns; keep side effects contained.

## How to extend or modify

- Add/modify feature modules under `src/<Feature>/index.tsx`; update types and helpers as needed.

## Testing & quality gates

- Tests under `packages/contact-center/task/tests/*`.

## Observability

- Emit metrics via `ui-logging` where applicable. <!-- TODO: confirm current instrumentation -->

## Security & compliance

- Avoid logging customer/contact PII.

## Related docs

- **Root index:** [../../../../agent.md](../../../../agent.md)
- **Repo rules:** [../../../../rules.md](../../../../rules.md)
- **Tooling:** [../../../../toolings/tooling.md](../../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../station-login/agent.md](../station-login/agent.md), [../user-state/agent.md](../user-state/agent.md), [../cc-components/agent.md](../cc-components/agent.md), [../store/agent.md](../store/agent.md)
- **Children:** [./architecture.md](./architecture.md), [./README.md](./README.md)

## Source map

- `packages/contact-center/task/src/index.ts`
- `packages/contact-center/task/src/*/index.tsx`
- `packages/contact-center/task/src/task.types.ts`
- `packages/contact-center/task/src/Utils/*`
- `packages/contact-center/task/tests/*`

<!-- TODOs -->


