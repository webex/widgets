# Playwright E2E Testing Framework

E2E testing framework for CC Widgets with **dynamic** parallel test execution. Test sets are automatically configured based on `test-data.ts`.

## 📁 Structure

```
playwright/
├── suites/                                    # Test suite orchestration files
│   ├── digital-incoming-task-tests.spec.ts   # Digital incoming task orchestration
│   ├── task-list-multi-session-tests.spec.ts # Task list and multi-session orchestration
│   ├── station-login-user-state-tests.spec.ts # Station login and user state orchestration
│   ├── basic-advanced-task-controls-tests.spec.ts # Basic and advanced task controls orchestration
│   ├── advanced-task-controls-tests.spec.ts  # Advanced task controls orchestration
│   ├── conference-tests1.spec.ts             # Conference 3-4 party tests
│   ├── conference-tests2.spec.ts             # Advanced conference tests
│   └── conference-tests3.spec.ts             # Conference scenario tests
├── tests/                                     # Individual test implementations
│   ├── conference-set7-tests.spec.ts         # Conference test implementations (SET_7)
│   ├── conference-set8-tests.spec.ts         # Conference test implementations (SET_8)
│   └── conference-set9-tests.spec.ts         # Conference test implementations (SET_9)
├── Utils/                                     # Utility functions
│   ├── conferenceUtils.ts                    # Conference management utilities (new)
│   ├── taskControlUtils.ts                   # Task control utilities
│   ├── userStateUtils.ts                     # User state utilities
│   └── ... (other utilities)
├── test-data.ts                              # **CENTRAL CONFIG** - Test data & suite mapping
├── test-manager.ts                           # Core test management (now supports 4 agents)
└── constants.ts                              # Shared constants
```

## 🎯 Dynamic Test Configuration

**All test configuration is now centralized in `test-data.ts`**. The framework automatically:

- ✅ Generates test projects from `USER_SETS`
- ✅ Sets worker count dynamically (capped at 6)
- ✅ Assigns unique debug ports (9221+)
- ✅ Positions browser windows automatically
- ✅ Maps test suites to user sets

| Set       | Focus                             | Port | Suite File                                   | Agents |
| --------- | --------------------------------- | ---- | -------------------------------------------- | ------ |
| **SET_1** | Digital incoming tasks & controls | 9221 | `digital-incoming-task-tests.spec.ts`        | 2      |
| **SET_2** | Task lists & multi-session        | 9222 | `task-list-multi-session-tests.spec.ts`      | 2      |
| **SET_3** | Authentication & user management  | 9223 | `station-login-user-state-tests.spec.ts`     | 2      |
| **SET_4** | Task controls & combinations      | 9224 | `basic-advanced-task-controls-tests.spec.ts` | 2      |
| **SET_5** | Advanced task operations          | 9225 | `advanced-task-controls-tests.spec.ts`       | 2      |
| **SET_6** | Dial number operations            | 9226 | `dial-number-tests.spec.ts`                  | 2      |
| **SET_7** | Multi-agent scenarios             | 9227 | `conference-tests1.spec.ts`                  | 4      |
| **SET_8** | Multi-agent scenarios             | 9228 | `conference-tests2.spec.ts`                  | 4      |
| **SET_9** | Multi-agent scenarios             | 9229 | `conference-tests3.spec.ts`                  | 4      |

### Where to Add New Tests?

| Test Type                       | Use Set     | Why                         |
| ------------------------------- | ----------- | --------------------------- |
| Digital channels tasks          | SET_1       | Digital channels configured |
| Task list operations            | SET_2       | Task list focus             |
| Authentication/User states      | SET_3       | User management             |
| Basic/Advanced task controls    | SET_4       | Task control operations     |
| Complex advanced scenarios      | SET_5       | Advanced operations         |
| Dial number/telephony           | SET_6       | Dial operations             |
| Multi-agent scenarios (3-4)     | SET_7, 8, 9 | 4-agent test capability     |
| New feature/scenario            | Create new  | Add SET_X in test-data.ts   |

