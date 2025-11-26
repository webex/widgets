# User State Widget - Architecture

## Component Overview

The User State widget follows the three-layer architecture pattern: **Widget → Hook → Component → Store → SDK**. This architecture separates concerns between state management, business logic, and presentation. The widget uniquely uses a **Web Worker** for accurate timer management.

### Component Table

| Layer | Component | File | Config/Props | State | Callbacks | Events | Tests |
|-------|-----------|------|--------------|-------|-----------|--------|-------|
| **Widget** | `UserState` | `src/user-state/index.tsx` | `IUserStateProps` | N/A (passes through) | `onStateChange` | SDK events (via store) | `tests/user-state/index.tsx` |
| **Widget Internal** | `UserStateInternal` | `src/user-state/index.tsx` | `IUserStateProps` | Observes store | Same as above | Same as above | Same |
| **Hook** | `useUserState` | `src/helper.ts` | `UseUserStateProps` | `isSettingAgentStatus`, `elapsedTime`, `lastIdleStateChangeElapsedTime` | `onStateChange` | Web Worker messages | `tests/helper.ts` |
| **Web Worker** | Timer Worker | `src/helper.ts` (inline) | Worker messages | `intervalId`, `intervalId2` (timers) | N/A | `elapsedTime`, `lastIdleStateChangeElapsedTime` | N/A |
| **Component** | `UserStateComponent` | `@webex/cc-components` | `UserStateComponentsProps` | Internal UI state | Inherited from hook | N/A | `@webex/cc-components` tests |
| **Store** | `Store` (singleton) | `@webex/cc-store` | N/A | `idleCodes`, `agentId`, `currentState`, `lastStateChangeTimestamp`, `lastIdleCodeChangeTimestamp`, `customState` | N/A | Agent state change events | `@webex/cc-store` tests |
| **SDK** | `ContactCenter` | `@webex/contact-center` | N/A | N/A | N/A | State change events | SDK tests |

### SDK Methods & Events Integration

| Component | SDK Methods Used | SDK Events Subscribed | Store Methods Used |
|-----------|------------------|----------------------|-------------------|
| **useUserState Hook** | `setAgentState()` | Agent state change events | `setCurrentState()`, `setLastStateChangeTimestamp()`, `setLastIdleCodeChangeTimestamp()` |
| **Store** | All SDK methods | All SDK events | N/A |
| **Widget** | N/A (via hook) | N/A (via store) | N/A (via hook) |

### File Structure

```
user-state/
├── src/
│   ├── helper.ts                      # useUserState hook + Web Worker
│   ├── index.ts                       # Package exports
│   ├── user-state/
│   │   └── index.tsx                  # Widget component
│   └── user-state.types.ts            # TypeScript types
├── tests/
│   ├── helper.ts                      # Hook tests
│   └── user-state/
│       └── index.tsx                  # Widget tests
├── ai-prompts/
│   ├── agent.md                       # Overview, examples, usage
│   └── architecture.md                # Architecture documentation
├── dist/                              # Build output
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript config
├── webpack.config.js                  # Webpack build config
├── jest.config.js                     # Jest test config
└── eslint.config.mjs                  # ESLint config
```

---

## Data Flows

### Layer Communication Flow

The widget follows a unidirectional data flow pattern across layers with Web Worker integration:

```mermaid
graph TB
    subgraph "Presentation Layer"
        Widget[UserState Widget]
        Component[UserStateComponent]
    end
    
    subgraph "Business Logic Layer"
        Hook[useUserState Hook<br/>helper.ts]
    end
    
    subgraph "Background Processing"
        Worker[Web Worker<br/>Timer]
    end
    
    subgraph "State Management Layer"
        Store[Store Singleton]
    end
    
    subgraph "SDK Layer"
        SDK[Contact Center SDK]
    end
    
    Widget -->|Props<br/>callbacks| Hook
    Hook -->|Read state<br/>idleCodes, currentState, etc| Store
    Hook -->|Call methods<br/>setAgentState| SDK
    Store -->|Register callbacks<br/>Manage SDK instance| SDK
    Hook <-->|Start/Stop/Reset timer| Worker
    
    Worker -->|Timer updates<br/>every second| Hook
    SDK -->|Events<br/>state changes| Store
    Store -->|State changes<br/>observable| Hook
    Hook -->|Return state<br/>& handlers & timer| Widget
    Widget -->|Props<br/>state, handlers, timer| Component
    
    style Hook fill:#e1f5ff
    style Worker fill:#ffe1e1
    style Store fill:#fff4e1
    style SDK fill:#f0e1ff
```

