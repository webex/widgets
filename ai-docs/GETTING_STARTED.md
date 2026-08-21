# Getting Started — Webex Contact Center Widgets

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). Then this doc to get a build/test loop running.
> Context-efficiency: link to canonical docs — don't duplicate them; load on demand, not upfront.

## Prerequisites

### Toolchain
| Tool | Version | Where it's pinned |
|---|---|---|
| Node | `lts/krypton` (Node 23.x) | `.nvmrc` (`nvm use` to select it) |
| Yarn | `4.5.1` (via Corepack) | `packageManager` in `package.json`; run `corepack enable` if `yarn` is unavailable |

This is a Yarn 4 (Berry) monorepo using the `node-modules` linker (`.yarnrc.yml` sets `nodeLinker: node-modules`) — the `packageManager` field pins the exact Yarn version.

### Access
- None beyond the public npm registry to build. The Webex Contact Center SDK (`@webex/contact-center`) is a
  published npm dependency, not a sibling clone. No VPN, internal registry, or extra accounts are required
  for a build/test loop.

## Clone & Install
```bash
git clone git@github.com:webex/widgets.git
cd widgets
corepack enable        # if yarn is missing
yarn install           # installs all workspace deps into node_modules
yarn build:dev         # build all packages — required before cross-package tsc imports resolve
```
A fresh clone (or a new git worktree) has no `node_modules`; `yarn install` followed by `yarn build:dev` must complete before any per-package test or cross-package import will resolve.

## Build / Run / Test
| Task | Command |
|---|---|
| Build | `yarn build:dev` |
| Run (local) | `yarn samples:serve` (builds with `yarn samples:build` first; or `yarn samples:serve-react` / `yarn samples:serve-wc`) |
| Test (all CC widgets) | `yarn test:cc-widgets` |
| Test (one package) | `yarn workspace @webex/{pkg} test:unit` |
| Style tests | `yarn test:styles` |
| E2E | `yarn test:e2e` (Playwright) |
| Lint / format | ESLint (`.eslintrc`, airbnb + prettier) — runs via editor/CI; the husky pre-commit hook runs `yarn run test:unit` and `yarn run test:styles` |

The husky pre-commit hook (`.husky/pre-commit`) runs `yarn run test:unit` (tooling, CC widgets, and meetings widget suites) followed by `yarn run test:styles`; it does not run the Playwright E2E suite, so commits still take a while.

Never run `npx jest` directly — always go through `yarn workspace @webex/{pkg} test:unit` so the Yarn workspace config and resolver apply.

## First-Run Verification
- After `yarn install && yarn build:dev`, run a single package's tests to confirm the toolchain is wired:
  ```bash
  yarn workspace @webex/cc-store test:unit
  ```
  A passing suite confirms install, build, and the Jest + RTL harness all work end to end.

## Where to Go Next
- Agent entry: `../AGENTS.md` · System shape: `ARCHITECTURE.md` · Routing: `SPEC_INDEX.md`
- Conventions: `patterns/` + `rules/` (and `RULES.md`).
