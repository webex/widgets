# Test Index — webex-widgets (Contact Center)

> Start here → root [`AGENTS.md`](../AGENTS.md) (agent entry) · router [`SPEC_INDEX.md`](SPEC_INDEX.md) · system [`ARCHITECTURE.md`](ARCHITECTURE.md). This doc is the repo-wide map of the test surface.
> Context-efficiency: this is an INDEX, not a case list. It links to where cases live — it does not duplicate them.
> **Source of truth:** `.sdd/manifest.json` (`commands`, `tests`, `coverage_ratchet`); this file mirrors it for humans.

## Test Surface
| Tier | Command (role) | Test directory | Framework | External deps |
|---|---|---|---|---|
| Unit | `yarn test:cc-widgets` (unit-test) — per package: `yarn workspace @webex/{pkg} test:unit` | `packages/contact-center` (per-package `tests/`) | Jest 29 + React Testing Library (jsdom) | none |
| E2E / System | `yarn test:e2e` (e2e) | `playwright` | Playwright | Playwright browsers; a running/mocked widget host |
| Lint / Styles | `yarn test:styles` (lint) | repo-wide (`*.scss` / style sources) | stylelint | none |

Commands and directories are mirrored from `.sdd/manifest.json` (`commands`, `tests`) and `package.json` (`source_file`). Always run unit tests through `yarn workspace` commands — never `npx jest` directly. Cross-package `tsc` imports require `yarn build:dev` first.

## Where the Cases Live
- **Unit test cases** → each module's spec, "Test-Case Strategy (module)" section (see [`SPEC_INDEX.md`](SPEC_INDEX.md) for the module registry).
- **E2E / system cases** → the Playwright suites under `playwright/`, organized by feature.

## Coverage / Quality Gate
- Coverage ratchet: enabled (`.sdd/manifest.json` `coverage_ratchet.enabled = true`) — per-module coverage state must not regress; coverage is tracked per module in the manifest `modules[].coverage_status`, not as a single repo-wide numeric threshold in this repository's build config.
- Enforced in: pre-commit hooks run the full test suite; CI runs unit + E2E. No repo-wide numeric coverage minimum is declared in the manifest, so none is asserted here.

## QA Dependencies & Environments
- E2E depends on the Playwright browser install and a widget host (real or mocked) able to mount the CC widgets.
- No standing external QA-tracker dependency is recorded in the manifest.

## Where to Go Next
- Agent entry: [`../AGENTS.md`](../AGENTS.md) · System shape: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Routing: [`SPEC_INDEX.md`](SPEC_INDEX.md)
- Machine source of truth: `.sdd/manifest.json` (`commands`, `tests`, `coverage_ratchet`).
