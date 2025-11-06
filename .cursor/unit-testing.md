# Unit Testing with Jest

## Overview

The repository uses **Jest** with **React Testing Library** for unit testing.

- **Test Framework**: Jest 29.7.0
- **React Testing**: @testing-library/react 16.0.1
- **Environment**: jsdom (simulated browser)
- **Coverage**: Built-in Jest coverage reporting

## Test Location

Each package has its own tests:

```
packages/contact-center/
├── cc-components/
│   └── src/
│       └── components/
│           └── ComponentName/
│               ├── tests/                    # Preferred location
│               │   └── component-name.test.tsx
│               └── __tests__/                # Alternative location
│                   └── component-name.test.tsx
├── store/
│   └── tests/
│       └── store.test.ts
├── station-login/
│   └── tests/
└── task/
    └── tests/
```

## Running Tests

### All Tests

```bash
# Run all unit tests in all packages
yarn run test:cc-widgets

# Run tests in specific package
yarn workspace @webex/cc-components run test:unit

# With coverage
yarn workspace @webex/cc-components run test:unit --coverage

# Watch mode
yarn workspace @webex/cc-components run test:unit --watch
```

### Specific Test File

```bash
yarn workspace @webex/cc-components run test:unit -- ComponentName.test.tsx

# Pattern matching
yarn workspace @webex/cc-components run test:unit -- --testNamePattern="should render"
```

### Coverage Reports

After running with `--coverage`, view reports in:

- Terminal output
- `coverage/lcov-report/index.html` (open in browser)

## Test File Structure

### Basic Test Template

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MyComponent } from './my-component';
import { MyComponentProps } from './my-component.types';

describe('MyComponent', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  const defaultProps: MyComponentProps = {
    title: 'Test Title',
    items: [],
    onAction: jest.fn(),
    logger: mockLogger,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render correctly', () => {
    render(<MyComponent {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<MyComponent {...defaultProps} />);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
    render(<MyComponent {...defaultProps} isLoading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle async operations', async () => {
    render(<MyComponent {...defaultProps} />);

    const asyncButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(asyncButton);

    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
});
```

## Common Testing Patterns

### Rendering Components

```typescript
import { render } from '@testing-library/react';

// Basic render
const { container } = render(<MyComponent prop="value" />);

// With multiple children
render(
  <ParentComponent>
    <ChildComponent />
  </ParentComponent>
);

// Re-render with new props
const { rerender } = render(<MyComponent count={0} />);
rerender(<MyComponent count={1} />);
```

### Querying Elements

```typescript
import {screen} from '@testing-library/react';

// By text
screen.getByText('Submit');
screen.getByText(/submit/i); // Case insensitive regex

// By role
screen.getByRole('button', {name: /submit/i});
screen.getByRole('textbox', {name: /username/i});
screen.getByRole('heading', {level: 1});

// By test ID
screen.getByTestId('custom-element');

// Query variants
screen.getByText('text'); // Throws if not found
screen.queryByText('text'); // Returns null if not found
screen.findByText('text'); // Async, waits for element

// Multiple elements
screen.getAllByRole('listitem');
```

### User Interactions

```typescript
import {fireEvent, userEvent} from '@testing-library/react';

// fireEvent (synthetic events)
const button = screen.getByRole('button');
fireEvent.click(button);

const input = screen.getByRole('textbox');
fireEvent.change(input, {target: {value: 'new value'}});

// Mouse events
fireEvent.mouseEnter(element);
fireEvent.mouseLeave(element);

// Keyboard events
fireEvent.keyDown(input, {key: 'Enter', code: 'Enter'});
```

### Async Testing

```typescript
import {waitFor, waitForElementToBeRemoved} from '@testing-library/react';

// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Wait for element to disappear
await waitForElementToBeRemoved(() => screen.queryByText('Loading'));

// With timeout
await waitFor(
  () => {
    expect(screen.getByText('Data')).toBeInTheDocument();
  },
  {timeout: 3000}
);

// Find queries (implicitly async)
const element = await screen.findByText('Async content');
```

### Mocking Functions

```typescript
// Mock callback functions
const mockOnClick = jest.fn();
const mockOnChange = jest.fn();

render(<MyComponent onClick={mockOnClick} onChange={mockOnChange} />);

// Assertions
expect(mockOnClick).toHaveBeenCalled();
expect(mockOnClick).toHaveBeenCalledTimes(1);
expect(mockOnClick).toHaveBeenCalledWith('argument');
expect(mockOnChange).toHaveBeenLastCalledWith({ value: 'test' });

// Mock implementation
const mockFn = jest.fn().mockImplementation((x) => x * 2);
const mockFn = jest.fn().mockReturnValue(42);
const mockFn = jest.fn().mockResolvedValue('async result');
const mockFn = jest.fn().mockRejectedValue(new Error('error'));
```

### Mocking Modules

```typescript
// Mock entire module
jest.mock('@webex/cc-store', () => ({
  Store: {
    getInstance: jest.fn(() => ({
      someState: 'test',
      setSomeState: jest.fn(),
    })),
  },
}));

// Mock specific exports
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  helperFunction: jest.fn().mockReturnValue('mocked'),
}));

