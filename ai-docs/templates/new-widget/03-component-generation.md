# Component Generation Module

## Overview

This module guides you through creating new presentational components in the cc-components library.

**⚠️ Only use this module if:** Pre-questions indicated new components are needed

**Purpose:** Generate pure presentational components

**Location:** `packages/contact-center/cc-components/`

---

## When to Create New Components

**Create new component when:**
- Widget needs UI that doesn't exist in cc-components
- Reusable UI pattern that other widgets might use
- Complex UI that should be tested in isolation

**Use existing component when:**
- Similar component already exists
- Component can be customized via props
- Minor styling changes only

---

## Component Directory Structure

Create in `packages/contact-center/cc-components/src/components/{ComponentName}/`:

```
{ComponentName}/
├── {component-name}.tsx       # Component implementation
├── {component-name}.types.ts  # TypeScript interfaces
├── {component-name}.scss      # Styles (optional)
├── {component-name}.utils.ts  # Helper functions (optional)
└── constants.ts               # Constants (optional)
```

---

## Step 1: Component Types

**File:** `src/components/{ComponentName}/{component-name}.types.ts`

```typescript
import { CSSProperties } from 'react';

/**
 * Props for {ComponentName} component
 */
export interface {ComponentName}Props {
  // ========================================
  // DATA PROPS
  // ========================================
  
  /**
   * Main data to display
   */
  data: SomeDataType;
  
  /**
   * Additional data (optional)
   */
  metadata?: MetadataType;
  
  // ========================================
  // BEHAVIOR PROPS
  // ========================================
  
  /**
   * Callback when user interacts
   * @param data - Interaction data
   */
  onAction?: (data: ActionData) => void;
  
  /**
   * Callback on error
   * @param error - Error object
   */
  onError?: (error: Error) => void;
  
  // ========================================
  // STYLING PROPS
  // ========================================
  
  /**
   * Custom CSS class
   */
  className?: string;
  
  /**
   * Custom inline styles
   */
  customStyles?: CSSProperties;
  
  /**
   * Disable the component
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Loading state
   * @default false
   */
  isLoading?: boolean;
}

/**
 * Supporting types
 */
export interface SomeDataType {
  id: string;
  name: string;
  value: string;
}

export interface ActionData {
  id: string;
  action: string;
  timestamp: number;
}
```

---

## Step 2: Component Implementation

**File:** `src/components/{ComponentName}/{component-name}.tsx`

```typescript
import React from 'react';
import { Button, Icon, Input, Text } from '@momentum-design/components/dist/react';
import type { {ComponentName}Props } from './{component-name}.types';
import './{component-name}.scss';

/**
 * {ComponentName} - Pure presentational component
 * 
 * @param props - Component props
 * @returns Rendered component
 */
export const {ComponentName}: React.FC<{ComponentName}Props> = (props) => {
  const {
    data,
    metadata,
    onAction,
    onError,
    className = '',
    customStyles,
    disabled = false,
    isLoading = false,
  } = props;
  
  // ========================================
  // EVENT HANDLERS (LOCAL ONLY)
  // ========================================
  
  const handleClick = () => {
    if (disabled) return;
    
    try {
      onAction?.({
        id: data.id,
        action: 'clicked',
        timestamp: Date.now(),
      });
    } catch (error) {
      onError?.(error as Error);
    }
  };
  
  // ========================================
  // RENDER
  // ========================================
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className={`{component-name} {component-name}--loading ${className}`} style={customStyles}>
        <div className="{component-name}__loader">Loading...</div>
      </div>
    );
  }
  
  // Handle no data
  if (!data) {
    return (
      <div className={`{component-name} {component-name}--empty ${className}`} style={customStyles}>
        <div className="{component-name}__empty">No data available</div>
      </div>
    );
  }
  
  // Main render
  return (
    <div 
      className={`{component-name} ${disabled ? '{component-name}--disabled' : ''} ${className}`}
      style={customStyles}
    >
      <div className="{component-name}__header">
        <Text type="body-large-bold">{data.name}</Text>
      </div>
      
      <div className="{component-name}__content">
        <Text>{data.value}</Text>
        
        {metadata && (
          <div className="{component-name}__metadata">
            <Text type="body-small">{metadata.info}</Text>
          </div>
        )}
      </div>
      
      <div className="{component-name}__actions">
        <Button
          variant="primary"
          disabled={disabled}
          onClick={handleClick}
          aria-label="Perform action"
        >
          <Icon name="check" />
          Action
        </Button>
      </div>
    </div>
  );
};

// Display name
{ComponentName}.displayName = '{ComponentName}';
```

**Pattern Notes:**
- **Pure presentational** - No store access
- **All data via props** - No side effects
- **Use Momentum UI** - Button, Icon, Input, Text, etc.
- **Handle states** - Loading, error, empty, disabled
- **BEM naming** - Use consistent class names
- **Accessibility** - Add aria-labels

---

## Step 3: Component Styles (Optional)

**File:** `src/components/{ComponentName}/{component-name}.scss`

