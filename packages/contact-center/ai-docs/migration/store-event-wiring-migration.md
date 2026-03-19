# Store Event Wiring Migration

## Summary

The store's `storeEventsWrapper.ts` currently registers 27 individual task event handlers via `registerTaskEventListeners()` that manually call `refreshTaskList()` and update observables. A companion method `handleTaskRemove()` unregisters them. With the SDK task-refactor, the SDK handles state transitions internally via a state machine. The core migration is:

1. **Switch event names** — use SDK `TASK_EVENTS` enum (delete local copy)
2. **Keep `refreshTaskList()`** — the store does not observe `task.data` directly; `refreshTaskList()` is needed so the store re-syncs observables and the UI re-renders
3. **Add `TASK_UI_CONTROLS_UPDATED`** subscription to trigger widget re-renders
4. **Replace `isDeclineButtonEnabled`** store property with `task.uiControls.decline.isEnabled`
5. **Fix `TASK_CONSULT_END` wiring** — wire the existing (dead) `handleConsultEnd` method

---

## Files to Modify

| File | Action |
|------|--------|
| `store/src/storeEventsWrapper.ts` | Update event names to SDK names. Keep `refreshTaskList()` in existing handlers. Add `TASK_UI_CONTROLS_UPDATED` listener. Wire `handleConsultEnd` to `TASK_CONSULT_END` (fix dead code). Remove `setIsDeclineButtonEnabled` from `handleAutoAnswer`. |
| `store/src/store.ts` | No changes expected (observables stay). Mark `isDeclineButtonEnabled` for removal once widget layer uses `uiControls.decline.isEnabled`. |
| `store/src/store.types.ts` | Delete local `TASK_EVENTS` enum; import from SDK: `import { TASK_EVENTS } from '@webex/contact-center';`. |
| **Task-layer consumers of `TASK_EVENTS`** | **Must be updated in the same step** so that removing the store's local enum does not break the build. `task/src/helper.ts` imports `TASK_EVENTS` from `@webex/cc-store` and uses legacy names: `AGENT_WRAPPEDUP`, `CONTACT_RECORDING_PAUSED`, `CONTACT_RECORDING_RESUMED`. Replace with SDK names: `TASK_WRAPPEDUP`, `TASK_RECORDING_PAUSED`, `TASK_RECORDING_RESUMED`. |
| `store/tests/*` | Update tests for renamed events, new `TASK_UI_CONTROLS_UPDATED` handler, `handleConsultEnd` wiring fix, `handleAutoAnswer` change |

---

## SDK Event Reference

The SDK exports `TASK_EVENTS` from its package entry point (`packages/@webex/contact-center/src/index.ts`):
```typescript
export {TASK_EVENTS} from './services/task/types';
export type {TASK_EVENTS as TaskEvents} from './services/task/types';
```

**Action:** Delete the local `TASK_EVENTS` enum from `store/src/store.types.ts` and import from SDK: `import { TASK_EVENTS } from '@webex/contact-center';`. If the widgets repo depends on an older SDK that does not re-export `TASK_EVENTS`, keep the local enum and align event string values until the dependency is updated.

### Events Emitted by SDK (complete list)

Sourced from the SDK task-refactor branch. Events are emitted from Task (lifecycle) and Voice (media/telephony) layers.

**Task lifecycle events (from Task.ts):**

| SDK Event | String Value |
|-----------|--------------|
| `TASK_INCOMING` | `'task:incoming'` |
| `TASK_HYDRATE` | `'task:hydrate'` |
| `TASK_OFFER_CONTACT` | `'task:offerContact'` |
| `TASK_ASSIGNED` | `'task:assigned'` |
| `TASK_END` | `'task:end'` |
| `TASK_OFFER_CONSULT` | `'task:offerConsult'` |
| `TASK_CONSULT_CREATED` | `'task:consultCreated'` |
| `TASK_CONSULT_ACCEPTED` | `'task:consultAccepted'` |
| `TASK_CONSULT_END` | `'task:consultEnd'` |
| `TASK_CONSULT_QUEUE_CANCELLED` | `'task:consultQueueCancelled'` |
| `TASK_CONSULT_QUEUE_FAILED` | `'task:consultQueueFailed'` |
| `TASK_WRAPPEDUP` | `'task:wrappedup'` |

**Voice / media events (from Voice.ts):**

