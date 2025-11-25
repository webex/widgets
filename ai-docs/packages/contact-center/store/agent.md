# Store (MobX) — agent.md

**Scope:** Contact Center shared state management mirrored from `packages/contact-center/store`.  
**Primary audience:** Widget authors, state managers.

## Responsibilities

- Provide a singleton MobX store and utilities for Contact Center widgets.

## Key abstractions / APIs

- `store.ts` (store implementation), `store.types.ts` (types), `storeEventsWrapper.ts` (events), `task-utils.ts`, `util.ts`, `constants.ts`.
- Public surface via `src/index.ts`.

## Dependencies & interactions

- Consumed by widgets and UI components; orchestrates task/user state.

## Invariants & constraints

- Follow MobX patterns and immutability constraints where applicable (see `ai-docs/patterns/mobx-patterns.md`).

## How to extend or modify

- Add observable state and actions with explicit types; update tests accordingly.

## Testing & quality gates

- Tests under `packages/contact-center/store/tests/*`.

## Observability

- Consider emitting metrics/logs via `ui-logging` when state changes are critical. <!-- TODO: define exact hooks -->

## Security & compliance

- Do not store secrets or sensitive PII in long-lived observables.

## Related docs

- **Root index:** [../../../agent.md](../../../agent.md)
- **Repo rules:** [../../../rules.md](../../../rules.md)
- **Tooling:** [../../../toolings/tooling.md](../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../cc-components/agent.md](../cc-components/agent.md), [../cc-widgets/agent.md](../cc-widgets/agent.md), [../ui-logging/agent.md](../ui-logging/agent.md), [../test-fixtures/agent.md](../test-fixtures/agent.md), [../station-login/agent.md](../station-login/agent.md), [../task/agent.md](../task/agent.md), [../user-state/agent.md](../user-state/agent.md)
- **Children:** [./architecture.md](./architecture.md), [./README.md](./README.md)

## Source map

- `packages/contact-center/store/src/*`
- `packages/contact-center/store/tests/*`

<!-- TODOs -->


