# Rules — webex-widgets

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry, carries the critical rules) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). Then this doc; per-language detail in `patterns/`.
> Context-efficiency: link to canonical docs — don't duplicate them; load on demand, not upfront.

> These rules are checkable. Every MUST rule records its source requirement/risk, verification path,
> severity, and owner. Name the tool where one enforces a rule; say "review only" plus why otherwise.

## Coverage Map (which docs/specs to trust)

Coverage state is mirrored from `.sdd/manifest.json`. Every module is currently `DRAFT`: specs were generated fresh during the SDLC migration (2026-06-29) and have not been validated. **Cross-check code before relying on any spec claim** (drift tolerance ≤ 25%, see below).

| Module | Manifest coverage state | What it means here |
|---|---|---|
| `store` (`@webex/cc-store`, `packages/contact-center/store`) | DRAFT | Tier-1, sole SDK access point (`store.ts` `getInstance`). Spec `store/ai-docs/store-spec.md` is unvalidated — verify observables/SDK proxying against `store/src/store.ts` and `store/src/storeEventsWrapper.ts`. |
| `cc-components` (`@webex/cc-components`, `packages/contact-center/cc-components`) | DRAFT | Tier-1 presentational primitives. Verify prop contracts against `cc-components/src/` before trusting the spec. |
| `cc-widgets` (`@webex/cc-widgets`, `packages/contact-center/cc-widgets`) | DRAFT | Tier-1 r2wc aggregator. The custom-element registry lives in `cc-widgets/src/wc.ts` — cross-check element names/attrs there. |
| `station-login` (`@webex/cc-station-login`, `packages/contact-center/station-login`) | DRAFT | Tier-1 widget. Verify against `station-login/src/`. |
| `user-state` (`@webex/cc-user-state`, `packages/contact-center/user-state`) | DRAFT | Tier-1 widget. Verify state/idle-code logic against `user-state/src/helper.ts`. |
| `task` (`@webex/cc-task`, `packages/contact-center/task`) | DRAFT | Tier-1 bundle of sub-widgets CallControl, CallControlCAD, IncomingTask, OutdialCall, TaskList. Verify per-widget behavior against `task/src/{Widget}/index.tsx` and `task/src/helper.ts`. |
| `ui-logging` (`@webex/cc-ui-logging`, `packages/contact-center/ui-logging`) | DRAFT | Tier-2 telemetry. `withMetrics` HOC + `metricsLogger` in `ui-logging/src/`. |
| `test-fixtures` (`@webex/test-fixtures`, `packages/contact-center/test-fixtures`) | DRAFT | Tier-2 shared mocks/helpers in `test-fixtures/src/`. |
| `meetings-widgets` (`@webex/widgets`, `packages/@webex/widgets`) | DRAFT | Tier-2 legacy meetings family, separate from the CC widget family. Out of scope for CC rules below unless explicitly named. |

## Autonomy & Ask-First
- **May proceed:** read-only research; bug fixes and feature work scoped to a single CC widget package that follow the established Widget → Hook → Component → Store flow; adding unit/E2E tests; doc edits under `ai-docs/`; copy/string and styling tweaks.
- **Ask first / plan + confirm:** changes to the dependency direction or to `cc-widgets/src/wc.ts` custom-element names/attributes (a public contract); changes to the store's observable shape or SDK access surface in `store/src/`; new third-party dependencies; touching the `@webex/widgets` legacy meetings family.
- **Never without explicit human approval:** `git push`, opening/merging PRs, or any deploy. PRs target the `next` branch and are draft by default.

## Naming
Grounded in `patterns/typescript-patterns.md` and the real code:
- Interfaces are prefixed with `I` and PascalCase: `IUserState`, `IStationLoginProps`, `IContactCenter` (`store/src/store.types.ts`, `task/src/task.types.ts`). Never an un-prefixed `UserState` interface.
- Components are PascalCase in `.tsx` files: `UserState.tsx`, `CallControl/index.tsx`. Hooks are camelCase with a `use` prefix in `.ts` files: `useUserState`, `useCallControl` (`*/src/helper.ts`).
- Types are co-located in `{name}.types.ts` (e.g. `user-state/src/user-state.types.ts`); derive subsets with `Pick`/`Partial` rather than re-declaring (e.g. `IUserStateProps = Pick<IUserState, 'onStateChange'>`).
- Event/state names are enums in SCREAMING_SNAKE_CASE values, e.g. `CC_EVENTS.AGENT_STATE_CHANGED`, `TASK_EVENTS.TASK_INCOMING`. Constants are SCREAMING_SNAKE_CASE.

## Logging
- Use the `ui-logging` helpers — `withMetrics` HOC and `metricsLogger` (`ui-logging/src/index.ts`, `ui-logging/src/metricsLogger.ts`) — and the store `logger` passed into hooks. Calls carry a structured context object `{module, method}` (see `task/src/helper.ts` `loadBuddyAgents`: `logger.info('Loaded N buddy agents', {module: 'helper.ts', method: 'loadBuddyAgents'})`).
- **NEVER log PII or credentials** (agent identifiers in sensitive contexts, dial numbers, tokens, session secrets). Severity: high. Verification: review + grep for new `console.*`/`logger.*` calls in a diff. See Security below.
- Prefer the injected `logger` over bare `console.*`; `console.error` is tolerated only inside hook catch blocks where no logger is available.

