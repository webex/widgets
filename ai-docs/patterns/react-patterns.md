# React Patterns

---
Technology: React
Configuration: See [package.json](../../packages/contact-center/*/package.json) for version
Dependencies: See individual [package.json](../../packages/contact-center/*/package.json) files
Scope: Repository-wide
Last Updated: 2025-11-23
---

> **For LLM Agents**: Add this file to context when working on React components, hooks, or component composition.
>
> **For Developers**: Update this file when committing React pattern changes.

---

## Summary

The codebase uses **React 18+ functional components** with **hooks** exclusively. The architecture follows a **three-layer pattern**: Widget components (MobX observers) → Custom hooks (business logic) → Presentational components (cc-components). Every widget is wrapped in `ErrorBoundary` from `react-error-boundary` with telemetry reporting. Custom hooks encapsulate SDK interactions, event listeners, and state management.

---

## Component Architecture

### 1. **Three-Layer Component Pattern**

**Layer 1: Widget Components (Observers)**
- Located in widget packages (`station-login`, `user-state`, `task/*`)
- Import and observe store state
- Wrapped with `ErrorBoundary`
- Minimal logic, delegate to custom hooks

**Layer 2: Custom Hooks**
- Located in `helper.ts` files in each widget package
- Encapsulate business logic, SDK calls, event listeners
- Manage local state with `useState`, `useRef`
- Return handlers and computed values

**Layer 3: Presentational Components**
- Located in `cc-components` package
- Pure UI rendering with props
- No store access, no SDK interactions
- Reusable across widgets

---

## Error Boundary Pattern

### **Standard Error Boundary Wrapper**

**Every widget follows this exact pattern:**

```typescript
import {ErrorBoundary} from 'react-error-boundary';
import store from '@webex/cc-store';

// Internal observer component
const WidgetInternal: React.FunctionComponent<Props> = observer((props) => {
  // Widget logic
});

// External wrapper with ErrorBoundary
const Widget: React.FunctionComponent<Props> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('WidgetName', error);
      }}
    >
      <WidgetInternal {...props} />
    </ErrorBoundary>
  );
};

export {Widget};
```

**Key elements:**
1. **Two-component split**: `WidgetInternal` (observer) + `Widget` (wrapper)
2. **Empty fallback**: `fallbackRender={() => <></>}` - fails gracefully with no UI
3. **Error telemetry**: `store.onErrorCallback('WidgetName', error)` - reports to metrics
4. **Conditional callback**: `if (store.onErrorCallback)` - only call if registered

**Benefits:**
- Isolates errors to individual widgets
- Prevents entire app crashes
- Reports errors for debugging/analytics
- Clean separation between observer and error handling

---

## Observer Pattern

### **MobX Observer Usage**

```typescript
import {observer} from 'mobx-react-lite';
import store from '@webex/cc-store';

const StationLoginInternal: React.FunctionComponent<StationLoginProps> = observer(
  ({onLogin, onLogout, onCCSignOut, profileMode}) => {
    // 1. Destructure store values
    const {
      cc,
      teams,
      loginOptions,
      logger,
      isAgentLoggedIn,
      deviceType,
      dialNumber,
      setDeviceType,
      setDialNumber,
      teamId,
      setTeamId,
    } = store;

    // 2. Call custom hook with store values + props
    const result = useStationLogin({
      cc,
      onLogin,
      onLogout,
      logger,
      deviceType,
      dialNumber,
      teamId,
      isAgentLoggedIn,
      onCCSignOut,
    });

    // 3. Compose props from store + hook + props
    const props: StationLoginComponentProps = {
      ...result,
      setDeviceType,
      setDialNumber,
      teams,
      loginOptions,
      deviceType,
      isAgentLoggedIn,
      logger,
      profileMode,
    };

    // 4. Render presentational component
    return <StationLoginComponent {...props} />;
  }
);
```

