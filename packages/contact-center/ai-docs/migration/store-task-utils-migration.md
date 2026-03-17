# Store Task Utils Migration

## Summary

The store's `task-utils.ts` contains 16 exported utility functions that inspect raw task data to derive state flags (consult status, hold status, conference state, participant info). Many of these become redundant when `task.uiControls` is the source of truth. This document maps which utils to keep, simplify, or remove.

**Barrel export:** `store/src/index.ts` has `export * from './task-utils'` — all 16 functions are publicly exported via `@webex/cc-store`. Removing functions will cause compile errors in any downstream consumer still importing them.

---

## Constants and Types to Delete

| Delete | File | Reason |
|--------|------|--------|
| Local `TASK_EVENTS` enum | `store/src/store.types.ts` | SDK exports this — delete local copy (covered in detail in [store-event-wiring-migration.md](./store-event-wiring-migration.md)) |
| `ConsultStatus` enum | `store/src/store.types.ts` | All consumers (`getConsultStatus`, `getControlsVisibility`) are being removed |
| `TASK_STATE_CONSULT` | `store/src/constants.ts` | **Dual use:** (1) Task state → SDK `TaskState.CONSULT_INITIATING`. (2) **Media-type sentinel** in `findHoldStatus(task, mType, agentId)` — line 328 uses `mType === TASK_STATE_CONSULT` to identify the consult *leg*, not task state. **Delete ONLY AFTER rewriting `findHoldStatus`**; when rewriting, preserve a media-type constant (or use media-type enums) for the consult leg — do **not** replace that branch with `TaskState`. See ordering note below. |
| `TASK_STATE_CONSULTING` | `store/src/constants.ts` | SDK `TaskState.CONSULTING` — **same ordering constraint** (used only as task state, not as mType) |
| `TASK_STATE_CONSULT_COMPLETED` | `store/src/constants.ts` | SDK handles via context — **same ordering constraint** |
| `INTERACTION_STATE_WRAPUP` | `store/src/constants.ts` | SDK `TaskState.WRAPPING_UP` — **delete ONLY AFTER rewriting `getTaskStatus`** (see ordering note below) |
| `INTERACTION_STATE_POST_CALL` | `store/src/constants.ts` | SDK `TaskState.POST_CALL` — **same ordering constraint** |
| `INTERACTION_STATE_CONNECTED` | `store/src/constants.ts` | SDK `TaskState.CONNECTED` — **same ordering constraint** |
| `INTERACTION_STATE_CONFERENCE` | `store/src/constants.ts` | SDK `TaskState.CONFERENCING` — **same ordering constraint** |
| `CONSULT_STATE_INITIATED` | `store/src/constants.ts` | SDK handles via context — **delete ONLY AFTER rewriting `getConsultMPCState`** (see ordering note below) |
| `CONSULT_STATE_COMPLETED` | `store/src/constants.ts` | SDK handles via context — **same ordering constraint** |
| `CONSULT_STATE_CONFERENCING` | `store/src/constants.ts` | SDK handles via context — **same ordering constraint** |

## Constants to Keep

| Keep | File | Reason |
|------|------|--------|
| `RELATIONSHIP_TYPE_CONSULT` | `store/src/constants.ts` | Still used by `findMediaResourceId` (KEEP) |
| `MEDIA_TYPE_CONSULT` | `store/src/constants.ts` | Still used by `findMediaResourceId` (KEEP) |
| `AGENT` | `store/src/constants.ts` | Used by `getConferenceParticipants` (KEEP) for participant filtering |
| `CUSTOMER` | `store/src/constants.ts` | Used by `EXCLUDED_PARTICIPANT_TYPES` |
| `SUPERVISOR` | `store/src/constants.ts` | Used by `EXCLUDED_PARTICIPANT_TYPES` |
| `VVA` | `store/src/constants.ts` | Used by `EXCLUDED_PARTICIPANT_TYPES` |
| `EXCLUDED_PARTICIPANT_TYPES` | `store/src/constants.ts` | Used by `getConferenceParticipants` (KEEP) for participant filtering |

## Ordering Constraint: Consult State Constants

`findHoldStatus` (KEEP) depends on `TASK_STATE_CONSULT`, `TASK_STATE_CONSULTING`, and `TASK_STATE_CONSULT_COMPLETED` via:
- **Direct usage:** Line 328 — `mType === TASK_STATE_CONSULT`
- **Via `isConsultOnHoldMPC`:** Line 303 — `[TASK_STATE_CONSULT, TASK_STATE_CONSULTING].includes(getConsultMPCState(...))`
- **Via `getConsultMPCState`:** Line 321 — `[TASK_STATE_CONSULT_COMPLETED].includes(getConsultMPCState(...))`

