# User State Widget

## AI Agent Routing (Do Not Start Here)

If you are an AI assistant or tool reading this file **as your first entry point**, do **not** start your reasoning or code generation workflow from here.

- **Primary entrypoint:** Always begin with the **nearest parent** contact-center AI docs `AGENTS.md` (for example, the root `ai-docs/AGENTS.md` at the repository root).
- **Process:** 
  - Load and follow the instructions and templates in that parent `AGENTS.md`.
  - Only after a parent `AGENTS.md` explicitly routes you to this file should you treat this document as package-specific guidance.
- **Never** skip the parent `AGENTS.md` even if the user prompt directly mentions this specific package or file.

Once you have gone through the root `AGENTS.md` and been routed here, you can use the rest of this file as the authoritative reference for `@webex/cc-components`. 

## Overview

The User State widget provides a user interface for contact center agents to manage their availability status. It handles agent state transitions (Available, Idle with various reasons), displays state duration timers, and manages idle code selection. The widget integrates with the Webex Contact Center SDK and follows the standard three-layer architecture pattern (Widget → Hook → Component → Store).

**Package:** `@webex/cc-user-state`

**Version:** See [package.json](../package.json)

---

## Why and What is This Widget Used For?

### Purpose

The User State widget enables contact center agents to:
- **Change their availability state** (Available, Idle, etc.)
- **Select idle codes** for different idle reasons (Break, Lunch, Meeting, etc.)
- **View state duration** with real-time timer display
- **Track idle code duration** separately from overall state duration
- **Receive state change notifications** via callbacks

### Key Capabilities

- **State Management**: Toggle between Available and various Idle states
- **Idle Code Support**: Dropdown selection for different idle reasons
- **Real-Time Timers**: Displays elapsed time in current state using Web Worker
- **Dual Timer Support**: Tracks both state duration and idle code duration
- **State Change Callbacks**: Extensible callback for state change events
- **Automatic State Sync**: Syncs state changes with backend via SDK
- **Error Handling**: Comprehensive error boundary with callback support

---

## Examples and Use Cases

### Getting Started

#### Basic Usage (React)

```typescript
import { UserState } from '@webex/cc-user-state';
import React from 'react';

function MyApp() {
  const handleStateChange = (newState) => {
    console.log('Agent state changed to:', newState);
    // Update your application state
  };

  return (
    <UserState
      onStateChange={handleStateChange}
    />
  );
}
```

#### Web Component Usage

```html
<!-- Include the widget bundle -->
<script src="path/to/cc-widgets.js"></script>

<!-- Use the web component -->
<cc-user-state></cc-user-state>

<script>
  const widget = document.querySelector('cc-user-state');
  
  widget.addEventListener('statechange', (event) => {
    console.log('Agent state changed:', event.detail);
  });
</script>
```

#### With State Change Tracking

```typescript
import { UserState } from '@webex/cc-user-state';
import React, { useState } from 'react';

function AgentDashboard() {
  const [currentState, setCurrentState] = useState(null);
  const [stateHistory, setStateHistory] = useState([]);

  const handleStateChange = (newState) => {
    setCurrentState(newState);
    setStateHistory(prev => [...prev, {
      state: newState,
      timestamp: new Date()
    }]);
    console.log('State changed to:', newState.name);
  };

  return (
    <div>
      <h2>Current State: {currentState?.name || 'Unknown'}</h2>
      <UserState onStateChange={handleStateChange} />
      
      <div>
        <h3>State History</h3>
        {stateHistory.map((entry, idx) => (
          <div key={idx}>
            {entry.state.name} - {entry.timestamp.toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Common Use Cases

#### 1. Agent Status Display

```typescript
// Display agent's current status with timer
import { UserState } from '@webex/cc-user-state';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const AgentStatusPanel = observer(() => {
  const { currentState, idleCodes } = store;
  
  const handleStateChange = (newState) => {
    console.log(`Agent changed to: ${newState.name}`);
    // Store automatically updates
  };

  return (
    <div className="agent-panel">
      <h3>Your Status</h3>
      <UserState onStateChange={handleStateChange} />
      <p>Current: {currentState}</p>
    </div>
  );
});
```

#### 2. Supervisor Dashboard Integration

```typescript
// Track multiple agents' state changes
import { UserState } from '@webex/cc-user-state';

