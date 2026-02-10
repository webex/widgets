# Agent Development Guide - Contact Center Widgets E2E Testing

This document provides guidance for AI agents and developers working on the Contact Center Widgets E2E Testing Framework. It outlines the project structure, technology stack, development conventions, and best practices to ensure consistent, high-quality implementations across the codebase.

---

## 1. Project Structure

### Playwright Directory Structure

```
playwright/
├── ai-docs/
│   └── AGENTS.md                   # This document
├── constants.ts                    # Shared constants, types, and timeout definitions
├── global.setup.ts                 # OAuth and environment setup (runs before all tests)
├── README.md                       # Framework documentation and setup guide
├── test-data.ts                    # Central test configuration and user sets (SET_1–SET_6)
├── test-manager.ts                 # Core test management, page setup, and lifecycle
├── suites/                         # Test suite orchestration files
│   ├── digital-incoming-task-tests.spec.ts
│   ├── task-list-multi-session-tests.spec.ts
│   ├── station-login-user-state-tests.spec.ts
│   ├── basic-advanced-task-controls-tests.spec.ts
│   ├── advanced-task-controls-tests.spec.ts
│   └── dial-number-tests.spec.ts
├── tests/                          # Individual test implementations
│   ├── station-login-test.spec.ts
│   ├── user-state-test.spec.ts
│   ├── incoming-telephony-task-test.spec.ts
│   ├── digital-incoming-task-and-task-controls.spec.ts
│   ├── basic-task-controls-test.spec.ts
│   ├── advanced-task-controls-test.spec.ts
│   ├── advance-task-control-combinations-test.spec.ts
│   ├── incoming-task-and-controls-multi-session.spec.ts
│   ├── tasklist-test.spec.ts
│   └── dial-number-task-control-test.spec.ts
├── Utils/                          # Utility functions
│   ├── initUtils.ts                # Login, widget initialization, multi-login setup
│   ├── stationLoginUtils.ts        # Station login/logout, mode verification
│   ├── userStateUtils.ts           # Agent state management and verification
│   ├── taskControlUtils.ts         # Basic task controls (hold, record, end) and console logging
│   ├── advancedTaskControlUtils.ts # Transfer, consult, and advanced console logging
│   ├── incomingTaskUtils.ts        # Task creation (call/chat/email), accept/decline, RONA
│   ├── wrapupUtils.ts              # Wrapup submission
│   └── helperUtils.ts              # Timers, WebSocket, state polling, page setup, stray tasks
└── wav/
    └── dummyAudio.wav              # Fake audio file for WebRTC media stream
```

### Playwright Configuration (playwright.config.ts)

The config file is at the repo root. Key behaviors:

- **Web server**: Starts `samples-cc-react-app` on `http://localhost:3000`
- **Projects**: Dynamically generated from `USER_SETS` in `test-data.ts`
- **Workers**: Equal to the number of user sets (one worker per set for parallel execution)
- **Debug ports**: Auto-assigned starting at `9221 + index` (SET_1=9221, SET_2=9222, etc.)
- **Browser**: Desktop Chrome with fake media streams using `dummyAudio.wav`
- **Setup**: OAuth project runs first; all test sets depend on it

---

## 2. Technology Stack

#### Core Framework & Languages

| Technology     | Version | Purpose                                      |
| -------------- | ------- | -------------------------------------------- |
| **TypeScript** | 4.9+    | Primary language for test implementation     |
| **Playwright** | Latest  | E2E testing framework for browser automation |
| **Node.js**    | 20.x+   | Runtime environment                          |
| **yarn**       | Latest  | Package management                           |

#### Testing Infrastructure

| Technology          | Version | Purpose                         |
| ------------------- | ------- | ------------------------------- |
| **Playwright Test** | Latest  | Test runner and assertions      |
| **dotenv**          | Latest  | Environment variable management |
| **nodemailer**      | Latest  | Email task creation             |

#### UI Widgets Under Test

| Widget                   | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| **Station Login Widget** | Agent authentication and station management       |
| **User State Widget**    | Agent state management (Available, Meeting, etc.) |
| **Incoming Task Widget** | Task reception and acceptance                     |
| **Task List Widget**     | Active task management                            |
| **Call Control Widget**  | Call handling (hold, transfer, consult, record)    |

---

## 3. Contact Center Flows

### Agent Lifecycle

```
register → stationLogin → setAgentState (Available) → [Handle Tasks] → stationLogout → deregister
```

### Login Options

| Constant       | Description       | Device ID          |
| -------------- | ----------------- | ------------------ |
| `DESKTOP`      | WebRTC in browser | `WebRTC_{agentId}` |
| `EXTENSION`    | External phone    | Extension number   |
| `DIAL_NUMBER`  | Direct dial       | Phone number       |

### Agent State Machine

