# Code Generation Module

## Overview

This module provides templates and patterns for generating widget code following the architecture: **Widget → Hook → Component → Store → SDK**

**Purpose:** Generate complete widget code with proper layer separation

**Prerequisites:** Completed 01-pre-questions.md

---

## Directory Structure

First, create the widget directory structure:

```bash
packages/contact-center/{widget-name}/
├── src/
│   ├── {widget-name}/
│   │   ├── index.tsx              # Main widget component
│   │   └── {widget-name}.types.ts # Type definitions
│   ├── helper.ts                  # Custom hook (business logic)
│   ├── index.ts                   # Package exports with metrics
│   └── wc.ts                      # Web Component export
├── ai-prompts/
│   ├── agent.md                   # Usage documentation (use template)
│   └── architecture.md            # Technical documentation (use template)
├── tests/
│   ├── helper.ts                  # Hook tests
│   └── {widget-name}/
│       └── index.tsx              # Widget tests
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── webpack.config.js
├── babel.config.js
└── eslint.config.mjs
```

---

## Step 1: Type Definitions

**File:** `src/{widget-name}/{widget-name}.types.ts`

```typescript
/**
 * Props for {WidgetName} widget
 */
export interface {WidgetName}Props {
  // ========================================
  // REQUIRED PROPS
  // ========================================
  
  /**
   * Required prop description
   * @example "example-value"
   */
  requiredProp: string;
  
  // ========================================
  // OPTIONAL PROPS
  // ========================================
  
  /**
   * Optional prop description
   * @default defaultValue
   */
  optionalProp?: number;
  
  /**
   * Custom styles to apply
   */
  className?: string;
  
  /**
   * Custom inline styles
   */
  customStyles?: React.CSSProperties;
  
  // ========================================
  // CALLBACKS
  // ========================================
  
  /**
   * Called when primary action occurs
   * @param data - Event data
   */
  onSomeEvent?: (data: SomeData) => void;
  
  /**
   * Called when error occurs
   * @param error - Error object
   */
  onError?: (error: Error) => void;
}

// ========================================
// SUPPORTING TYPES
// ========================================

/**
 * Data structure for event
 */
export interface SomeData {
  id: string;
  value: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Add other interfaces as needed
 */
```

**Pattern Notes:**
- Document ALL props with JSDoc comments
- Group props logically (required, optional, callbacks)
- Use descriptive names
- Add @example tags for complex props
- Export all types that consumers need

---

## Step 2: Custom Hook (Business Logic)

**File:** `src/helper.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { runInAction } from 'mobx';
import store from '@webex/cc-store';
import type { {WidgetName}Props, SomeData } from './{widget-name}/{widget-name}.types';

/**
 * Custom hook for {WidgetName} business logic
 * Handles store integration, SDK calls, and state management
 */
export function use{WidgetName}(props: {WidgetName}Props) {
  // ========================================
  // LOCAL STATE
  // ========================================
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SomeData | null>(null);
  
  // ========================================
  // STORE OBSERVABLES (READ)
  // ========================================
  
  // Read observable values from store
  const storeValue = store.someObservable;
  const anotherValue = store.anotherObservable;
  
  // ========================================
  // INITIALIZATION
  // ========================================
  
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch initial data from SDK (if needed)
        // const result = await store.cc.someMethod(params);
        // setData(result);
        
      } catch (err) {
        const error = err as Error;
        setError(error);
        props.onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
    
    // Cleanup
    return () => {
      // Unsubscribe from events
      // Clear timers
      // Cancel pending requests
    };
  }, []); // Add dependencies as needed
  
  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  /**
   * Handles primary action
   */
  const handleAction = useCallback(async (param: string) => {
    try {
      // Call SDK method
      // const result = await store.cc.someAction(param);
      
      // Update store (if needed)
      runInAction(() => {
        // store.setSomeValue(newValue);
      });
      
      // Call callback
      props.onSomeEvent?.({
        id: 'id',
        value: param,
        timestamp: Date.now(),
      });
      
    } catch (err) {
      const error = err as Error;
      setError(error);
      props.onError?.(error);
    }
  }, [props]);
  
  /**
   * Handles secondary action
   */
  const handleSecondaryAction = useCallback(() => {
    // Implementation
  }, []);
  
  // ========================================
  // RETURN API
  // ========================================
  
  return {
    // State
    data,
    isLoading,
    error,
    storeValue,
    
    // Handlers
    handleAction,
    handleSecondaryAction,
  };
}
```

