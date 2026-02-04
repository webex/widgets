# React Patterns

> Quick reference for LLMs working with React in this repository.

---

## Rules

- **Component style**
  - **MUST** use functional components with hooks
  - **MUST NOT** use class components

- **Three-layer architecture (Widget → Hook → Component)**
  - **MUST** follow the pattern: **Widget → Hook → Presentational Component**
  - **MUST** encapsulate business logic and SDK calls inside custom hooks (`helper.ts`)
  - **MUST** keep presentational components in the `cc-components` package
  - **MUST NOT** access store directly in presentational components
  - **MUST NOT** call SDK methods directly from widgets or presentational components (only from hooks)

- **MobX + Error handling**
  - **MUST** wrap every widget with `ErrorBoundary` from `react-error-boundary`
  - **MUST** use `observer` from `mobx-react-lite` for widgets that access the store

---

## Three-Layer Architecture

```
┌─────────────────────────────────────┐
│  Widget (observer)                  │  ← MobX observer, ErrorBoundary wrapper
│  packages/*/src/{widget}/index.tsx  │
├─────────────────────────────────────┤
│  Custom Hook                        │  ← Business logic, SDK calls, events
│  packages/*/src/helper.ts           │
├─────────────────────────────────────┤
│  Presentational Component           │  ← Pure UI, props only
│  packages/cc-components/src/...     │
└─────────────────────────────────────┘
```

---
## Widget Pattern

```typescript
// index.tsx
import { observer } from 'mobx-react-lite';
import { ErrorBoundary } from 'react-error-boundary';
import store from '@webex/cc-store';
import { UserStateComponent } from '@webex/cc-components';
import { useUserState } from '../helper';
import { IUserStateProps } from './user-state.types';

const UserStateInternal: React.FC<IUserStateProps> = observer((props) => {
  const { onStateChange } = props;
  
  // Get data from store
  const { cc, idleCodes, currentState, agentId } = store;

  // Use custom hook for logic
  const { selectedState, isLoading, handleSetState } = useUserState({
    cc,
    idleCodes,
    currentState,
    onStateChange,
  });

  // Render presentational component
  return (
    <UserStateComponent
      idleCodes={idleCodes}
      currentState={currentState}
      selectedState={selectedState}
      isLoading={isLoading}
      onStateSelect={handleSetState}
    />
  );
});

const UserState: React.FC<IUserStateProps> = (props) => (
  <ErrorBoundary
    fallbackRender={() => <></>}
    onError={(error) => store.onErrorCallback?.('UserState', error)}
  >
    <UserStateInternal {...props} />
  </ErrorBoundary>
);

export { UserState };
```

---

## Error Boundary Pattern

**ALWAYS wrap widgets with this pattern:**

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

// Internal observer component
const UserStateInternal: React.FC<IUserStateProps> = observer((props) => {
  // Widget logic here
  return <UserStateComponent {...componentProps} />;
});

// External wrapper with ErrorBoundary
const UserState: React.FC<IUserStateProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) {
          store.onErrorCallback('UserState', error);
        }
      }}
    >
      <UserStateInternal {...props} />
    </ErrorBoundary>
  );
};

export { UserState };
```

---

## Custom Hook Pattern

**ALWAYS encapsulate business logic in hooks:**

```typescript
// helper.ts
export const useUserState = (props: UseUserStateProps) => {
  const { cc, idleCodes, currentState, onStateChange } = props;
  
  const [selectedState, setSelectedState] = useState<IdleCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Event listener setup
  useEffect(() => {
    const handleStateChange = (data: StateChangeEvent) => {
      setSelectedState(data.state);
      onStateChange?.(data.state);
    };

    cc.on(CC_EVENTS.AGENT_STATE_CHANGED, handleStateChange);
    
    return () => {
      cc.off(CC_EVENTS.AGENT_STATE_CHANGED, handleStateChange);
    };
  }, [cc, onStateChange]);

  // Action handler
  const handleSetState = useCallback(async (state: IdleCode) => {
    setIsLoading(true);
    try {
      await cc.setAgentState(state);
    } catch (error) {
      console.error('Failed to set state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cc]);

  return {
    selectedState,
    isLoading,
    handleSetState,
  };
};
```

---


## Presentational Component Pattern

```typescript
// cc-components/src/components/UserState/UserState.tsx
import React from 'react';
import { IUserStateComponentProps } from './user-state.types';

export const UserStateComponent: React.FC<IUserStateComponentProps> = ({
  idleCodes,
  currentState,
  selectedState,
  isLoading,
  onStateSelect,
}) => {
  return (
    <div className="user-state">
      {idleCodes.map((code) => (
        <button
          key={code.id}
          onClick={() => onStateSelect(code)}
          disabled={isLoading}
          className={currentState === code.id ? 'active' : ''}
        >
          {code.name}
        </button>
      ))}
    </div>
  );
};
```

---

## useEffect Cleanup Pattern

**ALWAYS clean up event listeners and subscriptions:**

```typescript
useEffect(() => {
  const handler = (data: EventData) => {
    // Handle event
  };

  cc.on(CC_EVENTS.SOME_EVENT, handler);
  
  // Cleanup function
  return () => {
    cc.off(CC_EVENTS.SOME_EVENT, handler);
  };
}, [cc]);
```

---

## useCallback Pattern

**ALWAYS use useCallback for handlers passed to child components:**

```typescript
const handleClick = useCallback((id: string) => {
  // Handle click
}, [dependency1, dependency2]);
```

---

## Conditional Rendering Pattern

```typescript
// Loading state
if (isLoading) {
  return <Spinner />;
}

// Error state
if (error) {
  return <ErrorMessage error={error} />;
}

// Empty state
if (!data || data.length === 0) {
  return <EmptyState message="No items found" />;
}

// Normal render
return <DataList items={data} />;
```

---

## Props Destructuring Pattern

```typescript
const Component: React.FC<IComponentProps> = ({
  prop1,
  prop2,
  optionalProp = 'default',
  onCallback,
}) => {
  // Component logic
};
```

---

## Related

- [TypeScript Patterns](./typescript-patterns.md)
- [MobX Patterns](./mobx-patterns.md)
- [Web Component Patterns](./web-component-patterns.md)
- [Testing Patterns](./testing-patterns.md)
