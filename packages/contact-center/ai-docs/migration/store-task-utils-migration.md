# Store Task Utils Migration

## Summary

**Status: Done.** The store's [`task-utils.ts`](../../store/src/task-utils.ts) was trimmed to widget-layer helpers that are **not** replaced by `task.uiControls`. The `getControlsVisibility()` dependency chain (`getConsultStatus`, `getTaskStatus`, `findHoldStatus`, etc.) has been **removed**.

---

## Removed Functions (Historical)

These were deleted because their only consumer was `getControlsVisibility()` (also removed from `task-util.ts`):

| Function | SDK replacement |
|----------|-----------------|
| `getConsultStatus`, `getTaskStatus`, `getConsultMPCState` | `task.data.consultStatus` for display; controls from `task.uiControls` |
| `getIsConferenceInProgress`, `getIsConsultInProgress`, `getIsCustomerInCall`, `getConferenceParticipantsCount` | SDK computes via `uiControlsComputer` |
| `findHoldStatus` | `isInteractionOnHold(task)` + CallControl hook hold logic |

Associated constants (`ConsultStatus` enum, interaction/consult state constants used only by removed functions) were deleted per original migration plan.

---

## Functions That Remain

| Function | Purpose |
|----------|---------|
| `isIncomingTask(task, agentId)` | Store routing — incoming tasks not set as `currentTask` |
| `getConferenceParticipants(task, agentId)` | CallControl participant list UI |
| `isInteractionOnHold(task)` | Hold indicator — checks main-call media only |
| `findMediaResourceId(task, mType)` | Switch-call / hold actions need media resource IDs |
| `findHoldTimestamp(task, mType)` | Hold timer timestamp |
| `setmTypeForEPDN(task, mType)` | EP-DN agent media type for CallControl hook |
| `isSecondaryAgent(task)` | EP-DN / consult secondary agent detection |
| `isSecondaryEpDnAgent(task)` | Telephony secondary EP-DN check |

### `findHoldTimestamp` dual signatures

- **`store/task-utils.ts`:** `findHoldTimestamp(task, mType)` — used by timer utils via `@webex/cc-store`
- **`task/Utils/task-util.ts`:** `findHoldTimestamp(interaction, mType)` — used by `useHoldTimer.ts`

Do not confuse the two signatures.

---

## Hold State Guidance

**Do NOT** use `controls.main.hold.isEnabled` as the hold-state indicator — it is an action flag (disabled during conference/consult even when call is held).

**Use instead:**
- `isInteractionOnHold(currentTask)` for main-leg hold chip
- CallControl hook logic for consult (`activeLeg`, `controls.consult.endConsult.isVisible`) and conference (`conferenceHoldParticipant`, explicit hold/unhold event types)

---

## `getControlsVisibility` Deletion

Removed from `task/src/Utils/task-util.ts` along with all 22 `get*ButtonVisibility` helpers.

**Replacement:**

```typescript
import { getDefaultUIControls } from '@webex/cc-store';

const controls = currentTask?.uiControls ?? getDefaultUIControls();
// Access per-leg: controls.main.hold, controls.consult.endConsult, controls.activeLeg
```

Feature-flag gating (`isEndTaskEnabled`, `isEndConsultEnabled`, `isRecordingEnabled`) is applied inside SDK `uiControlsComputer` via `UIControlConfig`. **`conferenceEnabled`** remains an application-level prop at the widget/component layer.

---

## Validation Criteria

| Criterion | Status |
|-----------|--------|
| Dead-code chain removed | **Done** |
| Kept functions still used | **Done** |
| `ConsultStatus` enum and unused constants removed | **Done** |
| `getControlsVisibility` + 22 helpers removed from task-util | **Done** |
| Hold state not derived from `controls.hold.isEnabled` | **Done** |
| `findHoldTimestamp` dual-signature preserved | **Done** |

---

_Parent: [migration-overview.md](./migration-overview.md)_
_Updated: 2026-05-20_
