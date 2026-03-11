# Migration Doc 013: Complete File Inventory — Old Control References

## Purpose

This is the definitive inventory of **every file** in CC Widgets that references old task control names, state flags, or the `ControlVisibility` type. Use this as a checklist during migration to ensure nothing is missed.

---

## Summary

| Category | Files with Old Refs | Files Unaffected |
|----------|-------------------|-----------------|
| Widget hooks (`task/src/`) | 4 | 1 (`index.ts`) |
| Widget utils (`task/src/Utils/`) | 4 | 0 |
| Widget entry points (`task/src/*/index.tsx`) | 4 | 1 (`OutdialCall`) |
| cc-components types | 1 (central type file) | 0 |
| cc-components utils | 2 | 3+ (unaffected) |
| cc-components components | 4 | 8+ (unaffected) |
| Store | 3 | 1 (`store.ts`) |
| **Total files to modify** | **~25** | **~13 unaffected** |

---

## Files WITH Old Control References (Must Migrate)

### Tier 1: Core Logic Files (Highest Impact)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 1 | `task/src/Utils/task-util.ts` | `getControlsVisibility()` — the entire function (~650 lines). Computes all 22 controls + 7 state flags. Calls `getConsultStatus`, `findHoldStatus`, `getIsConferenceInProgress`, etc. | [Doc 002](./002-ui-controls-migration.md) |
| 2 | `task/src/helper.ts` (`useCallControl`) | `controlVisibility = useMemo(() => getControlsVisibility(...))`, references `controlVisibility.muteUnmute`, `controlVisibility.wrapup`, passes to `calculateStateTimerData`, `calculateConsultTimerData` | [Doc 004](./004-call-control-hook-migration.md) |
| 3 | `store/src/storeEventsWrapper.ts` | `refreshTaskList()` in 15+ event handlers; missing `TASK_UI_CONTROLS_UPDATED` subscription | [Doc 003](./003-store-event-wiring-migration.md) |
| 4 | `store/src/task-utils.ts` | `getConsultStatus()`, `findHoldStatus()`, `getIsConferenceInProgress()`, `getConferenceParticipantsCount()`, `getIsCustomerInCall()`, `getIsConsultInProgress()` — all used by `getControlsVisibility()` | [Doc 008](./008-store-task-utils-migration.md) |

### Tier 2: Component Utility Files (High Impact)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 5 | `cc-components/.../task/task.types.ts` | `ControlVisibility` interface (22 controls + 7 flags), `ControlProps.controlVisibility`, `CallControlComponentProps` picks `controlVisibility`, `CallControlConsultComponentsProps.controlVisibility`, `ConsultTransferPopoverComponentProps.isConferenceInProgress`, `ControlProps.isHeld`, `ControlProps.deviceType`, `ControlProps.featureFlags` | [Doc 009](./009-types-and-constants-migration.md), [Doc 010](./010-component-layer-migration.md) |
| 6 | `cc-components/.../call-control.utils.ts` | `buildCallControlButtons()` — 20+ references: `controlVisibility.muteUnmute`, `.holdResume`, `.isHeld`, `.consult`, `.transfer`, `.isConferenceInProgress`, `.consultTransfer`, `.mergeConference`, `.pauseResumeRecording`, `.exitConference`, `.end`, `.switchToConsult`. Also `filterButtonsForConsultation(consultInitiated)` | [Doc 010](./010-component-layer-migration.md) |
| 7 | `cc-components/.../call-control-custom.utils.ts` | `createConsultButtons()` — `controlVisibility.muteUnmuteConsult`, `.switchToMainCall`, `.isConferenceInProgress`, `.consultTransferConsult`, `.mergeConferenceConsult`, `.endConsult`. Also `getConsultStatusText(consultInitiated)` | [Doc 010](./010-component-layer-migration.md) |

### Tier 3: Component Files (Medium Impact)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 8 | `cc-components/.../CallControl/call-control.tsx` | Receives `controlVisibility` as prop, passes to `buildCallControlButtons()`, `createConsultButtons()`, `filterButtonsForConsultation()` | [Doc 010](./010-component-layer-migration.md) |
| 9 | `cc-components/.../CallControlCustom/call-control-consult.tsx` | Receives `controlVisibility` from `CallControlConsultComponentsProps`, passes to `createConsultButtons()` | [Doc 010](./010-component-layer-migration.md) |
| 10 | `cc-components/.../CallControlCustom/consult-transfer-popover.tsx` | Receives `isConferenceInProgress` prop | [Doc 010](./010-component-layer-migration.md) |
| 10b | `cc-components/.../CallControlCAD/call-control-cad.tsx` | Directly references `controlVisibility.isConferenceInProgress`, `controlVisibility.isHeld`, `controlVisibility.isConsultReceived`, `controlVisibility.consultCallHeld`, `controlVisibility.recordingIndicator`, `controlVisibility.wrapup`, `controlVisibility.isConsultInitiatedOrAccepted` | [Doc 010](./010-component-layer-migration.md) |
| 10c | `cc-components/src/wc.ts` | Registers `WebCallControlCADComponent` with `commonPropsForCallControl` — props must align with new `TaskUIControls` shape | [Doc 010](./010-component-layer-migration.md) |
| 10d | `cc-components/.../TaskList/task-list.utils.ts` | `extractTaskListItemData(task, isBrowser, agentId)` — uses `isBrowser` for accept/decline text, `disableAccept`, `disableDecline` computation; `store.isDeclineButtonEnabled` | [Doc 006](./006-task-list-migration.md) |
| 10e | `cc-components/.../IncomingTask/incoming-task.utils.tsx` | `extractIncomingTaskData(incomingTask, isBrowser, logger, isDeclineButtonEnabled)` — uses `isBrowser` for accept/decline text, `disableAccept`, `disableDecline` computation | [Doc 005](./005-incoming-task-migration.md) |

