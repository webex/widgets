# CC Widgets - Widget Aggregator & Web Components

## Overview

CC Widgets is an aggregator package that bundles all contact center widgets and exports them in two formats: React components for React applications, and Web Components for framework-agnostic use. It uses the r2wc library to convert React widgets into standards-compliant Web Components that can be used in any web application.

**Package:** `@webex/cc-widgets`

**Version:** See [package.json](../package.json)

---

## Why and What is This Package Used For?

### Purpose

CC Widgets serves as the main entry point and bundle for contact center widgets. It:
- **Aggregates all widgets** from individual packages into a single bundle
- **Provides dual exports** - React components and Web Components
- **Registers Web Components** automatically in the browser
- **Simplifies integration** with a single package installation
- **Bundles dependencies** for production use

### Key Capabilities

- **Dual Export System**: Import as React components or use as Web Components
- **Automatic Registration**: Web Components auto-register when imported
- **Framework Agnostic**: Web Components work with any framework (Angular, Vue, vanilla JS)
- **Single Package**: All widgets in one npm package
- **Production Ready**: Optimized webpack bundle with all dependencies

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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@momentum-ui/core/css/momentum-ui.min.css">
</head>
<body>
  <!-- Use Web Components -->
  <widget-cc-station-login></widget-cc-station-login>
  <widget-cc-user-state></widget-cc-user-state>
  <widget-cc-task-list></widget-cc-task-list>

  <!-- Import the Web Components bundle -->
  <script src="path/to/cc-widgets/dist/wc.js"></script>

  <script>
    // Access store for initialization
    const { store } = window.ccWidgets;
    
    // Initialize Contact Center SDK
    const initCC = async () => {
      const cc = await ContactCenter.init({
        token: 'your-token',
        region: 'us1'
      });
      store.setCC(cc);
    };

    initCC();

    // Add event listeners
    const loginWidget = document.querySelector('widget-cc-station-login');
    loginWidget.addEventListener('login', () => {
      console.log('Agent logged in');
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
    // Configure via JavaScript
    const userState = document.querySelector('widget-cc-user-state');
    userState.addEventListener('statechange', (event) => {
      updateUI(event.detail);
    });
  </script>
</body>
</html>
```

#### 2. React Application with Lazy Loading

```typescript
import React, { lazy, Suspense } from 'react';

// Lazy load widgets
const StationLogin = lazy(() => 
  import('@webex/cc-widgets').then(m => ({ default: m.StationLogin }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StationLogin profileMode={false} />
    </Suspense>
  );
}
```

#### 3. Micro-Frontend Architecture

```typescript
// Host application
import { StationLogin, UserState } from '@webex/cc-widgets';
import store from '@webex/cc-widgets';

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

#### 4. Custom Web Component Wrapper

```html
<!-- Create custom element with additional logic -->
<script type="module">
  import './cc-widgets/dist/wc.js';

  class CustomAgentPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.shadowRoot.innerHTML = `
        <style>
          .panel { border: 1px solid #ccc; padding: 1rem; }
        </style>
        <div class="panel">
          <h2>Agent Panel</h2>
          <widget-cc-station-login></widget-cc-station-login>
          <widget-cc-user-state></widget-cc-user-state>
        </div>
      `;
    }
  }

  customElements.define('custom-agent-panel', CustomAgentPanel);
</script>

<custom-agent-panel></custom-agent-panel>
```

### Integration Patterns

#### Initializing Store Before Widget Use

```typescript
import { store } from '@webex/cc-widgets';
import { ContactCenter } from '@webex/contact-center';

async function initialize() {
  // 1. Initialize SDK
  const cc = await ContactCenter.init({
    token: localStorage.getItem('authToken'),
    region: 'us1'
  });

  // 2. Set SDK instance in store
  store.setCC(cc);

  // 3. Configure logger (optional)
  store.setLogger({
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  });

  // 4. Now widgets are ready to use
  renderWidgets();
}
```

#### Event Handling with Web Components

```javascript
// Get references to Web Components
const stationLogin = document.querySelector('widget-cc-station-login');
const userState = document.querySelector('widget-cc-user-state');
const taskList = document.querySelector('widget-cc-task-list');

// Add event listeners
stationLogin.addEventListener('login', () => {
  console.log('Login successful');
  showAgentDashboard();
});

stationLogin.addEventListener('logout', () => {
  console.log('Logout successful');
  showLoginScreen();
});

userState.addEventListener('statechange', (event) => {
  console.log('Agent state changed:', event.detail);
  updateStatusIndicator(event.detail);
});

taskList.addEventListener('taskselected', (event) => {
  console.log('Task selected:', event.detail);
  loadTaskDetails(event.detail.taskId);
});
```

#### Using with Module Bundlers

```typescript
// webpack.config.js - External dependencies
module.exports = {
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    '@webex/cc-widgets': 'ccWidgets'
  }
};

// In your app
import { StationLogin } from '@webex/cc-widgets';
// Bundler won't include @webex/cc-widgets in bundle
```

---

## Dependencies

**Note:** For exact versions, see [package.json](../package.json)

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@r2wc/react-to-web-component` | React to Web Component conversion |
| `@webex/cc-station-login` | Station Login widget |
| `@webex/cc-user-state` | User State widget |
| `@webex/cc-task` | Task widgets (TaskList, IncomingTask, CallControl, etc.) |
| `@webex/cc-store` | MobX singleton store |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
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
  StationLogin,      // Agent station login
  UserState,         // Agent state management
  IncomingTask,      // Incoming task notifications
  TaskList,          // Active tasks list
  CallControl,       // Call control buttons
  CallControlCAD,    // CAD-enabled call control
  OutdialCall,       // Outbound dialing
  store              // MobX store singleton
} from '@webex/cc-widgets';
```

### Web Component Names

| React Component | Web Component Tag | Purpose |
|----------------|-------------------|---------|
| `StationLogin` | `<widget-cc-station-login>` | Agent login/logout |
| `UserState` | `<widget-cc-user-state>` | Agent state selector |
| `IncomingTask` | `<widget-cc-incoming-task>` | Incoming task notification |
| `TaskList` | `<widget-cc-task-list>` | Active tasks list |
| `CallControl` | `<widget-cc-call-control>` | Standard call controls |
| `CallControlCAD` | `<widget-cc-call-control-cad>` | CAD-enabled controls |
| `OutdialCall` | `<widget-cc-outdial-call>` | Outbound dialing UI |

---

## Installation

```bash
# Install the widgets bundle
yarn add @webex/cc-widgets

# If using React components, you need React (peer dependency)
yarn add react react-dom @momentum-ui/react-collaboration

# If using Web Components only, no additional dependencies needed
```

---

## Build Outputs

The package produces two bundles:

### 1. React Bundle (`dist/index.js`)

```typescript
// Used with: import { StationLogin } from '@webex/cc-widgets'
// Contains: Re-exports of React widgets + store
// Size: Small (just re-exports, no bundled code)
```

### 2. Web Components Bundle (`dist/wc.js`)

```typescript
// Used with: <script src="dist/wc.js"></script>
// Contains: All widgets + React + dependencies bundled
// Size: Large (self-contained bundle)
// Includes: r2wc wrappers + custom element registration
```

---

## Additional Resources

For detailed architecture, r2wc integration patterns, and troubleshooting, see [architecture.md](./architecture.md).

---

_Last Updated: 2025-11-26_

