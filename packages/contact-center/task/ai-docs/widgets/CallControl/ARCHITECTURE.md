# CallControl Widget - Architecture

## Component Overview

| Layer         | File                                                          | Purpose         | Key Responsibilities                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Widget**    | `src/CallControl/index.tsx`<br>`src/CallControlCAD/index.tsx` | Smart container | - Observer HOC<br>- Error boundary<br>- Delegates to hook<br>- Props: callbacks, options                                                                                                                  |
| **Hook**      | `src/helper.ts` (useCallControl)                              | Business logic  | - All call operations<br>- Task event subscriptions<br>- State management (hold, mute, recording)<br>- Buddy agents, transfer, consult<br>- Auto-wrapup timer <br>- Task SDK methods (hold, resume, etc.) |
| **Component** | `@webex/cc-components` (CallControlComponent)                 | Presentation    | - Call control UI<br>- Buttons (hold, mute, transfer, etc.)<br>- Transfer/consult modals<br>- Wrapup dropdown<br>- Auto-wrapup timer display                                                              |
| **Store**     | `@webex/cc-store`                                             | State/SDK       | - currentTask observable<br>- Task event callbacks<br>- wrapupCodes                                                                                                                                       |

## File Structure

```
task/src/
├── CallControl/
│   └── index.tsx              # CallControl widget
├── CallControlCAD/
│   └── index.tsx              # CallControl + CAD variant
├── helper.ts                   # useCallControl hook (lines 270-945)
├── task.types.ts               # CallControlProps, useCallControlProps
└── index.ts                    # Exports

cc-components/src/components/task/CallControl/
├── call-control.tsx            # CallControlComponent (main UI)
├── call-control.utils.ts       # Utility functions
├── call-control.styles.scss    # Styles
├── CallControlCustom/
│   └── consult-transfer-popover.tsx
└── AutoWrapupTimer/
    └── AutoWrapupTimer.tsx
```

## Data Flows

### Overview

```mermaid
graph TD

    subgraph "CallControl Widget"
        B[CallControlComponent]
        E
    end

    A[User Action] --> B[CallControlComponent]
    C --> G[Task SDK Methods]
    B --> E[useCallControl Hook]
    E --> C[Store]
    E --> B
    G --> H[SDK]
```

### Hook: useCallControl

**Inputs:**

- `currentTask` - Active ITask from store
- `onHoldResume` - Hold state change callback
- `onEnd` - Call end callback
- `onWrapUp` - Wrapup callback
- `onRecordingToggle` - Recording toggle callback
- `onToggleMute` - Mute toggle callback
- `conferenceEnabled` - Enable conference features
- `consultTransferOptions` - Transfer UI options
- `logger` - Logger instance

**Manages State:**

- `isMuted` - Microphone mute state
- `isRecording` - Recording state
- `holdTime` - Duration of current hold
- `buddyAgents` - List of agents for transfer
- `consultAgentName` - Selected consult agent name
- `lastTargetType` - Last transfer target type
- `secondsUntilAutoWrapup` - Auto-wrapup countdown

**Subscribes to Task Events:**

- `TASK_HOLD` - Task put on hold
- `TASK_RESUME` - Task resumed from hold
- `TASK_END` - Task ended
- `AGENT_WRAPPEDUP` - Wrapup completed
- `TASK_RECORDING_PAUSED` - Recording paused
- `TASK_RECORDING_RESUMED` - Recording resumed

**Returns:** All functions and state for call control operations

## Sequence Diagrams

### Hold/Resume Call

```mermaid
sequenceDiagram
    participant U as User
    participant C as CallControlComponent
    participant H as useCallControl Hook
    participant T as Task Object
    participant S as Store
    participant B as Backend

    U->>C: Click Hold button
    C->>H: toggleHold(true)
    H->>T: task.hold()
    T->>B: POST /task/hold
    alt Success
        B-->>T: Success
        T-->>S: Emit TASK_HOLD event
        S->>H: holdCallback()
        H->>H: Start holdTime timer
        H->>H: onHoldResume({ isHeld: true, task })
        H-->>C: Update UI (show Resume)
    else Error
        B-->>T: Error
        T-->>H: Promise rejected
        H->>H: logger.error('Hold failed')
    end

    Note over U,B: Resume flow similar with task.resume()
```

### Transfer Call

```mermaid
sequenceDiagram
    participant U as User
    participant C as CallControlComponent
    participant H as useCallControl Hook
    participant T as Task Object
    participant B as Backend

    U->>C: Click Transfer button
    C->>C: Show transfer modal
    U->>C: Select agent from list
    C->>H: transferCall(agentId, 'AGENT')
    H->>H: logger.info('transferCall')
    H->>T: task.transfer({targetAgentId, destinationType})
    T->>B: POST /task/transfer
    alt Success
        B-->>T: Transfer initiated
        T-->>H: Promise resolved
        H->>H: logger.info('Transfer success')
        Note over C: Task will end via TASK_END event
    else Error
        B-->>T: Error
        T-->>H: Promise rejected
        H->>H: logger.error('Transfer failed')
    end
```