**Pattern breakdown:**
1. **Import store** - singleton instance from `@webex/cc-store`
2. **Wrap with observer** - automatically tracks store reads
3. **Destructure store** - only extract what's needed
4. **Pass to hook** - combine store values with props
5. **Compose final props** - merge store, hook results, and incoming props
6. **Render dumb component** - pass everything to presentational layer

---

## Custom Hooks Patterns

### **1. Event Listener Hook Pattern**

```typescript
export const useIncomingTask = (props: UseTaskProps) => {
  const {onAccepted, onRejected, deviceType, incomingTask, logger} = props;

  // Define callbacks
  const taskAssignCallback = () => {
    try {
      if (onAccepted) onAccepted({task: incomingTask});
    } catch (error) {
      logger?.error(`Error in taskAssignCallback - ${error.message}`);
    }
  };

  const taskRejectCallback = () => {
    try {
      if (onRejected) onRejected({task: incomingTask});
    } catch (error) {
      logger?.error(`Error in taskRejectCallback - ${error.message}`);
    }
  };

  // Register event listeners on mount
  useEffect(() => {
    try {
      if (!incomingTask) return;
      
      // Register listeners
      store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask.data.interactionId);
      store.setTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask.data.interactionId);

      // Cleanup on unmount
      return () => {
        try {
          store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask.data.interactionId);
          store.removeTaskCallback(TASK_EVENTS.TASK_CONSULT_ACCEPTED, taskAssignCallback, incomingTask.data.interactionId);
          store.removeTaskCallback(TASK_EVENTS.TASK_END, taskRejectCallback, incomingTask.data.interactionId);
          store.removeTaskCallback(TASK_EVENTS.TASK_REJECT, taskRejectCallback, incomingTask.data.interactionId);
        } catch (error) {
          logger?.error(`Error in cleanup - ${error.message}`);
        }
      };
    } catch (error) {
      logger?.error(`Error in useIncomingTask useEffect - ${error.message}`);
    }
  }, [incomingTask]);

  // Return handlers
  const accept = () => {
    try {
      if (!incomingTask?.data.interactionId) return;
      incomingTask.accept().catch((error) => {
        logger.error(`Error accepting task: ${error}`);
      });
    } catch (error) {
      logger?.error(`Error in accept - ${error.message}`);
    }
  };

  return { incomingTask, accept, reject };
};
```

**Key patterns:**
- **Event listener registration** in `useEffect`
- **Cleanup function** to remove listeners on unmount
- **Dependency array** `[incomingTask]` - re-register when task changes
- **Try-catch everywhere** - defensive error handling
- **Logger context** - every log includes module + method
- **Return handlers** - expose actions to component

---

### **2. Web Worker Hook Pattern**

```typescript
export const useUserState = ({currentState, lastStateChangeTimestamp, logger, ...}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  // Define worker script inline
  const workerScript = `
    let intervalId;
    const startTimer = (startTime) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        self.postMessage({type: 'elapsedTime', elapsedTime});
      }, 1000);
    };
    const stopTimer = () => {
      if (intervalId) clearInterval(intervalId);
      self.postMessage({type: 'stop'});
    };
    self.onmessage = (event) => {
      if (event.data.type === 'start') {
        startTimer(event.data.startTime);
      }
      if (event.data.type === 'stop') {
        stopTimer();
      }
    };
  `;

  // Initialize worker
  useEffect(() => {
    try {
      const blob = new Blob([workerScript], {type: 'application/javascript'});
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);
      
      workerRef.current.postMessage({type: 'start', startTime: Date.now()});
      
      workerRef.current.onmessage = (event) => {
        if (event.data.type === 'elapsedTime') {
          setElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
        }
      };
    } catch (error) {
      logger?.error(`Error initializing worker - ${error.message}`);
    }

    // Cleanup worker on unmount
    return () => {
      try {
        if (workerRef.current) {
          workerRef.current.postMessage({type: 'stop'});
          workerRef.current.terminate();
          workerRef.current = null;
        }
      } catch (error) {
        logger?.error(`Error in cleanup - ${error.message}`);
      }
    };
  }, []);

  // Reset timer when timestamp changes
  useEffect(() => {
    try {
      if (workerRef.current && lastStateChangeTimestamp) {
        workerRef.current.postMessage({type: 'reset', startTime: lastStateChangeTimestamp});
      }
    } catch (error) {
      logger?.error(`Error in timestamp useEffect - ${error.message}`);
    }
  }, [lastStateChangeTimestamp]);

  return { elapsedTime };
};
```

