# End-to-End Testing with Playwright

## Overview

The repository uses **Playwright** for end-to-end testing with multi-user session support.

- **Framework**: Playwright 1.51.1+
- **Location**: `playwright/` directory
- **Browser**: Chrome (Chromium)
- **Multi-session**: Parallel tests with multiple user sessions

## Test Structure

```
playwright/
├── constants.ts              # Test constants and configurations
├── global.setup.ts           # OAuth setup before tests
├── test-data.ts              # User credentials and test suite mapping
├── test-manager.ts           # Test session management
├── suites/                   # Test suite files (run per user)
│   ├── station-login-user-state-tests.spec.ts
│   ├── basic-advanced-task-controls-tests.spec.ts
│   ├── advanced-task-controls-tests.spec.ts
│   ├── digital-incoming-task-tests.spec.ts
│   └── task-list-multi-session-tests.spec.ts
├── tests/                    # Individual test files
│   ├── station-login-test.spec.ts
│   ├── user-state-test.spec.ts
│   ├── incoming-task-and-controls-multi-session.spec.ts
│   └── ...
└── Utils/                    # Test utility functions
    ├── stationLoginUtils.ts
    ├── userStateUtils.ts
    ├── taskControlUtils.ts
    ├── incomingTaskUtils.ts
    ├── advancedTaskControlUtils.ts
    ├── wrapupUtils.ts
    ├── helperUtils.ts
    └── initUtils.ts
```

## Configuration

### Playwright Config (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './playwright',
  timeout: 180000,           // 3 minutes per test
  webServer: {
    command: 'yarn workspace samples-cc-react-app serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  retries: 0,
  fullyParallel: true,
  workers: Object.keys(USER_SETS).length,  // One worker per user set
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
    // Dynamic projects for each user set
  ],
});
```

### Test Data (`test-data.ts`)

```typescript
export const USER_SETS = {
  USER_SET_1: {
    AGENT_USERNAME: process.env.USER1_USERNAME,
    AGENT_PASSWORD: process.env.USER1_PASSWORD,
    DN: process.env.USER1_DN,
    TEAM_NAME: process.env.USER1_TEAM,
    TEST_SUITE: 'station-login-user-state-tests.spec.ts',
  },
  USER_SET_2: {
    AGENT_USERNAME: process.env.USER2_USERNAME,
    // ...
    TEST_SUITE: 'basic-advanced-task-controls-tests.spec.ts',
  },
  // Add more user sets as needed
};
```

## Environment Setup

### Create `.env` File

```bash
# OAuth credentials
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
REFRESH_TOKEN=your_refresh_token

# User 1 credentials
USER1_USERNAME=agent1@example.com
USER1_PASSWORD=password1
USER1_DN=1234567890
USER1_TEAM=Support Team

# User 2 credentials
USER2_USERNAME=agent2@example.com
USER2_PASSWORD=password2
USER2_DN=0987654321
USER2_TEAM=Sales Team

# Add more users as needed
```

⚠️ **NEVER commit `.env` file** - it contains sensitive credentials

## Running E2E Tests

### Run All Tests

```bash
yarn run test:e2e
```

This will:
1. Start the React sample app on localhost:3000
2. Run OAuth setup to get access tokens
3. Run all test suites in parallel (one per user)
4. Generate HTML report

### Run Specific Test File

```bash
yarn playwright test playwright/tests/station-login-test.spec.ts
```

### Run Specific Suite

```bash
yarn playwright test playwright/suites/station-login-user-state-tests.spec.ts
```

### Run with UI (Debug Mode)

```bash
yarn playwright test --ui
```

### Run in Debug Mode

```bash
yarn playwright test --debug
```

### Run Headed (See Browser)

```bash
yarn playwright test --headed
```

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginToStation } from '../Utils/stationLoginUtils';
import { verifyAgentState } from '../Utils/userStateUtils';

test.describe('Station Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for widgets to load
    await page.waitForSelector('[data-testid="station-login"]');
    
    // Perform login
    await loginToStation(page, {
      dialNumber: process.env.USER1_DN,
      teamName: process.env.USER1_TEAM,
    });
    
    // Verify success
    await expect(page.locator('[data-testid="user-state"]')).toBeVisible();
    
    // Verify agent state
    const state = await verifyAgentState(page);
    expect(state).toBe('Available');
  });
});
```

