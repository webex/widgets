# Playwright E2E Testing Framework

## Overview

The `playwright` directory contains the end-to-end testing framework for Contact Center widgets in this monorepo.

**Package context:** Internal E2E framework directory (`playwright/`)

### Core Capabilities

- **Dynamic project/set-driven execution** from `playwright/test-data.ts`
- **Flexible multi-agent support** (1-4 agents per test scenario)
- **Reusable setup/cleanup orchestration** via `TestManager`
- **Shared utility modules** for common flows
- **Suite-level test composition** with factory pattern
- **Automatic OAuth token management** via `global.setup.ts`

---

## Framework Purpose

This framework validates Contact Center widget behavior across:

### User & Session Management
- Station login (desktop, extension, dial-number modes)
- User state transitions and idle code management
- Multi-session scenarios

### Task Management
- Incoming tasks (telephony, chat, email)
- Task controls (hold, resume, record, end, wrapup)
- Task lifecycle and state transitions

### Advanced Scenarios
- Consult/transfer flows
- Multi-agent coordination (2-4 simultaneous agents)
- Advanced task control combinations
- Complex interaction patterns requiring multiple participants

---

## Folder Layout

```text
playwright/
├── suites/         # Suite orchestration files; imports test factories
│   ├── digital-incoming-task-tests.spec.ts
│   ├── task-list-multi-session-tests.spec.ts
│   ├── station-login-user-state-tests.spec.ts
│   ├── basic-advanced-task-controls-tests.spec.ts
│   ├── advanced-task-controls-tests.spec.ts
│   ├── dial-number-tests.spec.ts
│   └── <feature>-tests.spec.ts        # Add new suites as needed
├── tests/          # Test factory implementations
│   ├── digital-incoming-task-and-task-controls.spec.ts
│   ├── incoming-task-and-controls-multi-session.spec.ts
│   ├── station-login-test.spec.ts
│   ├── user-state-test.spec.ts
│   ├── tasklist-test.spec.ts
│   ├── basic-task-controls-test.spec.ts
│   ├── advanced-task-controls-test.spec.ts
│   ├── advance-task-control-combinations-test.spec.ts
│   ├── dial-number-task-control-test.spec.ts
│   └── <feature>-test.spec.ts         # Add new test implementations as needed
├── Utils/          # Shared helper modules
│   ├── initUtils.ts
│   ├── stationLoginUtils.ts
│   ├── userStateUtils.ts
│   ├── incomingTaskUtils.ts
│   ├── taskControlUtils.ts
│   ├── advancedTaskControlUtils.ts
│   ├── helperUtils.ts
│   ├── wrapupUtils.ts
│   └── <feature>Utils.ts              # Add new utilities as needed
├── wav/            # Audio files for media stream testing
├── test-manager.ts # Setup/teardown orchestration (supports 1-4 agents)
├── test-data.ts    # USER_SETS and TEST_SUITE mapping
├── constants.ts    # Shared constants/types/timeouts
├── global.setup.ts # OAuth + .env expansion by set
└── ai-docs/        # Framework documentation
    ├── AGENTS.md
    └── ARCHITECTURE.md
```

---

## Current Set-to-Suite Mapping

From `playwright/test-data.ts`:

| Set     | Suite File                                   | Agents | Focus                        |
| ------- | -------------------------------------------- | ------ | ---------------------------- |
| `SET_1` | `digital-incoming-task-tests.spec.ts`        | 2      | Digital incoming tasks       |
| `SET_2` | `task-list-multi-session-tests.spec.ts`      | 2      | Task lists & multi-session   |
| `SET_3` | `station-login-user-state-tests.spec.ts`     | 2      | Station login & user states  |
| `SET_4` | `basic-advanced-task-controls-tests.spec.ts` | 2      | Task controls & combinations |
| `SET_5` | `advanced-task-controls-tests.spec.ts`       | 2      | Advanced task operations     |
| `SET_6` | `dial-number-tests.spec.ts`                  | 2      | Dial number operations       |
| `SET_7` | `conference-tests1.spec.ts`                  | 4      | Multi-agent scenarios        |
| `SET_8` | `conference-tests2.spec.ts`                  | 4      | Multi-agent scenarios        |
| `SET_9` | `conference-tests3.spec.ts`                  | 4      | Multi-agent scenarios        |

**Note:** Sets can have 1-4 agents depending on test requirements. Configure new sets in `test-data.ts` as needed.

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

### 5. Working with Multi-Agent Scenarios

When tests require multiple agents (2-4 agents), follow these patterns:

1. **Setup:**
   ```typescript
   test.beforeEach(async ({browser}, testInfo) => {
     testManager = new TestManager(testInfo.project.name);
     // Use appropriate setup method or configure manually
     await testManager.setup(browser, {
       needsAgent1: true,
       needsAgent2: true,
       needsAgent3: true,  // Optional: for 3+ agent scenarios
       needsAgent4: true,  // Optional: for 4 agent scenarios
       needsCaller: true,
       enableConsoleLogging: true,
     });
   });
   ```

