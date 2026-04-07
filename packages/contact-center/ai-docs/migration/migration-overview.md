# Task Refactor Migration Overview

## Purpose

Guide for migrating CC Widgets from ad-hoc task state management to the new SDK state-machine-driven architecture (`task-refactor` branch). This is the single entry point — it tells you what changed, which docs to follow in what order, and what to watch out for.

---

## Architectural Change: Old vs New

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  OLD (Current Widgets)                 │  NEW (After Migration)                 │
│                                        │                                        │
│  SDK emits 27 task events              │  SDK state machine transitions         │
│         │                              │         │                              │
│         ▼                              │         ▼                              │
│  Store: refreshTaskList()              │  SDK: computes TaskUIControls          │
│  + update observables manually         │  from (TaskState + TaskContext)         │
│         │                              │         │                              │
│         ▼                              │         ▼                              │
│  Hooks: getControlsVisibility(         │  SDK emits                             │
│    deviceType, featureFlags,           │  'task:ui-controls-updated'            │
│    task, agentId, conferenceEnabled)   │         │                              │
│         │                              │         ▼                              │
│         ▼                              │  Widgets read task.uiControls          │
│  Components: flat ControlVisibility    │         │                              │
│  (22 controls + 7 state flags)         │         ▼                              │
│                                        │  Components: TaskUIControls            │
│  Logic spread across:                  │  (17 controls, each                    │
│  task-util.ts, task-utils.ts,          │   { isVisible, isEnabled })            │
│  timer-utils.ts, component utils       │                                        │
│                                        │  Single source of truth:               │
│                                        │  task.uiControls                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

> The events themselves have not changed — they are the same events, now emitted via the SDK state machine. The key difference is that task state updates (including UI control computation) are handled by the SDK, not by widgets.

### What Gets Removed (Dead Code)

The following widget-side logic is entirely replaced by `task.uiControls` and `task.data`:

- **`getControlsVisibility()`** (task-util.ts) + all 22 `get*ButtonVisibility` helper functions — replaced by `task.uiControls`
- **`getConsultStatus()`, `getTaskStatus()`, `getConsultMPCState()`** (store/task-utils.ts) — dead code. These are only called inside `getControlsVisibility()`. Once it is removed, the entire chain is unused and should be deleted. If consult status is needed for display, use `task.data.consultStatus` (SDK provides directly).
- **`findHoldStatus()`** (store/task-utils.ts) — removed. The SDK state machine tracks hold state internally; widgets get hold state from the task object. Do NOT derive from `controls.hold.isEnabled` (that is an action flag — disabled during conference/consulting even when call is held).

### Task Object as Source of Truth for State Flags

After migration, state flags come from the task object (`ITask`), not from widget-side helper functions:

| State | Source | Do NOT use |
|-------|--------|------------|
| Control visibility/enablement | `task.uiControls` (17 controls, each `{ isVisible, isEnabled }`) | `getControlsVisibility()`, `deviceType`, `featureFlags` |
| Hold state (`isHeld`) | Task object (SDK tracks internally) | `findHoldStatus()`, `controls.hold.isEnabled` |
| Conference in progress | `task.data.isConferenceInProgress` | `controls.exitConference.isVisible` (can be false during consult even if conference is active) |
| Consult status (display) | `task.data.consultStatus` (e.g. `consultInitiated`, `consultAccepted`) | `getConsultStatus()`, `getTaskStatus()` |

---

## CC Widgets Files Affected

| Area | Path |
|------|------|
| Store event wrapper | `packages/contact-center/store/src/storeEventsWrapper.ts` |
| Store task utils | `packages/contact-center/store/src/task-utils.ts` |
| Store constants | `packages/contact-center/store/src/constants.ts` |
| Store types | `packages/contact-center/store/src/store.types.ts` |
| Task hooks | `packages/contact-center/task/src/helper.ts` |
| Task UI utils (to be removed) | `packages/contact-center/task/src/Utils/task-util.ts` |
| Task types | `packages/contact-center/task/src/task.types.ts` |
| CC Components — CallControl | `packages/contact-center/cc-components/src/components/task/CallControl/` |
| CC Components — CallControlCAD | `packages/contact-center/cc-components/src/components/task/CallControlCAD/` |
| CC Components types | `packages/contact-center/cc-components/src/components/task/task.types.ts` |
| CC Components — WC wrapper | `packages/contact-center/cc-components/src/wc.ts` |

> **Not listed:** `timer-utils.ts` and `useHoldTimer.ts` are not directly affected by the task-refactor SDK changes. Timer signature updates (if any) are tracked separately in the hook migration doc.

