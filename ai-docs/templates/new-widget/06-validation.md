# Validation Module

## Overview

This module provides comprehensive validation checklists to ensure the widget is production-ready before deployment.

**Purpose:** Quality assurance and completeness verification

**Use:** After all code, tests, and documentation are complete

---

## Validation Categories

1. **Code Quality** - Architecture, patterns, best practices
2. **Testing** - Unit, hook, E2E tests
3. **Documentation** - AGENTS.md, ARCHITECTURE.md completeness
4. **Integration** - cc-widgets, sample apps
5. **Manual Testing** - Real-world usage verification

---

## 1. Code Quality Validation

### Architecture & Layer Separation

- [ ] **Widget → Hook → Component → Store → SDK** pattern followed
- [ ] Widget component wrapped with `observer` HOC
- [ ] Widget wrapped with `ErrorBoundary`
- [ ] Hook contains all business logic
- [ ] Component is pure presentational (if separate component)
- [ ] No layer violations (Widget doesn't call SDK directly)
- [ ] No component accessing store directly

### MobX Integration

- [ ] Widget uses `observer` HOC from mobx-react-lite
- [ ] Store observables accessed correctly
- [ ] Store mutations wrapped in `runInAction`
- [ ] No direct store mutations outside runInAction
- [ ] No reactions created in render

### TypeScript

- [ ] All types exported from types file
- [ ] Props interface fully documented with JSDoc
- [ ] No `any` types used (proper types everywhere)
- [ ] Optional props marked with `?`
- [ ] Default values documented
- [ ] Return types specified on functions
- [ ] Complex types have interfaces/types
- [ ] Exported types available to consumers

### React Best Practices

- [ ] Functional components used (not class components)
- [ ] Hooks used correctly (rules of hooks)
- [ ] `useCallback` for event handlers
- [ ] `useMemo` for expensive computations
- [ ] `useEffect` dependencies correct
- [ ] `useEffect` cleanup functions present
- [ ] Display names set for debugging
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled

### Error Handling

- [ ] ErrorBoundary wraps widget
- [ ] Try-catch in all async operations
- [ ] Errors logged to console
- [ ] `onError` callback called on errors
- [ ] User-friendly error messages displayed
- [ ] Error recovery possible
- [ ] No unhandled promise rejections

### Code Style

- [ ] Linting passes: `yarn test:styles`
- [ ] No console.log statements (use proper logging)
- [ ] Comments explain "why", not "what"
- [ ] Complex logic documented
- [ ] TODO comments removed
- [ ] Dead code removed
- [ ] Consistent naming conventions

### Metrics & Logging

- [ ] Widget wrapped with `withMetrics` HOC in index.ts
- [ ] NOT wrapped with `withMetrics` in wc.ts
- [ ] WIDGET_MOUNTED logged automatically
- [ ] WIDGET_UNMOUNTED logged automatically
- [ ] Custom metrics logged where appropriate

---

## 2. Functional Validation (NEW - CRITICAL)

### Purpose

Verify that the widget actually WORKS as intended, not just that it compiles. Test the complete data flow from user action to UI update.

### Sequence Diagram Validation

**FIRST STEP: Load approved sequence diagrams from 01-pre-questions.md**

Before running any tests, verify implementation matches approved diagrams:

- [ ] Load all sequence diagrams from pre-questions
- [ ] Load SDK API documentation from pre-questions
- [ ] Load data transformation mappings from pre-questions

### SDK Integration Test

**Compare implemented code against approved sequence diagrams:**

**For each SDK method in sequence diagrams:**

- [ ] Method exists in `@webex/contact-center` types (`node_modules/@webex/contact-center/dist/types/index.d.ts`)
- [ ] **Exact path matches sequence diagram** (e.g., `store.cc.someService.someMethod`)
- [ ] **Parameters match diagram specification** (type, order, values)
- [ ] **Return type matches SDK documentation AND diagram**
- [ ] Accessed via `store.cc.methodName()` (not direct import)
- [ ] Error handling present (try/catch) as per error flow diagram
- [ ] Success callbacks fire on success (verify timing per diagram)
- [ ] Error callbacks fire on error (verify error path per diagram)
- [ ] Response structure matches documented structure

**Example Verification:**

```typescript
// From sequence diagram: store.cc.someService.someMethod(param1, param2)
// ✓ Exists in SDK JSON at exact path
// ✓ Parameters: (param1: value1, param2: value2) - matches diagram
// ✓ Return type: Promise<{statusCode: number, data: {...}}>
// ✓ Error handling: try/catch present with setError() call
// ✓ Callback: props.onSuccess?.(data) called on success
// ✓ Error callback: props.onError?.(error) called on failure
// ✓ Response accessed: response.data.items (matches diagram)
```

**If method not found in SDK or signature mismatch → RETURN to sequence diagrams and fix**

**Data Transformation Validation:**

- [ ] **Every transformation matches diagram mapping**
- [ ] Source fields extracted correctly (e.g., `session.other.name`)
- [ ] Fallback values match diagram (e.g., `|| 'Unknown'`)
- [ ] Type conversions correct (e.g., ISO string → timestamp)
- [ ] Optional field handling matches diagram (`?? operator`)

**Example:**
```typescript
// Diagram says: contactName = session.other.name || session.other.primaryDisplayString || 'Unknown'
// Code implements:
contactName: session.other?.name || session.other?.primaryDisplayString || 'Unknown'
// ✓ Matches diagram
```

### Event Flow Test

**Validate implementation against sequence diagrams:**

**For EACH sequence diagram, manually test the flow:**

#### Testing Procedure

1. **Load sequence diagram** from pre-questions for scenario
2. **Perform user action** shown in diagram
3. **Verify EACH step** in diagram occurs in correct order
4. **Check state updates** match diagram timing
5. **Confirm UI updates** match diagram end state

#### Example: Button Click Flow (from sequence diagram)

Per diagram sequence:
1. User clicks button → Event handler called? ✓
2. Handler sets `isLoading=true` → State updated? ✓
3. Handler sets `error=null` → State cleared? ✓
4. Handler calls SDK method → Method invoked with correct params? ✓
5. SDK returns response → Response structure matches diagram? ✓
6. Handler transforms data → Transformation per diagram mappings? ✓
7. Handler sets `data=records` → State updated with transformed data? ✓
8. Handler sets `isLoading=false` → Loading state cleared? ✓
9. Component re-renders → UI shows new data? ✓

**If ANY step fails or order wrong → Debug against sequence diagram**

**For YOUR widget, test ALL diagram scenarios:**

**Scenario 1:** (from sequence diagram: _______________)
```
Diagram step → Implemented code → Verified?
───────────────────────────────────────────
User action: _______________     →  _______________  →  [ ]
Handler called: _______________  →  _______________  →  [ ]
State update 1: _______________  →  _______________  →  [ ]
State update 2: _______________  →  _______________  →  [ ]
SDK call: _______________        →  _______________  →  [ ]
SDK response: _______________    →  _______________  →  [ ]
Data transform: _______________  →  _______________  →  [ ]
Final state: _______________     →  _______________  →  [ ]
UI renders: _______________      →  _______________  →  [ ]

Overall Status: [ ] VERIFIED [ ] FAILED
```

**Scenario 2:** (from sequence diagram: _______________)
```
Diagram step → Implemented code → Verified?
───────────────────────────────────────────
User action: _______________     →  _______________  →  [ ]
Handler called: _______________  →  _______________  →  [ ]
State update 1: _______________  →  _______________  →  [ ]
State update 2: _______________  →  _______________  →  [ ]
SDK call: _______________        →  _______________  →  [ ]
SDK response: _______________    →  _______________  →  [ ]
Data transform: _______________  →  _______________  →  [ ]
Final state: _______________     →  _______________  →  [ ]
UI renders: _______________      →  _______________  →  [ ]

Overall Status: [ ] VERIFIED [ ] FAILED
```

**Scenario 3:** (from sequence diagram: _______________)
```
Diagram step → Implemented code → Verified?
───────────────────────────────────────────
User action: _______________     →  _______________  →  [ ]
Handler called: _______________  →  _______________  →  [ ]
State update 1: _______________  →  _______________  →  [ ]
State update 2: _______________  →  _______________  →  [ ]
SDK call: _______________        →  _______________  →  [ ]
SDK response: _______________    →  _______________  →  [ ]
Data transform: _______________  →  _______________  →  [ ]
Final state: _______________     →  _______________  →  [ ]
UI renders: _______________      →  _______________  →  [ ]

Overall Status: [ ] VERIFIED [ ] FAILED
```

### Data Flow Test

**Trace data through ALL layers:**

```
User Action (UI)
  ↓
Widget Handler (index.tsx)
  ↓
Hook Method (helper.ts)
  ↓
Store/SDK Call
  ↓
Response/Observable Update
  ↓
Hook State Update
  ↓
Component Props
  ↓
UI Render
```

**Verification:**

- [ ] User action triggers widget handler
- [ ] Widget handler calls hook method correctly
- [ ] Hook method accesses store/SDK correctly
- [ ] Response updates hook state
- [ ] Hook state passes to component props
- [ ] Component renders with updated props
- [ ] UI reflects the change

**If any transition fails → Debug and fix**

### Import Validation Test

**Check for circular dependencies:**

```bash
# In widget code, search for cc-widgets import:
grep -r "from '@webex/cc-widgets'" packages/contact-center/{widget-name}/src/
# Expected: NO MATCHES

# In cc-components, search for widget imports:
grep -r "from '@webex/cc-.*-widget'" packages/contact-center/cc-components/src/
# Expected: NO MATCHES
```

**Validation:**

- [ ] No matches for `@webex/cc-widgets` in widget code
- [ ] No matches for widget packages in cc-components
- [ ] All imports follow one-directional flow
- [ ] No circular dependencies detected

**If any matches found → Refactor imports**

### UI Visual Test

**Compare with design input (Figma/screenshot/spec):**

- [ ] Colors match design (or use Momentum tokens)
- [ ] Spacing matches (8px/0.5rem grid adhered)
- [ ] Layout matches (flex/grid structure correct)
- [ ] Components match design (correct Momentum components used)
- [ ] Typography matches (sizes, weights correct)
- [ ] Interactions work (hover, active, focus states)
- [ ] Theme switching works (light/dark modes)

**Visual differences found:**

| Element | Design | Generated | Status | Notes |
|---------|--------|-----------|--------|-------|
| _____ | _____ | _____ | [ ] Fixed | _____ |
| _____ | _____ | _____ | [ ] Fixed | _____ |
| _____ | _____ | _____ | [ ] Fixed | _____ |

**If visual mismatch → Update styling**

### Compiler Test

```bash
# Build the widget
yarn build

# Expected: NO ERRORS
```

**Common compiler errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| Type error | Missing/incorrect types | Add proper type definitions |
| Import error | Wrong path or missing export | Check paths and exports |
| Circular dependency | Improper imports | Refactor to follow dependency flow |
| Syntax error | Code syntax issue | Fix syntax |

**Validation:**

- [ ] `yarn build` completes without errors
- [ ] No TypeScript errors
- [ ] No import errors
- [ ] No syntax errors
- [ ] Bundle size reasonable

**Fix ALL compiler errors before completing**

### Runtime Test (Manual)

**Run sample app and test widget:**

```bash
# Start React sample app
yarn samples:serve-react
```

**Test checklist:**

- [ ] Widget renders without errors
- [ ] All buttons work
- [ ] All inputs work
- [ ] All dropdowns/selects work
- [ ] Callbacks fire correctly
- [ ] State updates reflect in UI immediately
- [ ] Error scenarios handled gracefully
- [ ] No console errors or warnings

**Test scenarios:**

1. **Happy Path:**
   - [ ] Primary user flow works end-to-end
   - [ ] UI updates correctly
   - [ ] Callbacks fire with correct data

2. **Error Scenarios:**
   - [ ] Invalid input shows error message
   - [ ] API errors handled gracefully
   - [ ] Error callbacks fire
   - [ ] User can recover from errors

3. **Edge Cases:**
   - [ ] Empty state handled
   - [ ] Loading state shown
   - [ ] No data scenario handled
   - [ ] Rapid clicks handled

**If runtime errors → Debug and fix**

---

## 3. Testing Validation

### Unit Tests - Widget

- [ ] Widget renders without crashing
- [ ] Renders with required props only
- [ ] Renders with all props
- [ ] All required props tested
- [ ] All optional props tested
- [ ] Default values tested
- [ ] Custom className applied
- [ ] Custom styles applied
- [ ] All callbacks tested (called correctly)
- [ ] Callbacks work when undefined
- [ ] Loading state tested
- [ ] Error state tested
- [ ] Empty/no-data state tested
- [ ] User interactions tested (clicks, inputs, etc.)
- [ ] Store integration tested
- [ ] SDK calls tested
- [ ] Edge cases tested
- [ ] Snapshot test included

### Unit Tests - Hook

- [ ] Hook initializes correctly
- [ ] Initial data fetch tested
- [ ] Initialization errors handled
- [ ] All handlers tested (success cases)
- [ ] All handlers tested (error cases)
- [ ] Callbacks called correctly
- [ ] Cleanup functions tested
- [ ] Subscriptions unsubscribed
- [ ] Dependency changes tested
- [ ] Re-initialization tested

### Test Quality

- [ ] All tests pass: `yarn test:unit`
- [ ] Test coverage > 80%
- [ ] No skipped tests (.skip removed)
- [ ] No focused tests (.only removed)
- [ ] Tests are deterministic (not flaky)
- [ ] Tests are independent (can run in any order)
- [ ] Mock setup/teardown correct
- [ ] No console warnings during tests
- [ ] No console errors during tests

### E2E Tests (Optional)

- [ ] Widget renders in sample app
- [ ] User interactions work end-to-end
- [ ] Error scenarios tested
- [ ] Toggle on/off works
- [ ] Multi-widget scenarios tested

---

## 3. Documentation Validation

### AGENTS.md Completeness

- [ ] Overview section complete
- [ ] Package name stated
- [ ] Version references package.json
- [ ] Purpose clearly explained
- [ ] 3-5 key capabilities listed
- [ ] 4-6 usage examples provided
- [ ] Basic usage example (React)
- [ ] Web Component usage example
- [ ] Common use case examples
- [ ] Error handling example
- [ ] Dependencies documented
- [ ] Dependencies reference package.json (no hardcoded versions)
- [ ] Props API table complete
- [ ] All props documented
- [ ] Required/optional marked
- [ ] Default values shown
- [ ] Installation instructions included
- [ ] Link to ARCHITECTURE.md at END (token optimization)

### ARCHITECTURE.md Completeness

- [ ] Component overview complete
- [ ] Component table has all components
- [ ] File structure documented
- [ ] Layer communication diagram (Mermaid)
- [ ] 3-5 sequence diagrams (Mermaid)
- [ ] All diagrams use Mermaid (not PlantUML)
- [ ] Diagrams render correctly
- [ ] Hook/business logic explained
- [ ] Store integration explained
- [ ] SDK integration explained
- [ ] 5-8 troubleshooting issues documented
- [ ] Each issue has symptoms, causes, solutions
- [ ] Code examples in troubleshooting
- [ ] Related documentation linked

### Documentation Quality

- [ ] Markdown renders correctly
- [ ] Code blocks have language tags
- [ ] Tables format properly
- [ ] No broken links
- [ ] Consistent heading levels
- [ ] No typos
- [ ] Examples are realistic
- [ ] Examples work (tested)

---

## 4. Integration Validation

### cc-widgets Package

- [ ] Widget imported in `cc-widgets/src/index.ts`
- [ ] Widget exported in `cc-widgets/src/index.ts`
- [ ] Widget imported in `cc-widgets/src/wc.ts` (from dist/wc)
- [ ] r2wc wrapper created
- [ ] All props mapped correctly in r2wc
- [ ] String props use 'string'
- [ ] Number props use 'number'
- [ ] Boolean props use 'boolean'
- [ ] Object/Array props use 'json'
- [ ] Function props use 'function'
- [ ] Custom element registered
- [ ] Element name: `widget-cc-{widget-name}`
- [ ] cc-widgets builds successfully: `yarn build`

### React Sample App

- [ ] Widget imported from @webex/cc-widgets
- [ ] Widget toggle state added
- [ ] Checkbox added to widget selector
- [ ] Callback handlers defined
- [ ] Widget rendering section added
- [ ] All required props passed
- [ ] Callbacks wired correctly
- [ ] Sample app runs: `yarn start`
- [ ] Widget appears when toggled on
- [ ] Widget disappears when toggled off
- [ ] Widget functions correctly

### Web Component Sample App

- [ ] Widget reference variable created
- [ ] Checkbox added to HTML
- [ ] Create widget function implemented
- [ ] Remove widget function implemented
- [ ] Toggle event listener attached
- [ ] Properties set correctly
- [ ] Event listeners attached correctly
- [ ] Widget appended to DOM correctly
- [ ] Sample app loads in browser
- [ ] Widget appears when toggled on
- [ ] Widget disappears when toggled off
- [ ] Widget functions correctly
- [ ] Events fire correctly (check console)

---

## 5. Manual Testing Validation

### Functional Testing

- [ ] Widget renders without errors
- [ ] All features work as expected
- [ ] Props passed correctly
- [ ] Callbacks fire correctly
- [ ] User interactions work
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Data updates in real-time (if applicable)
- [ ] Store integration works
- [ ] SDK calls work

### Visual Testing

- [ ] Widget looks correct (matches design)
- [ ] Layout is correct
- [ ] Colors are correct
- [ ] Typography is correct
- [ ] Icons display correctly
- [ ] Spacing is correct
- [ ] Responsive (if applicable)
- [ ] Works in light theme
- [ ] Works in dark theme

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Focus visible
- [ ] Screen reader friendly
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] No keyboard traps

