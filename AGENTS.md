# AGENTS.md — webex-widgets (Contact Center)

> You are the agent entry point — read first. Next: router [`SPEC_INDEX.md`](ai-docs/SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ai-docs/ARCHITECTURE.md). Load this + `SPEC_INDEX.md` first; pull module/standing docs on demand. (Multi-repo: a workspace-level `AGENTS.md` may sit above this one.)
> Context-efficiency: link to canonical docs — don't duplicate them; keep this file under ~200 lines.

> Cross-tool context file. Auto-loaded by AI coding agents. A module's high-level design lives in its
> manifest-routed module spec, source-local as `<module-path>/ai-docs/<module-name>-spec.md` — not in an `AGENTS.md`.

## Repo Overview
**webex-widgets** is a Yarn 4.5.1 workspaces monorepo (node-modules linker) of Webex Contact Center UI
widgets — TypeScript, React 18, MobX, and Web Components (r2wc) — that embed agent-desktop capabilities
(login, state, call/task control) into host applications.

**What it is:**
- A library monorepo publishing CC widget packages + r2wc Web Component wrappers.
- A thin UI layer over the `@webex/contact-center` SDK, mediated by a single MobX store.

**What it is NOT:**
- ❌ NOT the Contact Center SDK or backend — it does not own telephony, routing, or agent data.
- ❌ NOT a standalone application — widgets are embedded by host apps (sample apps live in `widgets-samples/`).
- ❌ NOT the owner of any persistent datastore — all domain data comes from the SDK at runtime.

## Tech Stack
- TypeScript, React 18, MobX, Web Components via `@r2wc/react-to-web-component`.
- Yarn 4.5.1 workspaces (`nodeLinker: node-modules`, per `.yarnrc.yml`); Webpack + Babel build.
- Jest + React Testing Library (unit); Playwright (E2E). Momentum UI design system.

## Architecture
```
Host app / Web Component
  → Widget (observer HOC) → Custom Hook (helper.ts) → Presentational Component (cc-components)
  → Store (MobX singleton, Store.getInstance()) → @webex/contact-center SDK
```
Dependency flow is one direction only: `cc-widgets → widget packages → cc-components → store → SDK`.
→ Full repo architecture & component responsibilities: **[ARCHITECTURE.md](./ai-docs/ARCHITECTURE.md)**

## Module / Package Structure
```
packages/contact-center/
├── store/          # @webex/cc-store — MobX singleton; sole SDK access point
├── cc-components/  # @webex/cc-components — shared presentational React primitives
├── cc-widgets/     # @webex/cc-widgets — r2wc Web Component wrappers (aggregator)
├── cc-digital-channels/  # @webex/cc-digital-channels — digital channels (chat/email/social) widget
├── station-login/  # @webex/cc-station-login — agent login widget
├── user-state/     # @webex/cc-user-state — agent state widget
├── task/           # @webex/cc-task — CallControl, IncomingTask, OutdialCall, TaskList, CallControlCAD
├── ui-logging/     # @webex/cc-ui-logging — withMetrics, metricsLogger
└── test-fixtures/  # @webex/test-fixtures — shared test mocks/helpers
packages/@webex/widgets/  # @webex/widgets — legacy meetings widgets (separate family)
widgets-samples/          # React + Web Component sample apps
playwright/               # E2E suites
```
→ Per-module docs and the spec router: **[ai-docs/SPEC_INDEX.md](./ai-docs/SPEC_INDEX.md)**

## Critical Rules
1. **Code is the source of truth.** Never invent an SDK method, event, path, flag, or constant — read the
   real file (SDK surface: `@webex/contact-center` package types at `node_modules/@webex/contact-center/dist/types/index.d.ts`).
2. **Ask before coding.** Present a plan / Spec Summary; wait for confirmation before non-trivial changes.
3. **One-directional dependency flow.** `cc-widgets → widgets → cc-components → store → SDK`. Never import
   upstream (cc-components must not import widget packages; widgets must not import cc-widgets).
4. **SDK only through the store.** Call `store.cc.methodName()` — never import the SDK directly in a widget
   or component.
