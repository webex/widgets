# Web Component Patterns

> Quick reference for LLMs working with Web Components in this repository.

---

## Rules

- **MUST** use `r2wc` (React to Web Component) to wrap React widgets
- **MUST** register custom elements with `customElements.define()`
- **MUST** use kebab-case for custom element names (e.g., `cc-station-login`)
- **MUST** prefix all custom elements with `cc-`
- **MUST** define prop types in r2wc options
- **MUST** export Web Components from `cc-widgets` package only
- **NEVER** create Web Components directly - always wrap React components
- **NEVER** use camelCase for custom element names

---

## r2wc Wrapper Pattern

```typescript
// wc.ts in widget package
import r2wc from '@r2wc/react-to-web-component';
import { StationLogin } from './station-login';

export const StationLoginWC = r2wc(StationLogin, {
  props: {
    profileMode: 'string',
    onLogin: 'function',
    onLogout: 'function',
    onCCSignOut: 'function',
  },
});
```

---

## Custom Element Registration Pattern

```typescript
// cc-widgets/src/index.ts
import { StationLoginWC } from '@webex/cc-station-login/wc';
import { UserStateWC } from '@webex/cc-user-state/wc';

// Register custom elements
customElements.define('cc-station-login', StationLoginWC);
customElements.define('cc-user-state', UserStateWC);
customElements.define('cc-incoming-task', IncomingTaskWC);
customElements.define('cc-task-list', TaskListWC);
customElements.define('cc-call-control', CallControlWC);
```

---

## Prop Type Mapping

```typescript
// Map React prop types to r2wc types
const WidgetWC = r2wc(Widget, {
  props: {
    // String props
    profileMode: 'string',
    agentId: 'string',
    
    // Boolean props
    isEnabled: 'boolean',
    showHeader: 'boolean',
    
    // Number props
    timeout: 'number',
    maxRetries: 'number',
    
    // Function props (callbacks)
    onLogin: 'function',
    onLogout: 'function',
    onError: 'function',
    
    // Object/Array props (passed as JSON string)
    config: 'json',
    teams: 'json',
  },
});
```

---

## Widget Package wc.ts Structure

```typescript
// packages/contact-center/{widget}/src/wc.ts
import r2wc from '@r2wc/react-to-web-component';
import { WidgetName } from './{widget}';

export const WidgetNameWC = r2wc(WidgetName, {
  props: {
    // Define all props that should be exposed to Web Component
    prop1: 'string',
    prop2: 'boolean',
    onCallback: 'function',
  },
});
```

---

## HTML Usage Pattern

```html
<!-- Basic usage -->
<cc-station-login profile-mode="desktop"></cc-station-login>

<!-- With event handlers -->
<cc-user-state id="user-state"></cc-user-state>
  
  <script>
  const userState = document.getElementById('user-state');
  userState.addEventListener('stateChange', (event) => {
    console.log('State changed:', event.detail);
  });
  </script>
```

---

## JavaScript Usage Pattern

```javascript
// Create element programmatically
const stationLogin = document.createElement('cc-station-login');
stationLogin.setAttribute('profile-mode', 'desktop');

// Set callback props
stationLogin.onLogin = () => {
  console.log('Login successful');
};

stationLogin.onLogout = () => {
  console.log('Logged out');
};

// Append to DOM
document.getElementById('container').appendChild(stationLogin);
```

---

## Attribute Naming Convention

```typescript
// React prop → HTML attribute
profileMode    →  profile-mode
onStateChange  →  on-state-change (or handled via JS property)
isEnabled      →  is-enabled
maxRetries     →  max-retries
```

---

## cc-widgets Package Structure

```
packages/contact-center/cc-widgets/
├── src/
│   ├── index.ts          # Custom element registration
│   └── wc.ts             # Aggregated exports
├── package.json
└── tsconfig.json
```

---

## Full Widget to Web Component Flow

```
React Widget (packages/{widget}/src/{widget}/index.tsx)
         ↓
r2wc Wrapper (packages/{widget}/src/wc.ts)
         ↓
Custom Element Registration (packages/cc-widgets/src/index.ts)
         ↓
HTML Usage (<cc-widget-name></cc-widget-name>)
```

---

## Example: Complete Web Component Setup

### 1. Widget Package (station-login/src/wc.ts)
```typescript
import r2wc from '@r2wc/react-to-web-component';
import { StationLogin } from './station-login';

export const StationLoginWC = r2wc(StationLogin, {
  props: {
    profileMode: 'string',
    teamId: 'string',
    onLogin: 'function',
    onLogout: 'function',
    onCCSignOut: 'function',
    onSaveStart: 'function',
    onSaveEnd: 'function',
  },
});
```

### 2. CC-Widgets Registration (cc-widgets/src/index.ts)
```typescript
import { StationLoginWC } from '@webex/cc-station-login/wc';

customElements.define('cc-station-login', StationLoginWC);
```

### 3. HTML Usage
```html
<cc-station-login 
  profile-mode="desktop"
  team-id="team-123">
</cc-station-login>
```

---

## Related

- [React Patterns](./react-patterns.md)
- [TypeScript Patterns](./typescript-patterns.md)
