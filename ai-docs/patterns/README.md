<!-- ───────────────────────────────
  Template:     Patterns folder README
  Template-ID:  patterns-readme
  Generates:    ai-docs/patterns/README.md
  Description:  Explains the ai-docs/patterns/ folder — what a pattern is, the per-pattern shape, and routing.
  Library ver:  0.1.0-draft
  Last updated: 2026-07-01
─────────────────────────────── -->

# ai-docs/patterns/ — repo conventions (correct vs incorrect)

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md). This is the `ai-docs/patterns/` folder README; per-pattern files carry their own navigation pointer.
> Context-efficiency: link to canonical docs — don't duplicate them; one small, code-grounded pattern per section.

Conventions the linter doesn't catch — the local idioms for MobX state, the Widget → Hook → Component
layering, TypeScript prop-derivation, and how tests mock the store — extracted from **real source**
(a convention seen in 3+ files), never invented.

## Use Patterns For

Use patterns when a convention is visible in real code but not enforced by tooling. A pattern shows a
correct form (copied from real source, with a `// from <path>` anchor) and the common incorrect form, so
a future agent follows the local style instead of guessing.

- **Fill-in shape:** each pattern uses **When to use · Correct · Incorrect** (+ **Why wrong**) **· Where
  it appears · Edge cases / exceptions** (see the SDLC template `_pattern-example.md`).
- **Grounded in real code:** the `Correct` snippet is copied from a real file and the `Where it appears`
  list names 3+ real paths under `packages/contact-center/*/src/` (or `playwright/`). A convention seen in
  fewer than 3 files is kept as a **Candidate** note, not promoted to an enforceable pattern.
- **Defer to the linter:** if ESLint/Prettier/CI already enforces something, point to the tool rather
  than writing a pattern here.

## Routing

The SDLC standard puts generic patterns directly in `ai-docs/patterns/` and language-specific ones in
`ai-docs/patterns/<language>/`. This repo instead groups patterns **by language/layer in one file per
group** (a pre-standard layout kept for continuity), each holding several patterns in the shape above:

| File | Covers |
|---|---|
| [`mobx-patterns.md`](./mobx-patterns.md) | Singleton store, `runInAction` mutations, `observer` widgets, store-event wiring |
| [`react-patterns.md`](./react-patterns.md) | Widget → Hook → Component layering, `ErrorBoundary`, `helper.ts` hooks, effect cleanup |
| [`typescript-patterns.md`](./typescript-patterns.md) | `*.types.ts` co-location, `Pick`/`Partial` prop derivation, in-repo event enums, JSDoc |
| [`testing-patterns.md`](./testing-patterns.md) | Jest + RTL store mocking, `renderHook`, `data-testid`, Playwright `TestManager` + Utils functions |

Enforceable, single-constraint rules live in [`../rules/`](../rules/); standing decisions in
[`../adr/`](../adr/); the repo-wide rules digest is [`../RULES.md`](../RULES.md).
