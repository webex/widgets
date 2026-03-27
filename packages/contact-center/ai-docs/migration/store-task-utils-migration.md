# Store Task Utils Migration

## Summary

The store's `task-utils.ts` contains 16 exported utility functions. With the SDK task-refactor, `task.uiControls` is the single source of truth for UI control states, and `task.data` provides state flags directly (hold state, conference status, consult status). Most store utils become **dead code** because their only consumer — `getControlsVisibility()` — is being deleted.

**What gets removed:** 10 functions (the `getControlsVisibility` → `getConsultStatus` → `getTaskStatus` → `getConsultMPCState` chain, plus helper functions consumed only within that chain). Delete them along with their associated constants and types.

**What stays:** 6 functions that serve widget-layer concerns unrelated to control visibility (task routing, participant display, media resource lookup, hold timestamp for timers).

**Barrel export:** `store/src/index.ts` has `export * from './task-utils'`. Before removing, confirm with downstream consumers (Epic) that these utils are unused externally. Exported does not mean used.

---

## Files to Modify

| File | Action |
|------|--------|
| `store/src/task-utils.ts` | Remove 10 dead-code functions, keep 6 |
| `store/src/store.types.ts` | Delete `ConsultStatus` enum |
| `store/src/constants.ts` | Delete 12 task/interaction/consult state constants (all consumers are being removed). Keep 7 participant/media constants. |
| `task/src/Utils/task-util.ts` | Delete `getControlsVisibility` + all 22 `get*ButtonVisibility` functions; keep `findHoldTimestamp(interaction, mType)` |
| `store/tests/task-utils.ts` | Remove tests for 10 deleted functions |
| `task/tests/utils/task-util.ts` | Remove tests for deleted visibility functions |
| All consumers of removed functions | Update imports |

---

## Dead Code — Functions to Remove (10 functions)

These functions form a dependency chain rooted at `getControlsVisibility()`. Once `getControlsVisibility()` is deleted (replaced by `task.uiControls`), the entire chain is unused and should be deleted.

### Primary chain (consumed only by `getControlsVisibility`)

| # | Function | Why dead |
|---|----------|----------|
| 1 | `getConsultStatus(task, agentId)` | Only consumer is `getControlsVisibility` |
| 2 | `getIsConferenceInProgress(task)` | Only consumer is `getControlsVisibility` (tests only — production code uses `task?.data?.isConferenceInProgress` directly) |
| 3 | `getConferenceParticipantsCount(task)` | Only consumer is `getControlsVisibility` |
| 4 | `getIsCustomerInCall(task)` | Only consumer is `getControlsVisibility` |
| 5 | `getIsConsultInProgress(task)` | Only consumer is `getControlsVisibility` |

### Secondary chain (consumed only by functions above)

| # | Function | Why dead |
|---|----------|----------|
| 6 | `getTaskStatus(task, agentId)` | Only consumer is `getConsultStatus()` — no external consumer |
| 7 | `getConsultMPCState(task, agentId)` | Only consumer is `getTaskStatus()` |
| 8 | `isSecondaryEpDnAgent(task)` | Only consumers are `getTaskStatus()` and `getConsultStatus()` |
| 9 | `isSecondaryAgent(task)` | Only consumer is internal `task-utils.ts` logic |

### Hold status (replaced by SDK)

| # | Function | Why removed |
|---|----------|-------------|
| 10 | `findHoldStatus(task, mType, agentId)` | SDK state machine tracks hold state internally. Widgets get hold state from the task object. Do NOT derive from `controls.hold.isEnabled` (that is an action flag — disabled during conference/consulting even when call is held). |

### SDK replacements for removed functions

| Old function | SDK replacement |
|---|---|
| `getConsultStatus` / `getTaskStatus` (for display) | `task.data.consultStatus` (e.g. `consultInitiated`, `consultAccepted`) |
| `getIsConferenceInProgress` | `task.data.isConferenceInProgress` |
| `getIsConsultInProgress` / `getIsCustomerInCall` / `getConferenceParticipantsCount` | SDK computes internally via `task.uiControls` |
| `findHoldStatus` | Task object (SDK tracks hold state in `TaskContext`) |

