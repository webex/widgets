# Playwright E2E Framework — Architecture

## Purpose

Technical reference for Playwright framework structure, runtime data flow, and extension points.

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
- Project generation and browser/runtime config: `playwright.config.ts`
- Runtime setup/teardown orchestration: `playwright/test-manager.ts`
- Shared test operations: `playwright/Utils/*.ts`
- Shared constants/types/timeouts: `playwright/constants.ts`
- OAuth + set-scoped env expansion: `playwright/global.setup.ts`

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
│   └── dial-number-tests.spec.ts
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
│   └── tasklist-test.spec.ts
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

## Set -> Suite -> Test Mapping

| Set | Suite File (`TEST_SUITE`) | Test Files Imported By Suite |
| --- | --- | --- |
| `SET_1` | `digital-incoming-task-tests.spec.ts` | `digital-incoming-task-and-task-controls.spec.ts`, `dial-number-task-control-test.spec.ts` |
| `SET_2` | `task-list-multi-session-tests.spec.ts` | `incoming-task-and-controls-multi-session.spec.ts`, `tasklist-test.spec.ts` |
| `SET_3` | `station-login-user-state-tests.spec.ts` | `station-login-test.spec.ts`, `user-state-test.spec.ts`, `incoming-telephony-task-test.spec.ts` |
| `SET_4` | `basic-advanced-task-controls-tests.spec.ts` | `basic-task-controls-test.spec.ts`, `advance-task-control-combinations-test.spec.ts` |
| `SET_5` | `advanced-task-controls-tests.spec.ts` | `advanced-task-controls-test.spec.ts` |
| `SET_6` | `dial-number-tests.spec.ts` | `dial-number-task-control-test.spec.ts` |

Use this mapping to decide where new tests should be added and wired.

---

## Dynamic Project Generation

`playwright.config.ts` creates Playwright projects from `USER_SETS`:

- Project name: set key (`SET_X`)
- Suite binding: `testMatch = **/suites/${TEST_SUITE}`
- Worker count: `Object.keys(USER_SETS).length`
- Global timeout: `180000`
- Per-project retries: `1`

Any set added to `USER_SETS` becomes runnable through this model.

### System Under Test

The E2E tests validate Contact Center widgets running in `samples-cc-react-app` served at `http://localhost:3000`.

`playwright.config.ts` boots the app using:

```typescript
webServer: {
  command: 'yarn workspace samples-cc-react-app serve',
  url: 'http://localhost:3000',
}
```

Each generated set project uses Chrome launch flags required for telephony/WebRTC automation:

- `--use-fake-ui-for-media-stream`
- `--use-fake-device-for-media-stream`
- `--use-file-for-fake-audio-capture=<repo>/playwright/wav/dummyAudio.wav`
- `--remote-debugging-port=${9221 + index}` (unique port per set)

These flags are part of baseline runtime behavior and should be preserved unless intentionally changed.

---

## Runtime Data Flow

`global.setup.ts`:

1. Expands `USER_SETS` into set-scoped env keys (`<SET>_...`)
2. Fetches OAuth tokens for agents in each set
3. Writes token/env updates to `.env`

Test files:

1. Read Playwright project name via `test.info().project.name`
2. Instantiate `new TestManager(projectName)`

`test-manager.ts`:

1. Receives the set key via constructor (`projectName`)
2. Resolves set-scoped env values using that project key
3. Creates required contexts/pages and performs login/widget initialization
4. Handles soft cleanup (`softCleanup`) and full cleanup (`cleanup`)

---

## TestManager

`TestManager` is the setup/teardown orchestrator used across suites.

### Constructor

```typescript
new TestManager(projectName: string, maxRetries?: number)
```

- `projectName`: set key (for example, `SET_1`) used to resolve env values like `${projectName}_AGENT1_ACCESS_TOKEN`
- `maxRetries`: optional retry count (default from `DEFAULT_MAX_RETRIES`)

### SetupConfig (Universal setup)

`setup(browser, config)` accepts:

```typescript
interface SetupConfig {
  needsAgent1?: boolean; // default: true
  needsAgent2?: boolean; // default: false
  needsCaller?: boolean; // default: false
  needsExtension?: boolean; // default: false
  needsChat?: boolean; // default: false
  needsMultiSession?: boolean; // default: false
  agent1LoginMode?: LoginMode; // default: LOGIN_MODE.DESKTOP
  enableConsoleLogging?: boolean; // default: true
  enableAdvancedLogging?: boolean; // default: false
  needDialNumberLogin?: boolean; // default: false
}
```

### Page Properties

When enabled by setup config/method, these page properties are created and available:

- `agent1Page`
- `agent2Page`
- `callerPage`
- `agent1ExtensionPage`
- `chatPage`
- `multiSessionAgent1Page`
- `dialNumberPage`

### Universal Setup Flow (3 phases)

`setup()` runs a three-phase flow:

