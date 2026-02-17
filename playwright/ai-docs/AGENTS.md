# Playwright E2E Testing (`widgets/playwright`)

## Overview

The `playwright` directory contains the end-to-end testing framework for Contact Center widgets in this monorepo. It provides reusable setup/teardown orchestration, shared utilities for agent and task flows, and dynamic project generation by user set.

**Package:** `playwright` (internal test framework directory)

**Version:** See [root package.json](../../package.json)

---

## Why and What is This Used For?

### Purpose

This framework validates real widget behavior in browser-driven flows such as station login, user state transitions, incoming tasks, task controls, transfer/consult operations, and dial-number login. It centralizes environment setup and cleanup through `TestManager` so test files can focus on behavior assertions. It also reduces duplication by exposing utility modules for common interactions and verification patterns.

### Key Capabilities

- **Dynamic project generation** - Playwright projects are built from `playwright/test-data.ts` (`USER_SETS`).
- **Reusable test setup** - `TestManager` provisions contexts/pages and performs login/widget initialization.
- **Flow-specific utilities** - Shared helpers for station login, user state, incoming tasks, task controls, and wrapup.
- **Parallel execution model** - Worker count scales with the number of configured user sets.
- **Deterministic cleanup and retries** - Built-in retry and cleanup patterns reduce flaky state carry-over.

---

## Examples and Use Cases

### Getting Started

#### Basic Usage (Suite + TestManager)

```typescript
import {test} from '@playwright/test';
import {TestManager} from '../test-manager';

export default function createStationLoginTests() {
  let testManager: TestManager;

  test.beforeAll(async ({browser}, testInfo) => {
    testManager = new TestManager(testInfo.project.name);
    await testManager.setupForStationLogin(browser);
  });

  test.afterAll(async () => {
    await testManager.cleanup();
  });

  test('should render station login widget', async () => {
    await testManager.agent1Page.getByTestId('station-login-widget').isVisible();
  });
}
```

#### Running Tests

```bash
# Run all configured sets

yarn test:e2e

# Run one suite

yarn test:e2e playwright/suites/station-login-user-state-tests.spec.ts

# Run one project (set)

yarn test:e2e --project=SET_3
```

### Common Use Cases

#### 1. Incoming Telephony Task Validation

```typescript
import {createCallTask, acceptIncomingTask, endCallTask} from '../Utils/incomingTaskUtils';
import {TASK_TYPES} from '../constants';

await createCallTask(testManager.callerPage, process.env[`${testInfo.project.name}_ENTRY_POINT`]!);
await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
await endCallTask(testManager.agent1Page);
```

**Key Points:**
- Use `TestManager.setupForIncomingTaskDesktop()` or `setupForIncomingTaskExtension()`.
- Prefer constants from `constants.ts` for task and state values.
- Always clean up call state in teardown.

#### 2. State Transition Assertions

```typescript
import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {USER_STATES} from '../constants';

await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
```

**Key Points:**
- Use shared helpers instead of direct selector logic.
- Keep test assertions tied to domain constants.

#### 3. Advanced Consult/Transfer Flow

```typescript
import {consultOrTransfer, verifyTransferSuccessLogs} from '../Utils/advancedTaskControlUtils';

await consultOrTransfer(testManager.agent1Page, 'agent', 'transfer', process.env[`${testInfo.project.name}_AGENT2_NAME`]!);
verifyTransferSuccessLogs();
```

**Key Points:**
- Use `setupForAdvancedTaskControls()` for extension and second-agent context.
- Validate both UI state and captured console metrics/log patterns.

#### 4. Multi-Session Setup

```typescript
await testManager.setupForIncomingTaskMultiSession(browser);

// Validate secondary session page behavior
await testManager.multiSessionAgent1Page.getByTestId('station-login-widget').isVisible();
```

**Key Points:**
- Multi-session tests require `needsMultiSession` flow.
- Keep both sessions in sync with deterministic setup and cleanup.

