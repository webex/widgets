# CallControl Hook (`useCallControl`) Migration

## Summary

**Status: Done.** `useCallControl` in [`helper.ts`](../../task/src/helper.ts) reads SDK-computed `TaskUIControls` (per-leg: `main`, `consult`, `activeLeg`) instead of `getControlsVisibility()`. Action methods (`task.hold()`, `task.end()`, etc.) are unchanged.

### Dual refresh path for `uiControls`

1. **Store:** `TASK_UI_CONTROLS_UPDATED` → `handleUIControlsUpdated` → `refreshTaskList()` → MobX re-render
2. **Hook:** Direct subscription on `currentTask.on(TASK_UI_CONTROLS_UPDATED)` → `setControls(updatedControls)` for immediate button updates

### Per-leg control access

```typescript
const [controls, setControls] = useState<TaskUIControls>(
  currentTask?.uiControls ?? getDefaultUIControls()
);

// Main leg buttons
controls.main.hold
controls.main.end
controls.main.wrapup

// Consult panel
controls.consult.endConsult
controls.consult.mergeToConference
controls.activeLeg // 'main' | 'consult' — hold/switch UI during consult
```

`buildCallControlButtons()` in [`call-control.utils.ts`](../../cc-components/src/components/task/CallControl/call-control.utils.ts) maps `controls.main.*` and optional consult panel from `controls.consult.*`.

### Props

| Prop | Status |
|------|--------|
| `deviceType`, `featureFlags` | **Removed** — SDK `UIControlConfig` handles gating |
| `conferenceEnabled` | **Retained** — app-level override in button builders |
| `agentId` | **Retained** — timers, buddy agents, participant lookup |

### Dead code removed

`getControlsVisibility` + 22 `get*ButtonVisibility` functions deleted from `task-util.ts`. See [store-task-utils-migration.md](./store-task-utils-migration.md).

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
9. **Consult transfer**: `consultTransfer()` → `task.transfer()` (consult) / `task.transferConference()` (conference) — SDK no longer has `consultTransfer()`, use `.transfer()` for consult
10. **Conference**: `consultConference()` → `task.consultConference()`, `exitConference()` → `task.exitConference()`
11. **Switch calls**: `switchToConsult()` → `task.hold(mainMediaId)` (single call), `switchToMainCall()` → `task.resume(consultMediaId)` (single call)
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

### Control Properties (per-leg)

Access via `controls.main.*` or `controls.consult.*`:

| Old Property | New Property | Change |
|-------------|-------------|--------|
| `accept` | `controls.main.accept` | Per-leg |
| `decline` | `controls.main.decline` | Per-leg |
| `end` | `controls.main.end` | Per-leg |
| `muteUnmute` | `controls.main.mute` | **Renamed** |
| `holdResume` | `controls.main.hold` | **Renamed** |
| `pauseResumeRecording` | `controls.main.recording` | **Renamed** |
| `recordingIndicator` | `controls.main.recording` | Same control — badge vs toggle in UI |
| `transfer` | `controls.main.transfer` | Per-leg |
| `conference` | `controls.main.conference` / `controls.consult.conference` | Per-leg |
| `exitConference` | `controls.main.exitConference` | Per-leg |
| `mergeConference` | `controls.main.mergeToConference` | **Renamed** |
| `consult` | `controls.main.consult` | Initiate consult button |
| `endConsult` | `controls.consult.endConsult` | Consult panel |
| `consultTransfer` | `controls.main.transfer` / `controls.consult.transfer` | `consultTransfer` hidden in SDK |
| `switchToMainCall` / `switchToConsult` | `controls.main.switch` / `controls.consult.switch` | **Renamed** to `switch` |
| `wrapup` | `controls.main.wrapup` | Per-leg |

### State Flags