## Error Handling
- Every widget MUST be wrapped in an `ErrorBoundary` (`react-error-boundary`) at its exported boundary, with `onError` routing to `store.onErrorCallback?.('WidgetName', error)` and a non-throwing fallback (`patterns/react-patterns.md`; pattern realized across `*/src/{Widget}/index.tsx`). Severity: high. Verification: review only.
- SDK/async calls in hooks (`helper.ts`) MUST be wrapped in `try/catch`; on failure, log via the injected `logger` and invoke the optional `onError`-style callback rather than letting the rejection escape. Never swallow an error silently.
- Surface user-friendly errors in the presentational component (loading/error/empty states); never leak raw SDK errors or stack traces to the UI.

## Imports / Dependencies
**Dependency flow is one direction only** (`.sdd/manifest.json`; enforced by review, source: legacy task-router rule "Circular Dependency Prevention"):
```
cc-widgets → widget packages (station-login, user-state, task) → cc-components → store → @webex/contact-center SDK
```
- A widget package MUST NOT import from `@webex/cc-widgets`. `cc-components` MUST NOT import from any widget package. No package imports upstream. Severity: high — if a circular import is detected, STOP and refactor.
- Access the SDK ONLY through the store: `store.cc.methodName()` / `store.getBuddyAgents()` (`task/src/helper.ts:519`). NEVER `import ... from '@webex/contact-center'` in widget or component code. Severity: high.
- Import the store as the singleton default export: `import store from '@webex/cc-store'`. Never `new Store()`; the instance comes from `Store.getInstance()` (`store/src/store.ts:64`).
- New third-party dependencies require maintainer approval (ask-first).

## Testing
Grounded in `patterns/testing-patterns.md`:
- Unit/component tests use Jest + React Testing Library and live in each package's `tests/` folder; E2E tests use Playwright under `playwright/` at repo root.
- Each behavior gets both a positive test and the relevant negative/guard test (e.g. error path fires `onError`, callback NOT called on failure). Test behavior via `data-testid`, not CSS selectors or implementation details.
- Mock the store with `@webex/test-fixtures` (`test-fixtures/src/`); never hit the real SDK.
- Write a failing test first (TDD), then implement. Update the spec/docs in the same change (see Spec-Currency below).
- Changed-line coverage bar: **≥ 80%** (`.sdd/coverage-policy.defaults.yaml` `coverageBar.changedLines`).
- Run tests with `yarn workspace @webex/{pkg} test:unit` (single package) or `yarn test:cc-widgets` (all CC); styles via `yarn test:styles`; E2E via `yarn test:e2e`. **Never** `npx jest` directly.

## Security
- No PII or credentials in logs (see Logging) — agent dial numbers, tokens, session/auth material must never reach `logger`/`console` or telemetry payloads.
- Reach the SDK only through the store; never import the SDK directly (prevents bypassing the store's auth/state boundary).
- No hardcoded secrets/tokens/keys anywhere (see Secrets Policy). Sanitize user-provided input rendered in the UI.
- This repo owns NO persistent datastore — all domain data comes from the SDK at runtime, so there is no at-rest data-handling surface here (N/A by construction). A dedicated `SECURITY.md` is not yet present; these rules are the current security posture.

## Spec-Currency & Drift Thresholds
- Update the spec/docs in the SAME change as the code (spec-currency: `.sdd/coverage-policy.defaults.yaml` `specCurrency.sameChangeRequired: true`).
- Drift thresholds mirror `.sdd/coverage-policy.defaults.yaml` (drift = share of spec claims no longer matching code):
  - AUTHORITATIVE ≤ 5%
  - PARTIAL ≤ 15%
  - DRAFT ≤ 25% (current state for ALL modules — cross-check code before relying on a claim)
  - NONE — no spec to drift from

## Secrets Policy
- No hardcoded secrets/tokens/keys/connection strings — ever. The widgets receive auth context from the host application via the SDK/store at runtime; nothing is sourced from a committed file. Never log secrets, never commit them.

## Concurrency & Async
The repo is reactive (MobX) and event-driven (SDK events), so these apply:
- All store mutations MUST go through `runInAction(() => { ... })` — never mutate observable state directly (`patterns/mobx-patterns.md`; realized in `store/src/storeEventsWrapper.ts`). Severity: high. Verification: review only.
- Widgets that read store state MUST be wrapped in `observer()` from `mobx-react-lite` so re-renders track observable reads. Severity: high.
- SDK event subscriptions registered in `useEffect` MUST be torn down in the cleanup return (`cc.on(...)` paired with `cc.off(...)`) to avoid duplicate handlers/leaks (`patterns/react-patterns.md`).
- `cc` is held as `observable.ref` (`store/src/store.ts`) — replace the reference, don't deep-mutate the SDK instance.

## Maintenance
- Add a rule when a review correction recurs; remove it when a lint rule starts enforcing it.
- Cross-reference: patterns → `patterns/` (`typescript-patterns.md`, `react-patterns.md`, `mobx-patterns.md`, `testing-patterns.md`); module specs → `SPEC_INDEX.md`.
