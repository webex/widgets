# IncomingTask Widget

## Overview

Displays incoming contact center tasks with accept/reject actions.

## Why This Widget?

**Problem:** Agents need to be notified of incoming tasks (calls, chats, emails) and respond quickly.

**Solution:** Displays incoming task details with countdown timer and accept/reject buttons.

## What It Does

- Shows incoming task notification
- Displays caller/contact information
- Shows queue and media type
- Countdown timer (RONA - Redirection On No Answer)
- Accept button to handle the task
- Reject button to decline the task
- Auto-hides after acceptance/rejection

## Usage

### React

```tsx
import { IncomingTask } from '@webex/cc-widgets';

function App() {
  return (
    <IncomingTask
      incomingTask={taskObject}
      onAccepted={({ task }) => console.log('Accepted:', task)}
      onRejected={({ task }) => console.log('Rejected:', task)}
    />
  );
}
```

### Web Component

```html
<widget-cc-incoming-task></widget-cc-incoming-task>

<script>
  const widget = document.querySelector('widget-cc-incoming-task');
  widget.incomingTask = taskObject;
  widget.onAccepted = ({ task }) => console.log('Accepted:', task);
  widget.onRejected = ({ task }) => console.log('Rejected:', task);
</script>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `incomingTask` | `ITask` | - | Incoming task object from store |
| `onAccepted` | `({ task: ITask }) => void` | - | Callback when task accepted |
| `onRejected` | `({ task: ITask }) => void` | - | Callback when task rejected/timed out |

## Examples

### With Callbacks

```tsx
<IncomingTask
  incomingTask={store.incomingTask}
  onAccepted={({ task }) => {
    console.log('Task accepted:', task.data.interactionId);
    // Navigate to task details
  }}
  onRejected={({ task }) => {
    console.log('Task rejected:', task.data.interactionId);
    // Show notification
  }}
/>
```

### Auto-managed (via Store)

```tsx
// Widget automatically subscribes to store.incomingTask
// No need to pass incomingTask prop if using store directly
<IncomingTask
  onAccepted={handleAccept}
  onRejected={handleReject}
/>
```

## Dependencies

```json
{
  "@webex/cc-components": "workspace:*",
  "@webex/cc-store": "workspace:*",
  "@webex/cc-ui-logging": "workspace:*",
  "mobx-react-lite": "^4.1.0",
  "react-error-boundary": "^6.0.0"
}
```

See [package.json](../../package.json) for versions.

## Additional Resources

- [Architecture Details](architecture.md) - Component internals, data flows, diagrams

