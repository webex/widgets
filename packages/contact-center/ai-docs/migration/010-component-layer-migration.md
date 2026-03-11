# Migration Doc 010: Component Layer (`cc-components`) Migration

## Summary

The `cc-components` package contains the presentational React components for task widgets. These components receive control visibility as props. The prop interface must be updated to match the new `TaskUIControls` shape from SDK (renamed controls, merged controls, removed state flags).

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
| `isHeld` | — | **Remove** (derive from controls) |
| `consultCallHeld` | — | **Remove** |

#### Proposed New Interface

```typescript
interface CallControlComponentProps {
  controls: TaskUIControls;  // All 17 controls from SDK
  // Widget-layer state (not from SDK)
  isMuted: boolean;
  isRecording: boolean;
  holdTime: number;
  secondsUntilAutoWrapup: number;
  buddyAgents: Agent[];
  consultAgentName: string;
  // Actions
  onToggleHold: () => void;
  onToggleMute: () => void;
  onToggleRecording: () => void;
  onEndCall: () => void;
  onWrapupCall: (reason: string, auxCodeId: string) => void;
  onTransferCall: (payload: TransferPayLoad) => void;
  onConsultCall: (payload: ConsultPayload) => void;
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
  isMuted, isRecording, holdTime,
  onToggleHold, onToggleMute, onEndCall, onEndConsult,
  onConsultTransfer, onConsultConference, onExitConference,
  onSwitchToMainCall, onSwitchToConsult, ...
}: CallControlComponentProps) => {
  // Derive display-only flags from controls (replaces old state flag props)
  const isConsulting = controls.endConsult.isVisible;
  const isConferencing = controls.exitConference.isVisible;

  return (
    <div className="call-control">
      {controls.hold.isVisible && (
        <Button onClick={() => onToggleHold(!controls.hold.isEnabled)} disabled={!controls.hold.isEnabled}>
          {/* Hold button shows as "Resume" when held (hold visible but not enabled) */}
          Hold/Resume
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
      {/* Transfer and Consult initiation */}
      {controls.transfer.isVisible && (
        <Button disabled={!controls.transfer.isEnabled}>Transfer</Button>
      )}
      {controls.consult.isVisible && (
        <Button disabled={!controls.consult.isEnabled}>Consult</Button>
      )}
      {/* Active consult controls */}
      {controls.endConsult.isVisible && (
        <Button onClick={onEndConsult} disabled={!controls.endConsult.isEnabled}>End Consult</Button>
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

## Newly Discovered Files (Deep Scan)

### 1. `ControlVisibility` Type — The Central Type to Replace

**File:** `cc-components/src/components/task/task.types.ts` (lines 702-730)

```typescript
// OLD: ControlVisibility interface (22 controls + 7 state flags)
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
  isConsultInitiated: boolean;      // → derive from controls.endConsult.isVisible
  isConsultInitiatedAndAccepted: boolean; // → REMOVE
  isConsultReceived: boolean;       // → REMOVE
  isConsultInitiatedOrAccepted: boolean; // → REMOVE
  isHeld: boolean;                  // → derive from controls.hold
  consultCallHeld: boolean;         // → derive from controls.switchToConsult.isVisible
}
```

**Migration:** Replace with `TaskUIControls` import from SDK. The `ControlVisibility` interface and all its consumers must be updated.

### 2. `buildCallControlButtons()` — CRITICAL File

**File:** `cc-components/.../CallControl/call-control.utils.ts` (line 192)

This function builds the main call control button array. It references **12 old control names and 2 state flags**:

| Old Reference | New Equivalent |
|--------------|---------------|
| `controlVisibility.muteUnmute.isVisible` | `controls.mute.isVisible` |
| `controlVisibility.switchToConsult.isEnabled` | `controls.switchToConsult.isEnabled` |
| `controlVisibility.isHeld` | Derive from task data: `findHoldStatus(task, 'mainCall', agentId)` — do NOT derive from `controls.hold.isEnabled` |
| `controlVisibility.holdResume.isEnabled` | `controls.hold.isEnabled` |
| `controlVisibility.holdResume.isVisible` | `controls.hold.isVisible` |
| `controlVisibility.consult.isEnabled` | `controls.consult.isEnabled` |
| `controlVisibility.consult.isVisible` | `controls.consult.isVisible` |
| `controlVisibility.isConferenceInProgress` | Derive: `controls.exitConference.isVisible` |
| `controlVisibility.consultTransfer.isEnabled` | `controls.consultTransfer.isEnabled` |
| `controlVisibility.consultTransfer.isVisible` | `controls.consultTransfer.isVisible` |
| `controlVisibility.mergeConference.isEnabled` | `controls.mergeToConference.isEnabled` |
| `controlVisibility.mergeConference.isVisible` | `controls.mergeToConference.isVisible` |
| `controlVisibility.transfer.isEnabled` | `controls.transfer.isEnabled` |
| `controlVisibility.transfer.isVisible` | `controls.transfer.isVisible` |
| `controlVisibility.pauseResumeRecording.isEnabled` | `controls.recording.isEnabled` |
| `controlVisibility.pauseResumeRecording.isVisible` | `controls.recording.isVisible` |
| `controlVisibility.exitConference.isEnabled` | `controls.exitConference.isEnabled` |
| `controlVisibility.exitConference.isVisible` | `controls.exitConference.isVisible` |
| `controlVisibility.end.isEnabled` | `controls.end.isEnabled` |
| `controlVisibility.end.isVisible` | `controls.end.isVisible` |

#### Before
```typescript
export const buildCallControlButtons = (
  isMuted, isRecording, isMuteButtonDisabled, currentMediaType,
  controlVisibility: ControlVisibility,  // OLD type
  ...handlers
): CallControlButton[] => {
  return [
    { id: 'mute', isVisible: controlVisibility.muteUnmute.isVisible, ... },
    { id: 'hold', icon: controlVisibility.isHeld ? 'play-bold' : 'pause-bold',
      disabled: !controlVisibility.holdResume.isEnabled,
      isVisible: controlVisibility.holdResume.isVisible, ... },
    { id: 'record', isVisible: controlVisibility.pauseResumeRecording.isVisible, ... },
    // ... 10 more buttons using old names
  ];
};
```

#### After
```typescript
export const buildCallControlButtons = (
  isMuted, isRecording, isMuteButtonDisabled, currentMediaType,
  controls: TaskUIControls,  // NEW type from SDK
  ...handlers
): CallControlButton[] => {
  const isHeld = findHoldStatus(currentTask, 'mainCall', agentId); // from task data, NOT control state
  const isConferencing = controls.exitConference.isVisible;
  return [
    { id: 'mute', isVisible: controls.mute.isVisible, ... },
    { id: 'hold', icon: isHeld ? 'play-bold' : 'pause-bold',
      disabled: !controls.hold.isEnabled,
      isVisible: controls.hold.isVisible, ... },
    { id: 'record', isVisible: controls.recording.isVisible, ... },
    // ... 10 more buttons using new names
  ];
};
```

### 3. `createConsultButtons()` — CRITICAL File

**File:** `cc-components/.../CallControlCustom/call-control-custom.utils.ts` (line 16)

This function builds the consult-mode button array. It references **5 old control names and 1 state flag**:

| Old Reference | New Equivalent |
|--------------|---------------|
| `controlVisibility.muteUnmuteConsult` | `controls.mute` |
| `controlVisibility.switchToMainCall` | `controls.switchToMainCall` |
| `controlVisibility.isConferenceInProgress` | Derive: `controls.exitConference.isVisible` |
| `controlVisibility.consultTransferConsult` | `controls.transfer` (consult) / `controls.transferConference` (conference) |
| `controlVisibility.mergeConferenceConsult` | `controls.mergeToConference` |
| `controlVisibility.endConsult` | `controls.endConsult` |

#### Before
```typescript
export const createConsultButtons = (
  isMuted, controlVisibility: ControlVisibility, ...handlers
): ButtonConfig[] => {
  return [
    { key: 'mute', isVisible: controlVisibility.muteUnmuteConsult.isVisible,
      disabled: !controlVisibility.muteUnmuteConsult.isEnabled },
    { key: 'switchToMainCall', tooltip: controlVisibility.isConferenceInProgress ? 'Switch to Conference Call' : 'Switch to Call',
      isVisible: controlVisibility.switchToMainCall.isVisible },
    { key: 'transfer', isVisible: controlVisibility.consultTransferConsult.isVisible },
    { key: 'conference', isVisible: controlVisibility.mergeConferenceConsult.isVisible },
    { key: 'cancel', isVisible: controlVisibility.endConsult.isVisible },
  ];
};
```

#### After
```typescript
export const createConsultButtons = (
  isMuted, controls: TaskUIControls, ...handlers
): ButtonConfig[] => {
  const isConferencing = controls.exitConference.isVisible;
  return [
    { key: 'mute', isVisible: controls.mute.isVisible,
      disabled: !controls.mute.isEnabled },
    { key: 'switchToMainCall', tooltip: isConferencing ? 'Switch to Conference Call' : 'Switch to Call',
      isVisible: controls.switchToMainCall.isVisible },
    { key: 'transfer', isVisible: controls.transfer.isVisible },
    { key: 'conference', isVisible: controls.mergeToConference.isVisible },
    { key: 'cancel', isVisible: controls.endConsult.isVisible },
  ];
};
```

### 4. `CallControlCAD` Widget — Props to Remove

**File:** `task/src/CallControlCAD/index.tsx`

This is an **alternative CallControl widget** (CAD = Call Associated Data). It passes `deviceType`, `featureFlags`, `agentId`, and `conferenceEnabled` from the store to `useCallControl`. When `useCallControlProps` is updated, `deviceType`, `featureFlags`, and `conferenceEnabled` will be removed. `agentId` is retained — it is still needed for timer participant lookup.

#### Before
```tsx
const { deviceType, featureFlags, isMuted, agentId } = store;
const result = {
  ...useCallControl({
    currentTask, onHoldResume, onEnd, onWrapUp, onRecordingToggle, onToggleMute,
    logger, deviceType, featureFlags, isMuted, conferenceEnabled, agentId
  }),
  // ...
};
return <CallControlCADComponent {...result} />;
```

#### After
```tsx
const { isMuted } = store;
const result = {
  ...useCallControl({
    currentTask, onHoldResume, onEnd, onWrapUp, onRecordingToggle, onToggleMute,
    logger, isMuted, agentId  // agentId RETAINED — needed for timer participant lookup
    // REMOVED: deviceType, featureFlags, conferenceEnabled
  }),
  // ...
};
return <CallControlCADComponent {...result} />;
```

### 5. `CallControlConsultComponentsProps` — Uses `controlVisibility`

**File:** `cc-components/.../task/task.types.ts` (line 640)

```typescript
// OLD
export interface CallControlConsultComponentsProps {
  // ...
  controlVisibility: ControlVisibility;  // → controls: TaskUIControls
  // ...
}
```

### 6. `ConsultTransferPopoverComponentProps` — Uses `isConferenceInProgress`

**File:** `cc-components/.../task/task.types.ts` (line 617)

```typescript
// OLD
export interface ConsultTransferPopoverComponentProps {
  // ...
  isConferenceInProgress?: boolean;  // → derive from controls.exitConference.isVisible
  // ...
}
```

### 7. `ControlProps` — The Master Interface

**File:** `cc-components/.../task/task.types.ts` (line 159)

Has these migration-affected fields:
- `controlVisibility: ControlVisibility` (line 441) → `controls: TaskUIControls`
- `isHeld: boolean` (line 256) → derive from `controls.hold`
- `deviceType: string` (line 251) → REMOVE (SDK handles)
- `featureFlags: {[key: string]: boolean}` (line 389) → REMOVE (SDK handles)
- `conferenceEnabled: boolean` (line 429) → REMOVE (SDK handles)
- `agentId: string` (line 472) → RETAIN (needed for timer participant lookup, not just controls)

### 8. `CallControlComponentProps` — Picks `controlVisibility`

**File:** `cc-components/.../task/task.types.ts` (line 475)

```typescript
// OLD: Picks 'controlVisibility' from ControlProps
export type CallControlComponentProps = Pick<ControlProps, ... | 'controlVisibility' | ...>;

