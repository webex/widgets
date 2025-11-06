# Code Standards & Best Practices

## TypeScript Standards

### Type Definitions

#### Always Define Types

```typescript
// ✅ Good
function processData(items: Item[]): ProcessedItem[] {
  return items.map(item => ({ ...item, processed: true }));
}

// ❌ Bad - implicit any
function processData(items) {
  return items.map(item => ({ ...item, processed: true }));
}
```

#### Interface Naming

Use `I` prefix for interfaces:

```typescript
// ✅ Good
export interface IStore {
  someState: string;
  isLoading: boolean;
}

export interface ITask {
  id: string;
  status: TaskStatus;
}

// ❌ Bad
export interface Store {  // Conflicts with class name
  someState: string;
}
```

#### Type vs Interface

```typescript
// Use interface for object shapes
interface IUser {
  id: string;
  name: string;
}

// Use type for unions, intersections, primitives
type Status = 'pending' | 'active' | 'completed';
type ID = string | number;
type UserWithTimestamp = IUser & { timestamp: number };
```

#### Strict Type Checking

```typescript
// ✅ Good - explicit types
const items: Item[] = [];
const config: Config | null = null;
const callback: (() => void) | undefined = undefined;

// ❌ Bad - relying on inference for complex types
const items = [];  // any[]
const config = null;  // null
```

### Type Files

Keep types in separate `.types.ts` files:

```typescript
// component-name.types.ts
export interface ComponentNameProps {
  title: string;
  items: Item[];
  onAction?: (id: string) => void;
}

export interface Item {
  id: string;
  name: string;
  value: number;
}

export type ItemStatus = 'active' | 'inactive' | 'pending';
```

## React Standards

### Component Definition

```typescript
// ✅ Good
import React from 'react';

const MyComponent: React.FunctionComponent<Props> = (props) => {
  const { title, items, onAction } = props;
  
  return <div>{title}</div>;
};

// Alternative (shorter)
const MyComponent: React.FC<Props> = ({ title, items, onAction }) => {
  return <div>{title}</div>;
};

// ❌ Bad - no type annotation
const MyComponent = (props) => {
  return <div>{props.title}</div>;
};
```

### Props Destructuring

```typescript
// ✅ Good - destructure at function level
const MyComponent: React.FC<Props> = ({ title, items, onAction }) => {
  return <div>{title}</div>;
};

// ✅ Also good - destructure in body (when using props multiple times)
const MyComponent: React.FC<Props> = (props) => {
  const { title, items, onAction } = props;
  
  useEffect(() => {
    console.log('Props:', props);
  }, [props]);
  
  return <div>{title}</div>;
};
```

### Hooks

```typescript
// ✅ Good - type state explicitly
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<Item[]>([]);

// Type for refs
const inputRef = useRef<HTMLInputElement>(null);

// Type for custom hooks
function useCustomHook(): { value: string; setValue: (v: string) => void } {
  const [value, setValue] = useState<string>('');
  return { value, setValue };
}
```

### Event Handlers

```typescript
// ✅ Good - typed event handlers
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
  console.log('Clicked');
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // submit logic
};
```

### Conditional Rendering

```typescript
// ✅ Good - clear conditions
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{items.length > 0 && <ItemList items={items} />}

// For complex conditions
{isLoading ? (
  <Spinner />
) : error ? (
  <ErrorMessage error={error} />
) : (
  <ItemList items={items} />
)}

// ❌ Bad - unclear logic
{!isLoading && !error && items.length > 0 && <ItemList items={items} />}
```

### Keys in Lists

```typescript
// ✅ Good - unique, stable IDs
{items.map(item => (
  <ItemComponent key={item.id} data={item} />
))}

// ❌ Bad - index as key (causes issues with reordering)
{items.map((item, index) => (
  <ItemComponent key={index} data={item} />
))}

// ⚠️ Acceptable only if list never reorders and items have no IDs
{staticList.map((item, index) => (
  <StaticItem key={index} data={item} />
))}
```

## Styling Standards

### SCSS File Structure

