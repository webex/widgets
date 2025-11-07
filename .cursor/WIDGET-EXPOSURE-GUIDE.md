# Widget Exposure & Testing Guide

## Overview

This guide explains the **CRITICAL** process of exposing widgets through the `@webex/cc-widgets` package and testing them in the sample app.

## 🚨 Why This Matters

1. **Consumers** install ONLY `@webex/cc-widgets` - not individual widget packages
2. **cc-widgets** is the single entry point that re-exports all widgets
3. **Sample app** is the mandatory testing ground before publishing
4. **Both React AND Web Components** must be exposed

## The Widget Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Create Widget in Individual Package                 │
│ @webex/cc-my-widget/src/my-widget.tsx                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Export from Widget Package                          │
│ @webex/cc-my-widget/src/index.ts                            │
│ export { MyWidget }                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3A: Re-Export in cc-widgets (React)                    │
│ @webex/cc-widgets/src/index.ts                              │
│ import { MyWidget } from '@webex/cc-my-widget'              │
│ export { MyWidget }                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│ Step 3B: Wrap as Web Component                              │
│ @webex/cc-widgets/src/wc.ts                                 │
│ const WebMyWidget = r2wc(MyWidget, { props: {...} })        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Build cc-widgets Package                            │
│ yarn workspace @webex/cc-widgets run build:src              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Test in Sample React App                            │
│ widgets-samples/cc/samples-cc-react-app/src/App.tsx         │
│ import { MyWidget } from '@webex/cc-widgets'                │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step: Exposing a Widget

### 1. Create Your Widget Package

```bash
cd packages/contact-center
mkdir my-widget
cd my-widget
```

Create basic structure:

```
my-widget/
├── src/
│   ├── my-widget.tsx
│   ├── my-widget.types.ts
│   ├── my-widget.utils.ts
│   ├── my-widget.style.scss
│   └── index.ts
├── package.json
├── webpack.config.js
└── tsconfig.json
```

### 2. Implement Widget

```typescript
// my-widget/src/my-widget.tsx
import React from 'react';
import { withMetrics } from '@webex/cc-ui-logging';
import { MyWidgetProps } from './my-widget.types';
import './my-widget.style.scss';

const MyWidgetComponent: React.FC<MyWidgetProps> = (props) => {
  const { title, onAction, logger } = props;

  return (
    <div className="my-widget">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};

export const MyWidget = withMetrics(MyWidgetComponent);
```

```typescript
// my-widget/src/my-widget.types.ts
import {ILogger} from '@webex/cc-store';

export interface MyWidgetProps {
  title: string;
  onAction?: () => void;
  logger?: ILogger;
}
```

```typescript
// my-widget/src/index.ts
export {MyWidget} from './my-widget';
export type {MyWidgetProps} from './my-widget.types';
```

### 3. Build Widget Package

```bash
yarn workspace @webex/cc-my-widget run build:src
```

### 4. Expose Through cc-widgets (CRITICAL!)

#### 4A: Add React Component Export

```typescript
// packages/contact-center/cc-widgets/src/index.ts
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';
import {IncomingTask, TaskList, CallControl, CallControlCAD, OutdialCall} from '@webex/cc-task';
import {MyWidget} from '@webex/cc-my-widget'; // ← ADD THIS
import store from '@webex/cc-store';
import '@momentum-ui/core/css/momentum-ui.min.css';

export {
  StationLogin,
  UserState,
  IncomingTask,
  CallControl,
  CallControlCAD,
  TaskList,
  OutdialCall,
  MyWidget, // ← ADD THIS
  store,
};
```

#### 4B: Add Web Component

```typescript
// packages/contact-center/cc-widgets/src/wc.ts
import r2wc from '@r2wc/react-to-web-component';
import {MyWidget} from '@webex/cc-my-widget'; // ← ADD THIS

// Wrap React component
const WebMyWidget = r2wc(MyWidget, {
  props: {
    title: 'string',
    onAction: 'function',
  },
});

// Add to components array
const components = [
  {name: 'widget-cc-user-state', component: WebUserState},
  {name: 'widget-cc-station-login', component: WebStationLogin},
  {name: 'widget-cc-incoming-task', component: WebIncomingTask},
  {name: 'widget-cc-task-list', component: WebTaskList},
  {name: 'widget-cc-call-control', component: WebCallControl},
  {name: 'widget-cc-outdial-call', component: WebOutdialCall},
  {name: 'widget-cc-call-control-cad', component: WebCallControlCAD},
  {name: 'widget-cc-my-widget', component: WebMyWidget}, // ← ADD THIS
];

// Auto-register all web components
components.forEach(({name, component}) => {
  if (!customElements.get(name)) {
    customElements.define(name, component);
  }
});

export {store};
```

**Prop Type Mapping**:

- `'string'` - String values
- `'number'` - Number values
- `'boolean'` - Boolean values
- `'json'` - Objects and arrays (serialized as JSON)
- `'function'` - Callback functions

### 5. Build cc-widgets Package

```bash
yarn workspace @webex/cc-widgets run build:src
```

This step is **CRITICAL** - consumers get widgets from the built `cc-widgets` package!

## Step-by-Step: Testing in Sample App

### 1. Import Widget in Sample App

```typescript
// widgets-samples/cc/samples-cc-react-app/src/App.tsx
import {
  StationLogin,
  UserState,
  IncomingTask,
  TaskList,
  CallControl,
  CallControlCAD,
  store,
  OutdialCall,
  MyWidget, // ← ADD THIS (import from cc-widgets!)
} from '@webex/cc-widgets';
```

