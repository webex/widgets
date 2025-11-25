# Tooling — agent.md

**Scope:** Developer tooling, scripts, and workflows used across the repository.  
**Primary audience:** Contributors, release engineers, CI maintainers.

## Responsibilities

- Document local dev tooling, build, bundling, test, and release workflows.

## Key abstractions / APIs

- Node-based scripts in `tooling/src/` and their tests in `tooling/tests/`.

## Dependencies & interactions

- Tooling interacts with package workspaces and CI. <!-- TODO: clarify CI integration points -->

## Invariants & constraints

- Prefer non-interactive scripts for CI; respect repo package manager settings.

## How to extend or modify

- Add scripts under `tooling/src/` with corresponding tests under `tooling/tests/`. Update this doc if new commands are introduced.

## Testing & quality gates

- Unit tests for tooling live in `tooling/tests/`.

## Observability

- Consider logging important operations and exit codes for CI readability.

## Security & compliance

- Avoid embedding tokens in scripts; read from environment where needed.

## Related docs

- **Root index:** [../agent.md](../agent.md)
- **Repo rules:** [../rules.md](../rules.md)
- **Tooling (details):** [./tooling.md](./tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../patterns/agent.md](../patterns/agent.md), [../packages/agent.md](../packages/agent.md)
- **Children:** (none)

## Source map

- `tooling/src/publish.js`
- `tooling/tests/publish.js`

<!-- TODOs -->


