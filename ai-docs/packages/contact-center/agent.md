# Contact Center — agent.md

**Scope:** Contact Center packages: widgets, UI components, store, utilities, logging, and fixtures.  
**Primary audience:** Widget contributors, QA, and maintainers.

## Responsibilities

- Deliver Contact Center widgets and supporting libraries (React UI primitives, Web Components, MobX store, logging).

## Key abstractions / APIs

- Widgets: `station-login`, `task`, `user-state`
- UI primitives: `cc-components`
- Web Components wrappers: `cc-widgets`
- State: `store` (MobX)
- Utilities: `test-fixtures`, `ui-logging`

## Dependencies & interactions

- Widgets consume `cc-components` and `store`.
- Web Components exported via `cc-widgets` (r2wc). See patterns.

## Invariants & constraints

- Follow patterns documented in `../../patterns/*.md`.
- Keep widget docs (`architecture.md`, `README.md`) synchronized with code.

## How to extend or modify

- Add/modify a widget under `packages/contact-center/<widget>/` and mirror docs under `ai-docs/packages/contact-center/<widget>/`.

## Testing & quality gates

- Unit and component tests under each package’s `tests/`.

## Observability

- Use `ui-logging` helpers for metrics and logging.

## Security & compliance

- Avoid logging PII. <!-- TODO: document any specific compliance requirements -->

## Related docs

- **Root index:** [../../agent.md](../../agent.md)
- **Repo rules:** [../../rules.md](../../rules.md)
- **Tooling:** [../../toolings/tooling.md](../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../@webex/widgets/agent.md](../@webex/widgets/agent.md)
- **Children:**
  - [./cc-components/agent.md](./cc-components/agent.md)
  - [./cc-widgets/agent.md](./cc-widgets/agent.md)
  - [./store/agent.md](./store/agent.md)
  - [./station-login/agent.md](./station-login/agent.md)
  - [./task/agent.md](./task/agent.md)
  - [./user-state/agent.md](./user-state/agent.md)
  - [./ui-logging/agent.md](./ui-logging/agent.md)
  - [./test-fixtures/agent.md](./test-fixtures/agent.md)

## Source map

- `packages/contact-center/*`

<!-- TODOs -->


