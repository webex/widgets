# WIDGETS CONTACT CENTER — agent.md

**Scope:** Documentation index for the repository, mirroring the code structure under `ai-docs/`. Does not replace code READMEs; complements them.  
**Primary audience:** Contributors, maintainers, tooling authors, test engineers.

## Responsibilities

- Provide a hierarchical, bidirectional navigation of the repo.
- Centralize conventions, patterns, and architecture references.
- Point to per-widget design docs (architecture and usage).

## Key abstractions / APIs

- Contact Center widgets and primitives under `packages/contact-center/*`
- Legacy Webex widgets under `packages/@webex/widgets`
- E2E tests under `playwright/`
- Samples under `widgets-samples/`

## Dependencies & interactions

- Widgets depend on `cc-components` (React primitives) and `store` (MobX singleton).
- Web Components are wrapped via `r2wc` in `cc-widgets` (see patterns).
- E2E test suites depend on samples and widget build outputs. <!-- TODO: clarify precise test bootstrapping -->

## Invariants & constraints

- Follow repository patterns in `./patterns/` for TypeScript, React, MobX, Web Components, and testing.
- Maintain three-layer pattern for widgets where applicable (Widget → Hook/Logic → Component) as documented in patterns. <!-- TODO: confirm exact layering per widget -->

## How to extend or modify

- Add a new docs node by mirroring the code path under `ai-docs/` and creating an `agent.md`.
- For new widgets, include `architecture.md` and `README.md` beside the widget `agent.md` under `ai-docs/packages/contact-center/<widget>/`.

## Testing & quality gates

- Unit and integration tests live under each package’s `tests/` directory.
- E2E tests are in `playwright/` with suites and helpers.

## Observability

- UI metrics/logging helpers under `packages/contact-center/ui-logging`. <!-- TODO: clarify logging sinks and metrics taxonomy -->

## Security & compliance

- Widgets may surface user or contact data; avoid logging PII. <!-- TODO: document data flow and PII handling per widget -->

## Related docs

- **Repo rules:** [./rules.md](./rules.md)
- **Tooling:** [./toolings/tooling.md](./toolings/tooling.md)

## Related agents

- **Children:**
  - [./patterns/agent.md](./patterns/agent.md)
  - [./diagrams/agent.md](./diagrams/agent.md)
  - [./packages/agent.md](./packages/agent.md)
  - [./playwright/agent.md](./playwright/agent.md)
  - [./widgets-samples/agent.md](./widgets-samples/agent.md)
  - [./toolings/agent.md](./toolings/agent.md)

## Source map

- `packages/contact-center/*`
- `packages/@webex/widgets/*`
- `playwright/*`
- `widgets-samples/*`
- `ai-docs/patterns/*`, `ai-docs/diagrams/*`

<!-- TODOs -->
