# Task Refactor Migration Overview

## Purpose

Guide for migrating CC Widgets from ad-hoc task state management to the new SDK state-machine-driven architecture (`task-refactor` branch). This is the single entry point — it tells you what changed, which docs to follow in what order, and what to watch out for.

---

## Architectural Change: Old vs New

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  OLD (Current Widgets)                 │  NEW (After Migration)                 │
│                                        │                                        │
│  SDK emits 30+ task events             │  SDK state machine transitions         │
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

### `TaskUIControls` Structure

```typescript
type TaskUIControlState = { isVisible: boolean; isEnabled: boolean };

type TaskUIControls = {
  accept, decline, hold, transfer, consult, end, recording, mute,
  consultTransfer, endConsult, conference, exitConference,
  transferConference, mergeToConference, wrapup,
  switchToMainCall, switchToConsult
  // each: TaskUIControlState
};
```

Widgets no longer compute control visibility — `task.uiControls` is the single source of truth.

---

## Execution Order

Follow these docs in order. Each doc has old vs new code, before/after examples, and files to modify.

| Order | Document | What to Do |
|-------|----------|------------|
| 1 | [store-event-wiring-migration.md](./store-event-wiring-migration.md) | Simplify 30+ event handlers — remove `refreshTaskList()`, add `TASK_UI_CONTROLS_UPDATED` subscription |
| 2 | [store-task-utils-migration.md](./store-task-utils-migration.md) | Remove redundant utils (SDK handles), keep display/timer utils |
| 3 | [call-control-hook-migration.md](./call-control-hook-migration.md) | Replace `getControlsVisibility()` with `task.uiControls` in `useCallControl` + update timer utils |
| 4 | [incoming-task-migration.md](./incoming-task-migration.md) | Use `task.uiControls.accept/decline` instead of visibility functions |
| 5 | [task-list-migration.md](./task-list-migration.md) | Per-task `uiControls` for accept/decline |
| 6 | [component-layer-migration.md](./component-layer-migration.md) | Update `cc-components` props — `ControlVisibility` → `TaskUIControls`, rename control props |

---

## SDK Pending Exports (Prerequisites)

**What the SDK does not export today** (from the package entry point `src/index.ts`): the items in the table below. They exist in SDK source but are not re-exported from the public package, so widget code cannot import them until they are added to the package.

**Before implementing:** Identify whether each required export is available from the SDK — i.e. whether you can import it from the package. If an item is not yet exported, either delay the work that depends on it or implement only the parts that do not need it. Full completion of the migration requires these exports to be available.

These items are exported from SDK source files but not yet from the package entry point (`src/index.ts`):

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
| `TaskUIControls` | Pre-computed control states (17 controls) |
| `getDefaultUIControls()` | Fallback when no task: `task?.uiControls ?? getDefaultUIControls()` |
| `TASK_EVENTS` | Import from SDK — delete local enum in `store.types.ts` |

> Constants to delete/keep, event name mappings, and **migration gotchas** (non-obvious pitfalls or ordering constraints — e.g. “do not delete constant X until helper Y is rewritten”) are documented in each of the migration docs listed in the [Execution Order](#execution-order) table above (e.g. [store-event-wiring-migration.md](./store-event-wiring-migration.md), [store-task-utils-migration.md](./store-task-utils-migration.md), [call-control-hook-migration.md](./call-control-hook-migration.md), and the rest).

---

## CC Widgets Files Affected

| Area | Path |
|------|------|
| Task hooks | `packages/contact-center/task/src/helper.ts` |
| Task UI utils (OLD — to be removed) | `packages/contact-center/task/src/Utils/task-util.ts` |
| Task timer utils | `packages/contact-center/task/src/Utils/timer-utils.ts` |
| Hold timer hook | `packages/contact-center/task/src/Utils/useHoldTimer.ts` |
| Task types | `packages/contact-center/task/src/task.types.ts` |
| Store event wrapper | `packages/contact-center/store/src/storeEventsWrapper.ts` |
| Store task utils | `packages/contact-center/store/src/task-utils.ts` |
| Store constants | `packages/contact-center/store/src/constants.ts` |
| CC Components — CallControl | `packages/contact-center/cc-components/src/components/task/CallControl/` |
| CC Components — CallControlCAD | `packages/contact-center/cc-components/src/components/task/CallControlCAD/` |
| CC Components types | `packages/contact-center/cc-components/src/components/task/task.types.ts` |

---

## CC SDK Reference

> **Repo:** [webex/webex-js-sdk (task-refactor)](https://github.com/webex/webex-js-sdk/tree/task-refactor)
> **Local path:** `/Users/akulakum/Documents/CC_SDK/webex-js-sdk` (branch: `task-refactor`)

| File | Purpose |
|------|---------|
| `uiControlsComputer.ts` | Computes `TaskUIControls` from `TaskState` + `TaskContext` — the single source of truth |
| `Task.ts` | Task service exposing `task.uiControls` getter and `task:ui-controls-updated` event |
| `constants.ts` | `TaskState` and `TaskEvent` enums |

---

_Created: 2026-03-09_
_Updated: 2026-03-12 (consolidated and reordered per reviewer feedback)_