### Performance Testing

- [ ] Widget renders quickly (< 1s)
- [ ] No memory leaks
- [ ] No excessive re-renders
- [ ] No console warnings
- [ ] No console errors

### Error Scenarios

- [ ] Invalid props handled gracefully
- [ ] Missing props handled gracefully
- [ ] SDK errors handled gracefully
- [ ] Network errors handled gracefully
- [ ] Empty data handled gracefully
- [ ] User shown appropriate error message
- [ ] Error logged to console
- [ ] `onError` callback called

---

## 6. Build & Deploy Validation

### Build Process

- [ ] Widget builds successfully
  ```bash
  cd packages/contact-center/{widget-name}
  yarn build
  ```
- [ ] No build errors
- [ ] No build warnings
- [ ] dist/ folder created
- [ ] Types generated (dist/types/)
- [ ] Source maps generated

### Package Configuration

- [ ] package.json name correct: `@webex/cc-{widget-name}`
- [ ] package.json description correct
- [ ] package.json version correct
- [ ] package.json main points to dist/index.js
- [ ] package.json types points to dist/types/index.d.ts
- [ ] Dependencies correct
- [ ] DevDependencies correct
- [ ] PeerDependencies correct

### File Structure

- [ ] All required files present
- [ ] No unnecessary files in dist/
- [ ] README or link to docs present
- [ ] License file present