```
Meeting → Available ↔ Idle (Lunch/Break)
    ↓         ↓
    └→ Available → [Task Incoming] → Engaged → Wrapup → Meeting/Available
                          ↓
                       RONA (timeout)
```

### Task Lifecycle

```
task:incoming → task:assigned → task:established → [Hold/Transfer/Consult] → task:end → task:wrapup → task:wrappedup
     ↓ (decline/RONA)
task:rejected
```

### Transfer vs Consult

| Type               | Flow                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Blind Transfer** | Agent A → Transfer → Agent B receives task; Agent A → Wrapup                       |
| **Consult**        | Agent A → Consult (customer on hold) → Agent B joins → Complete Transfer OR Cancel |

### Media Channels

| Channel     | Utilities                                                      |
| ----------- | -------------------------------------------------------------- |
| `telephony` | `createCallTask()`, `acceptExtensionCall()`, `endCallTask()`  |
| `chat`      | `createChatTask()`, `endChatTask()`, `acceptIncomingTask()`   |
| `email`     | `createEmailTask()`, `acceptIncomingTask()`                   |

---

## 4. Test Architecture

### User Set Configuration

| Set   | Focus                                   | Debug Port | Suite                                        |
| ----- | --------------------------------------- | ---------- | -------------------------------------------- |
| SET_1 | Digital incoming tasks                  | 9221       | `digital-incoming-task-tests.spec.ts`        |
| SET_2 | Task lists & multi-session              | 9222       | `task-list-multi-session-tests.spec.ts`      |
| SET_3 | Station login, user state & telephony   | 9223       | `station-login-user-state-tests.spec.ts`     |
| SET_4 | Basic task controls & combinations      | 9224       | `basic-advanced-task-controls-tests.spec.ts` |
| SET_5 | Advanced transfer/consult operations    | 9225       | `advanced-task-controls-tests.spec.ts`       |
| SET_6 | Dial number task controls               | 9226       | `dial-number-tests.spec.ts`                  |

### Suite → Test File Mapping

| Suite File                                      | Test Files Imported                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `digital-incoming-task-tests.spec.ts`           | `digital-incoming-task-and-task-controls.spec`                           |
| `task-list-multi-session-tests.spec.ts`         | `incoming-task-and-controls-multi-session.spec`, `tasklist-test.spec`    |
| `station-login-user-state-tests.spec.ts`        | `station-login-test.spec`, `user-state-test.spec`, `incoming-telephony-task-test.spec` |
| `basic-advanced-task-controls-tests.spec.ts`    | `basic-task-controls-test.spec`, `advance-task-control-combinations-test.spec` |
| `advanced-task-controls-tests.spec.ts`          | `advanced-task-controls-test.spec`                                       |
| `dial-number-tests.spec.ts`                     | `dial-number-task-control-test.spec`                                     |

### TestManager SetupConfig

| Property                 | Type        | Purpose                                    |
| ------------------------ | ----------- | ------------------------------------------ |
| `needsAgent1`            | `boolean`   | Create agent1 page and context             |
| `needsAgent2`            | `boolean`   | Create agent2 page and context             |
| `needsCaller`            | `boolean`   | Create caller page for making calls        |
| `needsExtension`         | `boolean`   | Create extension page for extension login  |
| `needsChat`              | `boolean`   | Create chat page for chat tasks            |
| `needsMultiSession`      | `boolean`   | Enable multi-login session page            |
| `needDialNumberLogin`    | `boolean`   | Create dial number page and login          |
| `agent1LoginMode`        | `LoginMode` | Login mode for agent1 (Desktop/Extension/Dial Number) |
| `enableConsoleLogging`   | `boolean`   | Capture console messages from agent pages  |
| `enableAdvancedLogging`  | `boolean`   | Capture advanced transfer/consult logs     |

### TestManager Convenience Setup Methods

| Method                              | Config Summary                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `setup(browser, config)`            | Universal setup with any config                                                 |
| `basicSetup(browser)`               | Agent1 only, Desktop mode, console logging                                      |
| `setupForStationLogin(browser)`     | Agent1 + multi-session page for login tests                                     |
| `setupForIncomingTaskDesktop(browser)` | Agent1 + caller + chat, Desktop mode                                         |
| `setupForIncomingTaskExtension(browser)` | Agent1 + caller + extension + chat, Extension mode                          |
| `setupForIncomingTaskMultiSession(browser)` | Agent1 + caller + extension + chat + multi-session, Extension mode        |
| `setupForAdvancedTaskControls(browser)` | Agent1 + agent2 + extension + caller, Extension mode, advanced logging     |
| `setupForAdvancedCombinations(browser)` | Agent1 + agent2 + caller, Desktop mode, advanced logging                   |
| `setupForDialNumber(browser)`       | Agent1 + agent2 + caller + dial number, Desktop mode, advanced logging         |

### TestManager Key Properties

