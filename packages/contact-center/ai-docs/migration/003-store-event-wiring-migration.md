# Migration Doc 003: Store Event Wiring Refactor

## Summary

The store's `storeEventsWrapper.ts` currently registers 30+ individual task event handlers that manually call `refreshTaskList()` and update observables. With the state machine, the SDK handles state transitions internally. Many event handlers can be simplified or removed, and the new `task:ui-controls-updated` event replaces manual state derivation.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/store/src/storeEventsWrapper.ts`
**Method:** `registerTaskEventListeners(task: ITask)`

### How It Works (Old)
1. On task creation, store registers individual listeners for 30+ task events
2. Each handler manually updates store observables (taskList, currentTask)
3. Many handlers simply call `refreshTaskList()` to re-fetch task state
4. Some handlers have specialized logic (consult, conference lifecycle)
5. Widgets subscribe to store callbacks via `setTaskCallback(event, cb, taskId)`

### Old Event Handlers

| Event | Handler | Action |
|-------|---------|--------|
| `TASK_END` | `handleTaskEnd` | Remove task from list, clear current task |
| `TASK_ASSIGNED` | `handleTaskAssigned` | Update task list, set current task |
| `AGENT_OFFER_CONTACT` | `refreshTaskList` | Re-fetch all tasks |
| `AGENT_CONSULT_CREATED` | `handleConsultCreated` | Update task list, fire callbacks |
| `TASK_CONSULT_QUEUE_CANCELLED` | `handleConsultQueueCancelled` | Refresh + fire callbacks |
| `TASK_REJECT` | `handleTaskReject` | Remove task, fire callbacks |
| `TASK_OUTDIAL_FAILED` | `handleOutdialFailed` | Remove task, fire callbacks |
| `AGENT_WRAPPEDUP` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_CONSULTING` | `handleConsulting` | Refresh + fire callbacks |
| `TASK_CONSULT_ACCEPTED` | `handleConsultAccepted` | Refresh + fire callbacks |
| `TASK_OFFER_CONSULT` | `handleConsultOffer` | Refresh + fire callbacks |
| `TASK_AUTO_ANSWERED` | `handleAutoAnswer` | Refresh + fire callbacks |
| `TASK_CONSULT_END` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_HOLD` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_RESUME` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_CONFERENCE_ENDED` | `handleConferenceEnded` | Refresh + fire callbacks |
| `TASK_CONFERENCE_END_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_CONFERENCE_ESTABLISHING` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_CONFERENCE_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_PARTICIPANT_JOINED` | `handleConferenceStarted` | Refresh + fire callbacks |
| `TASK_PARTICIPANT_LEFT` | `handleConferenceEnded` | Refresh + fire callbacks |
| `TASK_PARTICIPANT_LEFT_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_CONFERENCE_STARTED` | `handleConferenceStarted` | Refresh + fire callbacks |
| `TASK_CONFERENCE_TRANSFERRED` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_CONFERENCE_TRANSFER_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_POST_CALL_ACTIVITY` | `refreshTaskList` | Re-fetch all tasks |
| `TASK_MEDIA` | `handleTaskMedia` | Browser-only media setup |

---

## New Approach

### What Changes in SDK
1. SDK state machine handles all transitions internally
2. `task.data` is updated by the state machine's `updateTaskData` action on every event
3. `task.uiControls` is recomputed after every state transition
4. `task:ui-controls-updated` is emitted when controls change

### Proposed New Event Registration

Many events that currently trigger `refreshTaskList()` will no longer need it because `task.data` is kept in sync by the SDK. The store should:

| Event | New Handler | Change |
|-------|-------------|--------|
| `TASK_END` | `handleTaskEnd` | **Keep** (need to remove from task list) |
| `TASK_ASSIGNED` | `handleTaskAssigned` | **Keep** (need to update current task) |
| `TASK_REJECT` | `handleTaskReject` | **Keep** (need to remove from task list) |
| `TASK_OUTDIAL_FAILED` | `handleOutdialFailed` | **Keep** (need to remove from task list) |
| `TASK_MEDIA` | `handleTaskMedia` | **Keep** (browser WebRTC setup) |
| `TASK_UI_CONTROLS_UPDATED` | **NEW** — `handleUIControlsUpdated` | **Add** — trigger widget re-renders |
| `TASK_WRAPUP` | `handleWrapup` | **Simplify** — no need to refresh |
| `AGENT_WRAPPEDUP` | `handleWrappedup` | **Keep refresh or add explicit task removal** — task must be removed from `taskList`/`currentTask` after wrapup completion to prevent stale UI |
| `TASK_HOLD` | Fire callback only | **Simplify** — no `refreshTaskList()` |
| `TASK_RESUME` | Fire callback only | **Simplify** — no `refreshTaskList()` |
| `TASK_CONSULT_END` | `handleConsultEnd` | **Keep handler** — must reset `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp` + fire callback |
| `TASK_CONSULT_QUEUE_CANCELLED` | `handleConsultQueueCancelled` | **Keep handler** — must reset `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp` + fire callback |
| `TASK_CONSULTING` | `handleConsulting` | **Keep handler** — sets `consultStartTimeStamp` + fire callback |
| Other `TASK_CONSULT_*` | Fire callback only | **Simplify** — SDK manages task state |
| `TASK_PARTICIPANT_JOINED` / `TASK_CONFERENCE_STARTED` | `handleConferenceStarted` | **Keep handler** — must reset `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp` |
| `TASK_CONFERENCE_ENDED` / `TASK_PARTICIPANT_LEFT` | `handleConferenceEnded` | **Keep handler** — conference cleanup logic |
| Other `TASK_CONFERENCE_*` | Fire callback only | **Simplify** — SDK manages task state |
| `AGENT_OFFER_CONTACT` | Fire callback only | **Simplify** — SDK updates task.data |
| `TASK_POST_CALL_ACTIVITY` | Fire callback only | **Simplify** |
| All other `refreshTaskList()` handlers | Remove or fire callback only | **Simplify** |

### Key Insight: `refreshTaskList()` Elimination

**Old:** 15+ events trigger `refreshTaskList()` → `cc.taskManager.getAllTasks()` → update store observables.

**New:** SDK keeps `task.data` updated via state machine actions. The store can read `task.data` directly instead of re-fetching. `refreshTaskList()` should only be called for:
- Initial load / hydration
- Full page refresh recovery
- Edge cases where task data is stale

---

## Old → New Event Handler Mapping

| Old Handler | Old Action | New Action |
|-------------|-----------|------------|
| `refreshTaskList` (15+ events) | Re-fetch ALL tasks from SDK | **Remove** — task.data is live; fire callbacks only |
| `handleTaskEnd` | Remove from list + cleanup | **Keep** — still need list management |
| `handleTaskAssigned` | Set current task | **Keep** — still need list management |
| `handleConsultCreated` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleConsulting` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleConsultAccepted` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleConsultOffer` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleConferenceStarted` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleConferenceEnded` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleAutoAnswer` | Refresh + callbacks | **Simplify** — callbacks only |
| `handleTaskReject` | Remove from list | **Keep** |
| `handleOutdialFailed` | Remove from list | **Keep** |
| `handleTaskMedia` | WebRTC media setup | **Keep** |

---

## Refactor Patterns (Before/After)

### Pattern 1: `registerTaskEventListeners()` — Adding UI Controls Handler

#### Before
```typescript
// storeEventsWrapper.ts — registerTaskEventListeners(task)
registerTaskEventListeners(task: ITask) {
  const interactionId = task.data.interactionId;
  task.on(TASK_EVENTS.TASK_END, (data) => this.handleTaskEnd(data, interactionId));
  task.on(TASK_EVENTS.TASK_ASSIGNED, (data) => this.handleTaskAssigned(data, interactionId));
  task.on(TASK_EVENTS.AGENT_OFFER_CONTACT, () => this.refreshTaskList());
  task.on(TASK_EVENTS.TASK_HOLD, () => this.refreshTaskList());
  task.on(TASK_EVENTS.TASK_RESUME, () => this.refreshTaskList());
  task.on(TASK_EVENTS.TASK_CONSULT_END, () => this.refreshTaskList());
  task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, () => this.refreshTaskList());
  task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, (data) => this.handleConferenceStarted(data, interactionId));
  // ... 20+ more event registrations, most calling refreshTaskList()
}
```

