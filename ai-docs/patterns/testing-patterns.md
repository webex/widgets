# Testing Patterns

---
Technology: Jest + Playwright
Configuration: See [jest.config.js](../../jest.config.js) and [playwright.config.ts](../../playwright.config.ts)
Dependencies: See [package.json](../../packages/contact-center/*/package.json) files for versions
Scope: Repository-wide
Last Updated: 2025-11-23
---

> **For LLM Agents**: Add this file to context when working on tests, mocking, or test infrastructure.
>
> **For Developers**: Update this file when committing testing pattern changes.

---

## Summary

The codebase uses **Jest** for unit/integration tests and **Playwright** for E2E tests. Jest tests follow a consistent pattern: mock the store, spy on hooks, test component rendering and error boundaries. Playwright tests use a **TestManager** class for multi-agent/multi-session scenarios with real backend integration. All tests emphasize `data-testid` attributes for reliable selectors.

---

## Testing Stack

### **Unit/Integration Tests**
- **Framework:** Jest 29.7.0
- **Testing Library:** @testing-library/react 16.0.1, @testing-library/jest-dom 6.6.2
- **Environment:** jsdom
- **Coverage:** Jest built-in coverage

### **E2E Tests**
- **Framework:** Playwright (@playwright/test)
- **Browser:** Chrome (Desktop)
- **Parallelization:** One worker per user set (multi-agent support)
- **Retry:** 1 retry for suite tests
- **Reporter:** HTML reporter

---

## Jest Configuration

### **Root Configuration**

**File:** `jest.config.js`

```javascript
module.exports = {
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'babel-jest',
  },
  testEnvironment: 'jsdom',
  testMatch: ['**/tooling/tests/**/*.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@momentum-design/components|@momentum-ui/react-collaboration|@lit|lit|cheerio|react-error-boundary))',
  ],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '\\.[jt]s?$': 'babel-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
};
```

**Key points:**
- **jsdom environment** - simulates browser DOM
- **CSS mocking** - CSS files transformed with babel-jest
- **Transform ignore patterns** - includes specific node_modules packages
- **Babel transform** - for JSX and TS files

---

### **Package-Level Configuration**

**Pattern:** Each package extends root config

```javascript
// station-login/jest.config.js
const jestConfig = require('../../../jest.config.js');

jestConfig.rootDir = '../../../';
jestConfig.testMatch = ['**/station-login/tests/**/*.ts', '**/station-login/tests/**/*.tsx'];

module.exports = jestConfig;
```

**Convention:** Override `rootDir` and `testMatch` for each package.

---

## Jest Test Patterns

### **1. Widget Component Test Pattern**

**File structure:**
```
packages/contact-center/station-login/
├── src/
│   ├── station-login/index.tsx
│   └── helper.ts
└── tests/
    └── station-login/index.tsx
```

**Standard widget test:**
```typescript
import React from 'react';
import {render} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';
import store from '@webex/cc-store';

// 1. Mock store
jest.mock('@webex/cc-store', () => {
  const originalStore = jest.requireActual('@webex/cc-store');

  return {
    ...originalStore,
    cc: {
      on: () => {},
      off: () => {},
    },
    teams: ['team123', 'team456'],
    loginOptions: ['EXTENSION', 'AGENT_DN', 'BROWSER'],
    deviceType: 'BROWSER',
    dialNumber: '12345',
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
    isAgentLoggedIn: false,
    setCCCallback: jest.fn(),
    onErrorCallback: jest.fn(),
  };
});