| Property                  | Type              | Description                      |
| ------------------------- | ----------------- | -------------------------------- |
| `agent1Page`              | `Page`            | Primary agent widget page        |
| `agent2Page`              | `Page`            | Secondary agent widget page      |
| `callerPage`              | `Page`            | Webex calling page               |
| `agent1ExtensionPage`     | `Page`            | Extension login page             |
| `chatPage`                | `Page`            | Chat launcher page               |
| `dialNumberPage`          | `Page`            | Dial number login page           |
| `multiSessionAgent1Page`  | `Page`            | Multi-login session page         |
| `consoleMessages`         | `string[]`        | Captured console log messages    |
| `projectName`             | `string`          | Current project/set name         |
| `maxRetries`              | `number`          | Max retries for setup operations |

---

## 5. Constants

### Core Constants

```typescript
export const BASE_URL = 'http://localhost:3000';

export const USER_STATES = {
  MEETING: 'Meeting',
  AVAILABLE: 'Available',
  LUNCH: 'Lunch Break',
  RONA: 'RONA',
  ENGAGED: 'Engaged',
  AGENT_DECLINED: 'Agent_Declined',
};

export const THEME_COLORS = {
  AVAILABLE: 'rgb(206, 245, 235)',
  MEETING: 'rgba(0, 0, 0, 0.11)',
  ENGAGED: 'rgb(255, 235, 194)',
  RONA: 'rgb(250, 233, 234)',
};

export const LOGIN_MODE = {DESKTOP: 'Desktop', EXTENSION: 'Extension', DIAL_NUMBER: 'Dial Number'};
export const TASK_TYPES = {CALL: 'Call', CHAT: 'Chat', EMAIL: 'Email', SOCIAL: 'Social'};
export const WRAPUP_REASONS = {SALE: 'Sale', RESOLVED: 'Resolved'};
export const RONA_OPTIONS = {AVAILABLE: 'Available', IDLE: 'Idle'};

export const PAGE_TYPES = {
  AGENT1: 'agent1', AGENT2: 'agent2', CALLER: 'caller',
  EXTENSION: 'extension', CHAT: 'chat', MULTI_SESSION: 'multiSession', DIAL_NUMBER: 'dialNumber',
};

export const CALL_URL = 'https://web-sdk.webex.com/samples/calling/';

export const TEST_DATA = {
  CHAT_NAME: 'Playwright Test',
  CHAT_EMAIL: 'playwright@test.com',
  EMAIL_TEXT: '--This Email is generated due to playwright automation test for incoming Tasks---',
  EXTENSION_CALL_INDICATOR: 'Ringing...',
};
```

### Timeout Constants

| Constant                       | Value   | Purpose                            |
| ------------------------------ | ------- | ---------------------------------- |
| `AWAIT_TIMEOUT`                | 10000   | Universal await timeout            |
| `DEFAULT_TIMEOUT`              | 5000    | TestManager default timeout        |
| `DEFAULT_MAX_RETRIES`          | 3       | TestManager default retry count    |
| `UI_SETTLE_TIMEOUT`            | 2000    | Wait for UI animations/settle      |
| `DROPDOWN_SETTLE_TIMEOUT`      | 200     | Wait for dropdown to settle        |
| `FORM_FIELD_TIMEOUT`           | 20000   | Form field interaction timeout     |
| `WRAPUP_TIMEOUT`               | 15000   | Wrapup submission timeout          |
| `OPERATION_TIMEOUT`            | 30000   | Standard async operation timeout   |
| `NETWORK_OPERATION_TIMEOUT`    | 40000   | Network reconnection timeout       |
| `EXTENSION_REGISTRATION_TIMEOUT` | 40000 | Extension registration wait        |
| `WIDGET_INIT_TIMEOUT`          | 50000   | Widget initialization timeout      |
| `CHAT_LAUNCHER_TIMEOUT`        | 60000   | Chat launcher load timeout         |
| `ACCEPT_TASK_TIMEOUT`          | 60000   | Incoming task detection timeout    |

### Console Patterns (in constants.ts)

```typescript
export const CONSOLE_PATTERNS = {
  SDK_STATE_CHANGE_SUCCESS: 'WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS',
  ON_STATE_CHANGE_REGEX: /onStateChange invoked with state name:\s*(.+)/i,
  ON_STATE_CHANGE_KEYWORDS: ['onstatechange', 'invoked'],
};
```

### Exported Types

```typescript
export type userState = (typeof USER_STATES)[keyof typeof USER_STATES];
export type ThemeColor = (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
export type LoginMode = (typeof LOGIN_MODE)[keyof typeof LOGIN_MODE];
export type PageType = (typeof PAGE_TYPES)[keyof typeof PAGE_TYPES];
export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];
export type WrapupReason = (typeof WRAPUP_REASONS)[keyof typeof WRAPUP_REASONS];
export type RonaOption = (typeof RONA_OPTIONS)[keyof typeof RONA_OPTIONS];
```

---

## 6. Utility Functions