### Consult Then Transfer

```mermaid
sequenceDiagram
    participant U as User
    participant C as CallControlComponent
    participant H as useCallControl Hook
    participant T as Task Object
    participant S as Store
    participant B as Backend

    U->>C: Click Consult button
    C->>C: Show consult modal
    U->>C: Select agent
    C->>H: consultCall(agentId, 'AGENT', true)
    H->>T: task.consultCall({targetAgentId, destinationType})
    T->>B: POST /task/consult
    B-->>T: Consult call created
    T-->>S: Emit TASK_CONSULT_STARTED
    S-->>C: Update UI (show consult controls)

    Note over U,B: Agent talks with consultant

    U->>C: Click "Complete Transfer"
    C->>H: consultTransfer()
    H->>T: task.consultTransfer()
    T->>B: POST /task/consultTransfer
    alt Success
        B-->>T: Transfer completed
        T-->>S: Emit TASK_END
        H->>H: logger.info('Consult transfer complete')
    else Error
        B-->>T: Error
        T-->>H: Promise rejected
        H->>H: logger.error('Consult transfer failed')
    end
```

### Conference Call

```mermaid
sequenceDiagram
    participant U as User
    participant C as CallControlComponent
    participant H as useCallControl Hook
    participant T as Task Object
    participant B as Backend

    U->>C: Click Conference button
    C->>C: Show conference modal
    U->>C: Select agent
    C->>H: consultCall(agentId, 'AGENT', true)
    H->>T: task.consultCall({ targetAgentId, destinationType, allowParticipantsToInteract })
    T->>B: POST /task/consult
    B-->>T: Consult created

    U->>C: Click "Add to Conference"
    C->>H: consultConference()
    H->>T: task.consultConference()
    T->>B: POST /task/consultConference
    alt Success
        B-->>T: Conference created
        T-->>H: Promise resolved
        H->>H: Update conferenceParticipants
        C->>U: Display all participants
    else Error
        B-->>T: Error
        T-->>H: Promise rejected
        H->>H: logger.error('Conference failed')
    end
```

### Wrapup with Codes

```mermaid
sequenceDiagram
    participant U as User
    participant C as CallControlComponent
    participant H as useCallControl Hook
    participant S as Store
    participant T as Task Object
    participant B as Backend

    Note over U: Call ended

    S->>S: Fetch wrapupCodes from config
    S-->>C: Display wrapup dropdown
    C->>U: Show wrapup codes

    U->>C: Select wrapup code
    C->>C: setSelectedWrapupReason(code)

    U->>C: Click Submit Wrapup
    C->>H: wrapupCall(wrapupReason, wrapupId)
    H->>T: task.wrapup({wrapupReason, auxCodeId})
    T->>B: POST /task/wrapup
    alt Success
        B-->>T: Wrapup saved
        T-->>S: Emit AGENT_WRAPPEDUP
        S->>H: wrapupCallCallback()
        H->>H: onWrapUp({ task, wrapUpReason })
        H->>U: Parent notified
    else Error
        B-->>T: Error
        T-->>H: Promise rejected
        H->>H: logger.error('Wrapup failed')
    end
```

### Auto-Wrapup Timer

```mermaid
sequenceDiagram
    participant S as Store
    participant H as useCallControl Hook
    participant C as CallControlComponent
    participant U as User

    Note over S: Task ends, auto-wrapup configured

    S->>S: currentTask.autoWrapup = {enabled: true, timeout: 60}
    S-->>H: Observable update
    H->>H: Start auto-wrapup interval (1 second)
    H->>H: secondsUntilAutoWrapup = 60

    loop Every 1 second
        H->>H: secondsUntilAutoWrapup--
        H-->>C: Re-render with new countdown
        C->>U: Display "Auto-wrapup in 59s..."
    end

    alt User clicks Cancel
        U->>C: Click Cancel Auto-Wrapup
        C->>H: cancelAutoWrapup()
        H->>H: Clear interval
        H-->>C: Hide timer
    else Timer reaches 0
        H->>H: Auto-wrapup triggered
        H->>H: wrapupCall(autoWrapupReason, autoWrapupId)
        Note over H: Proceeds with default wrapup
    end
```

## Call Control Operations

### Button Actions