**Do NOT delete these 3 constants until `findHoldStatus` and `isConsultOnHoldMPC` are rewritten** to use SDK `TaskState` equivalents. Deleting them first will break compilation. When rewriting `findHoldStatus`, note that `TASK_STATE_CONSULT` is used there as a **media-type** sentinel (`mType === TASK_STATE_CONSULT`); preserve a media-type constant or media-type enum for the consult leg — do not replace that comparison with `TaskState`.

## Ordering Constraint: Interaction State Constants

`getTaskStatus` (KEEP) depends on `INTERACTION_STATE_WRAPUP`, `INTERACTION_STATE_POST_CALL`, `INTERACTION_STATE_CONNECTED`, and `INTERACTION_STATE_CONFERENCE` extensively:
- **`isIncomingTask`:** Line 46 — `task.data.interaction.state !== INTERACTION_STATE_WRAPUP`
- **`getTaskStatus`:** Lines 56–60 — returns `INTERACTION_STATE_CONNECTED` or `INTERACTION_STATE_CONFERENCE`
- **`getTaskStatus`:** Lines 99–100 — conference state check
- **`getTaskStatus`:** Lines 105–106 — wrapup/post-call consult-completed check
- **`getConsultMPCState`:** Lines 137–139 — connected/conference branching

**Do NOT delete these 4 constants until `getTaskStatus` and `getConsultMPCState` are rewritten** to use SDK `TaskState` equivalents. Deleting them first will break compilation.

## Ordering Constraint: Consult State Constants (`CONSULT_STATE_*`)

`getConsultMPCState` (used by `getTaskStatus` and `findHoldStatus`) depends on `CONSULT_STATE_INITIATED`, `CONSULT_STATE_COMPLETED`, and `CONSULT_STATE_CONFERENCING`:
- **Line 53:** `case CONSULT_STATE_INITIATED:` — returns `TASK_STATE_CONSULT`
- **Line 55:** `case CONSULT_STATE_COMPLETED:` — returns connected or consult-completed
- **Line 59:** `case CONSULT_STATE_CONFERENCING:` — returns `INTERACTION_STATE_CONFERENCE`
- **Line 107:** `consultState === CONSULT_STATE_COMPLETED` — wrapup path in `getTaskStatus`

**Do NOT delete these 3 constants until `getConsultMPCState` is rewritten** to use SDK equivalents. Deleting them first will break compilation.

## Gotcha: `TaskState.CONSULT_INITIATING` vs `CONSULTING`

The SDK has `CONSULT_INITIATING` (consult requested, async in-progress) and `CONSULTING` (consult accepted, actively consulting) as distinct states. The old widget constant `TASK_STATE_CONSULT` ('consult') maps to `CONSULT_INITIATING`, NOT `CONSULTING`. Do not collapse these when updating `getTaskStatus()` or any consult timer logic.

---

## Old Utilities Inventory

**File:** `packages/contact-center/store/src/task-utils.ts` (16 exported functions)

| # | Function | Purpose | Actual Consumers (production code) |
|---|----------|---------|-------------------------------------|
| 1 | `isIncomingTask(task, agentId)` | Check if task is incoming | `storeEventsWrapper.ts` |
| 2 | `getConsultMPCState(task, agentId)` | Consult multi-party conference state string | `getTaskStatus()`, `findHoldStatus()` area logic (internal to `task-utils.ts`) |
| 3 | `isSecondaryAgent(task)` | Whether agent is secondary in consult | `task-utils.ts` (internal) |
| 4 | `isSecondaryEpDnAgent(task)` | Whether agent is secondary EP-DN | `getTaskStatus()`, `getConsultStatus()` (internal to `task-utils.ts`) |
| 5 | `getTaskStatus(task, agentId)` | Human-readable task status string | `getConsultStatus()` (internal — no external consumer currently) |
| 6 | `getConsultStatus(task, agentId)` | `ConsultStatus` enum value | `task/src/Utils/task-util.ts` (`getControlsVisibility`) |
| 7 | `getIsConferenceInProgress(task)` | Boolean conference check | Tests only — `task-util.ts` uses `task?.data?.isConferenceInProgress` directly instead |
| 8 | `getConferenceParticipants(task, agentId)` | Filtered participant list | `task/src/helper.ts` (CallControl hook) |
| 9 | `getConferenceParticipantsCount(task)` | Participant count | `task/src/Utils/task-util.ts` (`getControlsVisibility`) |
| 10 | `getIsCustomerInCall(task)` | Whether customer is connected | `task/src/Utils/task-util.ts` (`getControlsVisibility`) |
| 11 | `getIsConsultInProgress(task)` | Whether consult is active | `task/src/Utils/task-util.ts` (`getControlsVisibility`) |
| 12 | `isInteractionOnHold(task)` | Whether any media is held | Timer utils |
| 13 | `setmTypeForEPDN(task, mType)` | Media type for EP-DN agents | CallControl hook |
| 14 | `findMediaResourceId(task, mType)` | Media resource ID lookup | CallControl hook (switch calls) |
| 15 | `findHoldStatus(task, mType, agentId)` | Hold status by media type | `task/src/Utils/task-util.ts` (`getControlsVisibility`), `getTaskStatus()` (via `getConsultMPCState` chain) |
| 16 | `findHoldTimestamp(task, mType)` | Hold timestamp for timers | Timer utils (store version takes `ITask`; see dual-signature note below) |

