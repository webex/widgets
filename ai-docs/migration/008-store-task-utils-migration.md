# Migration Doc 008: Store Task Utils Migration

## Summary

The store's `task-utils.ts` contains ~15 utility functions that inspect raw task data to derive state flags (consult status, hold status, conference state, participant info). Many of these become redundant when `task.uiControls` is the source of truth. This document maps which utils to keep, simplify, or remove.

---

## Old Utilities Inventory

**File:** `packages/contact-center/store/src/task-utils.ts`

| Function | Purpose | Used By |
|----------|---------|---------|
| `isIncomingTask(task, agentId)` | Check if task is incoming | Store event wrapper |
| `getConsultMPCState(task, agentId)` | Consult multi-party conference state | Store, helpers |
| `isSecondaryAgent(task)` | Whether agent is secondary in consult | Store |
| `isSecondaryEpDnAgent(task)` | Whether agent is secondary EP-DN | Store |
| `getTaskStatus(task, agentId)` | Human-readable task status string | TaskList component |
| `getConsultStatus(task, agentId)` | `ConsultStatus` enum value | task-util.ts (controls), CallControl |
| `getIsConferenceInProgress(task)` | Boolean conference check | task-util.ts (controls) |
| `getConferenceParticipants(task, agentId)` | Filtered participant list | CallControl component |
| `getConferenceParticipantsCount(task)` | Participant count | task-util.ts (controls) |
| `getIsCustomerInCall(task)` | Whether customer is connected | task-util.ts (controls) |
| `getIsConsultInProgress(task)` | Whether consult is active | task-util.ts (controls) |
| `isInteractionOnHold(task)` | Whether any media is held | Task timer utils |
| `setmTypeForEPDN(task, mType)` | Media type for EP-DN agents | CallControl hook |
| `findMediaResourceId(task, mType)` | Media resource ID lookup | CallControl hook (switch calls) |
| `findHoldStatus(task, mType, agentId)` | Hold status by media type | task-util.ts (controls) |
| `findHoldTimestamp(task, mType)` | Hold timestamp for timers | Task timer, hold timer |

---

## Migration Decisions

### Remove (SDK handles via uiControls)

| Function | Reason | SDK Replacement |
|----------|--------|-----------------|
| `getConsultStatus(task, agentId)` | Used only for control visibility computation | `task.uiControls` encodes all consult control states |
| `getIsConferenceInProgress(task)` | Used only for control visibility computation | `task.uiControls.exitConference.isVisible` |
| `getConferenceParticipantsCount(task)` | Used only for control visibility computation | SDK computes max participant check internally |
| `getIsCustomerInCall(task)` | Used only for control visibility computation | SDK computes internally |
| `getIsConsultInProgress(task)` | Used only for control visibility computation | SDK computes internally |
| ~~`findHoldStatus(task, mType, agentId)`~~ | ~~Used for control visibility~~ | **MOVED TO KEEP** — still needed for `getTaskStatus()` held-state derivation and component layer `isHeld` (see below) |

### Keep (Widget-layer concerns)

| Function | Reason |
|----------|--------|
| `isIncomingTask(task, agentId)` | Store needs this for routing incoming tasks |
| `getTaskStatus(task, agentId)` | TaskList display needs human-readable status |
| `getConferenceParticipants(task, agentId)` | CallControl UI shows participant list (display, not control visibility) |
| `isInteractionOnHold(task)` | Timer logic needs this |
| `findMediaResourceId(task, mType)` | Switch-call actions need media resource IDs |
| `findHoldTimestamp(task, mType)` | Hold timer needs timestamp |
| `findHoldStatus(task, mType, agentId)` | Needed for `getTaskStatus()` held-state derivation and component layer `isHeld` — cannot derive from `controls.hold.isEnabled` |

### Review (may simplify)

| Function | Consideration |
|----------|--------------|
| `isSecondaryAgent(task)` | May be replaceable by SDK context |
| `isSecondaryEpDnAgent(task)` | May be replaceable by SDK context |
| `getConsultMPCState(task, agentId)` | Review if still needed with SDK handling consult state |
| `setmTypeForEPDN(task, mType)` | Review if SDK simplifies this |

---

## Old → New Mapping

| Old Function | Status | New Equivalent |
|-------------|--------|---------------|
| `getConsultStatus()` | **REMOVE** | `task.uiControls.endConsult`, `task.uiControls.switchToMainCall` etc. |
| `getIsConferenceInProgress()` | **REMOVE** | `task.uiControls.exitConference.isVisible` |
| `getConferenceParticipantsCount()` | **REMOVE** | SDK internal check |
| `getIsCustomerInCall()` | **REMOVE** | SDK internal check |
| `getIsConsultInProgress()` | **REMOVE** | SDK internal check |
| `findHoldStatus()` | **KEEP** | Still needed for `getTaskStatus()` held-state derivation and component layer `isHeld` — do NOT derive from `controls.hold` |
| `isIncomingTask()` | **KEEP** | — |
| `getTaskStatus()` | **KEEP** | Could enhance with SDK TaskState |
| `getConferenceParticipants()` | **KEEP** | Display only |
| `isInteractionOnHold()` | **KEEP** | Timer display |
| `findMediaResourceId()` | **KEEP** | Action parameter |
| `findHoldTimestamp()` | **KEEP** | Timer display |

---

---

## Before/After: Removing `getConsultStatus` Usage

