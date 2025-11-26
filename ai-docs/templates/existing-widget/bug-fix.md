# Bug Fix Template

## Overview

This template guides you through fixing bugs in existing widgets following established patterns and ensuring no regressions.

**Purpose:** Systematic approach to bug fixes

**Scope:** Widgets, components, hooks, store integration

---

## When to Use

- Reported bug in existing widget
- UI not rendering correctly
- Callbacks not firing
- Store integration issues
- Performance problems
- Test failures

---

## Pre-Fix Questions

### 1. Bug Information

- **Which widget/component has the bug?** _______________
- **Bug description (one sentence):** _______________
- **Steps to reproduce:**
  1. _______________
  2. _______________
  3. _______________
- **Expected behavior:** _______________
- **Actual behavior:** _______________

### 2. Bug Scope

- **Which layer is affected?**
  - [ ] Widget component
  - [ ] Hook (helper.ts)
  - [ ] Presentational component
  - [ ] Store integration
  - [ ] SDK integration

- **Error messages:**
  - Console errors: _______________
  - Linter errors: _______________
  - Test failures: _______________

### 3. Impact Assessment

- **Severity:** Critical / High / Medium / Low
- **User Impact:** _______________
- **Affects other widgets?** Yes / No
  - If yes, which ones: _______________
- **Is there a workaround?** Yes / No
  - If yes, describe: _______________

### 4. Existing Tests

- **Is there a test for this scenario?** Yes / No
- **Are tests failing?** Yes / No
- **Test file location:** _______________

---

## Step 1: Understand the Bug

### 1.1 Reproduce the Bug

```typescript
// Create minimal reproduction
// 1. Set up component
// 2. Trigger the bug
// 3. Observe the issue
```

**Reproduction confirmed:** Yes / No

### 1.2 Identify the Root Cause

**Read relevant files:**
- Widget component: `src/{widget-name}/index.tsx`
- Hook: `src/helper.ts`
- Presentational component: Check cc-components
- Store: Check store integration
- Types: `src/{widget-name}/{widget-name}.types.ts`

**Check for:**
- [ ] Missing null/undefined checks
- [ ] Incorrect MobX usage (missing observer, runInAction)
- [ ] Wrong prop types
- [ ] Missing error boundaries
- [ ] Race conditions
- [ ] Memory leaks
- [ ] Event listener issues

**Root cause:** _______________

### 1.3 Verify Layer Boundaries

**Architecture check:**
```
✅ Widget → Hook → Component → Store → SDK
❌ Widget → SDK (layer violation)
❌ Component → Store (layer violation)
```

**Is there a layer violation?** Yes / No
- If yes, this is likely the root cause

---

## Step 2: Plan the Fix

### 2.1 Fix Strategy

**Choose approach:**

- [ ] **Defensive Fix:** Add null checks, error handling
- [ ] **Refactor Fix:** Restructure code to prevent issue
- [ ] **Pattern Fix:** Apply correct pattern (MobX, React)
- [ ] **Integration Fix:** Fix store/SDK integration
- [ ] **Type Fix:** Add/fix TypeScript types

**Fix description:** _______________

### 2.2 Files to Modify

List all files that need changes:
- [ ] `src/{widget-name}/index.tsx`
- [ ] `src/helper.ts`
- [ ] `src/{widget-name}/{widget-name}.types.ts`
- [ ] `tests/{widget-name}/index.tsx`
- [ ] `tests/helper.ts`
- [ ] `ai-prompts/architecture.md`
- [ ] Other: _______________

### 2.3 Breaking Changes?

**Will this fix break existing functionality?** Yes / No

If Yes:
- Document breaking change
- Update version (major/minor)
- Update migration guide

---

## Step 3: Implement the Fix

### 3.1 Widget Layer Fix (if needed)

**File:** `src/{widget-name}/index.tsx`

**Common fixes:**

```typescript
// Fix 1: Add null checks
const {WidgetName}Internal: React.FC<Props> = observer((props) => {
  const { data } = useHook(props);
  
  // ✅ Add null check
  if (!data) {
    return <div>Loading...</div>;
  }
  
  return <Component data={data} />;
});
```

