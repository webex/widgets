# Contact Center Widgets - AI Agent Guide

## Purpose

This is the main orchestrator for AI assistants working on this repository. It routes you to the correct templates and documentation based on the developer's task.

**For every developer request:** (1) Identify task type (A–E below). (2) If the work is in an existing package or widget, load that scope's ai-docs (see [Package and widget ai-docs reference](#package-and-widget-ai-docs-reference)) and follow its AGENTS.md. (3) Open the template for that type and complete its mandatory pre-steps (see [Mandatory pre-steps by task type](#mandatory-pre-steps-by-task-type)). (4) Then follow the rest of this guide and the template.

---

## Quick Start

**When developer provides a task, follow this workflow:**

1. **Understand the task** - Identify what type of work is needed
2. **Break down large or multi-part tasks** - If the prompt mixes multiple tasks (for example, "create new widget" **and** "fix a bug" or "add a feature"), or the task is very large, split it into smaller, clearly scoped subtasks and handle them one by one
3. **Route to appropriate template** - Use modular templates for guidance
4. **Load package/widget ai-docs when working in that scope** - If fixing, generating, or enhancing code in an existing package or widget, read that scope's [ai-docs/AGENTS.md and ARCHITECTURE.md](#package-and-widget-ai-docs-reference) and follow them (see CRITICAL RULES rule 3).
5. **Complete that template's mandatory pre-step section** - See [Mandatory pre-steps by task type](#mandatory-pre-steps-by-task-type) in CRITICAL RULES. Do not generate code until pre-steps are done or the developer explicitly waives them.
6. **Generate/fix code** - Follow established patterns
7. **Update documentation** - Keep ai-docs in sync with code changes
8. **Ask for review** - Confirm completion with developer

---

## Step 1: Identify Task Type

**Ask developer:** "What do you need help with?"

If the developer's message contains multiple distinct task types (for example, "create new widget", "fix a bug", and "add a feature" in one prompt), treat each as a separate internal task. Clarify priorities or ordering with the developer when needed, and then execute the subtasks sequentially rather than trying to complete everything at once.

### Task Types

**A. Create New Widget**

- Developer wants to build a completely new widget from scratch
- **Route to:** [templates/new-widget/00-master.md](./ai-docs/templates/new-widget/00-master.md)
- **Follow:** All 7 modules (pre-questions → validation)
- **⚠️ MANDATORY FIRST STEP:** Collect design input (see below)

**B. Fix Bug in Existing Widget**

- Developer reports a bug or issue in existing code
- **Route to:** [templates/existing-widget/bug-fix.md](./ai-docs/templates/existing-widget/bug-fix.md)
- **Follow:** Bug fix workflow with root cause analysis

**C. Add Feature to Existing Widget**

- Developer wants to enhance existing widget with new functionality
- **Route to:** [templates/existing-widget/feature-enhancement.md](./ai-docs/templates/existing-widget/feature-enhancement.md)
- **Follow:** Feature addition workflow with backward compatibility

**D. Generate/Update Documentation Only**

- Developer needs documentation for existing code
- **Route to:** [templates/documentation/create-agent-md.md](./ai-docs/templates/documentation/create-agent-md.md) and [templates/documentation/create-architecture-md.md](./ai-docs/templates/documentation/create-architecture-md.md)
- **Follow:** Documentation templates (reusable for all packages)

**E. Understanding Architecture**

- Developer needs to understand how something works
- **Read:** That scope's `ai-docs/AGENTS.md` (usage) and `ai-docs/ARCHITECTURE.md` (technical details); use [Package and widget ai-docs reference](#package-and-widget-ai-docs-reference) to find the path.
- **Available for:** station-login, user-state, store, cc-components, cc-widgets, ui-logging, test-fixtures; for task package use per-widget ai-docs (CallControl, IncomingTask, OutdialCall, TaskList).

---

## ⚠️ CRITICAL RULES - Always Follow

### 1. Circular Dependency Prevention

**NEVER create these imports:**

