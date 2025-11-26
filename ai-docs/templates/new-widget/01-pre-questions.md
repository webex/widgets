# Pre-Generation Questions

## Overview

This module helps gather complete requirements before generating any code. Answer all questions to ensure the generated widget meets requirements and follows patterns.

**Purpose:** Requirements discovery and planning

**Read this:** Before generating any code

---

## Widget Identification

### 1. Basic Information

**Widget name (kebab-case):**
```
Example: agent-directory, call-history, team-performance
Your answer: _______________
```

**Widget purpose (one sentence):**
```
Example: "Displays searchable directory of available agents for transfer"
Your answer: _______________
```

**Widget display name:**
```
Example: "Agent Directory", "Call History", "Team Performance"
Your answer: _______________
```

---

## Design Input

### 2. Design Specifications

Select all that apply:

**[ ] Figma link available**
```
URL: _______________
```

**[ ] Screenshots attached**
```
Number of screenshots: _______________
Location: _______________
```

**[ ] Written specification**
```
Specification document: _______________
Key requirements:
- _______________
- _______________
- _______________
```

**[ ] Reference existing widget**
```
Widget to reference: _______________
Similar patterns: _______________
```

---

## Complexity Assessment

### 3. Widget Complexity Level

Select ONE level (determines which modules to read next):

**[ ] Display-Only (Simple)**
- Pure presentational widget
- No user interactions beyond viewing
- Read-only data from store
- No callbacks required
- Estimated effort: 4-6 hours
- Token cost: ~1,600

**Examples:**
- Agent status indicator
- Queue statistics display
- Session duration timer
- Current task summary

**[ ] Interactive (Medium)**
- User can interact (clicks, selections)
- Callbacks to parent component
- May update store (minimal)
- Conditional rendering based on state
- Estimated effort: 8-12 hours
- Token cost: ~2,000

**Examples:**
- Quick actions menu
- Filter/sort controls
- Dropdown selectors
- Button panels

**[ ] Complex (Advanced)**
- Full store integration
- Direct SDK method calls
- Background processing (timers, workers)
- Complex state management
- CRUD operations
- Estimated effort: 16-24 hours
- Token cost: ~2,400

**Examples:**
- Agent directory with search
- Task management grid
- Real-time analytics dashboard
- Multi-step workflows

**Your selection:** _______________

---

## Store Integration

### 4. Store Usage Assessment

**Does this widget need to READ from store?**
```
[ ] Yes [ ] No

If Yes, list observables needed:
- store._______________
- store._______________
- store._______________
```

**Does this widget need to WRITE to store?**
```
[ ] Yes [ ] No

If Yes, list mutations needed:
- store.set_______________(value)
- store.set_______________(value)
- store.set_______________(value)
```

**Does this widget need NEW store observables?**
```
[ ] Yes [ ] No

⚠️ IMPORTANT: Creating new store observables requires architecture discussion

If Yes, list new observables and justification:
- Observable: _______________
  Justification: _______________
  Type: _______________
  
- Observable: _______________
  Justification: _______________
  Type: _______________
```

**Does this widget need SDK methods?**
```
[ ] Yes [ ] No

If Yes, list SDK methods:
- store.cc._______________(params)
- store.cc._______________(params)
- store.cc._______________(params)
```

---

## Component Requirements

### 5. Presentational Components

**Does this widget need NEW presentational components in cc-components?**
```
[ ] Yes [ ] No

If No, which existing components will be used:
- _______________
- _______________
- _______________
```

**If Yes, list new components needed:**

**Component 1:**
```
Name: _______________
Purpose: _______________
Props: _______________
Reusable: [ ] Yes [ ] No
```

**Component 2:**
```
Name: _______________
Purpose: _______________
Props: _______________
Reusable: [ ] Yes [ ] No
```

**Component 3:**
```
Name: _______________
Purpose: _______________
Props: _______________
Reusable: [ ] Yes [ ] No
```

---

## API Design

### 6. Props & Callbacks