**Hook Responsibilities:**
- Manages timer via Web Worker
- Subscribes to state changes
- Handles state update logic
- Dual timer management
- Error handling

**Web Worker Responsibilities:**
- Background timer execution
- Two independent timers
- State duration timer
- Idle code duration timer

**Store Responsibilities:**
- Observable state
- Idle codes list
- Current state tracking
- Timestamps for timers

### Hook (helper.ts) Details

**File:** `src/helper.ts`

The `useUserState` hook is the core business logic layer that:

1. **Manages Local State:**
   - `isSettingAgentStatus` - Loading indicator during state change
   - `elapsedTime` - Seconds elapsed in current state
   - `lastIdleStateChangeElapsedTime` - Seconds elapsed since idle code change

2. **Web Worker Management:**
   ```typescript
   // Initialize Web Worker with inline script
   const blob = new Blob([workerScript], {type: 'application/javascript'});
   const workerUrl = URL.createObjectURL(blob);
   workerRef.current = new Worker(workerUrl);
   
   // Start both timers
   workerRef.current.postMessage({type: 'start', startTime: Date.now()});
   workerRef.current.postMessage({type: 'startIdleCode', startTime: Date.now()});
   ```

3. **Provides Key Functions:**
   - `setAgentStatus()` - Updates store with new state (UI trigger)
   - `updateAgentState()` - Calls SDK to persist state change (Backend sync)
   - `callOnStateChange()` - Invokes callback with current state

4. **State Change Logic:**
   - UI triggers `setAgentStatus()` → Updates store
   - Store change triggers `useEffect` → Calls `updateAgentState()`
   - `updateAgentState()` → SDK call → Updates timestamps → Timer reset
   - Callback invoked with new state object

5. **Timer Reset Logic:**
   - Resets main timer when `lastStateChangeTimestamp` changes
   - Resets idle code timer when `lastIdleCodeChangeTimestamp` changes
   - Stops idle code timer if timestamp matches state timestamp (Available state)

### Sequence Diagrams

#### 1. Widget Initialization & Timer Start

```mermaid
sequenceDiagram
    actor User
    participant Widget as UserState Widget
    participant Hook as useUserState Hook
    participant Worker as Web Worker
    participant Component as UserStateComponent
    participant Store

    User->>Widget: Load widget
    activate Widget
    Widget->>Hook: useUserState()
    activate Hook
    Hook->>Store: Read state
    Store-->>Hook: {idleCodes, currentState, timestamps}
    Hook->>Worker: Create & initialize
    activate Worker
    Hook->>Worker: postMessage({type: 'start', startTime})
    Hook->>Worker: postMessage({type: 'startIdleCode', startTime})
    Worker-->>Hook: Worker ready
    Hook-->>Widget: {state, handlers, timers}
    deactivate Hook
    Widget->>Component: Render with state
    activate Component
    Component->>Component: Display current state
    Component->>Component: Display idle codes
    Component->>Component: Display timer: 00:00
    Component-->>Widget: UI rendered
    deactivate Component
    deactivate Widget

    Note over Worker,Component: Timer Updates (Every Second)
    Worker->>Worker: Increment timers
    Worker->>Hook: postMessage({type: 'elapsedTime', elapsedTime: X})
    activate Hook
    Hook->>Hook: setElapsedTime(X)
    Hook-->>Component: Updated timer value
    deactivate Hook
    activate Component
    Component->>Component: Display timer: 00:0X
    deactivate Component
```

---

#### 2. State Change Flow