```typescript
// ❌ WRONG - Circular dependencies
import {Widget} from '@webex/cc-widgets'; // In widget package code
import {Widget} from '@webex/cc-widget-name'; // In cc-components code
```

**ALWAYS use this pattern:**

```typescript
// ✅ CORRECT - Proper dependency flow
// In widget code:
import {Component} from '@webex/cc-components';
import store from '@webex/cc-store';
import {withMetrics} from '@webex/cc-ui-logging';

// In cc-widgets aggregator (ONLY):
import {Widget} from '@webex/cc-widget-name';
```

**Dependency Flow (One Direction Only):**

```
cc-widgets → widget packages → cc-components → store → SDK
```

**Validation Before Code Generation:**

- [ ] Widget does NOT import from `@webex/cc-widgets`
- [ ] cc-components does NOT import from any widget packages
- [ ] All imports follow one-directional flow
- [ ] No circular references between packages

**If circular dependency is detected → STOP and refactor imports immediately.**

### 2. Mandatory Design Input (For New Widgets)

**STOP! Before generating ANY new widget code, collect design input.**

#### Required Input (ONE of these):

1. **Figma Link/File**

   - Share Figma link or file
   - LLM will extract design tokens, components, interactions

2. **Screenshot/Mockup**

   - Upload image of desired widget UI
   - LLM will analyze colors, layout, components, spacing

3. **Design Specification**
   - Provide detailed specs:
     - Colors (hex/RGB or Momentum tokens)
     - Layout structure (flex/grid)
     - Components needed (Button, Icon, Avatar, etc.)
     - Typography (sizes, weights)
     - Interactions (hover, click states)

#### If Design Input Provided:

**Analyze and document:**

- **Colors:** Extract hex/RGB values or Momentum tokens
- **Components:** Identify Momentum UI components to use
- **Layout:** Grid, flex, spacing patterns (8px/0.5rem grid)
- **Typography:** Sizes, weights (Momentum typography scale)
- **Interactions:** Buttons, hover states, transitions

#### If NO Design Input:

**ASK THE USER:**

```
⚠️ Design Input Required

I cannot generate a widget without visual design reference. This ensures:
- UI matches your design system
- Correct Momentum components are used
- Proper styling and theming

Please provide ONE of:
1. Figma link/file
2. Screenshot of desired UI
3. Detailed design specification (colors, layout, components)

Once provided, I'll analyze it and generate the widget accordingly.
```

**DO NOT proceed without design input.**

### 3. Use Package/Widget ai-docs When Working in That Scope

When fixing, generating, or enhancing code in a package or widget, you MUST read and follow that scope's `ai-docs/AGENTS.md` (and `ai-docs/ARCHITECTURE.md` where available). See [Package and widget ai-docs reference](#package-and-widget-ai-docs-reference) in Step 2. The root AGENTS.md is the orchestrator; each package/widget AGENTS.md is the authoritative reference for that scope—use both.

### 4. Complete Template Pre-Steps Before Code

Before generating or changing any code, you MUST complete the **pre-step section** of the template for the task type (see table below). Either fill it from the developer's message and confirm, or ask the developer for missing items. Do not proceed to implementation steps until pre-steps are done or the developer explicitly asks to skip them.

#### Mandatory pre-steps by task type (Rule 4)

| Task type | Template | Mandatory pre-step (complete before code) |
| --------- | -------- | ----------------------------------------- |
| **A. Create New Widget** | [new-widget/00-master.md](./ai-docs/templates/new-widget/00-master.md) | Design input + [01-pre-questions.md](./ai-docs/templates/new-widget/01-pre-questions.md) (widget name, 4 technical inputs) |
| **B. Fix Bug** | [existing-widget/bug-fix.md](./ai-docs/templates/existing-widget/bug-fix.md) | [Pre-Fix Questions](./ai-docs/templates/existing-widget/bug-fix.md) (bug info, scope, impact, existing tests) |
| **C. Add Feature** | [existing-widget/feature-enhancement.md](./ai-docs/templates/existing-widget/feature-enhancement.md) | [Pre-Enhancement Questions](./ai-docs/templates/existing-widget/feature-enhancement.md) (feature info, requirements, compatibility, design input) |
| **D. Documentation only** | documentation templates | Optional: confirm scope with developer (no code change) |
| **E. Understanding** | Package ai-docs | None (read-only) |

