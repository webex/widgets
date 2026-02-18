# Playwright E2E Testing (`widgets/playwright`)

## Overview

The `playwright` directory contains the end-to-end testing framework for Contact Center widgets in this monorepo.

It provides:
- Project/set-driven execution from `playwright/test-data.ts`
- Reusable setup/cleanup orchestration via `TestManager`
- Shared flow utilities under `playwright/Utils/`
- Suite-level composition via `playwright/suites/`

**Package context:** Internal E2E framework directory (`playwright/`)

---

## Why This Exists

This framework validates real widget behavior for:
- Station login
- User state transitions
- Incoming telephony/chat/email tasks
- Task controls (hold, resume, record, end, wrapup)
- Consult/transfer and advanced combinations
- Dial number task control flows
- Multi-session synchronization

---

## Folder Layout

```text
playwright/
├── suites/         # Suite orchestration files; imports test factories
├── tests/          # Test factory implementations
├── Utils/          # Shared helper modules
├── wav/            # Audio files for media stream testing
├── test-manager.ts # Setup/teardown orchestration
├── test-data.ts    # USER_SETS and TEST_SUITE mapping
├── constants.ts    # Shared constants/types/timeouts
└── global.setup.ts # OAuth + .env expansion by set
```

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

## Common Commands

```bash
# Run all E2E tests
yarn test:e2e

# List resolved tests/projects
yarn playwright test --config=playwright.config.ts --list

# Run one suite
yarn test:e2e playwright/suites/station-login-user-state-tests.spec.ts

# Run one set/project
yarn test:e2e --project=SET_3
```

---

## Working Patterns

### 1. Add Tests to Existing Suite

1. Add/update factory in `playwright/tests/*.spec.ts`
2. Import factory in matching `playwright/suites/*.spec.ts`
3. Register via `test.describe('...', createFactory)`

### 2. Create New Suite

1. Create `playwright/suites/<name>-tests.spec.ts`
2. Map suite in `playwright/test-data.ts` through `TEST_SUITE`
3. Validate with `--list`

### 3. Add New Set

1. Add `SET_X` in `playwright/test-data.ts`
2. Provide required values (`AGENTS`, `QUEUE_NAME`, `CHAT_URL`, `EMAIL_ENTRY_POINT`, `ENTRY_POINT`, `TEST_SUITE`)
3. Ensure base env keys exist (for example `PW_ENTRY_POINTX`)

### 4. Update Shared Behavior

Prefer reusable changes in:
- `playwright/Utils/*.ts`
- `playwright/test-manager.ts`
- `playwright/constants.ts`

---

## TestManager Convenience Methods

Primary setup helpers in `playwright/test-manager.ts`:

- `setup` (universal setup method - orchestrator)
- `basicSetup`
- `setupForStationLogin`
- `setupForIncomingTaskDesktop`
- `setupForIncomingTaskExtension`
- `setupForIncomingTaskMultiSession`
- `setupForAdvancedTaskControls`
- `setupForAdvancedCombinations`
- `setupForDialNumber`
- `setupMultiSessionPage`
- `softCleanup`
- `cleanup`

Use these before introducing custom setup logic.

---

## Universal Setup Method

The `setup()` method is the foundation for all convenience methods. It accepts a config object:

```typescript
interface SetupConfig {
  needsAgent1?: boolean;
  needsAgent2?: boolean;
  needsCaller?: boolean;
  needsExtension?: boolean;
  needsChat?: boolean;
  needsMultiSession?: boolean;
  agent1LoginMode?: LoginMode;
  enableConsoleLogging?: boolean;
  enableAdvancedLogging?: boolean;
  needDialNumberLogin?: boolean;
}
```

All convenience methods (`basicSetup`, `setupForAdvancedTaskControls`, etc.) internally call `setup()` with pre-configured options.

---

## Key Utility Modules

- `Utils/initUtils.ts`
- `Utils/stationLoginUtils.ts`
- `Utils/userStateUtils.ts`
- `Utils/incomingTaskUtils.ts`
- `Utils/taskControlUtils.ts`
- `Utils/advancedTaskControlUtils.ts`
- `Utils/helperUtils.ts`
- `Utils/wrapupUtils.ts`

---

## Environment Prerequisites

Common env keys used by the framework:

- `PW_SANDBOX`
- `PW_SANDBOX_PASSWORD`
- `PW_CHAT_URL`
- `PW_ENTRY_POINT1..PW_ENTRY_POINT6` (and additional as needed)
- `PW_DIAL_NUMBER_LOGIN_USERNAME` / `PW_DIAL_NUMBER_LOGIN_PASSWORD` (dial-number flows)
- `DIAL_NUMBER_LOGIN_ACCESS_TOKEN` (dial-number access token)

`playwright/global.setup.ts` expands set-scoped env keys and writes access tokens into `.env`.

---

## Documentation Rules

When Playwright behavior changes:

- Update this file (`playwright/ai-docs/AGENTS.md`) for usage/runbook changes
- Update `playwright/ai-docs/ARCHITECTURE.md` for technical/flow changes

---

## Related

- Framework README: [../README.md](../README.md)
- Architecture: [./ARCHITECTURE.md](./ARCHITECTURE.md)
- Root Playwright template flow: [../../ai-docs/templates/playwright/00-master.md](../../ai-docs/templates/playwright/00-master.md)

---

_Last Updated: 2026-02-18_
