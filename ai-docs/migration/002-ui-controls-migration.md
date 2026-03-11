# Migration Doc 002: UI Controls — `getControlsVisibility()` → `task.uiControls`

## Summary

The largest single change in this migration. CC Widgets currently computes all call control button visibility/enabled states in `task-util.ts::getControlsVisibility()` (~650 lines). The new SDK provides `task.uiControls` as a pre-computed `TaskUIControls` object driven by the state machine, making the widget-side computation redundant.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/task/src/Utils/task-util.ts`
**Function:** `getControlsVisibility(deviceType, featureFlags, task, agentId, conferenceEnabled, logger)`

### How It Works (Old)
1. Widget calls `getControlsVisibility()` on every render/task update
2. Function inspects raw `task.data.interaction` to derive:
   - Media type (telephony, chat, email)
   - Device type (browser, agentDN, extension)
   - Consult status (via `getConsultStatus()` from store utils)
   - Hold status (via `findHoldStatus()` from store utils)
   - Conference status (via `task.data.isConferenceInProgress`)
   - Participant counts (via `getConferenceParticipantsCount()`)
3. Each control has a dedicated function that returns `{ isVisible, isEnabled }`
4. Result includes both control visibility AND state flags (e.g., `isHeld`, `consultCallHeld`)

### Old Control Names (22 controls + 7 state flags)
| Old Control Name | Type |
|------------------|------|
| `accept` | `Visibility` |
| `decline` | `Visibility` |
| `end` | `Visibility` |
| `muteUnmute` | `Visibility` |
| `holdResume` | `Visibility` |
| `pauseResumeRecording` | `Visibility` |
| `recordingIndicator` | `Visibility` |
| `transfer` | `Visibility` |
| `conference` | `Visibility` |
| `exitConference` | `Visibility` |
| `mergeConference` | `Visibility` |
| `consult` | `Visibility` |
| `endConsult` | `Visibility` |
| `consultTransfer` | `Visibility` |
| `consultTransferConsult` | `Visibility` |
| `mergeConferenceConsult` | `Visibility` |
| `muteUnmuteConsult` | `Visibility` |
| `switchToMainCall` | `Visibility` |
| `switchToConsult` | `Visibility` |
| `wrapup` | `Visibility` |
| **State flags** | |
| `isConferenceInProgress` | `boolean` |
| `isConsultInitiated` | `boolean` |
| `isConsultInitiatedAndAccepted` | `boolean` |
| `isConsultReceived` | `boolean` |
| `isConsultInitiatedOrAccepted` | `boolean` |
| `isHeld` | `boolean` |
| `consultCallHeld` | `boolean` |

---

## New Approach

### Entry Point
**SDK Property:** `task.uiControls` (getter on `ITask`)
**SDK Event:** `task:ui-controls-updated` (emitted when controls change)
**SDK File:** `packages/@webex/contact-center/src/services/task/state-machine/uiControlsComputer.ts`

### How It Works (New)
1. SDK state machine transitions on every event (hold, consult, conference, etc.)
2. After each transition, `computeUIControls(currentState, context)` is called
3. If controls changed (`haveUIControlsChanged()`), emits `task:ui-controls-updated`
4. Widget reads `task.uiControls` — no computation needed on widget side

### New Control Names (17 controls, no state flags)
| New Control Name | Type |
|------------------|------|
| `accept` | `{ isVisible, isEnabled }` |
| `decline` | `{ isVisible, isEnabled }` |
| `hold` | `{ isVisible, isEnabled }` |
| `mute` | `{ isVisible, isEnabled }` |
| `end` | `{ isVisible, isEnabled }` |
| `transfer` | `{ isVisible, isEnabled }` |
| `consult` | `{ isVisible, isEnabled }` |
| `consultTransfer` | `{ isVisible, isEnabled }` |
| `endConsult` | `{ isVisible, isEnabled }` |
| `recording` | `{ isVisible, isEnabled }` |
| `conference` | `{ isVisible, isEnabled }` |
| `wrapup` | `{ isVisible, isEnabled }` |
| `exitConference` | `{ isVisible, isEnabled }` |
| `transferConference` | `{ isVisible, isEnabled }` |
| `mergeToConference` | `{ isVisible, isEnabled }` |
| `switchToMainCall` | `{ isVisible, isEnabled }` |
| `switchToConsult` | `{ isVisible, isEnabled }` |

---

## Old → New Control Name Mapping

| Old Widget Control | New SDK Control | Notes |
|--------------------|-----------------|-------|
| `accept` | `accept` | Same |
| `decline` | `decline` | Same |
| `end` | `end` | Same |
| `muteUnmute` | `mute` | **Renamed** |
| `holdResume` | `hold` | **Renamed** (hold state still togglable) |
| `pauseResumeRecording` | `recording` | **Renamed** — toggle button (pause/resume) |
| `recordingIndicator` | `recording` | **Maps to same SDK control** — but widget must keep a separate UI indicator (status badge). Use `recording.isVisible` for the indicator badge and `recording.isEnabled` for the toggle button's interactive state. See note below. |
| `transfer` | `transfer` | Same |
| `conference` | `conference` | Same |
| `exitConference` | `exitConference` | Same |
| `mergeConference` | `mergeToConference` | **Renamed** |
| `consult` | `consult` | Same |
| `endConsult` | `endConsult` | Same |
| `consultTransfer` | `consultTransfer` | Same (always hidden in new SDK) |
| `consultTransferConsult` | `transfer` / `transferConference` | **Split** — `transfer` for consult transfer, `transferConference` for conference transfer |
| `mergeConferenceConsult` | `mergeToConference` | **Merged** into `mergeToConference` |
| `muteUnmuteConsult` | `mute` | **Merged** into `mute` |
| `switchToMainCall` | `switchToMainCall` | Same |
| `switchToConsult` | `switchToConsult` | Same |
| `wrapup` | `wrapup` | Same |

### Removed State Flags
The following state flags were returned by `getControlsVisibility()` but are no longer needed:

| Old State Flag | Replacement |
|----------------|-------------|
| `isConferenceInProgress` | **Caution with `exitConference.isVisible`** — In the old widget code, exit-conference was hidden during conference + active consult. In the **new SDK** (`uiControlsComputer.ts`), `exitConference` is `VISIBLE_DISABLED` (not hidden) during consulting-from-conference, making `isVisible` more reliable. However, for consulted agents not in conferencing state, `exitConference` is `DISABLED`. If you need a definitive conference-in-progress flag independent of agent role, use `task.data` (e.g., `getIsConferenceInProgress(taskData)` which the SDK itself uses internally) rather than relying solely on `exitConference.isVisible` |
| `isConsultInitiated` | Derive from `task.uiControls.endConsult.isVisible` if needed |
| `isConsultInitiatedAndAccepted` | No longer needed — SDK handles via controls |
| `isConsultReceived` | No longer needed — SDK handles via controls |
| `isConsultInitiatedOrAccepted` | No longer needed — SDK handles via controls |
| `isHeld` | Derive from `task.uiControls.hold` state or SDK task state |
| `consultCallHeld` | No longer needed — SDK handles switch controls |

---

## Refactor Pattern (Before/After)

### Before (in `useCallControl` hook)
```typescript
// helper.ts — old approach
const controls = getControlsVisibility(
  store.deviceType,
  store.featureFlags,
  store.currentTask,
  store.agentId,
  conferenceEnabled,
  store.logger
);