5. **MobX discipline.** Widgets consuming store data use the `observer()` HOC; all store mutations run in
   `runInAction()`.
6. **No `any` types.** Strongly type props and public surfaces; co-locate types in `*.types.ts`.
7. **Wrap widgets** with `ErrorBoundary` and the `withMetrics` HOC.
8. **No PII or credentials** in logs.
9. **Spec-currency.** Update the module spec / standing doc in the SAME change as the code (see `ai-docs/RULES.md`).

## Essential Commands
| Task | Command |
|---|---|
| Install | `yarn install` |
| Build (all packages) | `yarn build:dev` |
| Test (a package) | `yarn workspace @webex/{pkg} test:unit` |
| Test (all CC widgets) | `yarn test:cc-widgets` |
| Lint / styles | `yarn test:styles` |
| E2E | `yarn test:e2e` |

Always use `yarn workspace` commands for tests — never `npx jest` directly. A fresh clone/worktree
needs `yarn install` (populates `node_modules` via the node-modules linker) + `yarn build:dev` before
anything works.

## Task Routing
This root file is an orchestrator: identify the task type, load the working scope's package
`ai-docs/AGENTS.md` (+ `ARCHITECTURE.md`), then open the matching template and complete its
**mandatory pre-step** before writing code. Split multi-part prompts into scoped subtasks and
handle them sequentially; do not generate code until pre-steps are done or the developer waives them.

| Task type | Template | Mandatory pre-step (before code) |
|---|---|---|
| A. New widget | [templates/new-widget/00-master.md](./ai-docs/templates/new-widget/00-master.md) | Design input (Figma/mockup/spec) + [01-pre-questions.md](./ai-docs/templates/new-widget/01-pre-questions.md) — no code without design reference |
| B. Fix bug | [templates/existing-widget/bug-fix.md](./ai-docs/templates/existing-widget/bug-fix.md) | Pre-Fix questions (bug info, scope, impact, existing tests) + root-cause first |
| C. Add feature | [templates/existing-widget/feature-enhancement.md](./ai-docs/templates/existing-widget/feature-enhancement.md) | Pre-Enhancement questions (requirements, backward compatibility, design input) |
| D. Docs only | [templates/documentation/create-agent-md.md](./ai-docs/templates/documentation/create-agent-md.md) · [create-architecture-md.md](./ai-docs/templates/documentation/create-architecture-md.md) | Confirm scope (no code change) |
| E. Understand | that scope's package `ai-docs/AGENTS.md` + `ARCHITECTURE.md` | None (read-only) |
| F. Playwright E2E | [templates/playwright/00-master.md](./ai-docs/templates/playwright/00-master.md) | [01-pre-questions.md](./ai-docs/templates/playwright/01-pre-questions.md) (scope, scenarios, setup, stability) |

Before code generation also load the repo-wide patterns ([ai-docs/patterns/](./ai-docs/patterns/):
typescript, react, mobx, testing) and verify any SDK method against the installed types
(`node_modules/@webex/contact-center/dist/types/index.d.ts`) before using it.

## Common Gotchas
1. Cross-package TypeScript imports require `yarn build:dev` first — a fresh clone/worktree fails type-check
   until packages are built.
2. The pre-commit hook (`.husky/pre-commit`) runs `yarn run test:unit` then `yarn run test:styles`
   (all package unit tests + style checks; E2E is not run pre-commit), so commits can take a while —
   don't assume a hang.
3. The store is a singleton (`Store.getInstance()`); tests that mutate it must reset state or they leak
   across cases.
4. `@webex/widgets` (meetings) is a separate widget family — CC rules and the store do not apply to it.

## Playwright E2E Framework
E2E suites live in `playwright/`; run them with `yarn test:e2e` (`yarn playwright test`). Test sets and
their suite wiring are declared in `playwright/test-data.ts` as `USER_SETS` (`SET_1`…`SET_9`); each set
maps agents, a queue/entry-point, and one `TEST_SUITE`. Do not assume additional sets/suites exist —
they must be present in `test-data.ts`.