describe('StationLogin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 2. Test component renders with correct props
  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');
    const loginCb = jest.fn();

    render(<StationLogin onLogin={loginCb} profileMode={false} />);

    expect(useStationLoginSpy).toHaveBeenCalledWith({
      cc: expect.any(Object),
      onLogin: loginCb,
      logger: expect.any(Object),
      deviceType: 'BROWSER',
      dialNumber: '12345',
      isAgentLoggedIn: false,
    });
  });

  // 3. Test ErrorBoundary
  describe('ErrorBoundary Tests', () => {
    it('should render empty fragment when ErrorBoundary catches an error', () => {
      const mockOnErrorCallback = jest.fn();
      store.onErrorCallback = mockOnErrorCallback;

      jest.spyOn(helper, 'useStationLogin').mockImplementation(() => {
        throw new Error('Test error in useStationLogin');
      });

      const {container} = render(<StationLogin profileMode={false} />);

      expect(container.firstChild).toBeNull();
      expect(store.onErrorCallback).toHaveBeenCalledWith(
        'StationLogin', 
        Error('Test error in useStationLogin')
      );
    });
  });
});
```

**Pattern breakdown:**
1. **Mock store** - Use `jest.mock()` to mock `@webex/cc-store`
2. **Spy on hooks** - Use `jest.spyOn(helper, 'useHook')` to verify calls
3. **Suppress console.error** - Prevent ErrorBoundary errors from cluttering output
4. **Test render** - Verify component renders and hook called with correct props
5. **Test ErrorBoundary** - Mock hook to throw, verify fallback and callback

---

### **2. Store Mock Pattern**

**Full mock with spread:**
```typescript
jest.mock('@webex/cc-store', () => {
  const originalStore = jest.requireActual('@webex/cc-store');

  return {
    ...originalStore,  // Spread original for types/constants
    cc: {
      on: jest.fn(),
      off: jest.fn(),
    },
    idleCodes: [],
    agentId: 'testAgentId',
    logger: {
      log: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
    currentState: '0',
    customState: null,
    onErrorCallback: jest.fn(),
  };
});
```

**Benefits:**
- Preserves original types/enums
- Overrides runtime values
- Consistent across tests

---

### **3. Web Worker Mock Pattern**

```typescript
describe('UserState Component', () => {
  let workerMock;

  beforeEach(() => {
    workerMock = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    };

    global.Worker = jest.fn(() => workerMock);
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost:3000/12345');

    if (typeof window.HTMLElement.prototype.attachInternals !== 'function') {
      window.HTMLElement.prototype.attachInternals = jest.fn();
    }
  });

  it('renders UserStateComponent with correct props', () => {
    const useUserStateSpy = jest.spyOn(helper, 'useUserState');
    render(<UserState onStateChange={onStateChange} />);
    expect(useUserStateSpy).toHaveBeenCalledTimes(1);
  });
});
```

**Pattern:**
- Mock `Worker` constructor
- Mock `URL.createObjectURL`
- Mock `HTMLElement.prototype.attachInternals` (for Web Components)

---

### **4. Store Unit Test Pattern**

**Testing the store itself:**
```typescript
import {makeAutoObservable} from 'mobx';
import Webex from '@webex/contact-center';
import store from '../src/store';
import {mockProfile} from '@webex/test-fixtures';

jest.mock('mobx', () => ({
  makeAutoObservable: jest.fn(),
  observable: {ref: jest.fn()},
}));

jest.mock('@webex/contact-center', () => ({
  init: jest.fn(() => ({
    once: jest.fn((event, callback) => {
      if (event === 'ready') {
        callback();
      }
    }),
    cc: {
      register: jest.fn().mockResolvedValue(mockProfile),
      LoggerProxy: {
        error: jest.fn(),
        log: jest.fn(),
      },
    },
  })),
}));