function SupervisorDashboard({ agentId }) {
  const handleAgentStateChange = (state) => {
    // Send state change to analytics
    trackAgentState(agentId, state);
    
    // Update dashboard
    updateAgentStatus(agentId, state.name);
    
    // Check if agent needs assistance
    if (state.name === 'Idle' && state.duration > 900) {
      notifySupervisor(`Agent ${agentId} idle for 15+ minutes`);
    }
  };

  return <UserState onStateChange={handleAgentStateChange} />;
}
```

#### 3. State Change Validation

```typescript
// Validate state changes before allowing
import { UserState } from '@webex/cc-user-state';
import store from '@webex/cc-store';

function ValidatedUserState() {
  const handleStateChange = (newState) => {
    // Check if agent has pending tasks
    if (newState.name === 'Idle' && store.hasActiveTasks) {
      showWarning('Please complete active tasks before going idle');
      // State change will be rejected by store
      return;
    }
    
    // Log state change
    auditLog('State change', {
      agent: store.agentId,
      from: store.currentState,
      to: newState.name,
      timestamp: Date.now()
    });
    
    console.log('State change approved:', newState);
  };

  return <UserState onStateChange={handleStateChange} />;
}
```

#### 4. Custom Error Handling

```typescript
import store from '@webex/cc-store';

// Set error callback before rendering widget
store.onErrorCallback = (componentName, error) => {
  console.error(`Error in ${componentName}:`, error);
  
  // Notify user
  showErrorNotification('Failed to update state. Please try again.');
  
  // Send to error tracking
  trackError(componentName, error);
};

// Widget will call this callback on errors
<UserState onStateChange={handleStateChange} />
```

### Integration Patterns

#### With Agent Desktop

```typescript
import { UserState } from '@webex/cc-user-state';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const AgentDesktop = observer(() => {
  const { isAgentLoggedIn, currentState } = store;

  const handleStateChange = (newState) => {
    // Update local UI
    updateHeaderStatus(newState.name);
    
    // Log to analytics
    logStateChange(newState);
  };

  if (!isAgentLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="desktop">
      <header>
        <UserState onStateChange={handleStateChange} />
      </header>
      <main>
        <TaskPanel />
        <CustomerInfo />
      </main>
    </div>
  );
});
```

#### With Idle Code Management

```typescript
import { UserState } from '@webex/cc-user-state';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const StateManager = observer(() => {
  const { idleCodes, currentState } = store;

  const handleStateChange = (state) => {
    console.log('State changed:', state);
    
    // Log idle code if applicable
    if (state.name !== 'Available' && 'id' in state) {
      console.log('Idle code selected:', state.id);
      logIdleCode(state.id, state.name);
    }
  };

  return (
    <div>
      <UserState onStateChange={handleStateChange} />
      
      <div className="info">
        <p>Available idle codes: {idleCodes.length}</p>
        <p>Current state: {currentState}</p>
      </div>
    </div>
  );
});
```

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@webex/cc-components` | React UI components |
| `@webex/cc-store` | MobX singleton store for state management |
| `mobx-react-lite` | React bindings for MobX |
| `react-error-boundary` | Error boundary implementation |
| `typescript` | TypeScript support |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `react` | React framework |
| `react-dom` | React DOM rendering |

### Development Dependencies

Key development tools (see [package.json](../package.json) for versions):
- TypeScript
- Jest (testing)
- Webpack (bundling)
- ESLint (linting)

### External SDK Dependency

The widget requires the **Webex Contact Center SDK** (`@webex/contact-center`) to be initialized and available through the store. The SDK provides:
- `setAgentState()` - Updates agent state (Available/Idle)
- Agent state events - Notifies on state changes
- Idle code management - Provides available idle codes

### Web Worker

The widget uses a **Web Worker** for accurate timer management:
- Runs timer in background thread
- Prevents main thread blocking
- Ensures accurate elapsed time tracking
- Automatically cleaned up on unmount

---

## Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onStateChange` | `(state: IdleCode \| CustomState) => void` | No | - | Callback when agent state changes |

**State Object:**

```typescript
// IdleCode (from idle codes list)
interface IdleCode {
  id: string;          // Idle code ID
  name: string;        // Display name (e.g., "Break", "Lunch")
  // ... other properties
}

// CustomState (for custom states)
interface CustomState {
  developerName: string;
  // ... custom properties
}
```

---

## Installation

```bash
# Install as part of contact center widgets
yarn add @webex/cc-user-state

# Or install the entire widgets bundle
yarn add @webex/cc-widgets
```

---

## Additional Resources

For detailed component architecture, data flows, and sequence diagrams, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_

