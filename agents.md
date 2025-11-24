# AI Agent Guide - Contact Center Widgets

> **Primary purpose:** Enable AI-driven software development without manual code generation.

This guide helps AI assistants navigate the codebase, ask clarifying questions, and generate code following established patterns.

---

## Quick Start for AI Assistants

**Entry point:** Start here to understand how to help developers.

**Key principle:** Always ask clarifying questions before generating code.

---

## Navigation Flow

**When developer asks for help, follow this flow:**

```json
{
  "step_1_understand_task": {
    "ask_questions": [
      "Which component are you working on?",
      "What type of change? (bug fix / new feature / refactor / test)",
      "Do you need to modify store, component, or both?",
      "Are there existing patterns I should follow?",
      "Should I check component EXAMPLES.md for similar code?"
    ]
  },
  "step_2_load_context": {
    "always_read": [
      "docs/README.md - Repository overview",
      "packages/contact-center/{component}/ai-prompts/README.md - Component API"
    ],
    "conditionally_read": {
      "architecture_questions": "packages/contact-center/{component}/ai-prompts/OVERVIEW.md",
      "example_code": "packages/contact-center/{component}/ai-prompts/EXAMPLES.md",
      "conventions": "packages/contact-center/{component}/ai-prompts/RULES.md",
      "repo_patterns": "docs/patterns/{typescript|mobx|react|wc|testing}-patterns.md",
      "visual_understanding": "docs/diagrams/*.puml"
    }
  },
  "step_3_clarify_requirements": {
    "before_coding_ask": [
      "Should I follow the pattern from EXAMPLES.md?",
      "Are there component-specific RULES.md I must follow?",
      "Do I need to update tests?",
      "Should I check the store documentation?",
      "Are there related components I should be aware of?"
    ]
  },
  "step_4_generate_code": {
    "follow": [
      "Component RULES.md",
      "Repository patterns (docs/patterns/)",
      "Existing code style from EXAMPLES.md"
    ],
    "verify": [
      "Does code match naming conventions?",
      "Does it follow the three-layer pattern (Widget → Hook → Component)?",
      "Are TypeScript types correct?",
      "Is MobX usage correct (observer, runInAction)?",
      "Are tests included?"
    ]
  }
}
```

---

## Task-Based Entry Points

### Fixing a Bug

1. **Ask:** "Which component has the bug?"
2. **Read:** `packages/contact-center/{component}/ai-prompts/README.md`
3. **Read:** `packages/contact-center/{component}/ai-prompts/OVERVIEW.md`
4. **Check:** `packages/contact-center/{component}/ai-prompts/RULES.md`
5. **Reference:** `docs/patterns/{relevant-pattern}.md`
6. **Generate fix** following patterns
7. **Ask:** "Should I add/update tests?"

### Adding New Feature

1. **Ask:** "Which component needs the feature?"
2. **Ask:** "Is there similar functionality in EXAMPLES.md?"
3. **Read:** `docs/patterns/` (understand repo-wide patterns)
4. **Read:** `packages/contact-center/{component}/ai-prompts/EXAMPLES.md`
5. **Check:** Component flow diagram (if exists)
6. **Follow:** Component RULES.md conventions
7. **Generate feature** following patterns
8. **Ask:** "Should I add tests?"

### Understanding Architecture

1. **Read:** `docs/README.md` (high-level overview)
2. **Review:** `docs/diagrams/architecture.puml`
3. **Review:** `docs/diagrams/llm-navigation.puml`
4. **Deep dive:** `packages/contact-center/store/ai-prompts/`
5. **Ask:** "Which component do you need details about?"
6. **Read:** Component-specific OVERVIEW.md

### Writing Tests

1. **Ask:** "What needs testing?"
2. **Read:** `docs/patterns/testing-patterns.md`
3. **Reference:** `packages/contact-center/{component}/ai-prompts/EXAMPLES.md`
4. **Check:** Existing tests in `packages/contact-center/{component}/tests/`
5. **Follow:** Jest patterns (unit) and Playwright patterns (E2E)
6. **Generate tests** following conventions

### Refactoring Code

