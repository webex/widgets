# Contact Center Widgets - AI Agent Guide

## Purpose

This is the main orchestrator for AI assistants working on this repository. It routes you to the correct templates and documentation based on the developer's task.

---

## Quick Start

**When developer provides a task, follow this workflow:**

1. **Understand the task** - Identify what type of work is needed
2. **Route to appropriate template** - Use modular templates for guidance
3. **Generate/fix code** - Follow established patterns
4. **Update documentation** - Keep ai-docs in sync with code changes
5. **Ask for review** - Confirm completion with developer

---

## Step 1: Identify Task Type

**Ask developer:** "What do you need help with?"

### Task Types

**A. Create New Widget**
- Developer wants to build a completely new widget from scratch
- **Route to:** [templates/new-widget/00-master.md](./templates/new-widget/00-master.md)
- **Follow:** All 7 modules (pre-questions → validation)

**B. Fix Bug in Existing Widget**
- Developer reports a bug or issue in existing code
- **Route to:** [templates/existing-widget/bug-fix.md](./templates/existing-widget/bug-fix.md)
- **Follow:** Bug fix workflow with root cause analysis

**C. Add Feature to Existing Widget**
- Developer wants to enhance existing widget with new functionality
- **Route to:** [templates/existing-widget/feature-enhancement.md](./templates/existing-widget/feature-enhancement.md)
- **Follow:** Feature addition workflow with backward compatibility

**D. Generate/Update Documentation Only**
- Developer needs documentation for existing code
- **Route to:** [templates/documentation/create-agent-md.md](./templates/documentation/create-agent-md.md) and [templates/documentation/create-architecture-md.md](./templates/documentation/create-architecture-md.md)
- **Follow:** Documentation templates (reusable for all packages)

**E. Understanding Architecture**
- Developer needs to understand how something works
- **Read:** Package's `ai-docs/agent.md` (usage) and `ai-docs/architecture.md` (technical details)
- **Available for:** station-login, user-state, store, cc-components, cc-widgets, ui-logging, test-fixtures

---

## Step 2: Load Context

**Before generating code, load appropriate context:**

### Always Read (Minimal Context)
1. **Pattern documentation** - [patterns/](./patterns/) folder
   - [typescript-patterns.md](./patterns/typescript-patterns.md) - Type safety, naming conventions
   - [react-patterns.md](./patterns/react-patterns.md) - Component patterns, hooks
   - [mobx-patterns.md](./patterns/mobx-patterns.md) - State management with observer HOC
   - [web-component-patterns.md](./patterns/web-component-patterns.md) - r2wc patterns
   - [testing-patterns.md](./patterns/testing-patterns.md) - Jest, RTL, Playwright

2. **Package documentation** - If working on existing widget
   - `packages/contact-center/{widget-name}/ai-docs/agent.md` - Usage and API
   - `packages/contact-center/{widget-name}/ai-docs/architecture.md` - Technical details

### Conditionally Read

**If using SDK APIs:**
- Scan: [contact-centre-sdk-apis/contact-center.json](./contact-centre-sdk-apis/contact-center.json)
- Find available methods, events, types
- Check method signatures before using

**If modifying store:**
- Read: `packages/contact-center/store/ai-docs/agent.md`
- Read: `packages/contact-center/store/ai-docs/architecture.md`

**If creating/using components:**
- Read: `packages/contact-center/cc-components/ai-docs/agent.md`

**If working with metrics/logging:**
- Read: `packages/contact-center/ui-logging/ai-docs/agent.md`

---

## Step 3: SDK API Usage

**When code needs to interact with Contact Center SDK:**

1. **Scan SDK documentation:** [contact-centre-sdk-apis/contact-center.json](./contact-centre-sdk-apis/contact-center.json)
   - Search for relevant API by name or functionality
   - Check method signatures, parameters, return types
   - Review event names for subscriptions

2. **SDK Access Pattern:**
   ```typescript
   // SDK is accessed through store
   import store from '@webex/cc-store';
   
   // Use SDK methods
   const result = await store.cc.someMethod(params);
   
   // Subscribe to SDK events
   const subscription = store.cc.on('eventName', handler);
   ```

3. **Common SDK Operations:**
   - Agent state management
   - Task operations
   - Login/logout operations
   - Event subscriptions

---

## Step 4: Architecture Pattern

**All code must follow this pattern:**

```
Widget (observer HOC)
  ↓
Custom Hook (business logic)
  ↓
Presentational Component (pure UI)
  ↓
Store (MobX singleton)
  ↓
SDK (Contact Center API)
```

**Key Rules:**
- Widget NEVER calls SDK directly (use hook)
- Component NEVER accesses store (receives props)
- Always use `observer` HOC for widgets
- Always use `runInAction` for store mutations
- Always wrap with ErrorBoundary
- Always apply withMetrics HOC for exports

---

## Step 5: Generate/Fix Code

