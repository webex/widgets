# State Management with MobX

## Store Architecture

The repository uses **MobX** for centralized state management with a **Singleton pattern**.

- **Location**: `packages/contact-center/store/src/store.ts`
- **Package**: `@webex/cc-store`
- **Pattern**: Singleton with `makeAutoObservable`

## Store Implementation Pattern

### Basic Store Structure

```typescript
import {makeAutoObservable, observable} from 'mobx';
import {IStore, ILogger} from './store.types';

class Store implements IStore {
  private static instance: Store;

  // Observable properties
  someState: string = '';
  isLoading: boolean = false;
  items: Item[] = [];
  currentUser: User | null = null;

  // Complex objects should use observable.ref
  cc: IContactCenter;

  constructor() {
    makeAutoObservable(this, {
      // Specify special observable handling
      cc: observable.ref,
      logger: observable.ref,
    });
  }

  // Singleton pattern
  public static getInstance(): Store {
    if (!Store.instance) {
      console.log('Creating new store instance');
      Store.instance = new Store();
    }
    return Store.instance;
  }

  // Actions - methods that modify state
  setSomeState(value: string) {
    this.someState = value;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  addItem(item: Item) {
    this.items.push(item);
  }

  removeItem(itemId: string) {
    this.items = this.items.filter((item) => item.id !== itemId);
  }

  updateItem(itemId: string, updates: Partial<Item>) {
    const item = this.items.find((i) => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }

  // Computed values (derived state)
  get itemCount(): number {
    return this.items.length;
  }

  get activeItems(): Item[] {
    return this.items.filter((item) => item.active);
  }

  // Async actions
  async fetchItems() {
    this.setLoading(true);
    try {
      const response = await api.getItems();
      this.items = response.data;
    } catch (error) {
      console.error('Failed to fetch items', error);
    } finally {
      this.setLoading(false);
    }
  }

  // Reset/clear methods
  reset() {
    this.someState = '';
    this.isLoading = false;
    this.items = [];
    this.currentUser = null;
  }
}

export default Store;
```

## MobX Observable Annotations

### Default: `observable`

Auto-applied to all properties by `makeAutoObservable`

### `observable.ref`

Use for objects where you want to track reference changes, not deep changes:

```typescript
constructor() {
  makeAutoObservable(this, {
    cc: observable.ref,           // Track reference changes only
    logger: observable.ref,       // Track reference changes only
    taskList: observable,         // Deep observable (default)
  });
}
```

**When to use `observable.ref`**:

- External SDK instances (Webex CC SDK)
- Large objects from third parties
- When you only care about object replacement, not mutations

## Using Store in Components

### Basic Usage with Observer

```typescript
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '@webex/cc-store';

const MyComponent: React.FunctionComponent = observer(() => {
  const store = Store.getInstance();

  // Component automatically re-renders when store values change
  return (
    <div>
      <p>State: {store.someState}</p>
      <p>Item Count: {store.itemCount}</p>

      {store.isLoading ? (
        <Spinner />
      ) : (
        <ItemList items={store.activeItems} />
      )}

      <Button onClick={() => store.setSomeState('new value')}>
        Update State
      </Button>
    </div>
  );
});

export default MyComponent;
```

**Key Points**:

- Wrap component with `observer()` to make it reactive
- Access store via `Store.getInstance()`
- Component re-renders automatically when accessed observables change
- Works with computed values (`get` methods)

### With Props and Metrics HOC

```typescript
import { observer } from 'mobx-react-lite';
import { withMetrics } from '@webex/cc-ui-logging';

interface Props {
  title: string;
  onComplete?: () => void;
}

const ComponentWithStoreComponent: React.FunctionComponent<Props> = observer((props) => {
  const { title, onComplete } = props;
  const store = Store.getInstance();

  const handleAction = () => {
    store.setSomeState('completed');
    onComplete?.();
  };

  return (
    <div>
      <h2>{title}</h2>
      <p>{store.someState}</p>
      <Button onClick={handleAction}>Complete</Button>
    </div>
  );
});

// Export with HOCs - order matters!
export const ComponentWithStore = withMetrics(ComponentWithStoreComponent);
```

**HOC Order**: `withMetrics(observer(Component))` or apply separately as shown above

## Store Initialization

### In Sample App

```typescript
import {Store} from '@webex/cc-store';
import Webex from 'webex';

const initializeApp = async () => {
  // Initialize Webex SDK
  const webex = await Webex.init({
    credentials: {
      access_token: accessToken,
    },
  });

  // Register SDK with store
  const store = Store.getInstance();
  await store.registerCC(webex);

  // Store is now ready to use
};
```

### Register CC Method

The store has a special method to register the Webex Contact Center SDK:

```typescript
registerCC(webex?: WithWebex['webex']): Promise<void> {
  if (webex) {
    this.cc = webex.cc;
  }

  if (typeof webex === 'undefined' && typeof this.cc === 'undefined') {
    throw new Error('Webex SDK not initialized');
  }

  // Setup event listeners, initialize state, etc.
}
```

## Common Store Patterns

### Boolean Flags

```typescript
class Store {
  isAgentLoggedIn: boolean = false;
  showMultipleLoginAlert: boolean = false;
  consultCompleted: boolean = false;

  setAgentLoggedIn(value: boolean) {
    this.isAgentLoggedIn = value;
  }

  toggleAlert() {
    this.showMultipleLoginAlert = !this.showMultipleLoginAlert;
  }
}
```

### Arrays/Lists

```typescript
class Store {
  teams: Team[] = [];
  idleCodes: IdleCode[] = [];

  setTeams(teams: Team[]) {
    this.teams = teams;
  }

  addTeam(team: Team) {
    this.teams.push(team);
  }

  removeTeam(teamId: string) {
    this.teams = this.teams.filter((t) => t.id !== teamId);
  }
}
```

### Objects/Maps

```typescript
class Store {
  taskList: Record<string, ITask> = {};

  addTask(task: ITask) {
    this.taskList[task.id] = task;
  }

  removeTask(taskId: string) {
    delete this.taskList[taskId];
  }

  getTask(taskId: string): ITask | undefined {
    return this.taskList[taskId];
  }

  get tasks(): ITask[] {
    return Object.values(this.taskList);
  }
}
```

### Nullable State

```typescript
class Store {
  currentTask: ITask | null = null;
  currentTheme: string = 'LIGHT';

  setCurrentTask(task: ITask | null) {
    this.currentTask = task;
  }

  clearCurrentTask() {
    this.currentTask = null;
  }
}
```

### Timestamps

```typescript
class Store {
  lastStateChangeTimestamp?: number;
  consultStartTimeStamp: number | undefined;

  recordStateChange() {
    this.lastStateChangeTimestamp = Date.now();
  }

  clearTimestamp() {
    this.lastStateChangeTimestamp = undefined;
  }
}
```

## Computed Values (Getters)

Computed values are automatically memoized and update when dependencies change:

```typescript
class Store {
  teams: Team[] = [];
  selectedTeamId: string = '';

  // Computed value - automatically memoized
  get selectedTeam(): Team | undefined {
    return this.teams.find((t) => t.id === this.selectedTeamId);
  }

  get teamNames(): string[] {
    return this.teams.map((t) => t.name);
  }

  get hasTeams(): boolean {
    return this.teams.length > 0;
  }
}

// Usage in component
const team = store.selectedTeam;
const hasTeams = store.hasTeams;
```

## Reactions and Side Effects

For complex side effects, use MobX reactions:

```typescript
import {reaction, autorun} from 'mobx';

class Store {
  setupReactions() {
    // React when specific value changes
    reaction(
      () => this.currentTask,
      (task) => {
        console.log('Current task changed', task);
        // Perform side effect
      }
    );

    // Run immediately and on any observable change
    autorun(() => {
      if (this.isAgentLoggedIn) {
        console.log('Agent logged in as', this.agentId);
      }
    });
  }
}
```

## Best Practices

### ✅ Do

- Use `makeAutoObservable` for simple stores
- Wrap components with `observer()` when using store
- Keep actions (state mutations) in the store
- Use computed values for derived state
- Use `observable.ref` for external objects
- Access store via `getInstance()`

### ❌ Don't

- Mutate store state directly in components
- Create multiple store instances
- Use store for local component state
- Access nested observables outside observer components
- Forget to wrap components with `observer()`

## Debugging MobX

### Enable MobX DevTools

```typescript
import {configure} from 'mobx';

// In development
if (process.env.NODE_ENV === 'development') {
  configure({
    enforceActions: 'never',
    computedRequiresReaction: false,
    reactionRequiresObservable: false,
    observableRequiresReaction: false,
  });
}
```

### Log Store Changes

```typescript
import {spy} from 'mobx';

spy((event) => {
  if (event.type === 'action') {
    console.log('Action:', event.name, event.arguments);
  }
  if (event.type === 'reaction') {
    console.log('Reaction:', event.name);
  }
});
```

## Testing with MobX

See `unit-testing.md` for testing components with store.

## Modifying the Store

When modifying the central store:

1. Update types in `store.types.ts`
2. Add properties and methods to `Store` class
3. Rebuild store: `yarn workspace @webex/cc-store run build:src`
4. Rebuild dependent packages
5. Update tests

**Example workflow**:

```bash
# Edit store files
yarn workspace @webex/cc-store run build:src
yarn workspace @webex/cc-components run build:src
yarn workspace @webex/cc-widgets run build:src
```

## Next Steps

- See `component-patterns.md` for using store in components
- See `unit-testing.md` for testing store-connected components