### Before (consumed in `task-util.ts::getControlsVisibility`)
```typescript
// task-util.ts — old approach
import { getConsultStatus, ConsultStatus, getIsConsultInProgress, getIsCustomerInCall,
         getConferenceParticipantsCount, findHoldStatus } from '@webex/cc-store';

export function getControlsVisibility(deviceType, featureFlags, task, agentId, conferenceEnabled) {
  // Derive consult status by inspecting raw task data
  const taskConsultStatus = getConsultStatus(task, agentId);
  const isConsultInitiated = taskConsultStatus === ConsultStatus.CONSULT_INITIATED;
  const isConsultAccepted = taskConsultStatus === ConsultStatus.CONSULT_ACCEPTED;
  const isBeingConsulted = taskConsultStatus === ConsultStatus.BEING_CONSULTED_ACCEPTED;
  const isConsultCompleted = taskConsultStatus === ConsultStatus.CONSULT_COMPLETED;

  // Derive hold status from raw task media
  const isHeld = findHoldStatus(task, 'mainCall', agentId);
  const consultCallHeld = findHoldStatus(task, 'consult', agentId);

  // Derive conference state from raw task data
  const isConferenceInProgress = task?.data?.isConferenceInProgress ?? false;
  const isConsultInProgress = getIsConsultInProgress(task);
  const isCustomerInCall = getIsCustomerInCall(task);
  const conferenceParticipantsCount = getConferenceParticipantsCount(task);

  // 20+ individual visibility functions using these derived states...
  return { /* 22 controls + 7 state flags */ };
}
```

### After (all above replaced by `task.uiControls`)
```typescript
// task-util.ts — DELETED or reduced to only keep timer/hold helpers:
// findHoldTimestamp() — retained in task-util.ts for hold timer display
// findHoldStatus() — retained in task-util.ts for isHeld derivation (used by getTaskStatus, component layer)
// All other functions (getConsultStatus, getIsConsultInProgress, getConferenceParticipantsCount, etc.) — DELETED

// In useCallControl hook — no imports from store task-utils for controls:
const controls = currentTask?.uiControls ?? getDefaultUIControls();
// All 17 controls come pre-computed from SDK. Zero store util calls needed.
```

### Before/After: `findHoldStatus` — RETAINED (not removed)

#### Before (used in controls computation)
```typescript
// store/task-utils.ts
export function findHoldStatus(task: ITask, mType: string, agentId: string): boolean {
  if (!task?.data?.interaction?.media) return false;
  const media = Object.values(task.data.interaction.media).find(m => m.mType === mType);
  if (!media?.participants) return false;
  const participant = task.data.interaction.participants[agentId];
  return participant?.isHold ?? false;
}

// task-util.ts — consumed for control visibility
const isHeld = findHoldStatus(task, 'mainCall', agentId);
const consultCallHeld = findHoldStatus(task, 'consult', agentId);
```

#### After
```typescript
// REMOVED from store/task-utils.ts — SDK tracks hold state in TaskContext:
// - task.uiControls.hold.isEnabled indicates holdable
// - task.uiControls.switchToConsult.isVisible indicates consult call is held
// No widget-side derivation needed.
```

### Before/After: `getTaskStatus` (KEPT but enhanced)

#### Before
```typescript
// store/task-utils.ts — returns human-readable status
export function getTaskStatus(task: ITask, agentId: string): string {
  if (task.data.interaction?.isTerminated) return 'Wrap Up';
  const consultStatus = getConsultStatus(task, agentId);
  if (consultStatus === ConsultStatus.CONSULT_INITIATED) return 'Consulting';
  if (task.data.isConferenceInProgress) return 'Conference';
  if (findHoldStatus(task, 'mainCall', agentId)) return 'Held';
  return 'Connected';
}
```

#### After (enhanced with SDK controls)
```typescript
// store/task-utils.ts — can now derive status from uiControls
export function getTaskStatus(task: ITask, agentId: string): string {
  const controls = task.uiControls;
  if (!controls) return 'Unknown';
  if (controls.wrapup.isVisible) return 'Wrap Up';
  if (controls.endConsult.isVisible) return 'Consulting';
  if (controls.exitConference.isVisible) return 'Conference';
  // NOTE: Do NOT derive held state from controls.hold.isEnabled — hold can be
  // disabled in consult/transition states even when call is not held.
  // Use task data instead (agentId needed for participant lookup):
  if (findHoldStatus(task, 'mainCall', agentId)) return 'Held';
  if (controls.end.isVisible) return 'Connected';
  if (controls.accept.isVisible) return 'Offered';
  return 'Unknown';
}
```

---

## `findHoldTimestamp` Signature Mismatch (Pre-existing Issue)

**Discovery:** Two different `findHoldTimestamp` functions exist with different signatures:

| Location | Signature | Used By |
|----------|-----------|---------|
| `store/src/task-utils.ts` | `findHoldTimestamp(task: ITask, mType: string)` | `timer-utils.ts` |
| `task/src/Utils/task-util.ts` | `findHoldTimestamp(interaction: Interaction, mType: string)` | `useHoldTimer.ts` |

Both should be consolidated during migration. Recommend keeping only the store version (accepts `ITask`) for consistency.

---

## Files to Modify

| File | Action |
|------|--------|
| `store/src/task-utils.ts` | Remove 6 functions, keep 6, review 4 |
| `store/src/constants.ts` | Remove consult state constants if unused |
| `task/src/Utils/task-util.ts` | Major reduction (imports from store utils) |
| All consumers of removed functions | Update imports, switch to `task.uiControls` |

---

## Validation Criteria

- [ ] Removed functions have no remaining consumers
- [ ] Kept functions still work correctly
- [ ] TaskList status display unchanged
- [ ] Conference participant display unchanged
- [ ] Hold timer unchanged
- [ ] Switch-call media resource IDs work

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
