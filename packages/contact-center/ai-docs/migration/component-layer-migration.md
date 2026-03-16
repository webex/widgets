# Component Layer (`cc-components`) Migration

## Summary

The `cc-components` package contains the presentational React components for task widgets. These components receive control visibility as props. The prop interface must be updated to match the new `TaskUIControls` shape from SDK (renamed controls, merged controls, removed state flags).

---

## ControlVisibility Interface — Delete and Replace

**File:** `cc-components/src/components/task/task.types.ts`

The old `ControlVisibility` interface (22 controls + 7 state flags) must be replaced with `TaskUIControls` imported from SDK.

```typescript
// OLD — DELETE this interface
export interface ControlVisibility {
  accept: Visibility;
  decline: Visibility;
  end: Visibility;
  muteUnmute: Visibility;           // → mute
  muteUnmuteConsult: Visibility;    // → REMOVE (use mute)
  holdResume: Visibility;           // → hold
  consult: Visibility;
  transfer: Visibility;
  conference: Visibility;
  wrapup: Visibility;
  pauseResumeRecording: Visibility; // → recording
  endConsult: Visibility;
  recordingIndicator: Visibility;   // → REMOVE (merged into recording)
  exitConference: Visibility;
  mergeConference: Visibility;      // → mergeToConference
  consultTransfer: Visibility;
  mergeConferenceConsult: Visibility; // → REMOVE (use mergeToConference)
  consultTransferConsult: Visibility; // → REMOVE (use transfer)
  switchToMainCall: Visibility;
  switchToConsult: Visibility;
  isConferenceInProgress: boolean;  // → derive from controls.exitConference.isVisible
  isConsultInitiated: boolean;      // → Do NOT use endConsult.isVisible as "initiated only"; it covers both initiated and accepted. Use task/participant state if you need that distinction.
  isConsultInitiatedAndAccepted: boolean; // → REMOVE
  isConsultReceived: boolean;       // → REMOVE
  isConsultInitiatedOrAccepted: boolean; // → REMOVE
  isHeld: boolean;                  // → derive from findHoldStatus(task, 'mainCall', agentId)
  consultCallHeld: boolean;         // → derive from findHoldStatus(task, 'consult', agentId). Do NOT use controls.switchToConsult.isVisible (that is button visibility, not hold state).
}

// NEW — import via store to preserve layering (cc-components → store → SDK). Store re-exports TaskUIControls from SDK.
import type { TaskUIControls } from '@webex/cc-store';
```

---

## Components to Update

### CallControlComponent
**File:** `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`

#### Old Prop Names → New Prop Names

| Old Prop | New Prop | Change |
|----------|----------|--------|
| `holdResume` | `hold` | **Rename** |
| `muteUnmute` | `mute` | **Rename** |
| `pauseResumeRecording` | `recording` | **Rename** — toggle button (pause/resume) |
| `recordingIndicator` | `recording` | **Same SDK control** — widget must preserve separate recording status badge UI. Use `recording.isVisible` for badge, `recording.isEnabled` for toggle |
| `mergeConference` | `mergeToConference` | **Rename** |
| `consultTransferConsult` | `transfer` / `transferConference` | **Split** — use `transfer` for consult transfer, `transferConference` for conference transfer |
| `mergeConferenceConsult` | — | **Remove** (use `mergeToConference`) |
| `muteUnmuteConsult` | — | **Remove** (use `mute`) |
| `isConferenceInProgress` | — | **Remove** (derive from controls) |
| `isConsultInitiated` | — | **Remove** (derive from controls) |
| `isConsultInitiatedAndAccepted` | — | **Remove** |
| `isConsultReceived` | — | **Remove** |
| `isConsultInitiatedOrAccepted` | — | **Remove** |
| `isHeld` | `isHeld` | **Retain** — parent derives via `findHoldStatus(task, 'mainCall', agentId)` and passes to component. Do NOT derive from `controls.hold.isEnabled`. |
| `consultCallHeld` | — | **Remove** (derive from `findHoldStatus(task, 'consult', agentId)` in parent if needed for display) |

