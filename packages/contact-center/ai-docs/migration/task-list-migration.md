# TaskList Widget Migration

## Summary

**Status: Done.** TaskList displays accept/decline per task using `task.uiControls.main.accept` and `task.uiControls.main.decline`. Task list membership stays store-managed via `refreshTaskList()`.

---

## Current Implementation

### Entry points

| Layer | File |
|-------|------|
| Hook | `task/src/helper.ts` — `useTaskList` |
| Widget wrapper | `task/src/TaskList/index.tsx` |
| Component | `cc-components/.../TaskList/task-list.tsx` |
| Utils | `cc-components/.../TaskList/task-list.utils.ts` |

### Per-task controls

```typescript
// task-list.utils.ts — extractTaskListItemData
const accept = acceptControl ?? task.uiControls?.main?.accept ?? {isVisible: false, isEnabled: false};
const sdkDecline = declineControl ?? task.uiControls?.main?.decline ?? {isVisible: false, isEnabled: false};
const decline = {
  ...sdkDecline,
  isEnabled: sdkDecline.isEnabled || !!isDeclineButtonEnabled,
};
```

`TaskList/index.tsx` passes `store.deviceType === 'BROWSER'` as `isBrowser` for outdial label text (same rules as IncomingTask).

### Re-render path

List rows update when store calls `refreshTaskList()` — including on `TASK_UI_CONTROLS_UPDATED`. No per-task `uiControls` subscription is required in TaskList today.

### Store callbacks (unchanged)

- `setTaskAssigned` → host `onTaskAccepted`
- `setTaskRejected` → host `onTaskDeclined`
- `setTaskSelected` → `setCurrentTask(task, isClicked)`

---

## Old → New Mapping

| Aspect | Old | New (current) |
|--------|-----|---------------|
| Task list source | `store.taskList` | Unchanged |
| Accept/decline visibility | `isBrowser` from `deviceType` | `task.uiControls.main.accept/decline` |
| Decline enabled | Device type only | SDK control OR `isDeclineButtonEnabled` |
| Accept label (outdial) | N/A | `isBrowser` + outdial rules in utils |
| Select action | `store.setCurrentTask` | Unchanged |

---

## Outdial label rules (mirrors IncomingTask)

In `extractTaskListItemData`:

```typescript
const isOutdial = task?.data?.interaction?.outboundType === 'OUTDIAL';
const showRinging = isTelephony && !accept.isEnabled && !(isBrowser && isOutdial);
const acceptText = accept.isVisible ? (showRinging ? 'Ringing...' : 'Accept') : undefined;
```

Phone number for outdial rows uses `dnis` over `ani` (same as IncomingTask).

---

## Validation Criteria

| Criterion | Status |
|-----------|--------|
| Per-task `uiControls.main.accept/decline` | **Done** |
| `isBrowser` for outdial text only | **Done** |
| `isDeclineButtonEnabled` bridge | **Done** |
| List sync via `refreshTaskList` + `TASK_UI_CONTROLS_UPDATED` | **Done** |
| `deviceType` removed as visibility gate | **Done** |

---

_Parent: [migration-overview.md](./migration-overview.md)_
_Updated: 2026-05-20_
