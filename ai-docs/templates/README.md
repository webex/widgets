# AI Templates Directory

## Purpose

Templates for generating and maintaining contact center widgets and components.

## Structure

```
templates/
├── new-widget/          # Widget generation (7 modules)
├── existing-widget/     # Bug fixes, features (2 modules)
├── documentation/       # Documentation generation (2 modules, reusable for all packages)
├── playwright/          # Playwright E2E templates
└── development-phase/   # Development phase harness (6 modules + artifact templates)
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
- [create-agent-md.md](./documentation/create-agent-md.md) - Generate AGENTS.md
- [create-architecture-md.md](./documentation/create-architecture-md.md) - Generate ARCHITECTURE.md

### 4. Playwright E2E Work

**Directory:** [playwright/](./playwright/)

**Modules:**
- [00-master.md](./playwright/00-master.md) - Orchestrator and workflow
- [01-pre-questions.md](./playwright/01-pre-questions.md) - Mandatory intake
- [02-test-implementation.md](./playwright/02-test-implementation.md) - Suites/tests/sets implementation
- [03-framework-and-doc-updates.md](./playwright/03-framework-and-doc-updates.md) - Shared framework/docs updates
- [04-validation.md](./playwright/04-validation.md) - Validation checklist

### 5. Development Phase Harness

**Directory:** [development-phase/](./development-phase/)

**Orchestrator:** [../harness/development-phase-plan.md](../harness/development-phase-plan.md)

**Modules:**
- [00-master.md](./development-phase/00-master.md) - Phase orchestrator
- [01-intake.md](./development-phase/01-intake.md) - DoR gate + spec.md
- [02-implementation.md](./development-phase/02-implementation.md) - TDD loop
- [03-verification.md](./development-phase/03-verification.md) - Build, unit, E2E gates
- [04-pr-and-review.md](./development-phase/04-pr-and-review.md) - Cross-review + PR
- [05-post-merge.md](./development-phase/05-post-merge.md) - Security/Beta/GTM handoffs

**Artifact templates:**
- [spec.md.template](./development-phase/spec.md.template)
- [microservices-delta.md.template](./development-phase/microservices-delta.md.template)

---

## Usage

**New Widget:** Start with [new-widget/00-master.md](./new-widget/00-master.md)

**Bug Fix:** Read [existing-widget/bug-fix.md](./existing-widget/bug-fix.md)

**Feature Addition:** Read [existing-widget/feature-enhancement.md](./existing-widget/feature-enhancement.md)

**Documentation Only:** Use [documentation/](./documentation/) templates

**Playwright E2E Work:** Start with [playwright/00-master.md](./playwright/00-master.md)

**Development Phase (Discovery handoff):** Start with [development-phase/00-master.md](./development-phase/00-master.md) and [harness/development-phase-plan.md](../harness/development-phase-plan.md)

## Pattern References

- [TypeScript Patterns](../patterns/typescript-patterns.md)
- [React Patterns](../patterns/react-patterns.md)
- [MobX Patterns](../patterns/mobx-patterns.md)
- [Web Component Patterns](../patterns/web-component-patterns.md)
- [Testing Patterns](../patterns/testing-patterns.md)

---

_Last Updated: 2026-06-10_
