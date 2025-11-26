# Validation Module

## Overview

This module provides comprehensive validation checklists to ensure the widget is production-ready before deployment.

**Purpose:** Quality assurance and completeness verification

**Use:** After all code, tests, and documentation are complete

---

## Validation Categories

1. **Code Quality** - Architecture, patterns, best practices
2. **Testing** - Unit, hook, E2E tests
3. **Documentation** - agent.md, architecture.md completeness
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

## 2. Testing Validation

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

### agent.md Completeness

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
- [ ] Link to architecture.md at END (token optimization)

### architecture.md Completeness

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

- [ ] Follows [TypeScript Patterns](../../../ai-docs/patterns/typescript-patterns.md)
- [ ] Follows [React Patterns](../../../ai-docs/patterns/react-patterns.md)
- [ ] Follows [MobX Patterns](../../../ai-docs/patterns/mobx-patterns.md)
- [ ] Follows [Web Component Patterns](../../../ai-docs/patterns/web-component-patterns.md)
- [ ] Follows [Testing Patterns](../../../ai-docs/patterns/testing-patterns.md)

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

- [ ] agent.md complete
- [ ] architecture.md complete
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

