# CC Components (React UI primitives) — agent.md

**Scope:** Reusable React UI components for Contact Center widgets mirrored from `packages/contact-center/cc-components`.  
**Primary audience:** Component authors and widget contributors.

## Responsibilities

- Provide presentational and interactive components (e.g., StationLogin, TaskList, CallControl) used by widgets.

## Key abstractions / APIs

- Exported via `src/index.ts` and `src/utils/index.ts`.
- Components under `src/components/*` with associated types and styles.

## Dependencies & interactions

- Consumed by Contact Center widgets (`station-login`, `task`, `user-state`).
- May read from/store state via props; stateful logic lives in widgets/store.

## Invariants & constraints

- Follow TypeScript and React patterns in `ai-docs/patterns/*.md`.
- Keep components pure where possible; side effects minimal and explicit.

## How to extend or modify

- Add a new component under `src/components/<Name>/` with types, styles, and tests.

## Testing & quality gates

- Component tests in `packages/contact-center/cc-components/tests/components/*`.

## Observability

- Integrate `ui-logging` via higher-order wrappers or explicit callbacks as needed. <!-- TODO: cross-link exact patterns -->

## Security & compliance

- Avoid logging sensitive data from props or events.

## Related docs

- **Root index:** [../../../agent.md](../../../agent.md)
- **Repo rules:** [../../../rules.md](../../../rules.md)
- **Tooling:** [../../../toolings/tooling.md](../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../cc-widgets/agent.md](../cc-widgets/agent.md), [../store/agent.md](../store/agent.md), [../ui-logging/agent.md](../ui-logging/agent.md), [../test-fixtures/agent.md](../test-fixtures/agent.md), [../station-login/agent.md](../station-login/agent.md), [../task/agent.md](../task/agent.md), [../user-state/agent.md](../user-state/agent.md)
- **Children:** (component-level docs live with code; not mirrored here)

## Source map

- `packages/contact-center/cc-components/src/index.ts`
- `packages/contact-center/cc-components/src/components/*`
- `packages/contact-center/cc-components/tests/*`

<!-- TODOs -->


