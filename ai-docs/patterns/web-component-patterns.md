# Web Component Patterns

---
Technology: Web Components (Custom Elements v1)
Configuration: See [cc-widgets/package.json](../../packages/contact-center/cc-widgets/package.json)
Dependencies: See [@r2wc package.json](../../packages/contact-center/cc-widgets/package.json) for version
Scope: Repository-wide
Last Updated: 2025-11-23
---

> **For LLM Agents**: Add this file to context when working on Web Components, r2wc wrappers, or custom element registration.
>
> **For Developers**: Update this file when committing Web Component pattern changes.

---

## Summary

The codebase uses **`@r2wc/react-to-web-component`** (version 2.0.3) to wrap React components as Web Components. There are **two levels** of Web Component exports:
1. **Widget-level** (`cc-widgets/wc.ts`) - Wraps widget components with minimal props (callbacks only)
2. **Component-level** (`cc-components/wc.ts`) - Wraps presentational components with full props

All Web Components are registered using `customElements.define()` with duplicate registration checks. The package exports both React components (`index.ts`) and Web Components (`wc.ts`) through package.json exports field.

---

## Package Structure

### **Dual Export Pattern**

**package.json exports:**
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./wc": {
      "import": "./dist/wc.js",
      "require": "./dist/wc.js",
      "types": "./dist/types/wc.d.ts"
    }
  }
}
```

**Usage:**
```typescript
// Import React components
import {StationLogin, UserState} from '@webex/cc-widgets';

// Import Web Components (auto-registered)
import '@webex/cc-widgets/wc';
// Now can use <widget-cc-user-state> in HTML
```

---

## r2wc Wrapper Pattern

### **1. Widget-Level Wrappers (cc-widgets)**

**Location:** `packages/contact-center/cc-widgets/src/wc.ts`

**Pattern:**
```typescript
import r2wc from '@r2wc/react-to-web-component';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import store from '@webex/cc-store';

// Wrap widget with minimal props (only callbacks)
const WebUserState = r2wc(UserState, {
  props: {
    onStateChange: 'function',
  },
});

const WebStationLogin = r2wc(StationLogin, {
  props: {
    onLogin: 'function',
    onLogout: 'function',
  },
});

const WebIncomingTask = r2wc(IncomingTask, {
  props: {
    incomingTask: 'json',
    onAccepted: 'function',
    onRejected: 'function',
  },
});

const WebTaskList = r2wc(TaskList, {
  props: {
    onTaskAccepted: 'function',
    onTaskDeclined: 'function',
    onTaskSelected: 'function',
  },
});

const WebCallControl = r2wc(CallControl, {
  props: {
    onHoldResume: 'function',
    onEnd: 'function',
    onWrapUp: 'function',
    onRecordingToggle: 'function',
  },
});

const WebOutdialCall = r2wc(OutdialCall, {});

// Register all components
const components = [
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-incoming-task', component: WebIncomingTask},
  {name: 'widget-cc-task-list', component: WebTaskList},
  {name: 'widget-cc-call-control', component: WebCallControl},
  {name: 'widget-cc-outdial-call', component: WebOutdialCall},
  {name: 'widget-cc-call-control-cad', component: WebCallControlCAD},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});

// Export store for external access
export {store};
```

**Key characteristics:**
- **Minimal props** - only user-facing callbacks and input data
- **Store access hidden** - widgets access store internally
- **Convention**: `widget-cc-<widget-name>` for custom element names
- **Batch registration** - loop through components array
- **Store export** - also exports store for external initialization

---

### **2. Component-Level Wrappers (cc-components)**

**Location:** `packages/contact-center/cc-components/src/wc.ts`

**Pattern:**
```typescript
import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';
import StationLoginComponent from './components/StationLogin/station-login';

// Wrap presentational component with full props
const WebUserState = r2wc(UserStateComponent, {
  props: {
    idleCodes: 'json',
    setAgentStatus: 'function',
    isSettingAgentStatus: 'boolean',
    elapsedTime: 'number',
    lastIdleStateChangeElapsedTime: 'number',
    currentState: 'string',
    customState: 'json',
    logger: 'function',
  },
});

