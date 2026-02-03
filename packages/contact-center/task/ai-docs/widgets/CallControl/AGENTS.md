# CallControl Widget

## AI Agent Routing (Do Not Start Here)

If you are an AI assistant or tool reading this file **as your first entry point**, do **not** start your reasoning or code generation workflow from here.

- **Primary entrypoint:** Always begin with the **nearest parent** contact-center AI docs `AGENTS.md` (for example, the root `ai-docs/AGENTS.md` at the repository root).
- **Process:**
  - Load and follow the instructions and templates in that parent `AGENTS.md`.
  - Only after a parent `AGENTS.md` explicitly routes you to this file should you treat this document as package-specific guidance.
- **Never** skip the parent `AGENTS.md` even if the user prompt directly mentions this specific package or file.

Once you have gone through the parent `AGENTS.md` and been routed here, you can use the rest of this file as the authoritative reference for the `CallControl` widget.

## Overview

Provides unified **interaction control** functionality (hold, mute, transfer, consult, conference, end, wrapup) for active tasks across **voice calls and digital channels**. Includes both standard and CAD (Customer Attached Data) variants.

## Why This Widget?

**Problem:** Agents need comprehensive control during active customer interactions (voice and digital).

**Solution:** Unified interface for all task/call operations with two variants:

- **CallControl:** Standard interaction controls (optimized for both telephony and digital tasks)
- **CallControlCAD:** Interaction controls + CAD panel for customer data

## What It Does

- Hold/Resume active **voice** task (telephony only)
- Mute/Unmute microphone (telephony only)
- Transfer task/call (to agent/queue/number; telephony only)
- Consult with agent before transfer (telephony only)
- Conference multiple parties (telephony only)
- Recording controls (pause/resume; telephony only)
- End task (call or digital interaction)
- Wrapup with codes for completed tasks
- Auto-wrapup timer for tasks that end
- CAD panel (CallControlCAD variant only)

## Usage

### React

```tsx
import {CallControl, CallControlCAD} from '@webex/cc-widgets';

function App() {
  return (
    <>
      {/* Standard interaction controls (voice + digital) */}
      <CallControl
        onHoldResume={({isHeld, task}) => console.log('Hold:', {isHeld, task})}
        onEnd={({task}) => console.log('Call ended', {task})}
        onWrapUp={({task, wrapUpReason}) => console.log('Wrapup complete', {task, wrapUpReason})}
        onRecordingToggle={({isRecording, task}) => console.log('Recording:', {isRecording, task})}
        onToggleMute={({isMuted, task}) => console.log('Muted:', {isMuted, task})}
        conferenceEnabled={true}
        consultTransferOptions={{showAgents: true, showQueues: true}}
      />

      {/* With CAD panel for richer customer context */}
      <CallControlCAD
        onHoldResume={({isHeld, task}) => console.log('Hold:', {isHeld, task})}
        onEnd={({task}) => console.log('Call ended', {task})}
        onWrapUp={({task, wrapUpReason}) => console.log('Wrapup complete', {task, wrapUpReason})}
        onRecordingToggle={({isRecording, task}) => console.log('Recording:', {isRecording, task})}
        onToggleMute={({isMuted, task}) => console.log('Muted:', {isMuted, task})}
        callControlClassName="custom-class"
      />
    </>
  );
}
```

## Props API

| Prop                          | Type                                                                        | Default | Description                                                      |
| ----------------------------- | --------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `onHoldResume`                | `({ isHeld, task }: { isHeld: boolean; task: ITask }) => void`              | -       | Callback when hold state changes                                 |
| `onEnd`                       | `({ task }: { task: ITask }) => void`                                       | -       | Callback when call ends                                          |
| `onWrapUp`                    | `({ task, wrapUpReason }: { task: ITask; wrapUpReason: string }) => void`   | -       | Callback when wrapup completes (includes wrapup reason and task) |
| `onRecordingToggle`           | `({ isRecording, task }: { isRecording: boolean; task: ITask }) => void`    | -       | Callback when recording toggled                                  |
| `onToggleMute`                | `({ isMuted, task }: { isMuted: boolean; task: ITask }) => void`            | -       | Callback when mute toggled                                       |
| `conferenceEnabled`           | `boolean`                                                                   | `true`  | Enable conference functionality                                  |
| `consultTransferOptions`      | `{ showAgents?: boolean, showQueues?: boolean, showAddressBook?: boolean }` | -       | Configure transfer options                                       |
| `callControlClassName`        | `string`                                                                    | -       | Custom CSS class (CAD variant)                                   |
| `callControlConsultClassName` | `string`                                                                    | -       | Custom CSS class for consult (CAD variant)                       |

## Examples

### With Transfer Options

```tsx
<CallControl
  consultTransferOptions={{
    showAgents: true, // Show buddy agents
    showQueues: true, // Show queues
    showAddressBook: false, // Hide address book
  }}
/>
```

### With Conference Disabled

```tsx
<CallControl
  conferenceEnabled={false}
  onEnd={({task}) => {
    console.log('Call ended without conference option', {task});
  }}
/>
```

### CAD Variant with Custom Styling

```tsx
<CallControlCAD
  callControlClassName="my-call-controls"
  callControlConsultClassName="my-consult-panel"
  onWrapUp={({task, wrapUpReason}) => {
    console.log('Wrapup complete, CAD data saved', {task, wrapUpReason});
  }}
/>
```

## Differences: CallControl vs CallControlCAD

| Feature               | CallControl          | CallControlCAD            |
| --------------------- | -------------------- | ------------------------- |
| Call controls         | ✅                   | ✅                        |
| CAD panel             | ❌                   | ✅                        |
| Customer data display | ❌                   | ✅                        |
| Layout                | Compact              | Extended with CAD sidebar |
| Use case              | Simple call handling | CRM integration scenarios |

**Note:** Both use the same `useCallControl` hook and share 90% of logic.

## Dependencies

```json
{
  "@webex/cc-components": "1.28.0-next.7",
  "@webex/cc-store": "1.28.0-next.7",
  "@webex/cc-ui-logging": "1.28.0-next.7",
  "mobx-react-lite": "^4.1.0",
  "react-error-boundary": "^6.0.0"
}
```

See [package.json](../../package.json) for versions.

## Additional Resources

- [Architecture Details](architecture.md) - Component internals, data flows, diagrams
