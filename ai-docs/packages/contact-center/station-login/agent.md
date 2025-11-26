# Station Login Widget — agent.md

**Scope:** Contact Center Station Login widget mirrored from `packages/contact-center/station-login`.  
**Primary audience:** Widget contributors, integrators.

## Responsibilities

- Render and manage station login UI/flows for Contact Center agents.  
  Open: `packages/contact-center/station-login/src/station-login/index.tsx`, `packages/contact-center/station-login/src/helper.ts`, `packages/contact-center/cc-components/src/components/StationLogin/*`

## Key abstractions / APIs

- Public surface via `src/index.ts` exporting the widget.  
  Open: `packages/contact-center/station-login/src/index.ts`
- Core UI is consumed from `@webex/cc-components` (e.g., `StationLoginComponent`, `StationLoginComponentProps`, `LoginOptionsState`); this package composes it via `src/station-login/index.tsx` with wrapper types in `src/station-login/station-login.types.ts`.  
  Open: `packages/contact-center/cc-components/src/components/StationLogin/station-login.tsx`, `packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts`, `packages/contact-center/station-login/src/station-login/index.tsx`, `packages/contact-center/station-login/src/station-login/station-login.types.ts`
- Helper utilities in `src/helper.ts`.  
  Open: `packages/contact-center/station-login/src/helper.ts`

## Dependencies & interactions

- Consumes core UI and related types from `@webex/cc-components` and integrates with `store` for state.  
  Open: UI → `packages/contact-center/cc-components/src/components/StationLogin/*`; Store → `packages/contact-center/store/src/*`, docs → `ai-docs/packages/contact-center/store/agent.md`

## Invariants & constraints

- Follow patterns for React + MobX; ensure proper typing of props and events.  
  Open: `ai-docs/patterns/react-patterns.md`, `ai-docs/patterns/mobx-patterns.md`, `ai-docs/patterns/typescript-patterns.md`

## How to extend or modify

- Follow the three-layer pattern (UI → Hook → Orchestrator):
  - UI layer (from `@webex/cc-components`)
    - Visuals and interaction primitives live in `@webex/cc-components` (e.g., `StationLoginComponent`).
    - Prefer extending via props first; only modify `@webex/cc-components` if the UI surface itself must change.
    - Update wrapper types in `src/station-login/station-login.types.ts` if you expose new props/events through this package.  
      Open: `packages/contact-center/cc-components/src/components/StationLogin/station-login.tsx`, `packages/contact-center/cc-components/src/components/StationLogin/station-login.types.ts`, `packages/contact-center/station-login/src/station-login/station-login.types.ts`
  - Business layer (custom hook)
    - Encapsulate station login business logic (validation, side effects, store interactions).
    - Business logic hook entry used by this widget is `useStationLogin` defined in `src/helper.ts` and consumed by `src/station-login/index.tsx`.
    - Keep store reads/writes and async flows inside the hook; keep the UI component presentation-only.  
      Open: `packages/contact-center/station-login/src/helper.ts`, `packages/contact-center/station-login/src/station-login/index.tsx`
  - Orchestrator (package entry)
    - `src/index.ts` composes the hook and UI, wires events/props, and exports the public widget API (and WC if applicable).
    - Add any new prop/event plumbing here; ensure types remain in sync with `station-login.types.ts`.
    - Handle error boundaries and telemetry wiring here when introducing new flows.  
      Open: `packages/contact-center/station-login/src/index.ts`, `packages/contact-center/station-login/src/station-login/index.tsx`

## Testing & quality gates

- Tests under `packages/contact-center/station-login/tests/*`.  
  Open: Unit → `packages/contact-center/station-login/tests/*`, Patterns → `ai-docs/patterns/testing-patterns.md`, E2E (Playwright) → `playwright/tests/station-login-test.spec.ts`, `playwright/suites/station-login-user-state-tests.spec.ts`

## Observability

- Use `ui-logging` helpers for metrics where appropriate.  
  Open: Docs → `ai-docs/packages/contact-center/ui-logging/agent.md`, Code → `packages/contact-center/ui-logging/*`

## Security & compliance

- Avoid logging credentials or identifiers; sanitize inputs.  
  Open: Guidelines → `ai-docs/rules.md`, Repo rules → `rules.md`

## Related docs

- **Root index:** [../../../../agent.md](../../../../agent.md)
- **Repo rules:** [../../../../rules.md](../../../../rules.md)
- **Tooling:** [../../../../toolings/tooling.md](../../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../task/agent.md](../task/agent.md), [../user-state/agent.md](../user-state/agent.md), [../cc-components/agent.md](../cc-components/agent.md), [../store/agent.md](../store/agent.md)
- **Children:** [./architecture.md](./architecture.md), [./README.md](./README.md)

## Source map

- `packages/contact-center/station-login/src/*`
- `packages/contact-center/station-login/tests/*`