// NEW: Replace 'controlVisibility' with 'controls'
// Also can remove some picked props that came from the old approach
```

### 9. `filterButtonsForConsultation()` — Uses `consultInitiated` Flag

**File:** `cc-components/.../call-control.utils.ts` (line 324)

```typescript
// OLD
export const filterButtonsForConsultation = (buttons, consultInitiated, isTelephony) => {
  return consultInitiated && isTelephony
    ? buttons.filter((button) => !['hold', 'consult'].includes(button.id))
    : buttons;
};

// NEW: derive consultInitiated from controls.endConsult.isVisible
```

### 10. `getConsultStatusText()` — Uses `consultInitiated` Flag

**File:** `cc-components/.../call-control-custom.utils.ts` (line 126)

```typescript
// OLD
export const getConsultStatusText = (consultInitiated: boolean) => {
  return consultInitiated ? 'Consult requested' : 'Consulting';
};

// NEW: derive from controls.endConsult.isVisible && !controls.mergeToConference.isEnabled
```

### 11. Files NOT Impacted (Confirmed)

| File | Reason |
|------|--------|
| `AutoWrapupTimer.tsx` | Uses `secondsUntilAutoWrapup` only — no control refs |
| `AutoWrapupTimer.utils.ts` | Pure timer formatting — no control refs |
| `consult-transfer-popover-hooks.ts` | Pagination/search logic — no control refs |
| `consult-transfer-list-item.tsx` | Display only — no control refs |
| `consult-transfer-dial-number.tsx` | Input handling — no control refs |
| `consult-transfer-empty-state.tsx` | Display only — no control refs |
| `TaskTimer/index.tsx` | Timer display — no control refs |
| `Task/index.tsx` | Task card display — no control refs |
| `OutdialCall/outdial-call.tsx` | No task controls used |

---

## Files to Modify (Updated)

| File | Action | Impact |
|------|--------|--------|
| `cc-components/.../task/task.types.ts` | Replace `ControlVisibility` with `TaskUIControls`; update `ControlProps`, `CallControlComponentProps`, `CallControlConsultComponentsProps`, `ConsultTransferPopoverComponentProps` | **HIGH** — central type file |
| `cc-components/.../CallControl/call-control.tsx` | Update to use `controls` prop | **HIGH** |
| `cc-components/.../CallControl/call-control.utils.ts` | Update `buildCallControlButtons()` and `filterButtonsForConsultation()` to use new control names | **HIGH** — 20+ old control references |
| `cc-components/.../CallControlCustom/call-control-custom.utils.ts` | Update `createConsultButtons()` and `getConsultStatusText()` to use new control names | **HIGH** — 6 old control references |
| `cc-components/.../CallControlCustom/call-control-consult.tsx` | Update consult control props | **MEDIUM** |
| `cc-components/.../CallControlCustom/consult-transfer-popover.tsx` | Update `isConferenceInProgress` prop | **LOW** |
| `cc-components/.../IncomingTask/incoming-task.tsx` | Minor prop updates | **LOW** |
| `cc-components/.../TaskList/task-list.tsx` | Minor prop updates | **LOW** |
| `task/src/CallControlCAD/index.tsx` | Remove `deviceType`, `featureFlags`, `conferenceEnabled` from `useCallControl` call (retain `agentId` for timers) | **MEDIUM** |
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

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