### initUtils.ts

| Function                                       | Purpose                              |
| ---------------------------------------------- | ------------------------------------ |
| `loginViaAccessToken(page, accessToken)`        | Login with access token              |
| `oauthLogin(page, username, customPassword?)`   | OAuth login flow                     |
| `enableAllWidgets(page)`                        | Enable all CC widgets                |
| `enableMultiLogin(page)`                        | Enable multi-login checkbox          |
| `disableMultiLogin(page)`                       | Disable multi-login checkbox         |
| `initialiseWidgets(page)`                       | Init widgets and wait for ready      |
| `agentRelogin(page)`                            | Re-login after logout                |
| `setupMultiLoginPage(context)`                  | Create a new page for multi-session  |

### stationLoginUtils.ts

| Function                                          | Purpose                              |
| ------------------------------------------------- | ------------------------------------ |
| `desktopLogin(page)`                              | Browser/Desktop mode login           |
| `extensionLogin(page, extensionNumber?)`          | Extension mode login                 |
| `dialLogin(page, dialNumber?)`                    | Dial Number mode login               |
| `stationLogout(page, throwOnFailure?)`            | Station logout                       |
| `telephonyLogin(page, mode, number?)`             | Generic telephony login by mode      |
| `verifyLoginMode(page, expectedMode)`             | Verify current login mode            |
| `ensureUserStateVisible(page, loginMode, number?)` | Ensure user state widget visible after login |
| `verifyDesktopOptionVisibility(page, shouldBeVisible)` | Verify Desktop option toggle    |

### userStateUtils.ts

| Function                                                   | Purpose                              |
| ---------------------------------------------------------- | ------------------------------------ |
| `changeUserState(page, userState)`                         | Change agent state                   |
| `getCurrentState(page)`                                    | Get current state text               |
| `verifyCurrentState(page, expectedState)`                  | Assert current state matches         |
| `getStateElapsedTime(page)`                                | Get elapsed time string              |
| `validateConsoleStateChange(page, state, consoleMessages)` | Validate state change in console     |
| `checkCallbackSequence(page, expectedState, consoleMessages)` | Verify callback order             |

### taskControlUtils.ts

| Function                                            | Purpose                              |
| --------------------------------------------------- | ------------------------------------ |
| `callTaskControlCheck(page)`                        | Verify call task control buttons     |
| `chatTaskControlCheck(page)`                        | Verify chat task control buttons     |
| `emailTaskControlCheck(page)`                       | Verify email task control buttons    |
| `verifyTaskControls(page, taskType)`                | Verify controls by task type         |
| `holdCallToggle(page)`                              | Toggle hold on/off                   |
| `recordCallToggle(page)`                            | Toggle recording on/off              |
| `verifyHoldTimer(page, {shouldBeVisible, verifyContent?})` | Verify hold timer visibility   |
| `verifyHoldButtonIcon(page, {expectedIsHeld})`      | Verify hold button icon state        |
| `verifyRecordButtonIcon(page, {expectedIsRecording})` | Verify record button icon state    |
| `setupConsoleLogging(page)`                         | Setup console log capture (returns cleanup fn) |
| `clearCapturedLogs()`                               | Clear captured basic logs            |
| `verifyHoldLogs({expectedIsHeld})`                  | Verify hold/resume console logs      |
| `verifyRecordingLogs({expectedIsRecording})`        | Verify recording console logs        |
| `verifyEndLogs()`                                   | Verify end task console logs         |
| `verifyRemoteAudioTracks(page)`                     | Verify remote audio tracks exist     |
| `verifyHoldMusicElement(page)`                      | Verify hold music audio element      |
| `endTask(page)`                                     | End current task                     |

### advancedTaskControlUtils.ts

| Function                                                                    | Purpose                           |
| --------------------------------------------------------------------------- | --------------------------------- |
| `setupAdvancedConsoleLogging(page)`                                         | Setup advanced log capture (returns cleanup fn) |
| `clearAdvancedCapturedLogs()`                                               | Clear captured advanced logs      |
| `verifyTransferSuccessLogs()`                                               | Verify transfer success logs      |
| `verifyConsultStartSuccessLogs()`                                           | Verify consult start success logs |
| `verifyConsultEndSuccessLogs()`                                             | Verify consult end success logs   |
| `verifyConsultTransferredLogs()`                                            | Verify consult transferred logs   |
| `consultOrTransfer(page, type, action, value)`                              | Perform consult or transfer       |
| `cancelConsult(page)`                                                       | Cancel active consult             |

**`consultOrTransfer` parameters:**
- `type`: `'agent'` | `'queue'` | `'dialNumber'` | `'entryPoint'`
- `action`: `'consult'` | `'transfer'`

### incomingTaskUtils.ts

