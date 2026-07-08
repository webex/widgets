# AGENTS.md — webex-widgets (Contact Center)

> You are the agent entry point — read first. Next: router [`SPEC_INDEX.md`](ai-docs/SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ai-docs/ARCHITECTURE.md). Load this + `SPEC_INDEX.md` first; pull module/standing docs on demand. (Multi-repo: a workspace-level `AGENTS.md` may sit above this one.)
> Context-efficiency: link to canonical docs — don't duplicate them; keep this file under ~200 lines.

> Cross-tool context file. Auto-loaded by AI coding agents. A module's high-level design lives in its
> manifest-routed module spec, source-local as `<module-path>/ai-docs/<module-name>-spec.md` — not in an `AGENTS.md`.

## Repo Overview
**webex-widgets** is a Yarn (PnP) monorepo of Webex Contact Center UI widgets — TypeScript, React 18,
MobX, and Web Components (r2wc) — that embed agent-desktop capabilities (login, state, call/task control)
into host applications.

**What it is:**
- A library monorepo publishing CC widget packages + r2wc Web Component wrappers.
- A thin UI layer over the `@webex/contact-center` SDK, mediated by a single MobX store.

**What it is NOT:**
- ❌ NOT the Contact Center SDK or backend — it does not own telephony, routing, or agent data.
- ❌ NOT a standalone application — widgets are embedded by host apps (sample apps live in `widgets-samples/`).
- ❌ NOT the owner of any persistent datastore — all domain data comes from the SDK at runtime.

## Tech Stack
- TypeScript, React 18, MobX, Web Components via `@r2wc/react-to-web-component`.
- Yarn 4.5.1 (PnP, workspaces); Webpack + Babel build.
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

Always use `yarn workspace` commands for tests — never `npx jest` directly. Worktrees need
`yarn install` + `yarn build:dev` before anything works (no node_modules by default).

## Common Gotchas
1. Cross-package TypeScript imports require `yarn build:dev` first — a fresh clone/worktree fails type-check
   until packages are built.
2. Pre-commit hooks run the full test suite, so commits can take a while — don't assume a hang.
3. The store is a singleton (`Store.getInstance()`); tests that mutate it must reset state or they leak
   across cases.
4. `@webex/widgets` (meetings) is a separate widget family — CC rules and the store do not apply to it.

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
or code must be cross-checked. All module specs are currently `DRAFT` (freshly generated) — cross-check code.