if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}

const WebStationLogin = r2wc(StationLoginComponent, {
  props: {
    teams: 'json',
    loginOptions: 'json',
    login: 'function',
    logout: 'function',
    loginSuccess: 'json',
    loginFailure: 'json',
    logoutSuccess: 'json',
    setDeviceType: 'function',
    setDialNumber: 'function',
    setTeam: 'function',
    isAgentLoggedIn: 'boolean',
    handleContinue: 'function',
    deviceType: 'string',
    showMultipleLoginAlert: 'boolean',
    logger: 'function',
  },
});

if (!customElements.get('component-cc-station-login')) {
  customElements.define('component-cc-station-login', WebStationLogin);
}

// Shared props pattern
const commonPropsForCallControl: Record<string, 'string' | 'number' | 'boolean' | 'function' | 'json'> = {
  currentTask: 'json',
  audioRef: 'json',
  wrapupCodes: 'json',
  wrapupRequired: 'boolean',
  toggleHold: 'function',
  toggleRecording: 'function',
  endCall: 'function',
  wrapupCall: 'function',
  isHeld: 'boolean',
  setIsHeld: 'function',
  consultTransferOptions: 'json',
};

const WebCallControlCADComponent = r2wc(CallControlCADComponent, {
  props: commonPropsForCallControl,
});

const WebCallControl = r2wc(CallControlComponent, {
  props: commonPropsForCallControl,
});

if (!customElements.get('component-cc-call-control-cad')) {
  customElements.define('component-cc-call-control-cad', WebCallControlCADComponent);
}

if (!customElements.get('component-cc-call-control')) {
  customElements.define('component-cc-call-control', WebCallControl);
}
```

**Key characteristics:**
- **Full props** - all component props exposed
- **Shared props** - common props extracted to constants
- **Convention**: `component-cc-<component-name>` for custom element names
- **Individual registration** - each component registered separately
- **Duplicate check** - `if (!customElements.get(name))` before defining

---

## r2wc Type Mapping

### **Supported Prop Types**

| r2wc Type | TypeScript Type | Usage |
|-----------|-----------------|-------|
| `'string'` | `string` | Simple strings, IDs, names |
| `'number'` | `number` | Counts, timestamps, durations |
| `'boolean'` | `boolean` | Flags, states |
| `'function'` | `(...args: any[]) => any` | Callbacks, handlers, loggers |
| `'json'` | `object`, `array`, complex types | Objects, arrays, structured data |

**Examples:**
```typescript
const WebComponent = r2wc(ReactComponent, {
  props: {
    // Primitives
    deviceType: 'string',
    elapsedTime: 'number',
    isAgentLoggedIn: 'boolean',
    
    // Functions
    onStateChange: 'function',
    setAgentStatus: 'function',
    logger: 'function',
    
    // Complex types
    teams: 'json',           // Team[]
    idleCodes: 'json',       // IdleCode[]
    currentTask: 'json',     // ITask
    loginFailure: 'json',    // Error
    customState: 'json',     // ICustomState
  },
});
```

---

## Custom Element Registration

### **Pattern 1: Batch Registration (cc-widgets)**

```typescript
const components = [
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-incoming-task', component: WebIncomingTask},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});
```

**Benefits:**
- Easy to add new components
- Consistent registration logic
- Prevents duplicates automatically

---

### **Pattern 2: Individual Registration (cc-components)**

```typescript
if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}
```

**Benefits:**
- Explicit control per component
- Clear which components are registered
- Easy to debug registration issues

---

## Naming Conventions

### **Custom Element Names**

**Widget level:**
- **Pattern:** `widget-cc-<widget-name>`
- **Examples:**
  - `widget-cc-user-state`
  - `widget-cc-station-login`
  - `widget-cc-incoming-task`
  - `widget-cc-task-list`
  - `widget-cc-call-control`
  - `widget-cc-call-control-cad`
  - `widget-cc-outdial-call`

**Component level:**
- **Pattern:** `component-cc-<component-name>`
- **Examples:**
  - `component-cc-user-state`
  - `component-cc-station-login`
  - `component-cc-incoming-task`
  - `component-cc-task-list`
  - `component-cc-call-control`
  - `component-cc-call-control-cad`
  - `component-cc-out-dial-call`

**Naming rules:**
- All lowercase
- Words separated by hyphens
- Must contain a hyphen (Web Component standard)
- Prefix indicates layer (`widget-cc-` vs `component-cc-`)

---

## Usage Patterns

### **HTML Usage**

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import '@webex/cc-widgets/wc';
    import {store} from '@webex/cc-widgets/wc';
    
    // Initialize store
    await store.init({
      access_token: 'YOUR_TOKEN',
      webexConfig: {...}
    });
  </script>
</head>
<body>
  <!-- Use widgets as HTML elements -->
  <widget-cc-user-state></widget-cc-user-state>
  <widget-cc-station-login></widget-cc-station-login>
  <widget-cc-task-list></widget-cc-task-list>
  <widget-cc-incoming-task></widget-cc-incoming-task>
  <widget-cc-call-control></widget-cc-call-control>
  
  <script>
    // Set properties
    const userState = document.querySelector('widget-cc-user-state');
    userState.onStateChange = (state) => {
      console.log('State changed:', state);
    };
    
    const stationLogin = document.querySelector('widget-cc-station-login');
    stationLogin.onLogin = () => {
      console.log('Agent logged in');
    };
  </script>
</body>
</html>
```

