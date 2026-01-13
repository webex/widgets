# Repository Rules & Design Patterns

## Architectural principles

- Clear layering: Widgets → UI components (`cc-components`) → Store (MobX) → SDK/backends (where applicable).

## Naming & structure

- Mirror code structure in docs under `ai-docs/`.
- Keep widget folders self-contained with `agent.md`, `architecture.md`, `README.md`.

## Components & APIs

- Strongly typed props and public surfaces (`index.ts` per package/widget).
- Co-locate types with components (e.g., `*.types.ts`).

## Error handling

- Surface user-friendly errors in UI; avoid swallowing exceptions. <!-- TODO: add error boundary patterns if present -->

## Accessibility & i18n

- Ensure keyboard and screen-reader support in components. <!-- TODO: confirm a11y utilities -->

## Styling & theming

- Keep component styles modular (`.scss` or `.css` in component folders). <!-- TODO: document design tokens if any -->

## Performance budgets

- Prefer memoization for derived values; avoid unnecessary re-renders; batch updates with MobX where needed.

## Security

- Do not log PII or credentials. Sanitize user-provided inputs.

## Observability

- Use `ui-logging` helpers (`withMetrics`, `metricsLogger`) for metrics and logs.

## Testing standards

- Unit/component tests per package under `tests/`.
- E2E tests in `playwright/` with suites and helpers.

## Review & contribution

- Follow patterns in `ai-docs/patterns/*.md`.
- Keep docs in sync when APIs change.

<!-- TODOs -->