| Old Flag | New Approach |
|----------|-------------|
| `isConferenceInProgress` | Use `task.data.isConferenceInProgress` (SDK computes and provides directly). For visibility-only gating, `controls.exitConference.isVisible` also works. Do NOT call the store helper `getIsConferenceInProgress` — it is dead code. |
| `isConsultInitiated` | **Do NOT use `controls.endConsult.isVisible` as "initiated only"** — that control is visible for both initiated and accepted consult. Use `task.data.consultStatus` to distinguish phases (e.g. `consultInitiated` vs `consultAccepted`). |
| `isConsultInitiatedAndAccepted` | Removed — SDK handles |
| `isConsultReceived` | Removed — SDK handles |
| `isConsultInitiatedOrAccepted` | `controls.endConsult.isVisible` |
| `isHeld` | **Do NOT derive from `controls.hold.isEnabled`** — get from the task object (SDK state machine tracks hold state internally). `controls.hold.isEnabled` is an action flag (whether the hold button is clickable), not the actual hold state — it can be `false` during consult/conference even when the call is not held. `findHoldStatus()` is dead code and will be removed (see [store-task-utils-migration.md](./store-task-utils-migration.md)). |
| `consultCallHeld` | **Do NOT use `controls.switchToConsult.isVisible`** — that reflects button visibility, not actual hold state. Get from the task object. `findHoldStatus()` is dead code and will be removed. |

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
| `consultTransfer` | `task.transfer()` (consult) / `task.transferConference()` (conference) | `consultTransfer()` no longer exists — use `.transfer()` for all non-conference transfer |
| `consultConference` | `task.consultConference()` | None |
| `exitConference` | `task.exitConference()` | None |
| `switchToConsult` | `task.hold(mainMediaId)` | Single SDK call — holds main call; SDK auto-switches to consult leg |
| `switchToMainCall` | `task.resume(consultMediaId)` | Single SDK call — resumes consult leg; SDK auto-switches to main call |
| `cancelAutoWrapup` | `task.cancelAutoWrapupTimer()` | None |

---

## Refactor Pattern

### Before
```typescript
export function useCallControl(props: useCallControlProps) {
  const task = props.currentTask;
  
  // OLD: Widget computes controls
  const controls = getControlsVisibility(
    props.deviceType,
    props.featureFlags,
    task,
    props.agentId,
    conferenceEnabled,
    props.logger
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

### After (current implementation)
```typescript
export function useCallControl(props: useCallControlProps) {
  const task = props.currentTask;

  const [controls, setControls] = useState<TaskUIControls>(
    task?.uiControls ?? getDefaultUIControls()
  );

  useEffect(() => {
    if (!task) {
      setControls(getDefaultUIControls());
      return;
    }
    setControls(task.uiControls ?? getDefaultUIControls());
    const onControlsUpdated = (updatedControls: TaskUIControls) => {
      setControls(updatedControls);
    };
    task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, onControlsUpdated);
    return () => {
      task.off(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, onControlsUpdated);
    };
  }, [task]);

  // isHeld: isInteractionOnHold + consult activeLeg + conference hold flags
  // ... event callbacks for hold, recording, wrapup host notifications ...

  return { controls, isHeld, isMuted, isRecording, conferenceEnabled, /* actions */ };
}
```

---

## Newly Discovered Items (Deep Scan)

### 1. Recording Callback Cleanup — Event Name Alignment (Fixed)

**File:** `task/src/helper.ts`, lines 634-653

**Rule:** Use the same event name in both `setTaskCallback` and `removeTaskCallback` so cleanup matches registration. The store registers with `task.on(event, callback)` and removes with `task.off(event, callback)`; mismatched event names leave listeners attached.

```typescript
// Correct: use TASK_RECORDING_* in BOTH set and remove
store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
store.setTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, interactionId);
// ...
store.removeTaskCallback(TASK_EVENTS.TASK_RECORDING_PAUSED, pauseRecordingCallback, interactionId);
store.removeTaskCallback(TASK_EVENTS.TASK_RECORDING_RESUMED, resumeRecordingCallback, interactionId);
```

**Note:** Keep `AGENT_WRAPPEDUP` for wrapup until SDK migration renames to `TASK_WRAPPEDUP`; then align both set and remove to the new name.

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
// Line 898: Decides between transfer (consult) vs transferConference
if (currentTask.data.isConferenceInProgress) {
  await currentTask.transferConference();
} else {
  await currentTask.transfer();  // consultTransfer() no longer exists — use .transfer()
}
```

**Migration:** Prefer **`currentTask.data.isConferenceInProgress`** (direct variable from SDK task data; see State Flags table). Alternatively use `controls.transferConference.isVisible` to decide. **Note:** `task.consultTransfer()` is no longer a public method; use `task.transfer()` for consult transfer.

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