---

### **React Component Import**

```typescript
// Import React components (not Web Components)
import {StationLogin, UserState, store} from '@webex/cc-widgets';

function App() {
  useEffect(() => {
    store.init({
      access_token: 'YOUR_TOKEN',
      webexConfig: {...}
    });
  }, []);

  return (
    <div>
      <UserState onStateChange={(state) => console.log(state)} />
      <StationLogin onLogin={() => console.log('Logged in')} />
    </div>
  );
}
```

---

## Store Initialization Pattern

### **Store Export**

```typescript
// cc-widgets/src/wc.ts
import store from '@webex/cc-store';

// ... component registrations ...

export {store};  // Export store for external init
```

**Usage:**
```typescript
import {store} from '@webex/cc-widgets/wc';

// Initialize store before using widgets
await store.init({
  access_token: 'token',
  webexConfig: {...}
});

// Or with existing webex instance
await store.init({
  webex: {
    cc: ccSDK,
    logger: logger
  }
});
```

---

## React Component Export

### **Component-Only Export**

```typescript
// cc-widgets/src/index.ts
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import {IncomingTask, TaskList, CallControl, CallControlCAD, OutdialCall} from '@webex/cc-task';
import store from '@webex/cc-store';
import '@momentum-ui/core/css/momentum-ui.min.css';

export {StationLogin, UserState, IncomingTask, CallControl, CallControlCAD, TaskList, OutdialCall, store};
```

**Purpose:**
- React consumers import from `@webex/cc-widgets` (not `/wc`)
- Gets React components, not Web Components
- Also exports store for initialization
- Includes momentum UI styles

---

## Key Conventions to Enforce

### ✅ DO:
1. **Use r2wc version 2.0.3** for consistent behavior
2. **Check for duplicate registrations** with `customElements.get(name)`
3. **Use descriptive names** with `widget-cc-` or `component-cc-` prefix
4. **Map all component props** in r2wc config
5. **Use `'json'` type** for complex objects/arrays
6. **Use `'function'` type** for all callbacks
7. **Export store** from `wc.ts` for external initialization
8. **Batch register** widgets in cc-widgets (loop pattern)
9. **Individual register** components in cc-components (explicit pattern)
10. **Include both exports** in package.json (`.` and `./wc`)