describe('Store', () => {
  let storeInstance;
  let mockWebex;

  beforeEach(() => {
    storeInstance = store.getInstance();
    mockWebex = Webex.init({
      config: {anyConfig: true},
      credentials: {access_token: 'fake_token'},
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    expect(storeInstance.teams).toEqual([]);
    expect(storeInstance.isAgentLoggedIn).toBe(false);
    expect(makeAutoObservable).toHaveBeenCalledWith(storeInstance, {
      cc: expect.any(Function),
    });
  });

  describe('registerCC', () => {
    it('should initialise store values on successful register', async () => {
      const mockResponse = {
        teams: [{id: 'team1', name: 'Team 1'}],
        agentId: 'agent1',
        isAgentLoggedIn: true,
      };
      mockWebex.cc.register.mockResolvedValue(mockResponse);

      await storeInstance.registerCC(mockWebex);

      expect(storeInstance.teams).toEqual(mockResponse.teams);
      expect(storeInstance.agentId).toEqual(mockResponse.agentId);
    });
  });
});
```

**Pattern:**
- Mock MobX
- Mock Webex SDK
- Use fake timers for async tests
- Test initial state and mutations

---

## Playwright Configuration

### **Configuration File**

**File:** `playwright.config.ts`

```typescript
import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';
import {USER_SETS} from './playwright/test-data';

dotenv.config({path: path.resolve(__dirname, '.env')});

export default defineConfig({
  testDir: './playwright',
  timeout: 180000,
  webServer: {
    command: 'yarn workspace samples-cc-react-app serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  retries: 0,
  fullyParallel: true,
  workers: Object.keys(USER_SETS).length, // Dynamic worker count
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'OAuth: Get Access Token',
      testMatch: /global\.setup\.ts/,
    },
    // Dynamic test projects from USER_SETS
    ...Object.entries(USER_SETS).map(([setName, setData], index) => {
      return {
        name: setName,
        dependencies: ['OAuth: Get Access Token'],
        fullyParallel: false,
        retries: 1,
        testMatch: [`**/suites/${setData.TEST_SUITE}`],
        use: {
          ...devices['Desktop Chrome'],
          channel: 'chrome',
          launchOptions: {
            args: [
              `--use-fake-ui-for-media-stream`,
              `--use-fake-device-for-media-stream`,
              `--use-file-for-fake-audio-capture=${dummyAudioPath}`,
              `--remote-debugging-port=${9221 + index}`,
              `--window-position=${index * 1300},0`,
            ],
          },
        },
      };
    }),
  ],
});
```

**Key features:**
- **Dynamic projects** - One project per user set (multi-agent)
- **OAuth setup** - Global setup for token
- **Fake media** - Fake audio/video for WebRTC
- **Parallel workers** - One per user set
- **Remote debugging** - Different port per worker

---

## Playwright Test Patterns

### **1. TestManager Pattern**

```typescript
import {TestManager} from '../test-manager';

export default function createUserStateTests() {
  let testManager: TestManager;

  test.beforeAll(async ({browser}, testInfo) => {
    const projectName = testInfo.project.name;
    testManager = new TestManager(projectName);
    await testManager.basicSetup(browser);
    
    // Login agent
    await telephonyLogin(
      testManager.agent1Page,
      LOGIN_MODE.EXTENSION,
      process.env[`${testManager.projectName}_AGENT1_EXTENSION_NUMBER`]
    );
    
    await expect(testManager.agent1Page.getByTestId('state-select')).toBeVisible();
  });

  test.afterAll(async () => {
    if (testManager) {
      await testManager.cleanup();
    }
  });

  test('should verify initial state is Meeting', async () => {
    const state = await getCurrentState(testManager.agent1Page);
    if (state !== USER_STATES.MEETING) 
      throw new Error('Initial state is not Meeting');
  });
}
```

**TestManager responsibilities:**
- Browser/page management
- Multi-agent support
- Multi-session support
- Console log capture
- Environment variable access

---

### **2. Utility Function Pattern**

```typescript
// Utils/userStateUtils.ts
export async function getCurrentState(page: Page): Promise<string> {
  const stateElement = page.getByTestId('state-select');
  return await stateElement.innerText();
}

export async function changeUserState(page: Page, state: string) {
  await page.getByTestId('state-select').click();
  await page.getByTestId(`state-item-${state}`).click();
  await page.waitForTimeout(2000);
}

export async function verifyCurrentState(page: Page, expectedState: string) {
  const currentState = await getCurrentState(page);
  expect(currentState).toBe(expectedState);
}

export async function getStateElapsedTime(page: Page): Promise<string> {
  return await page.getByTestId('elapsed-time').innerText();
}
```

**Pattern:**
- Extract common actions to utilities
- Use `data-testid` for selectors
- Return values for assertions
- Encapsulate waits

---

### **3. Multi-Session Test Pattern**

```typescript
test('should test multi-session synchronization', async () => {
  // Create multi-session page
  if (!testManager.multiSessionAgent1Page) {
    if (!testManager.multiSessionContext) {
      testManager.multiSessionContext = await testManager.agent1Context.browser()!.newContext();
    }
    testManager.multiSessionAgent1Page = await testManager.multiSessionContext.newPage();
  }

  await testManager.setupMultiSessionPage();
  const multiSessionPage = testManager.multiSessionAgent1Page!;

  // Change state in first session
  await changeUserState(testManager.agent1Page, USER_STATES.MEETING);
  await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
  
  // Verify state synchronized in second session
  await multiSessionPage.waitForTimeout(3000);
  await verifyCurrentState(multiSessionPage, USER_STATES.MEETING);

  // Compare timers
  const [timer1, timer2] = await Promise.all([
    getStateElapsedTime(testManager.agent1Page),
    getStateElapsedTime(multiSessionPage),
  ]);

  const parseTimer = (timer: string) => {
    const parts = timer.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };
  
  expect(Math.abs(parseTimer(timer1) - parseTimer(timer2))).toBeLessThanOrEqual(2);
});
```

**Pattern:**
- Create second context/page for multi-session
- Perform action in first session
- Verify synchronization in second session
- Use `Promise.all` for parallel checks

---

### **4. Console Validation Pattern**

```typescript
export async function validateConsoleStateChange(
  page: Page,
  expectedState: string,
  consoleMessages: string[]
): Promise<boolean> {
  const found = consoleMessages.some(msg => 
    msg.includes('onStateChange called') && 
    msg.includes(expectedState)
  );
  return found;
}

export async function checkCallbackSequence(
  page: Page,
  state: string,
  consoleMessages: string[]
): Promise<boolean> {
  const callbackIndex = consoleMessages.findIndex(msg => 
    msg.includes('onStateChange called')
  );
  const apiSuccessIndex = consoleMessages.findIndex(msg => 
    msg.includes('Agent state set successfully')
  );
  
  return callbackIndex > -1 && 
         apiSuccessIndex > -1 && 
         callbackIndex > apiSuccessIndex;
}

// In TestManager
constructor(projectName: string) {
  this.consoleMessages = [];
  // Capture console logs in beforeAll
  this.agent1Page.on('console', msg => {
    this.consoleMessages.push(msg.text());
  });
}
```

**Pattern:**
- Capture console logs in TestManager
- Validate callback invocation
- Check event sequence
- Use for debugging and verification

---

## Test Data Patterns

### **data-testid Convention**

**Every interactive element has a `data-testid`:**
```typescript
// Component
<div className="user-state-container" data-testid="user-state-container">
  <SelectNext data-testid="state-select">
    <Item data-testid={`state-item-${item.name}`}>...</Item>
  </SelectNext>
  <span data-testid="elapsed-time">{formatTime(elapsedTime)}</span>
</div>

// Test
await page.getByTestId('state-select').click();
await page.getByTestId('state-item-Available').click();
const time = await page.getByTestId('elapsed-time').innerText();
```

**Naming convention:**
- Use kebab-case
- Descriptive, hierarchical names
- Include dynamic parts (e.g., `state-item-${name}`)

---

## Test Fixtures

### **Fixture Pattern**

**Location:** `packages/contact-center/test-fixtures/src/`

```typescript
// incomingTaskFixtures.ts
export const mockIncomingTask = {
  data: {
    interactionId: 'interaction123',
    interaction: {
      mediaType: 'telephony',
      state: 'connected',
    },
  },
  accept: jest.fn().mockResolvedValue({}),
  decline: jest.fn().mockResolvedValue({}),
  hold: jest.fn().mockResolvedValue({}),
  resume: jest.fn().mockResolvedValue({}),
  end: jest.fn().mockResolvedValue({}),
  on: jest.fn(),
  off: jest.fn(),
};

// taskListFixtures.ts
export const mockTaskList = {
  'interaction123': mockIncomingTask,
  'interaction456': {...},
};
```

**Usage:**
```typescript
import {mockIncomingTask} from '@webex/test-fixtures';

test('should accept task', () => {
  render(<IncomingTask incomingTask={mockIncomingTask} />);
  // ...
});
```

---

## Key Conventions to Enforce

### ✅ DO:
1. **Mock store** in every widget test
2. **Spy on hooks** to verify calls
3. **Test ErrorBoundary** for every widget
4. **Suppress console.error** in beforeEach
5. **Restore mocks** in afterEach
6. **Use data-testid** for selectors
7. **Extract common actions** to utility functions
8. **Use TestManager** for Playwright tests
9. **Capture console logs** for validation
10. **Use fake timers** for async tests
11. **Clear mocks** before each test
12. **Test multi-session** scenarios where relevant
13. **Validate callback sequence** with console logs
14. **Use fixtures** for complex mock data

### ❌ DON'T:
1. **Don't use CSS selectors** - use `data-testid`
2. **Don't skip ErrorBoundary tests** - required for every widget
3. **Don't forget to cleanup** in afterEach/afterAll
4. **Don't use real timers** for time-dependent tests
5. **Don't skip console.error suppression** - clutters output
6. **Don't hardcode test data** - use fixtures or constants
7. **Don't test implementation details** - test behavior
8. **Don't skip multi-session tests** for shared state widgets

---

## Anti-Patterns Found

### 1. **Hardcoded waits**
```typescript
await page.waitForTimeout(3000);
```

**Issue:** Brittle, slows tests  
**Recommendation:** Use `waitFor` with conditions when possible

---

### 2. **Manual timer parsing**
```typescript
const parseTimer = (timer: string) => {
  const parts = timer.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};
```

**Recommendation:** Extract to utility function, use in all tests

---

## Examples to Reference

### Example 1: Widget Unit Test
```typescript
import {render} from '@testing-library/react';
import {UserState} from '../../src';
import * as helper from '../../src/helper';
import store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => ({
  cc: {on: jest.fn(), off: jest.fn()},
  idleCodes: [],
  agentId: 'testAgentId',
  logger: {log: jest.fn(), error: jest.fn()},
  onErrorCallback: jest.fn(),
}));