#### 5. Defensive Cleanup in Failure Paths

```typescript
try {
  // test actions
} finally {
  await testManager.softCleanup();
}
```

**Key Points:**
- Use `softCleanup()` between heavy scenarios.
- Use full `cleanup()` only at end-of-suite boundaries.

### Integration Patterns

#### Pattern 1: Add a New Test File to an Existing Suite

```typescript
// playwright/suites/station-login-user-state-tests.spec.ts
import createMyNewTest from '../tests/my-new-test.spec';

test.describe('My New Test', createMyNewTest);
```

#### Pattern 2: Add a New User Set (Project)

```typescript
// playwright/test-data.ts
export const USER_SETS = {
  // ...existing sets
  SET_7: {
    AGENTS: {
      AGENT1: {username: 'user25', extension: '1025', agentName: 'User25 Agent25'},
      AGENT2: {username: 'user26', extension: '1026', agentName: 'User26 Agent26'},
    },
    QUEUE_NAME: 'Queue e2e 7',
    CHAT_URL: `${env.PW_CHAT_URL}-e2e-7.html`,
    EMAIL_ENTRY_POINT: `${env.PW_SANDBOX}.e2e7@gmail.com`,
    ENTRY_POINT: env.PW_ENTRY_POINT7,
    TEST_SUITE: 'my-new-suite.spec.ts',
  },
};
```

---

## Dependencies