## 🧪 Adding New Tests

### 1. Create Test File (in `tests/` folder)

```typescript
// tests/my-feature-test.spec.ts
import {test, Page} from '@playwright/test';
import {TestManager} from '../test-manager';

export default function createMyTests() {
  return () => {
    let testManager: TestManager;
    let page: Page;

    test.beforeEach(async ({browser}, testInfo) => {
      testManager = new TestManager(testInfo.project.name);
      await testManager.setup(browser, {
        needsAgent1: true,
        enableConsoleLogging: true,
      });
      page = testManager.agent1Page;
    });

    test.afterEach(async () => {
      await testManager.cleanup();
    });

    test('should test my feature @myfeature', async () => {
      // Your test code
    });
  };
}
```

### 2. Add to Test Set

```typescript
// suites/advanced-task-controls-tests.spec.ts (choose appropriate set)
import createMyTests from '../tests/my-feature-test.spec';

test.describe('My Feature Tests', createMyTests());
```

## 🎭 Multi-Agent Tests

The framework supports **1-4 agent scenarios** for testing complex multi-party interactions.

### Key Capabilities

- ✅ **Flexible agent count**: 1-4 simultaneous agents (Agent1, Agent2, Agent3, Agent4)
- ✅ **Multi-agent coordination**: Test scenarios requiring multiple participants
- ✅ **Complex flows**: Consult, transfer, conference, and other multi-party operations
- ✅ **Agent isolation**: Each agent has independent browser context and page

### Example: Multi-Agent Test

```typescript
import {test} from '@playwright/test';
import {TestManager} from '../test-manager';
import {performMultiAgentOperation} from '../Utils/featureUtils';

export default function createMultiAgentTests() {
  return () => {
    let testManager: TestManager;

    test.beforeEach(async ({browser}, testInfo) => {
      testManager = new TestManager(testInfo.project.name);
      // Configure based on test requirements
      await testManager.setup(browser, {
        needsAgent1: true,
        needsAgent2: true,
        needsAgent3: true,  // Optional: for 3+ agent scenarios
        needsAgent4: true,  // Optional: for 4 agent scenarios
        needsCaller: true,
        enableConsoleLogging: true,
      });
    });

    test.afterEach(async () => {
      await testManager.cleanup();
    });

    test('should perform multi-agent operation', async () => {
      // Access agent pages as needed
      const agent1Page = testManager.agent1Page;
      const agent2Page = testManager.agent2Page;
      const agent3Page = testManager.agent3Page;
      const agent4Page = testManager.agent4Page;

      // Perform multi-agent operations
      await performMultiAgentOperation(
        agent1Page,
        agent2Page,
        agent3Page,
        agent4Page,
        testManager.callerPage,
        testManager.projectName
      );

      // Add assertions...
    });
  };
}
```

### Multi-Agent Test Sets

| Set       | Agents | Focus                          | Test File                   |
| --------- | ------ | ------------------------------ | --------------------------- |
| **SET_7** | 4      | Multi-agent scenarios          | `conference-tests1.spec.ts` |
| **SET_8** | 4      | Multi-agent scenarios          | `conference-tests2.spec.ts` |
| **SET_9** | 4      | Multi-agent scenarios          | `conference-tests3.spec.ts` |

**Note:** Create additional sets as needed for different multi-agent scenarios.

## ➕ Adding New Test Set (Fully Automated)

### 1. Add to `test-data.ts`

```typescript
// test-data.ts - Just add your new set here!
export const USER_SETS = {
  // ... existing sets (SET_1 through SET_9)
  SET_10: {
    AGENTS: {
      AGENT1: {username: 'user37', extension: '1037', agentName: 'User37 Agent37'},
      AGENT2: {username: 'user38', extension: '1038', agentName: 'User38 Agent38'},
    },
    QUEUE_NAME: 'Queue e2e 10',
    CHAT_URL: `${env.PW_CHAT_URL}-e2e-10.html`,
    EMAIL_ENTRY_POINT: `${env.PW_SANDBOX}.e2e10@gmail.com`,
    ENTRY_POINT: env.PW_ENTRY_POINT10,
    TEST_SUITE: 'my-new-feature-tests.spec.ts', // 🎯 Key: maps to your test file
  },
};
```