| SDK Event | String Value |
|-----------|--------------|
| `TASK_HOLD` | `'task:hold'` |
| `TASK_RESUME` | `'task:resume'` |
| `TASK_RECORDING_STARTED` | `'task:recordingStarted'` |
| `TASK_RECORDING_PAUSED` | `'task:recordingPaused'` |
| `TASK_RECORDING_PAUSE_FAILED` | `'task:recordingPauseFailed'` |
| `TASK_RECORDING_RESUMED` | `'task:recordingResumed'` |
| `TASK_RECORDING_RESUME_FAILED` | `'task:recordingResumeFailed'` |
| `TASK_PARTICIPANT_JOINED` | `'task:participantJoined'` |
| `TASK_PARTICIPANT_LEFT` | `'task:participantLeft'` |
| `TASK_CONFERENCE_STARTED` | `'task:conferenceStarted'` |
| `TASK_CONFERENCE_ENDED` | `'task:conferenceEnded'` |
| `TASK_CONFERENCE_FAILED` | `'task:conferenceFailed'` |
| `TASK_EXIT_CONFERENCE` | `'task:exitConference'` |
| `TASK_TRANSFER_CONFERENCE` | `'task:transferConference'` |
| `TASK_SWITCH_CALL` | `'task:switchCall'` |
| `TASK_CONFERENCE_TRANSFER_FAILED` | `'task:conferenceTransferFailed'` |
| `TASK_OUTDIAL_FAILED` | `'task:outdialFailed'` |

**Additional events (in TASK_EVENTS enum, emitted from TaskManager or other layers):**

| SDK Event | String Value | Note |
|-----------|--------------|------|
| `TASK_MEDIA` | `'task:media'` | Browser WebRTC remote media |
| `TASK_AUTO_ANSWERED` | `'task:autoAnswered'` | Auto-answer notification |
| `TASK_REJECT` | `'task:rejected'` | Task rejected |
| `TASK_MERGED` | `'task:merged'` | Task merged |
| `TASK_POST_CALL_ACTIVITY` | `'task:postCallActivity'` | Post-call activity |
| `TASK_CONFERENCE_ESTABLISHING` | `'task:conferenceEstablishing'` | Conference in progress |
| `TASK_CONFERENCE_END_FAILED` | `'task:conferenceEndFailed'` | Conference end failure |
| `TASK_PARTICIPANT_LEFT_FAILED` | `'task:participantLeftFailed'` | Participant removal failure |
| `TASK_CONFERENCE_TRANSFERRED` | `'task:conferenceTransferred'` | Conference transferred |
| `TASK_UI_CONTROLS_UPDATED` | `'task:ui-controls-updated'` | UI controls recomputed — **must subscribe** |
| `TASK_UNASSIGNED` | `'task:unassigned'` | Evaluate if widget needs to handle |
| `TASK_WRAPUP` | `'task:wrapup'` | Evaluate if widget needs to handle |
| `TASK_CONSULTING` | `'task:consulting'` | Consulting state entered |

---

## Event Names — Widget Local vs SDK

The widget's local `TASK_EVENTS` enum (in `store/src/store.types.ts`) uses CC-level naming that differs from the SDK's task-level naming.

### 3 Renamed Events (task-refactor specific)

| Old (Widget) | Old Value | New (SDK) | New Value |
|---|---|---|---|
| `AGENT_WRAPPEDUP` | `'AgentWrappedUp'` | `TASK_WRAPPEDUP` | `'task:wrappedup'` |
| `AGENT_CONSULT_CREATED` | `'AgentConsultCreated'` | `TASK_CONSULT_CREATED` | `'task:consultCreated'` |
| `AGENT_OFFER_CONTACT` | `'AgentOfferContact'` | `TASK_OFFER_CONTACT` | `'task:offerContact'` |

### Pre-existing Name Mismatches (not task-refactor — fix when switching to SDK enum)

These are incorrect names in the widget's local enum that already differed from the SDK. They are **not** renames introduced by the task-refactor; the SDK has always used the `task:*` naming for these.

| Old (Widget) | Old Value | Correct (SDK) | SDK Value |
|---|---|---|---|
| `CONTACT_RECORDING_PAUSED` | `'ContactRecordingPaused'` | `TASK_RECORDING_PAUSED` | `'task:recordingPaused'` |
| `CONTACT_RECORDING_RESUMED` | `'ContactRecordingResumed'` | `TASK_RECORDING_RESUMED` | `'task:recordingResumed'` |

### 4 Store-Only Enum Members (delete — no SDK equivalent)