```scss
// component-name.style.scss

// Component root
.component-name {
  display: flex;
  flex-direction: column;
  padding: 16px;
  
  // Child elements (BEM-like naming)
  &__header {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
  }
  
  &__content {
    flex: 1;
  }
  
  &__footer {
    margin-top: 12px;
    text-align: right;
  }
  
  // Modifiers
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  &--dark {
    background-color: #333;
    color: #fff;
  }
  
  // State classes
  &.is-loading {
    cursor: wait;
  }
  
  &.is-error {
    border: 1px solid red;
  }
}

// Nested component states
.component-name__item {
  padding: 8px;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &.selected {
    background-color: #e3f2fd;
  }
}
```

### CSS Class Naming

```typescript
// ✅ Good - BEM-like naming
<div className="station-login">
  <div className="station-login__header">Header</div>
  <div className="station-login__content">
    <div className="station-login__item">Item</div>
  </div>
</div>

// ✅ Good - with modifiers
<div className={`button ${isDisabled ? 'button--disabled' : ''}`}>
  Click Me
</div>

// ✅ Better - using classnames utility
import classNames from 'classnames';

<div className={classNames('button', {
  'button--disabled': isDisabled,
  'button--primary': isPrimary,
})}>
  Click Me
</div>
```

### Use Momentum Design Tokens

```scss
// ✅ Good - use Momentum variables when available
@import '@momentum-ui/core/scss/settings/core';

.my-component {
  color: $md-gray-100;
  font-size: $md-font-size-base;
  padding: $md-spacing-base;
  border-radius: $md-border-radius-base;
}

// ❌ Bad - hardcoded values
.my-component {
  color: #333;
  font-size: 14px;
  padding: 16px;
}
```

## MobX State Management

### Store Actions

```typescript
// ✅ Good - actions modify state
class Store {
  items: Item[] = [];
  
  constructor() {
    makeAutoObservable(this);
  }
  
  addItem(item: Item) {
    this.items.push(item);
  }
  
  removeItem(itemId: string) {
    this.items = this.items.filter(i => i.id !== itemId);
  }
  
  updateItem(itemId: string, updates: Partial<Item>) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }
}

// ❌ Bad - mutating store outside actions
const store = Store.getInstance();
store.items.push(newItem);  // Direct mutation
```

### Observable Annotations

```typescript
// ✅ Good - specify observable types
class Store {
  someState: string = '';
  complexObject: ComplexType;
  
  constructor() {
    makeAutoObservable(this, {
      complexObject: observable.ref,  // Track reference only
      someState: observable,           // Deep observable (default)
    });
  }
}
```

### Computed Values

```typescript
// ✅ Good - use getters for computed values
class Store {
  items: Item[] = [];
  filter: string = '';
  
  get filteredItems(): Item[] {
    return this.items.filter(item => 
      item.name.includes(this.filter)
    );
  }
  
  get itemCount(): number {
    return this.items.length;
  }
}

// ❌ Bad - recomputing in component
const filteredItems = store.items.filter(item => 
  item.name.includes(store.filter)
);
```

## Error Handling

### Try-Catch for Async Operations

```typescript
// ✅ Good
const fetchData = async () => {
  try {
    setLoading(true);
    const data = await api.getData();
    setData(data);
  } catch (error) {
    logger?.error('Failed to fetch data', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// ❌ Bad - no error handling
const fetchData = async () => {
  const data = await api.getData();
  setData(data);
};
```

### Error Boundaries

```typescript
// Create error boundary component
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Use in component tree
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

## Logging Standards

### Use Logger from Props

```typescript
// ✅ Good - use logger
const MyComponent: React.FC<Props> = ({ logger, ...props }) => {
  useEffect(() => {
    logger?.info('Component mounted');
    
    return () => {
      logger?.info('Component unmounted');
    };
  }, []);
  
  const handleClick = () => {
    logger?.debug('Button clicked', { userId: user.id });
    onClick?.();
  };
  
  const handleError = (error: Error) => {
    logger?.error('Operation failed', error);
  };
};

// ❌ Bad - console.log everywhere
const MyComponent: React.FC<Props> = (props) => {
  console.log('Component rendered', props);  // Use logger instead
};
```

### Logging Levels

```typescript
// Use appropriate log levels
logger.debug('Detailed debug info');      // Development only
logger.info('Important information');     // General info
logger.warn('Warning - something odd');   // Potential issues
logger.error('Error occurred', error);    // Errors
```

## Testing Standards

### Test File Naming

```
ComponentName.test.tsx      // ✅ Good
ComponentName.test.ts
ComponentName.spec.tsx      // ✅ Also good
ComponentName.spec.ts

