# UI Logging - Metrics Tracking Utility

## AI Agent Routing (Do Not Start Here)

If you are an AI assistant or tool reading this file **as your first entry point**, do **not** start your reasoning or code generation workflow from here.

- **Primary entrypoint:** Always begin with the **nearest parent** contact-center AI docs `AGENTS.md` (for example, the root `ai-docs/AGENTS.md` at the repository root).
- **Process:**
  - Load and follow the instructions and templates in that parent `AGENTS.md`.
  - Only after a parent `AGENTS.md` explicitly routes you to this file should you treat this document as package-specific guidance.
- **Never** skip the parent `AGENTS.md` even if the user prompt directly mentions this specific package or file.

Once you have gone through the parent `AGENTS.md` and been routed here, you can use the rest of this file as the authoritative reference for the `@webex/cc-ui-logging` package.

## Overview

UI Logging is a lightweight utility package that provides logging and metrics tracking capabilities for contact center widgets. It includes a Higher-Order Component (HOC) called `withMetrics` that automatically tracks widget lifecycle events, and a `logMetrics` function for custom event logging.

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
- **[WIP]Optimizes re-renders** - Includes shallow props comparison for performance

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

### Common Use Cases

#### 1. Tracking Widget Lifecycle

```typescript
import { withMetrics } from '@webex/cc-ui-logging';
import { StationLogin } from '@webex/cc-widget';

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

````typescript
import { withMetrics } from '@webex/cc-ui-logging';
import { ErrorBoundary } from 'react-error-boundary';

const UserStateInternal = observer(({ onStateChange }) => {
  const props = {
    idleCodes: store.idleCodes,
    currentState: store.currentState,
    setAgentStatus: (code) => store.setCurrentState(code),
    onStateChange,
  };

  return <UserStateComponent {...props} />;
});

function Widget(props) {
  const handleError = (error: Error) => {
    // Log error via metrics
  };

  return (
    <ErrorBoundary onError={handleError}>
      <UserStateInternal {...props} />
    </ErrorBoundary>
  );
}
---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package           | Purpose                            |
| ----------------- | ---------------------------------- |
| `@webex/cc-store` | Access to store.logger for logging |

### Peer Dependencies

| Package     | Purpose                   |
| ----------- | ------------------------- |
| `react`     | React framework (for HOC) |
| `react-dom` | React DOM (for HOC)       |

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
): React.MemoExoticComponent<React.FC<P>>;
````

**Parameters:**

- `Component` - React component to wrap
- `widgetName` - Name for metric identification

**Returns:** Memoized component with automatic metrics tracking

**Behavior:**

- Wraps component with React.memo
- Logs WIDGET_MOUNTED on mount
- Logs WIDGET_UNMOUNTED on unmount

---

### logMetrics Function

```typescript
function logMetrics(metric: WidgetMetrics): void;

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

## Installation

```bash
# Install as dependency
yarn add @webex/cc-widget

# Used internally by widgets, usually not directly installed
```

---

## Additional Resources

For detailed HOC implementation, metrics flow, and performance optimization, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_