| Widget Enum Member | Value | Note |
|---|---|---|
| `TASK_UNHOLD` | `'task:unhold'` | SDK uses `TASK_RESUME` (`'task:resume'`) instead |
| `TASK_CONSULT` | `'task:consult'` | No SDK equivalent; consult flow uses multiple events |
| `TASK_PAUSE` | `'task:pause'` | No SDK equivalent; SDK uses `TASK_HOLD` (`'task:hold'`) |
| `AGENT_CONTACT_ASSIGNED` | `'AgentContactAssigned'` | SDK uses `TASK_ASSIGNED` (`'task:assigned'`) |

**Docs to update when migrating event names:** CallControl widget spec references `TASK_CONSULT` (and related consult flow) in its sequence diagram — see `packages/contact-center/task/ai-docs/widgets/CallControl/ARCHITECTURE.md` (consult sequence around line 169). Update that doc to use SDK event names and remove references to store-only enum members (`TASK_CONSULT`, `TASK_UNHOLD`) once the migration is applied.

---

## Task-Refactor Migration Changes

### What Changes in SDK
1. SDK state machine handles all transitions internally
2. `task.data` is updated by the state machine's `updateTaskData` action on every event
3. `task.uiControls` is recomputed after every state transition
4. `task:ui-controls-updated` is emitted when controls change

### Definitive New Event Registration