### Important: `findHoldTimestamp` Dual Signatures

Two different `findHoldTimestamp` functions exist with different signatures:
- **`store/src/task-utils.ts`:** `findHoldTimestamp(task: ITask, mType: string)` — takes full task object
- **`task/src/Utils/task-util.ts`:** `findHoldTimestamp(interaction: Interaction, mType: string)` — takes interaction only

`timer-utils.ts` imports from `@webex/cc-store` (task version). `useHoldTimer.ts` imports from `task-util` (interaction version). Both are kept but the implementing agent must not confuse them.

---

## Migration Decisions

### Remove — 5 Functions (SDK handles via uiControls)

| # | Function | Reason | SDK Replacement | Impact on Other Functions |
|---|----------|--------|-----------------|--------------------------|
| 1 | `getConsultStatus(task, agentId)` | Primary consumer `getControlsVisibility` is deleted | `task.uiControls` encodes all consult control states | `getConsultStatus()` **calls** `getTaskStatus()` (not the reverse). When we delete `getConsultStatus`, update `getTaskStatus` to use `task.uiControls` (see After code below). |
| 2 | `getIsConferenceInProgress(task)` | `task-util.ts` already uses `task?.data?.isConferenceInProgress` directly; function only used in tests | `task.uiControls.exitConference.isVisible` | None |
| 3 | `getConferenceParticipantsCount(task)` | Used only in `getControlsVisibility` | SDK computes max participant check internally | None |
| 4 | `getIsCustomerInCall(task)` | Used only in `getControlsVisibility` | SDK computes internally | None |
| 5 | `getIsConsultInProgress(task)` | Used only in `getControlsVisibility` | SDK computes internally | None |

### Keep — 7 Functions (Widget-layer concerns)

| # | Function | Reason |
|---|----------|--------|
| 1 | `isIncomingTask(task, agentId)` | Store needs this for routing incoming tasks |
| 2 | `getTaskStatus(task, agentId)` | Returns human-readable status. Currently only consumed internally by `getConsultStatus()`, but after migration will be the primary status provider for TaskList display. Must be updated to use `task.uiControls` instead of `getConsultStatus()`. |
| 3 | `getConferenceParticipants(task, agentId)` | CallControl UI shows participant list (display, not control visibility). Uses `EXCLUDED_PARTICIPANT_TYPES` from constants. |
| 4 | `isInteractionOnHold(task)` | Timer logic needs this |
| 5 | `findMediaResourceId(task, mType)` | Switch-call actions need media resource IDs. Uses `RELATIONSHIP_TYPE_CONSULT`, `MEDIA_TYPE_CONSULT` from constants. |
| 6 | `findHoldTimestamp(task, mType)` | Hold timer needs timestamp. Note: store version takes `ITask`, task-util version takes `Interaction` (see dual-signature note above). |
| 7 | `findHoldStatus(task, mType, agentId)` | Needed for `getTaskStatus()` held-state derivation and component layer `isHeld` — cannot derive from `controls.hold.isEnabled` |

### Review — 4 Functions (may simplify or remove)