**Key patterns:**
- **Inline worker script** - defined as string template
- **Blob + Object URL** - create worker from script
- **useRef for worker** - persist across renders
- **Message-based communication** - `postMessage` / `onmessage`
- **Cleanup termination** - terminate worker on unmount
- **Multiple useEffects** - separate concerns (init vs. reset)

---

### **3. Callback Hook Pattern**

```typescript
export const useCallControl = (props: useCallControlProps) => {
  const {currentTask, onHoldResume, onEnd, logger, ...} = props;
  
  // Define callbacks that invoke prop callbacks
  const holdCallback = () => {
    try {
      if (onHoldResume) {
        onHoldResume({
          isHeld: true,
          task: currentTask,
        });
      }
    } catch (error) {
      logger?.error(`Error in holdCallback - ${error.message}`);
    }
  };

  const endCallCallback = () => {
    try {
      if (onEnd) {
        onEnd({ task: currentTask });
      }
    } catch (error) {
      logger?.error(`Error in endCallCallback - ${error.message}`);
    }
  };

  // Register task event listeners
  useEffect(() => {
    if (!currentTask?.data?.interactionId) return;
    
    const interactionId = currentTask.data.interactionId;
    
    store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId);

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, interactionId);
      store.removeTaskCallback(TASK_EVENTS.TASK_END, endCallCallback, interactionId);
    };
  }, [currentTask]);

  // Return action handlers
  const toggleHold = (hold: boolean) => {
    try {
      if (hold) {
        currentTask.hold().catch((e) => logger.error(`Hold failed: ${e}`));
      } else {
        currentTask.resume().catch((e) => logger.error(`Resume failed: ${e}`));
      }
    } catch (error) {
      logger?.error(`Error in toggleHold - ${error.message}`);
    }
  };

  return { toggleHold };
};
```

**Pattern:**
- **Callback wrappers** - internal callbacks invoke props callbacks
- **Event-driven callbacks** - registered as task event listeners
- **Action handlers** - returned to component for user interactions
- **SDK call patterns** - always `.catch()` to handle errors

---

### **4. useCallback and useMemo**

```typescript
export const useCallControl = (props) => {
  const {deviceType, featureFlags, currentTask, logger} = props;
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);

  // Memoized callback with dependencies
  const loadBuddyAgents = useCallback(async () => {
    try {
      const agents = await store.getBuddyAgents();
      logger.info(`Loaded ${agents.length} buddy agents`);
      setBuddyAgents(agents);
    } catch (error) {
      logger?.error(`Error loading buddy agents - ${error.message || error}`);
      setBuddyAgents([]);
    }
  }, [logger]);

  const getEntryPoints = useCallback(
    async ({page, pageSize, search}: PaginatedListParams) => {
      try {
        return await store.getEntryPoints({page, pageSize, search});
      } catch (error) {
        logger?.error(`Error fetching entry points - ${error.message || error}`);
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
    },
    [logger]
  );

  // Memoized computed value
  const controlVisibility = useMemo(
    () => getControlsVisibility(deviceType, featureFlags, currentTask, logger),
    [deviceType, featureFlags, currentTask, logger]
  );

  return { loadBuddyAgents, getEntryPoints, controlVisibility };
};
```