---

## 7. Pattern Compliance

### Check Against Pattern Docs

- [ ] Follows [TypeScript Patterns](../../patterns/typescript-patterns.md)
- [ ] Follows [React Patterns](../../patterns/react-patterns.md)
- [ ] Follows [MobX Patterns](../../patterns/mobx-patterns.md)
- [ ] Follows [Web Component Patterns](../../patterns/web-component-patterns.md)
- [ ] Follows [Testing Patterns](../../patterns/testing-patterns.md)

### Naming Conventions

- [ ] Widget name is kebab-case: `agent-directory`
- [ ] Component name is PascalCase: `AgentDirectory`
- [ ] File names match conventions
- [ ] Function names are camelCase
- [ ] Constants are UPPER_SNAKE_CASE
- [ ] Types/Interfaces are PascalCase

---

## 8. Final Checklist

### Code Complete

- [ ] All modules from 01-06 completed
- [ ] Widget code generated
- [ ] Hook code generated
- [ ] Types defined
- [ ] Component created (if needed)
- [ ] Tests written
- [ ] Documentation written

### Quality Gates Passed

- [ ] Linting passes
- [ ] Tests pass (100%)
- [ ] Build succeeds
- [ ] No console errors
- [ ] No console warnings

### Integration Complete

- [ ] cc-widgets updated
- [ ] React sample updated
- [ ] Web Component sample updated
- [ ] Both samples tested