### ❌ DON'T:
1. **Don't skip duplicate checks** - may cause runtime errors
2. **Don't use uppercase** in custom element names
3. **Don't omit hyphens** in custom element names (required by spec)
4. **Don't forget prop mappings** - unmapped props won't work
5. **Don't use wrong type** - `'json'` for objects, `'function'` for callbacks
6. **Don't mix React and WC imports** - choose one per consumer
7. **Don't forget store initialization** - widgets won't work without it
8. **Don't register twice** - causes "already defined" errors

---

## Anti-Patterns Found

### 1. **Empty props object**
```typescript
const WebOutdialCall = r2wc(OutdialCall, {});
```

**Issue:** Component has no props to configure.  
**Recommendation:** If component truly has no props, document why. Otherwise, expose necessary props.

---

### 2. **Type assertion for commonProps**
```typescript
const commonPropsForCallControl: Record<string, 'string' | 'number' | 'boolean' | 'function' | 'json'> = {
  currentTask: 'json',
  // ...
};
```

**Recommendation:** This is actually a good pattern for shared props. Could extract to a type helper.

---

## Examples to Reference

### Example 1: Widget-Level Web Component
```typescript
import r2wc from '@r2wc/react-to-web-component';
import {UserState} from '@webex/cc-user-state';

const WebUserState = r2wc(UserState, {
  props: {
    onStateChange: 'function',
  },
});

if (!customElements.get('widget-cc-user-state')) {
  customElements.define('widget-cc-user-state', WebUserState);
}
```

### Example 2: Component-Level Web Component
```typescript
import r2wc from '@r2wc/react-to-web-component';
import UserStateComponent from './components/UserState/user-state';

const WebUserState = r2wc(UserStateComponent, {
  props: {
    idleCodes: 'json',
    setAgentStatus: 'function',
    isSettingAgentStatus: 'boolean',
    elapsedTime: 'number',
    currentState: 'string',
    customState: 'json',
    logger: 'function',
  },
});

if (!customElements.get('component-cc-user-state')) {
  customElements.define('component-cc-user-state', WebUserState);
}
```

### Example 3: Shared Props Pattern
```typescript
const commonPropsForCallControl: Record<string, 'string' | 'number' | 'boolean' | 'function' | 'json'> = {
  currentTask: 'json',
  audioRef: 'json',
  wrapupCodes: 'json',
  toggleHold: 'function',
  endCall: 'function',
  isHeld: 'boolean',
};

const WebCallControl = r2wc(CallControlComponent, {
  props: commonPropsForCallControl,
});

const WebCallControlCAD = r2wc(CallControlCADComponent, {
  props: commonPropsForCallControl,
});
```

### Example 4: Batch Registration
```typescript
const components = [
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-task-list', component: WebTaskList},
];

components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});
```

---

## Files Analyzed

1. `/packages/contact-center/cc-widgets/src/wc.ts` (75 lines)
2. `/packages/contact-center/cc-widgets/src/index.ts` (8 lines)
3. `/packages/contact-center/cc-components/src/wc.ts` (109 lines)
4. `/packages/contact-center/cc-widgets/package.json` (100 lines)

---

## Usage in Documentation

This pattern is referenced by:
- [`ARCHITECTURE.md`](../ARCHITECTURE.md#web-components) - Web Component architecture
- [`DEVELOPMENT.md`](../DEVELOPMENT.md#web-component-standards) - Development standards
- [`.cursorrules`](../../.cursorrules) - AI code generation constraints

## Related Documentation

- [React Patterns](./react-patterns.md) - React component patterns
- [TypeScript Patterns](./typescript-patterns.md) - Prop type definitions
- [Testing Patterns](./testing-patterns.md) - Web Component testing

## See Also

- [r2wc Wrapper Pattern](./patterns/r2wc-wrapper.md)
- [Custom Element Registration](./patterns/custom-element-registration.md)
- [Prop Type Mapping](./patterns/prop-type-mapping.md)

## Diagrams

![Web Components](./diagrams/web-components.svg)