#### Proposed New Interface

```typescript
interface CallControlComponentProps {
  controls: TaskUIControls;  // All 17 controls from SDK
  // Widget-layer state (not from SDK). isHeld must be derived by parent via findHoldStatus(task, 'mainCall', agentId).
  isHeld: boolean;
  isMuted: boolean;
  isRecording: boolean;
  holdTime: number;
  secondsUntilAutoWrapup: number;
  buddyAgents: Agent[];
  consultAgentName: string;
  // Actions. onToggleHold(hold) — pass intended hold state (true = hold, false = resume); matches toggleHold(hold: boolean) in task.types.
  onToggleHold: (hold: boolean) => void;
  onToggleMute: () => void;
  onToggleRecording: () => void;
  onEndCall: () => void;
  onWrapupCall: (reason: string, auxCodeId: string) => void;
  onTransferCall: (payload: TransferPayLoad) => void;  // Invoked from transfer popover on submit
  onConsultCall: (payload: ConsultPayload) => void;   // Invoked from consult popover on submit
  onEndConsultCall: () => void;
  onConsultTransfer: () => void;
  onConsultConference: () => void;
  onExitConference: () => void;
  onSwitchToConsult: () => void;
  onSwitchToMainCall: () => void;
  onCancelAutoWrapup: () => void;
}
```

### CallControlConsult
**File:** `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/call-control-consult.tsx`

- Update to use `controls.endConsult`, `controls.mergeToConference`, `controls.switchToMainCall`, `controls.switchToConsult`
- Remove separate `consultTransferConsult`, `mergeConferenceConsult`, `muteUnmuteConsult` props

### IncomingTaskComponent
**File:** `packages/contact-center/cc-components/src/components/task/IncomingTask/incoming-task.tsx`

- Accept: `controls.accept.isVisible` / `controls.accept.isEnabled`
- Decline: `controls.decline.isVisible` / `controls.decline.isEnabled`
- Minimal changes — shape is compatible

### TaskListComponent
**File:** `packages/contact-center/cc-components/src/components/task/TaskList/task-list.tsx`

- Per-task accept/decline: use `task.uiControls.accept` / `task.uiControls.decline`
- Task status display: may use existing `getTaskStatus()` or enhance

### OutdialCallComponent
**File:** `packages/contact-center/cc-components/src/components/task/OutdialCall/outdial-call.tsx`

- **No changes needed** — OutdialCall does not use task controls

---

## Full Before/After: CallControlComponent

### Before
```tsx
// call-control.tsx — old approach
const CallControlComponent = ({
  // 22 individual control props
  accept, decline, end, muteUnmute, holdResume,
  pauseResumeRecording, recordingIndicator,
  transfer, conference, exitConference, mergeConference,
  consult, endConsult, consultTransfer, consultTransferConsult,
  mergeConferenceConsult, muteUnmuteConsult,
  switchToMainCall, switchToConsult, wrapup,
  // 7 state flags
  isConferenceInProgress, isConsultInitiated,
  isConsultInitiatedAndAccepted, isConsultReceived,
  isConsultInitiatedOrAccepted, isHeld, consultCallHeld,
  // Actions and hook state
  isMuted, isRecording, holdTime, onToggleHold, onToggleMute, ...
}) => {
  return (
    <div className="call-control">
      {holdResume.isVisible && (
        <Button onClick={() => onToggleHold(!isHeld)} disabled={!holdResume.isEnabled}>
          {isHeld ? 'Resume' : 'Hold'}
        </Button>
      )}
      {muteUnmute.isVisible && (
        <Button onClick={onToggleMute} disabled={!muteUnmute.isEnabled}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Button>
      )}
      {end.isVisible && (
        <Button onClick={onEndCall} disabled={!end.isEnabled}>End</Button>
      )}
      {/* Consult sub-controls */}
      {isConsultInitiatedOrAccepted && (
        <div className="consult-controls">
          {endConsult.isVisible && <Button onClick={onEndConsult}>End Consult</Button>}
          {consultTransferConsult.isVisible && <Button>Consult Transfer</Button>}
          {mergeConferenceConsult.isVisible && <Button>Merge</Button>}
          {muteUnmuteConsult.isVisible && <Button>Mute Consult</Button>}
        </div>
      )}
      {/* Conference sub-controls */}
      {isConferenceInProgress && (
        <div className="conference-controls">
          {exitConference.isVisible && <Button>Exit Conference</Button>}
          {mergeConference.isVisible && <Button>Merge Conference</Button>}
        </div>
      )}
    </div>
  );
};
```

