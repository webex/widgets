# Diagrams — agent.md

**Scope:** Architecture and navigation diagrams for the repository.  
**Primary audience:** Contributors, architects.

## Responsibilities

- Provide visual overviews of system architecture and LLM navigation flows.

## Key abstractions / APIs

- PlantUML diagrams edited as `.puml` files.

## Dependencies & interactions

- Diagrams reflect the current architecture across `packages/*` and test flows in `playwright/`. Keep synchronized with code.

## Invariants & constraints

- Diagrams should be kept up-to-date when architecture changes.

## How to extend or modify

- Add new `.puml` files and link them below. Consider adding ASCII excerpts to relevant `agent.md` files.

## Testing & quality gates

- Visual review in PRs; ensure links remain valid.

## Observability

- N/A

## Security & compliance

- Avoid embedding secrets or internal endpoints in diagrams.

## Related docs

- **Root index:** [../agent.md](../agent.md)
- **Repo rules:** [../rules.md](../rules.md)
- **Tooling:** [../toolings/tooling.md](../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../patterns/agent.md](../patterns/agent.md)
- **Children:** (diagrams)
  - [./architecture.puml](./architecture.puml)
  - [./llm-navigation.puml](./llm-navigation.puml)

## Source map

- `ai-docs/diagrams/*.puml`

<!-- TODOs -->