Shared framework files: `playwright/test-manager.ts` (per-scenario setup/cleanup capability),
`playwright/global.setup.ts` (OAuth token collection + `.env` upsert), plus `constants.ts` and
`Utils/*`. When adding scenarios that need new behavior, update the set mapping and framework wiring
in the same task, then wire suites through `TEST_SUITE`.

**OAuth setup model** (`global.setup.ts`, one `OAuth` setup test): user sets are chunked into groups
via `OAUTH_SET_GROUP_SIZE = 2` (`SET_1..SET_9` → 5 groups: `[1,2] [3,4] [5,6] [7,8] [9]`), each group's
tokens fetched in batches of `OAUTH_BATCH_SIZE = 4`, an optional dial-number token is collected when
`PW_DIAL_NUMBER_LOGIN_*` env vars are set, and all env/token updates are written once via a single
`.env` upsert. Sets `SET_7`–`SET_9` carry 4 agents each for multiparty-conference coverage.

**Flakiness & recovery rules** (`playwright/Utils/helperUtils.ts`, `playwright/Utils/conferenceUtils.ts`):
`pageSetup` performs a single bounded station logout/re-login recovery if `state-select` does not
appear after telephony login — it is one recovery attempt, not a retry loop. Conference suites run
conference-state cleanup sequentially across shared-call agents (not in parallel) to avoid leg
ownership races.

**Conference skip & consolidation policy** (`multiparty-conference-set-{7,8,9}-test.spec.ts`):
`EP_DN`/`EPDN` scenarios and scenarios requiring more than 4 agents are retained as `test.skip(...)`.
Repeated call-init flows are merged into single tests only when scenario steps are sequentially
compatible; consolidated scenario IDs remain explicit in the test names for traceability
(e.g. `CTS-TC-09 and CTS-TC-10 ...`).
→ Playwright workflow templates: **[ai-docs/templates/playwright/00-master.md](./ai-docs/templates/playwright/00-master.md)**

## Sample Apps
Widgets are exercised by sample apps under `widgets-samples/cc/` — `samples-cc-react-app` (React) and
`samples-cc-wc-app` (Web Component). Both are excluded from `build`/`test:cc-widgets`; serve them with
`yarn samples:serve-react` / `yarn samples:serve-wc`. Integrate every widget in both. In the React
sample, import from `@webex/cc-widgets`, add the widget to `defaultWidgets` (default `false` for opt-in),
expose a selection checkbox, and render inside the standard `box > section-box > fieldset > legend-box`
layout using Momentum CSS variables (never hardcode colors/spacing). Every widget must wire an `onError`
callback. Theme is driven by `@momentum-design`'s `ThemeProvider` from `store.currentTheme`
(`LIGHT`/`DARK`), and widgets update automatically through the provider.

## Pre-Commit Checklist
- [ ] Tests pass (`yarn test:cc-widgets` or the touched package); coverage meets the repo bar.
- [ ] Module spec / standing doc updated in the same change (spec-currency).
- [ ] No upstream imports; SDK accessed only via the store.
- [ ] No `any` types; no hardcoded secrets; no PII/credentials logged.

## External Source Access
| Provider class | Source / host pattern | Preferred access | If unavailable |
|---|---|---|---|
| ticket-tracker | Jira (`jira-eng-*`) | MCP connector / REST | STOP and ask — never guess |
| source-host | GitHub `webex/widgets` | `gh` CLI | STOP and ask |
| SDK reference | `@webex/contact-center` types (`node_modules/@webex/contact-center/dist/types/index.d.ts`) | installed package `.d.ts` | STOP and ask — never invent an API |

---
**SDD coverage:** this repo's per-module coverage state lives in `.sdd/manifest.json` (human mirror in
[`ai-docs/SPEC_INDEX.md`](ai-docs/SPEC_INDEX.md)). Use that state to decide whether a spec is authoritative
or code must be cross-checked. Every documented module is currently `Partial` (spec is a hint,
cross-check code — no module is `Specced` yet), so treat code as the source of truth for high-risk changes.
