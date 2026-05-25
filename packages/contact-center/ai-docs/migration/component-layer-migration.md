# Component Layer (`cc-components`) Migration

## Summary

**Status: Done.** Presentational components consume SDK `TaskUIControls` with **per-leg** structure (`main`, `consult`, `activeLeg`). The old flat `ControlVisibility` interface (22 controls + 7 state flags) is replaced by `TaskUIControls` imported from `@webex/cc-store`.

### Source of truth — the task object (`ITask`)

- **Control visibility/enablement:** `task.uiControls.main.*` and `task.uiControls.consult.*`
- **Active leg during consult:** `task.uiControls.activeLeg` (`'main'` | `'consult'`)
- **Hold state:** `isHeld` prop from hook (`isInteractionOnHold` + consult/conference logic) — not `controls.main.hold.isEnabled`
- **Conference state:** interaction `state === 'conference'` / task data — not `exitConference.isVisible` alone

Widgets do not call `getControlsVisibility()` or `findHoldStatus()`.

---

## ControlVisibility Interface — Replaced by `TaskUIControls`

**File:** `cc-components/src/components/task/task.types.ts`

```typescript
import type { TaskUIControls, InteractionUIControls, TaskUILeg } from '@webex/cc-store';

// TaskUIControls shape (SDK):
// {
//   main: InteractionUIControls;
//   consult: InteractionUIControls;
//   activeLeg: 'main' | 'consult';
// }
```

### Per-leg control mapping (main leg)

| Old flat prop | New path | Notes |
|---------------|----------|-------|
| `holdResume` | `controls.main.hold` | Renamed |
| `muteUnmute` | `controls.main.mute` | Renamed |
| `pauseResumeRecording` / `recordingIndicator` | `controls.main.recording` | Single control; UI splits badge vs toggle |
| `mergeConference` | `controls.main.mergeToConference` | Renamed |
| `switchToMainCall` / `switchToConsult` | `controls.main.switch` / `controls.consult.switch` | Renamed to `switch` |
| State flags (`isConsultInitiated`, etc.) | Removed from props | Use `controls.consult.endConsult`, `task.data`, or hook `isHeld` |

CallControl passes `controls: TaskUIControls` to `buildCallControlButtons(controls.main, ...)` and consult panel via `createConsultButtons(controls.consult, ...)`.

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
| `mergeConference` | `mergeToConference` | **Rename**. SDK also has a separate `conference` control; both are visible during consulting when initiator, agent joined, and not at max participants. Use `mergeToConference` for the Merge action; `conference` is a semantic alias for the same merge-from-consult flow. |
| `consultTransferConsult` | `transfer` / `transferConference` | **Split** — use `transfer` for consult transfer, `transferConference` for conference transfer |
| `mergeConferenceConsult` | — | **Remove** (use `mergeToConference`) |
| `muteUnmuteConsult` | — | **Remove** (use `mute`) |
| `isConferenceInProgress` | — | **Remove** (use `task.data.isConferenceInProgress` directly; do not use `controls.exitConference.isVisible` as sole source) |
| `isConsultInitiated` | — | **Remove** (if needed, use `task.data.consultStatus` for consult phase distinction) |
| `isConsultInitiatedAndAccepted` | — | **Remove** |
| `isConsultReceived` | — | **Remove** |
| `isConsultInitiatedOrAccepted` | — | **Remove** |
| `isHeld` | `isHeld` | **Retain** — get from the task object (SDK provides hold state). Do NOT derive from `controls.hold.isEnabled`. |
| `consultCallHeld` | — | **Remove** (get from the task object if needed for display) |

#### Current Interface

```typescript
interface CallControlComponentProps {
  controls: TaskUIControls;  // { main, consult, activeLeg } from task.uiControls
  isHeld: boolean;           // Hook-derived; not controls.main.hold.isEnabled
  conferenceEnabled: boolean; // App-level gating
  // ... actions, buddyAgents, consultAgentName, media state
}
```

### CallControlConsult
**File:** `packages/contact-center/cc-components/src/components/task/CallControl/CallControlCustom/call-control-consult.tsx`

- Uses `controls.consult.endConsult`, `controls.consult.mergeToConference`, `controls.consult.switch`
- Main-leg switch via `controls.main.switch` when on consult leg
- `conferenceEnabled` gates merge/conference buttons

### IncomingTaskComponent

