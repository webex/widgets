# IncomingTask Widget Migration

## Summary

**Status: Done.** IncomingTask accept/decline visibility and enablement come from `task.uiControls.main.accept` and `task.uiControls.main.decline`. Widget-side `getAcceptButtonVisibility` / `getDeclineButtonVisibility` are removed.

Host app shows the incoming popup via `store.setIncomingTaskCb`; widgets dismiss it via `onAccepted` / `onRejected` callbacks.

---

## Current Implementation

### Entry points

| Layer | File |
|-------|------|
| Hook | `task/src/helper.ts` — `useIncomingTask` |
| Widget wrapper | `task/src/IncomingTask/index.tsx` |
| Component | `cc-components/.../IncomingTask/incoming-task.tsx` |
| Utils | `cc-components/.../IncomingTask/incoming-task.utils.tsx` |

### Control source

```typescript
// helper.ts — useIncomingTask
const acceptControl = incomingTask?.uiControls?.main?.accept ?? {isVisible: false, isEnabled: false};
const sdkDeclineControl = incomingTask?.uiControls?.main?.decline ?? {isVisible: false, isEnabled: false};
const declineControl = {
  ...sdkDeclineControl,
  isEnabled: sdkDeclineControl.isEnabled || store.isDeclineButtonEnabled, // Legacy bridge
};
```

### Per-task event callbacks (dismiss popup)

Registered via `store.setTaskCallback` with **named** callbacks (required for correct `.off()` cleanup):

| Event | Callback | Effect |
|-------|----------|--------|
| `TASK_ASSIGNED` | `taskAssignCallback` | `onAccepted` — dismiss popup |
| `TASK_CONSULT_ACCEPTED` | `taskAssignCallback` | Same |
| `TASK_END` | `taskRejectCallback` | `onRejected` — dismiss popup |
| `TASK_REJECT` | `taskRejectCallback` | Same |
| `TASK_CONSULT_END` | `taskRejectCallback` | Same |
| `TASK_OUTDIAL_FAILED` | `taskRejectCallback` | Dismiss popup on outdial failure |

Actions unchanged: `incomingTask.accept()` → SDK → `TASK_ASSIGNED`; `incomingTask.decline()` → `TASK_REJECT`.

### Outdial-specific UI (widgets layer)

SDK sets accept disabled and decline `VISIBLE_DISABLED` for WebRTC outdial. Widgets add label text rules in `incoming-task.utils.tsx`:

| Mode | Accept label | Condition |
|------|--------------|-----------|
| Desktop outdial | "Accept" (disabled) | `isBrowser && isOutdial && !accept.isEnabled` |
| Extension outdial | "Ringing..." | `!isBrowser && isOutdial && !accept.isEnabled` |
| Extension inbound | "Ringing..." | `!isBrowser && !accept.isEnabled` |
| Desktop inbound | "Accept" | `accept.isVisible` |

`isBrowser` comes from `store.deviceType === 'BROWSER'` in `IncomingTask/index.tsx` — used for **label text only**, not visibility gating.

### Phone number display (outdial)

In `extractIncomingTaskData`, for outdial tasks ANI shown uses `dnis` (destination) over `ani`:

```typescript
const isOutdial = incomingTask?.data?.interaction?.outboundType === 'OUTDIAL';
const dnis = callAssociatedDetails?.dnis || callProcessingDetails?.dnis;
const ani = isOutdial ? dnis || callAssociatedDetails?.ani : callAssociatedDetails?.ani;
```

CallControlCAD uses the same pattern for header title (see [component-layer-migration.md](./component-layer-migration.md)).

### Host popup vs widget dismiss

| Concern | Owner |
|---------|-------|
| Show incoming popup + sound | Host — `setIncomingTaskCb` |
| Outdial failure modal | Host — `setOutdialFailed` |
| Task rejected popup | Host — `setTaskRejected` |
| Dismiss incoming notification | Widget — `onAccepted` / `onRejected` props |

---

## Old → New Mapping

| Aspect | Old | New (current) |
|--------|-----|---------------|
| Accept visible | `getAcceptButtonVisibility(...)` | `task.uiControls.main.accept.isVisible` |
| Decline visible | `getDeclineButtonVisibility(...)` | `task.uiControls.main.decline.isVisible` |
| Decline enabled | `store.isDeclineButtonEnabled` only | SDK `decline.isEnabled` **OR** `store.isDeclineButtonEnabled` |
| Accept action | `task.accept()` | Unchanged |
| Decline action | `task.decline()` | Unchanged |
| Device type for buttons | `isBrowser` gates visibility | `isBrowser` for outdial **label text** only |

---

## Validation Criteria

| Criterion | Status |
|-----------|--------|
| Accept/decline from `uiControls.main` | **Done** |
| Named callbacks for cleanup | **Done** |
| `TASK_OUTDIAL_FAILED` dismisses popup | **Done** |
| Outdial accept/decline labels (Desktop vs Extension) | **Done** |
| Outdial ANI uses `dnis` | **Done** |
| Legacy `isDeclineButtonEnabled` bridge | **Done** (pending full SDK-only decline enablement) |
| RONA timer → `task.decline()` | **Done** |

---

## Migration Fix Log

### Fix: Restore `isDeclineButtonEnabled` bridge

Store `handleAutoAnswer` still sets `isDeclineButtonEnabled`. Hook and utils OR this with `uiControls.main.decline.isEnabled` so decline enables after auto-answer when SDK timing lags.

### Fix: Outdial accept label and phone number

- Desktop outdial: show "Accept" disabled (not "Ringing...")
- Extension outdial: show "Ringing..."
- Display customer number via `dnis` for outdial in incoming task header

---

_Parent: [migration-overview.md](./migration-overview.md)_
_Updated: 2026-05-20_