| Button     | Hook Function         | Task Method                                        | Description       |
| ---------- | --------------------- | -------------------------------------------------- | ----------------- |
| Hold       | `toggleHold(true)`    | `task.hold()`                                      | Put call on hold  |
| Resume     | `toggleHold(false)`   | `task.resume()`                                    | Resume from hold  |
| Mute       | `toggleMute()`        | N/A (local)                                        | Mute microphone   |
| Transfer   | `transferCall(...)`   | `task.transfer(...)`                               | Direct transfer   |
| Consult    | `consultCall(...)`    | `task.consultCall(...)`                            | Initiate consult  |
| Conference | `consultConference()` | `task.consultConference()`                         | Add to conference |
| End Call   | `endCall()`           | `task.end()`                                       | End the call      |
| Wrapup     | `wrapupCall(...)`     | `task.wrapup(...)`                                 | Submit wrapup     |
| Recording  | `toggleRecording()`   | `task.pauseRecording()` / `task.resumeRecording()` | Toggle recording  |

### Transfer/Consult Options

**Destination Types:**

- `AGENT` - Transfer to buddy agent
- `QUEUE` - Transfer to queue/entry point
- `DN` - Transfer to phone number
- `ADDRESS_BOOK` - Transfer to address book entry

**Configured via `consultTransferOptions` prop:**

- `showAgents` - Show buddy agents list
- `showQueues` - Show queues/entry points
- `showAddressBook` - Show address book entries

## Error Handling

| Error            | Source   | Handled By    | Action                     |
| ---------------- | -------- | ------------- | -------------------------- |
| Hold failed      | Task SDK | Hook catch    | Log error                  |
| Transfer failed  | Task SDK | Hook catch    | Log error, show alert      |
| Consult failed   | Task SDK | Hook catch    | Log error, show alert      |
| Wrapup failed    | Task SDK | Hook catch    | Log error                  |
| Recording failed | Task SDK | Hook catch    | Log error                  |
| Component crash  | React    | ErrorBoundary | Call store.onErrorCallback |

## Troubleshooting

### Issue: Hold button disabled/doesn't work

**Possible Causes:**

1. Task not in active state
2. Task type doesn't support hold
3. SDK error

**Solution:**

- Check `task.data.state`
- Verify task media type is TELEPHONY
- Check console for "Hold failed" logs

### Issue: Transfer options not showing

**Possible Causes:**

1. `consultTransferOptions` not configured
2. No buddy agents loaded
3. No queues configured

**Solution:**

- Pass `consultTransferOptions` prop
- Check `buddyAgents` array in hook
- Verify `loadBuddyAgents()` was called
- Check agent permissions for transfer

### Issue: Consult call fails

**Possible Causes:**

1. Invalid target agent
2. Agent not available
3. Insufficient permissions

**Solution:**

- Verify agent exists and is logged in
- Check agent state (Available)
- Check console for SDK error details

### Issue: Auto-wrapup timer not showing

**Possible Causes:**

1. Auto-wrapup not configured in backend
2. `controlVisibility.wrapup` is false
3. Task not in wrapup state

**Solution:**

- Check `currentTask.autoWrapup` object
- Verify wrapup is visible: `controlVisibility.wrapup === true`
- Check task state is WRAP_UP

### Issue: Recording button doesn't work

**Possible Causes:**

1. Recording not enabled for tenant
2. Agent doesn't have recording permissions
3. Task type doesn't support recording

**Solution:**

- Check tenant recording configuration
- Verify agent profile has recording permission
- Check `task.data.isRecordingEnabled`

## Performance Considerations

- **Task Event Subscriptions:** Registered per task, cleaned up on task change/unmount
- **Hold Timer:** Interval running while on hold (cleared on resume/unmount)
- **Auto-Wrapup Timer:** 1-second interval during wrapup countdown
- **Buddy Agents:** Fetched once on mount (cached)
- **Re-renders:** Only on currentTask or specific state changes (MobX observer)

## Testing

### Unit Tests

**Widget Tests:**

- Renders without crashing
- Passes props to hook correctly
- Error boundary catches errors

**Hook Tests:**

- toggleHold() calls task.hold()/resume()
- toggleMute() updates isMuted state
- transferCall() calls task.transfer()
- consultCall() calls task.consultCall()
- wrapupCall() calls task.wrapup()
- Task event callbacks fire correctly
- Auto-wrapup timer counts down
- Cleanup removes all callbacks

**Component Tests:**

- All buttons render correctly
- Buttons call correct handlers
- Transfer modal opens/closes
- Wrapup dropdown populates
- Auto-wrapup timer displays countdown

### E2E Tests

- Active call → Hold → Resume → Success
- Active call → Transfer to agent → Success
- Active call → Consult → Transfer → Success
- Active call → Consult → Conference → Success
- Active call → End → Wrapup with code → Success
- Active call → Auto-wrapup countdown → Cancel → Success