```scss
// BEM naming convention
.{component-name} {
  padding: 1rem;
  border: 1px solid var(--mds-color-theme-outline-secondary-normal);
  border-radius: 0.5rem;
  
  // Modifiers
  &--loading {
    opacity: 0.6;
  }
  
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  &--error {
    border-color: var(--mds-color-theme-outline-error-normal);
  }
  
  &--empty {
    text-align: center;
    padding: 2rem;
  }
  
  // Elements
  &__header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--mds-color-theme-outline-secondary-normal);
  }
  
  &__content {
    margin-bottom: 1rem;
  }
  
  &__metadata {
    margin-top: 0.5rem;
    color: var(--mds-color-theme-text-secondary-normal);
  }
  
  &__actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  
  &__loader,
  &__error-message,
  &__empty {
    padding: 1rem;
    text-align: center;
  }
  
  &__error-message {
    color: var(--mds-color-theme-text-error-normal);
  }
}
```

**Pattern Notes:**
- Use BEM naming (block__element--modifier)
- Use Momentum UI CSS variables
- Support light and dark themes
- Keep selectors simple
- Avoid deep nesting

---

## Step 4: Component Utils (Optional)

**File:** `src/components/{ComponentName}/{component-name}.utils.ts`

```typescript
import type { SomeDataType } from './{component-name}.types';

/**
 * Helper function to transform data
 * @param input - Raw data
 * @returns Transformed data
 */
export const transformData = (input: any): SomeDataType => {
  return {
    id: input.id,
    name: input.name || 'Unknown',
    value: input.value || '',
  };
};

/**
 * Validate data
 * @param data - Data to validate
 * @returns True if valid
 */
export const validateData = (data: SomeDataType): boolean => {
  return Boolean(data.id && data.name);
};

/**
 * Format value for display
 * @param value - Raw value
 * @returns Formatted value
 */
export const formatValue = (value: string): string => {
  return value.trim().toUpperCase();
};
```

---

## Step 5: Export from cc-components

**File:** `packages/contact-center/cc-components/src/index.ts`

Add exports for new component:

```typescript
// ... existing exports ...

// NEW: Add component export
export { {ComponentName} } from './components/{ComponentName}/{component-name}';
export type { {ComponentName}Props } from './components/{ComponentName}/{component-name}.types';
```

---

## Step 6: Component Tests

**File:** `packages/contact-center/cc-components/tests/components/{ComponentName}/{component-name}.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { {ComponentName} } from '../../../src/components/{ComponentName}/{component-name}';
import type { {ComponentName}Props } from '../../../src/components/{ComponentName}/{component-name}.types';

describe('{ComponentName}', () => {
  const mockData = {
    id: 'test-id',
    name: 'Test Name',
    value: 'Test Value',
  };

  const defaultProps: {ComponentName}Props = {
    data: mockData,
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<{ComponentName} {...defaultProps} />);
    expect(screen.getByText('Test Name')).toBeInTheDocument();
  });

  it('displays data correctly', () => {
    render(<{ComponentName} {...defaultProps} />);
    
    expect(screen.getByText('Test Name')).toBeInTheDocument();
    expect(screen.getByText('Test Value')).toBeInTheDocument();
  });

  it('calls onAction when button clicked', () => {
    const mockAction = jest.fn();
    
    render(
      <{ComponentName}
        {...defaultProps}
        onAction={mockAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /action/i }));
    
    expect(mockAction).toHaveBeenCalledWith({
      id: 'test-id',
      action: 'clicked',
      timestamp: expect.any(Number),
    });
  });

  it('handles disabled state', () => {
    render(
      <{ComponentName}
        {...defaultProps}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('handles loading state', () => {
    render(
      <{ComponentName}
        {...defaultProps}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles no data state', () => {
    render(
      <{ComponentName}
        {...defaultProps}
        data={null}
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <{ComponentName}
        {...defaultProps}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('matches snapshot', () => {
    const { container } = render(<{ComponentName} {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

---

## Component Checklist

Before proceeding, verify:

### Component Quality
- [ ] Pure presentational (no store access)
- [ ] All data via props
- [ ] Uses Momentum UI components
- [ ] Handles loading state
- [ ] Handles error state
- [ ] Handles empty state
- [ ] Handles disabled state
- [ ] Accessible (aria-labels, keyboard navigation)

### Types & Documentation
- [ ] Types exported from component
- [ ] JSDoc comments on props
- [ ] Examples in comments
- [ ] Display name set

### Styling
- [ ] SCSS file created (if needed)
- [ ] BEM naming used
- [ ] Momentum UI variables used
- [ ] Theme support (light/dark)
- [ ] Responsive design

### Testing
- [ ] Test file created
- [ ] Tests all states (loading, error, empty, disabled)
- [ ] Tests callbacks
- [ ] Tests props
- [ ] Snapshot test included
- [ ] All tests pass

### Exports
- [ ] Component exported from cc-components/src/index.ts
- [ ] Types exported from cc-components/src/index.ts

---

## Next Steps

**After component generation:**
1. Go to: 04-integration.md
2. Then: 05-test-generation.md (widget tests)
3. Then: Documentation templates
4. Finally: 06-validation.md

---

## Reference Components

**For patterns and examples:**
- `packages/contact-center/cc-components/src/components/StationLogin/`
- `packages/contact-center/cc-components/src/components/UserState/`
- `packages/contact-center/cc-components/src/components/task/CallControl/`

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

