# Packages — agent.md

**Scope:** High-level index of code packages mirrored under `ai-docs/packages/`.  
**Primary audience:** Contributors, reviewers.

## Responsibilities

- Provide entry points to package families (Contact Center, Webex Widgets).

## Key abstractions / APIs

- Contact Center widgets, store, components under `contact-center/`
- Legacy Webex Widgets under `@webex/widgets/`

## Dependencies & interactions

- Contact Center packages depend on shared store and UI primitives.

## Invariants & constraints

- Keep this index synchronized with `packages/`.

## How to extend or modify

- Add a new package directory under `ai-docs/packages/` and provide an `agent.md`.

## Testing & quality gates

- See package-level agents for their tests.

## Observability

- See `ui-logging` in Contact Center.

## Security & compliance

- See package-level notes.

## Related docs

- **Root index:** [../agent.md](../agent.md)
- **Repo rules:** [../rules.md](../rules.md)
- **Tooling:** [../toolings/tooling.md](../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Children:**
  - [./contact-center/agent.md](./contact-center/agent.md)
  - [./@webex/widgets/agent.md](./@webex/widgets/agent.md)

## Source map

- `packages/contact-center/*`
- `packages/@webex/widgets/*`

<!-- TODOs -->


