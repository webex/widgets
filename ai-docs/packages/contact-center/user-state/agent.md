# User State Widget — agent.md

**Scope:** Contact Center User State widget mirrored from `packages/contact-center/user-state`.  
**Primary audience:** Widget contributors, integrators.

## Responsibilities

- Display and manage user/agent state (e.g., availability, status changes).  
  Open: `packages/contact-center/user-state/src/user-state/index.tsx`, `packages/contact-center/user-state/src/helper.ts`, `packages/contact-center/cc-components/src/components/UserState/*`

## Key abstractions / APIs

- Public surface via `src/index.ts`.  
  Open: `packages/contact-center/user-state/src/index.ts`
- Core UI is consumed from `@webex/cc-components` (e.g., `UserStateComponent`, `UserStateComponentProps`); this package composes it via `src/user-state/index.tsx` with wrapper types in `src/user-state.types.ts`.  
  Open: `packages/contact-center/cc-components/src/components/UserState/user-state.tsx`, `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts`, `packages/contact-center/user-state/src/user-state/index.tsx`, `packages/contact-center/user-state/src/user-state.types.ts`
- Helper utilities in `src/helper.ts`.  
  Open: `packages/contact-center/user-state/src/helper.ts`

## Dependencies & interactions

- Consumes core UI from `@webex/cc-components` and integrates with the shared `store` for state/events.  
  Open: UI → `packages/contact-center/cc-components/src/components/UserState/*`; Store → `packages/contact-center/store/src/*`, docs → `ai-docs/packages/contact-center/store/agent.md`

## Invariants & constraints

- Keep state transitions consistent with store events; type all props and callbacks.  
  Open: `ai-docs/patterns/react-patterns.md`, `ai-docs/patterns/mobx-patterns.md`, `ai-docs/patterns/typescript-patterns.md`

## How to extend or modify

- Follow the three-layer pattern (UI → Hook → Orchestrator):
  - UI layer (from `@webex/cc-components`)
    - Visuals and interaction primitives live in `@webex/cc-components` (e.g., `UserStateComponent`).
    - Prefer extending via props first; only modify `@webex/cc-components` if the UI surface itself must change.
    - Update wrapper types in `src/user-state.types.ts` if you expose new props/events through this package.  
      Open: `packages/contact-center/cc-components/src/components/UserState/user-state.tsx`, `packages/contact-center/cc-components/src/components/UserState/user-state.types.ts`, `packages/contact-center/user-state/src/user-state.types.ts`
  - Business layer (custom hook)
    - Encapsulate user state business logic (timers, state transitions, store interactions).
    - Business logic hook entry used by this widget is `useUserState` defined in `src/helper.ts` and consumed by `src/user-state/index.tsx`.
    - Keep store reads/writes and async flows inside the hook; keep the UI component presentation-only.  
      Open: `packages/contact-center/user-state/src/helper.ts`, `packages/contact-center/user-state/src/user-state/index.tsx`
  - Orchestrator (package entry)
    - `src/index.ts` composes the hook and UI, wires events/props, and exports the public widget API (and WC if applicable).
    - Add any new prop/event plumbing here; ensure types remain in sync with `user-state.types.ts`.
    - Handle error boundaries and telemetry wiring here when introducing new flows.  
      Open: `packages/contact-center/user-state/src/index.ts`, `packages/contact-center/user-state/src/user-state/index.tsx`

## Testing & quality gates

- Tests under `packages/contact-center/user-state/tests/*`.  
  Open: Unit → `packages/contact-center/user-state/tests/*`, Patterns → `ai-docs/patterns/testing-patterns.md`, E2E (Playwright) → `playwright/tests/user-state-test.spec.ts`, `playwright/suites/station-login-user-state-tests.spec.ts`

## Observability

- Add metrics via `ui-logging` for state changes if needed.  
  Open: Docs → `ai-docs/packages/contact-center/ui-logging/agent.md`, Code → `packages/contact-center/ui-logging/*`

## Security & compliance

- Avoid logging user identifiers beyond what is necessary for metrics.  
  Open: Guidelines → `ai-docs/rules.md`, Repo rules → `rules.md`

## Related docs

- **Root index:** [../../../../agent.md](../../../../agent.md)
- **Repo rules:** [../../../../rules.md](../../../../rules.md)
- **Tooling:** [../../../../toolings/tooling.md](../../../../toolings/tooling.md)

## Related agents

- **Parent:** [../agent.md](../agent.md)
- **Siblings:** [../station-login/agent.md](../station-login/agent.md), [../task/agent.md](../task/agent.md), [../cc-components/agent.md](../cc-components/agent.md), [../store/agent.md](../store/agent.md)
- **Children:** [./architecture.md](./architecture.md), [./README.md](./README.md)

## Source map

- `packages/contact-center/user-state/src/*`
- `packages/contact-center/user-state/tests/*`

<!-- TODOs -->
