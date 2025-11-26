# Playwright E2E Tests — agent.md

**Scope:** End-to-end test suites and utilities mirrored from `playwright/`.  
**Primary audience:** QA engineers, contributors validating end-to-end behaviors.

## Responsibilities

- Define and orchestrate E2E scenarios for Contact Center widgets and flows.

## Key abstractions / APIs

- Test suites in `playwright/tests/*.spec.ts` and `playwright/suites/*.spec.ts`.
- Helpers in `playwright/Utils/*.ts`.
- Global setup in `playwright/global.setup.ts` and config in `playwright.config.ts`.

## Dependencies & interactions

- Tests exercise built widgets/samples; may depend on sample apps in `widgets-samples/`.

## Invariants & constraints

- Tests should be deterministic and resilient to timing; use explicit waits and test IDs where possible.

## How to extend or modify

- Add new specs under `tests/` or `suites/`; extend helpers under `Utils/`.

## Testing & quality gates

- Run via Playwright runner; integrate into CI. <!-- TODO: document exact command -->

## Observability

- Consider structured logging of steps and artifacts (screenshots, videos) for CI runs.

## Security & compliance

- Avoid real credentials or PII in test data; use fixtures.

## Related docs

- **Root index:** [../agent.md](../agent.md)
- **Repo rules:** [../rules.md](../rules.md)
- **Tooling:** [../toolings/tooling.md](../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../packages/agent.md](../packages/agent.md), [../widgets-samples/agent.md](../widgets-samples/agent.md)
- **Children:** (none)

## Source map

- `playwright/tests/*`
- `playwright/suites/*`
- `playwright/Utils/*`
- `playwright/global.setup.ts`
- `playwright.config.ts`

<!-- TODOs -->


