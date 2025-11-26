# Test Fixtures — agent.md

**Scope:** Shared test fixtures mirrored from `packages/contact-center/test-fixtures`.  
**Primary audience:** Test authors (unit/integration).

## Responsibilities

- Provide reusable fixtures and mock data for Contact Center tests.

## Key abstractions / APIs

- `src/index.ts` and specific fixtures like `incomingTaskFixtures.ts`, `taskListFixtures.ts`, and component-specific fixtures.

## Dependencies & interactions

- Consumed by tests in Contact Center packages.

## Invariants & constraints

- Keep fixtures deterministic and documented.

## How to extend or modify

- Add new fixtures under `src/` and export via `src/index.ts`.

## Testing & quality gates

- Compile-time validation and usage in package tests.

## Observability

- N/A

## Security & compliance

- Ensure fixtures do not include real or sensitive data.

## Related docs

- **Root index:** [../../../agent.md](../../../agent.md)
- **Repo rules:** [../../../rules.md](../../../rules.md)
- **Tooling:** [../../../toolings/tooling.md](../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../cc-components/agent.md](../cc-components/agent.md), [../cc-widgets/agent.md](../cc-widgets/agent.md), [../store/agent.md](../store/agent.md), [../ui-logging/agent.md](../ui-logging/agent.md), [../station-login/agent.md](../station-login/agent.md), [../task/agent.md](../task/agent.md), [../user-state/agent.md](../user-state/agent.md)
- **Children:** (none)

## Source map

- `packages/contact-center/test-fixtures/src/*`

<!-- TODOs -->