### After
```tsx
// call-control.tsx — new approach
const CallControlComponent = ({
  controls,         // TaskUIControls — all 17 controls from SDK
  isHeld,           // From parent: findHoldStatus(task, 'mainCall', agentId)
  isMuted, isRecording, holdTime,
  onToggleHold, onToggleMute, onEndCall, onEndConsultCall,
  onConsultTransfer, onConsultConference, onExitConference,
  onSwitchToMainCall, onSwitchToConsult, ...
}: CallControlComponentProps) => {
  // Implement openTransferPopover / openConsultPopover (e.g. set state to show popover); popover on submit calls onTransferCall(payload) / onConsultCall(payload).
  // Derive display-only flags from controls (replaces old state flag props)
  const isConsulting = controls.endConsult.isVisible;
  const isConferencing = controls.exitConference.isVisible;

  // isHeld must be passed from parent, derived via findHoldStatus(task, 'mainCall', agentId). Do NOT use controls.hold.isEnabled for toggle — hold can be disabled in consult/conference without the call being held.
  return (
    <div className="call-control">
      {controls.hold.isVisible && (
        <Button onClick={() => onToggleHold(!isHeld)} disabled={!controls.hold.isEnabled}>
          {isHeld ? 'Resume' : 'Hold'}
        </Button>
      )}
      {controls.mute.isVisible && (
        <Button onClick={onToggleMute} disabled={!controls.mute.isEnabled}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Button>
      )}
      {controls.end.isVisible && (
        <Button onClick={onEndCall} disabled={!controls.end.isEnabled}>End</Button>
      )}
      {/* Transfer and Consult: buttons open popover/menu; popover invokes onTransferCall(payload) / onConsultCall(payload) on confirm */}
      {controls.transfer.isVisible && (
        <Button onClick={openTransferPopover} disabled={!controls.transfer.isEnabled}>Transfer</Button>
      )}
      {controls.consult.isVisible && (
        <Button onClick={openConsultPopover} disabled={!controls.consult.isEnabled}>Consult</Button>
      )}
      {/* Active consult controls */}
      {controls.endConsult.isVisible && (
        <Button onClick={onEndConsultCall} disabled={!controls.endConsult.isEnabled}>End Consult</Button>
      )}
      {controls.mergeToConference.isVisible && (
        <Button onClick={onConsultConference} disabled={!controls.mergeToConference.isEnabled}>Merge</Button>
      )}
      {controls.switchToMainCall.isVisible && (
        <Button onClick={onSwitchToMainCall} disabled={!controls.switchToMainCall.isEnabled}>Main Call</Button>
      )}
      {controls.switchToConsult.isVisible && (
        <Button onClick={onSwitchToConsult} disabled={!controls.switchToConsult.isEnabled}>Consult Call</Button>
      )}
      {/* Conference controls */}
      {controls.exitConference.isVisible && (
        <Button onClick={onExitConference} disabled={!controls.exitConference.isEnabled}>Exit Conference</Button>
      )}
      {controls.transferConference.isVisible && (
        <Button onClick={onConsultTransfer} disabled={!controls.transferConference.isEnabled}>Transfer Conference</Button>
      )}
      {/* Recording */}
      {controls.recording.isVisible && (
        <Button onClick={onToggleRecording} disabled={!controls.recording.isEnabled}>
          {isRecording ? 'Pause' : 'Resume'} Recording
        </Button>
      )}
      {/* Wrapup */}
      {controls.wrapup.isVisible && (
        <Button disabled={!controls.wrapup.isEnabled}>Wrap Up</Button>
      )}
    </div>
  );
};
```

