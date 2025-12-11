# CallControl Widget

## Overview

Provides call control functionality (hold, mute, transfer, consult, conference, end, wrapup) for active telephony tasks. Includes both standard and CAD (Customer Attached Data) variants.

## Why This Widget?

**Problem:** Agents need comprehensive call control during active conversations.

**Solution:** Unified interface for all call operations with two variants:
- **CallControl:** Standard call controls
- **CallControlCAD:** Call controls + CAD panel for customer data

## What It Does

- Hold/Resume active call
- Mute/Unmute microphone
- Transfer call (to agent/queue/number)
- Consult with agent before transfer
- Conference multiple parties
- Recording controls (pause/resume)
- End call
- Wrapup with codes
- Auto-wrapup timer
- CAD panel (CallControlCAD variant only)

## Usage

### React

```tsx
import { CallControl, CallControlCAD } from '@webex/cc-widgets';

function App() {
  return (
    <>
      {/* Standard call controls */}
      <CallControl
        onHoldResume={(isHeld) => console.log('Hold:', isHeld)}
        onEnd={() => console.log('Call ended')}
        onWrapUp={() => console.log('Wrapup complete')}
        onRecordingToggle={({ isRecording }) => console.log('Recording:', isRecording)}
        onToggleMute={(isMuted) => console.log('Muted:', isMuted)}
        conferenceEnabled={true}
        consultTransferOptions={{ showAgents: true, showQueues: true }}
      />

      {/* With CAD panel */}
      <CallControlCAD
        onHoldResume={(isHeld) => console.log('Hold:', isHeld)}
        onEnd={() => console.log('Call ended')}
        callControlClassName="custom-class"
      />
    </>
  );
}
```

### Web Component

```html
<widget-cc-call-control></widget-cc-call-control>
<widget-cc-call-control-cad></widget-cc-call-control-cad>

<script>
  const callControl = document.querySelector('widget-cc-call-control');
  callControl.onHoldResume = (isHeld) => console.log('Hold:', isHeld);
  callControl.onEnd = () => console.log('Call ended');
  callControl.conferenceEnabled = true;
</script>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onHoldResume` | `(isHeld: boolean) => void` | - | Callback when hold state changes |
| `onEnd` | `() => void` | - | Callback when call ends |
| `onWrapUp` | `() => void` | - | Callback when wrapup completes |
| `onRecordingToggle` | `({ isRecording: boolean, task: ITask }) => void` | - | Callback when recording toggled |
| `onToggleMute` | `(isMuted: boolean) => void` | - | Callback when mute toggled |
| `conferenceEnabled` | `boolean` | `true` | Enable conference functionality |
| `consultTransferOptions` | `{ showAgents?: boolean, showQueues?: boolean, showAddressBook?: boolean }` | - | Configure transfer options |
| `callControlClassName` | `string` | - | Custom CSS class (CAD variant) |
| `callControlConsultClassName` | `string` | - | Custom CSS class for consult (CAD variant) |

## Examples

### With Transfer Options

```tsx
<CallControl
  consultTransferOptions={{
    showAgents: true,       // Show buddy agents
    showQueues: true,       // Show queues
    showAddressBook: false  // Hide address book
  }}
/>
```

### With Conference Disabled

```tsx
<CallControl
  conferenceEnabled={false}
  onEnd={() => {
    console.log('Call ended without conference option');
  }}
/>
```

### CAD Variant with Custom Styling

```tsx
<CallControlCAD
  callControlClassName="my-call-controls"
  callControlConsultClassName="my-consult-panel"
  onWrapUp={() => {
    console.log('Wrapup complete, CAD data saved');
  }}
/>
```

## Differences: CallControl vs CallControlCAD

| Feature | CallControl | CallControlCAD |
|---------|-------------|----------------|
| Call controls | ✅ | ✅ |
| CAD panel | ❌ | ✅ |
| Customer data display | ❌ | ✅ |
| Layout | Compact | Extended with CAD sidebar |
| Use case | Simple call handling | CRM integration scenarios |

**Note:** Both use the same `useCallControl` hook and share 90% of logic.

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

