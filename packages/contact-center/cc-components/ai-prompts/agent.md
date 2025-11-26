# CC Components Library

## Overview

The CC Components library is a shared React component library that provides presentational components for building contact center widgets. It contains all the UI components used by widgets like StationLogin, UserState, TaskList, CallControl, and more. These components are built using Momentum UI and follow a consistent design system.

**Package:** `@webex/cc-components`

**Version:** See [package.json](../package.json)

---

## Why and What is This Library Used For?

### Purpose

The CC Components library serves as the presentation layer for contact center widgets. It:
- **Provides reusable UI components** for all contact center widgets
- **Maintains consistent design** using Momentum UI components
- **Separates presentation from business logic** following best practices
- **Integrates metrics tracking** via the ui-logging package
- **Exports type definitions** for TypeScript support

### Key Capabilities

- **Component Library**: Pre-built, tested UI components for common contact center scenarios
- **Momentum UI Integration**: Built on top of @momentum-ui/react-collaboration
- **Type Safety**: Full TypeScript support with exported interfaces
- **Metrics Ready**: Components can be wrapped with metrics HOC
- **Store Integration**: Components consume data from @webex/cc-store
- **Dual Exports**: Both React components and Web Component-ready builds

---

## Examples and Use Cases

### Getting Started

#### Basic Component Import (React)

```typescript
import { StationLoginComponent } from '@webex/cc-components';
import React from 'react';

function MyCustomLogin() {
  const props = {
    teams: ['Team A', 'Team B'],
    loginOptions: ['BROWSER', 'EXTENSION'],
    deviceType: 'BROWSER',
    login: () => console.log('Login called'),
    // ... other required props
  };

  return <StationLoginComponent {...props} />;
}
```

#### Using UserStateComponent

```typescript
import { UserStateComponent } from '@webex/cc-components';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const UserStateWrapper = observer(() => {
  const props = {
    idleCodes: store.idleCodes,
    currentState: store.currentState,
    setAgentStatus: (code) => console.log('Status changed:', code),
    elapsedTime: 120,
    // ... other props
  };

  return <UserStateComponent {...props} />;
});
```

### Common Use Cases

#### 1. Building Custom Widgets

```typescript
import { TaskListComponent } from '@webex/cc-components';
import store from '@webex/cc-store';
import { observer } from 'mobx-react-lite';

const CustomTaskList = observer(() => {
  const handleTaskSelect = (taskId: string) => {
    console.log('Task selected:', taskId);
    // Custom handling logic
  };

  return (
    <TaskListComponent
      tasks={store.tasks}
      selectedTaskId={store.selectedTaskId}
      onTaskSelected={handleTaskSelect}
      logger={store.logger}
    />
  );
});
```

#### 2. Extending Components with Custom Logic

```typescript
import { CallControlComponent } from '@webex/cc-components';
import { useCallback } from 'react';

function EnhancedCallControl({ taskId }) {
  const handleHold = useCallback(() => {
    // Add analytics tracking
    trackEvent('call_hold_clicked', { taskId });
    
    // Call original handler
    return store.holdCall(taskId);
  }, [taskId]);

  return (
    <CallControlComponent
      task={store.getTask(taskId)}
      onHoldResume={handleHold}
      // ... other props
    />
  );
}
```

#### 3. Using Type Definitions

```typescript
import type { 
  StationLoginComponentProps, 
  IUserState,
  UserStateComponentsProps 
} from '@webex/cc-components';

// Type-safe prop interfaces
const loginProps: StationLoginComponentProps = {
  teams: ['Team A'],
  loginOptions: ['BROWSER'],
  deviceType: 'BROWSER',
  login: () => {},
  // TypeScript ensures all required props are present
};
```

#### 4. Integration with Metrics HOC

```typescript
import { StationLoginComponent } from '@webex/cc-components';
import { withMetrics } from '@webex/cc-ui-logging';

// Wrap component with metrics tracking
const StationLoginWithMetrics = withMetrics(
  StationLoginComponent, 
  'StationLoginComponent'
);

// Use the wrapped component
function App() {
  return <StationLoginWithMetrics {...props} />;
}
```

### Integration Patterns

#### With Custom Styling

```typescript
import { UserStateComponent } from '@webex/cc-components';
import './custom-user-state.scss'; // Your custom styles

// Components use BEM naming, easy to override
function StyledUserState(props) {
  return (
    <div className="my-custom-wrapper">
      <UserStateComponent {...props} />
    </div>
  );
}
```