| Function                                          | Purpose                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `createCallTask(page, number)`                    | Create a telephony call via caller page    |
| `endCallTask(page, isCaller?)`                    | End a call task                            |
| `createChatTask(page, chatURL)`                   | Create a chat task via chat launcher       |
| `endChatTask(page)`                               | End a chat task                            |
| `createEmailTask(to)`                             | Create an email task via nodemailer        |
| `getIncomingTaskLocator(page, type)`              | Get locator for incoming task by type      |
| `waitForIncomingTask(page, type, timeout?)`       | Wait for incoming task to appear           |
| `acceptIncomingTask(page, type, timeout?)`        | Accept an incoming task                    |
| `declineIncomingTask(page, type)`                 | Decline an incoming task                   |
| `acceptExtensionCall(page)`                       | Accept call on extension page              |
| `declineExtensionCall(page)`                      | Decline call on extension page             |
| `endExtensionCall(page)`                          | End call on extension page                 |
| `loginExtension(page, token)`                     | Login on extension page with token         |
| `submitRonaPopup(page, nextState)`                | Handle RONA popup (choose Available/Idle)  |

### wrapupUtils.ts

| Function                          | Purpose                        |
| --------------------------------- | ------------------------------ |
| `submitWrapup(page, reason)`      | Submit wrapup with reason      |

**Note:** `reason` is of type `WrapupReason` (`'Sale'` | `'Resolved'`).

### helperUtils.ts

| Function                                                           | Purpose                                      |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `parseTimeString(timeString)`                                      | Parse time string to seconds                 |
| `waitForWebSocketDisconnection(consoleMessages, timeoutMs?)`       | Wait for WebSocket disconnect in logs        |
| `waitForWebSocketReconnection(consoleMessages, timeoutMs?)`        | Wait for WebSocket reconnect in logs         |
| `waitForState(page, expectedState)`                                | Poll until agent reaches expected state      |
| `getLastStateFromLogs(capturedLogs)`                               | Extract last state from console logs         |
| `waitForStateLogs(capturedLogs, expectedState, timeoutMs?)`        | Wait for state change to appear in logs      |
| `waitForWrapupReasonLogs(capturedLogs, expectedReason, timeoutMs?)` | Wait for wrapup reason in logs              |
| `getLastWrapupReasonFromLogs(capturedLogs)`                        | Extract last wrapup reason from logs         |
| `isColorClose(receivedColor, expectedColor, tolerance?)`           | Compare RGB colors with tolerance            |
| `handleStrayTasks(page, extensionPage?, maxIterations?)`           | Clean up stray/leftover tasks                |
| `clearPendingCallAndWrapup(page)`                                  | Clear pending call and submit wrapup         |
| `pageSetup(page, loginMode, accessToken, extensionPage?, extensionNumber?, isMultiSession?)` | Full page setup flow |
| `dismissOverlays(page)`                                            | Dismiss any blocking overlays/popovers       |

---

## 7. Test Patterns

### Standard Test Structure

```typescript
export default function createMyTests() {
  let testManager: TestManager;

  test.beforeAll(async ({browser}, testInfo) => {
    testManager = new TestManager(testInfo.project.name);
    await testManager.setup(browser, {needsAgent1: true, enableConsoleLogging: true});
  });

  test.afterAll(async () => {
    await testManager.cleanup();
  });

  test('should perform action @tag', async () => {
    /* implementation */
  });
}
```

### Suite Orchestration

```typescript
// suites/my-tests.spec.ts
import createMyTests from '../tests/my-test.spec';
test.describe('My Test Suite', createMyTests);
```

### Multiple Tests in One Suite

```typescript
// suites/combined-tests.spec.ts
import createTestA from '../tests/test-a.spec';
import createTestB from '../tests/test-b.spec';
test.describe('Test A', createTestA);
test.describe('Test B', createTestB);
```

---

## 8. Naming Conventions

| Type          | Pattern                        | Example                                  |
| ------------- | ------------------------------ | ---------------------------------------- |
| Test Files    | `*-test.spec.ts`               | `station-login-test.spec.ts`             |
| Suite Files   | `*-tests.spec.ts`              | `station-login-user-state-tests.spec.ts` |
| Utility Files | `*Utils.ts`                    | `stationLoginUtils.ts`                   |
| Actions       | `verbNoun`                     | `changeUserState`, `createCallTask`      |
| Verification  | `verify*`                      | `verifyCurrentState`                     |
| Getters       | `get*`                         | `getCurrentState`                        |
| Test Names    | `should <action> <condition>`  | `'should login with Desktop mode'`       |
| Pages         | `*Page`                        | `agent1Page`, `callerPage`               |
| TestIDs       | `widget-name`, `action-button` | `station-login-widget`, `login-button`   |

---

## 9. Common Pitfalls

### Playwright Pitfalls

