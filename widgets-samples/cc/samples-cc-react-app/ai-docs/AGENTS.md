# React Sample App - Widget Integration Guide

## Purpose

Demonstrates how to integrate Contact Center widgets into a React application. Use this as a reference when adding new widgets.

## Design System

- **Framework:** React 18.3.1 + TypeScript
- **UI Library:** Momentum Design System (`@momentum-design/components`)
- **State:** MobX store (`@webex/cc-store`)
- **Theme:** Dark/Light mode toggle (persisted in localStorage)
- **Layout:** CSS Grid with `.box`, `.section-box`, `.fieldset` structure

## Critical Integration Pattern

**Follow this exact pattern for ALL new widgets:**

### Step 1: Import the Widget

```tsx
import { NewWidget } from '@webex/cc-widgets';
```

**Add to imports section (lines 1-28)** with other widgets.

### Step 2: Add to defaultWidgets

```tsx
const defaultWidgets = {
  stationLogin: true,
  userState: true,
  // ... existing widgets
  newWidget: false,  // ← Add here (false by default for user opt-in)
};
```

**Location:** Line 33-42 in `App.tsx`

### Step 3: Add Checkbox for Widget Selection

```tsx
<Checkbox
  onChange={handleCheckboxChange}
  name="newWidget"
  checked={selectedWidgets.newWidget}
  htmlId="newWidget-checkbox"
>
  <Text>New Widget</Text>
</Checkbox>
```

**Location:** Widget selector section in render (around line 300-400)

### Step 4: Conditional Rendering with Standard Layout

```tsx
{selectedWidgets.newWidget && (
  <div className="box">
    <section className="section-box">
      <fieldset className="fieldset">
        <legend className="legend-box">New Widget</legend>
        <NewWidget
          onEvent={(data) => handleNewWidgetEvent(data)}
          onError={(error) => onError('NewWidget', error)}
        />
      </fieldset>
    </section>
  </div>
)}
```

**Location:** Main render section, grouped by widget category

### Step 5: Add Event Handlers (if needed)

```tsx
const handleNewWidgetEvent = (data) => {
  console.log('New widget event:', data);
  // Handle event logic
};
```

**Location:** With other event handlers in component

## Layout Structure Rules

### Container Hierarchy (ALWAYS use this)

```tsx
<div className="box">           {/* Outer container with background */}
  <section className="section-box">  {/* Inner section with padding */}
    <fieldset className="fieldset">  {/* Fieldset for grouping */}
      <legend className="legend-box">Title</legend>  {/* Title/legend */}
      <WidgetComponent />            {/* Actual widget */}
    </fieldset>
  </section>
</div>
```

### Why this structure?

- `box` - Consistent spacing and background
- `section-box` - Momentum Design padding
- `fieldset` - Semantic grouping
- `legend-box` - Styled title
- **Result:** Visual consistency across all widgets

## Styling Rules

### CSS Variables (MUST USE)

```scss
// Colors
var(--mds-color-theme-text-primary-normal)
var(--mds-color-theme-background-solid-primary-normal)
var(--mds-color-theme-background-primary-normal)

// Spacing
var(--mds-spacing-1)  // 0.25rem (4px)
var(--mds-spacing-2)  // 0.5rem (8px)
var(--mds-spacing-3)  // 1rem (16px)
var(--mds-spacing-4)  // 1.5rem (24px)

// Typography
var(--mds-font-size-body-small)
var(--mds-font-size-body-medium)
```

### ❌ NEVER Do This

```tsx
<div style={{color: '#FF0000'}}>  // Hardcoded color
<div style={{padding: '10px'}}>   // Hardcoded spacing
```

### ✅ ALWAYS Do This

```tsx
<div style={{
  color: 'var(--mds-color-theme-text-primary-normal)',
  padding: 'var(--mds-spacing-3)'
}}>
```

## Event Handling Pattern

### Standard onError Handler

```tsx
const onError = (source: string, error: Error) => {
  console.error(`${source} error:`, error);
  // Optional: Show toast notification
  setToast({ type: 'error' });
};
```

**EVERY widget MUST have onError callback.**

### Widget-Specific Events

```tsx
// IncomingTask
const onIncomingTaskCB = ({ task }) => {
  console.log('Incoming task:', task);
  setIncomingTasks(prev => [...prev, task]);
  playNotificationSound();  // Custom logic
};

// UserState
const onAgentStateChangedCB = (newState: AgentState, oldState: AgentState) => {
  console.log('State changed from', oldState, 'to', newState);
  setSelectedState(newState);
};

// CallControl
const onRecordingToggleCB = ({ isRecording, task }) => {
  console.log('Recording:', isRecording, 'for task:', task.data.interactionId);
};
```