**Pattern:**
- **useCallback** for async functions passed as props
- **useMemo** for expensive computations
- **Dependency arrays** carefully maintained
- **Error handling** in every async callback

---

### **5. State Management with useRef**

```typescript
export const useUserState = ({currentState, ...}) => {
  const prevStateRef = useRef(currentState);

  useEffect(() => {
    try {
      if (prevStateRef.current !== currentState) {
        // State changed, perform action
        updateAgentState(currentState)
          .then(() => {
            prevStateRef.current = currentState; // Update ref after success
            callOnStateChange();
          })
          .catch((error) => {
            logger.error(`Failed to update state: ${error}`);
          });
      }
    } catch (error) {
      logger?.error(`Error in currentState useEffect - ${error.message}`);
    }
  }, [currentState]);

  return { ... };
};
```

**Pattern:**
- **useRef for previous value** - detect changes
- **Update ref after success** - prevent re-triggering
- **Compare before action** - avoid unnecessary updates

---

## Presentational Component Patterns

### **1. Pure Functional Components**

```typescript
const UserStateComponent: React.FunctionComponent<UserStateComponentsProps> = (props) => {
  const {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    elapsedTime,
    currentState,
    customState,
    logger,
  } = props;

  // Local computed values with useMemo
  const previousSelectableState = useMemo(
    () => getPreviousSelectableState(idleCodes, logger),
    [idleCodes, logger]
  );
  
  const selectedKey = getSelectedKey(customState, currentState, idleCodes, logger);
  const items = buildDropdownItems(customState, idleCodes, currentState, logger);

  return (
    <div className="user-state-container" data-testid="user-state-container">
      <SelectNext
        selectedKey={selectedKey}
        onSelectionChange={(key: string) => handleSelectionChange(key, currentState, setAgentStatus, logger)}
        items={items}
      >
        {(item) => (
          <Item key={item.id} textValue={item.name}>
            <Icon name={getIconStyle(item, logger).iconName} />
            <Text>{item.name}</Text>
          </Item>
        )}
      </SelectNext>
      <Tooltip>
        <Text>{getTooltipText(customState, currentState, idleCodes, logger)}</Text>
      </Tooltip>
      <span className="elapsedTime">{formatTime(elapsedTime)}</span>
    </div>
  );
};

export default withMetrics(UserStateComponent, 'UserState');
```

**Patterns:**
- **All props passed in** - no external dependencies
- **useMemo for computations** - optimized rendering
- **Utility functions** - extracted to separate utils file
- **Data test IDs** - every element has `data-testid`
- **withMetrics HOC** - wraps component for telemetry

---

### **2. withMetrics HOC**

```typescript
import {withMetrics} from '@webex/cc-ui-logging';

const MyComponent: React.FunctionComponent<Props> = (props) => {
  // Component implementation
};

export default withMetrics(MyComponent, 'ComponentName');
```

**Pattern:**
- Last line of every presentational component
- Wraps component for performance/usage metrics
- Component name string for identification

---

## Component Composition

### **Standard Widget Structure**

```
packages/contact-center/station-login/
├── src/
│   ├── station-login/
│   │   ├── index.tsx          # Widget (observer + ErrorBoundary)
│   │   └── station-login.types.ts  # Widget-specific types
│   ├── helper.ts              # Custom hook (useStationLogin)
│   └── index.ts               # Package entry (exports widget)
└── tests/
    └── station-login/
        └── index.tsx          # Widget tests
```

**Flow:**
1. **index.tsx** - Widget component (observer wrapper)
2. **helper.ts** - Custom hook with business logic
3. **index.ts** - Re-exports widget for package consumers

---

## Hooks Usage Patterns

### **Common React Hooks**

