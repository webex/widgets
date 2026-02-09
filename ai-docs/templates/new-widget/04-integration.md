# Integration Module

## Overview

This module guides you through integrating the new widget into:
1. cc-widgets package (React + Web Component exports)
2. React sample application
3. Web Component sample application

**Purpose:** Make widget available for consumption

**Prerequisites:** Widget code generated

---

## Step 1: Update cc-widgets React Export

**File:** `packages/contact-center/cc-widgets/src/index.ts`

### 1.1 Add Import

```typescript
// ... existing imports ...

// NEW: Add widget import
import { {WidgetName} } from '@webex/cc-{widget-name}';
```

### 1.2 Add to Exports

```typescript
// ... existing exports ...

// NEW: Export widget
export { {WidgetName} };
```

**Complete example:**
```typescript
// Station Login
import { StationLogin } from '@webex/cc-station-login';

// User State
import { UserState } from '@webex/cc-user-state';

// NEW: {Widget Display Name}
import { {WidgetName} } from '@webex/cc-{widget-name}';

// Exports
export {
  StationLogin,
  UserState,
  {WidgetName}, // NEW
};
```

---

## Step 2: Update cc-widgets Web Component Export

**File:** `packages/contact-center/cc-widgets/src/wc.ts`

### 2.1 Add Import

```typescript
// ... existing imports ...

// NEW: Import from wc.ts (NOT index.ts - to avoid metrics wrapper)
import { {WidgetName} } from '@webex/cc-{widget-name}/dist/wc';
```

### 2.2 Create r2wc Wrapper

Map React props to Web Component attributes:

```typescript
// NEW: Create Web Component wrapper
const Web{WidgetName} = r2wc({WidgetName}, {
  props: {
    // String props
    stringProp: 'string',
    
    // Number props
    numberProp: 'number',
    
    // Boolean props
    booleanProp: 'boolean',
    
    // Object/Array props (use 'json')
    configObject: 'json',
    arrayProp: 'json',
    
    // Function props (callbacks)
    onSomeEvent: 'function',
    onError: 'function',
  },
});
```

**Prop type mapping:**

| React Prop Type | r2wc Type | Example |
|-----------------|-----------|---------|
| `string` | `'string'` | `name: 'string'` |
| `number` | `'number'` | `count: 'number'` |
| `boolean` | `'boolean'` | `enabled: 'boolean'` |
| `object` / `interface` | `'json'` | `config: 'json'` |
| `array` | `'json'` | `items: 'json'` |
| `function` / `callback` | `'function'` | `onClick: 'function'` |

### 2.3 Register Custom Element

```typescript
const components = [
  // ... existing components ...
  
  // NEW: Add widget to components array
  { name: 'widget-cc-{widget-name}', component: Web{WidgetName} },
];
```

**Complete example:**
```typescript
import r2wc from '@r2wc/react-to-web-component';

// Import widgets (from wc.ts exports)
import { StationLogin } from '@webex/cc-station-login/dist/wc';
import { UserState } from '@webex/cc-user-state/dist/wc';
// NEW
import { {WidgetName} } from '@webex/cc-{widget-name}/dist/wc';

// Create Web Components
const WebStationLogin = r2wc(StationLogin, {
  props: {
    desktop: 'json',
    dialNumber: 'string',
    teamId: 'string',
    onStationLogin: 'function',
    onError: 'function',
  },
});

const WebUserState = r2wc(UserState, {
  props: {
    idleCodes: 'json',
    stateInfo: 'json',
    onUserStateChange: 'function',
    onError: 'function',
  },
});

// NEW: {Widget Display Name}
const Web{WidgetName} = r2wc({WidgetName}, {
  props: {
    requiredProp: 'string',
    optionalConfig: 'json',
    onSomeEvent: 'function',
    onError: 'function',
  },
});

// Register all components
const components = [
  { name: 'widget-cc-station-login', component: WebStationLogin },
  { name: 'widget-cc-user-state', component: WebUserState },
  { name: 'widget-cc-{widget-name}', component: Web{WidgetName} }, // NEW
];

// Register with window.customElements
components.forEach(({ name, component }) => {
  if (!window.customElements.get(name)) {
    window.customElements.define(name, component);
  }
});
```