**Pattern Notes:**
- Use `useCallback` for handlers to prevent re-renders
- Use `runInAction` for store mutations
- Handle errors and call `onError` callback
- Clean up subscriptions in useEffect return
- Document all returned values

---

## Step 3: Widget Component

**File:** `src/{widget-name}/index.tsx`

```typescript
import React from 'react';
import { observer } from 'mobx-react-lite';
import { ErrorBoundary } from 'react-error-boundary';
import { use{WidgetName} } from '../helper';
import { {WidgetName}Component } from '@webex/cc-components';
import type { {WidgetName}Props } from './{widget-name}.types';

/**
 * Internal widget component (with observer HOC)
 * This is the smart/container component
 */
const {WidgetName}Internal: React.FC<{WidgetName}Props> = observer((props) => {
  const {
    className = '',
    customStyles,
    ...restProps
  } = props;
  
  // Use custom hook for business logic
  const {
    data,
    isLoading,
    error,
    storeValue,
    handleAction,
    handleSecondaryAction,
  } = use{WidgetName}(props);
  
  // Handle error state
  if (error) {
    return (
      <div className={`{widget-name} {widget-name}--error ${className}`} style={customStyles}>
        <div className="{widget-name}__error-message">
          Error: {error.message}
        </div>
      </div>
    );
  }
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className={`{widget-name} {widget-name}--loading ${className}`} style={customStyles}>
        <div className="{widget-name}__loader">Loading...</div>
      </div>
    );
  }
  
  // Render presentational component
  return (
    <{WidgetName}Component
      className={className}
      customStyles={customStyles}
      data={data}
      storeValue={storeValue}
      onAction={handleAction}
      onSecondaryAction={handleSecondaryAction}
      {...restProps}
    />
  );
});

// Display name for debugging
{WidgetName}Internal.displayName = '{WidgetName}Internal';

/**
 * {WidgetName} widget with error boundary
 * This is the public export
 */
const {WidgetName}: React.FC<{WidgetName}Props> = (props) => (
  <ErrorBoundary
    fallback={
      <div className="{widget-name} {widget-name}--error">
        <div className="{widget-name}__error-boundary">
          Something went wrong. Please try again.
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('{WidgetName} Error:', error, errorInfo);
      props.onError?.(error);
    }}
  >
    <{WidgetName}Internal {...props} />
  </ErrorBoundary>
);

// Display name for debugging
{WidgetName}.displayName = '{WidgetName}';

export { {WidgetName} };
export type { {WidgetName}Props };
```

**Pattern Notes:**
- MUST use `observer` HOC for MobX reactivity
- MUST wrap with `ErrorBoundary`
- Handle loading and error states
- Pass only processed data to presentational component
- Set display names for debugging

---

## Step 4: Package Exports

**File:** `src/index.ts`

```typescript
import { {WidgetName} } from './{widget-name}';
import { withMetrics } from '@webex/cc-ui-logging';

/**
 * {WidgetName} wrapped with metrics tracking
 * Automatically logs:
 * - WIDGET_MOUNTED
 * - WIDGET_UNMOUNTED
 * - Errors (if onError not handled)
 */
const {WidgetName}WithMetrics = withMetrics({WidgetName}, '{WidgetName}');

// Export with metrics wrapper
export { {WidgetName}WithMetrics as {WidgetName} };

// Export types
export type { {WidgetName}Props } from './{widget-name}/{widget-name}.types';
```

**Pattern Notes:**
- ALWAYS wrap with `withMetrics` HOC
- Export wrapped version as default
- Export types separately

---

## Step 5: Web Component Export

**File:** `src/wc.ts`

```typescript
import { {WidgetName} } from './{widget-name}';

/**
 * Export unwrapped component for r2wc conversion
 * The metrics wrapper interferes with r2wc, so we export clean component
 */
export { {WidgetName} };
```

**Pattern Notes:**
- Export WITHOUT metrics wrapper
- r2wc wrapping happens in cc-widgets
- Keep minimal - just re-export

---

## Step 6: Package Configuration

### package.json

**File:** `package.json`