```typescript
// Fix 2: Add error boundary
<ErrorBoundary
  fallback={<div>Error occurred</div>}
  onError={(error) => {
    console.error('Widget Error:', error);
    props.onError?.(error); // Notify parent
  }}
>
  <{WidgetName}Internal {...props} />
</ErrorBoundary>
```

```typescript
// Fix 3: Fix observer HOC
// ❌ Wrong
const Widget = (props) => { ... };

// ✅ Correct
const Widget = observer((props) => { ... });
```

### 3.2 Hook Layer Fix (if needed)

**File:** `src/helper.ts`

**Common fixes:**

```typescript
// Fix 1: Add proper cleanup
useEffect(() => {
  const subscription = store.cc.on('event', handler);
  
  // ✅ Add cleanup
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

```typescript
// Fix 2: Fix runInAction usage
// ❌ Wrong
const handler = () => {
  store.setSomeValue(newValue); // Direct mutation
};

// ✅ Correct
const handler = () => {
  runInAction(() => {
    store.setSomeValue(newValue);
  });
};
```

```typescript
// Fix 3: Fix dependency array
// ❌ Wrong - missing dependency
useCallback(() => {
  doSomething(props.value);
}, []); // Missing props.value

// ✅ Correct
useCallback(() => {
  doSomething(props.value);
}, [props.value]);
```

```typescript
// Fix 4: Add error handling
const fetchData = useCallback(async () => {
  try {
    const result = await store.cc.someMethod();
    setData(result);
  } catch (error) {
    setError(error as Error);
    props.onError?.(error as Error); // Notify parent
  }
}, [props]);
```

### 3.3 Component Layer Fix (if needed)

**File:** cc-components component

**Common fixes:**

```typescript
// Fix 1: Fix prop destructuring
// ❌ Wrong - missing default
const Component: React.FC<Props> = ({ items }) => {
  return items.map(...); // Crashes if undefined
};

// ✅ Correct
const Component: React.FC<Props> = ({ items = [] }) => {
  return items.map(...);
};
```

```typescript
// Fix 2: Fix event handler
// ❌ Wrong - inline function creates new reference
<Button onClick={() => props.onAction(data)}>

// ✅ Correct - use useCallback
const handleClick = useCallback(() => {
  props.onAction(data);
}, [props.onAction, data]);

<Button onClick={handleClick}>
```

### 3.4 Type Fix (if needed)

**File:** `src/{widget-name}/{widget-name}.types.ts`

```typescript
// Fix 1: Make prop optional if it can be undefined
export interface WidgetProps {
  // ❌ Wrong - marked required but can be undefined
  data: SomeType;
  
  // ✅ Correct
  data?: SomeType;
}
```

```typescript
// Fix 2: Add missing types
export interface WidgetProps {
  onEvent: (data: any) => void; // ❌ any is too loose
  
  onEvent: (data: EventData) => void; // ✅ Proper type
}
```

---

## Step 4: Add/Update Tests

### 4.1 Add Regression Test

**File:** `tests/{widget-name}/index.tsx`

```typescript
// Add test that reproduces the bug
describe('{WidgetName} - Bug Fix', () => {
  it('should handle {bug scenario}', async () => {
    // Setup: Create conditions that trigger bug
    const props = {
      // Props that trigger bug
    };
    
    render(<{WidgetName} {...props} />);
    
    // Action: Trigger the bug
    fireEvent.click(screen.getByRole('button'));
    
    // Assert: Bug is fixed
    await waitFor(() => {
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
      expect(screen.getByText('Expected')).toBeInTheDocument();
    });
  });
});
```

### 4.2 Update Existing Tests (if needed)

```typescript
// If fix changes behavior, update tests
it('existing test that needs update', () => {
  // Update assertions to match new behavior
});
```

### 4.3 Run Tests

```bash
# Run unit tests
cd packages/contact-center/{widget-name}
yarn test:unit

# Run linting
yarn test:styles

# Run E2E tests (if applicable)
cd ../../../
yarn test:e2e
```

**All tests pass:** Yes / No
- If no, fix failing tests or code

---

## Step 5: Update Documentation

### 5.1 Update architecture.md (if needed)

**File:** `ai-prompts/architecture.md`

**Update if:**
- Data flow changed
- New error handling added
- Sequence diagram affected

**Add to troubleshooting:**
```markdown
#### {Issue Number}. {Bug Title}

**Symptoms:**
- {What users saw}