---

## Step 3: Update React Sample App

**File:** `widgets-samples/cc/samples-cc-react-app/src/App.tsx`

### 3.1 Add Import

```typescript
import {
  StationLogin,
  UserState,
  {WidgetName}, // NEW
} from '@webex/cc-widgets';
```

### 3.2 Add Widget Toggle State

In the `defaultWidgets` object:

```typescript
const defaultWidgets = {
  stationLogin: false,
  userState: false,
  {widgetName}: false, // NEW: camelCase name
};
```

### 3.3 Add Callback Handlers

```typescript
// NEW: {Widget Display Name} callbacks
const onSomeEvent = (data) => {
  console.log('{WidgetName} event:', data);
  // Handle event
};

const on{WidgetName}Error = (error) => {
  console.error('{WidgetName} error:', error);
  // Handle error
};
```

### 3.4 Add Widget Checkbox

In the widget selector section:

```jsx
<div className="widget-selector">
  <h3>Select Widgets to Display</h3>
  
  {/* Existing widgets */}
  <label>
    <input
      type="checkbox"
      checked={selectedWidgets.stationLogin}
      onChange={(e) => handleWidgetToggle('stationLogin', e.target.checked)}
    />
    Station Login
  </label>

  {/* NEW: Add checkbox */}
  <label>
    <input
      type="checkbox"
      checked={selectedWidgets.{widgetName}}
      onChange={(e) => handleWidgetToggle('{widgetName}', e.target.checked)}
    />
    {Widget Display Name}
  </label>
</div>
```

### 3.5 Add Widget Rendering

```jsx
{/* NEW: {Widget Display Name} Widget */}
{selectedWidgets.{widgetName} && (
  <div className="box">
    <section className="section-box">
      <fieldset className="fieldset">
        <legend className="legend-box">{Widget Display Name}</legend>
        
        <{WidgetName}
          requiredProp="value"
          optionalConfig={{ key: 'value' }}
          onSomeEvent={onSomeEvent}
          onError={on{WidgetName}Error}
        />
      </fieldset>
    </section>
  </div>
)}
```

**Complete example section:**
```jsx
return (
  <div className="App">
    {/* Widget Selector */}
    <div className="widget-selector">
      <label>
        <input
          type="checkbox"
          checked={selectedWidgets.stationLogin}
          onChange={(e) => handleWidgetToggle('stationLogin', e.target.checked)}
        />
        Station Login
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={selectedWidgets.{widgetName}}
          onChange={(e) => handleWidgetToggle('{widgetName}', e.target.checked)}
        />
        {Widget Display Name}
      </label>
    </div>

    {/* Widgets */}
    {selectedWidgets.stationLogin && (
      <div className="box">
        <StationLogin {...stationLoginProps} />
      </div>
    )}

    {selectedWidgets.{widgetName} && (
      <div className="box">
        <section className="section-box">
          <fieldset className="fieldset">
            <legend className="legend-box">{Widget Display Name}</legend>
            
            <{WidgetName}
              requiredProp="test-value"
              optionalConfig={{ option1: 'value', option2: 10 }}
              onSomeEvent={onSomeEvent}
              onError={on{WidgetName}Error}
            />
          </fieldset>
        </section>
      </div>
    )}
  </div>
);
```

---

## Step 4: Update Web Component Sample App

**File:** `widgets-samples/cc/samples-cc-wc-app/app.js`

### 4.1 Create Element Reference

```javascript
// Widget references
let stationLoginWidget = null;
let userStateWidget = null;
let {widgetName}Widget = null; // NEW: camelCase name
```

