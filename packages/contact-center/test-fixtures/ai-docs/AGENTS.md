# Test Fixtures - Mock Data for Testing

## Overview

Test Fixtures is a utility package that provides comprehensive mock data for testing contact center widgets. It includes mock objects for the Contact Center SDK, tasks, profiles, agents, queues, and address books. These fixtures enable isolated unit testing without requiring actual SDK connections.

**Package:** `@webex/test-fixtures`

**Version:** See [package.json](../package.json)

---

## Why and What is This Package Used For?

### Purpose

Test Fixtures provides realistic mock data for testing widgets and components. It:
- **Provides mock SDK instance** - IContactCenter mock with jest functions
- **Supplies mock data** - Tasks, profiles, agents, queues, address books
- **Enables isolated testing** - Test widgets without backend dependencies
- **Ensures consistency** - Same mock data across all tests
- **Supports customization** - Easy to extend or override fixtures

### Key Capabilities

- **SDK Mock**: Mock SDK methods to be used in testing
- **Task Fixtures**: Mock tasks with various states and media types
- **Profile Data**: Mock agent profiles with teams, dial plans, idle codes
- **Address Book**: Mock contact entries and search results
- **Queue Data**: Mock queue configurations and statistics
- **Agent Data**: Mock agent lists for buddy agents/transfers
- **Type-Safe**: All fixtures match actual SDK TypeScript types

---

## Examples and Use Cases

### Getting Started

#### Basic Widget Test

```typescript
import { render } from '@testing-library/react';
import { StationLogin } from '@webex/cc-station-login';
import { mockCC, mockProfile } from '@webex/test-fixtures';
import store from '@webex/cc-store';

// Mock the store
jest.mock('@webex/cc-store', () => ({
  cc: mockCC,
  teams: mockProfile.teams,
  loginOptions: mockProfile.loginVoiceOptions,
  logger: mockCC.LoggerProxy,
  isAgentLoggedIn: false,
}));

test('renders station login', () => {
  const { getByText } = render(<StationLogin profileMode={false} />);
  expect(getByText('Login')).toBeInTheDocument();
});
```

#### Using Mock Task

```typescript
import { render } from '@testing-library/react';
import { CallControl } from '@webex/cc-task';
import { mockTask } from '@webex/test-fixtures';

test('renders call control for active task', () => {
  const { getByRole } = render(
    <CallControl task={mockTask} />
  );
  
  expect(getByRole('button', { name: /hold/i })).toBeInTheDocument();
  expect(getByRole('button', { name: /end/i })).toBeInTheDocument();
});
```

### Common Use Cases

#### 1. Mocking Contact Center SDK

```typescript
import { mockCC } from '@webex/test-fixtures';

// Use in tests
test('calls SDK stationLogin method', async () => {
  const loginSpy = jest.spyOn(mockCC, 'stationLogin')
    .mockResolvedValue({ success: true });

  await mockCC.stationLogin({
    teamId: 'team1',
    loginOption: 'BROWSER',
    dialNumber: ''
  });

  expect(loginSpy).toHaveBeenCalledWith({
    teamId: 'team1',
    loginOption: 'BROWSER',
    dialNumber: ''
  });
});
```

#### 2. Customizing Mock Profile

```typescript
import { mockProfile } from '@webex/test-fixtures';

test('handles agent with custom idle codes', () => {
  // Customize fixture
  const customProfile = {
    ...mockProfile,
    idleCodes: [
      { id: 'break', name: 'Break', isSystem: true, isDefault: false },
      { id: 'lunch', name: 'Lunch', isSystem: false, isDefault: false },
      { id: 'meeting', name: 'Meeting', isSystem: false, isDefault: true },
    ]
  };

  // Use in test
  store.setIdleCodes(customProfile.idleCodes);
  // ... test logic
});
```

#### 3. Testing Task Operations

```typescript
import { mockTask } from '@webex/test-fixtures';

test('can hold and resume task', async () => {
  // Task has pre-configured jest mocks

  const holdSpy = jest.spyOn(mockTask,'hold')
  const resumeSpy = jest.spyOn(mockTask,'resume')

  await mockTask.hold()
  await mockTask.resume()
  await mockTask.hold()

  expect(holdSpy).toHaveBeenCalledTimes(2)
  expect(resumeSpy).toHaveBeenCalledTimes(1)
});

test('can end task with wrapup', async () => {
  const mockData = { success: true } 
  const wrapupSpy = jest.spyOn(mockTask, 'wrapup')
    .mockResolvedValue(mockData);

  const res = await mockTask.wrapup();
  expect(wrapupSpy).toHaveBeenCalled();
  expect(res).toEqual(mockData)
});
```

#### 4. Testing with Mock Agents

```typescript
import { mockAgents } from '@webex/test-fixtures';

test('displays buddy agents for transfer', () => {
  const { getByText } = render(
    <BuddyAgentList agents={mockAgents} />
  );

  expect(getByText('Agent1')).toBeInTheDocument();
  expect(getByText('Agent2')).toBeInTheDocument();
});
```

