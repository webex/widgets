# Store Event Wiring Migration

## Summary

The store's `storeEventsWrapper.ts` currently registers 27 individual task event handlers via `registerTaskEventListeners()` that manually call `refreshTaskList()` and update observables. A companion method `handleTaskRemove()` unregisters them. With the state machine, the SDK handles state transitions internally. Many event handlers can be simplified or removed, and the new `task:ui-controls-updated` event replaces manual state derivation.

---

## Event Names — Renamed and Deleted

The widget's local `TASK_EVENTS` enum (in `store/src/store.types.ts`) uses CC-level naming that differs from the SDK's task-level naming.

### 5 Renamed Events

| Old (Widget) | Old Value | New (SDK) | New Value |
|---|---|---|---|
| `AGENT_WRAPPEDUP` | `'AgentWrappedUp'` | `TASK_WRAPPEDUP` | `'task:wrappedup'` |
| `AGENT_CONSULT_CREATED` | `'AgentConsultCreated'` | `TASK_CONSULT_CREATED` | `'task:consultCreated'` |
| `AGENT_OFFER_CONTACT` | `'AgentOfferContact'` | `TASK_OFFER_CONTACT` | `'task:offerContact'` |
| `CONTACT_RECORDING_PAUSED` | `'ContactRecordingPaused'` | `TASK_RECORDING_PAUSED` | `'task:recordingPaused'` |
| `CONTACT_RECORDING_RESUMED` | `'ContactRecordingResumed'` | `TASK_RECORDING_RESUMED` | `'task:recordingResumed'` |

### 4 Store-Only Enum Members (no SDK equivalent — delete)

| Widget Enum Member | Value | Note |
|---|---|---|
| `TASK_UNHOLD` | `'task:unhold'` | SDK uses `TASK_RESUME` instead |
| `TASK_CONSULT` | `'task:consult'` | No SDK equivalent; consult flow uses multiple events |
| `TASK_PAUSE` | `'task:pause'` | No SDK equivalent; SDK uses `TASK_HOLD` |
| `AGENT_CONTACT_ASSIGNED` | `'AgentContactAssigned'` | SDK uses `TASK_ASSIGNED` (`'task:assigned'`) |

**Docs to update when migrating event names:** CallControl widget spec references `TASK_CONSULT` (and related consult flow) in its sequence diagram — see `packages/contact-center/task/ai-docs/widgets/CallControl/ARCHITECTURE.md` (consult sequence around line 169). Update that doc to use SDK event names and remove references to store-only enum members (`TASK_CONSULT`, `TASK_UNHOLD`) once the migration is applied.

### New SDK Events (not in current widget enum)

| SDK Event | Value | Widget Action Needed |
|---|---|---|
| `TASK_UI_CONTROLS_UPDATED` | `'task:ui-controls-updated'` | **Must subscribe** — triggers widget re-renders |
| `TASK_UNASSIGNED` | `'task:unassigned'` | Evaluate if widget needs to handle |
| `TASK_CONSULT_QUEUE_FAILED` | `'task:consultQueueFailed'` | Evaluate if widget needs to handle |
| `TASK_RECORDING_STARTED` | `'task:recordingStarted'` | Evaluate for recording indicator |
| `TASK_RECORDING_PAUSE_FAILED` | `'task:recordingPauseFailed'` | Evaluate for error handling |
| `TASK_RECORDING_RESUME_FAILED` | `'task:recordingResumeFailed'` | Evaluate for error handling |
| `TASK_EXIT_CONFERENCE` | `'task:exitConference'` | Evaluate for conference flow |
| `TASK_TRANSFER_CONFERENCE` | `'task:transferConference'` | Evaluate for conference flow |
| `TASK_CLEANUP` | `'task:cleanup'` | SDK internal — likely no widget action |

**Action:** Delete the local `TASK_EVENTS` enum from `store/src/store.types.ts` and import from SDK once the SDK exports it. **As of this migration, the SDK does not yet export `TASK_EVENTS` from its package entry point** (or status is TBD). For current status and the plan to replace the local enum once the SDK exports it, see [migration-overview.md](./migration-overview.md) → "SDK Pending Exports" (or equivalent section). Until then, keep the local enum and align event string values with the SDK where needed.