| Hook | Usage | Pattern |
|------|-------|---------|
| `useState` | Local component state | `const [value, setValue] = useState(initialValue)` |
| `useEffect` | Side effects, event listeners | Always with cleanup function |
| `useRef` | Mutable refs, worker instances | `const ref = useRef<Type \| null>(null)` |
| `useCallback` | Memoize functions | For expensive functions or props |
| `useMemo` | Memoize values | For expensive computations |

### **Custom Hook Naming**

- **Pattern:** `use<WidgetName>` (e.g., `useStationLogin`, `useUserState`, `useCallControl`)
- **Location:** `helper.ts` in widget package
- **Exports:** Named export, not default

---

## Error Handling Patterns

### **1. Try-Catch Everywhere**

```typescript
const setAgentStatus = (selectedCode) => {
  try {
    logger.info('Updating currentState');
    store.setCurrentState(selectedCode);
  } catch (error) {
    logger?.error(`Error in setAgentStatus - ${error.message}`, {
      module: 'useUserState',
      method: 'setAgentStatus',
    });
  }
};
```

**Convention:**
- Every function wrapped in try-catch
- Log errors with context (module, method)
- Use optional chaining for logger (`logger?.error`)

---

### **2. Promise Error Handling**

```typescript
currentTask.accept()
  .catch((error) => {
    logger.error(`Error accepting task: ${error}`, {
      module: 'useIncomingTask',
      method: 'accept',
    });
  });
```

**Convention:**
- Always `.catch()` on promises
- Never rely on async/await without try-catch
- Log errors with context

---

### **3. SDK Call Pattern**

```typescript
const updateAgentState = (selectedCode) => {
  setIsSettingAgentStatus(true);
  
  return cc.setAgentState({state: chosenState, auxCodeId})
    .then((response) => {
      logger.log('Agent state set successfully');
      if ('data' in response) {
        store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
      }
    })
    .catch((error) => {
      logger.error(`Error setting agent state: ${error}`);
      store.setCurrentState(prevStateRef.current); // Rollback on error
      throw error;
    })
    .finally(() => {
      setIsSettingAgentStatus(false);
    });
};
```

**Pattern:**
- Set loading state before call
- Update store on success
- **Rollback on error** (restore previous state)
- Clear loading state in `finally`
- Re-throw error for upstream handling

---

## Key Conventions to Enforce

### ✅ DO:
1. **Use functional components only** - no class components
2. **Use `observer` from `mobx-react-lite`** for store-connected components
3. **Wrap every widget** with `ErrorBoundary` from `react-error-boundary`
4. **Split components** into Internal (observer) + Wrapper (ErrorBoundary)
5. **Extract business logic** to custom hooks in `helper.ts`
6. **Use try-catch** in every function
7. **Always cleanup** event listeners in `useEffect` return
8. **Add `data-testid`** to every interactive element
9. **Use `useCallback`** for functions passed as props
10. **Use `useMemo`** for expensive computations
11. **Log with context** (module, method) on every log
12. **Use `useRef`** for mutable values (workers, previous state)
13. **Destructure props** at top of component
14. **Return cleanup functions** from `useEffect`
15. **Use `withMetrics` HOC** on presentational components

### ❌ DON'T:
1. **Don't use class components** - functional only
2. **Don't import store** in presentational components
3. **Don't forget ErrorBoundary** on widgets
4. **Don't skip cleanup** in useEffect
5. **Don't ignore promise errors** - always `.catch()`
6. **Don't mutate refs** during render
7. **Don't use empty dependency arrays** without justification
8. **Don't skip try-catch** in event handlers
9. **Don't use inline functions** in props without useCallback (if expensive)
10. **Don't mix business logic** into presentational components

---

## Anti-Patterns Found

### 1. **Inconsistent dependency arrays**
Some `useEffect` hooks have incomplete dependency arrays.

**Recommendation:** Use ESLint `react-hooks/exhaustive-deps` rule.

---

### 2. **Worker script as string literal**
Web Workers defined as inline strings make testing difficult.