### 4.2 Add Widget Toggle Checkbox

In the HTML section:

```javascript
const widgetSelectors = `
  <div class="widget-selector">
    <h3>Select Widgets to Display</h3>
    
    <label>
      <input type="checkbox" id="toggle-station-login" />
      Station Login
    </label>
    
    <!-- NEW: Add checkbox -->
    <label>
      <input type="checkbox" id="toggle-{widget-name}" />
      {Widget Display Name}
    </label>
  </div>
`;
```

### 4.3 Add Widget Creation Function

```javascript
/**
 * Create {Widget Display Name} widget
 */
function create{WidgetName}Widget() {
  // Create element
  {widgetName}Widget = document.createElement('widget-cc-{widget-name}');
  
  // Set properties
  {widgetName}Widget.requiredProp = 'test-value';
  {widgetName}Widget.optionalConfig = {
    option1: 'value',
    option2: 10
  };
  
  // Add event listeners
  {widgetName}Widget.addEventListener('someEvent', (event) => {
    console.log('{WidgetName} event:', event.detail);
    // Handle event
  });
  
  {widgetName}Widget.addEventListener('error', (event) => {
    console.error('{WidgetName} error:', event.detail);
    // Handle error
  });
  
  // Append to container
  const container = document.getElementById('widgets-container');
  const wrapper = document.createElement('div');
  wrapper.className = 'widget-box';
  wrapper.id = '{widget-name}-container';
  
  const legend = document.createElement('h3');
  legend.textContent = '{Widget Display Name}';
  wrapper.appendChild(legend);
  
  wrapper.appendChild({widgetName}Widget);
  container.appendChild(wrapper);
  
  console.log('{WidgetName} widget created');
}

/**
 * Remove {Widget Display Name} widget
 */
function remove{WidgetName}Widget() {
  if ({widgetName}Widget) {
    const container = document.getElementById('{widget-name}-container');
    if (container) {
      container.remove();
    }
    {widgetName}Widget = null;
    console.log('{WidgetName} widget removed');
  }
}
```

### 4.4 Add Toggle Handler

```javascript
// Add event listener for toggle
document.getElementById('toggle-{widget-name}')?.addEventListener('change', (event) => {
  if (event.target.checked) {
    create{WidgetName}Widget();
  } else {
    remove{WidgetName}Widget();
  }
});
```

**Complete example:**
```javascript
// Widget references
let stationLoginWidget = null;
let {widgetName}Widget = null;

// Initialize function
function initializeApp() {
  // Setup widget toggles
  document.getElementById('toggle-station-login')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      createStationLoginWidget();
    } else {
      removeStationLoginWidget();
    }
  });

  // NEW: {Widget Display Name} toggle
  document.getElementById('toggle-{widget-name}')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      create{WidgetName}Widget();
    } else {
      remove{WidgetName}Widget();
    }
  });
}

// NEW: Widget functions
function create{WidgetName}Widget() {
  {widgetName}Widget = document.createElement('widget-cc-{widget-name}');
  
  // Set props
  {widgetName}Widget.requiredProp = 'test-value';
  {widgetName}Widget.optionalConfig = { option1: 'value', option2: 10 };
  
  // Add listeners
  {widgetName}Widget.addEventListener('someEvent', (e) => {
    console.log('{WidgetName} event:', e.detail);
  });
  
  {widgetName}Widget.addEventListener('error', (e) => {
    console.error('{WidgetName} error:', e.detail);
  });
  
  // Append to DOM
  const container = document.getElementById('widgets-container');
  const wrapper = document.createElement('div');
  wrapper.className = 'widget-box';
  wrapper.id = '{widget-name}-container';
  
  const legend = document.createElement('h3');
  legend.textContent = '{Widget Display Name}';
  wrapper.appendChild(legend);
  wrapper.appendChild({widgetName}Widget);
  
  container.appendChild(wrapper);
}

function remove{WidgetName}Widget() {
  const container = document.getElementById('{widget-name}-container');
  if (container) container.remove();
  {widgetName}Widget = null;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeApp);
```