```mermaid
sequenceDiagram
    actor User
    participant Component as UserStateComponent
    participant Hook as useUserState Hook
    participant Store
    participant SDK
    participant Worker as Web Worker

    User->>Component: Select new state (e.g., "Break")
    activate Component
    Component->>Hook: setAgentStatus(selectedCode)
    activate Hook
    Hook->>Store: setCurrentState(selectedCode)
    activate Store
    Store->>Store: currentState = selectedCode (observable)
    Store-->>Hook: State updated
    deactivate Store
    Hook-->>Component: State change initiated
    deactivate Hook
    deactivate Component

    Note over Hook,SDK: useEffect Triggered by currentState Change
    Hook->>Hook: Detect currentState change
    activate Hook
    Hook->>Hook: updateAgentState(selectedCode)
    Hook->>Hook: setIsSettingAgentStatus(true)
    Hook->>SDK: setAgentState({state: 'Idle', auxCodeId, agentId})
    activate SDK
    SDK->>SDK: Update agent state in backend
    SDK-->>Hook: Success response with timestamps
    deactivate SDK
    Hook->>Store: setLastStateChangeTimestamp(timestamp)
    activate Store
    Store->>Store: Update timestamps
    Store-->>Hook: Timestamps updated
    deactivate Store
    Hook->>Hook: setIsSettingAgentStatus(false)
    Hook->>Hook: callOnStateChange()
    Hook->>Hook: Invoke onStateChange(selectedCode)
    Hook-->>Component: State change complete
    deactivate Hook
    activate Component
    Component->>Component: Update UI with new state
    deactivate Component

    Note over Hook,Worker: Timer Reset
    Hook->>Hook: Detect timestamp change
    activate Hook
    Hook->>Worker: postMessage({type: 'reset', startTime})
    activate Worker
    Worker->>Worker: Clear old interval
    Worker->>Worker: Start new interval
    Worker-->>Hook: Timer reset
    deactivate Worker
    Hook-->>Component: Timer reset to 00:00
    deactivate Hook
    activate Component
    Component->>Component: Display timer: 00:00
    deactivate Component
```

---

#### 3. Custom State Change Flow

```mermaid
sequenceDiagram
    actor User
    participant Component as UserStateComponent
    participant Hook as useUserState Hook
    participant Store

    User->>Component: External state change
    activate Component
    Component->>Component: (State managed externally)
    deactivate Component

    Store->>Store: customState updated (external)
    activate Store
    Store-->>Hook: customState change (observable)
    deactivate Store

    Note over Hook: useEffect Triggered by customState Change
    Hook->>Hook: Detect customState change
    activate Hook
    Hook->>Hook: callOnStateChange()
    Hook->>Hook: Check if customState has developerName

    alt customState has developerName
        Hook->>Hook: onStateChange(customState)
    else no developerName
        Hook->>Hook: Find matching idle code
        Hook->>Hook: onStateChange(matchingCode)
    end

    Hook-->>Component: Callback invoked
    deactivate Hook
    activate Component
    Component->>Component: Handle custom state
    deactivate Component
```

---

#### 4. Cleanup & Worker Termination

```mermaid
sequenceDiagram
    actor User
    participant Widget as UserState Widget
    participant Hook as useUserState Hook
    participant Worker as Web Worker

    User->>Widget: Unmount widget
    activate Widget
    Widget->>Hook: Cleanup (useEffect return)
    activate Hook
    Hook->>Worker: postMessage({type: 'stop'})
    activate Worker
    Worker->>Worker: clearInterval(intervalId)
    Worker-->>Hook: Timer stopped
    deactivate Worker
    Hook->>Worker: postMessage({type: 'stopIdleCode'})
    activate Worker
    Worker->>Worker: clearInterval(intervalId2)
    Worker-->>Hook: Idle timer stopped
    deactivate Worker
    Hook->>Worker: terminate()
    activate Worker
    Worker->>Worker: Cleanup resources
    Worker-->>Hook: Worker terminated
    deactivate Worker
    Hook->>Hook: workerRef.current = null
    Hook-->>Widget: Cleanup complete
    deactivate Hook
    Widget-->>User: Widget unmounted
    deactivate Widget
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Timer Not Updating

**Symptoms:**
- Timer shows 00:00 and doesn't increment
- Timer freezes after state change

**Possible Causes:**
- Web Worker failed to initialize
- Browser doesn't support Web Workers
- Worker messages not being received

**Solutions:**

```typescript
// Check if Web Worker is supported
if (typeof Worker === 'undefined') {
  console.error('Web Workers not supported in this browser');
}

