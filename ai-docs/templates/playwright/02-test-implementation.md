# Playwright Test Implementation

## Purpose

Implement new or updated Playwright suites/tests/sets using current framework conventions.

---

## Implementation Paths

### A. New Suite

- Add `playwright/suites/<name>-tests.spec.ts`
- Import one or more test factories from `playwright/tests/`
- Wire `TEST_SUITE` in `playwright/test-data.ts`

### B. New Test File

- Add `playwright/tests/<feature>-test.spec.ts`
- Export default factory: `create...Tests`
- Register factory in target suite with `test.describe(...)`

### C. Update Existing Tests

- Update scenario logic in `playwright/tests/*.spec.ts`
- Preserve existing factory export shape
- Keep deterministic setup and cleanup

### D. Add/Update User Set

- Update `USER_SETS` in `playwright/test-data.ts`
- Provide required set fields:
  - `AGENTS`
  - `QUEUE_NAME`
  - `CHAT_URL`
  - `EMAIL_ENTRY_POINT`
  - `ENTRY_POINT`
  - `TEST_SUITE`

---

## Required Patterns

- Use `TestManager` convenience setup methods when possible
- Reuse `playwright/Utils/*.ts` before adding new helper logic
- Use shared constants from `playwright/constants.ts`
- Keep set-scoped env access via `${testManager.projectName}_...`

---

## Done Criteria

- [ ] Suite/test wiring complete
- [ ] Set mapping correct (if changed)
- [ ] Cleanup path present for new/changed scenarios

---

_Last Updated: 2026-02-18_
