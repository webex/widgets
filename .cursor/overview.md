# Project Overview

## Webex Contact Center Widgets

This is a **monorepo** built with TypeScript, React, and Webpack containing reusable UI components and widgets for building custom contact center solutions.

## Key Characteristics

- **Monorepo Structure**: Uses Yarn Workspaces (v4.5.1+)
- **Dual Export Format**: Components available as both React components AND Web Components
- **State Management**: MobX for reactive state management
- **UI Library**: Momentum Design (@momentum-design/components & @momentum-ui/react-collaboration)
- **Package Manager**: Yarn v4.5.1+ (must use `yarn` commands, **NEVER** `npm`)

## Repository Structure

### Primary Packages: `packages/contact-center/`

```
packages/contact-center/
├── cc-components/       # Core UI components library (React + Web Components)
├── cc-widgets/          # ⭐ MAIN EXPORT PACKAGE - Re-exports all widgets for consumers
├── station-login/       # Agent station login widget
├── store/               # Central MobX store for state management
├── task/                # Task management widgets (call control, incoming tasks, etc.)
├── ui-logging/          # Logging and metrics utilities
└── user-state/          # Agent state management widget
```

### Other Important Directories

- **`packages/contact-center/cc-components/src/components/`**: Individual component implementations
- **`playwright/`**: End-to-end tests using Playwright
- **`widgets-samples/cc/samples-cc-react-app/`**: React sample app for testing widgets
- **`widgets-samples/cc/samples-cc-wc-app/`**: Web Components sample app
- **`tooling/`**: Build and publish utilities

## How Widgets Are Exposed

### ⚠️ CRITICAL: cc-widgets Package Role

The **`@webex/cc-widgets`** package is the **MAIN EXPORT PACKAGE** that consumers use:

1. **Individual widget packages** (station-login, task, user-state) create widgets
2. **cc-widgets package** re-exports ALL widgets in one place
3. **Consumers install** only `@webex/cc-widgets` and get everything

**Flow**:

```
Individual Widget Package → cc-widgets Package → Consumer
@webex/cc-station-login  ↘
@webex/cc-task           → @webex/cc-widgets → npm install @webex/cc-widgets
@webex/cc-user-state     ↗
```

**What cc-widgets exports**:

- All React components (for React apps)
- All Web Components (for vanilla JS apps)
- Store singleton
- Common types

## Package Dependency Order

⚠️ **CRITICAL**: Packages must be built in this order:

1. **@webex/cc-store** (no dependencies - must build first)
2. **@webex/cc-ui-logging** (depends on store)
3. **@webex/cc-components** (depends on store, ui-logging)
4. **@webex/cc-station-login**, **@webex/cc-task**, **@webex/cc-user-state** (depend on cc-components)
5. **@webex/cc-widgets** (depends on all above packages)

## Tech Stack Summary

### Core

- TypeScript 5.6.3
- React 18.3.1+
- MobX (state management)
- Webpack 5 (bundler)
- SCSS/Sass (styling)

### UI/Design

- @momentum-design/components (v0.53.8+)
- @momentum-design/icons (v0.17.0+)
- @momentum-ui/react-collaboration (v26.197.0+)
- @r2wc/react-to-web-component (2.0.3)

### Testing

- Jest 29.7.0 (unit tests)
- @testing-library/react (16.0.1)
- Playwright (E2E tests)

### Development

- ESLint 9.20+ with TypeScript ESLint
- Prettier
- Husky 9.1.7+ (git hooks)
- Semantic Release (automated publishing)

## SDK Integration

The widgets integrate with **Webex Contact Center SDK**:

- Package: `@webex/contact-center` (formerly `@webex/plugin-cc`)
- Store initialization: `store.registerCC(webex)`
- SDK provides: Task management, agent state, call controls, etc.

## Published Packages

- **@webex/cc-widgets**: Main widget bundle
- **@webex/cc-components**: Core components library
- Individual sub-packages (station-login, task, user-state, store, ui-logging)

**NPM Registry**: https://www.npmjs.com/package/@webex/cc-widgets

**Current Version**: 1.28.0-ccwidgets.122

## Quick Links

- Contributing guide: `packages/contact-center/CONTRIBUTING.md`
- Changelog: `packages/contact-center/CHANGELOG.md`
- Video tutorial: https://app.vidcast.io/share/6276b573-ba47-4fd0-a171-16af936b69d3