---

## Functions to Keep (6 functions)

| # | Function | Why kept |
|---|----------|----------|
| 1 | `isIncomingTask(task, agentId)` | Store task routing — not related to control visibility |
| 2 | `getConferenceParticipants(task, agentId)` | CallControl UI participant list display. Uses `EXCLUDED_PARTICIPANT_TYPES`. |
| 3 | `isInteractionOnHold(task)` | Timer logic |
| 4 | `findMediaResourceId(task, mType)` | Switch-call actions need media resource IDs. Uses `RELATIONSHIP_TYPE_CONSULT`, `MEDIA_TYPE_CONSULT`. |
| 5 | `findHoldTimestamp(task, mType)` | Hold timer needs timestamp |
| 6 | `setmTypeForEPDN(task, mType)` | Media type for EP-DN agents, used by CallControl hook |

### `findHoldTimestamp` Dual Signatures

Two different `findHoldTimestamp` functions exist:
- **`store/src/task-utils.ts`:** `findHoldTimestamp(task: ITask, mType: string)` — takes full task object
- **`task/src/Utils/task-util.ts`:** `findHoldTimestamp(interaction: Interaction, mType: string)` — takes interaction only

`timer-utils.ts` imports from `@webex/cc-store` (task version). `useHoldTimer.ts` imports from `task-util` (interaction version). Both are kept. Do not confuse them during migration.

---

## Constants and Types to Delete

Since the functions that depend on these constants are all being deleted, there is **no ordering constraint** — delete constants and functions together.

| Delete | File | Reason |
|--------|------|--------|
| Local `TASK_EVENTS` enum | `store/src/store.types.ts` | SDK exports this (see [store-event-wiring-migration.md](./store-event-wiring-migration.md)) |
| `ConsultStatus` enum | `store/src/store.types.ts` | All consumers (`getConsultStatus`, `getControlsVisibility`) are being deleted |
| `TASK_STATE_CONSULT` | `store/src/constants.ts` | Consumers (`getConsultMPCState`, `findHoldStatus`) are being deleted |
| `TASK_STATE_CONSULTING` | `store/src/constants.ts` | Consumer (`getConsultMPCState`) is being deleted |
| `TASK_STATE_CONSULT_COMPLETED` | `store/src/constants.ts` | Consumer (`getConsultMPCState`) is being deleted |
| `INTERACTION_STATE_WRAPUP` | `store/src/constants.ts` | Consumer (`getTaskStatus`) is being deleted |
| `INTERACTION_STATE_POST_CALL` | `store/src/constants.ts` | Consumer (`getTaskStatus`) is being deleted |
| `INTERACTION_STATE_CONNECTED` | `store/src/constants.ts` | Consumer (`getTaskStatus`) is being deleted |
| `INTERACTION_STATE_CONFERENCE` | `store/src/constants.ts` | Consumer (`getTaskStatus`) is being deleted |
| `CONSULT_STATE_INITIATED` | `store/src/constants.ts` | Consumer (`getConsultMPCState`) is being deleted |
| `CONSULT_STATE_COMPLETED` | `store/src/constants.ts` | Consumer (`getConsultMPCState`) is being deleted |
| `CONSULT_STATE_CONFERENCING` | `store/src/constants.ts` | Consumer (`getConsultMPCState`) is being deleted |

**Consult string alias:** `TASK_STATE_CONSULT`, `RELATIONSHIP_TYPE_CONSULT`, and `MEDIA_TYPE_CONSULT` all resolve to `'consult'`. After deletion, only `RELATIONSHIP_TYPE_CONSULT` and `MEDIA_TYPE_CONSULT` remain (used by `findMediaResourceId`).

## Constants to Keep

Used by retained functions — do not delete.

