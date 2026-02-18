# Playwright Test Work - Master Template

## Purpose

Orchestrator for Playwright E2E work in this repository, with a simplified module flow.

---

## Workflow

1. Gather complete requirements -> [01-pre-questions.md](./01-pre-questions.md)
2. Implement tests/suites/sets -> [02-test-implementation.md](./02-test-implementation.md)
3. Apply framework/docs updates if needed -> [03-framework-and-doc-updates.md](./03-framework-and-doc-updates.md)
4. Validate before completion -> [04-validation.md](./04-validation.md)

---

## Task Types

Use one or more values from:

- `new_test_suite`
- `new_test_file`
- `add_scenarios_to_existing_test`
- `update_existing_test_logic`
- `stabilize_flaky_tests`
- `add_or_update_user_set`
- `add_or_update_utils`
- `add_or_update_test_manager`
- `add_or_update_constants`
- `add_or_update_global_setup`
- `update_playwright_docs`

---

## Current Set-to-Suite Mapping

From `playwright/test-data.ts`:
- `SET_1` -> `digital-incoming-task-tests.spec.ts`
- `SET_2` -> `task-list-multi-session-tests.spec.ts`
- `SET_3` -> `station-login-user-state-tests.spec.ts`
- `SET_4` -> `basic-advanced-task-controls-tests.spec.ts`
- `SET_5` -> `advanced-task-controls-tests.spec.ts`
- `SET_6` -> `dial-number-tests.spec.ts`

---

## Execution Guidance

- Always start with [01-pre-questions.md](./01-pre-questions.md).
- Keep implementations aligned with current framework files (`playwright/suites`, `playwright/tests`, `playwright/Utils`, `playwright/test-manager.ts`, `playwright/test-data.ts`, `playwright/constants.ts`, `playwright/global.setup.ts`).
- End with [04-validation.md](./04-validation.md).

---

_Last Updated: 2026-02-18_
