# Contact Center Store — Architecture

## Component Overview

The store layer follows the architecture: **Widget → Hook → Component → Store → SDK**. This document details the Store’s structure, its wrapper, SDK integrations, data flows, and sequences for common scenarios.

### Components Table

| Layer | Component | File | State | Methods / Responsibilities | Events | Tests |
|-------|-----------|------|-------|----------------------------|--------|-------|
| **Store (core)** | `Store` | `src/store.ts` | Teams, loginOptions, idleCodes, wrapupCodes, agentProfile, isAgentLoggedIn, deviceType, dialNumber, teamId, taskList, currentTask, featureFlags, timestamps, flags | `init()`, `registerCC()`, populate observables from SDK profile, parse feature flags | N/A | `packages/contact-center/store/tests/*` |
| **Store (wrapper)** | `StoreWrapper` | `src/storeEventsWrapper.ts` | Proxies all observables | Event wiring, list fetchers, mutations, error callback, task lifecycle handling, media handling | Subscribes to `CC_EVENTS` and `TASK_EVENTS` | Same |
| **Index** | Re-exports | `src/index.ts` | N/A | Default export of `StoreWrapper`, exports types and enums | N/A | Same |
| **Consumers** | Widgets/Hooks | Various | Read-only (observer) | Use store methods and observables; set callbacks | Receive reactions via MobX | Various |
| **SDK** | Webex CC SDK | `@webex/contact-center` | N/A | Provides methods/events | Emits CC/TASK events | SDK tests |

---

## SDK Methods & Events Integration

| Area | SDK Methods Used | SDK Events Subscribed | Store/Wrapper Methods |
|------|-------------------|-----------------------|-----------------------|
| Initialization | `register()`, `LoggerProxy` | `agent:dnRegistered`, `agent:reloginSuccess`, `agent:stationLoginSuccess` | `init()`, `registerCC()`, `setupIncomingTaskHandler()` |
| Agent Session | `stationLogin()`, `stationLogout()`, `deregister()` | `agent:logoutSuccess`, `agent:multiLogin` | `cleanUpStore()`, `setShowMultipleLoginAlert()` |
| Agent State | `setAgentState()` | `agent:stateChange` | `handleStateChange()`, `setCurrentState()`, timestamp setters |
| Tasks | `taskManager.getAllTasks()` | `task:incoming`, `task:assigned`, `task:end`, `task:hydrate`, `task:merged`, consult/conference events, media events | `registerTaskEventListeners()`, `refreshTaskList()`, `setCurrentTask()`, consult handlers, media handling |
| Directory & Lists | `getBuddyAgents()`, `getQueues()`, `getEntryPoints()`, `addressBook.getEntries()` | (N/A) | `getBuddyAgents()`, `getQueues()`, `getEntryPoints()`, `getAddressBookEntries()` |

> Events enums exported via `TASK_EVENTS` and `CC_EVENTS` from `src/store.types.ts`.

---

## File Structure

```
store/
├── src/
│   ├── index.ts                 # Re-exports default store wrapper and types
│   ├── store.ts                 # Core Store (MobX observables, init/register)
│   ├── store.types.ts           # Types, enums, public API surface
│   ├── storeEventsWrapper.ts    # Wrapper: events wiring, helpers, mutations
│   ├── task-utils.ts            # Task helpers (e.g., isIncomingTask)
│   ├── util.ts                  # Feature flags parsing, utilities
│   └── constants.ts             # Shared constants (if any)
├── tests/                       # Store unit tests
├── ai-docs/
│   ├── agent.md                 # Overview & usage
│   └── architecture.md          # This file
├── package.json
├── tsconfig.json
└── webpack.config.js
```

---

## Data Flows

### Layer Communication Flow

```mermaid
graph TB
    subgraph "Consumers"
        Widget[Widget]
        Hook[Custom Hook]
        UI[Component]
    end

    subgraph "State"
        Wrapper[StoreWrapper<br/>storeEventsWrapper.ts]
        Store[Store<br/>store.ts]
    end

    subgraph "SDK"
        SDK[@webex/contact-center]
    end

    Widget --> Hook
    Hook -->|reads/writes| Wrapper
    Wrapper -->|proxies| Store
    Wrapper -->|invokes| SDK
    SDK -->|events| Wrapper
    Wrapper -->|runInAction updates| Store
    Store -->|observable reactions| Hook
    Hook --> UI
```

