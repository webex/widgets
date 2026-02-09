# Test Generation Module

## Overview

This module guides you through generating comprehensive tests for the widget: unit tests, hook tests, and E2E tests.

**Purpose:** Ensure widget quality and prevent regressions

**Prerequisites:** Widget and integration code complete

---

## Test Structure

```
packages/contact-center/{widget-name}/tests/
├── helper.ts                  # Hook unit tests
└── {widget-name}/
    └── index.tsx              # Widget unit tests

playwright/tests/
└── {widget-name}-test.spec.ts # E2E tests (optional)
```

---

## Step 1: Widget Unit Tests

**File:** `tests/{widget-name}/index.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { {WidgetName} } from '../../src/{widget-name}';
import type { {WidgetName}Props } from '../../src/{widget-name}/{widget-name}.types';
import { mockCC, mockProfile } from '@webex/test-fixtures';

// Mock store
jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      cc: mockCC,
      profile: mockProfile,
      // Add other store observables as needed
      someObservable: 'test-value',
    })),
    someObservable: 'test-value',
  },
}));

describe('{WidgetName}', () => {
  let defaultProps: {WidgetName}Props;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default props
    defaultProps = {
      requiredProp: 'test-value',
      onSomeEvent: jest.fn(),
      onError: jest.fn(),
    };
    
    // Setup mock responses
    mockCC.someMethod = jest.fn().mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // RENDERING TESTS
  // ========================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<{WidgetName} {...defaultProps} />);
      expect(screen.getByText(/expected text/i)).toBeInTheDocument();
    });

    it('renders with required props only', () => {
      render(
        <{WidgetName}
          requiredProp={defaultProps.requiredProp}
        />
      );
      
      expect(screen.getByText(/expected text/i)).toBeInTheDocument();
    });

    it('renders with all props', () => {
      render(
        <{WidgetName}
          {...defaultProps}
          optionalProp={10}
          className="custom-class"
        />
      );
      
      expect(screen.getByText(/expected text/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // PROP TESTS
  // ========================================

  describe('Props', () => {
    it('uses required prop correctly', () => {
      render(<{WidgetName} {...defaultProps} requiredProp="custom-value" />);
      
      // Verify prop is used
      expect(screen.getByText(/custom-value/i)).toBeInTheDocument();
    });

    it('uses optional prop when provided', () => {
      render(<{WidgetName} {...defaultProps} optionalProp={20} />);
      
      // Verify optional prop is used
      expect(screen.getByText(/20/i)).toBeInTheDocument();
    });

    it('uses default value when optional prop not provided', () => {
      render(<{WidgetName} {...defaultProps} />);
      
      // Verify default value is used
      expect(screen.getByText(/default/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <{WidgetName} {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  // ========================================
  // CALLBACK TESTS
  // ========================================

  describe('Callbacks', () => {
    it('calls onSomeEvent when action occurs', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      // Trigger action
      fireEvent.click(screen.getByRole('button', { name: /action/i }));
      
      // Wait for callback
      await waitFor(() => {
        expect(defaultProps.onSomeEvent).toHaveBeenCalledWith({
          id: expect.any(String),
          value: expect.any(String),
          timestamp: expect.any(Number),
        });
      });
    });

    it('calls onError when error occurs', async () => {
      // Setup mock to throw error
      mockCC.someMethod = jest.fn().mockRejectedValue(new Error('Test error'));
      
      render(<{WidgetName} {...defaultProps} />);
      
      // Wait for error
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Test error',
          })
        );
      });
    });

    it('does not crash when callbacks are undefined', () => {
      render(
        <{WidgetName}
          requiredProp={defaultProps.requiredProp}
        />
      );
      
      // Trigger action
      fireEvent.click(screen.getByRole('button', { name: /action/i }));
      
      // Should not crash
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ========================================
  // STATE TESTS
  // ========================================

  describe('State Management', () => {
    it('displays loading state initially', () => {
      render(<{WidgetName} {...defaultProps} />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays data after loading', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        expect(screen.getByText(/expected data/i)).toBeInTheDocument();
      });
    });

    it('displays error state when error occurs', async () => {
      mockCC.someMethod = jest.fn().mockRejectedValue(new Error('Test error'));
      
      render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(/test error/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // INTERACTION TESTS
  // ========================================

  describe('User Interactions', () => {
    it('handles button click', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /action/i }));
      
      expect(mockCC.someMethod).toHaveBeenCalled();
    });

    it('handles input change', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test input' } });
      
      expect(input).toHaveValue('test input');
    });

    it('handles form submission', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(defaultProps.onSomeEvent).toHaveBeenCalled();
      });
    });
  });

  // ========================================
  // STORE INTEGRATION TESTS
  // ========================================

  describe('Store Integration', () => {
    it('reads from store observable', () => {
      render(<{WidgetName} {...defaultProps} />);
      
      // Verify store value is displayed
      expect(screen.getByText(/test-value/i)).toBeInTheDocument();
    });

    it('calls SDK method', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockCC.someMethod).toHaveBeenCalledWith(
          expect.objectContaining({
            // Expected parameters
          })
        );
      });
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles empty data', async () => {
      mockCC.someMethod = jest.fn().mockResolvedValue(null);
      
      render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no data/i)).toBeInTheDocument();
      });
    });

    it('handles invalid prop values', () => {
      render(<{WidgetName} {...defaultProps} requiredProp="" />);
      
      // Should handle gracefully
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });

    it('handles rapid interactions', async () => {
      render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /action/i });
      
      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      // Should handle gracefully (debounce or disable)
      await waitFor(() => {
        expect(mockCC.someMethod).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ========================================
  // SNAPSHOT TEST
  // ========================================

  describe('Snapshot', () => {
    it('matches snapshot', async () => {
      const { container } = render(<{WidgetName} {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
```

