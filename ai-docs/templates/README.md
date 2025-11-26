# AI Templates Directory

## Purpose

Templates for generating and maintaining contact center widgets and components.

## Structure

```
templates/
├── new-widget/          # Widget generation (7 modules)
├── existing-widget/     # Bug fixes, features (2 modules)
└── documentation/       # Documentation generation (2 modules, reusable for all packages)
```

## Templates

### 1. New Widget Generation

**Directory:** [new-widget/](./new-widget/)

**Modules:**
- [00-master.md](./new-widget/00-master.md) - Orchestrator & workflow
- [01-pre-questions.md](./new-widget/01-pre-questions.md) - Requirements gathering
- [02-code-generation.md](./new-widget/02-code-generation.md) - Widget code patterns
- [03-component-generation.md](./new-widget/03-component-generation.md) - Presentational components (conditional)
- [04-integration.md](./new-widget/04-integration.md) - cc-widgets + samples integration
- [05-test-generation.md](./new-widget/05-test-generation.md) - Test patterns
- [06-validation.md](./new-widget/06-validation.md) - Quality checklist

### 2. Existing Widget Maintenance

**Directory:** [existing-widget/](./existing-widget/)

**Modules:**
- [bug-fix.md](./existing-widget/bug-fix.md) - Bug fix workflow
- [feature-enhancement.md](./existing-widget/feature-enhancement.md) - Feature addition workflow

### 3. Documentation Generation

**Directory:** [documentation/](./documentation/)

**Reusable for:** Widgets, store, components, utilities

**Modules:**
- [create-agent-md.md](./documentation/create-agent-md.md) - Generate agent.md
- [create-architecture-md.md](./documentation/create-architecture-md.md) - Generate architecture.md

---

## Usage

**New Widget:** Start with [new-widget/00-master.md](./new-widget/00-master.md)

**Bug Fix:** Read [existing-widget/bug-fix.md](./existing-widget/bug-fix.md)

**Feature Addition:** Read [existing-widget/feature-enhancement.md](./existing-widget/feature-enhancement.md)

**Documentation Only:** Use [documentation/](./documentation/) templates

## Pattern References

- [TypeScript Patterns](../patterns/typescript-patterns.md)
- [React Patterns](../patterns/react-patterns.md)
- [MobX Patterns](../patterns/mobx-patterns.md)
- [Web Component Patterns](../patterns/web-component-patterns.md)
- [Testing Patterns](../patterns/testing-patterns.md)

---

_Last Updated: 2025-11-26_
