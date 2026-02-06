# CC Widgets - Widget Aggregator & Web Components

## Overview

CC Widgets is an aggregator package that bundles all contact center widgets and exports them in two formats: React components for React applications, and Web Components for framework-agnostic use. It uses the r2wc library to convert React widgets into standards-compliant Web Components that can be used in any web application.

**Package:** `@webex/cc-widgets`

**Version:** See [package.json](../package.json)

---

## Why and What is This Package Used For?

### Purpose

CC Widgets serves as the main entry point for contact center widgets. It:

- **Single package, no dependency sprawl** - Install one package (`@webex/cc-widgets`) instead of multiple widget packages; no need to track versions, peer dependencies, or compatibility across `@webex/cc-station-login`, `@webex/cc-user-state`, `@webex/cc-task`, etc.
- **Provides complete widget suite** - All widgets (StationLogin, UserState, TaskList, CallControl, OutdialCall, etc.) are bundled and ready to use
- **Delivers production-ready bundles** - Pre-built, optimized webpack bundles with all dependencies included
- **Reduces integration effort** - One installation, one import, immediate access to all widgets

### Key Capabilities

- **Dual Export System**:

  - Import as React components for React applications
  - Use as Web Components (`<widget-cc-*>`) for framework-agnostic integration
  - Both formats available from the same package

- **Automatic Web Component Registration**:

  - Web Components auto-register in the browser when bundle is loaded
  - No manual `customElements.define()` required
  - Ready to use immediately in HTML

- **Single Package Management**:

  - All widgets bundled in one npm package
  - Guaranteed compatibility between widgets
  - Simplified version management and updates

- **Production Optimized**:

  - Webpack-bundled with code splitting
  - React and dependencies included in Web Component bundle
  - Minimal bundle size for React component exports (re-exports only)

- **Event System**:

  - React components use standard props and callbacks
  - Web Components emit CustomEvents for framework-agnostic communication
  - Consistent event handling across both formats

- **Shared Store Access**:
  - Global MobX store accessible from both React and Web Components
  - Single source of truth for agent state, tasks, and SDK interactions
  - No store duplication or synchronization needed

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package                        | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `@r2wc/react-to-web-component` | React to Web Component conversion                        |
| `@webex/cc-station-login`      | Station Login widget                                     |
| `@webex/cc-user-state`         | User State widget                                        |
| `@webex/cc-task`               | Task widgets (TaskList, IncomingTask, CallControl, etc.) |
| `@webex/cc-store`              | MobX singleton store                                     |

### Peer Dependencies

| Package                            | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| `@momentum-ui/react-collaboration` | Momentum UI components (required by widgets) |

### Note on React Dependencies

React and ReactDOM are **not** listed as dependencies because:

- React components expect the host app to provide React
- Web Components bundle includes React internally
- This prevents duplicate React instances

---

## Available Widgets

### React Component Exports

```typescript
import {
  StationLogin, // Agent station login
  UserState, // Agent state management
  IncomingTask, // Incoming task notifications
  TaskList, // Active tasks list
  CallControl, // Call control buttons
  CallControlCAD, // CAD-enabled call control
  OutdialCall, // Outbound dialing
  store, // MobX store singleton
} from '@webex/cc-widgets';
```

---

## Examples and Use Cases

### Getting Started

#### React Component Usage

```typescript
import { StationLogin, UserState, TaskList } from '@webex/cc-widgets';
import store from '@webex/cc-widgets';
import React from 'react';

function MyApp() {
  return (
    <div>
      <StationLogin
        onLogin={() => console.log('Logged in')}
        profileMode={false}
      />
      <UserState
        onStateChange={(state) => console.log('State:', state)}
      />
      <TaskList
        onTaskSelected={(id) => console.log('Task:', id)}
      />
    </div>
  );
}
```

#### Web Component Usage (HTML)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Contact Center Widgets</title>
    <!-- Import Momentum UI CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@momentum-ui/core/css/momentum-ui.min.css" />
  </head>
  <body>
    <!-- Use Web Components -->
    <widget-cc-station-login></widget-cc-station-login>
    <widget-cc-user-state></widget-cc-user-state>
    <widget-cc-task-list></widget-cc-task-list>

    <!-- Import the Web Components bundle -->
    <script src="path/to/cc-widgets/dist/wc.js"></script>

    <script>
      // Initialize the widget store and set your access token BEFORE using any widgets
      const store = window['ccWidgetStore'];
      store.init({
        access_token: '<YOUR_ACCESS_TOKEN>',
        webexConfig: {
          // Optionally configure Webex SDK here
        },
      });
    </script>
  </body>