Widgets do NOT need to provide UIControlConfig. The SDK builds it from agent profile, `callProcessingDetails`, `interaction.mediaType`, and voice/WebRTC layer config. See "Props removed" table in Summary and Migration Gotcha #1 for details. **Retain `agentId`** — required by timer utils for participant lookup.

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
  const isConferencing = task.data.isConferenceInProgress;
  // Get hold state from task object — do NOT use controls.hold.isEnabled
}
```

---

## helper.ts useCallControl — Exact Code Locations

| Area | Lines | What to change |
|------|-------|----------------|
| Event registration/cleanup | 634-653 | Use same event names in set and remove (e.g. TASK_RECORDING_* in both). |
| controlVisibility useMemo | 930-933 | Replace with `controls` from `currentTask.uiControls` (SDK handles feature-flag gating internally). |
| toggleMute guard | 704-705 | Change `controlVisibility?.muteUnmute` to `controls?.mute?.isVisible`. |
| Auto-wrapup effect | 935-968 | Depend on `controls?.wrapup` instead of `controlVisibility?.wrapup`. |
| State/consult timer effects | 970-984 | Pass `controls` into `calculateStateTimerData` / `calculateConsultTimerData`; update timer-utils to accept `TaskUIControls`. |
| Return object | 1016 | Return `controls` instead of `controlVisibility`. |

---

## Migration Gotchas

1. **`UIControlConfig` is built by SDK:** Widgets do NOT provide it. The SDK handles feature-flag gating internally via `config.isEndTaskEnabled`, `config.isEndConsultEnabled`, `config.isRecordingEnabled`. Widget props `deviceType` and `featureFlags` can be **removed**. **`conferenceEnabled` is RETAINED** — it is an application-level config (not a feature flag) that gates conference UI at the consumer level. There is no `applyFeatureGates` function. **Retain `agentId`** — timer utils need it for participant lookup.

2. **`isHeld` derivation:** Hold control can be `VISIBLE_DISABLED` in conference/consulting states without meaning the call is held. Do NOT derive from `controls.hold.isEnabled` — it is an action flag (button clickability), not hold state. Get hold state from the task object (SDK tracks hold state internally). `findHoldStatus()` is dead code and will be removed (see [store-task-utils-migration.md](./store-task-utils-migration.md)).

3. **Recording control semantics:** `recording.isEnabled` means the toggle button is **actionable** (clickable), not that recording is active. Active/paused state should come from recording events (`TASK_RECORDING_PAUSED`/`TASK_RECORDING_RESUMED`) or task state — not from `isEnabled`. Use `recording.isVisible` for the recording badge/indicator.

4. **`exitConference` visibility change:** In the new SDK, `exitConference` is `VISIBLE_DISABLED` (not hidden) during consulting-from-conference. Old widget logic hid it.

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/helper.ts` | Refactor `useCallControl` as described above |
| `task/src/Utils/task-util.ts` | Delete `getControlsVisibility` + all 22 `get*ButtonVisibility` functions (dead code). Keep `findHoldTimestamp(interaction, mType)` for hold timer. `findHoldStatus` is dead code — remove it. |
| `task/src/Utils/timer-utils.ts` | Update to accept `TaskUIControls` instead of `controlVisibility` |
| `task/src/task.types.ts` | Update `useCallControlProps` return type |
| `task/tests/helper.ts` | Update all `useCallControl` tests |
| `cc-components/.../CallControl/call-control.tsx` | Update to accept new `controls` prop shape |
| `cc-components/.../CallControl/call-control.utils.ts` | Simplify (remove old control mapping) |

---

## Validation Criteria

| Criterion | Status |
|-----------|--------|
| SDK controls render in CallControl UI (main + consult legs) | **Done** |
| Hold / mute / recording / consult / conference / wrapup flows | **Done** |
| Auto-wrapup and hold timers | **Done** |
| `conferenceEnabled` app-level gating | **Done** |
| `getControlsVisibility` removed | **Done** |
| All actions call correct SDK methods | **Done** |

---

_Parent: [migration-overview.md](./migration-overview.md)_
_Updated: 2026-05-20_

---

## Migration Fix Log

### Fix: `isHeld` Reactivity — Hold Button State and Multi-Login Sync

- **Issue**: After migration, the hold button icon/tooltip did not toggle on click, and multi-login hold/resume did not sync across systems.
- **Root Cause**: The old `controlVisibility.isHeld` was removed. `controls.hold.isEnabled` is an action flag, not state. `task.data.isOnHold` is not populated by SDK at runtime. The SDK state machine also lacked `HOLD_SUCCESS`/`UNHOLD_SUCCESS` transitions for multi-login scenarios.
- **SDK Source of Truth**: `uiControlsComputer.ts` derives `isHeld` from `serverHold ?? state === TaskState.HELD`. `controls.hold` is `VISIBLE_ENABLED` in both `CONNECTED` and `HELD` states — it's an action flag, not a state indicator.
- **Fix Pattern** (in `useCallControl` hook — `helper.ts`):
  ```typescript
  import { isInteractionOnHold } from '@webex/cc-store';

  const [isHeld, setIsHeld] = useState<boolean>(() =>
    currentTask ? isInteractionOnHold(currentTask) : false
  );

  useEffect(() => {
    setIsHeld(currentTask ? isInteractionOnHold(currentTask) : false);
  }, [currentTask]);

  // In holdCallback: setIsHeld(true);
  // In resumeCallback: setIsHeld(false);
  // Return isHeld from hook
  ```