### Tier 4: Widget Entry Points (Medium Impact)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 11 | `task/src/CallControl/index.tsx` | Passes `deviceType`, `featureFlags`, `agentId`, `conferenceEnabled` from store to `useCallControl` | [Doc 004](./004-call-control-hook-migration.md) |
| 12 | `task/src/CallControlCAD/index.tsx` | Same as #11 — passes `deviceType`, `featureFlags`, `agentId`, `conferenceEnabled` | [Doc 010](./010-component-layer-migration.md) |
| 13 | `task/src/TaskList/index.tsx` | Passes `deviceType` from store for `isBrowser` computation | [Doc 006](./006-task-list-migration.md) |
| 13b | `task/src/IncomingTask/index.tsx` | Passes `deviceType` from store to `useIncomingTask` — migrate to `task.uiControls.accept`/`decline` | [Doc 005](./005-incoming-task-migration.md) |

### Tier 5: Utility Files (Low-Medium Impact)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 14 | `task/src/Utils/timer-utils.ts` | `calculateStateTimerData(task, controlVisibility, agentId)` — uses `controlVisibility.wrapup`, `.consultCallHeld`, `.isConsultInitiated` | [Doc 004](./004-call-control-hook-migration.md#timer-utils-migration) |
| 15 | `task/src/Utils/useHoldTimer.ts` | Uses `findHoldTimestamp` from task-util.ts (dual signature issue) — NOT a control visibility reference, but part of consolidation | [Doc 008](./008-store-task-utils-migration.md) |
| 16 | `task/src/task.types.ts` | `useCallControlProps` interface — includes `deviceType`, `featureFlags`, `agentId`, `conferenceEnabled` | [Doc 009](./009-types-and-constants-migration.md) |
| 17 | `task/src/Utils/constants.ts` | Timer label constants — no control refs, but check for unused consult state constants | [Doc 009](./009-types-and-constants-migration.md) |

### Tier 6: Store Constants (Low Impact)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 18 | `store/src/constants.ts` | `TASK_STATE_CONSULT`, `TASK_STATE_CONSULTING`, `CONSULT_STATE_INITIATED`, `CONSULT_STATE_COMPLETED`, etc. — used by `getConsultStatus()` | [Doc 009](./009-types-and-constants-migration.md) |
| 19 | `store/src/store.ts` | `refreshTaskList()` method, `isDeclineButtonEnabled` observable | [Doc 003](./003-store-event-wiring-migration.md) |

### Tier 7: Test Files (Must Update After Implementation)

| # | File | Old References | Migration Doc |
|---|------|---------------|--------------|
| 20 | `task/tests/**` | All `useCallControl` tests mock `getControlsVisibility()` return | [Doc 011](./011-execution-plan.md) |
| 21 | `cc-components/tests/**` | All CallControl component tests mock `controlVisibility` prop | [Doc 011](./011-execution-plan.md) |
| 22 | `store/tests/**` | Tests for event handlers, `refreshTaskList()`, task-utils | [Doc 011](./011-execution-plan.md) |

---

## Files WITHOUT Old Control References (No Migration Needed)

| File | Reason |
|------|--------|
| `task/src/OutdialCall/index.tsx` | CC-level API, no task controls |
| `task/src/index.ts` | Re-exports only |
| `cc-components/.../AutoWrapupTimer/AutoWrapupTimer.tsx` | Uses `secondsUntilAutoWrapup` only |
| `cc-components/.../AutoWrapupTimer/AutoWrapupTimer.utils.ts` | Pure timer formatting |
| `cc-components/.../CallControlCustom/consult-transfer-popover-hooks.ts` | Pagination/search logic |
| `cc-components/.../CallControlCustom/consult-transfer-list-item.tsx` | Display only |
| `cc-components/.../CallControlCustom/consult-transfer-dial-number.tsx` | Input handling |
| `cc-components/.../CallControlCustom/consult-transfer-empty-state.tsx` | Display only |
| `cc-components/.../TaskTimer/index.tsx` | Timer display |
| `cc-components/.../Task/index.tsx` | Task card display |
| `cc-components/.../Task/task.utils.ts` | Task data extraction for display |
| `cc-components/.../OutdialCall/outdial-call.tsx` | No task controls |
| `cc-components/.../constants.ts` | UI string constants |
| `cc-components/.../OutdialCall/constants.ts` | Outdial constants |

