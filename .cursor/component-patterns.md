# Component Design Patterns

## Component File Structure

Each component should follow this standard pattern:

```
ComponentName/
├── component-name.tsx          # Main component implementation
├── component-name.types.ts     # TypeScript interfaces and types
├── component-name.utils.ts(x)  # Helper functions and utilities
├── component-name.style.scss   # Component-specific styles
└── constants.ts                # Constants (optional)
```

**Example**: `StationLogin` component structure:

```
StationLogin/
├── station-login.tsx
├── station-login.types.ts
├── station-login.utils.tsx
├── station-login.style.scss
└── constants.ts
```

## Component Implementation Pattern

### 1. Types File (`component-name.types.ts`)

```typescript
// component-name.types.ts
import {ILogger} from '@webex/cc-store';

export interface ComponentNameProps {
  // Required props
  someProperty: string;
  data: DataType[];

  // Optional props
  onAction?: () => void;
  className?: string;

  // Injected by HOCs
  logger?: ILogger;
}

export interface DataType {
  id: string;
  name: string;
  value: number;
}

// Internal state types (if needed)
export interface ComponentState {
  isLoading: boolean;
  error: string | null;
}
```

**Best Practices**:

- Use `I` prefix for interfaces (e.g., `IComponentProps`, `IData`)
- Separate props from internal types
- Document complex prop types with comments
- Mark optional props with `?`

### 2. Main Component File (`component-name.tsx`)

```typescript
// component-name.tsx
import React, { useEffect, useState } from 'react';
import { ComponentNameProps } from './component-name.types';
import './component-name.style.scss';
import { helperFunction, processData } from './component-name.utils';
import { withMetrics } from '@webex/cc-ui-logging';
import { Button, Icon, Text } from '@momentum-design/components/dist/react';
import { observer } from 'mobx-react-lite';
import { Store } from '@webex/cc-store';

const ComponentNameComponent: React.FunctionComponent<ComponentNameProps> = (props) => {
  const {
    someProperty,
    data,
    onAction,
    className = '',
    logger
  } = props;

  // Local state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store access (if needed)
  const store = Store.getInstance();

  // Effects
  useEffect(() => {
    const initializeComponent = async () => {
      setIsLoading(true);
      try {
        const processed = processData(data, logger);
        // ... initialization logic
      } catch (err) {
        logger?.error('Failed to initialize', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [data]);

  // Event handlers
  const handleClick = () => {
    logger?.info('Button clicked', { someProperty });
    onAction?.();
  };

  // Render loading state
  if (isLoading) {
    return <div className="component-name__loading">Loading...</div>;
  }

  // Render error state
  if (error) {
    return <div className="component-name__error">{error}</div>;
  }

  // Main render
  return (
    <div className={`component-name ${className}`}>
      <Text type="header">{someProperty}</Text>

      {data.map(item => (
        <div key={item.id} className="component-name__item">
          {item.name}: {item.value}
        </div>
      ))}

      <Button onClick={handleClick}>
        <Icon name="check" />
        Submit
      </Button>
    </div>
  );
};

// Wrap with metrics HOC for telemetry
export const ComponentName = withMetrics(ComponentNameComponent);

// If component uses store, wrap with observer
// export const ComponentName = observer(withMetrics(ComponentNameComponent));
```

**Key Points**:

- Use `React.FunctionComponent` or `FC` type
- Destructure props immediately
- Always wrap with `withMetrics` HOC
- Use `observer()` if component uses MobX store
- Handle loading and error states
- Use logger for debugging

### 3. Utils File (`component-name.utils.ts`)

```typescript
// component-name.utils.ts
import {ILogger} from '@webex/cc-store';
import {DataType} from './component-name.types';

/**
 * Processes raw data for display
 * @param data - Raw data array
 * @param logger - Optional logger instance
 * @returns Processed data
 */
export const processData = (data: DataType[], logger?: ILogger): DataType[] => {
  logger?.debug('Processing data', {count: data.length});

  return data.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
};

/**
 * Validates component input
 */
export const validateInput = (input: string): boolean => {
  return input.length > 0 && input.length <= 100;
};

/**
 * Format display value
 */
export const formatValue = (value: number): string => {
  return value.toLocaleString();
};
```

