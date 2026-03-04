# Testing Patterns

> Quick reference for LLMs working with tests in this repository.

---

## Rules

- **MUST** use Jest for unit tests
- **MUST** use React Testing Library for component tests
- **MUST** use Playwright for E2E tests
- **MUST** mock the store using `@webex/test-fixtures`
- **MUST** use `data-testid` attributes for test selectors
- **MUST** place unit tests in `tests/` folder within each package
- **MUST** place E2E tests in `playwright/` folder at repo root
- **NEVER** test implementation details - test behavior
- **NEVER** use CSS selectors in tests - use `data-testid`

---

## Test File Structure

```
packages/contact-center/{package}/
├── src/
│   └── {widget}/
│       └── index.tsx
└── tests/
    └── {widget}/
        └── index.test.tsx

playwright/
├── tests/
│   ├── station-login-test.spec.ts
│   ├── user-state-test.spec.ts
│   └── tasklist-test.spec.ts
└── Utils/
    ├── stationLoginUtils.ts
    └── userStateUtils.ts
```

---

## Jest Unit Test Pattern

```typescript
// tests/{widget}/index.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserState } from '@webex/cc-user-state';
import { mockStore } from '@webex/test-fixtures';

// Mock the store
jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: mockStore,
}));

describe('UserState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render idle codes', () => {
    mockStore.idleCodes = [
      { id: '1', name: 'Available' },
      { id: '2', name: 'Break' },
    ];

    render(<UserState onStateChange={jest.fn()} />);

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Break')).toBeInTheDocument();
  });

  it('should call onStateChange when state is selected', async () => {
    const onStateChange = jest.fn();
    mockStore.idleCodes = [{ id: '1', name: 'Available' }];

    render(<UserState onStateChange={onStateChange} />);

    fireEvent.click(screen.getByText('Available'));

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalled();
    });
  });
});
```

---

## Mock Store Pattern

```typescript
// test-fixtures/src/mockStore.ts
export const mockStore = {
  cc: {
    on: jest.fn(),
    off: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    setAgentState: jest.fn(),
  },
  agentId: 'test-agent-123',
  isAgentLoggedIn: false,
  teams: [],
  idleCodes: [],
  currentState: 'Available',
  onErrorCallback: jest.fn(),
};

// Usage in test
jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: mockStore,
}));
```

---

## Hook Testing Pattern

```typescript
import { renderHook, act } from '@testing-library/react';
import { useUserState } from '../../src/helper';
import { mockStore } from '@webex/test-fixtures';

describe('useUserState', () => {
  it('should handle state change', async () => {
    const onStateChange = jest.fn();
    
    const { result } = renderHook(() => 
      useUserState({
        cc: mockStore.cc,
        idleCodes: mockStore.idleCodes,
        currentState: 'Available',
        onStateChange,
      })
    );

    await act(async () => {
      await result.current.handleSetState({ id: '1', name: 'Break' });
    });

    expect(mockStore.cc.setAgentState).toHaveBeenCalled();
  });
});
```

---

## data-testid Pattern

```typescript
// In component
<button data-testid="login-button" onClick={handleLogin}>
  Login
</button>

<div data-testid="user-state-dropdown">
  {/* content */}
</div>

// In test
const loginButton = screen.getByTestId('login-button');
const dropdown = screen.getByTestId('user-state-dropdown');
```

---

## Playwright E2E Test Pattern

```typescript
// playwright/tests/station-login-test.spec.ts
import { test, expect } from '@playwright/test';
import { StationLoginUtils } from '../Utils/stationLoginUtils';

test.describe('Station Login', () => {
  let utils: StationLoginUtils;

  test.beforeEach(async ({ page }) => {
    utils = new StationLoginUtils(page);
    await utils.navigateToApp();
  });

  test('should login successfully', async ({ page }) => {
    await utils.selectTeam('Team A');
    await utils.selectDialNumber('+1234567890');
    await utils.clickLogin();

    await expect(page.getByTestId('login-success')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await utils.clickLogin();

    await expect(page.getByTestId('error-message')).toBeVisible();
  });
});
```

### TestManager Pattern

```typescript
// playwright/tests/station-login-test.spec.ts
import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {
  telephonyLogin,
  verifyLoginMode,
  ensureUserStateVisible,
} from '../Utils/stationLoginUtils';
import {LOGIN_MODE} from '../constants';

test.describe('Station Login Tests - Dial Number Mode', () => {
  let testManager: TestManager;

  test.beforeAll(async ({browser}, testInfo) => {
    const projectName = testInfo.project.name;
    testManager = new TestManager(projectName);
    await testManager.setupForStationLogin(browser);
  });

  test.afterAll(async () => {
    if (testManager) {
      await testManager.cleanup();
    }
  });

  test('should login with Dial Number mode and verify login state', async () => {
    await ensureUserStateVisible(
      testManager.agent1Page,
      LOGIN_MODE.DIAL_NUMBER,
      process.env[`${testManager.projectName}_ENTRY_POINT`],
    );

    await telephonyLogin(
      testManager.agent1Page,
      LOGIN_MODE.DIAL_NUMBER,
      process.env[`${testManager.projectName}_ENTRY_POINT`],
    );

    await verifyLoginMode(testManager.agent1Page, 'Dial Number');
  });
});
```

---

## Playwright Utils Pattern

```typescript
// playwright/Utils/stationLoginUtils.ts
import { Page, Locator } from '@playwright/test';

export class StationLoginUtils {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async navigateToApp(): Promise<void> {
    await this.page.goto('/');
  }

  async selectTeam(teamName: string): Promise<void> {
    await this.page.getByTestId('team-dropdown').click();
    await this.page.getByText(teamName).click();
  }

  async selectDialNumber(number: string): Promise<void> {
    await this.page.getByTestId('dial-number-input').fill(number);
  }

  async clickLogin(): Promise<void> {
    await this.page.getByTestId('login-button').click();
  }

  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForSelector('[data-testid="login-success"]');
  }
}
```

---

## Async Testing Pattern

```typescript
// Using waitFor
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Using findBy (auto-waits)
const successMessage = await screen.findByText('Success');
expect(successMessage).toBeInTheDocument();

// Using act for state updates
await act(async () => {
  fireEvent.click(button);
});
```

---

## Mock Event Pattern

```typescript
// Mock event listener
const mockOn = jest.fn();
const mockOff = jest.fn();

mockStore.cc = {
  on: mockOn,
  off: mockOff,
};

// Simulate event
const eventHandler = mockOn.mock.calls[0][1];
act(() => {
  eventHandler({ state: 'Break' });
});
```

---

## Snapshot Testing Pattern

```typescript
it('should match snapshot', async () => {
  const { container } = await render(<UserStateComponent {...defaultProps} />);
  expect(container).toMatchSnapshot();
});
```

---

## Test Commands

```bash
# Run all unit tests
yarn test:unit

# Run all style tests
yarn test:styles

# Run all E2E tests
yarn test:e2e


# Run all tests for tooling
yarn test:tooling

# Run specific package tests
yarn workspace @webex/cc-station-login test:unit

# Run with coverage
yarn run test:unit --coverage

# Run specific E2E test
npx playwright test tests/station-login-test.spec.ts
```

---

## Related

- [React Patterns](./react-patterns.md)
- [TypeScript Patterns](./typescript-patterns.md)
- [MobX Patterns](./mobx-patterns.md)
