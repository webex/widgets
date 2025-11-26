# Contact Center Widgets

Monorepo for Webex Contact Center UI widgets built with React, MobX, and Web Components.

---

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

### Shared Packages

**store** - Centralized MobX state (singleton)
- Location: `packages/contact-center/store/`
- Docs: [ai-docs/](../packages/contact-center/store/ai-docs/)

**cc-components** - React UI primitives
- Location: `packages/contact-center/cc-components/`

**cc-widgets** - Web Component wrappers
- Location: `packages/contact-center/cc-widgets/`

### Future Widgets

<!-- TODO: Task widgets (IncomingTask, TaskList, CallControl, CallControlCAD, OutdialCall) -->

---

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
3. **Follow repo patterns** in `docs/patterns/`
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
- [Architecture Diagram](./diagrams/architecture.puml)
- [Store Documentation](../packages/contact-center/store/ai-docs/)

---

## Documentation Structure

**Repository Patterns:**
- `docs/patterns/` - TypeScript, MobX, React, Web Components, Testing patterns

**Component Documentation:**
- `packages/*/ai-docs/README.md` - API and usage
- `packages/*/ai-docs/OVERVIEW.md` - Architecture and design
- `packages/*/ai-docs/EXAMPLES.md` - Code examples
- `packages/*/ai-docs/RULES.md` - Component conventions
- `packages/*/ai-docs/diagrams/` - Visual flows

**Diagrams:**
- `docs/diagrams/llm-navigation.puml` - Documentation navigation guide
- `docs/diagrams/architecture.puml` - Monorepo structure

---

## For AI Assistants

See [agents.md](../agents.md) for AI navigation guidance, task-based workflows, and best practices.

---

## Links

- **Implementation Plan:** [ai-driven-development-setup.plan.md](./ai-driven-development-setup.plan.md)
- **Root Package:** [package.json](../package.json)
- **TypeScript Config:** [tsconfig.json](../tsconfig.json)
- **Playwright Config:** [playwright.config.ts](../playwright.config.ts)

---

_Last Updated: 2025-11-23_