**Best Practices**:

- Pure functions when possible
- Add JSDoc comments
- Include logger parameter for debugging
- Keep business logic out of component
- Export testable functions

### 4. Styles File (`component-name.style.scss`)

```scss
// component-name.style.scss
.component-name {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;

  &__item {
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;

    &:hover {
      background-color: #f5f5f5;
    }
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: 24px;
  }

  &__error {
    color: #d32f2f;
    padding: 12px;
    background-color: #ffebee;
    border-radius: 4px;
  }
}
```

**Best Practices**:

- Use BEM-like naming convention
- Nest with `&` for readability
- Use Momentum design tokens when available
- Keep component styles scoped

### 5. Constants File (`constants.ts`)

```typescript
// constants.ts
export const COMPONENT_NAME = 'ComponentName';

export const DEFAULT_TIMEOUT = 5000;

export const ERROR_MESSAGES = {
  LOAD_FAILED: 'Failed to load data',
  INVALID_INPUT: 'Invalid input provided',
} as const;

export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
```

## Using Momentum Design Components

Always use Momentum components instead of HTML elements when available:

```typescript
import {
  Button,
  Icon,
  Text,
  Input,
  Select,
  Option,
  Tooltip,
  Modal,
  Dialog
} from '@momentum-design/components/dist/react';

// Good
<Button onClick={handleClick}>
  <Icon name="add" />
  Add Item
</Button>

// Avoid
<button onClick={handleClick}>Add Item</button>
```

## Component with Store (MobX Observer)

```typescript
import { observer } from 'mobx-react-lite';
import { Store } from '@webex/cc-store';

const ComponentWithStore: React.FunctionComponent<Props> = observer((props) => {
  const store = Store.getInstance();

  // Component automatically re-renders when store.someValue changes
  return (
    <div>
      <Text>{store.someValue}</Text>
      <Button onClick={() => store.updateValue('new value')}>
        Update
      </Button>
    </div>
  );
});

export const MyComponent = withMetrics(ComponentWithStore);
```

## Exporting Components

### For React Components (`src/index.ts`)

```typescript
// src/index.ts
export {ComponentName} from './components/ComponentName/component-name';
export type {ComponentNameProps} from './components/ComponentName/component-name.types';
```

### For Web Components (`src/wc.ts`)

```typescript
// src/wc.ts
import r2wc from '@r2wc/react-to-web-component';
import {ComponentName} from './components/ComponentName/component-name';

const ComponentNameWC = r2wc(ComponentName, {
  props: {
    someProperty: 'string',
    data: 'json',
    onAction: 'function',
  },
});

customElements.define('widget-component-name', ComponentNameWC);
```

## Testing the Component

After creating a component:

1. **Build the package**:

   ```bash
   yarn workspace @webex/cc-components run build:src
   ```

2. **Test in sample app**:

   ```bash
   yarn samples:serve-react
   ```

3. **Add unit tests** (see `unit-testing.md`)

4. **Add to documentation** (update README if needed)

## Common Patterns

### Conditional Rendering

```typescript
{isVisible && <ComponentName />}
{status === 'loading' ? <Spinner /> : <Content />}
```

### List Rendering

```typescript
{items.map(item => (
  <ItemComponent key={item.id} data={item} />
))}
```

### Event Handlers with Parameters

```typescript
const handleItemClick = (itemId: string) => () => {
  logger?.info('Item clicked', { itemId });
  onItemAction?.(itemId);
};

<Button onClick={handleItemClick(item.id)}>Click</Button>
```

### Refs for DOM Access

```typescript
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

<Input ref={inputRef} />
```

## Next Steps

- See `state-management.md` for MobX patterns
- See `unit-testing.md` for testing components
- See `code-standards.md` for coding conventions