### Documentation Complete

- [ ] AGENTS.md complete
- [ ] ARCHITECTURE.md complete
- [ ] All examples tested
- [ ] All diagrams render

### Ready for Review

- [ ] All checklists completed
- [ ] No known issues
- [ ] Ready for peer review
- [ ] Ready for QA
- [ ] Ready for production

---

## Issue Tracking

If any checklist items fail, document here:

### Issues Found

| Issue | Severity | Description | Solution | Status |
|-------|----------|-------------|----------|--------|
| 1. | High/Med/Low | Description | Solution | Open/Fixed |
| 2. | High/Med/Low | Description | Solution | Open/Fixed |
| 3. | High/Med/Low | Description | Solution | Open/Fixed |

### Notes

(Add any notes about the validation process, workarounds, or decisions made)

---

## Sign-Off

**Validation completed by:** _______________

**Date:** _______________

**Widget name:** _______________

**Version:** _______________

**Status:** ✅ READY FOR PRODUCTION / ⚠️ NEEDS WORK

**Notes:**
```
(Any final notes or observations)
```

---

## Next Steps After Validation

**If all checks pass:**
1. Commit changes to version control
2. Create pull request
3. Request peer review
4. Update CHANGELOG
5. Prepare for release

**If checks fail:**
1. Document issues in tracking table
2. Fix issues
3. Re-run validation
4. Repeat until all checks pass

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

