# Webex Contact Center Widgets

Monorepo for Webex Contact Center UI widgets. Yarn 4.5.1 (PnP), TypeScript, React 18, MobX, Web Components (r2wc).

## Architecture

```
Widget (observer HOC) → Custom Hook (helper.ts) → Presentational Component → Store (MobX singleton) → SDK
```

**Dependency flow (one direction only):** `cc-widgets → widget packages → cc-components → store → SDK`

Never import upstream: cc-components must not import from widget packages; widgets must not import from cc-widgets.

## Package Map

| Package | Path | Purpose |
|---------|------|---------|
| station-login | `packages/contact-center/station-login/` | Agent login, team/device selection |
| user-state | `packages/contact-center/user-state/` | Agent state, timer, idle codes |
| task | `packages/contact-center/task/` | CallControl, IncomingTask, OutdialCall, TaskList |
| store | `packages/contact-center/store/` | MobX singleton (`Store.getInstance()`) |
| cc-components | `packages/contact-center/cc-components/` | Shared React UI primitives |
| cc-widgets | `packages/contact-center/cc-widgets/` | Web Component wrappers (r2wc) |
| ui-logging | `packages/contact-center/ui-logging/` | Metrics (`withMetrics`, `metricsLogger`) |
| test-fixtures | `packages/contact-center/test-fixtures/` | Shared test mocks and helpers |

## Build & Test

```bash
yarn install                                    # Install all workspace deps
yarn build:dev                                  # Build all packages (needed for cross-package tsc imports)
yarn workspace @webex/{pkg} test:unit           # Run tests for a specific package
yarn test:cc-widgets                            # Run all CC widget package tests
corepack enable                                 # If yarn is unavailable
```

- Always use `yarn workspace` commands for tests — never `npx jest` directly.
- Pre-commit hooks run the full test suite — commits can take a while.
- Worktrees need `yarn install` + `yarn build:dev` before anything works (no node_modules by default).

## Git & PR Conventions

- **Commit format:** `{type}({scope}): {description}` (e.g., `fix(cc-task): guard optional callback`)
- **PR base branch:** `next` (not `master`)
- **PR template:** `.github/PULL_REQUEST_TEMPLATE.md` — must be followed exactly (FedRAMP compliance)
- **Required PR sections:** COMPLETES, description, Change Type, test scenarios, GAI Policy, Checklist
- **PRs:** Always draft unless explicitly told otherwise
- **No `Co-Authored-By` AI lines** unless explicitly requested

## Claude Code Slash Commands

### Bug-Fix Pipeline (3-stage)

| Command | Stage | Agent | Model | Purpose |
|---------|-------|-------|-------|---------|
| `/scrub` | 1 | scrubber | haiku | Classify bugs: `prioritize` / `followup` / `dolater` |
| `/triage` | 2 | triager | sonnet | Root-cause analysis, produce fix suggestion |
| `/fix` | 3 | fixer | sonnet | Implement fix in worktree, TDD, create PR |

Inter-stage state passes via **Jira comments** (durable, human-visible). Each stage reads previous stage's comments.
Jira labels track progress: `scrubbed` → `prioritize`/`followup`/`dolater` → `triaged` → `fixing` → `fixed`.

### Other Commands

| Command | Purpose |
|---------|---------|
| `/fix-tickets` | Full lifecycle: fetch Jira tickets → worktree → implement → PR (uses superpowers skills) |
| `/submit-pr` | Commit + push + create PR for a worktree. Runs in main conversation (no subagents) |
| `/cleanup-worktrees` | List, inspect, and remove worktrees in `/tmp/claude-widgets/` |

## Subagent Constraints

- Subagents do **NOT** have access to MCP tools (Jira, Playwright).
- Subagents cannot spawn nested subagents reliably.
- Subagents may lose Bash permissions mid-execution (can't always `git add`).
- **Workaround:** Fetch all external data (Jira tickets) in main conversation, pass as text in the subagent prompt.
- **Fallback:** If a subagent can't stage files, do `git add` in the main conversation after the agent completes.
- Worktrees go in `/tmp/claude-widgets/{TICKET_ID}`.

## Coding Standards

- No `any` types. Strongly typed props and public surfaces.
- Co-locate types with components (`*.types.ts`).
- Use `observer()` HOC for all widgets consuming store data.
- Use `runInAction()` for all MobX store mutations.
- Wrap widgets with ErrorBoundary and `withMetrics` HOC.
- Access SDK only through the store: `store.cc.methodName()` — never import SDK directly.
- Do not log PII or credentials.

## Testing

- Unit tests per package under `tests/` — Jest + React Testing Library.
- E2E tests in `playwright/` with suites organized by feature.
- Test naming: describe the scenario and expected outcome (e.g., `should handle null agent profile when station login completes`).
- Write a failing test first (TDD), then implement the fix.

## Documentation Pointers

| What | Where |
|------|-------|
| AI orchestrator guide (task routing, templates) | `AGENTS.md` |
| Repository rules & design patterns | `ai-docs/RULES.md` |
| TypeScript, React, MobX, Testing patterns | `ai-docs/patterns/` |
| New widget template (6-step) | `ai-docs/templates/new-widget/` |
| Bug fix template | `ai-docs/templates/existing-widget/bug-fix.md` |
| Feature enhancement template | `ai-docs/templates/existing-widget/feature-enhancement.md` |
| Playwright E2E template (4-step) | `ai-docs/templates/playwright/` |
| SDK API reference (TypeDoc JSON) | `contact-centre-sdk-apis/contact-center.json` |
| Per-package architecture & agent docs | `packages/contact-center/{pkg}/ai-docs/` |

When working in a specific package, always read that package's `ai-docs/AGENTS.md` and `ai-docs/ARCHITECTURE.md` first.