1. **Missing Timeouts** - Always use explicit timeouts (`AWAIT_TIMEOUT`, `OPERATION_TIMEOUT`)
2. **Race Conditions** - Wait for elements before interacting; clear console logs before capturing
3. **Stale Elements** - Re-query after navigation/reload
4. **Iframe Handling** - Use `.contentFrame()`; wait for visibility first
5. **Network Simulation** - Use `page.context().setOffline()`; wait for disconnect/reconnect detection

### Test Design Pitfalls

6. **Test Interdependence** - Each test should be independent with proper setup/teardown
7. **Hardcoded Values** - Use environment variables and `testManager.projectName`
8. **Missing Error Handling** - Provide context in error messages
9. **Console Log Timing** - Clear before operation; wait for async events to arrive
10. **Parallel Conflicts** - Each set uses different agents/queues; don't share state

### SDK-Specific Pitfalls

11. **Widget Init Failures** - Wait for visibility; retry on failure
12. **State Transition Timing** - Wait for callback confirmation before proceeding
13. **Multi-Session Sync** - Enable multi-login first; state/timer should sync
14. **Task Lifecycle** - Complete wrapup; wait for `task:wrappedup` before state change
15. **WebSocket Reconnection** - State persists; some timers may reset
16. **Call Control State** - Hold timer appears on hold; consult requires hold first

### Contact Center Flow Pitfalls

17. **RONA** - Agent must change state after RONA; timeout is 15-30 seconds
18. **Queue Routing** - Verify agent in correct queue; tasks may timeout if no agents
19. **Consult vs Transfer** - Blind=immediate handoff; Consult=3-way then transfer/cancel
20. **Extension Login** - Must be registered; calls require separate acceptance
21. **Wrapup Requirements** - Reason required; has configurable timeout
22. **Multi-Agent Coordination** - Agent2 unavailable for Agent1 tests; target must be available for transfer

---

## 10. Best Practices

### Test Organization

- Export factory functions for test definitions
- Use `beforeAll` for login/widget init; `afterAll` for cleanup
- Clear console before capturing; reset UI between tests
- Use specific TestIDs; verify both UI and console events

### Code Organization

- Single responsibility per utility function
- Return meaningful values or throw descriptive errors
- Use TypeScript types for parameters and returns

### Console Log Capture Pattern

```typescript
testManager.consoleMessages.length = 0;
await performOperation();
await page.waitForTimeout(3000);
const logs = testManager.consoleMessages.filter((msg) => msg.includes('PATTERN'));
expect(logs.length).toBeGreaterThan(0);
```

### Advanced Console Logging Pattern

```typescript
// For transfer/consult operations (uses separate log buffer)
clearAdvancedCapturedLogs();
await consultOrTransfer(page, 'agent', 'transfer', agentName);
verifyTransferSuccessLogs();
```

---

## 11. Implementation Guardrails

### Requirements

| Category        | Requirements                                                     |
| --------------- | ---------------------------------------------------------------- |
| **Setup**       | Export factory function; use TestManager; verify widget init     |
| **Cleanup**     | Call `cleanup()` in afterAll; handle stray tasks; close contexts |
| **Assertions**  | Use Playwright `expect`; include timeouts; verify UI and events  |
| **Environment** | Credentials via env vars; never commit secrets                   |

### Timeout Guidelines

| Operation                 | Timeout | Constant                       |
| ------------------------- | ------- | ------------------------------ |
| UI Settle                 | 2s      | `UI_SETTLE_TIMEOUT`            |
| Default Await             | 10s     | `AWAIT_TIMEOUT`                |
| Wrapup Submission         | 15s     | `WRAPUP_TIMEOUT`               |
| Form Fields               | 20s     | `FORM_FIELD_TIMEOUT`           |
| Standard Operations       | 30s     | `OPERATION_TIMEOUT`            |
| Network/Extension         | 40s     | `NETWORK_OPERATION_TIMEOUT`    |
| Widget Initialization     | 50s     | `WIDGET_INIT_TIMEOUT`          |
| Incoming Task / Chat      | 60s     | `ACCEPT_TASK_TIMEOUT`          |
| Test Timeout (global)     | 180s    | Set in `playwright.config.ts`  |

### Architectural Boundaries

- Each USER_SET operates independently with dedicated agents/queues
- Tests interact through UI, not SDK directly
- Verify SDK events through console logs
- Tests run against sandbox; never use production credentials

---

## 12. Console Log Patterns Used in Tests

### Centralized Patterns (constants.ts)

| Constant                       | Value                                      | Used For          |
| ------------------------------ | ------------------------------------------ | ----------------- |
| `SDK_STATE_CHANGE_SUCCESS`     | `WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS`      | State changes     |
| `ON_STATE_CHANGE_REGEX`        | `/onStateChange invoked with state name:\s*(.+)/i` | Parse state |
| `ON_STATE_CHANGE_KEYWORDS`     | `['onstatechange', 'invoked']`             | Filter logs       |

### Patterns in taskControlUtils.ts (local to captured logs)

