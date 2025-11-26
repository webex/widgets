# Patterns — agent.md

**Scope:** Repository-wide coding patterns and conventions. Not tied to a single package.  
**Primary audience:** Contributors and reviewers.

## Responsibilities

- Document TypeScript, React, MobX, Web Component, and Testing patterns used across the repo.

## Key abstractions / APIs

- Patterns documents under this directory are normative references.

## Dependencies & interactions

- Referenced by all packages. Keep stable to avoid churn.

## Invariants & constraints

- Align with the code in `packages/*` and tests. When in doubt, add a TODO and clarify.

## How to extend or modify

- Add or update a pattern doc (`*.md`). Cross-link relevant examples in packages.

## Testing & quality gates

- Patterns are validated by adherence in code reviews and automated lint/test gates.

## Observability

- N/A

## Security & compliance

- N/A

## Related docs

- **Root index:** [../agent.md](../agent.md)
- **Repo rules:** [../rules.md](../rules.md)
- **Tooling:** [../toolings/tooling.md](../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../diagrams/agent.md](../diagrams/agent.md)
- **Children:** (pattern files)
  - [./typescript-patterns.md](./typescript-patterns.md)
  - [./react-patterns.md](./react-patterns.md)
  - [./mobx-patterns.md](./mobx-patterns.md)
  - [./web-component-patterns.md](./web-component-patterns.md)
  - [./testing-patterns.md](./testing-patterns.md)

## Source map

- `ai-docs/patterns/*.md`

<!-- TODOs -->