**Note:** Exact versions are in [root package.json](../../package.json).

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@playwright/test` | Browser automation, assertions, and test runner |
| `dotenv` | Loads test environment variables from `.env` |
| `nodemailer` | Creates inbound email tasks for email-channel scenarios |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `Node.js 20+` | Runtime required by tooling and scripts |
| `yarn 4+` | Workspace-aware dependency and script runner |

### Development Dependencies

Key tooling lives in the root workspace:
- TypeScript
- Jest (unit/tooling checks)
- ESLint/style tooling

---

## API Reference

### Core Class: `TestManager`

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `new TestManager()` | `projectName: string, maxRetries?: number` | `TestManager` | Creates manager bound to a Playwright project/set name |
| `setup()` | `browser: Browser, config?: SetupConfig` | `Promise<void>` | Universal context/page setup with configurable resources |
| `basicSetup()` | `browser: Browser` | `Promise<void>` | Agent1-only desktop setup |
| `setupForStationLogin()` | `browser: Browser, isDesktopMode?: boolean` | `Promise<void>` | Setup specialized for station login flows |
| `setupForIncomingTaskDesktop()` | `browser: Browser` | `Promise<void>` | Setup for desktop incoming task flows |
| `setupForIncomingTaskExtension()` | `browser: Browser` | `Promise<void>` | Setup for extension incoming task flows |
| `setupForIncomingTaskMultiSession()` | `browser: Browser` | `Promise<void>` | Setup for extension + multi-session flows |
| `setupForAdvancedTaskControls()` | `browser: Browser` | `Promise<void>` | Setup for consult/transfer flows with advanced logging |
| `setupForAdvancedCombinations()` | `browser: Browser` | `Promise<void>` | Setup for advanced mixed control combinations |
| `setupForDialNumber()` | `browser: Browser` | `Promise<void>` | Setup for dial-number login task flows |
| `setupMultiSessionPage()` | none | `Promise<void>` | Initializes multi-session page when already provisioned |
| `softCleanup()` | none | `Promise<void>` | Clears stray tasks without full logout/context teardown |
| `cleanup()` | none | `Promise<void>` | Full cleanup: stray tasks, logout, close pages/contexts |

### `SetupConfig` (for `TestManager.setup`)

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `needsAgent1` | `boolean` | No | `true` | Create/setup primary agent page |
| `needsAgent2` | `boolean` | No | `false` | Create/setup secondary agent page |
| `needsCaller` | `boolean` | No | `false` | Create/setup caller page |
| `needsExtension` | `boolean` | No | `false` | Create/setup extension page |
| `needsChat` | `boolean` | No | `false` | Create/setup chat launcher page |
| `needsMultiSession` | `boolean` | No | `false` | Create/setup second session for agent1 |
| `needDialNumberLogin` | `boolean` | No | `false` | Create/setup dial-number login page |
| `agent1LoginMode` | `LoginMode` | No | `LOGIN_MODE.DESKTOP` | Login mode for agent1 setup |
| `enableConsoleLogging` | `boolean` | No | `true` | Capture page console logs |
| `enableAdvancedLogging` | `boolean` | No | `false` | Capture advanced transfer/consult log patterns |

### Data Configuration: `USER_SETS`

| Field | Type | Description |
|-------|------|-------------|
| `AGENTS.AGENT1/AGENT2.username` | `string` | Sandbox username for each agent |
| `AGENTS.AGENT1/AGENT2.extension` | `string` | Extension value for extension-mode tests |
| `AGENTS.AGENT1/AGENT2.agentName` | `string` | Display name used in assertions/transfers |
| `QUEUE_NAME` | `string` | Queue for routing validations |
| `CHAT_URL` | `string` | Chat launcher URL for digital task tests |
| `EMAIL_ENTRY_POINT` | `string` | Email target for inbound email task creation |
| `ENTRY_POINT` | `string \| undefined` | Entry point number used for inbound telephony routing |
| `TEST_SUITE` | `string` | Suite file under `playwright/suites/` mapped to the set |

### Utility Modules (Selected)

| Module | Function(s) | Description |
|--------|-------------|-------------|
| `Utils/initUtils.ts` | `loginViaAccessToken`, `oauthLogin`, `initialiseWidgets` | Auth and widget bootstrapping |
| `Utils/stationLoginUtils.ts` | `desktopLogin`, `extensionLogin`, `dialLogin`, `stationLogout` | Station login/logout actions |
| `Utils/userStateUtils.ts` | `changeUserState`, `verifyCurrentState` | Agent state changes and assertions |
| `Utils/incomingTaskUtils.ts` | `createCallTask`, `createChatTask`, `acceptIncomingTask`, `submitRonaPopup` | Incoming task lifecycle utilities |
| `Utils/taskControlUtils.ts` | `holdCallToggle`, `recordCallToggle`, `endTask`, log verifiers | Basic task control and logging checks |
| `Utils/advancedTaskControlUtils.ts` | `consultOrTransfer`, `cancelConsult`, log verifiers | Advanced consult/transfer controls |
| `Utils/helperUtils.ts` | `waitForState`, `handleStrayTasks`, `pageSetup`, `dismissOverlays` | Polling, cleanup, and setup helpers |
| `Utils/wrapupUtils.ts` | `submitWrapup` | Wrapup submission helper |

---

## Installation

This framework is part of the repository and is not published as a standalone npm package.

```bash
yarn install
```

### Required Environment Variables

Set these in the root `.env` file:

```env
PW_CHAT_URL=<chat-base-url>
PW_SANDBOX=<sandbox-name>
PW_SANDBOX_PASSWORD=<sandbox-password>
PW_ENTRY_POINT1=<entry-point>
PW_ENTRY_POINT2=<entry-point>
PW_ENTRY_POINT3=<entry-point>
PW_ENTRY_POINT4=<entry-point>
PW_ENTRY_POINT5=<entry-point>
PW_ENTRY_POINT6=<entry-point>
```

Project-scoped OAuth tokens/user values are generated and consumed by `global.setup.ts` + project naming conventions.

---

## Additional Resources

For detailed framework behavior, project mapping, and troubleshooting, see [playwright README](../README.md).

For conference test planning and assumptions, see [multiparty conference spec](./specs/multiparty-conference.spec.md).

For implementation-level details, read:
- [playwright.config.ts](../../playwright.config.ts)
- [playwright/test-manager.ts](../test-manager.ts)
- [playwright/test-data.ts](../test-data.ts)

---

_Last Updated: 2026-02-17_