---

## Execution Order

Follow these docs in order. Each doc has old vs new code, before/after examples, and files to modify.

| Order | Document | What to Do |
|-------|----------|------------|
| 1 | [store-event-wiring-migration.md](./store-event-wiring-migration.md) | Update 27 event handlers — switch to SDK `TASK_EVENTS` enum, keep `refreshTaskList()`, add `TASK_UI_CONTROLS_UPDATED` subscription, fix `handleConsultEnd` wiring, replace `isDeclineButtonEnabled` with `task.uiControls.decline.isEnabled` |
| 2 | [store-task-utils-migration.md](./store-task-utils-migration.md) | Remove dead code (`getControlsVisibility` chain, `findHoldStatus`), delete associated constants; keep `findHoldTimestamp` (timers) and `isIncomingTask` |
| 3 | [call-control-hook-migration.md](./call-control-hook-migration.md) | Replace `getControlsVisibility()` with `task.uiControls` in `useCallControl` + update timer utils |
| 4 | [incoming-task-migration.md](./incoming-task-migration.md) | Use `task.uiControls.accept/decline` instead of visibility functions |
| 5 | [task-list-migration.md](./task-list-migration.md) | Per-task `uiControls` for accept/decline |
| 6 | [component-layer-migration.md](./component-layer-migration.md) | Update `cc-components` props — `ControlVisibility` → `TaskUIControls`, rename control props |

---

## SDK Pending Exports (Prerequisites)

**What the SDK does not export today** (from the package entry point `src/index.ts`): the items in the table below. They exist in SDK source but are not re-exported from the public package, so widget code cannot import them until they are added to the package.

**Before implementing:** Check whether each required export is available from the SDK — i.e. whether you can import it from the package. If an item is not yet exported, delay the work that depends on it or implement only the parts that do not need it. Full completion of the migration requires these exports.

| Item | SDK Change Needed |
|------|---|
| `TaskUIControls` type | Add to `src/index.ts` |
| `getDefaultUIControls()` | Add to `src/index.ts` |
| `TaskState` enum | Add to `src/index.ts` (needed for consult timer labeling) |
| `uiControls` on `ITask` | Add getter to `ITask` interface (currently only on concrete `Task` class) |
| `IVoice`, `IDigital`, `IWebRTC` | Add to `src/index.ts` (optional — for type narrowing) |

---

## Key Types from SDK

| Type | Purpose |
|------|---------|
| `TaskUIControls` | Pre-computed control states (17 controls, each `{ isVisible, isEnabled }`) |
| `TaskUIControlState` | Shape: `{ isVisible: boolean; isEnabled: boolean }` |
| `getDefaultUIControls()` | Fallback when no task: `task?.uiControls ?? getDefaultUIControls()` |
| `TASK_EVENTS` | Import from SDK — delete local enum in `store.types.ts` |
| `TaskState` | SDK state machine states — needed for consult timer labeling |

### `TaskUIControls` Structure

```typescript
type TaskUIControlState = { isVisible: boolean; isEnabled: boolean };

type TaskUIControls = {
  accept: TaskUIControlState;
  decline: TaskUIControlState;
  hold: TaskUIControlState;
  transfer: TaskUIControlState;
  consult: TaskUIControlState;
  end: TaskUIControlState;
  recording: TaskUIControlState;
  mute: TaskUIControlState;
  consultTransfer: TaskUIControlState;
  endConsult: TaskUIControlState;
  conference: TaskUIControlState;
  exitConference: TaskUIControlState;
  transferConference: TaskUIControlState;
  mergeToConference: TaskUIControlState;
  wrapup: TaskUIControlState;
  switchToMainCall: TaskUIControlState;
  switchToConsult: TaskUIControlState;
};
```

Widgets no longer compute control visibility — `task.uiControls` is the single source of truth.

