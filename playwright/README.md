# Playwright E2E Testing Framework

E2E testing framework for CC Widgets with parallel test execution across 5 test sets.

## 📁 Structure

```
playwright/
├── set1-tests.spec.ts to set5-tests.spec.ts  # Test set orchestration
├── tests/                                     # Individual test implementations
├── Utils/                                     # Utility functions
├── test-data.ts                              # Test data per set
├── test-manager.ts                           # Core test management
└── constants.ts                              # Shared constants
```

## 🎯 Test Sets

| Set       | Focus                            | Port | Tests                                      |
| --------- | -------------------------------- | ---- | ------------------------------------------ |
| **SET_1** | Digital channels & multi-session | 9221 | Digital incoming, Multi-session, Task list |
| **SET_2** | Advanced task operations         | 9222 | Advanced combinations, Complex controls    |
| **SET_3** | Basic operations & telephony     | 9223 | Basic controls, Telephony tasks            |
| **SET_4** | User management & authentication | 9224 | User states, Station login                 |
| **SET_5** | Extended scenarios               | 9225 | Available for new tests                    |

### Where to Add New Tests?

| Test Type                     | Use Set | Why                         |
| ----------------------------- | ------- | --------------------------- |
| Chat/Email tasks              | SET_1   | Digital channels configured |
| Voice/Phone calls             | SET_3   | Telephony focus             |
| Complex transfers/conferences | SET_2   | Advanced operations         |
| Agent state changes           | SET_4   | User management             |
| New features                  | SET_5   | Available capacity          |

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

    test.beforeEach(async ({browser}) => {
      testManager = new TestManager(browser);
      const setup = await testManager.setupTest({
        needsAgent1: true,
        enableConsoleLogging: true,
      });
      page = setup.page;
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
// set5-tests.spec.ts (choose appropriate set)
import createMyTests from './tests/my-feature-test.spec';

test.describe('My Feature Tests', createMyTests());
```

### 3. Add New Test Set to Project Config (if needed)

```typescript
// playwright.config.ts
{
  name: 'SET_6',
  dependencies: ['OAuth: Get Access Token'],
  fullyParallel: false,
  retries: 1,
  testMatch: ['**/set6-tests.spec.ts'],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    launchOptions: {
      args: [
        `--remote-debugging-port=9226`,  // Unique port
        `--window-position=6500,0`,      // Unique position
        `--window-size=1280,720`,
        // ... other Chrome flags
      ],
    },
  },
}
```

### 4. Add Test Data (if new set)

```typescript
// test-data.ts
SET_6: {
  AGENTS: {
    AGENT1: { username: 'user27', extension: '1027', agentName: 'User27 Agent27' },
    AGENT2: { username: 'user28', extension: '1028', agentName: 'User28 Agent28' },
  },
  QUEUE_NAME: 'Queue e2e 6',
  CHAT_URL: `${env.PW_CHAT_URL}-e2e-6.html`,
  EMAIL_ENTRY_POINT: `${env.PW_SANDBOX}.e2e6@gmail.com`,
  ENTRY_POINT: env.PW_ENTRY_POINT6,
},
```

## 🔧 Key Utilities

| Module              | Key Functions                                               |
| ------------------- | ----------------------------------------------------------- |
| `incomingTaskUtils` | `createChatTask()`, `acceptIncomingTask()`, `endChatTask()` |
| `taskControlUtils`  | `holdTask()`, `resumeTask()`, `endTask()`                   |
| `userStateUtils`    | `changeUserState()`, `verifyCurrentState()`                 |
| `stationLoginUtils` | `telephonyLogin()`, `stationLogout()`                       |

### Common Usage

```typescript
// Task management
await createChatTask(page, 'Customer message');
await acceptIncomingTask(page);
await endTask(page);

// State management
await changeUserState(page, USER_STATES.AVAILABLE);
await verifyCurrentState(page, USER_STATES.AVAILABLE);
```

## 📊 Environment Setup

Create `.env` file in project root:

```env
PW_CHAT_URL=https://your-chat-url
PW_SANDBOX=your-sandbox-name
PW_ENTRY_POINT1=entry-point-1
PW_ENTRY_POINT2=entry-point-2
# ... PW_ENTRY_POINT3, 4, 5
```

Test data is automatically handled by TestManager based on the running test set.

## 🚀 Running Tests

```bash
# Basic commands
npx playwright test                    # All tests
npx playwright test --project=SET_1   # Specific set
npx playwright test --ui               # UI mode
npx playwright test --debug            # Debug mode

# Filter by tags
npx playwright test --grep "@chat"     # Chat tests only
npx playwright test --grep "@telephony" # Voice tests only
```

## 🔍 Troubleshooting

**Common Issues:**

- Browser launch fails → Check Chrome and ports 9221-9225
- Auth errors → Verify OAuth in `global.setup.ts`
- Widget timeouts → Increase `WIDGET_INIT_TIMEOUT`
- Test conflicts → Check unique ports/window positions

**Debug logging:**

```typescript
// Add to test setup
capturedLogs = [];
page.on('console', (msg) => capturedLogs.push(msg.text()));
```