- Accept/decline from `acceptControl` / `declineControl` props (from `uiControls.main`)
- `isBrowser` **retained** for outdial accept label text ("Accept" vs "Ringing...")
- `isDeclineButtonEnabled` **retained** as legacy bridge OR'd with SDK decline enablement

### TaskListComponent

- Same per-task `uiControls.main.accept/decline` via `extractTaskListItemData`
- `isBrowser` retained for outdial label rules

### CallControlCADComponent

- Receives `controls: TaskUIControls` and `isHeld` from hook
- **Outdial header number:** `displayNumber` uses `dnis` for outdial, `ani` for inbound (header title)
- **Phone Number label:** continues to use `ani` (PROD parity)
- `conferenceEnabled` passed to consult sub-component

### OutdialCallComponent

- **No uiControls** — dial UI only; failure popup via host `setOutdialFailed`

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

### After (current implementation)

CallControl receives full `TaskUIControls` and `buildCallControlButtons` reads **`controls.main`** for the main strip and **`controls.consult`** for the consult panel (via `createConsultButtons`).

```tsx
// call-control.tsx — current approach
const CallControlComponent = ({
  controls,         // TaskUIControls { main, consult, activeLeg }
  isHeld,           // From hook (isInteractionOnHold + consult/conference logic)
  isMuted, isRecording, holdTime, conferenceEnabled,
  onToggleHold, onToggleMute, onEndCall, ...
}: CallControlComponentProps) => {
  const buttons = buildCallControlButtons(
    isMuted, isRecording, isMuteButtonDisabled, currentMediaType,
    controls, isHeld, ..., conferenceEnabled
  );
  const filteredButtons = filterButtonsForConsultation(buttons, controls);
  // Consult strip: createConsultButtons(controls.consult, ...)
};
```

Inside `buildCallControlButtons`, main-leg buttons use `controls.main.*`:

```typescript
const mainCtrl = controls?.main;
// mainCtrl.hold, mainCtrl.mute, mainCtrl.transfer, mainCtrl.switch, etc.
```

---

## Deriving State Flags from Controls

| Old flag | Current source |
|----------|----------------|
| `isConferenceInProgress` | Interaction `state === 'conference'` or task data |
| `isConsultInitiatedOrAccepted` | `controls.consult.endConsult.isVisible` or `controls.main.endConsult.isVisible` |
| `isHeld` | Hook prop from `isInteractionOnHold` + consult/conference hold events — **not** `controls.main.hold.isEnabled` |
| `activeLeg` | `controls.activeLeg` (`'main'` \| `'consult'`) for switch/hold UI |

---

## Critical Utility Files

### 1. `buildCallControlButtons()` — call-control.utils.ts

Takes full `TaskUIControls`; reads **`controls.main`** for the main button strip.

| Old Reference | New Equivalent |
|--------------|---------------|
| `controlVisibility.muteUnmute` | `controls.main.mute` |
| `controlVisibility.isHeld` | `isHeld` param (hook-derived) |
| `controlVisibility.holdResume` | `controls.main.hold` |
| `controlVisibility.consult` | `controls.main.consult` |
| `controlVisibility.transfer` | `controls.main.transfer` |
| `controlVisibility.mergeConference` | `controls.main.mergeToConference` / `controls.main.conference` |
| `controlVisibility.pauseResumeRecording` | `controls.main.recording` |
| `controlVisibility.exitConference` | `controls.main.exitConference` (gated by `conferenceEnabled`) |
| Consult transfer during active consult | Shown when `controls.consult.endConsult` or `controls.main.endConsult` visible |

### 2. `createConsultButtons()` — call-control-custom.utils.ts

Reads **`controls.consult`** for the consult strip.

| Old Reference | New Equivalent |
|--------------|---------------|
| `controlVisibility.muteUnmuteConsult` | `controls.consult.mute` |
| `controlVisibility.switchToMainCall` / `switchToConsult` | `controls.consult.switch` / `controls.main.switch` |
| `controlVisibility.consultTransferConsult` | `controls.consult.transfer` / `controls.consult.consultTransfer` |
| `controlVisibility.mergeConferenceConsult` | `controls.consult.mergeToConference` |
| `controlVisibility.endConsult` | `controls.consult.endConsult` |

### 3. `filterButtonsForConsultation()` — call-control.utils.ts

