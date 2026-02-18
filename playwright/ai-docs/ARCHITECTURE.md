# Playwright E2E Framework — Architecture

## File Structure

```text
playwright/
├── suites/
│   ├── advanced-task-controls-tests.spec.ts
│   ├── basic-advanced-task-controls-tests.spec.ts
│   ├── dial-number-tests.spec.ts
│   ├── digital-incoming-task-tests.spec.ts
│   ├── station-login-user-state-tests.spec.ts
│   └── task-list-multi-session-tests.spec.ts
├── tests/
│   ├── advance-task-control-combinations-test.spec.ts
│   ├── advanced-task-controls-test.spec.ts
│   ├── basic-task-controls-test.spec.ts
│   ├── dial-number-task-control-test.spec.ts
│   ├── digital-incoming-task-and-task-controls.spec.ts
│   ├── incoming-task-and-controls-multi-session.spec.ts
│   ├── incoming-telephony-task-test.spec.ts
│   ├── station-login-test.spec.ts
│   ├── tasklist-test.spec.ts
│   └── user-state-test.spec.ts
├── Utils/
│   ├── advancedTaskControlUtils.ts
│   ├── helperUtils.ts
│   ├── incomingTaskUtils.ts
│   ├── initUtils.ts
│   ├── stationLoginUtils.ts
│   ├── taskControlUtils.ts
│   ├── userStateUtils.ts
│   └── wrapupUtils.ts
├── test-manager.ts
├── test-data.ts
├── constants.ts
├── global.setup.ts
└── ai-docs/
    ├── AGENTS.md
    └── ARCHITECTURE.md
```

---

## Core Design

### Layering

```text
Playwright Project(Set)
  -> Suite (`suites/*.spec.ts`)
    -> Test Factory (`tests/*.spec.ts`)
      -> Utils + TestManager + Constants
        -> Browser + Widgets + SDK-backed behavior
```

### Source of Truth

- Project/set definitions: `playwright/test-data.ts` (`USER_SETS`)
- Project generation: `playwright.config.ts` (maps `USER_SETS` to Playwright projects)
- Runtime setup/teardown: `playwright/test-manager.ts`
- Shared behavior and selectors: `playwright/Utils/*.ts`

---

## Project Generation Model

`playwright.config.ts` dynamically builds projects by iterating `USER_SETS`.

Key properties derived from each set:
- project `name` = set key (`SET_X`)
- project `testMatch` = `**/suites/${TEST_SUITE}`
- worker count = `Object.keys(USER_SETS).length`

This avoids manual per-project duplication in config.

---

## TestManager Architecture

`TestManager` manages page/context lifecycle for:
- Agent1 / Agent2 pages
- Caller page
- Extension page
- Chat page
- Multi-session page
- Dial-number page

### Main setup entrypoints

- `setup(browser, config)` (generic)
- `basicSetup`
- `setupForStationLogin`
- `setupForIncomingTaskDesktop`
- `setupForIncomingTaskExtension`
- `setupForIncomingTaskMultiSession`
- `setupForAdvancedTaskControls`
- `setupForAdvancedCombinations`
- `setupForDialNumber`

### Cleanup entrypoints

- `softCleanup()` for lighter cleanup
- `cleanup()` for full teardown/logout/context cleanup

---

## Env and OAuth Data Flow

`playwright/global.setup.ts` performs two responsibilities:

1. Expand `USER_SETS` into set-scoped `.env` variables:
- `<SET>_<AGENT>_USERNAME`
- `<SET>_<AGENT>_EXTENSION_NUMBER`
- `<SET>_<AGENT>_NAME`
- `<SET>_ENTRY_POINT`
- `<SET>_EMAIL_ENTRY_POINT`
- `<SET>_QUEUE_NAME`
- `<SET>_CHAT_URL`

2. Acquire and persist access tokens:
- `<SET>_<AGENT>_ACCESS_TOKEN`
- `DIAL_NUMBER_LOGIN_ACCESS_TOKEN` (if dial-number credentials are provided)

---

## Constants and Shared Types

`playwright/constants.ts` centralizes:
- User states (`USER_STATES`)
- Login modes (`LOGIN_MODE`)
- Task types (`TASK_TYPES`)
- Wrapup reasons (`WRAPUP_REASONS`)
- Timeout values (for setup/tasks/operations)
- Common test data strings

Tests should consume these constants rather than hardcoding values.

---

## Stability Patterns

Common anti-flake patterns in the current framework:
- deterministic setup via `TestManager` convenience methods
- pre-test cleanup via `handleStrayTasks` where needed
- explicit state checks (`verifyCurrentState`, `waitForState`)
- targeted retries/timeouts in utility-level operations
- scenario-level teardown (`endTask`, `submitWrapup`) before full suite cleanup

---

## Conference Transfer/Switch Notes (Merged from prior spec)

Existing documentation captured a conference transfer/switch plan with:
- desktop-only scope
- explicit out-of-scope cases (`EP_DN`, >4 agents)
- skip/todo IDs (`TC-14`, `TC-17`, `TC-18`, `TC-19`, `TC-20`)
- guidance for retries, timeout tuning, and bounded cleanup

Important alignment note:
- those conference suite/test files are not present in the current `playwright/suites/` and `playwright/tests/` tree at the time of this update.
- if conference automation is (re)introduced, it should follow current `USER_SETS` + suite mapping + `TestManager` patterns documented above.

---

## Troubleshooting

### Project not showing in test list

- Verify set exists in `playwright/test-data.ts`
- Verify `TEST_SUITE` matches a real file in `playwright/suites/`
- Run: `yarn playwright test --config=playwright.config.ts --list`

### Auth/setup failures

- Validate required env keys exist
- Verify OAuth global setup project runs successfully
- Check generated set-scoped env keys in `.env`

### Flaky interaction behavior

- Prefer utility helpers over repeated ad-hoc selectors
- Ensure cleanup is complete after each scenario
- Increase operation-level timeouts before global timeout

---

## Related

- Usage/Runbook: [./AGENTS.md](./AGENTS.md)
- Framework README: [../README.md](../README.md)
- Root testing patterns: [../../ai-docs/patterns/testing-patterns.md](../../ai-docs/patterns/testing-patterns.md)

---

_Last Updated: 2026-02-18_