### Pre-existing Bug: Event Name Mismatches

The 5 renamed events above are currently hardcoded in `store.types.ts` with a TODO comment: `// TODO: remove this once cc sdk exports this enum`. During migration, **when the SDK exports `TASK_EVENTS`**, replace the entire local enum with the SDK's exported enum. Until then, update local enum values to match SDK event strings so wiring is correct.

---

## Old Approach

### Entry Point
**File:** `packages/contact-center/store/src/storeEventsWrapper.ts`
**Register:** `registerTaskEventListeners(task: ITask)` — registers 27 event listeners
**Cleanup:** `handleTaskRemove(taskToRemove: ITask)` — unregisters all listeners + resets state

### How It Works (Old)
1. On task creation, store registers individual listeners for 27 task events
2. Each handler manually updates store observables (`taskList`, `currentTask`, `consultStartTimeStamp`, `isQueueConsultInProgress`, `currentConsultQueueId`)
3. Many handlers simply call `refreshTaskList()` to re-fetch task state
4. Some handlers have specialized logic (consult, conference lifecycle)
5. Widgets subscribe to store callbacks via `setTaskCallback(event, cb, taskId)`

### Store Observables Affected by Event Handlers

These live in `store/src/store.ts` and are mutated via setters in `storeEventsWrapper.ts`:

| Observable | Type | Mutated By |
|---|---|---|
| `currentTask` | `ITask \| null` | `handleTaskAssigned`, `handleTaskEnd`, `handleTaskRemove` |
| `taskList` | `Record<string, ITask>` | `refreshTaskList` |
| `consultStartTimeStamp` | `number \| undefined` | `handleConsultCreated`, `handleConsulting`, `handleConsultAccepted`, `handleConsultEnd`, `handleConsultQueueCancelled`, `handleConferenceStarted` |
| `isQueueConsultInProgress` | `boolean` | `handleConsultEnd`, `handleConsultQueueCancelled`, `handleConferenceStarted` |
| `currentConsultQueueId` | `string` | `handleConsultEnd`, `handleConsultQueueCancelled`, `handleConferenceStarted` |

### Old Event Handlers (27 events)

| # | Event | Handler | Action |
|---|-------|---------|--------|
| 1 | `TASK_END` | `handleTaskEnd` | Remove task from list, clear current task |
| 2 | `TASK_ASSIGNED` | `handleTaskAssigned` | Update task list, set current task |
| 3 | `AGENT_OFFER_CONTACT` | `refreshTaskList` | Re-fetch all tasks |
| 4 | `AGENT_CONSULT_CREATED` | `handleConsultCreated` | `refreshTaskList()` + `setConsultStartTimeStamp(Date.now())` |
| 5 | `TASK_CONSULT_QUEUE_CANCELLED` | `handleConsultQueueCancelled` | Reset `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp` + `refreshTaskList()` |
| 6 | `TASK_REJECT` | `handleTaskReject` | Remove task, fire callbacks |
| 7 | `TASK_OUTDIAL_FAILED` | `handleOutdialFailed` | Remove task, fire callbacks |
| 8 | `AGENT_WRAPPEDUP` | `refreshTaskList` | Re-fetch all tasks |
| 9 | `TASK_CONSULTING` | `handleConsulting` | `refreshTaskList()` + `setConsultStartTimeStamp(Date.now())` |
| 10 | `TASK_CONSULT_ACCEPTED` | `handleConsultAccepted` | `refreshTaskList()` + `setConsultStartTimeStamp(Date.now())` + set ENGAGED state + **registers `TASK_MEDIA` listener on consult task (browser only)** |
| 11 | `TASK_OFFER_CONSULT` | `handleConsultOffer` | `refreshTaskList()` |
| 12 | `TASK_AUTO_ANSWERED` | `handleAutoAnswer` | `setIsDeclineButtonEnabled(true)` + `refreshTaskList()` |
| 13 | `TASK_CONSULT_END` | `refreshTaskList` | Re-fetch all tasks (**Note:** `handleConsultEnd` method exists but is NOT wired — see pre-existing bug below) |
| 14 | `TASK_HOLD` | `refreshTaskList` | Re-fetch all tasks |
| 15 | `TASK_RESUME` | `refreshTaskList` | Re-fetch all tasks |
| 16 | `TASK_CONFERENCE_ENDED` | `handleConferenceEnded` | `refreshTaskList()` |
| 17 | `TASK_CONFERENCE_END_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 18 | `TASK_CONFERENCE_ESTABLISHING` | `refreshTaskList` | Re-fetch all tasks |
| 19 | `TASK_CONFERENCE_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 20 | `TASK_PARTICIPANT_JOINED` | `handleConferenceStarted` | Reset `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp` + `refreshTaskList()` |
| 21 | `TASK_PARTICIPANT_LEFT` | `handleConferenceEnded` | `refreshTaskList()` |
| 22 | `TASK_PARTICIPANT_LEFT_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 23 | `TASK_CONFERENCE_STARTED` | `handleConferenceStarted` | (same as #20) |
| 24 | `TASK_CONFERENCE_TRANSFERRED` | `refreshTaskList` | Re-fetch all tasks |
| 25 | `TASK_CONFERENCE_TRANSFER_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 26 | `TASK_POST_CALL_ACTIVITY` | `refreshTaskList` | Re-fetch all tasks |
| 27 | `TASK_MEDIA` | `handleTaskMedia` | Browser-only: `setCallControlAudio(new MediaStream([track]))` |