> Specific constants to delete/keep, event name mappings, and ordering constraints (e.g. "do not delete constant X until helper Y is rewritten") are documented in each migration doc listed in the [Execution Order](#execution-order) table.

---

## SDK Public Method Changes

| Old | New | Notes |
|-----|-----|-------|
| `task.consultTransfer()` | `task.transfer()` | `consultTransfer` is no longer a separate public method; a single `.transfer()` is used for all transfer types |

---

## CC SDK Reference

> **Repo:** [webex/webex-js-sdk (task-refactor)](https://github.com/webex/webex-js-sdk/tree/task-refactor)

<!-- TODO: Provide local SDK cross-repo reference approach once finalized (Rankush is investigating). Do not use hardcoded local paths. -->

| File | Purpose |
|------|---------|
| `uiControlsComputer.ts` | Computes `TaskUIControls` from `TaskState` + `TaskContext` — the single source of truth |
| `Task.ts` | Task service exposing `task.uiControls` getter and `task:ui-controls-updated` event |
| `constants.ts` | `TaskState` and `TaskEvent` enums |

---

## Migration Fix Log

### 2026-03-30 - Dial Number Transfer Wrapup Visibility (Complete Fix)

**Issue**: After dial number consult transfers, wrapup button not appearing. Tests in SET_6 failing with `findFirstVisibleWrapupIndex` returning -1 (timeout after 15 seconds).

**Root Cause (Deeper Analysis)**:
1. Initial hypothesis: `shouldWrapUpOrIsInitiator` guard relied on backend `wrapUpRequired` flag which wasn't set for dial number transfers.
2. **Actual root cause**: Backend sends `AgentConsultEnded` **before** `AgentConsultTransferred` for dial number transfers.
3. Event ordering issue: CONSULT_END (clears `consultInitiator`) → TRANSFER_SUCCESS (checks `consultInitiator`, now false) → transitions to CONNECTED instead of WRAPPING_UP.

**Fix Location**: SDK `/packages/@webex/contact-center/src/services/task/state-machine/`

**Changes Made**:
1. **TaskStateMachine.ts** - Updated TRANSFER_SUCCESS guards (lines 256-267, 336-347, 489-505):
   - Changed to directly check `consultInitiator` instead of using `guards.shouldWrapUpOrIsInitiator`
   - Ensures consult initiators always wrap up regardless of backend flags

2. **Added `transferRequested` flag** to track transfer initiation:
   - **types.ts**: Added `transferRequested: boolean` to TaskContext
   - **constants.ts**: Added `TRANSFER` event
   - **actions.ts**:
     - Initialize `transferRequested: false` in `createInitialContext`
     - Added `setTransferRequested` and `clearTransferRequested` actions
     - Added `clearConsultStatePreservingTransfer` action that preserves `consultInitiator` if `transferRequested` is true
   - **TaskStateMachine.ts**:
     - CONNECTED, HELD, CONSULTING states: Added TRANSFER event handler that sets `transferRequested` flag
     - CONSULT_END in CONSULTING state: Changed to use `clearConsultStatePreservingTransfer` instead of `clearConsultState`
     - TRANSFER_SUCCESS in all states (CONNECTED, HELD, CONSULTING): Added `clearTransferRequested` to ALL branches (wrapup and fallback)
     - TRANSFER_FAILED in all states: Added `clearTransferRequested` action
   - **Voice.ts**: `transfer()` method now dispatches TRANSFER event before API call

**Why**: For dial number transfers, backend event ordering can vary - CONSULT_END may arrive before TRANSFER_SUCCESS. The `transferRequested` flag tracks that a transfer is in progress, preventing CONSULT_END from clearing `consultInitiator` prematurely. This ensures TRANSFER_SUCCESS can properly check `consultInitiator` for wrapup transition.

**Impact on Widgets**: No widget changes needed. Pure SDK state machine fix. Widgets already consume `task.uiControls.wrapup.isVisible`.

**Tests Fixed**: SET_6 Tests 1, 2, 4, 9 (all dial number transfer wrapup visibility failures)

**Fix Iterations**:
- Iteration 1-3: Implemented transferRequested flag and preservation logic, but only added clearTransferRequested to CONSULTING state
- Iteration 4 (2026-03-31): Discovered CONNECTED and HELD states' TRANSFER_SUCCESS handlers were missing clearTransferRequested. This was critical because when CONSULT_END arrives during transfer, state transitions CONSULTING → HELD, and TRANSFER_SUCCESS is then handled in HELD state. Without cleanup in HELD state, the flag would leak. Fixed by adding clearTransferRequested to ALL TRANSFER_SUCCESS branches in ALL states
- **CRITICAL DISCOVERY (2026-03-31)**: SDK was on WRONG BRANCH (`ADD_MISSING_EVENT_EMITTER_TYPES` instead of `task-refactor`). This meant:
  - stateMachineService was not initialized
  - All previous fix iterations were applied to wrong branch
  - Widgets were NOT using state machine at all
  - All test failures were due to missing state machine, not implementation bugs
  - **Resolution**: Switched SDK to `task-refactor` branch and re-applied all fixes. Tests must be re-run to validate fixes work on correct branch.

---

_Created: 2026-03-09_
_Updated: 2026-03-24 (added dead code removal and task-object source of truth sections; aligned with PR #648 decisions)_
_Updated: 2026-03-30 (added dial number transfer wrapup fix log)_