---

## Old Control Name → File Reference Matrix

This shows exactly which files reference each old control name:

| Old Control Name | Files That Reference It |
|------------------|------------------------|
| `muteUnmute` | `task-util.ts`, `call-control.utils.ts`, `task.types.ts` |
| `muteUnmuteConsult` | `task-util.ts`, `call-control-custom.utils.ts`, `task.types.ts` |
| `holdResume` | `task-util.ts`, `call-control.utils.ts`, `task.types.ts` |
| `pauseResumeRecording` | `task-util.ts`, `call-control.utils.ts`, `task.types.ts` |
| `recordingIndicator` | `task-util.ts`, `task.types.ts`, `call-control-cad.tsx` |
| `mergeConference` | `task-util.ts`, `call-control.utils.ts`, `task.types.ts` |
| `consultTransferConsult` | `task-util.ts`, `call-control-custom.utils.ts`, `task.types.ts` |
| `mergeConferenceConsult` | `task-util.ts`, `call-control-custom.utils.ts`, `task.types.ts` |
| `isConferenceInProgress` | `task-util.ts`, `call-control.utils.ts`, `call-control-custom.utils.ts`, `task.types.ts`, `consult-transfer-popover.tsx` |
| `isConsultInitiated` | `task-util.ts`, `call-control.utils.ts`, `timer-utils.ts`, `task.types.ts` |
| `isConsultInitiatedAndAccepted` | `task-util.ts`, `task.types.ts` |
| `isConsultReceived` | `task-util.ts`, `task.types.ts`, `call-control-cad.tsx` |
| `isConsultInitiatedOrAccepted` | `task-util.ts`, `helper.ts`, `timer-utils.ts`, `task.types.ts` |
| `isHeld` | `task-util.ts`, `call-control.utils.ts`, `task.types.ts`, `call-control-cad.tsx` |
| `consultCallHeld` | `task-util.ts`, `timer-utils.ts`, `task.types.ts`, `call-control-cad.tsx` |
| `controlVisibility` (param name) | `helper.ts`, `timer-utils.ts`, `call-control.utils.ts`, `call-control-custom.utils.ts`, `call-control.tsx`, `call-control-consult.tsx`, `call-control-cad.tsx`, `task.types.ts` |
| `ControlVisibility` (type) | `task.types.ts` (definition), `call-control.utils.ts`, `call-control-custom.utils.ts` (imports) |
| `isBrowser` (legacy flag) | `task-list.utils.ts`, `incoming-task.utils.tsx`, `task-list.tsx`, `incoming-task.tsx` — replace with `task.uiControls.accept`/`decline` |
| `isDeclineButtonEnabled` (legacy flag) | `incoming-task.utils.tsx`, `incoming-task.tsx`, `task-list.utils.ts` — replace with `task.uiControls.decline.isEnabled` |

---

## Migration Execution Order by File

Based on dependencies:

```
1. task.types.ts (cc-components)     — Define new TaskUIControls prop, keep ControlVisibility during transition
2. task/src/task.types.ts            — Import TaskUIControls, update useCallControlProps
3. store/src/constants.ts            — Mark deprecated constants
4. store/src/task-utils.ts           — Remove redundant functions
5. store/src/storeEventsWrapper.ts   — Add TASK_UI_CONTROLS_UPDATED, simplify handlers
6. task/src/Utils/timer-utils.ts     — Accept TaskUIControls instead of ControlVisibility
7. task/src/Utils/task-util.ts       — DELETE or reduce to findHoldTimestamp only
8. task/src/helper.ts                — Replace getControlsVisibility() with task.uiControls
9. call-control.utils.ts             — Update buildCallControlButtons() to new control names
10. call-control-custom.utils.ts     — Update createConsultButtons() to new control names
11. call-control.tsx                 — Update to accept controls: TaskUIControls
12. call-control-consult.tsx         — Update consult component props
13. consult-transfer-popover.tsx     — Update isConferenceInProgress derivation
13b. call-control-cad.tsx            — Replace all controlVisibility refs (isHeld, isConferenceInProgress, recordingIndicator, wrapup, isConsultInitiatedOrAccepted, isConsultReceived, consultCallHeld)
13c. wc.ts                           — Update commonPropsForCallControl to align with TaskUIControls shape
13d. task-list.utils.ts              — Replace isBrowser/isDeclineButtonEnabled with task.uiControls for accept/decline logic
13e. incoming-task.utils.tsx         — Replace isBrowser/isDeclineButtonEnabled with task.uiControls for accept/decline logic
14. CallControl/index.tsx            — Remove old props from useCallControl call
15. CallControlCAD/index.tsx         — Remove old props from useCallControl call
16. TaskList/index.tsx               — Remove deviceType usage
17. IncomingTask/index.tsx           — Remove deviceType, migrate to task.uiControls
18. All test files                   — Update mocks and assertions
```

---

_Created: 2026-03-09_
_Parent: [001-migration-overview.md](./001-migration-overview.md)_