// Verify worker initialization in console
console.log('Worker ref:', workerRef.current);

// Check worker messages
workerRef.current.onmessage = (event) => {
  console.log('Worker message:', event.data);
};

// Manually trigger timer update for testing
store.setLastStateChangeTimestamp(Date.now());
```

#### 2. State Change Not Persisting

**Symptoms:**
- UI shows new state but reverts back
- SDK call fails silently
- `isSettingAgentStatus` stays true

**Possible Causes:**
- SDK not initialized
- Invalid state or idle code
- Network issues
- Agent not logged in

**Solutions:**

```typescript
// Check SDK instance
console.log('CC instance:', store.cc);

// Verify agent is logged in
console.log('Agent logged in:', store.isAgentLoggedIn);

// Check current state
console.log('Current state:', store.currentState);

// Check idle codes availability
console.log('Idle codes:', store.idleCodes);

// Enable detailed logging
store.logger.setLevel('debug');
```

#### 3. Idle Codes Not Displaying

**Symptoms:**
- Dropdown is empty
- No idle codes available
- Only "Available" shows

**Possible Causes:**
- Idle codes not loaded from backend
- Store not initialized properly
- Configuration issue

**Solutions:**

```typescript
// Check idle codes in store
import store from '@webex/cc-store';
console.log('Idle codes:', store.idleCodes);
console.log('Idle codes count:', store.idleCodes.length);

// Verify store initialization
console.log('Store initialized:', store.cc !== undefined);

// Check agent configuration
console.log('Agent config:', store.cc?.agentConfig);
```

#### 4. Callback Not Firing

**Symptoms:**
- `onStateChange` not called
- No notification on state change
- State changes but app doesn't update

**Possible Causes:**
- Callback not provided
- Callback reference changing
- Error in callback execution

**Solutions:**

```typescript
// Ensure callback is stable
const handleStateChange = useCallback((state) => {
  console.log('State changed:', state);
}, []);

// Wrap in try-catch
const handleStateChange = (state) => {
  try {
    console.log('State changed:', state);
    // Your logic here
  } catch (error) {
    console.error('Error in state change callback:', error);
  }
};

// Verify callback is passed
<UserState onStateChange={handleStateChange} />

// Check if callback is being invoked (add logging in hook)
console.log('Calling onStateChange with:', state);
onStateChange?.(state);
```

#### 5. Memory Leak with Worker

**Symptoms:**
- Browser tab becomes slow over time
- Multiple workers running
- Memory usage increases

**Possible Causes:**
- Worker not terminated on unmount
- Multiple widget instances
- Worker cleanup not executed

**Solutions:**

```typescript
// Verify cleanup on unmount
useEffect(() => {
  // ... worker initialization
  
  return () => {
    console.log('Cleaning up worker');
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };
}, []);

// Check for multiple widget instances
// Only render one UserState widget at a time

// Monitor worker instances in DevTools
// Performance > Memory > Take snapshot
```

#### 6. Dual Timer Mismatch

**Symptoms:**
- State timer and idle code timer show different values
- Timers not in sync
- Idle code timer doesn't stop on Available

**Possible Causes:**
- Timestamps not set correctly
- Worker messages mixed up
- Logic error in timer reset

**Solutions:**

```typescript
// Check timestamps
console.log('State timestamp:', store.lastStateChangeTimestamp);
console.log('Idle code timestamp:', store.lastIdleCodeChangeTimestamp);

// Verify timer values
console.log('Elapsed time:', elapsedTime);
console.log('Idle elapsed time:', lastIdleStateChangeElapsedTime);

// Check if idle timer should be stopped
if (currentState === 'Available') {
  console.log('Idle timer should be stopped');
  // Should show -1 or 0
}
```

---

## Related Documentation

- [Agent Documentation](./agent.md) - Usage examples and props
- [MobX Patterns](../../../../ai-docs/patterns/mobx-patterns.md) - Store patterns
- [React Patterns](../../../../ai-docs/patterns/react-patterns.md) - Component patterns
- [Testing Patterns](../../../../ai-docs/patterns/testing-patterns.md) - Testing guidelines
- [Store Documentation](../../store/ai-prompts/agent.md) - Store API reference

---

_Last Updated: 2025-11-26_