`refreshTaskList()` is **kept** in all handlers that already call it. Removing `refreshTaskList()` is a future widget optimization, not part of this task-refactor migration (see [Future Optimization](#future-optimization-refreshtasklist-removal) below).

#### No change required (22 events)

These handlers are unchanged by the migration. Event names already match the SDK.

| # | Event | Handler | Detail |
|---|-------|---------|--------|
| 1 | `TASK_END` | `handleTaskEnd` | Remove from task list, clear current task |
| 2 | `TASK_ASSIGNED` | `handleTaskAssigned` | Update task list, set current task |
| 3 | `TASK_REJECT` | `handleTaskReject` | Remove from task list |
| 4 | `TASK_OUTDIAL_FAILED` | `handleOutdialFailed` | Remove from task list |
| 5 | `TASK_MEDIA` | `handleTaskMedia` | Browser-only WebRTC setup — not task-refactor related |
| 6 | `TASK_CONSULT_QUEUE_CANCELLED` | `handleConsultQueueCancelled` | Consult state reset + `refreshTaskList()` |
| 7 | `TASK_CONSULTING` | `handleConsulting` | `setConsultStartTimeStamp(Date.now())` + `refreshTaskList()` |
| 8 | `TASK_CONSULT_ACCEPTED` | `handleConsultAccepted` | `setConsultStartTimeStamp(Date.now())` + `refreshTaskList()` + `TASK_MEDIA` listener (browser) |
| 9 | `TASK_OFFER_CONSULT` | `handleConsultOffer` | `refreshTaskList()` |
| 10 | `TASK_PARTICIPANT_JOINED` | `handleConferenceStarted` | Consult state reset + `refreshTaskList()` |
| 11 | `TASK_CONFERENCE_STARTED` | `handleConferenceStarted` | Same as #10 |
| 12 | `TASK_CONFERENCE_ENDED` | `handleConferenceEnded` | `refreshTaskList()` |
| 13 | `TASK_PARTICIPANT_LEFT` | `handleConferenceEnded` | Same as #12 |
| 14 | `TASK_HOLD` | `refreshTaskList` | Re-fetch all tasks |
| 15 | `TASK_RESUME` | `refreshTaskList` | Re-fetch all tasks |
| 16 | `TASK_POST_CALL_ACTIVITY` | `refreshTaskList` | Re-fetch all tasks |
| 17 | `TASK_CONFERENCE_ESTABLISHING` | `refreshTaskList` | Re-fetch all tasks |
| 18 | `TASK_CONFERENCE_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 19 | `TASK_CONFERENCE_END_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 20 | `TASK_PARTICIPANT_LEFT_FAILED` | `refreshTaskList` | Re-fetch all tasks |
| 21 | `TASK_CONFERENCE_TRANSFERRED` | `refreshTaskList` | Re-fetch all tasks |
| 22 | `TASK_CONFERENCE_TRANSFER_FAILED` | `refreshTaskList` | Re-fetch all tasks |

#### Changes required (7 events)

| # | Event | Handler | Category | Detail |
|---|-------|---------|----------|--------|
| 23 | `TASK_WRAPPEDUP` | `refreshTaskList` | Task-refactor | **Rename** from `AGENT_WRAPPEDUP`. Handler unchanged. |
| 24 | `TASK_CONSULT_CREATED` | `handleConsultCreated` | Task-refactor | **Rename** from `AGENT_CONSULT_CREATED`. Handler unchanged — `setConsultStartTimeStamp(Date.now())` + `refreshTaskList()`. |
| 25 | `TASK_OFFER_CONTACT` | `refreshTaskList` | Task-refactor | **Rename** from `AGENT_OFFER_CONTACT`. Handler unchanged. |
| 26 | `TASK_RECORDING_PAUSED` | `refreshTaskList` | Pre-existing fix | **Fix name** from `CONTACT_RECORDING_PAUSED`. Handler unchanged. |
| 27 | `TASK_RECORDING_RESUMED` | `refreshTaskList` | Pre-existing fix | **Fix name** from `CONTACT_RECORDING_RESUMED`. Handler unchanged. |
| 28 | `TASK_CONSULT_END` | `handleConsultEnd` | Pre-existing fix | **Fix wiring** — wire the existing (currently dead) `handleConsultEnd` method instead of bare `refreshTaskList`. |
| 29 | `TASK_AUTO_ANSWERED` | `handleAutoAnswer` | Task-refactor | **Remove `setIsDeclineButtonEnabled(true)`** — replace with `task.uiControls.decline.isEnabled`. Keep `refreshTaskList()`. |

#### New additions (1 event)

| # | Event | Handler | Category | Detail |
|---|-------|---------|----------|--------|
| 30 | `TASK_UI_CONTROLS_UPDATED` | New handler | Task-refactor | Fire callbacks to trigger widget re-renders when SDK recomputes `uiControls` |

### `refreshTaskList()` — Retained

`refreshTaskList()` is **kept in all existing handlers** for this migration. The store does not directly observe `task.data` via MobX, so `refreshTaskList()` is the mechanism that re-syncs the store's observable `taskList` and triggers MobX-driven re-renders. Removing it is a separate widget-layer optimization — not part of the task-refactor migration.

### Future Optimization: `refreshTaskList()` Removal

> **Scope:** Widget improvement — not part of this migration.

Once the widget layer is updated to derive UI state from `task.data` / `task.uiControls` directly (via callbacks or by making the `cc` object MobX-observable), `refreshTaskList()` calls can be removed from most handlers. Until then, the current approach of calling `refreshTaskList()` on every event is safe and correct.

**Why it could be removed in the future:**
1. **SDK keeps the same task reference up to date.** The state machine updates `task.data` (and `task.uiControls`) on the **same** `ITask` reference already held in the store's `taskList`.
2. **Widget re-renders could be driven by callbacks.** Widgets registered via `setTaskCallback(event, cb, taskId)` are notified when the store fires callbacks. Those callbacks could cause the widget to re-read the latest `task.data` directly.
3. **Re-fetch would only be needed when the list membership changes** (initial load, full refresh, or `TASK_WRAPPEDUP`).

### Migration: `isDeclineButtonEnabled` → `task.uiControls.decline.isEnabled`

The store currently has an `isDeclineButtonEnabled` observable set by `handleAutoAnswer`. With the SDK task-refactor, `task.uiControls.decline.isEnabled` is recomputed by the SDK and should be the source of truth for decline button state.

**Current consumers:**
- `store/src/store.ts` — observable property
- `storeEventsWrapper.ts` — getter + `setIsDeclineButtonEnabled()` setter
- `task/src/helper.ts` — reads `store.isDeclineButtonEnabled` and passes to widget
- `cc-components/.../TaskList/task-list.utils.ts` — `!store.isDeclineButtonEnabled` for auto-answer disable logic
- `cc-components/.../IncomingTask/incoming-task.utils.tsx` — `isDeclineButtonEnabled` prop

**Migration steps:**
1. Update `handleAutoAnswer` to remove `setIsDeclineButtonEnabled(true)` — no store mutation needed.
2. Update `task/src/helper.ts` to read `task.uiControls.decline.isEnabled` instead of `store.isDeclineButtonEnabled`.
3. Update IncomingTask and TaskList components to read from `task.uiControls.decline.isEnabled`.
4. Once no consumers remain, delete the store property, getter, and setter.

### Migration: Store Consult State Observables (future removal)

The store tracks consult state via three observables (`consultStartTimeStamp`, `isQueueConsultInProgress`, `currentConsultQueueId`) that are mutated by `handleConsultCreated`, `handleConsulting`, `handleConsultAccepted`, `handleConsultEnd`, `handleConsultQueueCancelled`, and `handleConferenceStarted`.

With the SDK task-refactor, consult state is tracked in `task.data` and `task.uiControls`. These store observables are **retained for now** because widget consult timer logic (`timer-utils.ts`, `CallControl/index.tsx`) reads `consultStartTimeStamp` directly.

**End state:** Once widgets derive consult timing from `task.data` (or the SDK exposes consult start time), these store properties and their setters in `handleConferenceStarted` and other handlers can be removed.

---

## Pre-existing Issues (tracked separately from task-refactor)

These are bugs in the current widget code, not introduced by the task-refactor. They should be fixed during migration but are not task-refactor changes.

### Bug 1: `handleConsultEnd` is dead code

A `handleConsultEnd` method exists (resets `isQueueConsultInProgress`, `currentConsultQueueId`, `consultStartTimeStamp`) but `TASK_CONSULT_END` is wired to `refreshTaskList()` instead. The method's consult state cleanup never runs.

**Migration / test plan:** When wiring `TASK_CONSULT_END` to `handleConsultEnd`, update store unit tests to assert the new wiring and consult state reset. Remove or rewrite tests that only covered the old dead path.

### Bug 2: `handleTaskRemove` listener mismatch

`registerTaskEventListeners` wires `TASK_CONFERENCE_TRANSFERRED → this.refreshTaskList`. But `handleTaskRemove` calls `taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.handleConferenceEnded)` — wrong handler reference. This listener is **never actually removed**, causing a listener leak.

### Test gap

`TASK_CONFERENCE_TRANSFERRED` currently has **no unit test** (registration and cleanup). Tracked by *(Jira: [CAI-7758](https://jira-eng-sjc12.cisco.com/jira/browse/CAI-7758))*. When implementing the migration, add tests for this event.

---

## Old Code Reference

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

| Observable | Type | Mutated By |
|---|---|---|
| `currentTask` | `ITask \| null` | `handleTaskAssigned`, `handleTaskEnd`, `handleTaskRemove` |
| `taskList` | `Record<string, ITask>` | `refreshTaskList` |
| `consultStartTimeStamp` | `number \| undefined` | `handleConsultCreated`, `handleConsulting`, `handleConsultAccepted`, `handleConsultEnd`, `handleConsultQueueCancelled`, `handleConferenceStarted` |
| `isQueueConsultInProgress` | `boolean` | `handleConsultEnd`, `handleConsultQueueCancelled`, `handleConferenceStarted` |
| `currentConsultQueueId` | `string` | `handleConsultEnd`, `handleConsultQueueCancelled`, `handleConferenceStarted` |
| `isDeclineButtonEnabled` | `boolean` | `handleAutoAnswer` — **migrate to `task.uiControls.decline.isEnabled`** |

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
| 13 | `TASK_CONSULT_END` | `refreshTaskList` | Re-fetch all tasks (**Note:** `handleConsultEnd` method exists but is NOT wired — see pre-existing bug) |
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

---

## Implementation Reference

This section provides code-level guidance for the implementing developer. The core migration: switch to SDK event names, keep `refreshTaskList()`, add `TASK_UI_CONTROLS_UPDATED`, fix `TASK_CONSULT_END` wiring, and replace `isDeclineButtonEnabled`.

### Before/After: `registerTaskEventListeners()`

#### Before (old event names)
```typescript
registerTaskEventListeners(task: ITask) {
  const interactionId = task.data.interactionId;
  task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);
  task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
  task.on(TASK_EVENTS.AGENT_OFFER_CONTACT, this.refreshTaskList);     // old name
  task.on(TASK_EVENTS.AGENT_CONSULT_CREATED, this.handleConsultCreated); // old name
  task.on(TASK_EVENTS.AGENT_WRAPPEDUP, this.refreshTaskList);          // old name
  task.on(TASK_EVENTS.TASK_CONSULT_END, this.refreshTaskList);         // BUG: handleConsultEnd exists but not wired
  task.on(TASK_EVENTS.CONTACT_RECORDING_PAUSED, this.refreshTaskList); // wrong name
  task.on(TASK_EVENTS.CONTACT_RECORDING_RESUMED, this.refreshTaskList);// wrong name
  // ... remaining events unchanged
}
```

#### After (SDK event names, refreshTaskList kept, fixes applied)
```typescript
registerTaskEventListeners(task: ITask) {
  const interactionId = task.data.interactionId;

  // Lifecycle (unchanged handlers)
  task.on(TASK_EVENTS.TASK_END, this.handleTaskEnd);
  task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
  task.on(TASK_EVENTS.TASK_REJECT, this.handleTaskReject);
  task.on(TASK_EVENTS.TASK_OUTDIAL_FAILED, this.handleOutdialFailed);

  // NEW: SDK-computed UI control updates
  task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, /* fire callbacks for this task */);

  // RENAMED events (handler unchanged, refreshTaskList kept)
  task.on(TASK_EVENTS.TASK_WRAPPEDUP, this.refreshTaskList);              // was AGENT_WRAPPEDUP
  task.on(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);   // was AGENT_CONSULT_CREATED
  task.on(TASK_EVENTS.TASK_OFFER_CONTACT, this.refreshTaskList);          // was AGENT_OFFER_CONTACT

  // FIX: Wire handleConsultEnd (was dead code — wired to refreshTaskList before)
  task.on(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);

  // FIX: Correct event names (handler unchanged)
  task.on(TASK_EVENTS.TASK_RECORDING_PAUSED, this.refreshTaskList);       // was CONTACT_RECORDING_PAUSED
  task.on(TASK_EVENTS.TASK_RECORDING_RESUMED, this.refreshTaskList);      // was CONTACT_RECORDING_RESUMED

  // Auto-answer — remove setIsDeclineButtonEnabled, keep refreshTaskList
  task.on(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);

  // Consult/conference handlers (unchanged — keep refreshTaskList + state mutations)
  task.on(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
  task.on(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
  task.on(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
  task.on(TASK_EVENTS.TASK_PARTICIPANT_JOINED, this.handleConferenceStarted);
  task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
  task.on(TASK_EVENTS.TASK_CONFERENCE_ENDED, this.handleConferenceEnded);
  task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT, this.handleConferenceEnded);
  task.on(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);

  // Events wired to refreshTaskList (unchanged)
  task.on(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_FAILED, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.refreshTaskList);
  task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);

  // Browser-only: WebRTC media setup (unchanged)
  if (this.deviceType === DEVICE_TYPE_BROWSER) {
    task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
  }
}
```

> **Note on handler references and `.off()` cleanup:** The implementing developer must ensure that handler references registered via `task.on()` match those used in `handleTaskRemove` for `.off()`. This is a standard listener pattern — see the old code's existing approach for reference.

### `handleConferenceStarted` — No Change

`handleConferenceStarted` is **unchanged** by this migration. Consult state resets and `refreshTaskList()` are both retained.

```typescript
handleConferenceStarted = () => {
  runInAction(() => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.setConsultStartTimeStamp(null);
  });
  this.refreshTaskList();
};
```

### Before/After: `handleAutoAnswer`

#### Before
```typescript
handleAutoAnswer = () => {
  this.setIsDeclineButtonEnabled(true);
  this.refreshTaskList();
};
```

#### After
```typescript
handleAutoAnswer = () => {
  // setIsDeclineButtonEnabled removed — use task.uiControls.decline.isEnabled instead.
  this.refreshTaskList();
};
```

---

## Validation Criteria

- [ ] All event names switched to SDK `TASK_EVENTS` enum (`TASK_WRAPPEDUP`, `TASK_CONSULT_CREATED`, `TASK_OFFER_CONTACT`, `TASK_RECORDING_PAUSED`, `TASK_RECORDING_RESUMED`)
- [ ] Local `TASK_EVENTS` enum deleted from `store.types.ts`; imported from `@webex/contact-center`
- [ ] `refreshTaskList()` still called in all existing handlers (no removal in this migration)
- [ ] `TASK_UI_CONTROLS_UPDATED` handler added; triggers widget re-renders
- [ ] `handleConsultEnd` is properly wired to `TASK_CONSULT_END` and resets consult state
- [ ] `handleAutoAnswer` no longer calls `setIsDeclineButtonEnabled` — widget layer uses `task.uiControls.decline.isEnabled`
- [ ] `handleConsultAccepted` still registers `TASK_MEDIA` listener on consult task (browser)
- [ ] Task list stays in sync on all lifecycle events (incoming, assigned, end, reject, wrapup)
- [ ] No regression in consult/conference/hold flows
- [ ] `handleTaskRemove` unregisters all listeners correctly (no listener leaks)
- [ ] Task-layer consumers (`task/src/helper.ts`) updated to use SDK event names

---

_Parent: [migration-overview.md](./migration-overview.md) — overview doc is added in PR 1/4; link resolves once that PR is merged._