---

## Step 2: Hook Unit Tests

**File:** `tests/helper.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { use{WidgetName} } from '../src/helper';
import type { {WidgetName}Props } from '../src/{widget-name}/{widget-name}.types';
import { mockCC, mockProfile } from '@webex/test-fixtures';

// Mock store
jest.mock('@webex/cc-store', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      cc: mockCC,
      profile: mockProfile,
      someObservable: 'test-value',
    })),
    someObservable: 'test-value',
  },
}));

describe('use{WidgetName}', () => {
  let defaultProps: {WidgetName}Props;

  beforeEach(() => {
    jest.clearAllMocks();
    
    defaultProps = {
      requiredProp: 'test-value',
      onSomeEvent: jest.fn(),
      onError: jest.fn(),
    };
    
    mockCC.someMethod = jest.fn().mockResolvedValue({ success: true });
  });

  // ========================================
  // INITIALIZATION TESTS
  // ========================================

  describe('Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => use{WidgetName}(defaultProps));
      
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('fetches initial data', async () => {
      mockCC.someMethod = jest.fn().mockResolvedValue({
        id: 'test-id',
        value: 'test-value',
      });
      
      const { result } = renderHook(() => use{WidgetName}(defaultProps));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual({
          id: 'test-id',
          value: 'test-value',
        });
      });
    });

    it('handles initialization error', async () => {
      const error = new Error('Init failed');
      mockCC.someMethod = jest.fn().mockRejectedValue(error);
      
      const { result } = renderHook(() => use{WidgetName}(defaultProps));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toEqual(error);
        expect(defaultProps.onError).toHaveBeenCalledWith(error);
      });
    });
  });

  // ========================================
  // HANDLER TESTS
  // ========================================

  describe('Handlers', () => {
    it('handleAction calls SDK method', async () => {
      const { result } = renderHook(() => use{WidgetName}(defaultProps));
      
      await act(async () => {
        await result.current.handleAction('test-param');
      });
      
      expect(mockCC.someAction).toHaveBeenCalledWith('test-param');
    });

    it('handleAction calls callback on success', async () => {
      mockCC.someAction = jest.fn().mockResolvedValue({ data: 'result' });
      
      const { result } = renderHook(() => use{WidgetName}(defaultProps));
      
      await act(async () => {
        await result.current.handleAction('test-param');
      });
      
      expect(defaultProps.onSomeEvent).toHaveBeenCalledWith({
        id: expect.any(String),
        value: 'test-param',
        timestamp: expect.any(Number),
      });
    });

    it('handleAction calls onError on failure', async () => {
      const error = new Error('Action failed');
      mockCC.someAction = jest.fn().mockRejectedValue(error);
      
      const { result } = renderHook(() => use{WidgetName}(defaultProps));
      
      await act(async () => {
        await result.current.handleAction('test-param');
      });
      
      expect(defaultProps.onError).toHaveBeenCalledWith(error);
    });
  });

  // ========================================
  // CLEANUP TESTS
  // ========================================

  describe('Cleanup', () => {
    it('cleans up subscriptions on unmount', () => {
      const unsubscribeMock = jest.fn();
      mockCC.on = jest.fn().mockReturnValue({ unsubscribe: unsubscribeMock });
      
      const { unmount } = renderHook(() => use{WidgetName}(defaultProps));
      
      unmount();
      
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('cancels pending requests on unmount', async () => {
      const abortMock = jest.fn();
      mockCC.someMethod = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      });
      
      const { unmount } = renderHook(() => use{WidgetName}(defaultProps));
      
      unmount();
      
      // Verify no state updates after unmount
      await waitFor(() => {
        expect(abortMock).toHaveBeenCalled();
      }, { timeout: 100 });
    });
  });

  // ========================================
  // DEPENDENCY TESTS
  // ========================================

  describe('Dependencies', () => {
    it('re-initializes when props change', async () => {
      const { rerender } = renderHook(
        ({ props }) => use{WidgetName}(props),
        { initialProps: { props: defaultProps } }
      );
      
      await waitFor(() => {
        expect(mockCC.someMethod).toHaveBeenCalledTimes(1);
      });
      
      // Change props
      rerender({ props: { ...defaultProps, requiredProp: 'new-value' } });
      
      await waitFor(() => {
        expect(mockCC.someMethod).toHaveBeenCalledTimes(2);
      });
    });
  });
});
```