---

## Step 2: Load Context

**Before generating code, load appropriate context:**

### Always Read (Minimal Context)

1. **Pattern documentation** - [patterns/](./ai-docs/patterns/) folder

   - [typescript-patterns.md](./ai-docs/patterns/typescript-patterns.md) - Type safety, naming conventions
   - [react-patterns.md](./ai-docs/patterns/react-patterns.md) - Component patterns, hooks
   - [mobx-patterns.md](./ai-docs/patterns/mobx-patterns.md) - State management with observer HOC
   - [web-component-patterns.md](./ai-docs/patterns/web-component-patterns.md) - r2wc patterns
   - [testing-patterns.md](./ai-docs/patterns/testing-patterns.md) - Jest, RTL, Playwright

2. **Package/widget ai-docs (mandatory when working in that scope)**  
   When fixing, generating, or enhancing code in a package or widget, you **MUST** read that scope's `ai-docs/AGENTS.md` (and `ARCHITECTURE.md` where listed) and follow its instructions. The root AGENTS.md orchestrates; package/widget AGENTS.md is the authoritative reference for that scope. Use the table below to find the right path.

#### Package and widget ai-docs reference

| Scope you're working on | AGENTS.md | ARCHITECTURE.md |
| ----------------------- | --------- | --------------- |
| **station-login** | [packages/contact-center/station-login/ai-docs/AGENTS.md](packages/contact-center/station-login/ai-docs/AGENTS.md) | Same folder |
| **user-state** | [packages/contact-center/user-state/ai-docs/AGENTS.md](packages/contact-center/user-state/ai-docs/AGENTS.md) | Same folder |
| **task – CallControl** | [packages/contact-center/task/ai-docs/widgets/CallControl/AGENTS.md](packages/contact-center/task/ai-docs/widgets/CallControl/AGENTS.md) | Same folder |
| **task – IncomingTask** | [packages/contact-center/task/ai-docs/widgets/IncomingTask/AGENTS.md](packages/contact-center/task/ai-docs/widgets/IncomingTask/AGENTS.md) | Same folder |
| **task – OutdialCall** | [packages/contact-center/task/ai-docs/widgets/OutdialCall/AGENTS.md](packages/contact-center/task/ai-docs/widgets/OutdialCall/AGENTS.md) | Same folder |
| **task – TaskList** | [packages/contact-center/task/ai-docs/widgets/TaskList/AGENTS.md](packages/contact-center/task/ai-docs/widgets/TaskList/AGENTS.md) | Same folder |
| **store** | [packages/contact-center/store/ai-docs/AGENTS.md](packages/contact-center/store/ai-docs/AGENTS.md) | Same folder |
| **cc-components** | [packages/contact-center/cc-components/ai-docs/AGENTS.md](packages/contact-center/cc-components/ai-docs/AGENTS.md) | Same folder |
| **cc-widgets** | [packages/contact-center/cc-widgets/ai-docs/AGENTS.md](packages/contact-center/cc-widgets/ai-docs/AGENTS.md) | Same folder |
| **ui-logging** | [packages/contact-center/ui-logging/ai-docs/AGENTS.md](packages/contact-center/ui-logging/ai-docs/AGENTS.md) | Same folder |
| **samples-cc-react-app** | [widgets-samples/cc/samples-cc-react-app/ai-docs/AGENTS.md](widgets-samples/cc/samples-cc-react-app/ai-docs/AGENTS.md) | Same folder if present |

**Task package note:** The task package has multiple widgets (CallControl, IncomingTask, OutdialCall, TaskList). When working on one of them, use that widget's ai-docs path above, not a generic task path.