---

## Sequence Diagrams

### 1) Store Initialization

```mermaid
sequenceDiagram
  participant App
  participant Wrapper as StoreWrapper
  participant Store
  participant SDK

  App->>Wrapper: init(params)
  Wrapper->>Store: init(params, setupIncomingTaskHandler)
  alt params.webex provided
    Store->>Store: setupEventListeners(webex.cc)
    Store->>Store: registerCC(webex)
  else params.webexConfig + access_token
    Store->>SDK: Webex.init()
    SDK-->>Store: ready
    Store->>Store: setupEventListeners(webex.cc)
    Store->>Store: registerCC(webex)
  end
  Store->>SDK: register()
  SDK-->>Store: Profile
  Store->>Store: populate observables, feature flags
  Store-->>Wrapper: initialized
  Wrapper-->>App: resolved
```

### 2) Incoming Task Handling

```mermaid
sequenceDiagram
  participant SDK
  participant Wrapper
  participant Store

  SDK-->>Wrapper: task:incoming (ITask)
  Wrapper->>Wrapper: registerTaskEventListeners(task)
  Wrapper->>Wrapper: onIncomingTask?()  (if new)
  Wrapper->>Wrapper: handleTaskMuteState(task)
  Wrapper->>Wrapper: refreshTaskList()
  Wrapper->>Store: setCurrentTask(task?) (when applicable)
```

### 3) Agent State Change

```mermaid
sequenceDiagram
  participant SDK
  participant Wrapper
  participant Store

  SDK-->>Wrapper: agent:stateChange
  Wrapper->>Wrapper: handleStateChange()
  Wrapper->>Store: setCurrentState(auxCodeId or DEFAULT)
  Wrapper->>Store: setLastStateChangeTimestamp()
  Wrapper->>Store: setLastIdleCodeChangeTimestamp()
```

### 4) Multi-login Alert

```mermaid
sequenceDiagram
  participant SDK
  participant Wrapper
  participant Store

  SDK-->>Wrapper: agent:multiLogin
  Wrapper->>Store: setShowMultipleLoginAlert(true)
```

### 5) Logout and Cleanup

```mermaid
sequenceDiagram
  participant SDK
  participant Wrapper
  participant Store

  SDK-->>Wrapper: agent:logoutSuccess
  Wrapper->>Wrapper: cleanUpStore()
  Wrapper->>Store: reset observables (deviceType, dial, task, timestamps, flags)
  Wrapper->>Wrapper: remove CC listeners
```

---

## Troubleshooting Guide

### Store Not Initializing
- Ensure Webex SDK is ready when passing `params.webex`
- If letting store init Webex, verify `webexConfig` and `access_token`
```typescript
await store.init({webexConfig, access_token});
console.log('CC instance:', store.cc); // should be defined
```

### No Events or State Updates
- Verify `setCCCallback` and `removeCCCallback` usage
- Confirm `init()` was awaited before rendering widgets
```typescript
store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, (p) => console.log('login', p));
```

### Task List Stale
- Call `refreshTaskList()` after external task actions
```typescript
store.refreshTaskList();
```

### Address Book Empty
- Feature may be disabled; `isAddressBookEnabled` must be true
```typescript
if (!store.isAddressBookEnabled) {
  console.log('Address book disabled by org config');
}
```

### Error Boundary Triggered
- Set `setOnError` to surface details
```typescript
store.setOnError((name, err) => {
  console.error(`[${name}]`, err);
});
```

---

## Related Documentation

- [Agent Documentation](./agent.md) - Usage examples and API
- [Store Types](../src/store.types.ts) - Type definitions and enums
- [MobX Patterns](../../../../ai-docs/patterns/mobx-patterns.md) - MobX best practices
- [React Patterns](../../../../ai-docs/patterns/react-patterns.md) - React integration patterns
- [Testing Patterns](../../../../ai-docs/patterns/testing-patterns.md) - Testing strategies

---

_Last Updated: 2025-11-26_


