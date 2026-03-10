# Migration Doc 004: CallControl Hook (`useCallControl`) Migration

## Summary

`useCallControl` is the largest and most complex hook in CC Widgets. It orchestrates hold, mute, recording, consult, transfer, conference, wrapup, and auto-wrapup flows. This migration replaces widget-side control computation with `task.uiControls` and simplifies event-driven state updates.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/task/src/helper.ts`
**Hook:** `useCallControl(props: useCallControlProps)`

### Current Responsibilities
1. **Control visibility**: Calls `getControlsVisibility()` → 22 controls + 7 state flags
2. **Hold/Resume**: `toggleHold()` → `task.hold()` / `task.resume()` / `task.hold(mediaResourceId)` / `task.resume(mediaResourceId)`
3. **Mute**: `toggleMute()` → `task.toggleMute()` (local state tracking)
4. **Recording**: `toggleRecording()` → `task.pauseRecording()` / `task.resumeRecording()`
5. **End call**: `endCall()` → `task.end()`
6. **Wrapup**: `wrapupCall()` → `task.wrapup()`
7. **Transfer**: `transferCall()` → `task.transfer()`
8. **Consult**: `consultCall()` → `task.consult()`, `endConsultCall()` → `task.endConsult()`
9. **Consult transfer**: `consultTransfer()` → `task.consultTransfer()` / `task.transferConference()`
10. **Conference**: `consultConference()` → `task.consultConference()`, `exitConference()` → `task.exitConference()`
11. **Switch calls**: `switchToConsult()` → `task.hold(mainMedia)` + `task.resume(consultMedia)`, `switchToMainCall()` → reverse
12. **Auto-wrapup timer**: `cancelAutoWrapup()` → `task.cancelAutoWrapupTimer()`
13. **Hold timer**: via `useHoldTimer(currentTask)` hook
14. **Event callbacks**: Registers hold/resume/end/wrapup/recording callbacks via `setTaskCallback`

### Old Hook Return Shape (abbreviated)
```typescript
{
  // Controls (from getControlsVisibility)
  accept, decline, end, muteUnmute, holdResume,
  pauseResumeRecording, recordingIndicator,
  transfer, conference, exitConference, mergeConference,
  consult, endConsult, consultTransfer, consultTransferConsult,
  mergeConferenceConsult, muteUnmuteConsult,
  switchToMainCall, switchToConsult, wrapup,
  // State flags (from getControlsVisibility)
  isConferenceInProgress, isConsultInitiated, isConsultInitiatedAndAccepted,
  isConsultReceived, isConsultInitiatedOrAccepted, isHeld, consultCallHeld,
  // Hook state
  isMuted, isRecording, holdTime, buddyAgents,
  consultAgentName, lastTargetType, secondsUntilAutoWrapup,
  // Actions
  toggleHold, toggleMute, toggleRecording, endCall, wrapupCall,
  transferCall, consultCall, endConsultCall, consultTransfer,
  consultConference, exitConference, switchToConsult, switchToMainCall,
  cancelAutoWrapup,
}
```

---

## New Approach

### Key Changes

1. **Remove `getControlsVisibility()` call entirely**
2. **Read `task.uiControls` directly** for all control states
3. **Subscribe to `task:ui-controls-updated`** for re-renders
4. **Keep all action methods** (hold, mute, end, etc.) — SDK methods unchanged
5. **Simplify state flags** — derive from `uiControls` or remove entirely
6. **Keep hold timer, auto-wrapup, mute state** — these are widget-layer concerns

### New Hook Return Shape (proposed)
```typescript
{
  // Controls (directly from task.uiControls)
  controls: TaskUIControls,  // { accept, decline, hold, mute, end, transfer, ... }
  // Hook state (kept)
  isMuted: boolean,
  isRecording: boolean,
  holdTime: number,
  buddyAgents: Agent[],
  consultAgentName: string,
  lastTargetType: string,
  secondsUntilAutoWrapup: number,
  // Actions (kept — SDK methods unchanged)
  toggleHold, toggleMute, toggleRecording, endCall, wrapupCall,
  transferCall, consultCall, endConsultCall, consultTransfer,
  consultConference, exitConference, switchToConsult, switchToMainCall,
  cancelAutoWrapup,
}
```

---

## Old → New Mapping Table

### Control Properties

| Old Property | New Property | Change |
|-------------|-------------|--------|
| `accept` | `controls.accept` | Nested under `controls` |
| `decline` | `controls.decline` | Nested under `controls` |
| `end` | `controls.end` | Nested under `controls` |
| `muteUnmute` | `controls.mute` | **Renamed** + nested |
| `holdResume` | `controls.hold` | **Renamed** + nested |
| `pauseResumeRecording` | `controls.recording` | **Renamed** — toggle button (pause/resume) |
| `recordingIndicator` | `controls.recording` | **Same SDK control** — widget must keep separate UI for recording status badge vs toggle. Use `recording.isVisible` for badge, `recording.isEnabled` for toggle interactivity |
| `transfer` | `controls.transfer` | Nested |
| `conference` | `controls.conference` | Nested |
| `exitConference` | `controls.exitConference` | Nested |
| `mergeConference` | `controls.mergeToConference` | **Renamed** + nested |
| `consult` | `controls.consult` | Nested |
| `endConsult` | `controls.endConsult` | Nested |
| `consultTransfer` | `controls.consultTransfer` | Nested (always hidden in new) |
| `consultTransferConsult` | `controls.transfer` / `controls.transferConference` | **Split** — `transfer` for consult transfer, `transferConference` for conference transfer |
| `mergeConferenceConsult` | `controls.mergeToConference` | **Merged** |
| `muteUnmuteConsult` | `controls.mute` | **Merged** |
| `switchToMainCall` | `controls.switchToMainCall` | Nested |
| `switchToConsult` | `controls.switchToConsult` | Nested |
| `wrapup` | `controls.wrapup` | Nested |

### State Flags

| Old Flag | New Approach |
|----------|-------------|
| `isConferenceInProgress` | `controls.exitConference.isVisible` |
| `isConsultInitiated` | `controls.endConsult.isVisible` |
| `isConsultInitiatedAndAccepted` | Removed — SDK handles |
| `isConsultReceived` | Removed — SDK handles |
| `isConsultInitiatedOrAccepted` | `controls.endConsult.isVisible` |
| `isHeld` | `controls.hold` state (visible + disabled = held) |
| `consultCallHeld` | `controls.switchToConsult.isVisible` |

### Actions (Unchanged)

| Action | SDK Method | Change |
|--------|-----------|--------|
| `toggleHold` | `task.hold()` / `task.resume()` | None |
| `toggleMute` | `task.toggleMute()` | None |
| `toggleRecording` | `task.pauseRecording()` / `task.resumeRecording()` | None |
| `endCall` | `task.end()` | None |
| `wrapupCall` | `task.wrapup()` | None |
| `transferCall` | `task.transfer()` | None |
| `consultCall` | `task.consult()` | None |
| `endConsultCall` | `task.endConsult()` | None |
| `consultTransfer` | `task.consultTransfer()` / `task.transferConference()` | None |
| `consultConference` | `task.consultConference()` | None |
| `exitConference` | `task.exitConference()` | None |
| `switchToConsult` | `task.hold(mainMediaId)` + `task.resume(consultMediaId)` | None |
| `switchToMainCall` | `task.hold(consultMediaId)` + `task.resume(mainMediaId)` | None |
| `cancelAutoWrapup` | `task.cancelAutoWrapupTimer()` | None |

---

## Refactor Pattern

### Before
```typescript
export function useCallControl(props: useCallControlProps) {
  const task = store.currentTask;
  
  // OLD: Widget computes controls
  const controls = getControlsVisibility(
    store.deviceType,
    store.featureFlags,
    task,
    store.agentId,
    conferenceEnabled,
    store.logger
  );

  // Event callbacks for hold, resume, end, wrapup, recording
  useEffect(() => {
    if (!task) return;
    store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, task.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, task.data.interactionId);
    // ... 4 more callbacks
    return () => {
      store.removeTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, task.data.interactionId);
      // ... cleanup
    };
  }, [task]);

  return { ...controls, isMuted, isRecording, /* ... actions */ };
}
```

### After
```typescript
export function useCallControl(props: useCallControlProps) {
  const task = store.currentTask;
  
  // NEW: Read SDK-computed controls directly
  const [controls, setControls] = useState<TaskUIControls>(
    task?.uiControls ?? getDefaultUIControls()
  );

  // Subscribe to UI control updates
  useEffect(() => {
    if (!task) {
      setControls(getDefaultUIControls());
      return;
    }
    setControls(task.uiControls);
    const onControlsUpdated = (updatedControls: TaskUIControls) => {
      setControls(updatedControls);
    };
    task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, onControlsUpdated);
    return () => {
      task.off(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, onControlsUpdated);
    };
  }, [task]);

  // Keep event callbacks for actions that need hook-level side effects
  // (hold timer, mute state, recording state)
  useEffect(() => {
    if (!task) return;
    store.setTaskCallback(TASK_EVENTS.TASK_HOLD, holdCallback, task.data.interactionId);
    store.setTaskCallback(TASK_EVENTS.TASK_RESUME, resumeCallback, task.data.interactionId);
    // ... recording callbacks
    return () => { /* cleanup */ };
  }, [task]);

  return { controls, isMuted, isRecording, holdTime, /* ... actions */ };
}
```

---

---

## Newly Discovered Items (Deep Scan)

### 1. Pre-existing Bug: Recording Callback Cleanup Mismatch

**File:** `task/src/helper.ts`, lines 634-653

```typescript
// SETUP uses TASK_EVENTS:
store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, interactionId);