```json
{
  "name": "@webex/cc-{widget-name}",
  "description": "Webex Contact Center Widgets: {Widget Display Name}",
  "license": "Cisco's General Terms (https://www.cisco.com/site/us/en/about/legal/contract-experience/index.html)",
  "version": "1.28.0-ccwidgets.124",
  "main": "dist/index.js",
  "types": "dist/types/index.d.ts",
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "dist/",
    "package.json"
  ],
  "scripts": {
    "clean": "rm -rf dist && rm -rf node_modules",
    "clean:dist": "rm -rf dist",
    "build": "yarn run -T tsc",
    "build:src": "yarn run clean:dist && webpack",
    "build:watch": "webpack --watch",
    "test:unit": "tsc --project tsconfig.test.json && jest --coverage",
    "test:styles": "eslint"
  },
  "dependencies": {
    "@webex/cc-components": "workspace:*",
    "@webex/cc-store": "workspace:*",
    "mobx-react-lite": "^4.1.0",
    "react-error-boundary": "^6.0.0"
  },
  "devDependencies": {
    "@babel/core": "7.25.2",
    "@babel/preset-env": "7.25.4",
    "@babel/preset-react": "7.24.7",
    "@babel/preset-typescript": "7.25.9",
    "@eslint/js": "^9.20.0",
    "@testing-library/dom": "10.4.0",
    "@testing-library/jest-dom": "6.6.2",
    "@testing-library/react": "16.0.1",
    "@types/jest": "29.5.14",
    "@types/node": "^22.13.13",
    "@webex/test-fixtures": "workspace:*",
    "babel-jest": "29.7.0",
    "babel-loader": "9.2.1",
    "eslint": "^9.20.1",
    "jest": "29.7.0",
    "jest-environment-jsdom": "29.7.0",
    "typescript": "5.6.3",
    "webpack": "5.94.0",
    "webpack-cli": "5.1.4"
  },
  "peerDependencies": {
    "@momentum-ui/react-collaboration": ">=26.201.9",
    "react": ">=18.3.1",
    "react-dom": ">=18.3.1"
  }
}
```

---

### Configuration Files

**Copy these from station-login without modification:**

1. **tsconfig.json** - TypeScript configuration
2. **tsconfig.test.json** - TypeScript test configuration
3. **webpack.config.js** - Webpack bundling
4. **babel.config.js** - Babel transpilation
5. **eslint.config.mjs** - ESLint rules

**Command to copy:**
```bash
# From project root
cp packages/contact-center/station-login/tsconfig.json packages/contact-center/{widget-name}/
cp packages/contact-center/station-login/tsconfig.test.json packages/contact-center/{widget-name}/
cp packages/contact-center/station-login/webpack.config.js packages/contact-center/{widget-name}/
cp packages/contact-center/station-login/babel.config.js packages/contact-center/{widget-name}/
cp packages/contact-center/station-login/eslint.config.mjs packages/contact-center/{widget-name}/
```

---

## Code Quality Checklist

Before proceeding to next module, verify:

### Architecture
- [ ] Widget → Hook → Component layer separation maintained
- [ ] No layer violations (Widget doesn't call SDK directly)
- [ ] Component doesn't access store directly

### MobX Integration
- [ ] Widget wrapped with `observer` HOC
- [ ] Store mutations use `runInAction`
- [ ] No reactions created in render

### Error Handling
- [ ] ErrorBoundary wraps widget
- [ ] Try-catch in async operations
- [ ] onError callback called on errors
- [ ] Error states displayed to user

### TypeScript
- [ ] All types exported
- [ ] Props interface documented with JSDoc
- [ ] No `any` types (use proper types)
- [ ] Optional props marked with `?`

### React Best Practices
- [ ] useCallback for handlers
- [ ] useEffect cleanup functions
- [ ] Display names set
- [ ] Loading states handled
- [ ] Error states handled

### Metrics
- [ ] Widget wrapped with `withMetrics` in index.ts
- [ ] NOT wrapped in wc.ts (for r2wc compatibility)

---

## Next Steps

**After code generation complete:**

1. **If new components needed:**
   - Go to: 03-component-generation.md
   
2. **If using existing components:**
   - Skip to: 04-integration.md

3. **Always required:**
   - 04-integration.md
   - 05-test-generation.md
   - ../documentation/create-agent-md.md
   - ../documentation/create-architecture-md.md
   - 06-validation.md

---

## Reference Widgets

**For patterns and examples, see:**
- Simple: `packages/contact-center/station-login/`
- Medium: `packages/contact-center/user-state/`
- Complex: `packages/contact-center/task/`

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