2. **Access agent pages:**
   ```typescript
   const agent1Page = testManager.agent1Page;
   const agent2Page = testManager.agent2Page;
   // For 3+ agent scenarios:
   const agent3Page = testManager.agent3Page;
   const agent4Page = testManager.agent4Page;
   ```

3. **Use appropriate utilities:**
   ```typescript
   import {specificFeatureOperation} from '../Utils/featureUtils';

   // Perform multi-agent operations
   await specificFeatureOperation(agent1Page, agent2Page, /* ... */);
   ```

4. **Multi-agent test best practices:**
   - Choose appropriate setup method based on test requirements
   - Create feature-specific utility modules for reusable operations
   - Clean up all agents at test end
   - Adjust timeouts only when justified by actual operation requirements (not as a band-aid for flaky tests)
   - Investigate root causes of failures before increasing timeouts

---

## TestManager Convenience Methods

Primary setup helpers in `playwright/test-manager.ts`:

### Standard Setup Methods
- `setup` - Universal setup method (orchestrator for all setup scenarios)
- `basicSetup`
- `setupForStationLogin`
- `setupForIncomingTaskDesktop`
- `setupForIncomingTaskExtension`
- `setupForIncomingTaskMultiSession`
- `setupForAdvancedTaskControls`
- `setupForAdvancedCombinations`
- `setupForDialNumber`
- `setupMultiSessionPage`

### Multi-Agent Setup Methods
- `setupFourAgentsAndCaller` - Sets up 4 agents + caller for multi-party scenarios
- `setupForConferenceDesktop` - Multi-agent desktop setup for complex scenarios
- **Note:** Add new setup methods as needed for different test scenarios

### Cleanup Methods
- `softCleanup` - Lightweight cleanup for scenarios requiring partial state preservation
- `cleanup` - Full teardown, logout, and context cleanup

**Recommendation:** Always use existing convenience methods before introducing custom setup logic. If a pattern is reused across multiple tests, extract it into a new convenience method.

---

## Universal Setup Method

The `setup()` method is the foundation for all convenience methods. It accepts a config object:

```typescript
interface SetupConfig {
  needsAgent1?: boolean;          // Enable Agent1 page/context
  needsAgent2?: boolean;          // Enable Agent2 page/context
  needsAgent3?: boolean;          // Enable Agent3 page/context (for 3+ agent scenarios)
  needsAgent4?: boolean;          // Enable Agent4 page/context (for 4 agent scenarios)
  needsCaller?: boolean;          // Enable caller page/context
  needsExtension?: boolean;       // Enable extension page/context
  needsChat?: boolean;            // Enable chat page/context
  needsMultiSession?: boolean;    // Enable multi-session page/context
  agent1LoginMode?: LoginMode;    // Login mode for Agent1 (desktop/extension/dial-number)
  enableConsoleLogging?: boolean; // Enable console log capture
  enableAdvancedLogging?: boolean;// Enable detailed operation logging
  needDialNumberLogin?: boolean;  // Enable dial-number specific login flow
}
```

All convenience methods (`basicSetup`, `setupForAdvancedTaskControls`, `setupForConferenceDesktop`, etc.) internally call `setup()` with pre-configured options.

### Multi-Agent Support

TestManager supports **1-4 simultaneous agents** depending on test requirements:
- `needsAgent1: true` - Always required (primary agent)
- `needsAgent2: true` - For 2-agent scenarios (consult, transfer, multi-session)
- `needsAgent3: true` - For 3-agent scenarios (advanced multi-party operations)
- `needsAgent4: true` - For 4-agent scenarios (complex multi-party operations)

Access agent pages via:
- `testManager.agent1Page`, `testManager.agent1Context`
- `testManager.agent2Page`, `testManager.agent2Context`
- `testManager.agent3Page`, `testManager.agent3Context`
- `testManager.agent4Page`, `testManager.agent4Context`

---

## Key Utility Modules

| Module                              | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `Utils/initUtils.ts`                | Initialization and page setup                |
| `Utils/stationLoginUtils.ts`        | Station login flows                          |
| `Utils/userStateUtils.ts`           | User state management                        |
| `Utils/incomingTaskUtils.ts`        | Incoming task operations                     |
| `Utils/taskControlUtils.ts`         | Task control operations                      |
| `Utils/advancedTaskControlUtils.ts` | Advanced task controls                       |
| `Utils/helperUtils.ts`              | Helper functions                             |
| `Utils/wrapupUtils.ts`              | Wrapup operations                            |
| `Utils/conferenceUtils.ts`          | Multi-agent coordination operations          |
| `Utils/<feature>Utils.ts`           | Feature-specific operations (add as needed)  |

