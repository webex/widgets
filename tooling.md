# Tooling

## Overview

- Monorepo with per-package build configs (`webpack.config.js`, `rollup.config.js` where applicable)
- TypeScript per package (`tsconfig.json`, `tsconfig.test.json`)
- Linting via package-local `eslint.config.mjs` (where present)
- Testing via Jest (unit/integration) and Playwright (E2E)
- Detailed docs live at `./ai-docs/toolings/tooling.md`

## Commands & scripts

- Commands are defined per package in their `package.json`.
<!-- TODO: enumerate commonly used scripts across packages -->

## Local dev workflow

- Install dependencies at repo root using the configured package manager
- Build and test at the package level
- For E2E, use Playwright with tests in `playwright/`

## CI/CD

- Each package contains Jest configs and tsconfig for CI execution
<!-- TODO: document CI provider, pipelines, and artifacts -->

## Troubleshooting

- Clean installs if builds fail; verify local environment for Playwright

See the full details and examples in:

- `./ai-docs/toolings/tooling.md`