**Possible Causes:**
- {Root cause}

**Solutions:**

```typescript
// Fixed code example
```

**Prevention:**
- {How to avoid}
```

### 5.2 Update agent.md (if needed)

**File:** `ai-prompts/agent.md`

**Update if:**
- API changed
- New examples needed
- Usage pattern changed

---

## Step 6: Validation

### 6.1 Code Quality Checks

- [ ] Follows [TypeScript Patterns](../../ai-docs/patterns/typescript-patterns.md)
- [ ] Follows [React Patterns](../../ai-docs/patterns/react-patterns.md)
- [ ] Follows [MobX Patterns](../../ai-docs/patterns/mobx-patterns.md)
- [ ] No layer violations
- [ ] Error handling in place
- [ ] Proper cleanup (useEffect)

### 6.2 Testing Checks

- [ ] Bug reproduced before fix
- [ ] Fix resolves the bug
- [ ] Regression test added
- [ ] All tests pass
- [ ] No new test failures
- [ ] Linting passes
- [ ] Build succeeds

### 6.3 Integration Checks

- [ ] Widget works in React sample
- [ ] Widget works in WC sample
- [ ] No console errors
- [ ] No console warnings
- [ ] Callbacks fire correctly
- [ ] Store integration works

### 6.4 Documentation Checks

- [ ] architecture.md updated (if needed)
- [ ] agent.md updated (if needed)
- [ ] Troubleshooting guide updated
- [ ] CHANGELOG updated

### 6.5 Manual Testing

- [ ] Bug is fixed
- [ ] No regression in other features
- [ ] Edge cases handled
- [ ] Error states work
- [ ] Performance not degraded

---

## Common Bug Patterns & Fixes

### Pattern 1: Missing Null Checks

**Bug:**
```typescript
const Component = ({ data }) => {
  return <div>{data.name}</div>; // Crashes if data is null
};
```

**Fix:**
```typescript
const Component = ({ data }) => {
  if (!data) return <div>No data</div>;
  return <div>{data.name}</div>;
};
```

---

### Pattern 2: Missing Observer HOC

**Bug:**
```typescript
const Widget = (props) => {
  const storeValue = store.observable; // Doesn't react to changes
  return <div>{storeValue}</div>;
};
```

**Fix:**
```typescript
const Widget = observer((props) => {
  const storeValue = store.observable; // Now reacts to changes
  return <div>{storeValue}</div>;
});
```

---

### Pattern 3: Missing runInAction

**Bug:**
```typescript
const handler = () => {
  store.setValue(newValue); // MobX warning
};
```

**Fix:**
```typescript
const handler = () => {
  runInAction(() => {
    store.setValue(newValue);
  });
};
```

---

### Pattern 4: Missing Cleanup

**Bug:**
```typescript
useEffect(() => {
  const subscription = store.cc.on('event', handler);
  // No cleanup - memory leak
}, []);
```

**Fix:**
```typescript
useEffect(() => {
  const subscription = store.cc.on('event', handler);
  return () => subscription.unsubscribe(); // Cleanup
}, []);
```

---

### Pattern 5: Wrong Dependency Array

**Bug:**
```typescript
useCallback(() => {
  doSomething(props.value);
}, []); // Missing dependency
```

**Fix:**
```typescript
useCallback(() => {
  doSomething(props.value);
}, [props.value]); // Correct dependencies
```

---

### Pattern 6: Layer Violation

**Bug:**
```typescript
// Widget directly calls SDK
const Widget = () => {
  const handleClick = () => {
    store.cc.someMethod(); // Layer violation
  };
  // ...
};
```

**Fix:**
```typescript
// Widget → Hook → SDK
const Widget = () => {
  const { handleClick } = useWidget(); // Hook handles SDK
  // ...
};

// In helper.ts
const handleClick = useCallback(() => {
  store.cc.someMethod(); // Correct layer
}, []);
```

---

## Related Templates

- **[feature-enhancement.md](./feature-enhancement.md)** - Add features to existing widgets
- **[refactoring.md](./refactoring.md)** - Refactor existing code
- **[../testing/fix-failing-tests.md](../testing/fix-failing-tests.md)** - Debug test failures
- **[../documentation/update-documentation.md](../documentation/update-documentation.md)** - Update docs

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