```typescript
// OLD: uses consultInitiated flag (from getControlsVisibility state flags)
// NEW: use task.data.consultStatus from SDK for accurate consult phase.
//      Do NOT derive consult-init state from controls.endConsult.isVisible (it spans both initiated and accepted).
//      e.g. task.data.consultStatus === 'consultInitiated' for "initiated only" distinction.
```

### 4. `getConsultStatusText()` — call-control-custom.utils.ts

```typescript
// OLD: uses consultInitiated boolean (derived from getControlsVisibility state flags)
// NEW: use task.data.consultStatus from SDK for accurate consult phase.
//      e.g. task.data.consultStatus === 'consultInitiated' → 'Consult requested'
//           task.data.consultStatus === 'consultAccepted'  → 'Consulting'
//      Do NOT derive from control visibility (endConsult.isVisible, mergeToConference.isEnabled);
//      visibility can change for feature gating and misclassify phase.
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
// NEW: use task.data.isConferenceInProgress (SDK provides directly); not controls.exitConference.isVisible
```

### `ControlProps` — task.types.ts (Master Interface)
- `controlVisibility: ControlVisibility` → `controls: TaskUIControls`
- `isHeld: boolean` → get from the task object (SDK provides hold state); remove `findHoldStatus` derivation
- `deviceType: string` → REMOVE (SDK handles)
- `featureFlags: {[key: string]: boolean}` → REMOVE (SDK handles)
- ~~`conferenceEnabled: boolean` → REMOVE~~ **RESTORED** — application-level config (not a feature flag), applied at button builder level
- `agentId: string` → RETAIN (needed for timer participant lookup)

### `CallControlCAD` — task package and cc-components view
- **task/src/CallControlCAD/index.tsx:** `deviceType` and `featureFlags` are used today in `getControlsVisibility` (task-util.ts lines 421–525). The **SDK** handles feature-flag-like gating internally via `config.isEndTaskEnabled`, `config.isEndConsultEnabled`, `config.isRecordingEnabled` from agent profile and `callProcessingDetails`. Since widgets will read `task.uiControls` instead of calling `getControlsVisibility`, `deviceType` and `featureFlags` can be **removed** — the SDK has already computed them. **`conferenceEnabled` is RETAINED** — it is an application-level configuration (not a feature flag) passed from the consumer app. **Retain `agentId`** for timer participant lookup.
- **cc-components/.../CallControlCAD/call-control-cad.tsx:** This view consumes `controlVisibility` (and related state flags such as `isConferenceInProgress`, `isHeld`, `isConsultReceived`, `recordingIndicator`, `isConsultInitiatedOrAccepted`). It must be updated to use `TaskUIControls` and the new prop shape when replacing `ControlVisibility`; otherwise migration will leave stale references and break at compile or runtime.

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

**Status: Done.** Utils and WC layer updated for per-leg `uiControls`.

### Current: Utils (accept/decline and task list data)

#### `extractIncomingTaskData` (incoming-task.utils.tsx)

**Current:** Uses `uiControls.main.accept/decline` (or caller-passed `acceptControl`/`declineControl`). **`isBrowser` retained** for outdial accept label ("Accept" vs "Ringing..."). **`isDeclineButtonEnabled` retained** as legacy bridge OR'd with SDK decline enablement.

```typescript
export const extractIncomingTaskData = (
  incomingTask: ITask,
  logger?,
  acceptControl?: {isVisible: boolean; isEnabled: boolean},
  declineControl?: {isVisible: boolean; isEnabled: boolean},
  isDeclineButtonEnabled?: boolean,
  isBrowser?: boolean
): IncomingTaskData => {
  const accept = acceptControl ?? incomingTask?.uiControls?.main?.accept ?? {isVisible: false, isEnabled: false};
  const sdkDecline = declineControl ?? incomingTask?.uiControls?.main?.decline ?? {...};
  const decline = { ...sdkDecline, isEnabled: sdkDecline.isEnabled || !!isDeclineButtonEnabled };
  const showRinging = isTelephony && !accept.isEnabled && !(isBrowser && isOutdial);
  const acceptText = accept.isVisible ? (showRinging ? 'Ringing...' : 'Accept') : undefined;
  // ...
};
```

#### `extractTaskListItemData` (task-list.utils.ts)

**Current:** Same per-leg controls + legacy decline bridge + `isBrowser` for outdial label rules.

