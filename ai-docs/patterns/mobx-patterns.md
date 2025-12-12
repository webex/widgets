# MobX Patterns

> Quick reference for LLMs working with MobX state management in this repository.

---

## Rules

- **MUST** use the singleton store pattern via `Store.getInstance()`
- **MUST** wrap widgets with `observer` HOC from `mobx-react-lite`
- **MUST** use `runInAction` for all state mutations
- **MUST** access store via `import store from '@webex/cc-store'`
- **MUST** mark state properties as `observable`
- **MUST** use `makeObservable` in store constructor
- **NEVER** mutate state outside of `runInAction`
- **NEVER** access store directly in presentational components
- **NEVER** create multiple store instances

---

## Store Singleton Pattern

```typescript
// store.ts
import { makeObservable, observable, action, runInAction } from 'mobx';

class Store {
  private static instance: Store;
  
  // Observable state
  @observable agentId: string = '';
  @observable currentState: string = '';
  @observable idleCodes: IdleCode[] = [];
  @observable isLoggedIn: boolean = false;
  
  private constructor() {
    makeObservable(this);
  }
  
  static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }
}

export default Store.getInstance();
```

---

## Observable Decorator Pattern

```typescript
import { observable, makeObservable } from 'mobx';

class Store {
  @observable agentId: string = '';
  @observable teams: Team[] = [];
  @observable currentState: string = 'Available';
  @observable tasks: ITask[] = [];
  
  constructor() {
    makeObservable(this);
  }
}
```

---

## runInAction Pattern

**ALWAYS use runInAction for state mutations:**

```typescript
import { runInAction } from 'mobx';

// ✅ CORRECT
const handleLogin = async () => {
  const result = await cc.login();
  runInAction(() => {
    store.agentId = result.agentId;
    store.isLoggedIn = true;
    store.teams = result.teams;
  });
};

// ❌ WRONG - Direct mutation
const handleLogin = async () => {
  const result = await cc.login();
  store.agentId = result.agentId;  // NOT ALLOWED
};
```

---

## Observer HOC Pattern

**ALWAYS wrap widgets that access store with observer:**

```typescript
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const UserStateInternal: React.FC<Props> = observer((props) => {
  // Access store - component will re-render when these change
  const { currentState, idleCodes, agentId } = store;
  
  return (
    <UserStateComponent
      currentState={currentState}
      idleCodes={idleCodes}
    />
  );
});
```

---

## Store Import Pattern

```typescript
// ✅ CORRECT - Import singleton
import store from '@webex/cc-store';

const MyWidget = observer(() => {
  const { agentId, teams } = store;
  // ...
});

// ❌ WRONG - Creating new instance
import { Store } from '@webex/cc-store';
const store = new Store();  // NOT ALLOWED
```

---

## Action Pattern

```typescript
import { action, makeObservable } from 'mobx';

class Store {
  @observable currentState: string = '';
  
  constructor() {
    makeObservable(this);
  }
  
  @action
  setCurrentState(state: string) {
    this.currentState = state;
  }
  
  @action
  reset() {
    this.currentState = '';
    this.agentId = '';
    this.isLoggedIn = false;
  }
}
```

---

## Computed Pattern

```typescript
import { observable, computed, makeObservable } from 'mobx';

class Store {
  @observable tasks: ITask[] = [];
  
  constructor() {
    makeObservable(this);
  }
  
  @computed
  get activeTasks(): ITask[] {
    return this.tasks.filter(task => task.status === 'active');
  }
  
  @computed
  get taskCount(): number {
    return this.tasks.length;
  }
}
```

---

## Event Handling with Store Pattern

```typescript
import { runInAction } from 'mobx';
import store from '@webex/cc-store';

// In helper.ts or hook
useEffect(() => {
  const handleTaskIncoming = (task: ITask) => {
    runInAction(() => {
      store.incomingTask = task;
    });
  };

  store.cc.on(TASK_EVENTS.TASK_INCOMING, handleTaskIncoming);
  
  return () => {
    store.cc.off(TASK_EVENTS.TASK_INCOMING, handleTaskIncoming);
  };
}, []);
```

---

## Store Wrapper Pattern

```typescript
// storeEventsWrapper.ts
import { runInAction } from 'mobx';
import store from './store';

export const initStoreEventListeners = () => {
  store.cc.on(CC_EVENTS.AGENT_STATE_CHANGED, (data) => {
    runInAction(() => {
      store.currentState = data.state;
      store.lastStateChangeTimestamp = Date.now();
    });
  });

  store.cc.on(CC_EVENTS.AGENT_LOGOUT_SUCCESS, () => {
    runInAction(() => {
      store.reset();
    });
  });
};
```

---

## Store Access in Widgets

```typescript
// Widget file
import { observer } from 'mobx-react-lite';
import store from '@webex/cc-store';

const StationLoginInternal = observer(() => {
  // Destructure what you need from store
  const {
    cc,
    teams,
    dialNumbers,
    isAgentLoggedIn,
    loginConfig,
  } = store;

  // Use in component
  return (
    <StationLoginComponent
      teams={teams}
      dialNumbers={dialNumbers}
      isLoggedIn={isAgentLoggedIn}
    />
  );
});
```

---

## Async Action Pattern

```typescript
import { runInAction } from 'mobx';

const fetchData = async () => {
  // Set loading state
  runInAction(() => {
    store.isLoading = true;
    store.error = null;
  });

  try {
    const result = await store.cc.fetchTeams();
    
    // Update with result
    runInAction(() => {
      store.teams = result.teams;
      store.isLoading = false;
    });
  } catch (error) {
    // Handle error
    runInAction(() => {
      store.error = error;
      store.isLoading = false;
    });
  }
};
```

---

## Related

- [React Patterns](./react-patterns.md)
- [TypeScript Patterns](./typescript-patterns.md)
- [Testing Patterns](./testing-patterns.md)
