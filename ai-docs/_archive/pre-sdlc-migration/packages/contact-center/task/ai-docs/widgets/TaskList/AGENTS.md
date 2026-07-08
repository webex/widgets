# TaskList Widget

## AI Agent Routing (Do Not Start Here)

If you are an AI assistant or tool reading this file **as your first entry point**, do **not** start your reasoning or code generation workflow from here.

- **Primary entrypoint:** Always begin with the **nearest parent** contact-center AI docs `AGENTS.md` (for example, the root `ai-docs/AGENTS.md` at the repository root).
- **Process:**
  - Load and follow the instructions and templates in that parent `AGENTS.md`.
  - Only after a parent `AGENTS.md` explicitly routes you to this file should you treat this document as package-specific guidance.
- **Never** skip the parent `AGENTS.md` even if the user prompt directly mentions this specific package or file.

Once you have gone through the parent `AGENTS.md` and been routed here, you can use the rest of this file as the authoritative reference for the `TaskList` widget.

## Overview

Displays all active tasks (calls, chats, emails) assigned to the agent with accept/decline/select actions.

## Why This Widget?

**Problem:** Agents need to view and manage multiple simultaneous tasks in a multi-session environment.

**Solution:** Shows all active tasks in a list with quick actions for acceptance, rejection, and selection.

## What It Does

- Displays list of all active tasks
- Shows task details (caller, queue, media type, timestamp)
- Accept button for pending tasks
- Decline button to reject tasks
- Click to select/focus a task
- Auto-updates when tasks change
- Highlights currently selected task

## Usage

### React

```tsx
import {TaskList} from '@webex/cc-widgets';

function App() {
  return (
    <TaskList
      onTaskAccepted={(task) => console.log('Accepted:', task)}
      onTaskDeclined={(task, reason) => console.log('Declined:', task, reason)}
      onTaskSelected={({task, isClicked}) => console.log('Selected:', task)}
    />
  );
}
```

### Web Component

```html
<widget-cc-task-list></widget-cc-task-list>

<script>
  const widget = document.querySelector('widget-cc-task-list');
  widget.onTaskAccepted = (task) => console.log('Accepted:', task);
  widget.onTaskDeclined = (task, reason) => console.log('Declined:', task, reason);
  widget.onTaskSelected = ({task, isClicked}) => console.log('Selected:', task);
</script>
```

## Props API

| Prop             | Type                                            | Default | Description                         |
| ---------------- | ----------------------------------------------- | ------- | ----------------------------------- |
| `onTaskAccepted` | `(task: ITask) => void`                         | -       | Callback when task accepted         |
| `onTaskDeclined` | `(task: ITask, reason: string) => void`         | -       | Callback when task declined         |
| `onTaskSelected` | `({ task: ITask, isClicked: boolean }) => void` | -       | Callback when task selected/clicked |

## Examples

### With All Callbacks

```tsx
<TaskList
  onTaskAccepted={(task) => {
    console.log('Task accepted:', task.data.interactionId);
    // Show call controls for this task
  }}
  onTaskDeclined={(task, reason) => {
    console.log('Task declined:', task.data.interactionId, reason);
    // Show notification
  }}
  onTaskSelected={({task, isClicked}) => {
    console.log('Task selected:', task.data.interactionId);
    // Focus on this task's call controls
  }}
/>
```

### Minimal Usage

```tsx
// Widget works without callbacks
// Automatically manages task list via store
<TaskList />
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