---

## Deriving State Flags from Controls

Components that previously relied on state flags can derive them:

```typescript
// Old: isConferenceInProgress (boolean prop)
// New: derive from controls
const isConferenceInProgress = controls.exitConference.isVisible;

// Old: isConsultInitiatedOrAccepted (boolean prop)
// New: derive from controls
const isConsulting = controls.endConsult.isVisible;

// Old: isHeld (boolean state flag from getControlsVisibility)
// New: derive from task data, NOT from control enabled state
// IMPORTANT: Do NOT use `controls.hold.isEnabled` to determine held state —
// hold can be disabled in consult/transition states even when call is not held.
const isHeld = findHoldStatus(currentTask, 'mainCall', agentId);
// (Uses task.data.interaction.participants to check actual hold state)
```

---

## Critical Utility Files

### 1. `buildCallControlButtons()` — call-control.utils.ts

This function builds the main call control button array. It references 12 old control names and 2 state flags:

| Old Reference | New Equivalent |
|--------------|---------------|
| `controlVisibility.muteUnmute.isVisible` | `controls.mute.isVisible` |
| `controlVisibility.isHeld` | Derive from task data: `findHoldStatus(task, 'mainCall', agentId)` |
| `controlVisibility.holdResume.isEnabled` | `controls.hold.isEnabled` |
| `controlVisibility.holdResume.isVisible` | `controls.hold.isVisible` |
| `controlVisibility.consult.isEnabled` | `controls.consult.isEnabled` |
| `controlVisibility.consult.isVisible` | `controls.consult.isVisible` |
| `controlVisibility.isConferenceInProgress` | Derive: `controls.exitConference.isVisible` |
| `controlVisibility.consultTransfer.isEnabled` / `.isVisible` | Use **`controls.transfer`** or **`controls.transferConference`** (consult vs conference). Do NOT use `controls.consultTransfer` — always hidden in new SDK. |
| `controlVisibility.mergeConference.isEnabled` | `controls.mergeToConference.isEnabled` |
| `controlVisibility.transfer.isEnabled` | `controls.transfer.isEnabled` |
| `controlVisibility.pauseResumeRecording.isEnabled` | `controls.recording.isEnabled` |
| `controlVisibility.exitConference.isEnabled` | `controls.exitConference.isEnabled` |
| `controlVisibility.end.isEnabled` | `controls.end.isEnabled` |

### 2. `createConsultButtons()` — call-control-custom.utils.ts

| Old Reference | New Equivalent |
|--------------|---------------|
| `controlVisibility.muteUnmuteConsult` | `controls.mute` |
| `controlVisibility.switchToMainCall` | `controls.switchToMainCall` |
| `controlVisibility.isConferenceInProgress` | Derive: `controls.exitConference.isVisible` |
| `controlVisibility.consultTransferConsult` | `controls.transfer` / `controls.transferConference` |
| `controlVisibility.mergeConferenceConsult` | `controls.mergeToConference` |
| `controlVisibility.endConsult` | `controls.endConsult` |

### 3. `filterButtonsForConsultation()` — call-control.utils.ts

```typescript
// OLD: uses consultInitiated flag
// NEW: derive consultInitiated from controls.endConsult.isVisible
```

### 4. `getConsultStatusText()` — call-control-custom.utils.ts

```typescript
// OLD: uses consultInitiated boolean
// NEW: derive from controls.endConsult.isVisible && !controls.mergeToConference.isEnabled
```

---

## Other Impacted Types and Props

