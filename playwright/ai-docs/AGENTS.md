# Playwright E2E Testing Framework

## Overview

The `playwright/` directory contains the end-to-end testing framework for Contact Center widgets.

This guide is for implementation workflow and usage. For technical internals, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Scope

Use this guide when the request involves:

- adding or updating Playwright scenarios
- fixing flaky E2E tests
- creating or updating suite wiring
- adding a new test set in `playwright/test-data.ts`
- updating shared framework behavior (`test-manager`, `Utils`, `global.setup`, `constants`)
- updating Playwright documentation

---

## Current Baseline (Aligns to `next`)

Current test sets and suites come from `playwright/test-data.ts`.

At the time of this doc update, the baseline suites are:

- `digital-incoming-task-tests.spec.ts`
- `task-list-multi-session-tests.spec.ts`
- `station-login-user-state-tests.spec.ts`
- `basic-advanced-task-controls-tests.spec.ts`
- `advanced-task-controls-tests.spec.ts`
- `dial-number-tests.spec.ts`
- `multiparty-conference-set-7-tests.spec.ts`
- `multiparty-conference-set-8-tests.spec.ts`

Do not assume additional sets/suites exist unless they are present in code.

---

## Required Workflow

1. Start with root orchestrator: `AGENTS.md`
2. For Playwright tasks, run template flow from:
   - `ai-docs/templates/playwright/00-master.md`
3. Complete pre-questions first:
   - `ai-docs/templates/playwright/01-pre-questions.md`
4. Implement via:
   - `ai-docs/templates/playwright/02-test-implementation.md`
5. If framework/docs must change, use:
   - `ai-docs/templates/playwright/03-framework-and-doc-updates.md`
6. Validate with:
   - `ai-docs/templates/playwright/04-validation.md`

Do not start coding before pre-questions are answered or assumptions are explicitly documented.

---

## New Scenario Requests

New E2E scenario generation is supported through requirements intake plus framework updates.

When asked to generate new Playwright scenarios:

1. Collect full requirements via the Playwright questionnaire
2. Decide whether existing sets/framework are sufficient
3. If not sufficient, include required framework changes in the same task:
   - `playwright/test-data.ts` (set mapping)
   - `playwright/test-manager.ts` (setup/cleanup capability)
   - `playwright/global.setup.ts` (env/token flow)
   - `playwright/constants.ts` and `playwright/Utils/*` as needed
4. Add suite/test files and wire them through `TEST_SUITE`
5. Update this doc and `ARCHITECTURE.md`

This keeps docs generic while still enabling scenario generation from questionnaire answers.

---

## Common Commands

```bash
# Run all E2E tests
yarn test:e2e

# List projects/tests
yarn playwright test --config=playwright.config.ts --list

# Run a suite
yarn test:e2e playwright/suites/<suite-file>.spec.ts

# Run a set/project
yarn test:e2e --project=SET_1
```

---

## OAuth Setup Model

- `playwright/global.setup.ts` updates set-scoped env keys from `USER_SETS` first.
- OAuth token collection runs in batches of 4 parallel contexts (`OAUTH_BATCH_SIZE=4`).
- All collected tokens are written to `.env` in one upsert pass after collection completes.

---

## Documentation Rules

When Playwright behavior changes:

- Update this file for runbook and workflow expectations
- Update `playwright/ai-docs/ARCHITECTURE.md` for technical architecture changes
- Keep docs aligned with actual files in `playwright/`
- Avoid hardcoding future/nonexistent sets or suite names

---

## Conference Coverage (SET_7, SET_8)

- Multiparty conference scenarios are split across:
  - `playwright/tests/multiparty-conference-set-7-test.spec.ts`
  - `playwright/tests/multiparty-conference-set-8-test.spec.ts`
- Scenario IDs use prefixes:
  - `CTS-MPC-*` (Multi-Party Conference matrix)
  - `CTS-TC-*` (Transfer Conference scenarios)
  - `CTS-SW-*` (Switch Conference scenarios)
- Skip policy used in implementation:
  - `EP_DN`/`EPDN` scenarios are retained as `test.skip(...)`
  - scenarios requiring more than 4 agents are retained as `test.skip(...)`

---

_Last Updated: 2026-03-04_