### Using Test Utilities

```typescript
import { 
  loginToStation, 
  logoutFromStation 
} from '../Utils/stationLoginUtils';

import { 
  changeAgentState, 
  verifyAgentState,
  selectIdleCode 
} from '../Utils/userStateUtils';

import { 
  answerCall, 
  endCall,
  holdCall,
  resumeCall,
  muteCall 
} from '../Utils/taskControlUtils';

import { 
  acceptIncomingTask,
  rejectIncomingTask,
  waitForIncomingTask 
} from '../Utils/incomingTaskUtils';

test('complete call flow', async ({ page }) => {
  await page.goto('/');
  
  // Login
  await loginToStation(page, { 
    dialNumber: '1234567890', 
    teamName: 'Support' 
  });
  
  // Change to Available
  await changeAgentState(page, 'Available');
  
  // Wait for incoming call
  await waitForIncomingTask(page, { timeout: 60000 });
  
  // Accept call
  await acceptIncomingTask(page);
  
  // Verify connected
  await expect(page.locator('.task-connected')).toBeVisible();
  
  // End call
  await endCall(page);
  
  // Logout
  await logoutFromStation(page);
});
```

## Test Utilities Reference

### Station Login Utils (`stationLoginUtils.ts`)

```typescript
// Login to station
await loginToStation(page, {
  dialNumber: '1234567890',
  teamName: 'Support Team',
  deviceType?: 'Extension',
});

// Logout from station
await logoutFromStation(page);

// Verify login modal visible
await verifyLoginModalVisible(page);
```

### User State Utils (`userStateUtils.ts`)

```typescript
// Change agent state
await changeAgentState(page, 'Available');
await changeAgentState(page, 'Idle');

// Select idle code
await selectIdleCode(page, 'Break');

// Verify current state
const state = await verifyAgentState(page);
expect(state).toBe('Available');
```

### Task Control Utils (`taskControlUtils.ts`)

```typescript
// Basic call controls
await answerCall(page);
await endCall(page);
await holdCall(page);
await resumeCall(page);
await muteCall(page);
await unmuteCall(page);

// Verify call state
await verifyCallActive(page);
await verifyCallOnHold(page);
```

### Advanced Task Control Utils (`advancedTaskControlUtils.ts`)

```typescript
// Consult
await initiateConsult(page, {
  destination: '9876543210',
  type: 'agent',
});
await endConsult(page);

// Transfer
await initiateTransfer(page, {
  destination: 'Sales Team',
  type: 'queue',
});
await completeTransfer(page);

// Conference
await initiateConference(page);
await completeConference(page);
```

### Incoming Task Utils (`incomingTaskUtils.ts`)

```typescript
// Wait for incoming task
await waitForIncomingTask(page, { 
  timeout: 60000,
  taskType: 'telephony',
});

// Accept task
await acceptIncomingTask(page);

// Reject task
await rejectIncomingTask(page);

// Verify task notification
await verifyTaskNotificationVisible(page);
```

### Wrapup Utils (`wrapupUtils.ts`)

```typescript
// Select wrapup code
await selectWrapupCode(page, 'Resolved');

// Submit wrapup
await submitWrapup(page);

// Verify wrapup screen
await verifyWrapupScreenVisible(page);
```

### Helper Utils (`helperUtils.ts`)

```typescript
// Wait for element
await waitForElement(page, selector, timeout);

// Click with retry
await clickWithRetry(page, selector);

// Fill input
await fillInput(page, selector, value);

// Take screenshot
await takeScreenshot(page, 'test-step-name');

// Wait for navigation
await waitForNavigation(page);
```

## Multi-User Session Testing

For tests that require multiple agents (e.g., consult, transfer):