---

## Step 3: E2E Tests (Optional)

**File:** `playwright/tests/{widget-name}-test.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('{WidgetName} Widget E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sample app
    await page.goto('http://localhost:3000');
    
    // Enable widget
    await page.check('input[type="checkbox"][id="toggle-{widget-name}"]');
    
    // Wait for widget to appear
    await page.waitForSelector('.{widget-name}', { state: 'visible' });
  });

  test('renders widget correctly', async ({ page }) => {
    // Verify widget is visible
    const widget = page.locator('.{widget-name}');
    await expect(widget).toBeVisible();
    
    // Verify expected elements
    await expect(page.getByText('Expected Text')).toBeVisible();
  });

  test('handles user interaction', async ({ page }) => {
    // Click button
    await page.click('button:has-text("Action")');
    
    // Verify result
    await expect(page.getByText('Success')).toBeVisible();
  });

  test('displays error state', async ({ page }) => {
    // Trigger error condition
    await page.click('button:has-text("Trigger Error")');
    
    // Verify error message
    await expect(page.getByText('Error:')).toBeVisible();
  });

  test('handles toggle off', async ({ page }) => {
    // Verify widget is visible
    await expect(page.locator('.{widget-name}')).toBeVisible();
    
    // Toggle off
    await page.uncheck('input[type="checkbox"][id="toggle-{widget-name}"]');
    
    // Verify widget is removed
    await expect(page.locator('.{widget-name}')).not.toBeVisible();
  });
});
```

---

## Test Checklist

Before proceeding, verify:

### Widget Unit Tests
- [ ] Rendering tests (with/without props)
- [ ] Prop tests (required, optional, defaults)
- [ ] Callback tests (all callbacks)
- [ ] State tests (loading, error, data)
- [ ] Interaction tests (clicks, inputs, forms)
- [ ] Store integration tests
- [ ] Edge case tests
- [ ] Snapshot test

### Hook Unit Tests
- [ ] Initialization tests
- [ ] Handler tests (success, error)
- [ ] Cleanup tests
- [ ] Dependency tests

### E2E Tests (Optional)
- [ ] Widget renders in sample app
- [ ] User interactions work
- [ ] Error states handled
- [ ] Toggle on/off works

### Test Quality
- [ ] All tests pass: `yarn test:unit`
- [ ] Coverage > 80%
- [ ] No console errors
- [ ] No flaky tests
- [ ] Clear test descriptions

---

## Run Tests

### Unit Tests

```bash
# From widget directory
cd packages/contact-center/{widget-name}
yarn test:unit
```

### E2E Tests

```bash
# From project root
yarn test:e2e
```

### Coverage Report

```bash
cd packages/contact-center/{widget-name}
yarn test:unit --coverage
```

---

## Next Steps

**After tests complete:**
1. Go to: ../documentation/create-agent-md.md
2. Then: ../documentation/create-architecture-md.md
3. Finally: 06-validation.md

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