### 2. Create Test Suite File

```typescript
// suites/my-new-feature-tests.spec.ts
import {test} from '@playwright/test';
import createMyTests from '../tests/my-feature-test.spec';

test.describe('My New Feature Tests', createMyTests());
```

**That's it!** The framework will automatically:

- ✅ Add `SET_10` as a new project
- ✅ Assign debug port `9230` (9221 + 9)
- ✅ Position browser at `11700,0` (9 × 1300)
- ✅ Map to `my-new-feature-tests.spec.ts`
- ✅ Workers capped at 6 (resource management)

### 3. ~~Manual Project Config~~ ❌ **NO LONGER NEEDED!**

~~The old manual approach of editing `playwright.config.ts` is eliminated.~~

## 🔧 Key Utilities

| Module              | Key Functions                                                             |
| ------------------- | ------------------------------------------------------------------------- |
| `incomingTaskUtils` | `createChatTask()`, `acceptIncomingTask()`, `endChatTask()`               |
| `taskControlUtils`  | `holdTask()`, `resumeTask()`, `endTask()`                                 |
| `userStateUtils`    | `changeUserState()`, `verifyCurrentState()`                               |
| `stationLoginUtils` | `telephonyLogin()`, `stationLogout()`                                     |
| `conferenceUtils`   | Multi-agent coordination operations (`createConferenceA1A2()`, `startConsult()`, etc.) |

### Common Usage

```typescript
// Task management
await createChatTask(page, 'Customer message');
await acceptIncomingTask(page);
await endTask(page);

// State management
await changeUserState(page, USER_STATES.AVAILABLE);
await verifyCurrentState(page, USER_STATES.AVAILABLE);

// Multi-agent setup (for tests requiring 3-4 agents)
await testManager.setup(browser, {
  needsAgent1: true,
  needsAgent2: true,
  needsAgent3: true,  // Optional: for 3+ agent scenarios
  needsAgent4: true,  // Optional: for 4 agent scenarios
  enableConsoleLogging: true,
});

// Access multiple agents
const agent1Page = testManager.agent1Page;
const agent2Page = testManager.agent2Page;
const agent3Page = testManager.agent3Page;
const agent4Page = testManager.agent4Page;
```

## 📊 Environment Setup

Create `.env` file in project root:

```env
PW_CHAT_URL=https://your-chat-url
PW_SANDBOX=your-sandbox-name
PW_ENTRY_POINT1=entry-point-1
PW_ENTRY_POINT2=entry-point-2
PW_ENTRY_POINT3=entry-point-3
PW_ENTRY_POINT4=entry-point-4
PW_ENTRY_POINT5=entry-point-5
PW_ENTRY_POINT6=entry-point-6
PW_ENTRY_POINT7=entry-point-7
PW_ENTRY_POINT8=entry-point-8
PW_ENTRY_POINT9=entry-point-9

# OAuth tokens (auto-generated by global.setup.ts)
# SET_X_AGENT1_ACCESS_TOKEN, SET_X_AGENT2_ACCESS_TOKEN
# For 3-4 agent scenarios:
# SET_X_AGENT3_ACCESS_TOKEN, SET_X_AGENT4_ACCESS_TOKEN (if needed)
```

Test data is automatically handled by TestManager based on the running test set.

## 🚀 Running Tests