component-name.test.tsx     // ❌ Inconsistent
test-ComponentName.tsx      // ❌ Non-standard
```

### Test Structure

```typescript
// ✅ Good - organized tests
describe('MyComponent', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };
  
  const defaultProps = {
    title: 'Test',
    items: [],
    logger: mockLogger,
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<MyComponent {...defaultProps} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
  
  describe('user interactions', () => {
    it('should handle click', () => {
      const onClick = jest.fn();
      render(<MyComponent {...defaultProps} onClick={onClick} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });
  });
  
  describe('edge cases', () => {
    it('should handle empty items', () => {
      render(<MyComponent {...defaultProps} items={[]} />);
      expect(screen.getByText('No items')).toBeInTheDocument();
    });
  });
});
```

## Git Commit Standards

### Conventional Commits

```bash
# ✅ Good commit messages
feat: add new user state widget
fix: resolve button alignment issue in call control
docs: update README with installation steps
style: format code with prettier
refactor: extract common logic to utility function
test: add unit tests for station login
chore: update dependencies

# ❌ Bad commit messages
updated files
fix bug
changes
WIP
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies

**Examples**:
```bash
feat(station-login): add support for multiple teams

Add ability for agents to select from multiple teams during login.
This includes:
- Team selection dropdown
- Team validation
- Store updates

Closes #123

---

fix(call-control): prevent duplicate call end events

Fixed race condition where end call could be triggered multiple times,
causing errors in the backend.

Fixes #456
```

## File Organization

### Component Files

```
ComponentName/
├── component-name.tsx          # Main component
├── component-name.types.ts     # TypeScript types
├── component-name.utils.ts     # Utility functions
├── component-name.style.scss   # Styles
├── constants.ts                # Constants (optional)
└── tests/                      # Tests (optional location)
    └── component-name.test.tsx
```

### Import Order

```typescript
// ✅ Good - organized imports
// 1. React
import React, { useEffect, useState } from 'react';

// 2. Third-party libraries
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';

// 3. Momentum components
import { Button, Icon, Text } from '@momentum-design/components/dist/react';

// 4. Internal packages
import { Store } from '@webex/cc-store';
import { withMetrics } from '@webex/cc-ui-logging';

// 5. Local imports
import { ComponentProps } from './component-name.types';
import { helperFunction } from './component-name.utils';
import './component-name.style.scss';
```

## Documentation Standards

### JSDoc Comments

```typescript
/**
 * Processes user input and returns formatted data
 * @param input - Raw user input string
 * @param options - Processing options
 * @returns Formatted and validated data
 * @throws {ValidationError} If input is invalid
 */
export function processInput(
  input: string,
  options?: ProcessOptions
): ProcessedData {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ Good - explain WHY, not WHAT
// Delay required to prevent rate limiting
await delay(1000);

// Use ref to track previous value for comparison
const prevValueRef = useRef(value);

// ❌ Bad - stating the obvious
// Set loading to true
setLoading(true);

// Loop through items
items.forEach(item => {
  // ...
});
```

## Performance Best Practices

### Memoization

```typescript
// ✅ Good - memoize expensive computations
const expensiveValue = useMemo(() => {
  return items.reduce((acc, item) => acc + item.value, 0);
}, [items]);

// ✅ Good - memoize callbacks
const handleClick = useCallback(() => {
  onClick?.(id);
}, [id, onClick]);

// ✅ Good - memo for pure components
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <div>{/* expensive rendering */}</div>;
});
```

### Avoid Inline Functions

```typescript
// ✅ Good
const handleClick = useCallback(() => {
  doSomething();
}, []);

<Button onClick={handleClick}>Click</Button>

// ❌ Bad - creates new function on every render
<Button onClick={() => doSomething()}>Click</Button>
```

## Next Steps

- See `component-patterns.md` for component structure
- See `state-management.md` for MobX patterns
- See `unit-testing.md` for testing standards

