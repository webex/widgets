# CC Web Components (r2wc wrappers) — agent.md

**Scope:** Web Component wrappers for Contact Center widgets mirrored from `packages/contact-center/cc-widgets`.  
**Primary audience:** Consumers embedding widgets as Web Components, and widget authors exposing WC surfaces.

## Responsibilities

- Expose React-based widgets as Web Components via `@r2wc/react-to-web-component`.

## Key abstractions / APIs

- `src/index.ts` and `src/wc.ts` exporting custom elements. <!-- TODO: list exact tag names -->

## Dependencies & interactions

- Wraps React components from Contact Center packages; uses the r2wc adapter (see `ai-docs/patterns/web-component-patterns.md`).

## Invariants & constraints

- Attribute/prop mapping must follow patterns and be documented in widget READMEs.

## How to extend or modify

- Add new custom elements in `src/wc.ts` mapping to React components. Update docs with tag names and attributes.

## Testing & quality gates

- Validate rendering and attribute mapping via component tests. <!-- TODO: add direct references if available -->

## Observability

- Ensure events/metrics propagate from wrapped components if required.

## Security & compliance

- Sanitize string attributes where needed; do not expose sensitive data via attributes.

## Related docs

- **Root index:** [../../../agent.md](../../../agent.md)
- **Repo rules:** [../../../rules.md](../../../rules.md)
- **Tooling:** [../../../toolings/tooling.md](../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../cc-components/agent.md](../cc-components/agent.md), [../store/agent.md](../store/agent.md), [../ui-logging/agent.md](../ui-logging/agent.md), [../test-fixtures/agent.md](../test-fixtures/agent.md)
- **Children:** (none)

## Source map

- `packages/contact-center/cc-widgets/src/index.ts`
- `packages/contact-center/cc-widgets/src/wc.ts`

<!-- TODOs -->