**Required Props:**
```typescript
// List all REQUIRED props with types
// Example:
// - searchQuery: string
// - maxResults: number

Your props:
- _______________: _______________
- _______________: _______________
- _______________: _______________
```

**Optional Props:**
```typescript
// List all OPTIONAL props with types and defaults
// Example:
// - showTimestamp?: boolean (default: false)
// - customStyles?: CSSProperties

Your props:
- _______________?: _______________ (default: _______________)
- _______________?: _______________ (default: _______________)
- _______________?: _______________ (default: _______________)
```

**Callbacks (Events):**
```typescript
// List all callbacks with parameter types
// Example:
// - onItemSelected: (item: Item) => void
// - onError: (error: Error) => void
// - onLoadComplete: () => void

Your callbacks:
- _______________: (_______________) => void
- _______________: (_______________) => void
- _______________: (_______________) => void
```

---

## Feature Requirements

### 7. Key Features

**Primary Features (Must Have):**
1. _______________
2. _______________
3. _______________

**Secondary Features (Should Have):**
1. _______________
2. _______________
3. _______________

**Future Features (Nice to Have):**
1. _______________
2. _______________
3. _______________

---

## User Interactions

### 8. User Actions

**What can users DO with this widget?**

**Action 1:**
```
User action: _______________
Expected result: _______________
Callback triggered: _______________
```

**Action 2:**
```
User action: _______________
Expected result: _______________
Callback triggered: _______________
```

**Action 3:**
```
User action: _______________
Expected result: _______________
Callback triggered: _______________
```

---

## Error Scenarios

### 9. Error Handling

**What can go wrong?**

**Error Scenario 1:**
```
Condition: _______________
Error message: _______________
User action: _______________
Recovery: _______________
```

**Error Scenario 2:**
```
Condition: _______________
Error message: _______________
User action: _______________
Recovery: _______________
```

**Error Scenario 3:**
```
Condition: _______________
Error message: _______________
User action: _______________
Recovery: _______________
```

---

## Testing Requirements

### 10. Test Scenarios

**Unit Test Scenarios:**
1. _______________
2. _______________
3. _______________

**E2E Test Scenarios (Optional):**
1. _______________
2. _______________
3. _______________

**Edge Cases to Test:**
1. _______________
2. _______________
3. _______________

---

## Module Selection

### Based on Your Answers

**Always Required Modules:**
- ✅ 02-code-generation.md (Widget code)
- ✅ 04-integration.md (cc-widgets + samples)
- ✅ 05-test-generation.md (Tests)
- ✅ 06-validation.md (Validation)

**Conditional Modules:**

**Read 03-component-generation.md IF:**
- You answered "Yes" to creating new presentational components

**Skip 03-component-generation.md IF:**
- Using only existing components

**Generate Documentation:**
- Always use: ../documentation/create-agent-md.md
- Always use: ../documentation/create-architecture-md.md

---

## Summary Checklist

Before proceeding to code generation, verify you have:

- [ ] Widget name (kebab-case)
- [ ] Widget purpose (clear, one sentence)
- [ ] Complexity level selected
- [ ] Design input identified (Figma, screenshots, specs, or reference)
- [ ] Store observables identified (read/write)
- [ ] Component requirements clear (new or existing)
- [ ] Props defined (required + optional with defaults)
- [ ] Callbacks defined (with parameter types)
- [ ] Key features listed (must have, should have, nice to have)
- [ ] User interactions mapped
- [ ] Error scenarios identified
- [ ] Test scenarios outlined
- [ ] Module selection determined

---

## Next Steps

**If all questions answered:**
1. Proceed to 02-code-generation.md
2. Then 03-component-generation.md (if new components needed)
3. Then 04-integration.md
4. Then 05-test-generation.md
5. Then ../documentation/create-agent-md.md
6. Then ../documentation/create-architecture-md.md
7. Finally 06-validation.md

**If questions unclear:**
- Ask for clarification
- Review similar widgets for reference
- Check design materials again
- Discuss with team

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