| # | Function | Consideration | Dependency |
|---|----------|--------------|------------|
| 1 | `isSecondaryAgent(task)` | May be replaceable by SDK context | Used internally by `task-utils.ts` |
| 2 | `isSecondaryEpDnAgent(task)` | May be replaceable by SDK context | Used by `getTaskStatus()` and `getConsultStatus()` |
| 3 | `getConsultMPCState(task, agentId)` | Review if still needed with SDK handling consult state | **Called by `getTaskStatus()` (line 112) as its return value** — if `getTaskStatus` is rewritten to use `task.uiControls`, this may become removable |
| 4 | `setmTypeForEPDN(task, mType)` | Review if SDK simplifies this | Used by CallControl hook |

---

## Before/After: Downstream Impact — `getControlsVisibility` Deletion

> **Note:** `getControlsVisibility` is NOT in the store. It lives in the **task package** at
> `task/src/Utils/task-util.ts` (hook/widget layer). It is shown here because it is the
> **primary consumer** of the 5 store functions being removed above. When those store
> functions are deleted, this entire function chain becomes deletable — replaced by `task.uiControls`.

### Before (`task/src/Utils/task-util.ts` — imports 5 store functions)
```typescript
// task/src/Utils/task-util.ts (hook layer, NOT store)
import { getConsultStatus, ConsultStatus, getIsConsultInProgress, getIsCustomerInCall,
         getConferenceParticipantsCount, findHoldStatus } from '@webex/cc-store';

export function getControlsVisibility(deviceType, featureFlags, task, agentId, conferenceEnabled) {
  const taskConsultStatus = getConsultStatus(task, agentId);
  const isConsultInitiated = taskConsultStatus === ConsultStatus.CONSULT_INITIATED;
  const isConsultAccepted = taskConsultStatus === ConsultStatus.CONSULT_ACCEPTED;
  const isBeingConsulted = taskConsultStatus === ConsultStatus.BEING_CONSULTED_ACCEPTED;
  const isConsultCompleted = taskConsultStatus === ConsultStatus.CONSULT_COMPLETED;

  const isHeld = findHoldStatus(task, 'mainCall', agentId);
  const consultCallHeld = findHoldStatus(task, 'consult', agentId);

  const isConferenceInProgress = task?.data?.isConferenceInProgress ?? false;
  const isConsultInProgress = getIsConsultInProgress(task);
  const isCustomerInCall = getIsCustomerInCall(task);
  const conferenceParticipantsCount = getConferenceParticipantsCount(task);

  // 22 individual get*ButtonVisibility() functions using these derived states...
  return { /* 22 controls + 7 state flags */ };
}
```

### After (`task/src/Utils/task-util.ts` — entire `getControlsVisibility` + 22 visibility functions deleted)
```typescript
// task/src/Utils/task-util.ts (hook layer, NOT store)
// DELETE getControlsVisibility and all 22 get*ButtonVisibility functions:
//   getAcceptButtonVisibility, getDeclineButtonVisibility, getEndButtonVisibility,
//   getMuteUnmuteButtonVisibility, getHoldResumeButtonVisibility,
//   getPauseResumeRecordingButtonVisibility, getRecordingIndicatorVisibility,
//   getTransferButtonVisibility, getConferenceButtonVisibility,
//   getExitConferenceButtonVisibility, getMergeConferenceButtonVisibility,
//   getConsultButtonVisibility, getEndConsultButtonVisibility,
//   getConsultTransferButtonVisibility, getMergeConferenceConsultButtonVisibility,
//   getConsultTransferConsultButtonVisibility, getMuteUnmuteConsultButtonVisibility,
//   getSwitchToMainCallButtonVisibility, getSwitchToConsultButtonVisibility,
//   getWrapupButtonVisibility, getControlsVisibility
//
// KEEP in task-util.ts: findHoldTimestamp(interaction, mType) — different signature from store version

// In useCallControl hook — no imports from store task-utils for controls:
const controls = currentTask?.uiControls ?? getDefaultUIControls();
// All 17 controls come pre-computed from SDK. Zero store util calls needed.
```

> **CRITICAL: Migrate derived state consumers before removing getControlsVisibility**
>
> Many consumers still depend on **derived booleans** that are not part of SDK `uiControls` (e.g. `controlVisibility.consultCallHeld`, `isConsultInitiated` in `task/src/Utils/timer-utils.ts`; `isHeld`, `isConferenceInProgress` in `cc-components/.../CallControl*`). Do **not** follow the replacement above literally without migrating those consumers in the same step: either pass derived values from parent (e.g. `findHoldStatus(task, 'mainCall', agentId)` for `isHeld`) or move derivation to the hook/layer that owns the control. Otherwise removing `getControlsVisibility` / `ControlVisibility` will break timers and button behavior.