| Pattern                                 | Purpose                 |
| --------------------------------------- | ----------------------- |
| `WXCC_SDK_TASK_HOLD_SUCCESS`            | Hold success            |
| `WXCC_SDK_TASK_RESUME_SUCCESS`          | Resume from hold        |
| `WXCC_SDK_TASK_PAUSE_RECORDING_SUCCESS` | Recording paused        |
| `WXCC_SDK_TASK_RESUME_RECORDING_SUCCESS`| Recording resumed       |
| `onHoldResume invoked`                  | Hold/resume callback    |
| `onRecordingToggle invoked`             | Recording callback      |
| `onEnd invoked`                         | End task callback       |

### Patterns in advancedTaskControlUtils.ts (local to captured logs)

| Pattern                                  | Purpose                 |
| ---------------------------------------- | ----------------------- |
| `WXCC_SDK_TASK_TRANSFER_SUCCESS`         | Blind transfer success  |
| `WXCC_SDK_TASK_CONSULT_START_SUCCESS`    | Consult started         |
| `WXCC_SDK_TASK_CONSULT_END_SUCCESS`      | Consult ended           |
| `AgentConsultTransferred`                | Consult transfer done   |

### Patterns in helperUtils.ts

| Pattern                                  | Purpose                 |
| ---------------------------------------- | ----------------------- |
| `onStateChange invoked with state name:` | State change callback   |
| `onWrapup invoked with reason :`         | Wrapup callback         |

---

## 13. Test Categories

| Category              | Sets         | Focus                                                                |
| --------------------- | ------------ | -------------------------------------------------------------------- |
| **Station Login**     | SET_3        | Desktop/Extension/Dial Number login, multi-login, reload, network    |
| **User State**        | SET_3        | Transitions, timer, callback verification, multi-session sync        |
| **Incoming Telephony**| SET_3        | Desktop/Extension call accept/decline, RONA, customer disconnect     |
| **Digital Incoming**  | SET_1        | Chat/Email accept/decline, RONA, multi-task, disconnect              |
| **Task List**         | SET_2        | Call/Chat/Email task list verification, multiple tasks               |
| **Multi-Session**     | SET_2        | Multi-login call/chat/email sync, control synchronization            |
| **Basic Controls**    | SET_4        | Hold, recording, audio tracks, end call, wrapup                     |
| **Combinations**      | SET_4        | Transfer chains, multi-stage consult-transfer between agents         |
| **Advanced Controls** | SET_5        | Blind transfer (agent/queue), consult (agent/queue/entry point)      |
| **Dial Number**       | SET_6        | Dial number consult/transfer, search, multi-hop transfers            |

---

## 14. Adding New Tests

1. **Create test file** in `tests/` exporting a factory function (e.g., `createMyTests`)
2. **Add to suite** in `suites/` using `test.describe('Name', createMyTests)`
3. **(Optional) Add new set** in `test-data.ts` if the feature needs dedicated agents/queue (see Section 17)

---

## 14a. Extending the Framework for New Features

When a new feature (e.g., multi-party conference) requires infrastructure changes beyond just adding test files, use this section as a guide.

### Adding a New USER_SET

Each set needs dedicated agents and queue to avoid conflicts with other parallel sets. Add to `playwright/test-data.ts`:

```typescript
SET_7: {
  AGENTS: {
    AGENT1: {username: 'userXX', extension: '10XX', agentName: 'UserXX AgentXX'},
    AGENT2: {username: 'userYY', extension: '10YY', agentName: 'UserYY AgentYY'},
  },
  QUEUE_NAME: 'Queue e2e 7',
  CHAT_URL: `${env.PW_CHAT_URL}-e2e-7.html`,
  EMAIL_ENTRY_POINT: `${env.PW_SANDBOX}.e2e7@gmail.com`,
  ENTRY_POINT: env.PW_ENTRY_POINT7,
  TEST_SUITE: 'new-feature-tests.spec.ts',
},
```

**Required fields:** `AGENTS` (AGENT1 + AGENT2, each with `username`, `extension`, `agentName`), `QUEUE_NAME`, `CHAT_URL`, `EMAIL_ENTRY_POINT`, `ENTRY_POINT`, `TEST_SUITE`

**Automatic behaviors when a set is added:**
- `playwright.config.ts` auto-generates a new Playwright project, worker, and debug port (9221 + index)
- `global.setup.ts` auto-runs OAuth for all agents in the set and writes access tokens to `.env`
- No manual changes needed in either config file

**New `.env` variables needed:**
- `PW_ENTRY_POINT7` (or whichever number) - the phone number for the new set's entry point
- The agents must be pre-provisioned in the sandbox with the correct queue assignment

### Extending TestManager for More Agents

**Current capacity:** TestManager supports exactly 2 agent pages (`agent1Page`, `agent2Page`). If a feature needs 3+ agents (e.g., multi-party conference with Agent A, Agent B, and Agent C), the TestManager must be extended.

