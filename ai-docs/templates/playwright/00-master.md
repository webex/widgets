# Playwright Test Work - Master Template

## Purpose

Orchestrator for Playwright E2E work in this repository.

---

## Workflow

1. Gather complete requirements -> [01-pre-questions.md](./01-pre-questions.md)
2. Implement tests/suites/sets -> [02-test-implementation.md](./02-test-implementation.md)
3. Apply framework updates and documentation alignment -> [03-framework-and-doc-updates.md](./03-framework-and-doc-updates.md)
4. Validate before completion -> [04-validation.md](./04-validation.md)

Doc alignment is mandatory when any suite/test/set/framework behavior changes.

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

Use `playwright/test-data.ts` as the source of truth for current set/suite mappings.

Guidance:
- Read existing `USER_SETS` entries before proposing changes
- Reuse an existing set when possible
- Create a new set only when required by scenario isolation, credentials, or participant count
- Keep set design generic so any scenario can be added via requirements intake

---

## Execution Guidance

- Always start with [01-pre-questions.md](./01-pre-questions.md).
- Keep implementations aligned with current framework files (`playwright/suites`, `playwright/tests`, `playwright/Utils`, `playwright/test-manager.ts`, `playwright/test-data.ts`, `playwright/constants.ts`, `playwright/global.setup.ts`, `playwright.config.ts`).
- For all test/suite/set/framework changes, update `playwright/ai-docs/AGENTS.md` and/or `playwright/ai-docs/ARCHITECTURE.md` as part of the same task.
- End with [04-validation.md](./04-validation.md).

---

_Last Updated: 2026-03-05_
