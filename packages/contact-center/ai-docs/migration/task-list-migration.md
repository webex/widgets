# TaskList Widget Migration

## Summary

The TaskList widget displays all active tasks and allows accept/decline/select. Changes are minimal since task list management (add/remove tasks) stays in the store, and SDK methods are unchanged. The main opportunity is to simplify how task status is derived for display.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/task/src/helper.ts`
**Hook:** `useTaskList(props: UseTaskListProps)`

### How It Works (Old)
1. Store maintains `taskList: Record<string, ITask>` observable
2. Store maintains `currentTask: ITask | null` observable
3. Hook provides `acceptTask(task)`, `declineTask(task)`, `onTaskSelect(task)` actions
4. Task status derived via `getTaskStatus(task, agentId)` from store's `task-utils.ts`
5. Task display data extracted by `cc-components/task/Task/task.utils.ts`

---

## New Approach

### What Changes
1. **Task status derivation** can potentially use state machine state instead of `getTaskStatus()`
2. **Task list management** (add/remove) stays the same — store-managed
3. **SDK methods unchanged**: `task.accept()`, `task.decline()`
4. **Store callbacks unchanged**: `setTaskAssigned`, `setTaskRejected`, `setTaskSelected`

### Minimal Changes Required
- If `getTaskStatus()` is used for display, consider using SDK task state info
- Accept/decline button visibility per task: use `task.uiControls?.accept` and `task.uiControls?.decline` (each has `isVisible`, `isEnabled`)
- Task selection logic unchanged
- Optional: if the list must react to control updates without task replacement, subscribe to `'task:ui-controls-updated'` per task (event name; enum `TASK_UI_CONTROLS_UPDATED` may not exist in store yet — use literal)

---

## Old → New Mapping

| Aspect | Old | New |
|--------|-----|-----|
| Task list source | `store.taskList` observable | `store.taskList` observable (unchanged) |
| Current task | `store.currentTask` observable | `store.currentTask` observable (unchanged) |
| Task status | `getTaskStatus(task, agentId)` from store utils | SDK task state or `task.uiControls` for button states |
| Accept action | `task.accept()` | `task.accept()` (unchanged) |
| Decline action | `task.decline()` | `task.decline()` (unchanged) |
| Select action | `store.setCurrentTask(task, isClicked)` | Unchanged |

---

## Before/After: Per-Task Accept/Decline in TaskList

### Before (TaskList component renders accept/decline per task)
```tsx
// task-list.tsx — old approach
const TaskListComponent = ({ taskList, isBrowser, onAccept, onDecline, onSelect }) => {
  return taskList.map((task) => {
    // Accept/decline visibility computed per-task from device type
    const showAccept = isBrowser; // simplified
    return (
      <TaskCard key={task.data.interactionId} task={task} onClick={() => onSelect(task)}>
        {showAccept && <Button onClick={() => onAccept(task)}>Accept</Button>}
        {showAccept && <Button onClick={() => onDecline(task)}>Decline</Button>}
      </TaskCard>
    );
  });
};
```

### After (use per-task `uiControls`)
```tsx
// task-list.tsx — new approach
const TaskListComponent = ({ taskList, onAccept, onDecline, onSelect }) => {
  return taskList.map((task) => {
    // SDK provides per-task control visibility
    const acceptControl = task.uiControls?.accept ?? {isVisible: false, isEnabled: false};
    const declineControl = task.uiControls?.decline ?? {isVisible: false, isEnabled: false};
    return (
      <TaskCard key={task.data.interactionId} task={task} onClick={() => onSelect(task)}>
        {acceptControl.isVisible && (
          <Button onClick={() => onAccept(task)} disabled={!acceptControl.isEnabled}>Accept</Button>
        )}
        {declineControl.isVisible && (
          <Button onClick={() => onDecline(task)} disabled={!declineControl.isEnabled}>Decline</Button>
        )}
      </TaskCard>
    );
  });
};
```

### Before/After: `useTaskList` Hook

#### Before
```typescript
// helper.ts — useTaskList (abbreviated)
export const useTaskList = (props: UseTaskListProps) => {
  const {deviceType, onTaskAccepted, onTaskDeclined, onTaskSelected, logger, taskList} = props;
  const isBrowser = deviceType === 'BROWSER';  // Used for accept/decline visibility

  // ... store callbacks and actions unchanged ...

  return {taskList, acceptTask, declineTask, onTaskSelect, isBrowser};
  //                                                        ^^^^^^^^^ passed to component
};
```

#### After
```typescript
// helper.ts — useTaskList (migrated)
export const useTaskList = (props: UseTaskListProps) => {
  const {onTaskAccepted, onTaskDeclined, onTaskSelected, logger, taskList} = props;
  // REMOVED: deviceType, isBrowser — no longer needed, SDK handles per-task visibility

  // ... store callbacks and actions unchanged ...

  return {taskList, acceptTask, declineTask, onTaskSelect};
  // REMOVED: isBrowser — each task.uiControls.accept/decline provides visibility
};
```

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/helper.ts` (`useTaskList`) | Remove `isBrowser`, use per-task `uiControls` for accept/decline |
| `task/src/TaskList/index.tsx` | Remove `isBrowser` prop pass-through |
| `cc-components/.../TaskList/task-list.tsx` | Use `task.uiControls.accept/decline` per task |
| `cc-components/.../TaskList/task-list.utils.ts` | Update `extractTaskListItemData()` to use `task.uiControls.accept/decline`; remove `isBrowser`-based gating |
| `cc-components/.../Task/task.utils.ts` | Update task data extraction if status source changes |
| `store/src/task-utils.ts` (`getTaskStatus`) | Consider deprecation if SDK provides equivalent |

---

## Validation Criteria

- [ ] Task list displays all active tasks
- [ ] Task selection works (sets `currentTask`)
- [ ] Accept/decline per task works
- [ ] Task status displays correctly (connected, held, wrapup, etc.)
- [ ] Tasks removed from list on end/reject
- [ ] New incoming tasks appear in list

---

_Parent: [migration-overview.md](./migration-overview.md)_
