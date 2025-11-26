# Tooling

## Overview

- Monorepo managed with Node tooling; build and bundling configured per package (`webpack.config.js`, `rollup.config.js` where applicable).
- TypeScript configurations per package (`tsconfig.json`) and for tests (`tsconfig.test.json`).
- Lint and formatting via package-local `eslint.config.mjs` (where present).
- Testing across Jest (unit/integration) and Playwright (E2E).

## Commands & scripts

- Central scripts live in `tooling/src/`:
  - `publish.js` — publish workflow helper. <!-- TODO: clarify usage and required env -->

## Local dev workflow

- Install dependencies at repo root with the configured package manager. <!-- TODO: clarify yarn/npm/pnpm -->
- Build packages via their local `package.json` scripts.
- Run tests at the package level or via Playwright for E2E.

## CI/CD

- Packages include test configs (`jest.config.js`, `tsconfig.test.json`), suitable for CI execution. <!-- TODO: link CI provider and pipelines -->

## Code quality

- ESLint per package where present.
- Type checking via `tsc` using each package’s `tsconfig.json`.
- Jest test suites in `packages/**/tests/`.

## Release & versioning

- Changelogs exist for key packages (e.g., `packages/@webex/widgets/CHANGELOG.md`, `packages/contact-center/CHANGELOG.md`). <!-- TODO: confirm release process and semver policy -->

## Troubleshooting

- If builds fail, clean package-level caches and reinstall dependencies. <!-- TODO: document exact clean commands if available -->
- For Playwright issues, ensure browsers are installed and environment variables are set appropriately.

<!-- TODOs -->