</html>
```

### Common Use Cases

#### 1. Embedding in Non-React Applications

```html
<!-- Angular, Vue, or vanilla JS app -->
<!DOCTYPE html>
<html>
  <body>
    <div id="app">
      <!-- Web Components work anywhere -->
      <widget-cc-user-state></widget-cc-user-state>
      <widget-cc-call-control></widget-cc-call-control>
    </div>

    <script src="cc-widgets/dist/wc.js"></script>
    <script>
      // Initialize the widget store and set Webex configuration and access token
      store.init({
        webexConfig,
        access_token: '<YOUR_ACCESS_TOKEN>',
      });
    </script>
  </body>
</html>
```

#### 3. Micro-Frontend Architecture

```typescript
// Host application
import { StationLogin, UserState } from '@webex/cc-widgets';
import store from '@webex/cc-widgets';

// Initialize the store before using it and before sharing across micro-frontends
store.init({
  access_token: '<YOUR_ACCESS_TOKEN>',
  // Add any other necessary configuration here
});

// Share store across micro-frontends
window.ccStore = store;

function HostApp() {
  return (
    <div>
      <StationLogin profileMode={false} />
      {/* Other micro-frontends can access window.ccStore */}
    </div>
  );
}
```

### Integration Patterns

#### Initializing Store Before Widget Use

```typescript
import {store} from '@webex/cc-widgets';

async function initialize() {
  await store.init({
    webexConfig,
    access_token: <ACCESS_TOKEN>,
  });

  // 4. Now widgets are ready to use
  renderWidgets();
}
```

#### Event Handling with Web Components

Web Components use **property assignment** for event handlers (not `addEventListener`). Assign callback functions directly to event properties:

```javascript
// Create or get references to Web Components
const ccStationLogin = document.createElement('widget-cc-station-login');
const ccUserState = document.createElement('widget-cc-user-state');
const ccIncomingTask = document.createElement('widget-cc-incoming-task');
const ccTaskList = document.createElement('widget-cc-task-list');
const ccCallControl = document.createElement('widget-cc-call-control');
const ccOutdial = document.createElement('widget-cc-outdial-call');

// Assign event handler callbacks directly to properties
ccStationLogin.onLogin = () => {
  console.log('Login successful');
  showAgentDashboard();
};

ccStationLogin.onLogout = () => {
  console.log('Logout successful');
  showLoginScreen();
};

ccUserState.onStateChange = (status) => {
  console.log('Agent state changed:', status);
  updateStatusIndicator(status);
};

ccIncomingTask.onAccepted = () => {
  console.log('Task accepted');
};

ccIncomingTask.onDeclined = () => {
  console.log('Task declined');
};

ccTaskList.onTaskAccepted = () => {
  console.log('Task accepted from task list');
};

ccTaskList.onTaskDeclined = () => {
  console.log('Task declined from task list');
};

ccCallControl.onHoldResume = () => {
  console.log('Hold/Resume toggled');
};

ccCallControl.onEnd = () => {
  console.log('Call ended');
};

ccCallControl.onWrapUp = (params) => {
  console.log('Wrap-up completed', params);
};

// Append widgets to DOM after assigning event handlers
document.body.appendChild(ccStationLogin);
document.body.appendChild(ccUserState);
document.body.appendChild(ccTaskList);
document.body.appendChild(ccCallControl);
```

---

## Installation

```bash
# Install the widgets bundle
yarn add @webex/cc-widgets

```

---

## Build Outputs

The package produces two bundles:

### 1. React Bundle (`dist/index.js`)

Used with: import { StationLogin } from '@webex/cc-widgets'. Contains: Re-exports of React widgets + store. Size: Small (just re-exports, no bundled code)

### 2. Web Components Bundle (`dist/wc.js`)

Used with: <script src="dist/wc.js"></script>. Contains: All widgets + React + dependencies bundled.Size: Large (self-contained bundle).Includes: r2wc wrappers + custom element registration

---

## Additional Resources

For detailed architecture, r2wc integration patterns, and troubleshooting, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_