> **CRITICAL: Feature-Flag Gating Overlay**
>
> The old `getControlsVisibility` applied integrator-provided widget props (`featureFlags`
> and `conferenceEnabled`) that the SDK has **no knowledge of**. SDK-computed `task.uiControls`
> reflects task-state-only visibility. The widget layer **must** still overlay these gates on
> top of the SDK controls to honour integrator configuration.
>
> | Widget Prop | Controls Affected | Gate Logic |
> |-------------|-------------------|------------|
> | `featureFlags.webRtcEnabled` | accept, decline, muteUnmute, conference, muteUnmuteConsult, **transfer** (browser: `isTransferVisibility`), **consult**, **recording** (pause/resume), + telephony support (holdResume, endConsult). (Old logic: `telephonySupported` from `webRtcEnabled` drives `getConsultButtonVisibility`, `getPauseResumeRecordingButtonVisibility` in task-util.) | Hide control when `webRtcEnabled` is `false` and channel is voice in browser |
> | `featureFlags.isEndCallEnabled` | end | Hide end button when `isEndCallEnabled` is `false` (phone device only) |
> | `featureFlags.isEndConsultEnabled` | endConsult | Hide end-consult when `isEndConsultEnabled` is `false` |
> | `conferenceEnabled` (widget prop) | conference, exitConference, mergeConference, **mergeConferenceConsult**, consultTransferConsult | Hide all conference-related controls when `conferenceEnabled` is `false` |
>
> **Implementation pattern — apply after reading SDK controls:**
> ```typescript
> const sdkControls = currentTask?.uiControls ?? getDefaultUIControls();
>
> // Overlay integrator feature-flag gates
> const controls = applyFeatureGates(sdkControls, {
>   deviceType,
>   featureFlags,       // { webRtcEnabled, isEndCallEnabled, isEndConsultEnabled }
>   conferenceEnabled,
>   channelType,        // voice vs digital — needed for webRtc gate
> });
> ```
> The `applyFeatureGates` helper is a thin function that sets `isVisible = false`
> on any control whose integrator gate is off. It does **not** re-derive state; it only
> narrows visibility that the SDK already computed.

### Before/After: `findHoldStatus` — RETAINED (not removed)

#### Before (used in controls computation and task status)
```typescript
// store/task-utils.ts — exported function
export const findHoldStatus = (task: ITask, mType: string, agentId: string): boolean => {
  // Reads from task.data.interaction.participants to determine hold state
  // ...
};

// task-util.ts — consumed for control visibility (BEING DELETED)
const isHeld = findHoldStatus(task, 'mainCall', agentId);
const consultCallHeld = findHoldStatus(task, 'consult', agentId);
```

#### After
```typescript
// KEPT in store/task-utils.ts — still needed for:
// 1. getTaskStatus() held-state derivation (cannot derive from controls.hold.isEnabled)
// 2. Component layer isHeld prop
// Implementation unchanged — reads from task.data.interaction.participants
export const findHoldStatus = (task: ITask, mType: string, agentId: string): boolean => {
  // ...unchanged...
};
```

### Before/After: `getTaskStatus` (KEPT but rewritten)

#### Before (actual implementation)
```typescript
// store/task-utils.ts — the real code (NOT a simplification)
export function getTaskStatus(task: ITask, agentId: string): string {
  const interaction = task.data.interaction;

  // EP-DN secondary agent handling
  if (isSecondaryEpDnAgent(task)) {
    if (interaction.state === INTERACTION_STATE_CONFERENCE) {
      return INTERACTION_STATE_CONFERENCE;
    }
    return TASK_STATE_CONSULTING;
  }

  // Consult-completed wrapup handling
  if (
    (interaction.state === INTERACTION_STATE_WRAPUP || interaction.state === INTERACTION_STATE_POST_CALL) &&
    interaction.participants[agentId]?.consultState === CONSULT_STATE_COMPLETED
  ) {
    return TASK_STATE_CONSULT_COMPLETED;
  }

  // Delegates to getConsultMPCState for all other cases
  return getConsultMPCState(task, agentId);
}

// getConsultStatus() calls getTaskStatus() and maps the string to ConsultStatus enum values
```