1. Create required browser contexts/pages in parallel (`createContextsForConfig`)
2. Run independent login + widget setup in parallel (`createSetupPromises` + optional multi-session flow)
3. Register console logging handlers (`setupConsoleLogging`)

### Convenience Methods

| Method | Behavior |
| --- | --- |
| `basicSetup()` | Calls `setup()` with desktop agent1 defaults |
| `setupForAdvancedTaskControls()` | Calls `setup()` with agent1+agent2+caller+extension and advanced logging |
| `setupForAdvancedCombinations()` | Calls `setup()` with agent1+agent2+caller and advanced logging |
| `setupForDialNumber()` | Calls `setup()` with dial-number login enabled |
| `setupForIncomingTaskDesktop()` | Calls `setup()` for desktop incoming-task flow |
| `setupForIncomingTaskExtension()` | Calls `setup()` for extension incoming-task flow |
| `setupForIncomingTaskMultiSession()` | Calls `setup()` for multi-session incoming-task flow |
| `setupForStationLogin()` | Custom path (does not call `setup()`), purpose-built station-login + multi-login bootstrap |
| `setupMultiSessionPage()` | Targeted helper to initialize only multi-session page when needed |

### Cleanup

- `softCleanup()`:
  - Handles stray tasks only (`handleStrayTasks`)
  - Intended for between-file cleanup via `afterAll`
- `cleanup()`:
  - Runs `softCleanup()` first
  - Performs station logout where applicable
  - Closes all created pages/contexts
  - Intended for end-of-suite full cleanup

---

## Utils Reference

| File | Key Exports | Purpose |
| --- | --- | --- |
| `initUtils.ts` | `loginViaAccessToken`, `oauthLogin`, `enableAllWidgets`, `enableMultiLogin`, `initialiseWidgets`, `agentRelogin`, `setupMultiLoginPage` | Auth/bootstrap/widget init helpers |
| `stationLoginUtils.ts` | `desktopLogin`, `extensionLogin`, `dialLogin`, `telephonyLogin`, `stationLogout`, `verifyLoginMode`, `ensureUserStateVisible` | Station login/logout validation for Desktop/Extension/Dial Number |
| `userStateUtils.ts` | `changeUserState`, `getCurrentState`, `verifyCurrentState`, `getStateElapsedTime`, `validateConsoleStateChange`, `checkCallbackSequence` | User-state actions and console/state validation |
| `taskControlUtils.ts` | `holdCallToggle`, `recordCallToggle`, `endTask`, `verifyHoldTimer`, `verifyHoldButtonIcon`, `verifyRecordButtonIcon`, `setupConsoleLogging`, `verifyHoldLogs`, `verifyRecordingLogs`, `verifyEndLogs`, `verifyRemoteAudioTracks` | Basic call control actions + callback/event log assertions |
| `advancedTaskControlUtils.ts` | `consultOrTransfer`, `cancelConsult`, `setupAdvancedConsoleLogging`, `verifyTransferSuccessLogs`, `verifyConsultStartSuccessLogs`, `verifyConsultEndSuccessLogs`, `verifyConsultTransferredLogs` | Consult/transfer operations + advanced callback/event log assertions |
| `incomingTaskUtils.ts` | `createCallTask`, `createChatTask`, `createEmailTask`, `waitForIncomingTask`, `acceptIncomingTask`, `declineIncomingTask`, `acceptExtensionCall`, `loginExtension`, `submitRonaPopup` | Incoming task creation/acceptance/decline and extension helpers |
| `wrapupUtils.ts` | `submitWrapup` | Wrapup submission |
| `helperUtils.ts` | `handleStrayTasks`, `pageSetup`, `waitForState`, `waitForStateLogs`, `waitForWebSocketDisconnection`, `waitForWebSocketReconnection`, `clearPendingCallAndWrapup`, `dismissOverlays` | Shared setup/cleanup/state polling/network-watch helpers |

Use existing helpers first; add new utilities only when behavior is not already covered.

---

## Constants Reference

### Key Enums/Objects

| Constant | Values (Current) | Used For |
| --- | --- | --- |
| `USER_STATES` | `MEETING`, `AVAILABLE`, `LUNCH` (`Lunch Break`), `RONA`, `ENGAGED`, `AGENT_DECLINED` | Agent state change/validation |
| `LOGIN_MODE` | `DESKTOP` (`Desktop`), `EXTENSION` (`Extension`), `DIAL_NUMBER` (`Dial Number`) | Station login mode selection |
| `PAGE_TYPES` | `AGENT1`, `AGENT2`, `CALLER`, `EXTENSION`, `CHAT`, `MULTI_SESSION`, `DIAL_NUMBER` | TestManager page/context identity |
| `TASK_TYPES` | `CALL`, `CHAT`, `EMAIL`, `SOCIAL` | Incoming task typing |
| `WRAPUP_REASONS` | `SALE`, `RESOLVED` | Wrapup flow |
| `RONA_OPTIONS` | `AVAILABLE`, `IDLE` | RONA popup next-state selection |
| `CONSOLE_PATTERNS` | `SDK_STATE_CHANGE_SUCCESS`, `ON_STATE_CHANGE_REGEX`, `ON_STATE_CHANGE_KEYWORDS` | State-change console pattern matching |

