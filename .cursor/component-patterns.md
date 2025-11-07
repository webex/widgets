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

### Step 1: Export from Component Package

After creating a widget in its own package (e.g., `@webex/cc-my-widget`):

```typescript
// packages/contact-center/my-widget/src/index.ts
export {MyWidget} from './my-widget';
export type {MyWidgetProps} from './my-widget.types';
```

### Step 2: Expose Through cc-widgets Package

⚠️ **CRITICAL**: All widgets MUST be exposed through `@webex/cc-widgets` package for consumers to use.

#### For React Components (`cc-widgets/src/index.ts`)

```typescript
// packages/contact-center/cc-widgets/src/index.ts
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import {MyWidget} from '@webex/cc-my-widget'; // Add your widget
import store from '@webex/cc-store';
import '@momentum-ui/core/css/momentum-ui.min.css';

// Re-export all widgets
export {
  StationLogin,
  UserState,
  MyWidget, // Export your widget
  store,
};
```

#### For Web Components (`cc-widgets/src/wc.ts`)

```typescript
// packages/contact-center/cc-widgets/src/wc.ts
import r2wc from '@r2wc/react-to-web-component';
import {MyWidget} from '@webex/cc-my-widget';

// 1. Wrap React component with r2wc
const WebMyWidget = r2wc(MyWidget, {
  props: {
    // Map prop types (string, number, boolean, json, function)
    title: 'string',
    config: 'json',
    onAction: 'function',
  },
});

// 2. Add to components array
const components = [
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-my-widget', component: WebMyWidget}, // Add your widget
  // ... other widgets
];

// 3. Components are auto-registered
components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});
```

**Web Component Naming Convention**: `widget-cc-{component-name}` (kebab-case)

**Prop Type Mapping**:

- `'string'` - String values
- `'number'` - Numeric values
- `'boolean'` - Boolean values
- `'json'` - Objects and arrays
- `'function'` - Callback functions

## Testing the Component

### Step 1: Build the Packages

```bash
# Build your widget package
yarn workspace @webex/cc-my-widget run build:src

# Build cc-widgets (to expose your widget)
yarn workspace @webex/cc-widgets run build:src
```

### Step 2: Add to Sample React App

⚠️ **IMPORTANT**: ALL widgets must be tested in the sample React app (`widgets-samples/cc/samples-cc-react-app`).

**Add your widget to the sample app:**

```typescript
// widgets-samples/cc/samples-cc-react-app/src/App.tsx
import {
  StationLogin,
  UserState,
  MyWidget,  // Import from @webex/cc-widgets
  store,
} from '@webex/cc-widgets';

// Add to default widgets configuration
const defaultWidgets = {
  stationLogin: true,
  userState: true,
  myWidget: true,  // Add your widget toggle
  // ... other widgets
};

function App() {
  const [selectedWidgets, setSelectedWidgets] = useState(() => {
    const savedWidgets = window.localStorage.getItem('selectedWidgets');
    return savedWidgets ? JSON.parse(savedWidgets) : defaultWidgets;
  });

  return (
    <div className="app">
      {/* Add widget toggle in sidebar */}
      <div className="widget-controls">
        <Checkbox
          checked={selectedWidgets.myWidget}
          onChange={(e) => handleWidgetToggle('myWidget', e.target.checked)}
        >
          My Widget
        </Checkbox>
      </div>

      {/* Render your widget */}
      <ThemeProvider theme={currentTheme}>
        <IconProvider>
          {selectedWidgets.myWidget && (
            <div className="widget-container">
              <MyWidget
                title="Test Widget"
                onAction={handleMyWidgetAction}
              />
            </div>
          )}
        </IconProvider>
      </ThemeProvider>
    </div>
  );
}
```

### Step 3: Run and Test

```bash
# Start the sample app
yarn samples:serve-react

# Open http://localhost:3000
# Toggle your widget on/off to test
# Verify all functionality works
```

### Step 4: Test as Web Component (Optional)

```html
<!-- widgets-samples/cc/samples-cc-wc-app/index.html -->
<script src="bundle.js"></script>
<widget-cc-my-widget title="Test"></widget-cc-my-widget>
```

```bash
yarn samples:serve-wc
```

### Step 5: Add Unit Tests

See `unit-testing.md` for testing patterns.

### Step 6: Add E2E Tests (if applicable)

See `e2e-testing.md` for Playwright tests.

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