#### After (rewritten to use SDK controls — preserve return contract)
```typescript
// store/task-utils.ts — rewritten to use task.uiControls
// CONTRACT: getTaskStatus is barrel-exported from @webex/cc-store. Downstream consumers
// may compare return values to INTERACTION_STATE_* / TASK_STATE_* constants. Preserve the
// existing machine-readable return values; do NOT switch to display labels here.
// Display labels ('Wrap Up', 'Conference', etc.) are a UI concern — implement via a
// separate helper or mapping layer if needed.
export function getTaskStatus(task: ITask, agentId: string): string {
  const interaction = task.data.interaction;
  const controls = task.uiControls;

  // When uiControls is missing (hydration/race), run full legacy path so EP-DN and
  // consult-completed derivation are preserved; avoid falling back to raw interaction.state only.
  if (!controls) {
    if (isSecondaryEpDnAgent(task)) {
      if (interaction.state === INTERACTION_STATE_CONFERENCE) return INTERACTION_STATE_CONFERENCE;
      return TASK_STATE_CONSULTING;
    }
    if (
      (interaction.state === INTERACTION_STATE_WRAPUP || interaction.state === INTERACTION_STATE_POST_CALL) &&
      interaction.participants[agentId]?.consultState === CONSULT_STATE_COMPLETED
    ) {
      return TASK_STATE_CONSULT_COMPLETED;
    }
    return getConsultMPCState(task, agentId);
  }

  // EP-DN secondary agent (same as Before)
  if (isSecondaryEpDnAgent(task)) {
    if (interaction.state === INTERACTION_STATE_CONFERENCE) return INTERACTION_STATE_CONFERENCE;
    return TASK_STATE_CONSULTING;
  }
  // Wrapup / post-call with consult completed (same as Before)
  if (
    (interaction.state === INTERACTION_STATE_WRAPUP || interaction.state === INTERACTION_STATE_POST_CALL) &&
    interaction.participants[agentId]?.consultState === CONSULT_STATE_COMPLETED
  ) {
    return TASK_STATE_CONSULT_COMPLETED;
  }

  // Map from uiControls to same constant values as old getConsultMPCState / getTaskStatus
  if (controls.wrapup.isVisible) return INTERACTION_STATE_WRAPUP;
  // endConsult.isVisible is true for both consult-initiating and consulting; use getConsultMPCState
  // so we return TASK_STATE_CONSULT vs TASK_STATE_CONSULTING correctly (see gotcha in this doc).
  if (controls.endConsult.isVisible) return getConsultMPCState(task, agentId);
  if (controls.exitConference.isVisible) return INTERACTION_STATE_CONFERENCE;
  if (findHoldStatus(task, 'mainCall', agentId)) return INTERACTION_STATE_CONNECTED; // held → connected
  if (controls.end.isVisible) return INTERACTION_STATE_CONNECTED;
  if (controls.accept.isVisible) return interaction?.state ?? 'new'; // offered
  return getConsultMPCState(task, agentId); // fallback preserves legacy behaviour
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `store/src/task-utils.ts` | Remove 5 functions, keep 7 (update `getTaskStatus` to use `task.uiControls`), review 4 |
| `store/src/store.types.ts` | Delete `ConsultStatus` enum (all consumers removed) |
| `store/src/constants.ts` | Delete 9 task/interaction/consult state constants; keep 7 participant/media constants |
| `task/src/Utils/task-util.ts` | Delete `getControlsVisibility` + all 22 `get*ButtonVisibility` functions; keep `findHoldTimestamp(interaction, mType)` |
| `store/tests/task-utils.ts` | Update tests: remove tests for 5 deleted functions, update `getTaskStatus` tests |
| `task/tests/utils/task-util.ts` | Remove tests for deleted visibility functions |
| All consumers of removed functions | Update imports, switch to `task.uiControls` |

---

## Validation Criteria

- [ ] 5 removed functions have no remaining consumers (compile check)
- [ ] 7 kept functions still work correctly
- [ ] `getTaskStatus` produces correct status for all task states (connected, held, consulting, conference, wrapup, offered)
- [ ] `getTaskStatus` handles EP-DN secondary agent edge cases correctly
- [ ] Conference participant display unchanged
- [ ] Hold timer unchanged
- [ ] Switch-call media resource IDs work
- [ ] `ConsultStatus` enum removed with no remaining imports
- [ ] 9 deleted constants have no remaining consumers
- [ ] `findHoldTimestamp` dual-signature (task vs interaction) not confused during migration
- [ ] `task-util.ts` `getControlsVisibility` + 22 visibility functions fully deleted
- [ ] Feature-flag overlay (`applyFeatureGates`) preserves `webRtcEnabled`, `isEndCallEnabled`, `isEndConsultEnabled`, and `conferenceEnabled` gating on top of SDK controls

---

_Parent: [migration-overview.md](./migration-overview.md)_