### Timeout Hierarchy

| Constant | Value | Typical Use |
| --- | --- | --- |
| `DROPDOWN_SETTLE_TIMEOUT` | `200` ms | Dropdown animation settle |
| `UI_SETTLE_TIMEOUT` | `2000` ms | Generic UI settle |
| `DEFAULT_TIMEOUT` | `5000` ms | Default visibility/check timeout |
| `AWAIT_TIMEOUT` | `10000` ms | Standard element interactions |
| `WRAPUP_TIMEOUT` | `15000` ms | Wrapup UI timing |
| `FORM_FIELD_TIMEOUT` | `20000` ms | Popover/form field loading |
| `OPERATION_TIMEOUT` | `30000` ms | Longer user operations (for example logout checks) |
| `EXTENSION_REGISTRATION_TIMEOUT` | `40000` ms | Extension registration waits |
| `NETWORK_OPERATION_TIMEOUT` | `40000` ms | Network-dependent operations |
| `WIDGET_INIT_TIMEOUT` | `50000` ms | Widget initialization |
| `CHAT_LAUNCHER_TIMEOUT` | `60000` ms | Chat launcher iframe loading |
| `ACCEPT_TASK_TIMEOUT` | `60000` ms | Incoming-task acceptance waits |

Choose the smallest fitting timeout and document reasons for any increases.

---

## Console Log Verification Pattern

Console log monitoring is a core assertion pattern in this framework.

### 1. Setup handlers

- Basic controls: `setupConsoleLogging(page)`
- Advanced controls: `setupAdvancedConsoleLogging(page)`

These register `page.on('console', ...)` handlers and capture only relevant SDK/callback log messages.

### 2. Captured event categories

Basic controls (`taskControlUtils.ts`):

- `WXCC_SDK_TASK_HOLD_SUCCESS` / `WXCC_SDK_TASK_RESUME_SUCCESS`
- `WXCC_SDK_TASK_PAUSE_RECORDING_SUCCESS` / `WXCC_SDK_TASK_RESUME_RECORDING_SUCCESS`
- `onHoldResume invoked` / `onRecordingToggle invoked` / `onEnd invoked`

Advanced controls (`advancedTaskControlUtils.ts`):

- `WXCC_SDK_TASK_TRANSFER_SUCCESS`
- `WXCC_SDK_TASK_CONSULT_START_SUCCESS`
- `WXCC_SDK_TASK_CONSULT_END_SUCCESS`
- `AgentConsultTransferred`
- `onTransfer invoked` / `onConsult invoked` / `onEnd invoked`

State changes (`userStateUtils.ts` + `constants.ts`):

- `WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS`
- `onStateChange invoked with state name: <stateName>`

### 3. Verification helpers

- Basic: `verifyHoldLogs`, `verifyRecordingLogs`, `verifyEndLogs`
- Advanced: `verifyTransferSuccessLogs`, `verifyConsultStartSuccessLogs`, `verifyConsultEndSuccessLogs`, `verifyConsultTransferredLogs`
- State: `validateConsoleStateChange`, `checkCallbackSequence`

### 4. Sequence validation

`checkCallbackSequence()` verifies ordering for state changes:

1. SDK success log is present
2. `onStateChange` callback log is present
3. Callback occurs after SDK success
4. Logged state value matches expected state

Use this pattern when assertions depend on callback/API event ordering.

---

## Extension Points

When adding a scenario family or changing framework behavior, update in this order:

1. `playwright/tests/*.spec.ts` (test factory logic)
2. `playwright/suites/*.spec.ts` (suite composition)
3. `playwright/test-data.ts` (set mapping + set data)
4. `playwright/test-manager.ts` and/or `playwright/Utils/*.ts` (shared setup/ops)
5. `playwright/global.setup.ts` and/or `playwright.config.ts` (env/runtime)
6. `playwright/ai-docs/AGENTS.md` and this file to match final implementation

Do not document future files/sets before they exist in code.

---

## Stability Principles

- Prefer explicit state assertions over blind waits
- Fix root causes before increasing timeouts
- Keep setup and cleanup deterministic
- Reuse existing utilities to avoid divergent selectors/flows
- Keep tests independently runnable by set/suite

---

## Related

- Workflow/runbook: [./AGENTS.md](./AGENTS.md)
- Framework overview: [../README.md](../README.md)
- Playwright templates: [../../ai-docs/templates/playwright/00-master.md](../../ai-docs/templates/playwright/00-master.md)

---

_Last Updated: 2026-03-05_
