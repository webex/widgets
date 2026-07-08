# Widgets Monorepo – Contact Center Focus

This repository is the widgets monorepo, which includes both Contact Center and meeting widgets.

## This document specifically focuses on the Webex Contact Center UI widgets built with React, MobX, and Web Components.

## Overview

```json
{
  "name": "@webex/contact-center-widgets",
  "type": "Yarn Workspace Monorepo",
  "purpose": "Contact center UI widgets for Webex"
}
```

---

## Technologies

- **TypeScript** - Type-safe development ([tsconfig.json](../tsconfig.json))
- **React 18** - Functional components with hooks
- **MobX** - Centralized state management (singleton pattern)
- **Web Components** - Framework-agnostic consumption via r2wc
- **Testing** - Jest (unit) + Playwright (E2E)
- **Build** - Webpack + Babel

---

## Components

### Active Widgets

**station-login** - Agent login with team and device selection

- Location: `packages/contact-center/station-login/`
- Docs: [ai-docs/](../packages/contact-center/station-login/ai-docs/)

**user-state** - Agent state management with timer and idle codes

- Location: `packages/contact-center/user-state/`
- Docs: [ai-docs/](../packages/contact-center/user-state/ai-docs/)

**task** - Bundle of task-related widgets (IncomingTask, TaskList, CallControl, CallControlCAD, OutdialCall)

- Location: `packages/contact-center/task/`
- Docs: [ai-docs/](../packages/contact-center/task/ai-docs/)

### Shared Packages

**store** - Centralized MobX state (singleton)

- Location: `packages/contact-center/store/`
- Docs: [ai-docs/](../packages/contact-center/store/ai-docs/)

**cc-components** - React UI primitives

- Location: `packages/contact-center/cc-components/`
- Docs: [ai-docs/](../packages/contact-center/store/ai-docs/)

**cc-widgets** - Web Component wrappers

- Location: `packages/contact-center/cc-widgets/`
- Docs: [ai-docs/](../packages/contact-center/cc-widgets/ai-docs/)

## Component Dependencies

```plantuml
@startuml
!define COMPONENT_BG #E3F2FD
!define STORE_BG #FFF3E0

component "station-login" COMPONENT_BG
component "user-state" COMPONENT_BG
component "task widgets" COMPONENT_BG #F5F5F5

component "store\n(Singleton)" STORE_BG
component "cc-components" COMPONENT_BG
component "cc-widgets" COMPONENT_BG

"station-login" --> store : uses
"station-login" --> "cc-components" : uses
"user-state" --> store : uses
"user-state" --> "cc-components" : uses
"task widgets" ..> store : uses
"task widgets" ..> "cc-components" : uses

"cc-widgets" --> "station-login" : wraps
"cc-widgets" --> "user-state" : wraps
"cc-widgets" ..> "task widgets" : wraps

note right of store
  MobX singleton
  Store.getInstance()
end note

note right of "cc-widgets"
  r2wc wrappers
  Custom elements
end note

@enduml
```

**Pattern:** Widget → Hook → Component → Store

---

## Build Commands

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Build specific package
yarn workspace @webex/cc-station-login build

# Watch mode
yarn workspace @webex/cc-station-login build:watch
```

---

## Test Commands

```bash
# Run all tests
yarn test

# Run specific package tests
yarn workspace @webex/cc-station-login test

# Run E2E tests
yarn test:e2e

# Run specific E2E suite
npx playwright test suites/station-login-user-state-tests.spec.ts
```

---

## Development Workflow

1. **Choose component** to work on
2. **Read component docs** in `packages/*/ai-docs/`
3. **Follow repo patterns** in `ai-docs/patterns/`
4. **Make changes** following component `RULES.md`
5. **Write tests** (unit + E2E)
6. **Build and verify**

---

## Architecture Overview

**Three-Layer Pattern:**
```
Widget (Observer) → Custom Hook (Business Logic) → Component (UI) → Store (State)
```

**Key Patterns:**
- **Singleton Store** - `Store.getInstance()` for centralized state
- **Observer Components** - `observer()` HOC for MobX reactivity
- **Custom Hooks** - Business logic encapsulation (e.g., `useStationLogin`)
- **Error Boundaries** - All widgets wrapped with error handling
- **Web Components** - r2wc for framework-agnostic consumption

**For detailed architecture, see:**
- [Store Documentation](../packages/contact-center/store/ai-docs/)

---

## Documentation Structure

This repository follows the SDLC-Templates `component-repo` standard (library version `0.1.0-draft`).
The doc spine is:

**Standing docs (repo-level, under `ai-docs/`):**
- [`../AGENTS.md`](../AGENTS.md) — agent entry contract (read first)
- [`SPEC_INDEX.md`](./SPEC_INDEX.md) — router: which doc to load per task + module registry
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system components, interactions, package map
- [`RULES.md`](./RULES.md), [`GLOSSARY.md`](./GLOSSARY.md), [`SECURITY.md`](./SECURITY.md), [`CONTRACTS.md`](./CONTRACTS.md), [`GETTING_STARTED.md`](./GETTING_STARTED.md), [`REVIEW_CHECKLIST.md`](./REVIEW_CHECKLIST.md), [`SERVICE_STATE.md`](./SERVICE_STATE.md)
- `patterns/`, `rules/`, `adr/` — reference conventions, rules, and decisions
- `templates/` — code-generation task templates (new widget, bug fix, feature, Playwright)

**Per-module specs (source-local):**
- `packages/<area>/<module>/ai-docs/<module>-spec.md` — canonical module spec (orientation, requirements, design, flows, tests). See `SPEC_INDEX.md` for the registry.

**Machine source of truth:** `.sdd/manifest.json` (coverage state per module) and `.sdd/coverage-policy.defaults.yaml`.

Docs predating this standard are preserved under `_archive/pre-sdlc-migration/`.

## For AI Assistants

See [`../AGENTS.md`](../AGENTS.md) for the agent entry contract, then [`SPEC_INDEX.md`](./SPEC_INDEX.md) for routing.

---

## Links

- **Repository Rules:** [RULES.md](./RULES.md)
- **Root Package:** [package.json](../package.json)
- **TypeScript Config:** [tsconfig.json](../tsconfig.json)
- **Playwright Config:** [playwright.config.ts](../playwright.config.ts)

---

_Last Updated: 2026-03-04_