## Theme Integration

Widgets automatically use MobX store theme:

```tsx
// Theme is managed by store.currentTheme
// Widget CSS uses CSS variables that respond to theme changes
// No manual theme passing needed
```

**User can toggle theme via UI dropdown** - widgets update automatically.

## State Management

### When to Use store Directly

```tsx
// Access store for global state
import { store } from '@webex/cc-widgets';

// Examples:
store.currentTask       // Current active task
store.taskList          // All tasks
store.incomingTask      // Incoming task
store.agentState        // Current agent state
```

### When to Use Local State

```tsx
// UI-only state (no widget dependency)
const [showPopup, setShowPopup] = useState(false);
const [selectedOption, setSelectedOption] = useState('');
```

## Complete Example: Adding a New Widget

```tsx
// 1. Import
import { NewAwesomeWidget } from '@webex/cc-widgets';

// 2. Add to defaultWidgets
const defaultWidgets = {
  // ... existing
  newAwesomeWidget: false,
};

// 3. Checkbox in widget selector
<Checkbox
  onChange={handleCheckboxChange}
  name="newAwesomeWidget"
  checked={selectedWidgets.newAwesomeWidget}
  htmlId="newAwesomeWidget-checkbox"
>
  <Text>New Awesome Widget</Text>
</Checkbox>

// 4. Event handler (if needed)
const handleAwesomeEvent = (data) => {
  console.log('Awesome event:', data);
};

// 5. Render with standard layout
{selectedWidgets.newAwesomeWidget && (
  <div className="box">
    <section className="section-box">
      <fieldset className="fieldset">
        <legend className="legend-box">New Awesome Widget</legend>
        <NewAwesomeWidget
          onAwesomeEvent={handleAwesomeEvent}
          onError={(error) => onError('NewAwesomeWidget', error)}
          customProp={someValue}
        />
      </fieldset>
    </section>
  </div>
)}
```

## Common Mistakes to AVOID

### ❌ Breaking CSS class structure

```tsx
// WRONG
<div>
  <NewWidget />
</div>
```

### ✅ Correct

```tsx
<div className="box">
  <section className="section-box">
    <fieldset className="fieldset">
      <legend className="legend-box">Widget Name</legend>
      <NewWidget />
    </fieldset>
  </section>
</div>
```

### ❌ Forgetting defaultWidgets entry

```tsx
// WRONG - Widget renders immediately, user can't disable
{selectedWidgets.newWidget && <NewWidget />}
// But newWidget not in defaultWidgets!
```

### ✅ Correct

```tsx
// In defaultWidgets
const defaultWidgets = {
  newWidget: false,  // ← MUST ADD HERE
};

// Then render
{selectedWidgets.newWidget && <NewWidget />}
```

### ❌ Missing error handler

```tsx
// WRONG
<NewWidget onEvent={handleEvent} />
```

### ✅ Correct

```tsx
<NewWidget
  onEvent={handleEvent}
  onError={(error) => onError('NewWidget', error)}
/>
```

### ❌ Hardcoding colors

```tsx
// WRONG
<div style={{backgroundColor: '#1a1a1a'}}>
```

### ✅ Correct

```tsx
<div style={{backgroundColor: 'var(--mds-color-theme-background-primary-normal)'}}>
```

## Testing Checklist

After adding a new widget:

- [ ] Widget imports without errors
- [ ] Appears in widget selector checkbox list
- [ ] Can be enabled/disabled via checkbox
- [ ] Selection persists in localStorage
- [ ] Renders with correct layout (box > section-box > fieldset)
- [ ] Has legend/title
- [ ] Uses Momentum CSS variables (no hardcoded colors)
- [ ] Event handlers fire correctly
- [ ] onError handler present and logs errors
- [ ] Works in both light and dark themes
- [ ] No console errors when enabled/disabled
- [ ] No visual/layout breaking when rendered alongside other widgets

## File Locations

- **Main App:** `src/App.tsx`
- **Styles:** `src/App.scss`
- **Widget Imports:** Line 1-28 in `App.tsx`
- **defaultWidgets:** Line 33-42 in `App.tsx`
- **Widget Selector:** Around line 300-400 in render method
- **Widget Render:** Main render section grouped by category

## Additional Resources

- [Momentum Design System Docs](https://momentum.design/)
- [MobX Store Package](../../packages/contact-center/store/ai-docs/agent.md)
- [cc-widgets Package](../../packages/contact-center/cc-widgets/ai-docs/agent.md)

