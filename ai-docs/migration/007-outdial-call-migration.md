# Migration Doc 007: OutdialCall Widget Migration

## Summary

OutdialCall is largely **unaffected** by the task state machine refactor. It initiates outbound calls via `cc.startOutdial()` (a CC-level method, not a task method) and fetches ANI entries. The resulting task, once created, is handled by IncomingTask/TaskList/CallControl. No state machine integration needed here.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/task/src/helper.ts`
**Hook:** `useOutdialCall(props: useOutdialCallProps)`

### How It Works
1. Fetches ANI entries via `cc.getOutdialAniEntries()`
2. Validates phone number format
3. Initiates outbound call via `cc.startOutdial(destination, origin)`
4. Does NOT subscribe to any task events
5. Resulting task surfaces via `TASK_INCOMING` → IncomingTask widget

---

## New Approach

**No changes required.** The `cc.startOutdial()` method is a CC-level API, not a task-level API. The state machine is activated when the resulting task is created.

---

## Validation Criteria

- [ ] Outdial initiation works
- [ ] ANI entry fetching works
- [ ] Resulting task appears in task list via existing flow
- [ ] Phone number validation unchanged

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
