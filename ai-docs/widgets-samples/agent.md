# Samples — agent.md

**Scope:** Sample applications and HTML demos mirrored from `widgets-samples/`.  
**Primary audience:** Integrators, contributors testing widgets in isolation.

## Responsibilities

- Provide runnable examples for widgets (React app and Web Component samples) and meeting samples.

## Key abstractions / APIs

- Contact Center samples under `cc/` and meetings sample under `samples-meeting-app/`.

## Dependencies & interactions

- Samples may be used by Playwright tests and for manual verification.

## Invariants & constraints

- Keep sample code aligned with package APIs.

## How to extend or modify

- Add new samples mirroring the structure here; link them below.

## Testing & quality gates

- Used by E2E tests; keep minimal and reliable.

## Observability

- Minimal; focus on showcasing integration.

## Security & compliance

- Avoid real credentials; use test fixtures/data.

## Related docs

- **Root index:** [../agent.md](../agent.md)
- **Repo rules:** [../rules.md](../rules.md)
- **Tooling:** [../toolings/tooling.md](../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../playwright/agent.md](../playwright/agent.md), [../packages/agent.md](../packages/agent.md)
- **Children:**
  - [./cc/agent.md](./cc/agent.md)
  - [./samples-meeting-app/agent.md](./samples-meeting-app/agent.md)

## Source map

- `widgets-samples/*`

<!-- TODOs -->


