# MobX Patterns

---
Technology: MobX
Configuration: See [package.json](../../packages/contact-center/store/package.json) for version
Dependencies: See individual [package.json](../../packages/contact-center/*/package.json) files
Scope: Repository-wide
Last Updated: 2025-11-23
---

> **For LLM Agents**: Add this file to context when working on MobX store, observables, or state management.
>
> **For Developers**: Update this file when committing MobX pattern changes.

---

## Summary

The codebase uses **MobX 6** with a **singleton store pattern** wrapped in a `StoreWrapper` class. The architecture separates core store state (`Store`) from business logic and event handling (`StoreWrapper`). Components consume the store using the `observer` HOC from `mobx-react-lite`, and state mutations are wrapped in `runInAction` for consistency.

---

## Store Architecture

### 1. **Singleton Pattern**

**Core Store Class (`Store`):**
```typescript
class Store implements IStore {
  private static instance: Store;

  constructor() {
    makeAutoObservable(this, {
      cc: observable.ref,
    });
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      console.log('Creating new store instance');
      Store.instance = new Store();
    }
    return Store.instance;
  }
}
```

**Pattern:** Single instance of `Store` created and shared across the application.

---

### 2. **StoreWrapper Pattern**

**Wrapper Class:**
```typescript
class StoreWrapper implements IStoreWrapper {
  store: IStore;
  onIncomingTask: ({task}: {task: ITask}) => void;
  onTaskRejected?: (task: ITask, reason: string) => void;
  onErrorCallback?: (widgetName: string, error: Error) => void;

  constructor() {
    this.store = Store.getInstance();
  }

  // Proxy all properties with getters
  get cc() { return this.store.cc; }
  get teams() { return this.store.teams; }
  // ... 20+ more getters

  // Methods that modify state
  setDeviceType = (option: string): void => {
    this.store.deviceType = option;
  };

  setCurrentTask = (task: ITask | null): void => {
    runInAction(() => {
      this.store.currentTask = task;
    });
  };
}

const storeWrapper = new StoreWrapper();
export default storeWrapper;
```

**Purpose:**
- **Proxy pattern**: Wraps core `Store` with computed getters and business logic
- **Event handlers**: Manages SDK event listeners and callbacks
- **Filtered data**: Transforms store data (e.g., filtering idle codes)
- **Single export**: `@webex/cc-store` exports the wrapper instance, not the raw store

---

## MobX Observable Patterns

### 1. **makeAutoObservable**

**Convention:** Use `makeAutoObservable` for automatic observability

```typescript
constructor() {
  makeAutoObservable(this, {
    cc: observable.ref,
  });
}
```

**Special handling:**
- `cc: observable.ref` - Contact center SDK instance treated as reference (not deep observable)
- All other properties automatically made observable
- All methods automatically made actions

---

### 2. **Observable Properties**

**Direct assignment for simple properties:**
```typescript
class Store {
  teams: Team[] = [];
  loginOptions: string[] = [];
  agentId: string = '';
  currentTheme: string = 'LIGHT';
  isAgentLoggedIn = false;
  deviceType: string = '';
  dialNumber: string = '';
  currentState: string = '';
  customState: ICustomState = null;
  taskList: Record<string, ITask> = {};
  featureFlags: {[key: string]: boolean} = {};
  // ... 20+ more observables
}
```

**Pattern:** All class properties are observable by default when using `makeAutoObservable`.

---

### 3. **runInAction for Mutations**

**Pattern:** Wrap state mutations in `runInAction` for batched updates

**Simple setters:**
```typescript
setDeviceType = (option: string): void => {
  this.store.deviceType = option; // Direct mutation (auto-action)
};
```

**Complex mutations:**
```typescript
setCurrentTask = (task: ITask | null, isClicked: boolean = false): void => {
  runInAction(() => {
    let isSameTask = false;
    if (task && this.currentTask) {
      isSameTask = task.data.interactionId === this.currentTask.data.interactionId;
    }

    this.store.currentTask = task ? 
      Object.assign(Object.create(Object.getPrototypeOf(task)), task) : null;

    if (this.onTaskSelected && !isSameTask && typeof isClicked !== 'undefined') {
      this.onTaskSelected(task, isClicked);
    }
  });
};
```

**Guideline:**
- **Simple setters** (single property): Direct mutation is fine with `makeAutoObservable`
- **Complex logic** (multiple properties, conditionals): Use `runInAction`
- **Event handlers**: Always use `runInAction` for consistency

---

### 4. **Computed Values (via Getters)**

**Pattern:** Use getters in `StoreWrapper` to transform/filter store data

```typescript
get idleCodes() {
  return this.store.idleCodes.filter((code) => {
    return Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(code.name) || 
           !code.isSystem;
  });
}
```

**Convention:** Getters in `StoreWrapper` act as computed values (automatically tracked by MobX).

---

## Observer Pattern

### 1. **observer HOC from mobx-react-lite**

**Pattern:** Wrap functional components with `observer` to track observables

```typescript
import {observer} from 'mobx-react-lite';
import store from '@webex/cc-store';

const StationLoginInternal: React.FunctionComponent<StationLoginProps> = observer(
  ({onLogin, onLogout, profileMode}) => {
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
    } = store;

    return <StationLoginComponent {...props} />;
  }
);
```

**Convention:**
- Import store singleton at top of file
- Destructure needed properties inside observer component
- Component auto-rerenders when used observables change

---

### 2. **Two-Layer Component Pattern**

**Pattern:** Split components into Internal (observer) + Wrapper (ErrorBoundary)

```typescript
// Internal component with observer
const StationLoginInternal: React.FunctionComponent<StationLoginProps> = observer(
  ({onLogin, onLogout, onCCSignOut, profileMode}) => {
    const {cc, teams, loginOptions, logger, isAgentLoggedIn} = store;
    // ... component logic
    return <StationLoginComponent {...props} />;
  }
);

// Wrapper component with ErrorBoundary
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

**Purpose:**
- **Internal**: Handles MobX reactivity
- **Wrapper**: Handles error boundaries
- **Benefit**: Error boundary doesn't need to be an observer

---

## Action Patterns

### 1. **Simple Setters**

**Pattern:** Arrow functions for simple mutations

```typescript
setDeviceType = (option: string): void => {
  this.store.deviceType = option;
};

setDialNumber = (input: string): void => {
  this.store.dialNumber = input;
};

setShowMultipleLoginAlert = (value: boolean): void => {
  this.store.showMultipleLoginAlert = value;
};
```

---

### 2. **Complex Actions with runInAction**

**Pattern:** Group related mutations in `runInAction`

```typescript
refreshTaskList = (): void => {
  runInAction(() => {
    this.store.taskList = this.store.cc.taskManager.getAllTasks();
    const taskListKeys = Object.keys(this.store.taskList);

    if (taskListKeys.length === 0) {
      if (this.currentTask) {
        this.handleTaskRemove(this.currentTask);
      }
      this.setCurrentTask(null);
      this.setState({reset: true});
    } else if (this.currentTask && this.store.taskList[this.currentTask.data.interactionId]) {
      this.setCurrentTask(this.store.taskList[this.currentTask?.data?.interactionId]);
    } else if (taskListKeys.length > 0) {
      if (this.currentTask) {
        this.handleTaskRemove(this.currentTask);
      }
      this.setCurrentTask(this.store.taskList[taskListKeys[0]]);
    }
  });
};
```

---

### 3. **Async Actions**

**Pattern:** Promises with `runInAction` in `.then()` or use `runInAction` inside async functions

```typescript
registerCC(webex?: WithWebex['webex']): Promise<void> {
  // ... validation
  
  return this.cc
    .register()
    .then((response: Profile) => {
      // Implicit action from makeAutoObservable
      this.featureFlags = getFeatureFlags(response);
      this.teams = response.teams;
      this.loginOptions = response.webRtcEnabled
        ? response.loginVoiceOptions
        : response.loginVoiceOptions.filter((option) => option !== 'BROWSER');
      this.agentId = response.agentId;
      this.isAgentLoggedIn = response.isAgentLoggedIn;
      // ... more assignments
    })
    .catch((error) => {
      this.logger.error(`Registration failed - ${error}`);
      return Promise.reject(error);
    });
}
```

**Note:** With `makeAutoObservable`, mutations inside `then()` are automatically wrapped as actions. However, for clarity in event handlers, prefer explicit `runInAction`.

---

## Event Handling Patterns

### 1. **SDK Event Listeners**

**Pattern:** Register event listeners in `setupIncomingTaskHandler`

```typescript
setupIncomingTaskHandler = (ccSDK: IContactCenter) => {
  const addEventListeners = () => {
    ccSDK.on(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
    ccSDK.on(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
    ccSDK.on(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
    ccSDK.on(TASK_EVENTS.TASK_MERGED, this.handleTaskMerged);
    ccSDK.on(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
    ccSDK.on(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
  };

  const removeEventListeners = () => {
    ccSDK.off(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
    ccSDK.off(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
    // ... more cleanup
  };
};
```

**Pattern:**
- Define `addEventListeners` and `removeEventListeners` functions
- Register event handlers as class methods (arrow functions for `this` binding)
- Always provide cleanup (remove listeners)

---

### 2. **Task Event Listeners**

**Pattern:** Register task-specific events with `registerTaskEventListeners`

```typescript
private registerTaskEventListeners = (task: ITask): void => {
  task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);
  task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
  task.on(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(task, reason));
  task.on(TASK_EVENTS.AGENT_WRAPPEDUP, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
  // ... 20+ more task events
  
  if (this.deviceType === DEVICE_TYPE_BROWSER) {
    task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
  }
};
```

**Cleanup pattern:**
```typescript
handleTaskRemove = (taskToRemove: ITask) => {
  if (taskToRemove) {
    taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
    taskToRemove.off(TASK_EVENTS.TASK_END, this.handleTaskEnd);
    // ... remove all listeners
  }
  runInAction(() => {
    this.setCurrentTask(null);
    this.setState({reset: true});
    this.refreshTaskList();
  });
};
```

---

### 3. **Event Handlers Update Store**

**Pattern:** Event handlers modify store state using `runInAction`

```typescript
handleTaskAssigned = (event) => {
  const task = event;
  if (this.onTaskAssigned) {
    this.onTaskAssigned(task);
  }
  runInAction(() => {
    this.setCurrentTask(task);
    this.setState({
      developerName: ENGAGED_LABEL,
      name: ENGAGED_USERNAME,
    });
  });
};

handleStateChange = (data) => {
  if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
    const DEFAULT_CODE = '0';
    this.setCurrentState(data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE);
    this.setLastStateChangeTimestamp(data.lastStateChangeTimestamp);
    this.setLastIdleCodeChangeTimestamp(data.lastIdleCodeChangeTimestamp);
  }
};
```

---

## Store Initialization Pattern

### 1. **Two-Step Initialization**

**Pattern:** `init()` → `registerCC()`

```typescript
init(options: InitParams): Promise<void> {
  return this.store.init(options, this.setupIncomingTaskHandler);
}

// In Store class:
init(options: InitParams, setupEventListeners): Promise<void> {
  if ('webex' in options) {
    setupEventListeners(options.webex.cc);
    return this.registerCC(options.webex);
  }
  
  return new Promise((resolve, reject) => {
    const webex = Webex.init({
      config: options.webexConfig,
      credentials: { access_token: options.access_token },
    });

    webex.once('ready', () => {
      setupEventListeners(webex.cc);
      this.registerCC(webex)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  });
}
```

**Flow:**
1. Consumer calls `store.init(options)`
2. Store initializes SDK (if needed)
3. `setupEventListeners` registers SDK event handlers
4. `registerCC()` fetches agent profile and populates store
5. Promise resolves when store is ready

---

### 2. **Callback Registration Pattern**

**Pattern:** Store exposes callback setters for widget events

```typescript
setIncomingTaskCb = (callback: ({task}: {task: ITask}) => void): void => {
  this.onIncomingTask = callback;
};

setTaskRejected = (callback: ((task: ITask, reason: string) => void) | undefined): void => {
  this.onTaskRejected = callback;
};

setOnError = (callback: (widgetName: string, error: Error) => void) => {
  this.onErrorCallback = callback;
};
```

**Usage:**
- Widgets register callbacks to be notified of events
- Store invokes callbacks when events occur
- Pattern similar to event emitters

---

## Store Usage in Components

### 1. **Import and Destructure**

```typescript
import store from '@webex/cc-store';

const UserStateInternal: React.FunctionComponent<IUserStateProps> = observer(
  ({onStateChange}) => {
    const {
      cc,
      idleCodes,
      agentId,
      currentState,
      lastStateChangeTimestamp,
      customState,
      logger,
    } = store;

    // Component logic
  }
);
```

---

### 2. **Pass to Custom Hooks**

```typescript
const UserStateInternal: React.FunctionComponent<IUserStateProps> = observer(
  ({onStateChange}) => {
    const {
      cc,
      idleCodes,
      agentId,
      currentState,
      customState,
      lastStateChangeTimestamp,
      logger,
      lastIdleCodeChangeTimestamp,
    } = store;
    
    const props = {
      ...useUserState({
        idleCodes,
        agentId,
        cc,
        currentState,
        customState,
        lastStateChangeTimestamp,
        logger,
        onStateChange,
        lastIdleCodeChangeTimestamp,
      }),
      customState,
      logger,
    };

    return <UserStateComponent {...props} />;
  }
);
```

**Pattern:**
- Observer component extracts store values
- Passes to custom hook for business logic
- Hook returns computed values/handlers
- Component renders with combined props

---

### 3. **Store Mutations from Hooks**

**Pattern:** Hooks can directly call store setters

```typescript
// In helper.ts (custom hook)
import store from '@webex/cc-store';

export const useUserState = ({currentState, logger, ...}) => {
  const setAgentStatus = (selectedCode) => {
    logger.info('Updating currentState');
    store.setCurrentState(selectedCode); // Direct store mutation
  };

  const updateAgentState = (selectedCode) => {
    // ... business logic
    return cc.setAgentState({...})
      .then((response) => {
        store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
        store.setLastIdleCodeChangeTimestamp(response.data.lastIdleCodeChangeTimestamp);
      });
  };

  return { setAgentStatus, isSettingAgentStatus, elapsedTime };
};
```

**Guideline:** Hooks can call store setters, but should receive store values as props (not import store directly in hook for testability).

---

## Key Conventions to Enforce

### ✅ DO:
1. **Use `makeAutoObservable`** in Store constructor with minimal overrides
2. **Use `observable.ref`** for SDK instances and external objects
3. **Wrap complex mutations** in `runInAction` for batched updates
4. **Use `observer` HOC** for all components that read store state
5. **Destructure store** at the top of observer components
6. **Use arrow functions** for store methods to preserve `this` context
7. **Register and cleanup** SDK event listeners properly
8. **Use singleton pattern** for store (single instance)
9. **Export store wrapper** instance, not the class
10. **Separate Internal (observer) and Wrapper (ErrorBoundary)** components

### ❌ DON'T:
1. **Don't mutate store outside of actions** when using `runInAction`
2. **Don't use makeObservable** - prefer `makeAutoObservable`
3. **Don't make SDK objects deeply observable** - use `observable.ref`
4. **Don't forget to remove event listeners** in cleanup
5. **Don't import store in non-observer components** (only in observer components)
6. **Don't use `@observable` decorators** - use `makeAutoObservable` instead
7. **Don't create multiple store instances** - singleton only

---

## Anti-Patterns Found

### 1. **Inconsistent runInAction usage**
Some simple setters use direct mutation, others use `runInAction`. With `makeAutoObservable`, both work, but consistency would improve readability.

**Recommendation:** Document when to use `runInAction` vs direct mutation.

---

### 2. **Deep task cloning in setCurrentTask**
```typescript
this.store.currentTask = task ? 
  Object.assign(Object.create(Object.getPrototypeOf(task)), task) : null;
```

**Reason:** Preserving task prototype methods while creating observable copy.  
**Recommendation:** Document this pattern for objects with methods.

---

## Examples to Reference

### Example 1: Store Singleton with makeAutoObservable
```typescript
class Store implements IStore {
  private static instance: Store;
  teams: Team[] = [];
  isAgentLoggedIn = false;

  constructor() {
    makeAutoObservable(this, {
      cc: observable.ref,
    });
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }
}
```

### Example 2: Observer Component with Store
```typescript
import {observer} from 'mobx-react-lite';
import store from '@webex/cc-store';

const MyWidget = observer(({onEvent}) => {
  const {cc, logger, currentState, setCurrentState} = store;
  
  return <div onClick={() => setCurrentState('Available')}>
    Current: {currentState}
  </div>;
});
```

### Example 3: Event Handler with runInAction
```typescript
handleTaskAssigned = (event) => {
  const task = event;
  runInAction(() => {
    this.setCurrentTask(task);
    this.setState({
      developerName: ENGAGED_LABEL,
      name: ENGAGED_USERNAME,
    });
  });
};
```

---

## Files Analyzed

1. `/packages/contact-center/store/src/store.ts` (167 lines)
2. `/packages/contact-center/store/src/storeEventsWrapper.ts` (819 lines)
3. `/packages/contact-center/store/src/index.ts` (5 lines)
4. `/packages/contact-center/station-login/src/station-login/index.tsx` (77 lines)
5. `/packages/contact-center/user-state/src/user-state/index.tsx` (52 lines)
6. `/packages/contact-center/user-state/src/helper.ts` (296 lines)
7. `/packages/contact-center/task/src/IncomingTask/index.tsx`
8. `/packages/contact-center/task/src/TaskList/index.tsx`
9. `/packages/contact-center/task/src/CallControl/index.tsx`

---

## Related Documentation

- [TypeScript Patterns](./typescript-patterns.md) - Store type definitions
- [React Patterns](./react-patterns.md) - Observer components
- [Testing Patterns](./testing-patterns.md) - Mocking MobX store

