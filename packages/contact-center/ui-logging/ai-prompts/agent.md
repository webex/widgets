# UI Logging - Metrics Tracking Utility

## Overview

UI Logging is a lightweight utility package that provides metrics tracking capabilities for contact center widgets. It includes a Higher-Order Component (HOC) called `withMetrics` that automatically tracks widget lifecycle events, and a `logMetrics` function for custom event logging.

**Package:** `@webex/cc-ui-logging`

**Version:** See [package.json](../package.json)

---

## Why and What is This Package Used For?

### Purpose

The UI Logging package enables observability and monitoring for contact center widgets. It:
- **Tracks widget lifecycle** - Automatically logs mount, unmount, and updates
- **Provides HOC wrapper** - Easy integration with minimal code changes
- **Logs to store logger** - Integrates with existing logging infrastructure
- **Supports custom metrics** - Log custom events with additional context
- **Optimizes re-renders** - Includes shallow props comparison for performance

### Key Capabilities

- **withMetrics HOC**: Wraps components to auto-track lifecycle events
- **logMetrics Function**: Manually log custom events
- **havePropsChanged Utility**: Shallow comparison to prevent unnecessary re-renders
- **Type-Safe**: Full TypeScript support with WidgetMetrics type
- **Store Integration**: Uses store.logger for centralized logging

---

## Examples and Use Cases

### Getting Started

#### Basic HOC Usage

```typescript
import { withMetrics } from '@webex/cc-ui-logging';
import MyWidget from './MyWidget';

// Wrap your widget with metrics tracking
const MyWidgetWithMetrics = withMetrics(MyWidget, 'MyWidget');

// Use the wrapped component
function App() {
  return <MyWidgetWithMetrics prop1="value" />;
}

// Automatically logs:
// - WIDGET_MOUNTED when component mounts
// - WIDGET_UNMOUNTED when component unmounts
```

#### Manual Metrics Logging

```typescript
import { logMetrics } from '@webex/cc-ui-logging';

function MyComponent() {
  const handleButtonClick = () => {
    // Log custom event
    logMetrics({
      widgetName: 'MyComponent',
      event: 'ERROR',
      timestamp: Date.now(),
      additionalContext: {
        errorCode: 'LOGIN_FAILED',
        reason: 'Invalid credentials'
      }
    });
  };

  return <button onClick={handleButtonClick}>Login</button>;
}
```

### Common Use Cases

#### 1. Tracking Widget Lifecycle

```typescript
import { withMetrics } from '@webex/cc-ui-logging';
import { StationLogin } from './StationLogin';

// Automatically tracks mount/unmount
const StationLoginWithMetrics = withMetrics(
  StationLogin, 
  'StationLogin'
);

// When used in app:
<StationLoginWithMetrics />

// Logs on mount:
// {
//   widgetName: 'StationLogin',
//   event: 'WIDGET_MOUNTED',
//   timestamp: 1700000000000
// }

// Logs on unmount:
// {
//   widgetName: 'StationLogin',
//   event: 'WIDGET_UNMOUNTED',
//   timestamp: 1700000100000
// }
```

#### 2. Logging Errors

```typescript
import { logMetrics } from '@webex/cc-ui-logging';

function UserState() {
  const handleStateChange = async (newState) => {
    try {
      await updateState(newState);
    } catch (error) {
      // Log error with context
      logMetrics({
        widgetName: 'UserState',
        event: 'ERROR',
        timestamp: Date.now(),
        props: { attemptedState: newState },
        additionalContext: {
          error: error.message,
          stack: error.stack
        }
      });
    }
  };

  return <button onClick={() => handleStateChange('Idle')}>Go Idle</button>;
}
```

#### 3. Performance Tracking

```typescript
import { logMetrics } from '@webex/cc-ui-logging';
import { useEffect } from 'react';

function TaskList({ tasks }) {
  useEffect(() => {
    const startTime = performance.now();
    
    // Render tasks
    renderTasks(tasks);
    
    const endTime = performance.now();
    
    // Log render performance
    logMetrics({
      widgetName: 'TaskList',
      event: 'WIDGET_MOUNTED',
      timestamp: Date.now(),
      additionalContext: {
        renderTime: endTime - startTime,
        taskCount: tasks.length
      }
    });
  }, [tasks]);

  return <div>{/* task list */}</div>;
}
```

#### 4. User Interaction Tracking