#### After
```typescript
// storeEventsWrapper.ts — registerTaskEventListeners(task)
registerTaskEventListeners(task: ITask) {
  const interactionId = task.data.interactionId;

  // NEW: Subscribe to SDK-computed UI control updates
  task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, (uiControls) => {
    this.fireTaskCallbacks(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, interactionId, uiControls);
  });

  // KEEP: Task lifecycle events that need store-level management
  task.on(TASK_EVENTS.TASK_END, (data) => this.handleTaskEnd(data, interactionId));
  task.on(TASK_EVENTS.TASK_ASSIGNED, (data) => this.handleTaskAssigned(data, interactionId));
  task.on(TASK_EVENTS.TASK_REJECT, (data) => this.handleTaskReject(data, interactionId));
  task.on(TASK_EVENTS.TASK_OUTDIAL_FAILED, (data) => this.handleOutdialFailed(data, interactionId));
  task.on(TASK_EVENTS.TASK_MEDIA, (data) => this.handleTaskMedia(data, interactionId));

  // SIMPLIFIED: Events that only need callback firing (SDK keeps task.data in sync)
  task.on(TASK_EVENTS.TASK_HOLD, () => this.fireTaskCallbacks(TASK_EVENTS.TASK_HOLD, interactionId));
  task.on(TASK_EVENTS.TASK_RESUME, () => this.fireTaskCallbacks(TASK_EVENTS.TASK_RESUME, interactionId));
  // AGENT_WRAPPEDUP: still needs task cleanup — refresh or explicitly remove from taskList/currentTask
  task.on(TASK_EVENTS.AGENT_WRAPPEDUP, (data) => {
    this.refreshTaskList(); // retain: task must be removed from list after wrapup completion
    this.fireTaskCallbacks(TASK_EVENTS.AGENT_WRAPPEDUP, interactionId, data);
  });
  task.on(TASK_EVENTS.TASK_RECORDING_PAUSED, () => this.fireTaskCallbacks(TASK_EVENTS.TASK_RECORDING_PAUSED, interactionId));
  task.on(TASK_EVENTS.TASK_RECORDING_RESUMED, () => this.fireTaskCallbacks(TASK_EVENTS.TASK_RECORDING_RESUMED, interactionId));
  // ... consult/conference events: fire callbacks only, no refreshTaskList()
}
```

### Pattern 2: Simplifying `refreshTaskList()` Event Handlers

#### Before
```typescript
// 15+ events all trigger a full re-fetch
task.on(TASK_EVENTS.TASK_HOLD, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_RESUME, () => this.refreshTaskList());
task.on(TASK_EVENTS.AGENT_WRAPPEDUP, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_CONSULT_END, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_CONFERENCE_FAILED, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, () => this.refreshTaskList());
task.on(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, () => this.refreshTaskList());
// refreshTaskList() does: cc.taskManager.getAllTasks() → update store.taskList
```

#### After
```typescript
// SDK keeps task.data in sync via state machine.
// refreshTaskList() only called on initialization/hydration.
// Individual events just fire callbacks for widget-layer side effects.

task.on(TASK_EVENTS.TASK_HOLD, () => {
  this.fireTaskCallbacks(TASK_EVENTS.TASK_HOLD, interactionId);
});
task.on(TASK_EVENTS.TASK_RESUME, () => {
  this.fireTaskCallbacks(TASK_EVENTS.TASK_RESUME, interactionId);
});
// No refreshTaskList() — task.data already updated by SDK
```

### Pattern 3: Conference Handler Simplification

#### Before
```typescript
handleConferenceStarted(data: any, interactionId: string) {
  this.refreshTaskList();  // Re-fetch all tasks from SDK
  this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_STARTED, interactionId, data);
  this.fireTaskCallbacks(TASK_EVENTS.TASK_PARTICIPANT_JOINED, interactionId, data);
}

handleConferenceEnded(data: any, interactionId: string) {
  this.refreshTaskList();  // Re-fetch all tasks from SDK
  this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_ENDED, interactionId, data);
  this.fireTaskCallbacks(TASK_EVENTS.TASK_PARTICIPANT_LEFT, interactionId, data);
}
```

#### After
```typescript
// SDK state machine handles CONFERENCING state transitions.
// task.data and task.uiControls already reflect conference state.
// Store just fires callbacks for widget-layer side effects.

handleConferenceStarted(data: any, interactionId: string) {
  this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_STARTED, interactionId, data);
  this.fireTaskCallbacks(TASK_EVENTS.TASK_PARTICIPANT_JOINED, interactionId, data);
}

handleConferenceEnded(data: any, interactionId: string) {
  this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_ENDED, interactionId, data);
  this.fireTaskCallbacks(TASK_EVENTS.TASK_PARTICIPANT_LEFT, interactionId, data);
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `store/src/storeEventsWrapper.ts` | Refactor `registerTaskEventListeners`, simplify/remove handlers |
| `store/src/store.ts` | No changes expected (observables stay) |
| `store/src/store.types.ts` | Add `TASK_UI_CONTROLS_UPDATED` if not re-exported from SDK |

---

## Validation Criteria

- [ ] Task list stays in sync on all lifecycle events (incoming, assigned, end, reject)
- [ ] `refreshTaskList()` only called on init/hydration, not on every event
- [ ] Widget callbacks still fire correctly for events that require UI updates
- [ ] `task:ui-controls-updated` triggers re-renders in widgets
- [ ] No regression in consult/conference/hold flows
- [ ] Task removal from list on end/reject works correctly

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