**Recommendation:** Extract to separate files when possible, or document pattern clearly.

---

## Examples to Reference

### Example 1: Complete Widget Structure
```typescript
// station-login/src/station-login/index.tsx
import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';
import {ErrorBoundary} from 'react-error-boundary';
import {StationLoginComponent} from '@webex/cc-components';
import {useStationLogin} from '../helper';

const StationLoginInternal: React.FunctionComponent<StationLoginProps> = observer(
  ({onLogin, onLogout, profileMode}) => {
    const {cc, teams, loginOptions, logger, isAgentLoggedIn} = store;
    
    const result = useStationLogin({
      cc, onLogin, onLogout, logger, isAgentLoggedIn
    });

    return <StationLoginComponent {...result} teams={teams} />;
  }
);

const StationLogin: React.FunctionComponent<StationLoginProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackRender={() => <></>}
      onError={(error: Error) => {
        if (store.onErrorCallback) store.onErrorCallback('StationLogin', error);
      }}
    >
      <StationLoginInternal {...props} />
    </ErrorBoundary>
  );
};

export {StationLogin};
```

### Example 2: Custom Hook with Event Listeners
```typescript
export const useIncomingTask = (props: UseTaskProps) => {
  const {incomingTask, onAccepted, logger} = props;

  const taskAssignCallback = () => {
    try {
      if (onAccepted) onAccepted({task: incomingTask});
    } catch (error) {
      logger?.error(`Error - ${error.message}`);
    }
  };

  useEffect(() => {
    if (!incomingTask) return;
    
    store.setTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask.data.interactionId);

    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_ASSIGNED, taskAssignCallback, incomingTask.data.interactionId);
    };
  }, [incomingTask]);

  const accept = () => {
    try {
      incomingTask.accept().catch((error) => logger.error(`Error: ${error}`));
    } catch (error) {
      logger?.error(`Error - ${error.message}`);
    }
  };

  return { accept };
};
```

---

## Files Analyzed

1. `/packages/contact-center/station-login/src/station-login/index.tsx` (77 lines)
2. `/packages/contact-center/user-state/src/user-state/index.tsx` (52 lines)
3. `/packages/contact-center/task/src/IncomingTask/index.tsx`
4. `/packages/contact-center/task/src/TaskList/index.tsx`
5. `/packages/contact-center/task/src/CallControl/index.tsx`
6. `/packages/contact-center/task/src/CallControlCAD/index.tsx`
7. `/packages/contact-center/station-login/src/helper.ts` (332 lines)
8. `/packages/contact-center/user-state/src/helper.ts` (296 lines)
9. `/packages/contact-center/task/src/helper.ts` (1002 lines)
10. `/packages/contact-center/cc-components/src/components/UserState/user-state.tsx` (100 lines)
11. `/packages/contact-center/cc-components/src/components/StationLogin/station-login.tsx` (352 lines)

---

## Usage in Documentation

This pattern is referenced by:
- [`ARCHITECTURE.md`](../ARCHITECTURE.md#component-architecture) - React architecture
- [`DEVELOPMENT.md`](../DEVELOPMENT.md#react-standards) - Development standards
- [`.cursorrules`](../../.cursorrules) - AI code generation constraints

## Related Documentation

- [TypeScript Patterns](./typescript-patterns.md) - Component type definitions
- [MobX Patterns](./mobx-patterns.md) - Observer components
- [Web Component Patterns](./web-component-patterns.md) - React to WC conversion
- [Testing Patterns](./testing-patterns.md) - Component testing

## See Also

- [Error Boundary Pattern](./patterns/error-boundary.md)
- [Custom Hooks Pattern](./patterns/custom-hooks.md)
- [Web Worker Hooks](./patterns/web-worker-hooks.md)
- [Event Listener Cleanup](./patterns/event-listener-cleanup.md)

## Diagrams

![Component Flow](./diagrams/component-flow.svg)

