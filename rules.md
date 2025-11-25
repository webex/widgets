# Repository Rules & Design Patterns

This is the entry point for repo-wide rules. The canonical, detailed rules live in `./ai-docs/rules.md`.

## Highlights

- Layering: Widgets → UI Components (`cc-components`) → Store (MobX)
- Web Components wrap React widgets via `@r2wc/react-to-web-component`
- Strong typing and co-located types (`*.types.ts`)
- Testing: Jest per package, Playwright for E2E
- Observability via `ui-logging`

For the full set of principles and guidance, see:

- `./ai-docs/rules.md`