### Conditionally Read

**If using SDK APIs:**

- Scan: [contact-centre-sdk-apis/contact-center.json](./contact-centre-sdk-apis/contact-center.json)
- Find available methods, events, types
- Check method signatures before using

**If modifying store:**

- Read: `packages/contact-center/store/ai-docs/AGENTS.md`
- Read: `packages/contact-center/store/ai-docs/ARCHITECTURE.md`

**If creating/using components:**

- Read: `packages/contact-center/cc-components/ai-docs/AGENTS.md`

**If working with metrics/logging:**

- Read: `packages/contact-center/ui-logging/ai-docs/AGENTS.md`
---

## Step 3: SDK API Consultation (Before Code Generation)

**Before using ANY SDK method, consult the SDK knowledge base.**

### Process

#### 1. Identify Required SDK Functionality

Based on widget requirements, list needed operations:

- Making calls? → Search: "call", "dial", "telephony", "outdial"
- Fetching agents? → Search: "agent", "buddy", "team"
- Managing tasks? → Search: "task", "interaction", "contact"
- Checking state? → Search: "state", "status", "presence"

#### 2. Search SDK Knowledge Base

**File:** [contact-centre-sdk-apis/contact-center.json](./contact-centre-sdk-apis/contact-center.json)

**Search Strategy:**

- Use keyword search in JSON
- Look for method names, descriptions
- Check similar/related methods

#### 3. Verify API Signature

For each method found, confirm:

- ✅ Method name (exact spelling)
- ✅ Parameters (names, types, required vs optional)
- ✅ Return type
- ✅ Error conditions
- ✅ Usage notes

#### 4. Use Correct Access Pattern

```typescript
// ✅ CORRECT - Via store
await store.cc.methodName(params);

// ❌ WRONG - Direct SDK import
import sdk from '@webex/contact-center';
await sdk.methodName(params);
```

#### 5. Add Error Handling

```typescript
try {
  const result = await store.cc.methodName(params);
  // Handle success
  props.onSuccess?.(result);
} catch (error) {
  console.error('SDK error:', error);
  props.onError?.(error);
}
```

### Example: OutdialCall Widget

**Requirement:** Make outbound call

**SDK Search:** "outdial", "call", "dial"

**Found:** `startOutdial(destination: string, origin: string)`

**Usage:**

```typescript
const handleDial = async (phoneNumber: string) => {
  try {
    await store.cc.startOutdial(phoneNumber, 'WidgetName');
    props.onDial?.(phoneNumber);
  } catch (error) {
    console.error('Outdial failed:', error);
    props.onError?.(error);
  }
};
```

### Common SDK Operations

- **Agent State:** `store.cc.setAgentState(state, reasonCode)`
- **Task Accept:** `task.accept()`
- **Task Hold:** `task.hold()`
- **Task End:** `task.end()`
- **Events:** `store.cc.on('eventName', handler)`

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

- Widget consumes SDK methods via the store (through a hook) — it NEVER calls the SDK directly
- Component NEVER accesses store (receives props)
- Always use `observer` HOC for widgets
- Always use `runInAction` for store mutations
- Always wrap with ErrorBoundary
- Always apply withMetrics HOC for exports

---

## Step 5: Generate/Fix Code

**Follow the template you were routed to in Step 1**

You must have already completed that template's pre-step section (Pre-Enhancement Questions, Pre-Fix Questions, or 01-pre-questions as applicable); if not, do that first.

**During code generation:**

1. Follow pattern documentation strictly
2. Reference existing widgets for examples
3. Use proper TypeScript types (no `any`)
4. Include error handling
5. Add loading/error states
6. Write tests alongside code

---

## Step 5.5: Functionality Validation (CRITICAL)

**After generating code, VERIFY functionality layer by layer.**

### Validation Checklist

#### 1. SDK Integration ✓