### `CallControlConsultComponentsProps` — task.types.ts
```typescript
// OLD: controlVisibility: ControlVisibility
// NEW: controls: TaskUIControls
```

### `ConsultTransferPopoverComponentProps` — task.types.ts
```typescript
// OLD: isConferenceInProgress?: boolean
// NEW: derive from controls.exitConference.isVisible
```

### `ControlProps` — task.types.ts (Master Interface)
- `controlVisibility: ControlVisibility` → `controls: TaskUIControls`
- `isHeld: boolean` → derive from `findHoldStatus`
- `deviceType: string` → REMOVE (SDK handles)
- `featureFlags: {[key: string]: boolean}` → REMOVE (SDK handles)
- `conferenceEnabled: boolean` → REMOVE (SDK handles)
- `agentId: string` → RETAIN (needed for timer participant lookup)

### `CallControlCAD` Widget — task/src/CallControlCAD/index.tsx
Retain `deviceType`, `featureFlags`, `conferenceEnabled` in `useCallControl` for the feature-flag overlay (`applyFeatureGates`). Retain `agentId` for timer participant lookup and for deriving `isHeld` via `findHoldStatus(task, 'mainCall', agentId)` to pass to CallControl component.

### Files NOT Impacted (Confirmed)

| File | Reason |
|------|--------|
| `AutoWrapupTimer.tsx` | Uses `secondsUntilAutoWrapup` only |
| `consult-transfer-popover-hooks.ts` | Pagination/search logic |
| `consult-transfer-list-item.tsx` | Display only |
| `consult-transfer-dial-number.tsx` | Input handling |
| `consult-transfer-empty-state.tsx` | Display only |
| `TaskTimer/index.tsx` | Timer display |
| `Task/index.tsx` | Task card display |
| `OutdialCall/outdial-call.tsx` | No task controls used |

---

## Files to Modify

| File | Action | Impact |
|------|--------|--------|
| `cc-components/.../task/task.types.ts` | Replace `ControlVisibility` with `TaskUIControls`; update `ControlProps`, `CallControlComponentProps`, etc. | **HIGH** |
| `cc-components/.../CallControl/call-control.tsx` | Update to use `controls` prop | **HIGH** |
| `cc-components/.../CallControl/call-control.utils.ts` | Update `buildCallControlButtons()` and `filterButtonsForConsultation()` | **HIGH** |
| `cc-components/.../CallControlCustom/call-control-custom.utils.ts` | Update `createConsultButtons()` and `getConsultStatusText()` | **HIGH** |
| `cc-components/.../CallControlCustom/call-control-consult.tsx` | Update consult control props | **MEDIUM** |
| `cc-components/.../CallControlCustom/consult-transfer-popover.tsx` | Update `isConferenceInProgress` prop | **LOW** |
| `cc-components/.../IncomingTask/incoming-task.tsx` | Minor prop updates | **LOW** |
| `cc-components/.../TaskList/task-list.tsx` | Minor prop updates | **LOW** |
| `task/src/CallControlCAD/index.tsx` | **Retain** `deviceType`, `featureFlags`, `conferenceEnabled` for `applyFeatureGates` overlay; retain `agentId` | **MEDIUM** |
| All test files for above | Update mocks and assertions | **HIGH** |

---

## Validation Criteria

- [ ] CallControl renders all 17 controls correctly
- [ ] Consult sub-controls (endConsult, merge, switch) render correctly
- [ ] Conference sub-controls (exit, transfer conference) render correctly
- [ ] State flag derivation works for conditional rendering
- [ ] IncomingTask accept/decline render correctly
- [ ] TaskList per-task controls render correctly
- [ ] CallControlCAD works with simplified props
- [ ] `buildCallControlButtons()` returns correct buttons for all states
- [ ] `createConsultButtons()` returns correct buttons for consult state
- [ ] No TypeScript compilation errors
- [ ] All component tests pass

---

_Part of the task refactor migration doc set (overview in PR 1/4)._
