# Legacy Webex Widgets — agent.md

**Scope:** Legacy Webex widgets package mirrored from `packages/@webex/widgets`.  
**Primary audience:** Contributors maintaining legacy widgets and demos.

## Responsibilities

- Provide Webex Meetings widget and related demo/test scaffolding.

## Key abstractions / APIs

- `src/widgets/WebexMeetings/*` and package-level `index.js`.

## Dependencies & interactions

- Independent from Contact Center packages.

## Invariants & constraints

- Treat as legacy; changes should not impact Contact Center packages.

## How to extend or modify

- Follow package-local README and scripts.

## Testing & quality gates

- E2E tests via WebdriverIO in this package (`wdio.conf.js`, `tests/*`). <!-- TODO: confirm current status -->

## Observability

- N/A

## Security & compliance

- Avoid logging PII in demos and tests.

## Related docs

- **Root index:** [../../../agent.md](../../../agent.md)
- **Repo rules:** [../../../rules.md](../../../rules.md)
- **Tooling:** [../../../toolings/tooling.md](../../../toolings/tooling.md)

## Related agents

- **Parent:** [../../agent.md](../../agent.md)
- **Siblings:** [../../contact-center/agent.md](../../contact-center/agent.md)
- **Children:** (none)

## Source map

- `packages/@webex/widgets/*`

<!-- TODOs -->


