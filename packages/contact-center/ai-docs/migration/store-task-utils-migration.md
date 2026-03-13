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
| `TASK_STATE_CONSULT` | `store/src/constants.ts` | SDK `TaskState.CONSULT_INITIATING` — **delete ONLY AFTER rewriting `findHoldStatus`** (see ordering note below) |
| `TASK_STATE_CONSULTING` | `store/src/constants.ts` | SDK `TaskState.CONSULTING` — **same ordering constraint** |
| `TASK_STATE_CONSULT_COMPLETED` | `store/src/constants.ts` | SDK handles via context — **same ordering constraint** |
| `INTERACTION_STATE_WRAPUP` | `store/src/constants.ts` | SDK `TaskState.WRAPPING_UP` — **delete ONLY AFTER rewriting `getTaskStatus`** (see ordering note below) |
| `INTERACTION_STATE_POST_CALL` | `store/src/constants.ts` | SDK `TaskState.POST_CALL` — **same ordering constraint** |
| `INTERACTION_STATE_CONNECTED` | `store/src/constants.ts` | SDK `TaskState.CONNECTED` — **same ordering constraint** |
| `INTERACTION_STATE_CONFERENCE` | `store/src/constants.ts` | SDK `TaskState.CONFERENCING` — **same ordering constraint** |
| `CONSULT_STATE_INITIATED` | `store/src/constants.ts` | SDK handles via context |
| `CONSULT_STATE_COMPLETED` | `store/src/constants.ts` | SDK handles via context |
| `CONSULT_STATE_CONFERENCING` | `store/src/constants.ts` | SDK handles via context |

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

**Do NOT delete these 3 constants until `findHoldStatus` and `isConsultOnHoldMPC` are rewritten** to use SDK `TaskState` equivalents. Deleting them first will break compilation.

## Ordering Constraint: Interaction State Constants

`getTaskStatus` (KEEP) depends on `INTERACTION_STATE_WRAPUP`, `INTERACTION_STATE_POST_CALL`, `INTERACTION_STATE_CONNECTED`, and `INTERACTION_STATE_CONFERENCE` extensively:
- **`isIncomingTask`:** Line 46 — `task.data.interaction.state !== INTERACTION_STATE_WRAPUP`
- **`getTaskStatus`:** Lines 56–60 — returns `INTERACTION_STATE_CONNECTED` or `INTERACTION_STATE_CONFERENCE`
- **`getTaskStatus`:** Lines 99–100 — conference state check
- **`getTaskStatus`:** Lines 105–106 — wrapup/post-call consult-completed check
- **`getConsultMPCState`:** Lines 137–139 — connected/conference branching

**Do NOT delete these 4 constants until `getTaskStatus` and `getConsultMPCState` are rewritten** to use SDK `TaskState` equivalents. Deleting them first will break compilation.

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
| 1 | `getConsultStatus(task, agentId)` | Primary consumer `getControlsVisibility` is deleted | `task.uiControls` encodes all consult control states | `getTaskStatus()` calls this — must be updated (see After code below) |
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

#### After (rewritten to use SDK controls)
```typescript
// store/task-utils.ts — rewritten to use task.uiControls
// NOTE: getConsultStatus() is deleted, so getTaskStatus() no longer needs to produce
// values that feed into ConsultStatus. It becomes a pure display-status function.
export function getTaskStatus(task: ITask, agentId: string): string {
  const controls = task.uiControls;
  if (!controls) return 'Unknown';

  if (controls.wrapup.isVisible) return 'Wrap Up';
  if (controls.endConsult.isVisible) return 'Consulting';
  if (controls.exitConference.isVisible) return 'Conference';

  // Do NOT derive held state from controls.hold.isEnabled — hold can be
  // disabled in consult/transition states even when call is not held.
  // Use task data instead (agentId needed for participant lookup):
  if (findHoldStatus(task, 'mainCall', agentId)) return 'Held';

  if (controls.end.isVisible) return 'Connected';
  if (controls.accept.isVisible) return 'Offered';  // NEW: not in old version
  return 'Unknown';  // NEW: safe default
}
// NOTE: New states 'Offered' and 'Unknown' are additions not present in old code.
// EP-DN secondary agent handling and consultState-based wrapup may need review —
// verify that task.uiControls correctly handles these edge cases in SDK.
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

---

_Parent: [migration-overview.md](./migration-overview.md)_
