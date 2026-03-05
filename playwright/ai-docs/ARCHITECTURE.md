# Playwright E2E Framework — Architecture

## Purpose

Technical reference for Playwright framework structure, data flow, and extension points.

---

## Layering

```text
Playwright Project (Set)
  -> Suite (playwright/suites/*.spec.ts)
    -> Test Factory (playwright/tests/*.spec.ts)
      -> Utils + TestManager + Constants
        -> Browser + Widgets + SDK-backed behavior
```

---

## Source of Truth

- Set definitions and suite mapping: `playwright/test-data.ts` (`USER_SETS`)
- Project generation: `playwright.config.ts`
- Runtime setup/teardown: `playwright/test-manager.ts`
- Shared operations: `playwright/Utils/*.ts`
- Shared constants/types/timeouts: `playwright/constants.ts`
- OAuth + env expansion: `playwright/global.setup.ts`

---

## Current File Topology (Baseline)

```text
playwright/
├── suites/
│   ├── digital-incoming-task-tests.spec.ts
│   ├── task-list-multi-session-tests.spec.ts
│   ├── station-login-user-state-tests.spec.ts
│   ├── basic-advanced-task-controls-tests.spec.ts
│   ├── advanced-task-controls-tests.spec.ts
│   ├── dial-number-tests.spec.ts
│   ├── multiparty-conference-set-7-tests.spec.ts
│   └── multiparty-conference-set-8-tests.spec.ts
├── tests/
│   ├── digital-incoming-task-and-task-controls.spec.ts
│   ├── incoming-task-and-controls-multi-session.spec.ts
│   ├── station-login-test.spec.ts
│   ├── user-state-test.spec.ts
│   ├── incoming-telephony-task-test.spec.ts
│   ├── basic-task-controls-test.spec.ts
│   ├── advanced-task-controls-test.spec.ts
│   ├── advance-task-control-combinations-test.spec.ts
│   ├── dial-number-task-control-test.spec.ts
│   ├── tasklist-test.spec.ts
│   ├── multiparty-conference-set-7-test.spec.ts
│   └── multiparty-conference-set-8-test.spec.ts
├── Utils/
│   ├── initUtils.ts
│   ├── helperUtils.ts
│   ├── incomingTaskUtils.ts
│   ├── stationLoginUtils.ts
│   ├── userStateUtils.ts
│   ├── taskControlUtils.ts
│   ├── advancedTaskControlUtils.ts
│   └── wrapupUtils.ts
├── test-manager.ts
├── test-data.ts
├── constants.ts
├── global.setup.ts
└── ai-docs/
    ├── AGENTS.md
    └── ARCHITECTURE.md
```

Keep this section aligned to real repository contents.

---

## Dynamic Project Generation

`playwright.config.ts` creates Playwright projects from `USER_SETS`:

- project name: set key (`SET_X`)
- suite binding: `testMatch = **/suites/${TEST_SUITE}`
- workers: `Object.keys(USER_SETS).length`
- global timeout: `180000`
- per-project retries: `1`

Any set added to `USER_SETS` becomes runnable automatically through this mapping model.

---

## Runtime Data Flow

`global.setup.ts`:

1. expands `USER_SETS` into set-scoped env keys (`<SET>_...`)
2. fetches OAuth tokens in batches of 4 parallel browser contexts
3. writes token/env updates to `.env` in one upsert pass after token collection

`test-manager.ts`:

1. reads set-scoped env values using `testInfo.project.name`
2. creates required pages/contexts per setup config
3. performs login/widget initialization
4. runs cleanup/soft-cleanup between tests

---

## Extension Points

When adding a new scenario family, update in this order:

1. `playwright/tests/*.spec.ts` (test factory)
2. `playwright/suites/*.spec.ts` (suite orchestration)
3. `playwright/test-data.ts` (`TEST_SUITE` mapping and set config)
4. `playwright/test-manager.ts` and `playwright/Utils/*.ts` if new setup/operations are needed
5. `playwright/global.setup.ts` if env/token model changes
6. `playwright/ai-docs/*.md` to match the final implementation

Avoid documenting future sets or files before they exist.

---

## Stability Principles

- Prefer explicit state checks over blind waits
- Fix root causes before increasing timeouts
- Keep setup/cleanup deterministic
- Reuse utility helpers instead of duplicating selectors
- Keep tests independently runnable

---

## Related

- Workflow/runbook: [./AGENTS.md](./AGENTS.md)
- Framework overview: [../README.md](../README.md)
- Playwright templates: [../../ai-docs/templates/playwright/00-master.md](../../ai-docs/templates/playwright/00-master.md)

---

_Last Updated: 2026-03-04_