```typescript
import { test } from '@playwright/test';
import { chromium, Browser, Page } from 'playwright';

test('two agent consult', async ({ page: page1 }) => {
  // First agent (provided by Playwright)
  await loginToStation(page1, { 
    dialNumber: process.env.USER1_DN,
    teamName: process.env.USER1_TEAM 
  });
  
  // Create second browser/agent
  const browser2: Browser = await chromium.launch();
  const page2: Page = await browser2.newPage();
  
  await page2.goto('http://localhost:3000');
  await loginToStation(page2, {
    dialNumber: process.env.USER2_DN,
    teamName: process.env.USER2_TEAM
  });
  
  // Agent 1: Receive call and initiate consult to Agent 2
  await changeAgentState(page1, 'Available');
  await changeAgentState(page2, 'Available');
  
  await waitForIncomingTask(page1);
  await acceptIncomingTask(page1);
  
  await initiateConsult(page1, {
    destination: process.env.USER2_DN,
    type: 'agent',
  });
  
  // Agent 2: Accept consult
  await waitForIncomingTask(page2);
  await acceptIncomingTask(page2);
  
  // Verify both agents connected
  await verifyCallActive(page1);
  await verifyCallActive(page2);
  
  // Cleanup
  await endConsult(page1);
  await browser2.close();
});
```

## Debugging Tests

### Generate Trace

```bash
yarn playwright test --trace on
```

View trace:
```bash
yarn playwright show-trace trace.zip
```

### Screenshots on Failure

Screenshots are automatically captured on test failure in `test-results/` directory.

### Verbose Logging

```bash
yarn playwright test --debug
```

### Video Recording

Enable in `playwright.config.ts`:
```typescript
use: {
  video: 'on-first-retry',
}
```

## Best Practices

### ✅ Do

- Use test utilities for common actions
- Wait for elements before interacting
- Use meaningful test descriptions
- Clean up resources (logout, close browsers)
- Use appropriate timeouts for async operations
- Take screenshots at key steps (for debugging)
- Verify expected states after actions
- Handle flaky tests with proper waits

### ❌ Don't

- Use fixed delays (`page.waitForTimeout(5000)`)
- Hardcode credentials in test files
- Share state between tests
- Forget to close browsers/pages
- Ignore test failures in CI
- Test without cleaning up previous test data

## Test Maintenance

### Adding New User Set

1. Add credentials to `.env`:
```bash
USER3_USERNAME=agent3@example.com
USER3_PASSWORD=password3
USER3_DN=1112223333
USER3_TEAM=Tech Support
```

2. Add to `test-data.ts`:
```typescript
export const USER_SETS = {
  // ... existing users
  USER_SET_3: {
    AGENT_USERNAME: process.env.USER3_USERNAME,
    AGENT_PASSWORD: process.env.USER3_PASSWORD,
    DN: process.env.USER3_DN,
    TEAM_NAME: process.env.USER3_TEAM,
    TEST_SUITE: 'new-test-suite.spec.ts',
  },
};
```

### Adding New Test Suite

1. Create suite file in `playwright/suites/`:
```typescript
// my-new-tests.spec.ts
import { test, expect } from '@playwright/test';
// ... test implementation
```

2. Map to user in `test-data.ts`

3. Run: `yarn run test:e2e`

## Viewing Test Reports

After tests complete:

```bash
yarn playwright show-report
```

Opens HTML report with:
- Test results
- Screenshots
- Videos (if enabled)
- Traces
- Error details

## Common Issues

### Issue: Tests timeout

**Solution**:
- Increase timeout in `playwright.config.ts`
- Check if sample app is running
- Verify credentials are correct
- Check network conditions

### Issue: 429 Too Many Requests

**Solution**:
- Reduce test frequency
- Add delays between agent logins
- Check rate limits with backend team

### Issue: Element not found

**Solution**:
- Use proper waits (`waitForSelector`)
- Verify element selector is correct
- Check if component rendered
- Use `{ state: 'visible' }` option

## Next Steps

- See `unit-testing.md` for unit test patterns
- See `development-workflow.md` for running sample apps
- See `troubleshooting.md` for debugging tips

