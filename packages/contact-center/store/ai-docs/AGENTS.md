# Contact Center Store (`@webex/cc-store`)

## Overview

`@webex/cc-store` is the shared, singleton MobX store for all Contact Center widgets. It holds global agent,session and task state, proxies SDK events, and exposes convenience APIs for fetching lists (queues, entry points, address book), task lifecycle handling, and common mutations.

**Package:** `@webex/cc-store`  
**Version:** See package.json

---

## Why and What is This Used For?

### Purpose

The store enables Contact Center widgets to:
- **Initialize and register** with the Webex Contact Center SDK
- **Observe global state** (teams, device type, login options, agent state, tasks and many more)
- **Handle SDK events** (login, logout, multi-login, task lifecycle, agent state changes)
- **Fetch domain data** (buddy agents, queues, entry points, address book)
- **Centralize callbacks and error handling** for consistent behavior across widgets

### Key Capabilities

- **Singleton** state via MobX observables
- **Event wiring** to SDK (TASK_EVENTS and CC_EVENTS)
- **Task list management** and current task tracking
- **Helpers** for buddy agents, queues, entry points, address book
- **Error propagation** via `setOnError`
- **Feature flags** parsing from SDK profile

---

## Examples and Usage

### Basic Initialization

```typescript
import store from '@webex/cc-store';

// Option A: If you already have a Webex instance, best for existing webex enabled apps
await store.init({
  webex: someWebexInstance, // must include cc
});

// Option B: Let the store initialize Webex for you, best for new apps
await store.init({
  webexConfig: {/* sdk config */},
  access_token: authToken,
});
```

### Registration (when Webex is ready)

```typescript
// If you need explicit (re-)registration using an existing webex
await store.registerCC(someWebexInstance);
```

### Observing State in React

```typescript
import {observer} from 'mobx-react-lite';
import store from '@webex/cc-store';

const Header = observer(() => {
  return (
    <div>
      <div>Agent ID: {store.agentId}</div>
      <div>Logged In: {store.isAgentLoggedIn ? 'Yes' : 'No'}</div>
      <div>Device: {store.deviceType}</div>
      <div>Team: {store.teamId}</div>
    </div>
  );
});
```

### Setting Up Error Callback

```typescript
import store from '@webex/cc-store';

store.setOnError((componentName, error) => {
  console.error(`Error from ${componentName}`, error);
  // forward to telemetry
});
```

### Subscribing/Unsubscribing to SDK Events on contact center object

```typescript
import store, {CC_EVENTS, TASK_EVENTS} from '@webex/cc-store';

const onLogin = (payload) => console.log('Login success:', payload);
store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, onLogin);

// Later
store.removeCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS);
```

### Subscribing/Unsubscribing to Task Events on task object

```typescript
import store, {TASK_EVENTS} from '@webex/cc-store';

// Choose a task (e.g., current task)
const taskId = store.currentTask?.data?.interactionId;
if (taskId) {
  const handleMedia = (track) => {
    // e.g., use track for call control audio
    console.log('Media track received', track?.kind);
  };

  // Subscribe to a task event
  store.setTaskCallback(TASK_EVENTS.TASK_MEDIA, handleMedia, taskId);

  // Later, unsubscribe
  store.removeTaskCallback(TASK_EVENTS.TASK_MEDIA, handleMedia, taskId);
}
```

### Fetching Lists

```typescript
// Buddy agents for current task media type
const buddies = await store.getBuddyAgents();

// Queues for a channel
const {data: queues} = await store.getQueues('TELEPHONY', {page: 0, pageSize: 25});

// Entry points
const entryPoints = await store.getEntryPoints({page: 0, pageSize: 50});

// Address book (no-op if disabled)
const addressBook = await store.getAddressBookEntries({page: 0, pageSize: 50});
```

### Mutating Common State

```typescript
store.setDeviceType('BROWSER');
store.setDialNumber('12345');
store.setTeamId('teamId123');
store.setState({id: 'Available', name: 'Available', isSystem: true, isDefault: true});
```

---

## Key API (Selected)

Properties (observable via MobX):
- `teams`, `loginOptions`, `idleCodes`, `wrapupCodes`, `featureFlags`
- `agentId`, `agentProfile`, `isAgentLoggedIn`, `deviceType`, `dialNumber`, `teamId`
- `currentTask`, `taskList`, `currentState`, `lastStateChangeTimestamp`, `lastIdleCodeChangeTimestamp`
- `showMultipleLoginAlert`, `currentTheme`, `customState`, `isMuted`, `isAddressBookEnabled`

Methods:
- `init(params)`, `registerCC(webex?)`
- `setOnError(cb)`, `setCCCallback(event, cb)`, `removeCCCallback(event)`
- `refreshTaskList()`, `setCurrentTask(task, isClicked?)`
- `setDeviceType(option)`, `setDialNumber(value)`, `setTeamId(id)`
- `setCurrentState(stateId)`, `setState(state | {reset:true})`
- `getBuddyAgents(mediaType?)`, `getQueues(mediaType?, params?)`
- `getEntryPoints(params?)`, `getAddressBookEntries(params?)`

For full types, see src/store.types.ts.

---

## Dependencies

See exact versions in package.json

### Runtime

| Package | Purpose |
|---------|---------|
| `@webex/contact-center` | SDK integration (methods/events) |
| `mobx` | Observable state management |

### Dev/Test

TypeScript, Jest, ESLint, Webpack (see [package.json](../package.json)).

---

## Installation

```bash
yarn add @webex/cc-store
```

---

## Additional Resources

For detailed store architecture, event flows, and sequence diagrams, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_