### Pre-existing Bugs in Old Code

**Bug 1: `handleConsultEnd` is dead code.**
A `handleConsultEnd` method exists (resets `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp`) but `TASK_CONSULT_END` is wired to `refreshTaskList()` instead. The method's consult state cleanup never runs.

**Migration / test plan for Bug 1:** When wiring `TASK_CONSULT_END` to `handleConsultEnd`, update store unit tests (e.g. `store/tests/storeEventsWrapper.ts` or equivalent) that reference `handleConsultEnd`: assert that `TASK_CONSULT_END` triggers the handler and that consult state is reset. Remove or rewrite tests that only covered the old dead path (e.g. tests that assumed `TASK_CONSULT_END` only triggered `refreshTaskList`).

**Bug 2: `handleTaskRemove` listener mismatch.**
`registerTaskEventListeners` wires `TASK_CONFERENCE_TRANSFERRED → this.refreshTaskList`. But `handleTaskRemove` calls `taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.handleConferenceEnded)` — wrong handler reference. This listener is **never actually removed**, causing a listener leak.

**Test gap:** `TASK_CONFERENCE_TRANSFERRED` currently has **no unit test** (registration and cleanup). This gap is tracked by a dedicated Jira ticket. The ticket covers: adding UTs that assert this event is registered in `registerTaskEventListeners` and correctly unregistered in `handleTaskRemove`. When implementing the store migration or the ticket, add tests so this gap is closed. *(Jira: [CAI-7758](https://jira-eng-sjc12.cisco.com/jira/browse/CAI-7758))*

---

## New Approach

### What Changes in SDK
1. SDK state machine handles all transitions internally
2. `task.data` is updated by the state machine's `updateTaskData` action on every event
3. `task.uiControls` is recomputed after every state transition
4. `task:ui-controls-updated` is emitted when controls change

### Definitive New Event Registration

Many events that currently trigger `refreshTaskList()` will no longer need it because `task.data` is kept in sync by the SDK. Below is the single authoritative table for all event handler changes:

| # | Event | New Handler | Change | Detail |
|---|-------|-------------|--------|--------|
| 1 | `TASK_END` | `handleTaskEnd` | **Keep** | Remove from task list, clear current task |
| 2 | `TASK_ASSIGNED` | `handleTaskAssigned` | **Keep** | Update task list, set current task |
| 3 | `TASK_REJECT` | `handleTaskReject` | **Keep** | Remove from task list |
| 4 | `TASK_OUTDIAL_FAILED` | `handleOutdialFailed` | **Keep** | Remove from task list |
| 5 | `TASK_MEDIA` | `handleTaskMedia` | **Keep** | Browser-only WebRTC setup (conditional registration) |
| 6 | `TASK_UI_CONTROLS_UPDATED` | `bound.uiControlsUpdated` (per-task; see Pattern 1 & 3) | **Add new** | Fire callbacks to trigger widget re-renders. Do **not** use a class-level handler — it would resolve the wrong `interactionId` in multi-task scenarios. |
| 7 | `TASK_WRAPPEDUP` | `bound.wrappedup` (per-task; see Pattern 1) | **Keep + rename** | Was `AGENT_WRAPPEDUP`. Keep `refreshTaskList()` in handler — task must be removed from list after wrapup. Fire callback. Do **not** use class method; use bound handler for correct `.off()` teardown. |
| 8 | `TASK_CONSULT_END` | `handleConsultEnd` | **Fix wiring** | Wire the existing (currently dead) `handleConsultEnd` method. Resets `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp`. Remove `refreshTaskList()`. Fire callback. |
| 9 | `TASK_CONSULT_QUEUE_CANCELLED` | `handleConsultQueueCancelled` | **Simplify** | Keep consult state reset. Remove `refreshTaskList()`. Fire callback. |
| 10 | `TASK_CONSULTING` | `handleConsulting` | **Simplify** | Keep `setConsultStartTimeStamp(Date.now())`. Remove `refreshTaskList()`. Fire callback. |
| 11 | `TASK_CONSULT_CREATED` | `handleConsultCreated` | **Simplify + rename** | Was `AGENT_CONSULT_CREATED`. Keep `setConsultStartTimeStamp(Date.now())`. Remove `refreshTaskList()`. Fire callback. |
| 12 | `TASK_CONSULT_ACCEPTED` | `handleConsultAccepted` | **Simplify** | Keep `setConsultStartTimeStamp(Date.now())`, keep ENGAGED state, **keep `TASK_MEDIA` listener registration (browser)**. Remove `refreshTaskList()`. Fire callback. |
| 13 | `TASK_AUTO_ANSWERED` | `handleAutoAnswer` | **Simplify** | Keep `setIsDeclineButtonEnabled(true)`. Remove `refreshTaskList()`. Fire callback. |
| 14 | `TASK_OFFER_CONTACT` | Fire callback only | **Simplify + rename** | Was `AGENT_OFFER_CONTACT`. Remove `refreshTaskList()`. |
| 15 | `TASK_OFFER_CONSULT` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 16 | `TASK_PARTICIPANT_JOINED` | `handleConferenceStarted` | **Simplify** | Keep consult state reset (`isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp`). Remove `refreshTaskList()`. Fire callback. |
| 17 | `TASK_CONFERENCE_STARTED` | `handleConferenceStarted` | **Simplify** | Same as #16 |
| 18 | `TASK_CONFERENCE_ENDED` | `handleConferenceEnded` | **Simplify** | Remove `refreshTaskList()`. Fire callback. |
| 19 | `TASK_PARTICIPANT_LEFT` | `handleConferenceEnded` | **Simplify** | Same as #18 |
| 20 | `TASK_HOLD` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 21 | `TASK_RESUME` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 22 | `TASK_RECORDING_PAUSED` | Fire callback only | **Simplify + rename** | Was `CONTACT_RECORDING_PAUSED`. |
| 23 | `TASK_RECORDING_RESUMED` | Fire callback only | **Simplify + rename** | Was `CONTACT_RECORDING_RESUMED`. |
| 24 | `TASK_POST_CALL_ACTIVITY` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 25 | `TASK_CONFERENCE_ESTABLISHING` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 26 | `TASK_CONFERENCE_FAILED` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 27 | `TASK_CONFERENCE_END_FAILED` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 28 | `TASK_PARTICIPANT_LEFT_FAILED` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 29 | `TASK_CONFERENCE_TRANSFERRED` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |
| 30 | `TASK_CONFERENCE_TRANSFER_FAILED` | Fire callback only | **Simplify** | Remove `refreshTaskList()`. |

### Key Insight: `refreshTaskList()` Elimination

**Old:** 15+ events trigger `refreshTaskList()` → `cc.taskManager.getAllTasks()` → update store observables.

**New:** SDK keeps `task.data` updated via state machine actions. The store can read `task.data` directly instead of re-fetching. `refreshTaskList()` should only be called for:
- Initial load / hydration
- Full page refresh recovery
- `TASK_WRAPPEDUP` (task must be removed from list — may be replaceable with explicit list removal)

#### Why we can remove most `refreshTaskList()`

1. **SDK keeps the same task reference up to date.** The state machine updates `task.data` (and `task.uiControls`) on the **same** `ITask` reference already held in the store's `taskList`. No re-fetch is needed for in-place updates.
2. **Widget re-renders are driven by callbacks.** Widgets that registered via `setTaskCallback(event, cb, taskId)` are notified when the store calls `fireTaskCallbacks(event, interactionId, payload)`. Those callbacks cause the widget to re-run and re-render with the updated task from the store.
3. **Re-fetch is only needed when the list itself changes.** We keep `refreshTaskList()` only where the **list** must change: e.g. initial load, full refresh, or `TASK_WRAPPEDUP` (task removed from the list). For all other events, the existing task reference is already updated by the SDK, and `fireTaskCallbacks` triggers UI updates.

---

### fireTaskCallbacks — Definition

**Purpose:** Invoke all callbacks that were registered for a given task event via `setTaskCallback(event, cb, taskId)` (or equivalent), so widgets can re-render or react when that event occurs.

**Signature (conceptual):**  
`fireTaskCallbacks(event: TASK_EVENTS, interactionId: string, payload?: unknown): void`

**Where it lives:** In the store-events layer — `packages/contact-center/store/src/storeEventsWrapper.ts`. After the migration, "After" handlers call `fireTaskCallbacks(...)` instead of (or in addition to) `refreshTaskList()` for events that only need to notify widgets. Implementation pattern: look up callbacks by event and optional `taskId`/`interactionId`, then invoke each with the payload.

---

## Refactor Patterns (Before/After)

### Architectural Note: Bound-Handler Map

Handlers registered via `task.on()` that need per-task context (`interactionId`) **cannot** use inline arrows — `task.off()` in `handleTaskRemove` requires the exact same function reference to detach a listener. Conversely, class-level methods don't have access to the `interactionId` local variable from `registerTaskEventListeners`.

**Solution:** Store bound handler references in a per-task map at registration time. `handleTaskRemove` retrieves them for cleanup.

```typescript
// Class property — keyed by interactionId
private taskBoundHandlers = new Map<string, Record<string, Function>>();
```

### Pattern 1: `registerTaskEventListeners()` — Bound-Handler Registration

#### Before
```typescript
registerTaskEventListeners(task: ITask) {
  const interactionId = task.data.interactionId;
  task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);
  task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
  task.on(TASK_EVENTS.AGENT_OFFER_CONTACT, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONSULT_END, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
  // ... 19 more event registrations, most calling refreshTaskList()
}
```

#### After
```typescript
registerTaskEventListeners(task: ITask) {
  const interactionId = task.data.interactionId;

  // Create bound handlers that close over this task's interactionId.
  // Stored in map so handleTaskRemove can .off() the exact same references.
  const bound: Record<string, Function> = {
    reject: (reason: string) => this.handleTaskReject(task, reason),
    outdialFailed: (reason: string) => this.handleOutdialFailed(reason),
    uiControlsUpdated: (uiControls: TaskUIControls) => {
      this.fireTaskCallbacks(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, interactionId, uiControls);
    },
    wrappedup: (data: unknown) => {
      this.refreshTaskList();
      this.fireTaskCallbacks(TASK_EVENTS.TASK_WRAPPEDUP, interactionId, data);
    },
    confStarted_participantJoined: () => this.handleConferenceStarted(TASK_EVENTS.TASK_PARTICIPANT_JOINED, interactionId),
    confStarted_conferenceStarted: () => this.handleConferenceStarted(TASK_EVENTS.TASK_CONFERENCE_STARTED, interactionId),
    confEnded_conferenceEnded: () => this.handleConferenceEnded(TASK_EVENTS.TASK_CONFERENCE_ENDED, interactionId),
    confEnded_participantLeft: () => this.handleConferenceEnded(TASK_EVENTS.TASK_PARTICIPANT_LEFT, interactionId),
    // Callback-only events — each bound to this task's interactionId
    hold: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_HOLD, interactionId),
    resume: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_RESUME, interactionId),
    offerContact: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_OFFER_CONTACT, interactionId),
    offerConsult: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_OFFER_CONSULT, interactionId),
    recordingPaused: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_RECORDING_PAUSED, interactionId),
    recordingResumed: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_RECORDING_RESUMED, interactionId),
    postCallActivity: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, interactionId),
    confEstablishing: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, interactionId),
    confFailed: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_FAILED, interactionId),
    confEndFailed: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, interactionId),
    participantLeftFailed: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, interactionId),
    confTransferred: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, interactionId),
    confTransferFailed: () => this.fireTaskCallbacks(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, interactionId),
  };
  this.taskBoundHandlers.set(interactionId, bound);

  // NEW: SDK-computed UI control updates (bound to emitting task's interactionId)
  task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, bound.uiControlsUpdated);

  // KEEP: Task lifecycle events that need store-level management (class methods)
  task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);
  task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
  // TASK_REJECT: handleTaskReject(task, reason) needs the emitting task reference —
  // must use a bound handler, not a direct class method reference
  task.on(TASK_EVENTS.TASK_REJECT, bound.reject);
  task.on(TASK_EVENTS.TASK_OUTDIAL_FAILED, bound.outdialFailed);

  // KEEP + FIX WIRING: Wire handleConsultEnd (was dead code)
  task.on(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);

  // KEEP: Consult state management (remove refreshTaskList, keep state mutations)
  task.on(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);  // renamed from AGENT_CONSULT_CREATED
  task.on(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
  task.on(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
  task.on(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);

  // KEEP: Conference state management — bound handlers pass event type + interactionId
  task.on(TASK_EVENTS.TASK_PARTICIPANT_JOINED, bound.confStarted_participantJoined);
  task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, bound.confStarted_conferenceStarted);
  task.on(TASK_EVENTS.TASK_CONFERENCE_ENDED, bound.confEnded_conferenceEnded);
  task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT, bound.confEnded_participantLeft);

  // KEEP: Auto-answer sets decline button state
  task.on(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);

  // KEEP: Wrapup completion — bound handler retains refreshTaskList + correct interactionId
  task.on(TASK_EVENTS.TASK_WRAPPEDUP, bound.wrappedup);  // renamed from AGENT_WRAPPEDUP

  // SIMPLIFIED: Callback-only events — all use bound handlers with correct interactionId
  task.on(TASK_EVENTS.TASK_HOLD, bound.hold);
  task.on(TASK_EVENTS.TASK_RESUME, bound.resume);
  task.on(TASK_EVENTS.TASK_OFFER_CONTACT, bound.offerContact);  // renamed
  task.on(TASK_EVENTS.TASK_OFFER_CONSULT, bound.offerConsult);
  task.on(TASK_EVENTS.TASK_RECORDING_PAUSED, bound.recordingPaused);  // renamed
  task.on(TASK_EVENTS.TASK_RECORDING_RESUMED, bound.recordingResumed);  // renamed
  task.on(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, bound.postCallActivity);
  task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, bound.confEstablishing);
  task.on(TASK_EVENTS.TASK_CONFERENCE_FAILED, bound.confFailed);
  task.on(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, bound.confEndFailed);
  task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, bound.participantLeftFailed);
  task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, bound.confTransferred);
  task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, bound.confTransferFailed);

  // Browser-only: WebRTC media setup
  if (this.deviceType === DEVICE_TYPE_BROWSER) {
    task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
  }
}
```

### Pattern 2: Simplifying `refreshTaskList()` Event Handlers

#### Before
```typescript
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
```

#### After
```typescript
// SDK keeps task.data in sync via state machine.
// refreshTaskList() only called on initialization/hydration and TASK_WRAPPEDUP.
// Individual events use bound handlers (from taskBoundHandlers map) so
// handleTaskRemove can .off() the exact same reference. See Pattern 1.

task.on(TASK_EVENTS.TASK_HOLD, bound.hold);
task.on(TASK_EVENTS.TASK_RESUME, bound.resume);
// ... all other callback-only events use bound.* references
```

### Pattern 3: `TASK_UI_CONTROLS_UPDATED` — Bound Handler (Not a Class Method)

**Why not a class method?** A class-level `handleUIControlsUpdated` would need to derive `interactionId` from `this.store.currentTask`, which is wrong in multi-task/consult scenarios — the emitting task may not be the currently selected one. Using a bound handler (see Pattern 1) captures the correct `interactionId` at registration time.

```typescript
// WRONG — class method reads currentTask (may be a different task than the emitter):
handleUIControlsUpdated = (uiControls: TaskUIControls) => {
  const interactionId = this.store.currentTask?.data.interactionId;  // ← BUG in multi-task
  this.fireTaskCallbacks(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, interactionId, uiControls);
};

// CORRECT — bound handler from Pattern 1 captures emitting task's interactionId:
// (created in registerTaskEventListeners per task)
uiControlsUpdated: (uiControls: TaskUIControls) => {
  this.fireTaskCallbacks(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, interactionId, uiControls);
  // interactionId is from the closure: const interactionId = task.data.interactionId;
},
```

### Pattern 4: Conference Handler Simplification

#### Before
```typescript
handleConferenceStarted = () => {
  runInAction(() => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.setConsultStartTimeStamp(null);
  });
  this.refreshTaskList();
};

handleConferenceEnded = () => {
  this.refreshTaskList();
};
```

#### After
```typescript
// SDK state machine handles CONFERENCING state transitions.
// task.data and task.uiControls already reflect conference state.
// Keep consult state reset in handleConferenceStarted; remove refreshTaskList() from both.
//
// Both eventType and interactionId are passed by the bound handlers in Pattern 1.
// This avoids: (a) dual callback firing, (b) unresolved interactionId in class scope,
// and (c) inline arrows that can't be detached by handleTaskRemove.

handleConferenceStarted = (eventType: TASK_EVENTS, interactionId: string) => {
  runInAction(() => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.setConsultStartTimeStamp(null);
  });
  this.fireTaskCallbacks(eventType, interactionId);
};

handleConferenceEnded = (eventType: TASK_EVENTS, interactionId: string) => {
  this.fireTaskCallbacks(eventType, interactionId);
};
```

### Pattern 5: `handleTaskRemove()` — Cleanup via Bound-Handler Map

#### Before
```typescript
handleTaskRemove = (taskToRemove: ITask) => {
  if (taskToRemove) {
    taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
    taskToRemove.off(TASK_EVENTS.TASK_END, this.handleTaskEnd);
    // ... all 27 .off() calls using OLD event names
    // BUG: TASK_CONFERENCE_TRANSFERRED uses wrong handler (handleConferenceEnded instead of refreshTaskList)
  }
};
```

#### After
```typescript
handleTaskRemove = (taskToRemove: ITask) => {
  if (!taskToRemove) return;

  const interactionId = taskToRemove.data.interactionId;
  const bound = this.taskBoundHandlers.get(interactionId);

  // Class-method handlers — stable references, no map needed
  taskToRemove.off(TASK_EVENTS.TASK_END, this.handleTaskEnd);
  taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
  taskToRemove.off(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);  // FIX: was refreshTaskList
  taskToRemove.off(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);
  taskToRemove.off(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
  taskToRemove.off(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
  taskToRemove.off(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
  taskToRemove.off(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);
  taskToRemove.off(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);

  // Bound handlers — retrieve exact references from map for correct .off() detachment
  if (bound) {
    taskToRemove.off(TASK_EVENTS.TASK_REJECT, bound.reject);
    taskToRemove.off(TASK_EVENTS.TASK_OUTDIAL_FAILED, bound.outdialFailed);
    taskToRemove.off(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, bound.uiControlsUpdated);
    taskToRemove.off(TASK_EVENTS.TASK_WRAPPEDUP, bound.wrappedup);
    taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_JOINED, bound.confStarted_participantJoined);
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_STARTED, bound.confStarted_conferenceStarted);
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_ENDED, bound.confEnded_conferenceEnded);
    taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_LEFT, bound.confEnded_participantLeft);
    taskToRemove.off(TASK_EVENTS.TASK_HOLD, bound.hold);
    taskToRemove.off(TASK_EVENTS.TASK_RESUME, bound.resume);
    taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONTACT, bound.offerContact);
    taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONSULT, bound.offerConsult);
    taskToRemove.off(TASK_EVENTS.TASK_RECORDING_PAUSED, bound.recordingPaused);
    taskToRemove.off(TASK_EVENTS.TASK_RECORDING_RESUMED, bound.recordingResumed);
    taskToRemove.off(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, bound.postCallActivity);
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, bound.confEstablishing);
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_FAILED, bound.confFailed);
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, bound.confEndFailed);
    taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, bound.participantLeftFailed);
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, bound.confTransferred);  // FIX: was handleConferenceEnded
    taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, bound.confTransferFailed);
    this.taskBoundHandlers.delete(interactionId);
  }

  // Reset store state
  // ... existing currentTask/taskList cleanup logic
};
```

---

## Files to Modify

| File | Action |
|------|--------|
| `store/src/storeEventsWrapper.ts` | Refactor `registerTaskEventListeners` (see definitive table), update `handleTaskRemove` (fix listener mismatches + add `TASK_UI_CONTROLS_UPDATED`), simplify handlers (remove `refreshTaskList()` from all except `TASK_WRAPPEDUP`), wire `handleConsultEnd` to `TASK_CONSULT_END` |
| `store/src/store.ts` | No changes expected (observables stay) |
| `store/src/store.types.ts` | Delete local `TASK_EVENTS` enum; import from SDK (which includes `TASK_UI_CONTROLS_UPDATED`) |
| **Task-layer consumers of `TASK_EVENTS`** | **Must be updated in the same step** so that removing the store’s local enum does not break the build. `task/src/helper.ts` imports `TASK_EVENTS` from `@webex/cc-store` and uses legacy names: `AGENT_WRAPPEDUP`, `CONTACT_RECORDING_PAUSED`, `CONTACT_RECORDING_RESUMED` (and `TASK_RECORDING_PAUSED` / `TASK_RECORDING_RESUMED` in setTaskCallback). Replace with SDK event names: `TASK_WRAPPEDUP`, `TASK_RECORDING_PAUSED`, `TASK_RECORDING_RESUMED` in both `setTaskCallback` and `removeTaskCallback`. Either update `task/src/helper.ts` (and any other task files using `TASK_EVENTS`) in this PR or sequence the migration so store switches to SDK enum only after task package is updated. |
| `store/tests/*` | Update tests for renamed events, new `TASK_UI_CONTROLS_UPDATED` handler, simplified handlers |

---

## Validation Criteria

- [ ] Task list stays in sync on all lifecycle events (incoming, assigned, end, reject)
- [ ] `refreshTaskList()` only called on init/hydration and `TASK_WRAPPEDUP`, not on every event
- [ ] Widget callbacks still fire correctly for events that require UI updates
- [ ] `task:ui-controls-updated` triggers re-renders in widgets
- [ ] No regression in consult/conference/hold flows
- [ ] Task removal from list on end/reject works correctly
- [ ] `handleTaskRemove` unregisters all listeners correctly via bound-handler map (no listener leaks)
- [ ] `taskBoundHandlers` map is cleaned up (`.delete()`) when a task is removed
- [ ] `handleConsultEnd` is properly wired and resets consult state on `TASK_CONSULT_END`
- [ ] `handleConsultAccepted` still registers `TASK_MEDIA` listener on consult task (browser)
- [ ] `handleAutoAnswer` still sets `isDeclineButtonEnabled = true`
- [ ] All 5 renamed events use SDK names (`TASK_WRAPPEDUP`, `TASK_CONSULT_CREATED`, `TASK_OFFER_CONTACT`, `TASK_RECORDING_PAUSED`, `TASK_RECORDING_RESUMED`)

---

_Parent: [migration-overview.md](./migration-overview.md) — overview doc is added in PR 1/4; link resolves once that PR is merged._