```bash
# Run all tests (workers auto-calculated and capped at 6)
yarn test:e2e

# Run specific test suites
yarn test:e2e suites/digital-incoming-task-tests.spec.ts
yarn test:e2e suites/task-list-multi-session-tests.spec.ts
yarn test:e2e suites/station-login-user-state-tests.spec.ts
yarn test:e2e suites/basic-advanced-task-controls-tests.spec.ts
yarn test:e2e suites/advanced-task-controls-tests.spec.ts
yarn test:e2e suites/conference-tests1.spec.ts
yarn test:e2e suites/conference-tests2.spec.ts
yarn test:e2e suites/conference-tests3.spec.ts

# Run specific test sets (projects) - names match USER_SETS keys
yarn test:e2e --project=SET_1         # Digital incoming tasks
yarn test:e2e --project=SET_2         # Task list & multi-session
yarn test:e2e --project=SET_3         # Station login & user state
yarn test:e2e --project=SET_4         # Basic & advanced task controls
yarn test:e2e --project=SET_5         # Advanced task controls
yarn test:e2e --project=SET_6         # Dial number operations
yarn test:e2e --project=SET_7         # Multi-agent scenarios
yarn test:e2e --project=SET_8         # Multi-agent scenarios
yarn test:e2e --project=SET_9         # Multi-agent scenarios

# Development & debugging
yarn test:e2e --ui                    # UI mode
yarn test:e2e --debug                 # Debug mode
yarn test:e2e --headed                # Run with browser visible
```

## 🏗️ Architecture Benefits

### Before (Manual)

- ❌ Manual project configuration in `playwright.config.ts`
- ❌ Hard-coded worker count
- ❌ Manual port/position assignment
- ❌ Separate mapping files
- ❌ Error-prone when adding new sets

### After (Dynamic)

- ✅ **Single source of truth**: `test-data.ts`
- ✅ **Auto-scaling workers**: `Math.min(6, Object.keys(USER_SETS).length)`
- ✅ **Auto port assignment**: `9221 + index`
- ✅ **Auto positioning**: `index * 1300, 0`
- ✅ **Zero manual config**: Just add to `USER_SETS`
- ✅ **Type-safe**: Full TypeScript support

## 🔍 Troubleshooting

**Common Issues:**

- Browser launch fails → Check Chrome and ports 9221+ (auto-assigned)
- Auth errors → Verify OAuth in `global.setup.ts`
- Widget timeouts → Investigate root cause first (network issues, slow operations, race conditions). Only increase `WIDGET_INIT_TIMEOUT` if justified by actual operation requirements.
- Test conflicts → Ports/positions are auto-managed per `USER_SETS`
- New set not appearing → Check `TEST_SUITE` property in `test-data.ts`
- Flaky tests → Check console logs, add proper state checks, ensure cleanup is complete. Don't use timeout increases as a band-aid.

**Debug logging:**

```typescript
// Add to test setup
capturedLogs = [];
page.on('console', (msg) => capturedLogs.push(msg.text()));
```

## 🎛️ Configuration Reference

### Current Dynamic Setup

```typescript
// playwright.config.ts - Auto-generated projects
timeout: 420000, // 7 minutes (global timeout for complex multi-agent scenarios)
workers: Math.min(6, Object.keys(USER_SETS).length), // Capped at 6 for resource management
retries: 0, // No retries (for accurate flaky test detection)

// Auto-generated per USER_SETS entry:
projects: [
  // ... OAuth setup
  ...Object.entries(USER_SETS).map(([setName, setData], index) => ({
    name: setName,                              // SET_1, SET_2, etc.
    testMatch: [`**/suites/${setData.TEST_SUITE}`], // From test-data.ts
    debugPort: 9221 + index,                    // 9221, 9222, 9223...
    windowPosition: `${index * 1300},0`,        // 0,0  1300,0  2600,0...
  }))
]
```

### test-data.ts Structure

```typescript
export const USER_SETS = {
  SET_X: {
    // Agent configuration
    AGENTS: { AGENT1: {...}, AGENT2: {...} },

    // Environment configuration
    QUEUE_NAME: 'Queue e2e X',
    CHAT_URL: '...',
    EMAIL_ENTRY_POINT: '...',
    ENTRY_POINT: '...',

    // 🎯 NEW: Test suite mapping
    TEST_SUITE: 'your-test-file.spec.ts', // Links to suite file
  }
};
```