| Keep | File | Used by |
|------|------|---------|
| `RELATIONSHIP_TYPE_CONSULT` | `store/src/constants.ts` | `findMediaResourceId` |
| `MEDIA_TYPE_CONSULT` | `store/src/constants.ts` | `findMediaResourceId` |
| `AGENT` | `store/src/constants.ts` | `getConferenceParticipants` |
| `CUSTOMER` | `store/src/constants.ts` | `EXCLUDED_PARTICIPANT_TYPES` |
| `SUPERVISOR` | `store/src/constants.ts` | `EXCLUDED_PARTICIPANT_TYPES` |
| `VVA` | `store/src/constants.ts` | `EXCLUDED_PARTICIPANT_TYPES` |
| `EXCLUDED_PARTICIPANT_TYPES` | `store/src/constants.ts` | `getConferenceParticipants` |

---

## `getControlsVisibility` Deletion Scope

> **Note:** `getControlsVisibility` lives in `task/src/Utils/task-util.ts` (hook layer, not store). It appears here because it is the primary consumer of the store functions being removed. Full hook-layer migration is covered in [call-control-hook-migration.md](./call-control-hook-migration.md).

### What gets deleted from `task-util.ts`

`getControlsVisibility` + all 22 `get*ButtonVisibility` functions:
`getAcceptButtonVisibility`, `getDeclineButtonVisibility`, `getEndButtonVisibility`, `getMuteUnmuteButtonVisibility`, `getHoldResumeButtonVisibility`, `getPauseResumeRecordingButtonVisibility`, `getRecordingIndicatorVisibility`, `getTransferButtonVisibility`, `getConferenceButtonVisibility`, `getExitConferenceButtonVisibility`, `getMergeConferenceButtonVisibility`, `getConsultButtonVisibility`, `getEndConsultButtonVisibility`, `getConsultTransferButtonVisibility`, `getMergeConferenceConsultButtonVisibility`, `getConsultTransferConsultButtonVisibility`, `getMuteUnmuteConsultButtonVisibility`, `getSwitchToMainCallButtonVisibility`, `getSwitchToConsultButtonVisibility`, `getWrapupButtonVisibility`

### What replaces it

```typescript
import { getDefaultUIControls } from '@webex/contact-center';

const controls = currentTask?.uiControls ?? getDefaultUIControls();
```

`getDefaultUIControls()` is exported by the SDK from `uiControlsComputer.ts` — it returns a `TaskUIControls` object with all 17 controls set to `{ isVisible: false, isEnabled: false }`. Used as a safe fallback when `currentTask` is null.

### Feature-flag gating — handled by SDK

The old `getControlsVisibility` applied integrator-provided widget props (`featureFlags`, `conferenceEnabled`, `deviceType`) to gate controls. The SDK now handles this internally via `UIControlConfig` (derived from agent profile and `callProcessingDetails`):

| Old widget prop | SDK equivalent |
|-----------------|---------------|
| `featureFlags.isEndCallEnabled` | `config.isEndTaskEnabled` |
| `featureFlags.isEndConsultEnabled` | `config.isEndConsultEnabled` |
| `featureFlags.webRtcEnabled` (recording gate) | `config.isRecordingEnabled` |
| `conferenceEnabled` | SDK computes conference/mergeToConference/exitConference visibility based on task state and config |

Since `task.uiControls` already reflects these gates, the widget layer can **remove** the `featureFlags`, `conferenceEnabled`, and `deviceType` props — no widget-side overlay is needed.

```typescript
const controls = currentTask?.uiControls ?? getDefaultUIControls();
```

---

## Validation Criteria

- [ ] 10 dead-code functions deleted with no remaining consumers (compile check)
- [ ] 6 kept functions still work correctly
- [ ] `ConsultStatus` enum removed
- [ ] 12 state constants deleted; 7 participant/media constants kept
- [ ] `getControlsVisibility` + 22 visibility functions deleted from `task-util.ts`
- [ ] `findHoldTimestamp` dual-signature (task vs interaction) not confused
- [ ] Widget props `featureFlags`, `conferenceEnabled`, `deviceType` removed (SDK handles via `UIControlConfig`)
- [ ] No regression in conference participant display, hold timers, or switch-call actions
- [ ] Downstream (Epic) confirmed unused before removing barrel exports

---

_Parent: [migration-overview.md](./migration-overview.md)_
_Updated: 2026-03-24 (aligned with PR #648 decisions — dead code removal, SDK source of truth, feature-flag gating moved to SDK per bhabalan review)_