// Pass 22 controls + 7 state flags to component
return {
  ...controls,
  // additional hook state
};
```

### After (in `useCallControl` hook)
```typescript
// helper.ts — new approach
const task = store.currentTask;
const uiControls = task?.uiControls ?? getDefaultUIControls();

// Subscribe to UI control updates
useEffect(() => {
  if (!task) return;
  const handler = () => {
    // MobX or setState to trigger re-render
  };
  task.on('task:ui-controls-updated', handler);
  return () => task.off('task:ui-controls-updated', handler);
}, [task]);

// Pass SDK-computed controls directly to component
return {
  controls: uiControls,
  // additional hook state (timers, mute state, etc.)
};
```

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/Utils/task-util.ts` | **DELETE** or reduce to `findHoldTimestamp()` only |
| `task/src/helper.ts` (`useCallControl`) | Remove `getControlsVisibility()` call, use `task.uiControls` |
| `task/src/task.types.ts` | Import `TaskUIControls` from SDK, remove old control types |
| `cc-components/src/components/task/task.types.ts` | Align `ControlProps` with new control names |
| `cc-components/src/components/task/CallControl/call-control.tsx` | Update prop names (`holdResume` → `hold`, etc.) |
| `cc-components/src/components/task/CallControl/call-control.utils.ts` | Simplify/remove old control derivation |
| `store/src/task-utils.ts` | Remove `getConsultStatus`, `findHoldStatus` if no longer consumed |
| All test files for above | Update to test new contract |

---

## Validation Criteria

- [ ] All 17 SDK controls map correctly to widget UI buttons
- [ ] No widget-side computation of control visibility remains
- [ ] `task:ui-controls-updated` event drives re-renders
- [ ] All existing call control scenarios work identically (hold, consult, transfer, conference, wrapup)
- [ ] Digital channel controls work (accept, end, transfer, wrapup only)
- [ ] Default controls shown when no task is active
- [ ] Error boundary still catches failures gracefully

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