**What to add:**
1. New properties in `TestManager` class:
   ```typescript
   public agent3Page: Page;
   public agent3Context: BrowserContext;
   ```
2. New `SetupConfig` option:
   ```typescript
   needsAgent3?: boolean;
   ```
3. New `PAGE_TYPES` entry in `constants.ts`:
   ```typescript
   AGENT3: 'agent3',
   ```
4. Add AGENT3 to the USER_SET in `test-data.ts`:
   ```typescript
   AGENTS: {
     AGENT1: {...},
     AGENT2: {...},
     AGENT3: {username: 'userZZ', extension: '10ZZ', agentName: 'UserZZ AgentZZ'},
   },
   ```
5. Extend `createContextsForConfig`, `processContextCreations`, and add a `setupAgent3` method following the pattern of `setupAgent2`.
6. Extend `global.setup.ts` OAuth loop (it already iterates over all agents in each set, so adding AGENT3 to the AGENTS object is sufficient).
7. New convenience setup method:
   ```typescript
   async setupForNewFeature(browser: Browser): Promise<void> {
     await this.setup(browser, {
       needsAgent1: true,
       needsAgent2: true,
       needsAgent3: true,
       needsCaller: true,
       agent1LoginMode: LOGIN_MODE.EXTENSION,
       enableConsoleLogging: true,
       enableAdvancedLogging: true,
     });
   }
   ```

### Adding New Constants and Types

When a new feature introduces new SDK events, task types, or timeout requirements, add to `constants.ts`:

- **New task types:** Add to `TASK_TYPES` object and `TaskType` type will auto-derive
- **New page types:** Add to `PAGE_TYPES` object if new page roles are needed
- **New console patterns:** Create a new constant object (feature-scoped) or add to `CONSOLE_PATTERNS` if universally applicable. Pattern values must match actual SDK event strings - verify against the widget or SDK source code
- **New timeout constants:** Add with a descriptive comment explaining the rationale and value
- **New state constants:** Only if the feature introduces new agent states

### Adding New Utility Files

Follow the existing convention:

- **File name:** `playwright/Utils/[featureName]Utils.ts` (camelCase + `Utils.ts`)
- **Pattern:** Export async functions that take `Page` as first parameter
- **Console logging:** If the feature has its own SDK events, create dedicated `setup*ConsoleLogging(page)` and `clear*CapturedLogs()` functions following the pattern in `taskControlUtils.ts` and `advancedTaskControlUtils.ts`
- **Verification:** Create `verify*Logs()` functions for each SDK event pattern
- **Update this document:** Add the new utility's function table to Section 6

### Adding New Environment Variables

- Add to `.env` file (see Section 16 for existing patterns)
- If the variable is needed per-set, use `global.setup.ts` pattern (it reads from USER_SETS and writes to `.env`)
- If the variable is optional (feature-gated), guard usage with `if (process.env.VAR_NAME)` and `test.skip()` when not set
- Document in Section 16 of this file

---

## 15. Running Tests

```bash
yarn test:e2e                                    # All tests
yarn test:e2e suites/station-login-user-state-tests.spec.ts  # Specific suite
yarn test:e2e --project=SET_3                    # Specific set
yarn test:e2e --debug | --ui | --headed          # Debug modes
```

---

## 16. Environment Variables

```env
# Sandbox
PW_SANDBOX=your-sandbox-name
PW_SANDBOX_PASSWORD=sandbox-password

# Entry Points (one per user set)
PW_ENTRY_POINT1=+1234567890
PW_ENTRY_POINT2=+1234567891
PW_ENTRY_POINT3=+1234567892
PW_ENTRY_POINT4=+1234567893
PW_ENTRY_POINT5=+1234567894
PW_ENTRY_POINT6=+1234567895

# URLs
PW_CHAT_URL=https://your-chat-base-url

# Email (for nodemailer)
PW_SENDER_EMAIL=sender@gmail.com
PW_SENDER_EMAIL_PASSWORD=app-password

# Dial Number Login (optional - enables dial number tests)
PW_DIAL_NUMBER_LOGIN_USERNAME=dial-user
PW_DIAL_NUMBER_LOGIN_PASSWORD=dial-password
PW_DIAL_NUMBER_NAME=Dial Number Agent

# Entry Point Name (optional - enables entry point consult tests)
PW_ENTRYPOINT_NAME=EntryPointName

# Auto-generated by global.setup.ts (DO NOT set manually):
# SET_1_AGENT1_ACCESS_TOKEN, SET_1_AGENT2_ACCESS_TOKEN, ...
# SET_6_AGENT1_ACCESS_TOKEN, SET_6_AGENT2_ACCESS_TOKEN
# DIAL_NUMBER_LOGIN_ACCESS_TOKEN
```

---

**Document Version**: 1.4.0
**Last Updated**: February 9, 2026
**Maintained By**: Contact Center Widgets Testing Team