**Follow the template you were routed to in Step 1**

**During code generation:**
1. Follow pattern documentation strictly
2. Reference existing widgets for examples
3. Use proper TypeScript types (no `any`)
4. Include error handling
5. Add loading/error states
6. Write tests alongside code

---

## Step 6: Update Documentation

**CRITICAL: After any code change, check if documentation needs updates**

**Ask developer:** "The code changes are complete. Do I need to update any documentation?"

### Documentation to Consider

**If new widget created:**
- Generated via templates (agent.md + architecture.md)

**If widget modified:**
- Update: `packages/contact-center/{widget-name}/ai-docs/agent.md` (if API changed)
- Update: `packages/contact-center/{widget-name}/ai-docs/architecture.md` (if architecture changed)
- Add: New examples to agent.md (if new use cases)
- Update: Troubleshooting in architecture.md (if new issues discovered)

**If store modified:**
- Update: `packages/contact-center/store/ai-docs/agent.md`
- Update: `packages/contact-center/store/ai-docs/architecture.md`

**If component library modified:**
- Update: `packages/contact-center/cc-components/ai-docs/agent.md`

**If new pattern established:**
- Update: Relevant pattern file in [patterns/](./patterns/)

**If architecture changed:**
- Update: Diagrams in [diagrams/](./diagrams/) if needed

---

## Step 7: Validation & Review

**Before marking task complete:**

1. **Run validation checks**
   - Tests pass: `yarn test:unit`
   - Linting passes: `yarn test:styles`
   - Build succeeds: `yarn build`

2. **Code quality checks**
   - Follows patterns
   - No layer violations
   - Error handling present
   - Types are correct

3. **Documentation checks**
   - agent.md updated if needed
   - architecture.md updated if needed
   - Examples work

4. **Ask developer for review:**
   - "Task complete. Would you like to review the changes?"
   - "Should I make any adjustments?"
   - "Is the documentation clear?"

---

## Repository Structure

```
ccWidgets/
├── packages/contact-center/
│   ├── station-login/          # Widget with ai-docs/
│   ├── user-state/             # Widget with ai-docs/
│   ├── task/                   # Widget package
│   ├── store/                  # MobX store with ai-docs/
│   ├── cc-components/          # React components with ai-docs/
│   ├── cc-widgets/             # Web Component wrappers with ai-docs/
│   ├── ui-logging/             # Metrics utilities with ai-docs/
│   └── test-fixtures/          # Test mocks with ai-docs/
├── widgets-samples/
│   └── cc/
│       ├── samples-cc-react-app/       # React sample
│       └── samples-cc-wc-app/          # Web Component sample
├── playwright/                 # E2E tests
└── ai-docs/
    ├── agent.md               # This file
    ├── patterns/              # Repo-wide patterns
    ├── templates/             # Code generation templates
    ├── diagrams/              # Architecture diagrams
    ├── contact-centre-sdk-apis/  # SDK API reference
    └── ai-driven-development-setup.plan.md  # Implementation plan
```

---

## Common Questions to Ask

**Before starting any work:**
- "What component/widget are you working on?"
- "Is this a new widget, bug fix, or enhancement?"
- "Do you have design specifications (Figma, screenshots)?"

**During code generation:**
- "Should I add/update tests?"
- "Do you want examples in documentation?"
- "Should I update the sample apps?"

**After code generation:**
- "The code is complete. Should I update documentation?"
- "Would you like to review before I mark this complete?"
- "Should I check for any other impacted components?"

---

## SDK Knowledge Base

**Location:** [contact-centre-sdk-apis/contact-center.json](./contact-centre-sdk-apis/contact-center.json)

**Contents:**
- All exposed SDK APIs (methods, events, types)
- Method signatures and parameters
- Event names and data structures
- Links to SDK source code (next branch)

**Usage:**
- Scan JSON when using SDK methods
- Search for API by name or functionality
- Check parameter types and return values
- Verify event names before subscribing

**Note:** This JSON is TypeDoc output from @webex/contact-center SDK

---

## Success Criteria

**Code generation/fix is successful when:**
- ✅ Follows architecture pattern (Widget → Hook → Component → Store → SDK)
- ✅ Uses patterns correctly (TypeScript, React, MobX, WC)
- ✅ Includes proper error handling
- ✅ Has tests with good coverage
- ✅ Documentation is updated (if code changed)
- ✅ Works in both sample apps (React + WC)
- ✅ No console errors or warnings
- ✅ Passes validation checks
- ✅ Developer approves changes

---

## Related Documentation

- **Implementation Plan:** [ai-driven-development-setup.plan.md](./ai-driven-development-setup.plan.md)
- **Repository Rules:** [rules.md](./rules.md)
- **Templates Overview:** [templates/README.md](./templates/README.md)
- **Architecture Diagrams:** [diagrams/](./diagrams/)

---

_Last Updated: 2025-11-26_