---

## Integration Checklist

Before proceeding, verify:

### cc-widgets Package
- [ ] Widget imported in src/index.ts
- [ ] Widget exported in src/index.ts
- [ ] Widget imported in src/wc.ts (from dist/wc, not dist/index)
- [ ] r2wc wrapper created with correct prop mappings
- [ ] Custom element registered in components array
- [ ] Element name follows pattern: `widget-cc-{widget-name}`

### React Sample App
- [ ] Widget imported from @webex/cc-widgets
- [ ] Widget toggle state added to defaultWidgets
- [ ] Callback handlers defined
- [ ] Checkbox added to widget selector
- [ ] Widget rendering added with conditional
- [ ] All required props passed
- [ ] Callbacks wired up correctly

### Web Component Sample App
- [ ] Widget reference variable created
- [ ] Checkbox added to HTML
- [ ] Create widget function implemented
- [ ] Remove widget function implemented
- [ ] Toggle event listener added
- [ ] Properties set correctly
- [ ] Event listeners attached
- [ ] Widget appended to DOM

### Testing
- [ ] Widget appears in both sample apps
- [ ] Toggling works (show/hide)
- [ ] Props passed correctly
- [ ] Callbacks fire correctly
- [ ] No console errors
- [ ] No console warnings

---

## Build & Test

### Build cc-widgets

```bash
# From project root
cd packages/contact-center/cc-widgets
yarn build
```

### Build Widget

```bash
# From project root
cd packages/contact-center/{widget-name}
yarn build
```

### Run React Sample

```bash
# From project root
cd widgets-samples/cc/samples-cc-react-app
yarn start
```

**Test:**
1. Check widget checkbox
2. Verify widget renders
3. Interact with widget
4. Verify callbacks fire
5. Uncheck widget
6. Verify widget removed

### Run Web Component Sample

```bash
# From project root
cd widgets-samples/cc/samples-cc-wc-app
# Open index.html in browser
```

**Test:**
1. Check widget checkbox
2. Verify widget renders
3. Interact with widget
4. Check console for events
5. Uncheck widget
6. Verify widget removed

---

## Common Issues

### Issue 1: Widget Not Appearing

**Symptoms:**
- Checkbox checked but widget doesn't render
- No errors in console

**Possible Causes:**
- Widget not exported from cc-widgets
- Import path incorrect
- Build not run

**Solutions:**
1. Verify exports in cc-widgets/src/index.ts
2. Rebuild cc-widgets: `yarn build`
3. Check import path in sample app
4. Check browser console for errors

---

### Issue 2: Props Not Passing

**Symptoms:**
- Widget renders but props undefined
- Default values used instead of passed values

**Possible Causes:**
- r2wc mapping incorrect
- Prop type mismatch
- Prop name typo

**Solutions:**
1. Check r2wc props mapping in wc.ts
2. Verify prop types (string, number, json, function)
3. Check prop names match exactly
4. For objects/arrays, use 'json' type

---

### Issue 3: Callbacks Not Firing

**Symptoms:**
- Interactions don't trigger callbacks
- Console shows no events

**Possible Causes:**
- Callback not passed
- r2wc function mapping missing
- Event listener not attached (WC)

**Solutions:**
1. Verify callback passed in React sample
2. Check r2wc maps callback as 'function'
3. Add addEventListener in WC sample
4. Check event name matches exactly

---

## Next Steps

**After integration complete:**
1. Go to: 05-test-generation.md
2. Then: ../documentation/create-agent-md.md
3. Then: ../documentation/create-architecture-md.md
4. Finally: 06-validation.md

---

_Template Version: 1.0.0_
_Last Updated: 2025-11-26_