#### With Error Boundaries

```typescript
import { IncomingTaskComponent } from '@webex/cc-components';
import { ErrorBoundary } from 'react-error-boundary';

function SafeIncomingTask(props) {
  return (
    <ErrorBoundary fallback={<div>Error loading task</div>}>
      <IncomingTaskComponent {...props} />
    </ErrorBoundary>
  );
}
```

#### Creating Composite Components

```typescript
import { 
  CallControlComponent,
  TaskListComponent 
} from '@webex/cc-components';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

// Combine multiple components
const TaskPanel = observer(() => {
  const selectedTask = store.selectedTask;

  return (
    <div className="task-panel">
      <TaskListComponent 
        tasks={store.tasks}
        onTaskSelected={(id) => store.setSelectedTask(id)}
      />
      {selectedTask && (
        <CallControlComponent 
          task={selectedTask}
          onEnd={() => store.endTask(selectedTask.id)}
        />
      )}
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
| `@momentum-ui/illustrations` | Momentum UI illustration assets |
| `@r2wc/react-to-web-component` | React to Web Component conversion (for wc.ts export) |
| `@webex/cc-store` | MobX singleton store for state management |
| `@webex/cc-ui-logging` | Metrics tracking utilities |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `@momentum-ui/react-collaboration` | Momentum UI React components |
| `react` | React framework |
| `react-dom` | React DOM rendering |

### Development Dependencies

Key development tools (see [package.json](../package.json) for versions):
- TypeScript
- Jest (testing)
- Webpack (bundling)
- ESLint (linting)
- React Testing Library

---

## Exported Components

### Main Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `StationLoginComponent` | Agent station login UI | `teams`, `loginOptions`, `deviceType`, `login`, `logout` |
| `UserStateComponent` | Agent state management UI | `idleCodes`, `currentState`, `setAgentStatus`, `elapsedTime` |
| `CallControlComponent` | Call control buttons | `task`, `onHoldResume`, `onEnd`, `onWrapUp` |
| `CallControlCADComponent` | CAD-enabled call control | `task`, `onHoldResume`, `onEnd`, `cadVariables` |
| `IncomingTaskComponent` | Incoming task notifications | `incomingTask`, `onAccepted`, `onRejected` |
| `TaskListComponent` | Active tasks list | `tasks`, `selectedTaskId`, `onTaskSelected` |
| `OutdialCallComponent` | Outbound dialing UI | `entryPoints`, `addressBook`, `onDial` |

### Type Exports

```typescript
export * from './components/StationLogin/constants';
export * from './components/StationLogin/station-login.types';
export * from './components/UserState/user-state.types';
export * from './components/task/task.types';
```

### Dual Export Paths

```typescript
// React components (default export)
import { StationLoginComponent } from '@webex/cc-components';

// Web Component wrappers (for wc.ts export)
import { StationLoginComponent } from '@webex/cc-components/wc';
```

---

## Installation

```bash
# Install as part of contact center widgets development
yarn add @webex/cc-components

# Peer dependencies (required)
yarn add @momentum-ui/react-collaboration react react-dom
```

---

## Usage in Widget Development

### Creating a New Widget

```typescript
// 1. Create widget wrapper
import { StationLoginComponent } from '@webex/cc-components';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const MyWidget = observer((props) => {
  // 2. Add business logic/hooks
  const handleLogin = () => {
    // Business logic
  };

  // 3. Map store data to component props
  const componentProps = {
    teams: store.teams,
    loginOptions: store.loginOptions,
    deviceType: store.deviceType,
    login: handleLogin,
    ...props
  };

  // 4. Render component
  return <StationLoginComponent {...componentProps} />;
});
```

### Testing Components

```typescript
import { render } from '@testing-library/react';
import { StationLoginComponent } from '@webex/cc-components';

test('renders station login', () => {
  const props = {
    teams: ['Team A'],
    loginOptions: ['BROWSER'],
    deviceType: 'BROWSER',
    login: jest.fn(),
    // ... minimal required props
  };

  const { getByText } = render(<StationLoginComponent {...props} />);
  expect(getByText('Login')).toBeInTheDocument();
});
```

---

## Additional Resources

For detailed component architecture, integration patterns, and troubleshooting, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_