// Mock module in test
jest.mock('@webex/cc-ui-logging', () => ({
  withMetrics: (component: any) => component,
}));
```

## Testing Components with MobX Store

```typescript
import { render, screen } from '@testing-library/react';
import { Store } from '@webex/cc-store';
import { ComponentWithStore } from './component-with-store';

// Mock the store
jest.mock('@webex/cc-store', () => {
  const mockStore = {
    someState: 'initial',
    isLoading: false,
    items: [],
    setSomeState: jest.fn(),
    addItem: jest.fn(),
  };

  return {
    Store: {
      getInstance: jest.fn(() => mockStore),
    },
  };
});

describe('ComponentWithStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display store state', () => {
    const mockStore = Store.getInstance() as any;
    mockStore.someState = 'test value';

    render(<ComponentWithStore />);

    expect(screen.getByText('test value')).toBeInTheDocument();
  });

  it('should call store methods', () => {
    const mockStore = Store.getInstance() as any;

    render(<ComponentWithStore />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockStore.setSomeState).toHaveBeenCalledWith('new value');
  });
});
```

## Testing Hooks

```typescript
import {renderHook, act} from '@testing-library/react';
import {useCustomHook} from './useCustomHook';

describe('useCustomHook', () => {
  it('should update value', () => {
    const {result} = renderHook(() => useCustomHook());

    expect(result.current.value).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.value).toBe(1);
  });
});
```

## Snapshot Testing

```typescript
import { render } from '@testing-library/react';

describe('MyComponent snapshots', () => {
  it('should match snapshot', () => {
    const { container } = render(<MyComponent title="Test" />);
    expect(container).toMatchSnapshot();
  });

  it('should match inline snapshot', () => {
    const { container } = render(<MyComponent title="Test" />);
    expect(container.innerHTML).toMatchInlineSnapshot(`
      "<div class=\\"my-component\\">
        <h1>Test</h1>
      </div>"
    `);
  });
});
```

## Testing with Momentum Components

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@momentum-design/components/dist/react';

// Momentum components may need special handling
describe('Component with Momentum', () => {
  it('should render Momentum button', () => {
    render(
      <Button onClick={mockFn}>
        Click Me
      </Button>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockFn).toHaveBeenCalled();
  });
});
```

## Common Matchers

```typescript
// Presence
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeEmpty();

// Content
expect(element).toHaveTextContent('text');
expect(element).toContainHTML('<span>html</span>');

// Attributes
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveClass('my-class');
expect(element).toHaveStyle({color: 'red'});

// Form elements
expect(input).toHaveValue('value');
expect(input).toBeDisabled();
expect(input).toBeEnabled();
expect(checkbox).toBeChecked();

// Focus
expect(element).toHaveFocus();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(3.14, 2);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain('item');
expect(array).toEqual(expect.arrayContaining(['a', 'b']));

// Objects
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({key: 'value'});
expect(obj).toEqual({key: 'value'}); // Deep equality
```

## Jest Configuration

Root configuration in `jest.config.js`:

```javascript
module.exports = {
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'babel-jest',
  },
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['/node_modules/(?!(@momentum-design|@momentum-ui|@lit|lit|react-error-boundary))'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
};
```

Setup file `jest.setup.js`:

```javascript
import '@testing-library/jest-dom';

// Mock canvas for components using canvas
import 'jest-canvas-mock';

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
```

## Best Practices

### ✅ Do

- Test user behavior, not implementation
- Use `screen` queries over container queries
- Use `userEvent` for more realistic interactions
- Test accessibility (roles, labels)
- Mock external dependencies
- Clean up mocks with `beforeEach`/`afterEach`
- Test error states and edge cases
- Use descriptive test names

### ❌ Don't

- Test implementation details
- Query by CSS classes or IDs (prefer roles/labels)
- Test internal state directly
- Over-mock (mock only what's necessary)
- Write tests that depend on each other
- Forget to handle async operations
- Snapshot everything (use sparingly)

## Debugging Tests

```bash
# Run single test file
yarn test -- ComponentName.test.tsx

# Run with verbose output
yarn test -- --verbose

# Run with coverage
yarn test -- --coverage

# Debug in VS Code
# Add breakpoint, then run "Jest: Debug" from command palette
```

## Coverage Requirements

Aim for:

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

View coverage:

```bash
yarn workspace @webex/cc-components run test:unit --coverage
open coverage/lcov-report/index.html
```

## Next Steps

- See `e2e-testing.md` for Playwright E2E tests
- See `component-patterns.md` for component structure
- See `state-management.md` for testing with MobX