**Guideline:** Create new utility modules for reusable operations. Keep utilities focused on specific features or flows.

---

## Environment Prerequisites

Common env keys used by the framework:

### Base Environment
- `PW_SANDBOX` - Sandbox environment identifier
- `PW_SANDBOX_PASSWORD` - Sandbox password for OAuth
- `PW_CHAT_URL` - Base URL for chat widget testing

### Test Set Entry Points
- `PW_ENTRY_POINT1..PW_ENTRY_POINTN` - Entry point per test set (one for each SET_X defined in test-data.ts)
- **Pattern:** Each new test set requires a corresponding `PW_ENTRY_POINTX` environment variable

### Dial Number Login (Optional)
- `PW_DIAL_NUMBER_LOGIN_USERNAME` - Username for dial-number login flow
- `PW_DIAL_NUMBER_LOGIN_PASSWORD` - Password for dial-number login flow
- `DIAL_NUMBER_LOGIN_ACCESS_TOKEN` - OAuth token for dial-number login (auto-generated)

### Auto-Generated Tokens
`playwright/global.setup.ts` expands set-scoped env keys and writes access tokens into `.env`:

**2-agent sets:**
- `<SET>_AGENT1_ACCESS_TOKEN`
- `<SET>_AGENT2_ACCESS_TOKEN`

**3-agent sets:**
- `<SET>_AGENT1_ACCESS_TOKEN`
- `<SET>_AGENT2_ACCESS_TOKEN`
- `<SET>_AGENT3_ACCESS_TOKEN`

**4-agent sets:**
- `<SET>_AGENT1_ACCESS_TOKEN`
- `<SET>_AGENT2_ACCESS_TOKEN`
- `<SET>_AGENT3_ACCESS_TOKEN`
- `<SET>_AGENT4_ACCESS_TOKEN`

The OAuth setup dynamically generates tokens based on the number of agents defined in each set's `AGENTS` configuration in `test-data.ts`.

---

## Test Development Guidelines

### Root Cause Analysis Over Symptomatic Fixes

When tests fail or become flaky:

1. **Investigate first, fix later**
   - Understand WHY the test is failing before applying fixes
   - Check console logs, network traces, and application state
   - Reproduce the failure locally if possible

2. **Avoid timeout band-aids**
   - Increasing timeouts should be a LAST resort, not a first response
   - Timeouts mask underlying issues (race conditions, slow operations, incorrect selectors)
   - Document the specific operation that requires the timeout and why

3. **Fix the root cause**
   - Race conditions → Add proper state checks or wait for specific conditions
   - Slow operations → Optimize the operation or add progress indicators
   - Flaky selectors → Use more stable selectors or add data-testid attributes
   - State leakage → Improve cleanup between tests

### Requirements Gathering and Planning

1. **Use questionnaire-driven approach**
   - Ask clarifying questions BEFORE implementation
   - Understand the full scope: what agents, what flows, what validations
   - Identify edge cases and error scenarios upfront

2. **Example questions to ask:**
   - How many agents are involved?
   - What is the expected user flow?
   - What validations are required?
   - What are the failure/error scenarios to test?
   - Are there specific entry points or environment requirements?
   - What cleanup is needed between tests?

### Implementation Best Practices

1. **No lazy reasoning**
   - Don't assume "it probably works this way" - verify by reading code or testing
   - Don't copy-paste patterns without understanding them
   - Don't skip edge cases or error handling

2. **Reusable code**
   - Extract common patterns into utility modules
   - Create new TestManager convenience methods for repeated setup patterns
   - Update constants.ts for new shared values

3. **Timeout justification**
   - Default timeouts should be sufficient for most operations
   - If increasing timeout: document WHY this specific operation needs more time
   - Prefer operation-specific timeouts over global timeout increases
   - Example GOOD reason: "Widget initialization requires loading external config (observed 15-20s in production)"
   - Example BAD reason: "Test was flaky, increased timeout to make it pass"

4. **Test isolation**
   - Each test should be independently runnable
   - Clean up state after each test
   - Don't rely on test execution order

### Adding New Features

When adding new test capabilities (new scenarios, agents, flows):

1. **Follow existing patterns**
   - Study how similar features are implemented
   - Use the same architectural patterns (factory pattern, TestManager, utilities)
   - Keep naming conventions consistent

2. **Update all relevant files**
   - Add new sets to `test-data.ts` if needed
   - Create utility modules for new operations
   - Add convenience methods to TestManager if pattern is reusable
   - Update constants.ts for new shared values
   - Document new patterns in ai-docs

3. **Make it generic and reusable**
   - Avoid hardcoding values
   - Parameterize operations for different scenarios
   - Think about how others might use this capability

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

_Last Updated: 2026-03-04_