```typescript
export const extractTaskListItemData = (
  task: ITask,
  agentId: string,
  logger?: ILogger,
  isDeclineButtonEnabled?: boolean,
  isBrowser?: boolean
): TaskListItemData => {
  const accept = task.uiControls?.main?.accept ?? {isVisible: false, isEnabled: false};
  const decline = { ...sdkDecline, isEnabled: sdkDecline.isEnabled || !!isDeclineButtonEnabled };
  // Same showRinging / acceptText logic as IncomingTask
};
```

### Current: CallControlCAD view (call-control-cad.tsx)

**Current:** Receives `controls: TaskUIControls`, `isHeld` from hook, and `conferenceEnabled`.

```tsx
// Outdial header uses dnis; inbound uses ani
const displayNumber = isOutdial ? dnis || ani : ani;

// Hold chip, recording badge, consult panel use controls.main / controls.consult
<CallControlComponent controls={controls} isHeld={isHeld} conferenceEnabled={conferenceEnabled} ... />
```

### Before/After: Web Component layer (wc.ts)

**Before:** IncomingTask and TaskList Web Components expose `isBrowser` as a boolean prop.

```typescript
const WebIncomingTask = r2wc(IncomingTaskComponent, {
  props: {
    incomingTask: 'json',
    isBrowser: 'boolean',
    accept: 'function',
    reject: 'function',
  },
});
const WebTaskList = r2wc(TaskListComponent, {
  props: {
    currentTask: 'json',
    taskList: 'json',
    isBrowser: 'boolean',
    acceptTask: 'function',
    declineTask: 'function',
    logger: 'function',
  },
});
```

**Current:** `isBrowser` is **retained** on Web IncomingTask and Web TaskList for outdial accept label text. Visibility comes from `uiControls.main`; `isBrowser` is not used to gate button visibility.

```typescript
const WebIncomingTask = r2wc(IncomingTaskComponent, {
  props: {
    incomingTask: 'json',
    isBrowser: 'boolean', // Outdial label text only
    acceptControl: 'json',
    declineControl: 'json',
    isDeclineButtonEnabled: 'boolean',
    accept: 'function',
    reject: 'function',
  },
});
```

`conferenceEnabled` exposed on `WebCallControl` and `WebCallControlCAD`.

---

| File | Status | Notes |
|------|--------|-------|
| `task.types.ts` | **Done** | `TaskUIControls` replaces `ControlVisibility` |
| `CallControl/call-control.tsx` | **Done** | Uses `controls: TaskUIControls` |
| `CallControl/call-control.utils.ts` | **Done** | `buildCallControlButtons` reads `controls.main` |
| `CallControlCustom/call-control-custom.utils.ts` | **Done** | `createConsultButtons` reads `controls.consult` |
| `IncomingTask/incoming-task.utils.tsx` | **Done** | `uiControls.main` + `isBrowser` + decline bridge |
| `TaskList/task-list.utils.ts` | **Done** | Same pattern as IncomingTask |
| `CallControlCAD/call-control-cad.tsx` | **Done** | Outdial `displayNumber` from `dnis` |
| `wc.ts` | **Done** | `isBrowser` retained for outdial labels; `conferenceEnabled` on CallControl |
| Component tests | **Done** | Mocks updated for `TaskUIControls` |

---

## Validation Criteria

| Criterion | Status |
|-----------|--------|
| CallControl uses `TaskUIControls` (main + consult legs) | **Done** |
| `buildCallControlButtons` / `createConsultButtons` | **Done** |
| IncomingTask / TaskList per-task main controls | **Done** |
| CallControlCAD outdial `dnis` header display | **Done** |
| `conferenceEnabled` app-level gating | **Done** |
| `isBrowser` for outdial labels (WC + React) | **Done** |
| Component tests updated | **Done** |

---

_Parent: [migration-overview.md](./migration-overview.md)_
_Updated: 2026-05-20_

---

## Migration Fix Log

### Fix: Duplicate Transfer Button — Wrong `uiControls` Field Mapping

- **Issue**: After accepting a call, both "Transfer" and "Transfer Call" buttons appeared simultaneously.
- **Fix**: `transferConsult` button visibility gated on active consult (`controls.consult.endConsult` or `controls.main.endConsult`) and uses `controls.main.transfer` — not the main blind-transfer button alone.
- **Result**: Main "Transfer" shows in `CONNECTED`; consult-strip transfer only during active consultation.

