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

| Set     | Suite File                                   | Agents | Focus                    |
| ------- | -------------------------------------------- | ------ | ------------------------ |
| SET_1   | `digital-incoming-task-tests.spec.ts`        | 2      | Digital incoming tasks   |
| SET_2   | `task-list-multi-session-tests.spec.ts`      | 2      | Task lists & multi       |
| SET_3   | `station-login-user-state-tests.spec.ts`     | 2      | Login & user states      |
| SET_4   | `basic-advanced-task-controls-tests.spec.ts` | 2      | Task controls            |
| SET_5   | `advanced-task-controls-tests.spec.ts`       | 2      | Advanced controls        |
| SET_6   | `dial-number-tests.spec.ts`                  | 2      | Dial number              |
| SET_7   | `conference-tests1.spec.ts`                  | 4      | Multi-agent scenarios    |
| SET_8   | `conference-tests2.spec.ts`                  | 4      | Multi-agent scenarios    |
| SET_9   | `conference-tests3.spec.ts`                  | 4      | Multi-agent scenarios    |

**Note:** Create new sets as needed for different test scenarios. Sets can have 1-4 agents.

---

## Execution Guidance

- Always start with [01-pre-questions.md](./01-pre-questions.md).
- Keep implementations aligned with current framework files (`playwright/suites`, `playwright/tests`, `playwright/Utils`, `playwright/test-manager.ts`, `playwright/test-data.ts`, `playwright/constants.ts`, `playwright/global.setup.ts`).
- End with [04-validation.md](./04-validation.md).

---

_Last Updated: 2026-03-04_