- **SDK Fix**: Added `HOLD_SUCCESS` handler to `CONNECTED` state and `UNHOLD_SUCCESS` handler to `HELD` state in `TaskStateMachine.ts` for multi-login sync.

### Fix: Restore `conferenceEnabled` Prop — Application-Level Conference Gating

- **Issue**: During the task-refactor migration, the `conferenceEnabled` prop was removed from the widget APIs. This prop is **not a feature flag** — it is an application-level configuration passed from `App.tsx` that controls whether conference-related UI controls should be available to the agent. Without it, applications cannot disable conference features regardless of SDK `uiControls`.
- **Root Cause**: The migration assumed all UI visibility is driven exclusively by `task.uiControls` from the SDK state machine. However, `conferenceEnabled` is an application-level override that gates conference availability at the consumer level, independent of the SDK's computed state.
- **Design Decision (Option A — Widget-Side Override at Button Level)**: `conferenceEnabled` is applied directly in the button builder functions (`buildCallControlButtons` and `createConsultButtons`) where conference-related buttons are defined. When `false`, the `isVisible` property of conference buttons (`conference`, `exitConference`, `merge`) is forced to `false` regardless of SDK `uiControls`. When `true` (default), SDK controls pass through unchanged.
- **Gating Pattern** (in button builder functions):
  ```typescript
  // call-control.utils.ts — buildCallControlButtons
  // conferenceEnabled param defaults to true
  {
    id: 'conference',
    isVisible: conferenceEnabled && (controls?.mergeToConference?.isVisible ?? false) && !!handleConsultConferencePress,
  },
  {
    id: 'exitConference',
    isVisible: conferenceEnabled && (controls?.exitConference?.isVisible ?? false),
  },

  // call-control-custom.utils.ts — createConsultButtons
  {
    key: 'conference',
    isVisible: conferenceEnabled && (controls?.mergeToConference?.isVisible ?? false),
  },
  ```
- **Prop Flow**: `App.tsx` → `CallControl`/`CallControlCAD` → `useCallControl` hook → returned as prop → `CallControlComponent` → `buildCallControlButtons()` / `CallControlConsultComponent` → `createConsultButtons()`
- **Files Changed**:
  - `cc-components/…/task.types.ts`: Added `conferenceEnabled: boolean` to `ControlProps`, `CallControlComponentProps`, `CallControlConsultComponentsProps`
  - `cc-components/…/call-control.utils.ts`: Added `conferenceEnabled` param to `buildCallControlButtons`, gated `conference` and `exitConference` buttons
  - `cc-components/…/call-control-custom.utils.ts`: Added `conferenceEnabled` param to `createConsultButtons`, gated `conference` (merge) button
  - `cc-components/…/call-control.tsx`: Destructured `conferenceEnabled`, passed to `buildCallControlButtons`
  - `cc-components/…/call-control-consult.tsx`: Destructured `conferenceEnabled`, passed to `createConsultButtons`
  - `cc-components/…/call-control-cad.tsx`: Destructured `conferenceEnabled`, passed to `CallControlConsultComponent`
  - `task/src/task.types.ts`: Added `conferenceEnabled` to `CallControlProps` and `useCallControlProps`
  - `task/src/helper.ts`: Destructured `conferenceEnabled` (default `true`), returned from hook
  - `task/src/CallControl/index.tsx` and `CallControlCAD/index.tsx`: Pass `conferenceEnabled` to `useCallControl`
  - `cc-widgets/src/wc.ts`: Exposed `conferenceEnabled` as r2wc `boolean` prop on `WebCallControl` and `WebCallControlCAD`
- **Consumer Usage**: Apps pass `conferenceEnabled={true|false}` as a prop to `<CallControl>` or `<CallControlCAD>`. Web component consumers set the `conference-enabled` attribute. Defaults to `true` if not provided.
- **Result**: Conference buttons (merge, exit conference) are hidden when `conferenceEnabled` is `false`, while all other SDK-driven controls remain unaffected.