```typescript
import { logMetrics } from '@webex/cc-ui-logging';

function CallControl({ task }) {
  const handleHold = () => {
    logMetrics({
      widgetName: 'CallControl',
      event: 'WIDGET_MOUNTED', // Using WIDGET_MOUNTED for custom events
      timestamp: Date.now(),
      props: { taskId: task.id },
      additionalContext: {
        action: 'hold_clicked',
        callDuration: task.duration
      }
    });

    // Perform hold action
    task.hold();
  };

  return <button onClick={handleHold}>Hold</button>;
}
```

### Integration Patterns

#### With Widget Components

```typescript
import { withMetrics } from '@webex/cc-ui-logging';
import { observer } from 'mobx-react-lite';
import { UserStateComponent } from '@webex/cc-components';
import store from '@webex/cc-store';

// 1. Create internal component
const UserStateInternal = observer(({ onStateChange }) => {
  const props = {
    idleCodes: store.idleCodes,
    currentState: store.currentState,
    setAgentStatus: (code) => store.setCurrentState(code),
    onStateChange,
  };

  return <UserStateComponent {...props} />;
});

// 2. Wrap with metrics HOC
const UserState = withMetrics(UserStateInternal, 'UserState');

export { UserState };
```

#### With Error Boundaries

```typescript
import { logMetrics } from '@webex/cc-ui-logging';
import { ErrorBoundary } from 'react-error-boundary';

function Widget(props) {
  const handleError = (error: Error) => {
    // Log error via metrics
    logMetrics({
      widgetName: 'MyWidget',
      event: 'ERROR',
      timestamp: Date.now(),
      additionalContext: {
        error: error.message,
        componentStack: error.stack
      }
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <MyWidget {...props} />
    </ErrorBoundary>
  );
}
```

#### Custom Metrics in Hooks

```typescript
import { logMetrics } from '@webex/cc-ui-logging';
import { useEffect } from 'react';

function useCustomHook(widgetName: string) {
  useEffect(() => {
    // Log when hook initializes
    logMetrics({
      widgetName,
      event: 'WIDGET_MOUNTED',
      timestamp: Date.now(),
      additionalContext: {
        hookInitialized: true
      }
    });

    return () => {
      // Log when hook cleans up
      logMetrics({
        widgetName,
        event: 'WIDGET_UNMOUNTED',
        timestamp: Date.now()
      });
    };
  }, [widgetName]);
}
```

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@webex/cc-store` | Access to store.logger for logging |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `react` | React framework (for HOC) |
| `react-dom` | React DOM (for HOC) |

### Development Dependencies

Key development tools (see [package.json](../package.json) for versions):
- TypeScript
- Jest (testing)
- Webpack (bundling)

---

## API Reference

### withMetrics HOC

```typescript
function withMetrics<P extends object>(
  Component: React.ComponentType<P>,
  widgetName: string
): React.MemoExoticComponent<React.FC<P>>
```

**Parameters:**
- `Component` - React component to wrap
- `widgetName` - Name for metric identification

**Returns:** Memoized component with automatic metrics tracking

**Behavior:**
- Wraps component with React.memo
- Uses custom comparison function (`havePropsChanged`)
- Logs WIDGET_MOUNTED on mount
- Logs WIDGET_UNMOUNTED on unmount

---

### logMetrics Function

```typescript
function logMetrics(metric: WidgetMetrics): void

type WidgetMetrics = {
  widgetName: string;
  event: 'WIDGET_MOUNTED' | 'ERROR' | 'WIDGET_UNMOUNTED' | 'PROPS_UPDATED';
  props?: Record<string, any>;
  timestamp: number;
  additionalContext?: Record<string, any>;
};
```

**Parameters:**
- `metric.widgetName` - Widget identifier
- `metric.event` - Event type
- `metric.props` - Optional widget props snapshot
- `metric.timestamp` - Unix timestamp
- `metric.additionalContext` - Optional additional data

**Behavior:**
- Checks if `store.logger` exists
- Logs warning if no logger available
- Calls `store.logger.log()` with formatted JSON

---

### havePropsChanged Function

```typescript
function havePropsChanged(prev: any, next: any): boolean
```

**Parameters:**
- `prev` - Previous props object
- `next` - Next props object

**Returns:** `true` if props have changed, `false` otherwise

**Behavior:**
- Performs shallow comparison
- Compares object keys length
- Compares primitive values
- Does NOT deep compare nested objects
- Used by React.memo to prevent re-renders

---

## Installation

```bash
# Install as development or runtime dependency
yarn add @webex/cc-ui-logging

# Used internally by widgets, usually not directly installed
```

---

## Additional Resources

For detailed HOC implementation, metrics flow, and performance optimization, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_

