<!-- ───────────────────────────────
  Template:     ADR (example)
  Template-ID:  adr
  Generates:    ai-docs/adr/NNNN-<kebab-title>.md
  Description:  Standing architecture decision record — context, decision, alternatives rejected, consequences.
  Library ver:  0.1.0-draft
  Last updated: 2026-06-18
─────────────────────────────── -->

# ADR-0001 — One-directional dependency flow with a single SDK boundary

> Start here → repo root [`AGENTS.md`](../../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](../SPEC_INDEX.md) · system [`ARCHITECTURE.md`](../ARCHITECTURE.md). This is a standing `ai-docs/adr/` decision record; the folder README explains numbering/supersession.
> Context-efficiency: link to canonical docs — don't duplicate them; one decision per file.

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-06-29 |
| Deciders | CC widgets architect + package maintainers |
| Supersedes / Superseded by | none |
| Generated from | `adr` @ SDLC template library `0.1.0-draft` |

## Context
The monorepo ships several independently-publishable packages that compose into framework-agnostic Web
Components. Without a stated direction of dependency, packages would import each other freely, producing
import cycles between presentational primitives, feature widgets, and the aggregating wrapper layer — and
every package would couple directly to the Webex Contact Center SDK (`@webex/contact-center`), so an SDK
change would ripple through the whole tree and SDK calls would be impossible to mock at one place in tests.

The actual `package.json` dependency graph already encodes a single direction:
- `@webex/cc-station-login`, `@webex/cc-user-state`, `@webex/cc-task` → depend on `@webex/cc-components` + `@webex/cc-store`.
- `@webex/cc-components` → depends on `@webex/cc-store` + `@webex/cc-ui-logging`.
- `@webex/cc-widgets` → depends on the feature widgets (`cc-station-login`, `cc-user-state`, `cc-task`, `cc-digital-channels`) + `@webex/cc-store`.
- `@webex/cc-store` → is the only package that depends on `@webex/contact-center` (the SDK).

This ADR records that arrangement as a deliberate constraint, not an accident.

## Decision
Dependencies flow in exactly one direction:

```
cc-widgets → widget packages (station-login, user-state, task, digital-channels) → cc-components → store → SDK
```

No package may import "upstream" against this arrow (cc-components must not import a widget package; a
widget must not import cc-widgets). The Webex Contact Center SDK is accessed **only** through the
`@webex/cc-store` MobX singleton (`Store.getInstance()`, `store.cc.*`); no other package imports
`@webex/contact-center` directly. The store is the single SDK boundary for the entire repo.

## Alternatives Considered
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Widgets / components call the SDK directly | Fewer hops for a single call | SDK coupling scattered across every package; an SDK change ripples everywhere; SDK calls hard to mock in tests | Rejected — defeats the single-boundary goal and makes the dependency graph cyclic |
| Multiple stores (one per widget) | Local state ownership per feature | Cross-widget state (agent state, active task, login) becomes incoherent; duplicated SDK wiring; sync bugs | Rejected — a single MobX singleton keeps global CC state coherent across widgets |

## Consequences
- **Positive:** No import cycles; SDK coupling isolated to one package, so SDK upgrades touch one boundary; widgets/components are trivially testable by mocking the store; global CC state stays coherent.
- **Negative / cost:** All SDK surface a widget needs must be exposed through the store first; adding a new SDK call means extending the store rather than calling inline.
- **Agents must:** Never import `@webex/contact-center` outside `packages/contact-center/store/`; never add an upstream import that reverses the dependency arrow; route all SDK access through `store.cc.*`.

## Revisit When
- A second legitimate SDK boundary emerges (e.g. a non-CC SDK with no shared state) that the single store cannot reasonably own.