describe('UserState Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders with correct props', () => {
    const spy = jest.spyOn(helper, 'useUserState');
    render(<UserState onStateChange={jest.fn()} />);
    expect(spy).toHaveBeenCalledWith({
      cc: expect.any(Object),
      idleCodes: [],
      agentId: 'testAgentId',
      logger: expect.any(Object),
    });
  });
});
```

### Example 2: Playwright E2E Test
```typescript
import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';

export default function createTests() {
  let testManager: TestManager;

  test.beforeAll(async ({browser}, testInfo) => {
    testManager = new TestManager(testInfo.project.name);
    await testManager.basicSetup(browser);
  });

  test.afterAll(async () => {
    await testManager.cleanup();
  });

  test('should change state', async () => {
    await testManager.agent1Page.getByTestId('state-select').click();
    await testManager.agent1Page.getByTestId('state-item-Available').click();
    
    const state = await testManager.agent1Page.getByTestId('state-select').innerText();
    expect(state).toBe('Available');
  });
}
```

---

## Files Analyzed

1. `/jest.config.js` (21 lines)
2. `/packages/contact-center/station-login/jest.config.js` (7 lines)
3. `/packages/contact-center/station-login/tests/station-login/index.tsx` (113 lines)
4. `/packages/contact-center/user-state/tests/user-state/index.tsx` (102 lines)
5. `/packages/contact-center/store/tests/store.ts` (100+ lines)
6. `/playwright.config.ts` (67 lines)
7. `/playwright/tests/user-state-test.spec.ts` (150+ lines)

---

## Related Documentation

- [React Patterns](./react-patterns.md) - Component testing strategies
- [MobX Patterns](./mobx-patterns.md) - Store mocking techniques
- [TypeScript Patterns](./typescript-patterns.md) - Type mocking