1. **Ask:** "What needs refactoring and why?"
2. **Ask:** "Should I maintain exact same API?"
3. **Read:** Component README + OVERVIEW
4. **Read:** Relevant docs/patterns/*.md
5. **Check:** Component RULES.md for constraints
6. **Propose refactoring** following patterns
7. **Ask:** "Should I update tests?"

---

## Context Loading Strategy

**For efficient token usage:**

### Minimal Context (Start Here)
```
1. docs/README.md (repo overview)
2. packages/contact-center/{component}/ai-prompts/README.md (component API)
```

### Standard Context (Most Tasks)
```
+ packages/contact-center/{component}/ai-prompts/OVERVIEW.md (architecture)
+ packages/contact-center/{component}/ai-prompts/RULES.md (conventions)
+ docs/patterns/{relevant}.md (1-2 relevant pattern files)
```

### Deep Context (Complex Tasks)
```
+ packages/contact-center/{component}/ai-prompts/EXAMPLES.md (code examples)
+ docs/diagrams/{component}-flow.puml (visual flow)
+ packages/contact-center/store/ai-prompts/ (if store changes needed)
```

**Principle:** Load incrementally - start minimal, add context as needed based on task complexity.

---

## Best Practices for AI Assistants

### Before Writing Code

✅ **Always ask clarifying questions:**
- "What component are you working on?"
- "Should I follow existing patterns?"
- "Do you want me to add tests?"
- "Are there constraints I should know about?"

✅ **Load appropriate context:**
- Component README (API)
- Component OVERVIEW (architecture)
- Component RULES (conventions)
- Relevant repo patterns

✅ **Verify understanding:**
- "Should I check EXAMPLES.md for similar code?"
- "Are there related components?"
- "Do I need to update the store?"

### When Uncertain

**Ask questions like:**
- "Should I check the OVERVIEW.md for architecture context?"
- "Are there related examples in EXAMPLES.md?"
- "Do I need to follow specific patterns from docs/patterns/?"
- "Should I reference the component diagram?"
- "Do the RULES.md have constraints for this change?"

**Do not guess - always ask!**

### During Code Generation

✅ **Follow patterns:**
- Match naming conventions (see docs/patterns/typescript-patterns.md)
- Use established patterns (Widget → Hook → Component → Store)
- Follow MobX conventions (observer, runInAction)
- Match existing code style

✅ **Reference examples:**
- Check EXAMPLES.md for similar implementations
- Copy patterns from existing code
- Maintain consistency with codebase

✅ **Verify correctness:**
- Does it match component RULES.md?
- Does it follow repo-wide patterns?
- Are TypeScript types correct?
- Is error handling included?

### After Code Generation

✅ **Ask follow-up questions:**
- "Should I add unit tests?"
- "Should I add E2E tests?"
- "Do you want me to update the component README?"
- "Should I check for other impacted components?"

---

## Repository Structure

```json
{
  "docs": {
    "README.md": "Repository information and overview",
    "patterns": "Repository-wide patterns (TypeScript, MobX, React, WC, Testing)",
    "diagrams": "Architecture and navigation diagrams"
  },
  "packages/contact-center": {
    "store": "MobX singleton store (shared state)",
    "cc-components": "React UI primitives (shared components)",
    "cc-widgets": "Web Component wrappers (r2wc)",
    "{widget}": "Individual widgets with ai-prompts/ documentation"
  }
}
```

**Each component's `ai-prompts/` contains:**
- `README.md` - Public API, props, usage
- `OVERVIEW.md` - Internal architecture, design decisions
- `EXAMPLES.md` - Common patterns, code examples
- `RULES.md` - Component-specific conventions
- `diagrams/` - Visual flows (if applicable)

---

## Common Questions to Ask

### For Any Task
- "Which component?"
- "What type of change?"
- "Should I follow existing patterns?"

### For Bug Fixes
- "What's the expected behavior?"
- "Do you have steps to reproduce?"
- "Should I add a test to prevent regression?"

### For New Features
- "Is there similar functionality elsewhere?"
- "Should I follow patterns from EXAMPLES.md?"
- "What's the expected API?"

### For Tests
- "Unit tests, E2E tests, or both?"
- "Should I check existing test patterns?"
- "What scenarios should I cover?"

### For Refactoring
- "Why is refactoring needed?"
- "Should I maintain the same API?"
- "Are there breaking changes?"

---

## Dependency Graph (High-Level)

**All widgets depend on:**
- `store` (Singleton MobX state - `Store.getInstance()`)
- `cc-components` (React UI primitives)

**Web Components:**
- `cc-widgets` wraps React components using r2wc library

**Pattern:**
```
Widget (observer) 
  → Custom Hook (business logic)
    → Component (presentation)
      → Store (state)
        → SDK (backend)
```

**For details:** Check component OVERVIEW.md or docs/diagrams/architecture.puml

---

## Success Criteria

**Code generation is successful when:**
- ✅ Follows component RULES.md
- ✅ Matches repo-wide patterns (docs/patterns/)
- ✅ Maintains consistency with EXAMPLES.md
- ✅ Includes proper TypeScript types
- ✅ Uses MobX correctly (observer, runInAction)
- ✅ Includes error handling
- ✅ Has tests (when appropriate)
- ✅ Follows naming conventions

---

## Links

- **Repository Overview:** [docs/README.md](./docs/README.md)
- **Implementation Plan:** [docs/ai-driven-development-setup.plan.md](./docs/ai-driven-development-setup.plan.md)
- **Pattern Documentation:** [docs/patterns/](./docs/patterns/)
- **Architecture Diagrams:** [docs/diagrams/](./docs/diagrams/)

---

**Remember:** The goal is AI-driven software development without manual code. Always ask clarifying questions, load appropriate context, and generate code following established patterns.

---

_Last Updated: 2025-11-23_