- [ ] SDK methods exist in [contact-centre-sdk-apis/contact-center.json](./contact-centre-sdk-apis/contact-center.json)
- [ ] Parameters match SDK signature exactly
- [ ] Accessed via `store.cc.methodName()` (not direct import)
- [ ] Error handling present (try/catch)
- [ ] Success callbacks fire
- [ ] Error callbacks fire

**If method not found or signature mismatch → FIX before proceeding**

#### 2. Store Integration ✓

- [ ] Observable data accessed correctly
- [ ] `runInAction` used for mutations
- [ ] No direct store property assignments
- [ ] Store subscriptions cleaned up (useEffect return)

#### 3. Event Flow ✓

**Trace each user interaction:**

1. User action (click, input) → Event handler called?
2. Handler → State update triggered?
3. State update → Re-render triggered?
4. Re-render → UI updated correctly?

**If ANY step fails → Debug and fix**

#### 4. Data Flow ✓

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

**Verify each transition is correct.**

#### 5. UI Visual Validation ✓

**Compare with design input:**

- [ ] Colors match (or use Momentum tokens)
- [ ] Spacing matches (8px/0.5rem grid)
- [ ] Components match design
- [ ] Layout matches (flex/grid structure)
- [ ] Typography matches (sizes, weights)
- [ ] Interactions work (hover, click, etc.)

**If visual doesn't match → Update styling**

#### 6. Import Validation ✓

**Check for circular dependencies:**

```bash
# In widget code, search for:
grep -r "from '@webex/cc-widgets'" src/
# Should return: NO MATCHES

# In cc-components, search for:
grep -r "from '@webex/cc-.*-widget'" packages/contact-center/cc-components/src/
# Should return: NO MATCHES
```

**If any matches found → Refactor imports**

#### 7. Compiler Test ✓

```bash
yarn build
# Expected: NO ERRORS
```

**Common errors:**

- Missing types → Add type definitions
- Import errors → Check paths and exports
- Circular dependencies → Refactor imports
- Syntax errors → Fix code

**Fix ALL compiler errors before completing.**

---

## Step 6: Update Documentation

**CRITICAL: After any code change, check if documentation needs updates**

**Ask developer:** "The code changes are complete. Do I need to update any documentation?"

### Documentation to Consider

**If new widget created:**

- Generated via templates (AGENTS.md + ARCHITECTURE.md)

**If widget modified:**

- Update: `packages/contact-center/{widget-name}/ai-docs/AGENTS.md` (if API changed)
- Update: `packages/contact-center/{widget-name}/ai-docs/ARCHITECTURE.md` (if architecture changed)
- Add: New examples to AGENTS.md (if new use cases)
- Update: Troubleshooting in ARCHITECTURE.md (if new issues discovered)

**If store modified:**

- Update: `packages/contact-center/store/ai-docs/AGENTS.md`
- Update: `packages/contact-center/store/ai-docs/ARCHITECTURE.md`

**If component library modified:**

- Update: `packages/contact-center/cc-components/ai-docs/AGENTS.md`

**If new pattern established:**

- Update: Relevant pattern file in [patterns/](./ai-docs/patterns/)

**If architecture changed:**

- Update: Relevant architecture documentation as needed

**If Playwright E2E framework/docs changed:**

- Update: `playwright/ai-docs/AGENTS.md`
- Update: `playwright/ai-docs/ARCHITECTURE.md`
- Update relevant modules in: `ai-docs/templates/playwright/`
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
   - Code is precise and concise (no unnecessary complexity or dead code)

3. **Documentation checks**

   - AGENTS.md updated if needed
   - ARCHITECTURE.md updated if needed
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
    ├── AGENTS.md              # This file
    ├── RULES.md               # Repository rules
    ├── patterns/              # Repo-wide patterns
    ├── templates/             # Code generation templates
    └── contact-centre-sdk-apis/  # SDK API reference
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

- **Repository Rules:** [RULES.md](./RULES.md)
- **Templates Overview:** [templates/README.md](./ai-docs/templates/README.md)

---

_Last Updated: 2025-11-26_