### Fix: Hold Button Icon/Tooltip Not Toggling & Multi-Login Hold State Not Syncing

- **Issue**: (1) After clicking Hold, the button icon stayed as pause and tooltip stayed as "Hold the call" instead of changing to play/"Resume the call". (2) In multi-login scenarios, holding/resuming on one system did not reflect on the other system.
- **Root Cause**:
  - The old `controlVisibility.isHeld` was removed during migration. The replacement `controls.hold.isEnabled` is an **action flag** (can the user click hold?), not the current hold state. `task.data.isOnHold` exists in SDK types but is not populated at runtime.
  - For multi-login: The SDK's `TaskStateMachine.ts` `CONNECTED` state had no handler for `HOLD_SUCCESS` (another system held), and `HELD` state had no handler for `UNHOLD_SUCCESS` (another system resumed). These events were silently dropped.
- **Fix (Widgets)**:
  - `helper.ts` (`useCallControl` hook): Added `useState(isHeld)` initialized from `isInteractionOnHold(currentTask)`. Updated `holdCallback` to `setIsHeld(true)` and `resumeCallback` to `setIsHeld(false)`. Added `useEffect([currentTask])` to re-sync from `isInteractionOnHold` on task reference changes (covers multi-login `refreshTaskList`).
  - `call-control.utils.ts`: Added `isHeld: boolean` parameter to `buildCallControlButtons()`. Hold button uses `isHeld ? 'play-bold' : 'pause-bold'` for icon and `isHeld ? RESUME_CALL : HOLD_CALL` for tooltip.
  - `call-control.tsx`: Destructured `isHeld` from props, passed to `buildCallControlButtons()` and `handleToggleHoldUtil()`.
  - `task.types.ts`: Added `'isHeld'` to `CallControlComponentProps` pick list.
- **Fix (SDK)**: Added `HOLD_SUCCESS` transition in `CONNECTED` state and `UNHOLD_SUCCESS` transition in `HELD` state of `TaskStateMachine.ts`, both with actions `['updateTaskData', 'setHoldState', 'emitTaskHold'/'emitTaskResume']`.
- **Result**: Hold button icon/tooltip toggles correctly on click. Multi-login hold/resume state syncs across systems via SDK state machine transitions.

### Fix: Restore `conferenceEnabled` Prop — Application-Level Conference Gating

- **Issue**: The `conferenceEnabled` prop was removed from widget APIs during migration. This is an application-level configuration (not a feature flag) passed from the consumer app that controls whether conference-related UI controls are available to the agent.
- **Root Cause**: The migration assumed all UI visibility is exclusively SDK-driven. However, `conferenceEnabled` is a consumer-level override independent of SDK state.
- **Design Decision**: Option A — widget-side override applied directly at the button builder level. When `conferenceEnabled` is `false`, the `isVisible` property of conference-related buttons (`conference`, `exitConference`, `merge`) is forced to `false` in `buildCallControlButtons()` and `createConsultButtons()`. Defaults to `true`.
- **Component-Layer Changes**:
  - `task.types.ts`: Added `conferenceEnabled: boolean` to `ControlProps`, `CallControlComponentProps`, `CallControlConsultComponentsProps`
  - `call-control.utils.ts`: Added `conferenceEnabled` param to `buildCallControlButtons()`, gated `conference` and `exitConference` buttons via `conferenceEnabled && (controls?.…isVisible)`
  - `call-control-custom.utils.ts`: Added `conferenceEnabled` param to `createConsultButtons()`, gated `conference` (merge) button
  - `call-control.tsx`: Destructured `conferenceEnabled` from props, passed to `buildCallControlButtons()`
  - `call-control-consult.tsx`: Destructured `conferenceEnabled`, passed to `createConsultButtons()`
  - `call-control-cad.tsx`: Destructured `conferenceEnabled`, passed to `CallControlConsultComponent`
  - `cc-widgets/src/wc.ts`: Exposed `conferenceEnabled` as r2wc `boolean` prop on `WebCallControl` and `WebCallControlCAD`
- **No SDK changes required**: Gating is applied at the widget component layer directly on button definitions.
- **Result**: Conference merge and exit buttons are hidden when `conferenceEnabled={false}`. All other SDK-driven controls remain unaffected.