#### 5. Testing Queue Selection

```typescript
import { mockQueueDetails } from '@webex/test-fixtures';

test('allows selecting transfer queue', () => {
  const { getByRole } = render(
    <QueueSelector queues={mockQueueDetails} />
  );

  const queue1 = getByRole('option', { name: /Queue1/i });
  expect(queue1).toBeInTheDocument();
});
```

#### 6. Custom Address Book Mock

```typescript
import { makeMockAddressBook } from '@webex/test-fixtures';

test('searches address book entries', async () => {
  const mockGetEntries = jest.fn().mockResolvedValue({
    data: [
      { id: 'c1', name: 'John', number: '123' },
      { id: 'c2', name: 'Jane', number: '456' },
    ],
    meta: { page: 0, pageSize: 25, totalPages: 1 }
  });

  const addressBook = makeMockAddressBook(mockGetEntries);
  
  const result = await addressBook.getEntries({ search: 'John' });
  
  expect(mockGetEntries).toHaveBeenCalledWith({ search: 'John' });
  expect(result.data).toHaveLength(2);
});
```

### Integration Patterns

#### Complete Widget Test Setup

```typescript
import { render } from '@testing-library/react';
import { UserState } from '@webex/cc-user-state';
import { mockCC, mockProfile } from '@webex/test-fixtures';
import store from '@webex/cc-store';

// Mock store module
jest.mock('@webex/cc-store', () => ({
  cc: mockCC,
  idleCodes: mockProfile.idleCodes,
  agentId: mockProfile.agentId,
  currentState: 'Available',
  lastStateChangeTimestamp: 'mock-date',
  customState: null,
  logger: mockCC.LoggerProxy,
  setCurrentState: jest.fn(),
  setLastStateChangeTimestamp: jest.fn(),
  setLastIdleCodeChangeTimestamp: jest.fn(),
}));

test('user state widget', () => {
  const onStateChange = jest.fn();
  
  render(<UserState onStateChange={onStateChange} />);
  
  // Test interactions
  // ...
});
```

#### Snapshot Testing

```typescript
import { render } from '@testing-library/react';
import { TaskList } from '@webex/cc-task';
import { mockTask } from '@webex/test-fixtures';

test('task list matches snapshot', async() => {
  const { container } = await render(
    <TaskList 
      tasks={[mockTask]}
      selectedTaskId={mockTask.data.interactionId}
    />
  );

  expect(container.firstChild).toMatchSnapshot();
});
```

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@webex/cc-store` | Store types and interfaces |
| `typescript` | TypeScript support |
| `@webex/contact-center` | Types import from SDK |

### Development Dependencies

Key development tools (see [package.json](../package.json) for versions):
- TypeScript
- Webpack (bundling)
- Babel (transpilation)
- ESLint (linting)

**Note:** This package has no peer dependencies since it's only used in tests.

---

## Available Fixtures

### Core Fixtures

| Export | Type | Purpose |
|--------|------|---------|
| `mockCC` | `IContactCenter` | Complete SDK instance mock with jest functions |
| `mockProfile` | `Profile` | Agent profile with teams, idle codes, wrapup codes |
| `mockTask` | `ITask` | Active task with telephony interaction |
| `mockQueueDetails` | `Array<QueueDetails>` | Queue configurations |
| `mockAgents` | `Array<Agent>` | Buddy agent list |
| `mockEntryPointsResponse` | `EntryPointListResponse` | Entry points for outdial |
| `mockAddressBookEntriesResponse` | `AddressBookEntriesResponse` | Address book contacts |
| `makeMockAddressBook` | `Function` | Factory for custom address book mock |
| `mockIncomingTaskData` | `Record<string, IncomingTaskData>` | Incoming task data variants for incoming task tests |
| `mockTaskData` | `Record<string, Record<string, TaskListItemData>>` | Task list item data variants for task list tests |
| `mockOutdialCallProps` | `OutdialCallComponentProps` | Outdial call component props mock with jest functions |
| `mockAniEntries` | `Array<OutdialAniEntry>` | Outdial ANI entries list |
| `mockCCWithAni` | `IContactCenter` | CC mock with outdial ANI configured |

### Importing Fixtures

```typescript
// Import all fixtures
import {
  mockCC,
  mockProfile,
  mockTask,
  mockQueueDetails,
  mockAgents,
  mockEntryPointsResponse,
  mockAddressBookEntriesResponse,
  makeMockAddressBook,
} from '@webex/test-fixtures';

// Use in tests
test('example', () => {
  expect(mockCC.stationLogin).toBeDefined();
  expect(mockProfile.teams).toHaveLength(1);
  expect(mockTask.data.interactionId).toBe('interaction123');
});
```

---

## Installation

```bash
# Install as dev dependency
yarn add -D @webex/test-fixtures

# Usually already included in widget package devDependencies
```

---

## Additional Resources

For detailed fixture structure, customization patterns, and testing strategies, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_