### 2. Add Widget Toggle

```typescript
// Add to defaultWidgets object
const defaultWidgets = {
  stationLogin: true,
  userState: true,
  incomingTask: true,
  taskList: true,
  callControl: true,
  callControlCAD: true,
  outdialCall: true,
  myWidget: true, // ← ADD THIS
};
```

### 3. Add Widget Toggle Checkbox

```typescript
// In the App component render, add checkbox in sidebar
<div className="widget-controls">
  {/* ... existing checkboxes ... */}

  <Checkbox
    checked={selectedWidgets.myWidget}
    onChange={(e) => handleWidgetToggle('myWidget', e.target.checked)}
  >
    My Widget
  </Checkbox>
</div>
```

### 4. Render Widget

```typescript
// In the main content area
<ThemeProvider theme={currentTheme}>
  <IconProvider>
    {/* ... other widgets ... */}

    {selectedWidgets.myWidget && (
      <div className="widget-container">
        <Text type="header">My Widget</Text>
        <MyWidget
          title="Test Widget"
          onAction={() => {
            console.log('Widget action triggered');
          }}
        />
      </div>
    )}
  </IconProvider>
</ThemeProvider>
```

### 5. Run and Test

```bash
# Start sample app
yarn samples:serve-react

# Open http://localhost:3000
```

**Testing Checklist**:

- ✅ Widget appears when checkbox is enabled
- ✅ Widget disappears when checkbox is disabled
- ✅ All widget functionality works
- ✅ No console errors
- ✅ Props are passed correctly
- ✅ Store integration works (if applicable)
- ✅ Events/callbacks work
- ✅ Styling is correct
- ✅ Works in light and dark themes

## Web Component Testing (Optional)

```html
<!-- widgets-samples/cc/samples-cc-wc-app/index.html -->
<script src="../../cc-widgets/dist/wc.js"></script>

<widget-cc-my-widget title="Test Widget"></widget-cc-my-widget>
```

```bash
yarn samples:serve-wc
```

## Common Mistakes to Avoid

### ❌ Don't Do This:

1. **Importing directly from widget package in sample app**

   ```typescript
   // ❌ WRONG
   import {MyWidget} from '@webex/cc-my-widget';

   // ✅ CORRECT
   import {MyWidget} from '@webex/cc-widgets';
   ```

2. **Forgetting to build cc-widgets after changes**

   ```bash
   # ❌ WRONG - only building widget package
   yarn workspace @webex/cc-my-widget run build:src

   # ✅ CORRECT - also build cc-widgets
   yarn workspace @webex/cc-my-widget run build:src
   yarn workspace @webex/cc-widgets run build:src
   ```

3. **Not adding to both index.ts AND wc.ts**

   ```typescript
   // ❌ WRONG - only added to index.ts
   // Missing from wc.ts

   // ✅ CORRECT - added to BOTH files
   // index.ts: export { MyWidget }
   // wc.ts: const WebMyWidget = r2wc(MyWidget, {...})
   ```

4. **Not testing in sample app**

   ```bash
   # ❌ WRONG - pushing without testing
   git push

   # ✅ CORRECT - always test first
   yarn samples:serve-react
   # Verify widget works
   git push
   ```

## Build Order Reminder

When making changes to widgets:

```bash
# 1. Build store (if changed)
yarn workspace @webex/cc-store run build:src

# 2. Build ui-logging (if changed)
yarn workspace @webex/cc-ui-logging run build:src

# 3. Build components (if changed)
yarn workspace @webex/cc-components run build:src

# 4. Build your widget package
yarn workspace @webex/cc-my-widget run build:src

# 5. Build cc-widgets (CRITICAL!)
yarn workspace @webex/cc-widgets run build:src

# 6. Test in sample app
yarn samples:serve-react
```

## Publishing Flow

When widget is ready:

1. ✅ Widget built in its package
2. ✅ Exposed in cc-widgets (index.ts + wc.ts)
3. ✅ cc-widgets rebuilt
4. ✅ Tested in sample app (React)
5. ✅ Tested as web component (optional)
6. ✅ Unit tests added/passing
7. ✅ E2E tests added (if applicable)
8. ✅ Documentation updated
9. ✅ PR created and reviewed
10. ✅ Merged to main
11. ✅ Semantic release publishes to npm

## Quick Reference

### Adding New Widget Checklist

- [ ] Create widget package structure
- [ ] Implement widget component
- [ ] Export from widget package (`src/index.ts`)
- [ ] Build widget package
- [ ] Add to `cc-widgets/src/index.ts` (React export)
- [ ] Add to `cc-widgets/src/wc.ts` (Web Component)
- [ ] Build cc-widgets package
- [ ] Import in sample app from `@webex/cc-widgets`
- [ ] Add toggle to `defaultWidgets`
- [ ] Add checkbox UI
- [ ] Add render logic
- [ ] Test in `yarn samples:serve-react`
- [ ] Verify all functionality
- [ ] Add unit tests
- [ ] Add E2E tests (if needed)
- [ ] Create PR

## Help & Support

- **Build issues**: See `.cursor/troubleshooting.md`
- **Component patterns**: See `.cursor/component-patterns.md`
- **Development workflow**: See `.cursor/development-workflow.md`
- **Testing**: See `.cursor/unit-testing.md` and `.cursor/e2e-testing.md`

---

**Remember**: If consumers can't import it from `@webex/cc-widgets`, it doesn't exist! Always expose and test!