// CLEANUP uses CONTACT_RECORDING (different event name!):
store.removeTaskCallback(TASK_EVENTS.CONTACT_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
store.removeTaskCallback(TASK_EVENTS.CONTACT_RECORDING_RESUMED, resumeRecordingCallback, interactionId);
```

**Impact:** Callbacks are never properly removed on cleanup. Fix during migration by using consistent event names.

### 2. `controlVisibility` Used as `useMemo` + Timer Effect Dependencies

```typescript
// Line 930-933: controlVisibility is a useMemo
const controlVisibility = useMemo(
  () => getControlsVisibility(deviceType, featureFlags, currentTask, agentId, conferenceEnabled, logger),
  [deviceType, featureFlags, currentTask, agentId, conferenceEnabled, logger]
);

// Line 939: Auto-wrapup timer depends on controlVisibility.wrapup
useEffect(() => {
  if (currentTask?.autoWrapup && controlVisibility?.wrapup) { ... }
}, [currentTask?.autoWrapup, controlVisibility?.wrapup]);

// Line 974: State timer depends on controlVisibility
useEffect(() => {
  const stateTimerData = calculateStateTimerData(currentTask, controlVisibility, agentId);
  ...
}, [currentTask, controlVisibility, agentId]);

// Line 982: Consult timer depends on controlVisibility
useEffect(() => {
  const consultTimerData = calculateConsultTimerData(currentTask, controlVisibility, agentId);
  ...
}, [currentTask, controlVisibility, agentId]);
```

**Migration impact:** `calculateStateTimerData()` and `calculateConsultTimerData()` in `timer-utils.ts` accept `controlVisibility` as a parameter. These must be updated to accept `TaskUIControls` instead (with new control names).

### 3. `toggleMute` References Old Control Name

```typescript
// Line 704-705:
if (!controlVisibility?.muteUnmute) {
  logger.warn('Mute control not available', ...);
  return;
}
```

**Migration:** Change to `controls.mute`.

### 4. `wrapupCall` Post-Action State Management

```typescript
// Lines 766-773: After wrapup, sets next task as current and updates agent state
.then(() => {
  const taskKeys = Object.keys(store.taskList);
  if (taskKeys.length > 0) {
    store.setCurrentTask(store.taskList[taskKeys[0]]);
    store.setState({ developerName: ENGAGED_LABEL, name: ENGAGED_USERNAME });
  }
})
```

**Migration:** This logic stays. Post-wrapup task selection is a widget-layer concern.

### 5. `consultTransfer` Uses `currentTask.data.isConferenceInProgress`

```typescript
// Line 898: Decides between consultTransfer vs transferConference
if (currentTask.data.isConferenceInProgress) {
  await currentTask.transferConference();
} else {
  await currentTask.consultTransfer();
}
```

**Migration:** Can replace with `controls.transferConference.isVisible` to decide. But since SDK action methods are unchanged, keeping `data.isConferenceInProgress` is also fine.

### 6. `extractConsultingAgent` — Complex Display Logic (KEEP)

Lines 326-446: ~120 lines of logic to find the consulting agent's name from `interaction.participants` and `callProcessingDetails.consultDestinationAgentName`. This is display-only logic and NOT related to control visibility. **Keep as-is.**

### 7. `useOutdialCall` — `isTelephonyTaskActive` Check

```typescript
const isTelephonyTaskActive = useMemo(() => {
  return Object.values(store.taskList).some(
    (task) => task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER
  );
}, [store.taskList]);
```

**Migration:** Unaffected — this checks media type for outdial gating, not control visibility.

### 8. UIControlConfig — SDK Builds It Internally

Widgets do NOT need to provide UIControlConfig. The SDK builds it from:
- Agent profile → `isEndTaskEnabled`, `isEndConsultEnabled`
- `callProcessingDetails.pauseResumeEnabled` → `isRecordingEnabled`
- `interaction.mediaType` → `channelType` (voice/digital)
- Voice/WebRTC layer → `voiceVariant` (pstn/webrtc)
- `taskManager.setAgentId()` → `agentId`

This means `deviceType`, `featureFlags`, and `conferenceEnabled` props can be removed from `useCallControlProps`. **Note:** `agentId` must be retained — it is still required by `calculateStateTimerData()` and `calculateConsultTimerData()` to look up the agent's participant record from `interaction.participants`.

### 9. `task:wrapup` Race Condition

SDK sample app uses `setTimeout(..., 0)` before updating UI after `task:wrapup`. Consider adding similar guard in hook if wrapup controls flicker.

---

## Timer Utils Migration

**File:** `task/src/Utils/timer-utils.ts`

The `calculateStateTimerData()` and `calculateConsultTimerData()` functions accept `controlVisibility` as a parameter with old control names. These must be migrated:

### Before
```typescript
export function calculateStateTimerData(
  task: ITask,
  controlVisibility: ReturnType<typeof getControlsVisibility>,
  agentId: string
) {
  if (controlVisibility?.wrapup?.isVisible) {
    return { label: 'Wrap Up', timestamp: task.data.wrapUpTimestamp };
  }
  // Uses controlVisibility.isConsultInitiatedOrAccepted, controlVisibility.isHeld, etc.
}
```

### After
```typescript
export function calculateStateTimerData(
  task: ITask,
  controls: TaskUIControls,
  agentId: string
) {
  if (controls.wrapup.isVisible) {
    return { label: 'Wrap Up', timestamp: task.data.wrapUpTimestamp };
  }
  const isConsulting = controls.endConsult.isVisible;
  // Use controls.hold, controls.endConsult, etc.
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/helper.ts` | Refactor `useCallControl` as described above |
| `task/src/Utils/task-util.ts` | Remove or reduce (only keep `findHoldTimestamp`) |
| `task/src/Utils/timer-utils.ts` | Update to accept `TaskUIControls` instead of `controlVisibility` |
| `task/src/task.types.ts` | Update `useCallControlProps` return type |
| `task/tests/helper.ts` | Update all `useCallControl` tests |
| `cc-components/.../CallControl/call-control.tsx` | Update to accept new `controls` prop shape |
| `cc-components/.../CallControl/call-control.utils.ts` | Simplify (remove old control mapping) |

---

## Validation Criteria

- [ ] All 17 SDK controls render correctly in CallControl UI
- [ ] Hold toggle works (CONNECTED ↔ HELD)
- [ ] Mute toggle works (local WebRTC state)
- [ ] Recording toggle works (pause/resume)
- [ ] Consult flow: initiate → switch calls → end/transfer/conference
- [ ] Conference flow: merge → exit → transfer conference
- [ ] Wrapup flow: end → wrapup → complete
- [ ] Auto-wrapup timer works
- [ ] Hold timer displays correctly
- [ ] Digital channel shows only accept/end/transfer/wrapup
- [ ] All action methods still call correct SDK methods

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
