# Migration Doc 014: Task-Related Code Scan Report

**Generated:** 2025-03-09  
**Scope:** Complete scan of CC Widgets repository for task-related code

---

## 1. `packages/contact-center/task/src/helper.ts` — ALL HOOKS

### useTaskList (lines 30–145)
- **Store callbacks:** `setTaskAssigned`, `setTaskRejected`, `setTaskSelected`
- **SDK methods:** `task.accept()`, `task.decline()`
- **Store methods:** `store.setCurrentTask(task, true)`
- **Migration:** Callbacks registered in useEffect with empty deps; task methods called directly on ITask

### useIncomingTask (lines 147–281)
- **setTaskCallback usage:** TASK_ASSIGNED, TASK_CONSULT_ACCEPTED, TASK_END, TASK_REJECT, TASK_CONSULT_END
- **removeTaskCallback:** Same events in cleanup
- **SDK methods:** `incomingTask.accept()`, `incomingTask.decline()`
- **Migration:** Per-task event subscriptions; must migrate to new event model

### useCallControl (lines 283–728)
- **setTaskCallback usage:** TASK_HOLD, TASK_RESUME, TASK_END, AGENT_WRAPPEDUP, TASK_RECORDING_PAUSED, TASK_RECORDING_RESUMED
- **removeTaskCallback:** TASK_HOLD, TASK_RESUME, TASK_END, AGENT_WRAPPEDUP, CONTACT_RECORDING_PAUSED, CONTACT_RECORDING_RESUMED (note: mismatch — uses CONTACT_* in cleanup but TASK_* in setup)
- **SDK methods on currentTask:**
  - `hold()`, `resume()`, `hold(mediaResourceId)`, `resume(mediaResourceId)`
  - `end()`, `wrapup({wrapUpReason, auxCodeId})`
  - `pauseRecording()`, `resumeRecording({autoResumed})`
  - `toggleMute()`
  - `transfer({to, destinationType})`
  - `consult(consultPayload)`
  - `consultConference()`, `exitConference()`
  - `endConsult(consultEndPayload)`
  - `consultTransfer()`, `transferConference()`
  - `cancelAutoWrapupTimer()`
- **Store imports:** `getConferenceParticipants`, `findMediaResourceId` from @webex/cc-store
- **Migration:** Heavy task API usage; all task methods and event subscriptions need migration

### useOutdialCall (lines 731–813)
- **Store:** `store.taskList`, `store.cc.startOutdial()`, `cc.getOutdialAniEntries()`, `cc.addressBook.getEntries()`
- **Task check:** `Object.values(taskList).some(task => task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER)`
- **Migration:** Minimal task usage; mainly checks taskList for telephony presence

---

## 2. `packages/contact-center/store/src/storeEventsWrapper.ts` — TASK EVENT HANDLERS

### registerTaskEventListeners (lines 416–451)
Registers on each task:
- TASK_END → handleTaskEnd
- TASK_ASSIGNED → handleTaskAssigned
- AGENT_OFFER_CONTACT → refreshTaskList
- AGENT_CONSULT_CREATED → handleConsultCreated
- TASK_CONSULT_QUEUE_CANCELLED → handleConsultQueueCancelled
- TASK_REJECT → handleTaskReject (with task)
- TASK_OUTDIAL_FAILED → handleOutdialFailed
- AGENT_WRAPPEDUP → refreshTaskList
- TASK_CONSULTING → handleConsulting
- TASK_CONSULT_ACCEPTED → handleConsultAccepted
- TASK_OFFER_CONSULT → handleConsultOffer
- TASK_AUTO_ANSWERED → handleAutoAnswer
- TASK_CONSULT_END → refreshTaskList
- TASK_HOLD, TASK_RESUME → refreshTaskList
- TASK_CONFERENCE_ENDED → handleConferenceEnded
- TASK_CONFERENCE_END_FAILED, TASK_CONFERENCE_ESTABLISHING, TASK_CONFERENCE_FAILED → refreshTaskList
- TASK_PARTICIPANT_JOINED → handleConferenceStarted
- TASK_PARTICIPANT_LEFT → handleConferenceEnded
- TASK_PARTICIPANT_LEFT_FAILED → refreshTaskList
- TASK_CONFERENCE_STARTED → handleConferenceStarted
- TASK_CONFERENCE_TRANSFERRED → handleConferenceEnded
- TASK_CONFERENCE_TRANSFER_FAILED → refreshTaskList
- TASK_POST_CALL_ACTIVITY → refreshTaskList
- TASK_MEDIA (browser only) → handleTaskMedia

### handleTaskEnd (lines 344–347)
- setIsDeclineButtonEnabled(false)
- refreshTaskList()

### handleTaskAssigned (lines 349–359)
- Calls onTaskAssigned if set
- setCurrentTask(task)
- setState({developerName: ENGAGED_LABEL, name: ENGAGED_USERNAME})

### handleIncomingTask (lines 453–467)
- Calls registerTaskEventListeners(task)
- If onIncomingTask && !taskList[task.data.interactionId]: onIncomingTask({task}), handleTaskMuteState(task)
- refreshTaskList()

### handleConsultCreated (lines 368–371)
- refreshTaskList()
- setConsultStartTimeStamp(Date.now())

### handleConsulting (lines 373–376)
- refreshTaskList()
- setConsultStartTimeStamp(Date.now())

### handleConsultAccepted (lines 393–406)
- refreshTaskList()
- setConsultStartTimeStamp(Date.now())
- setState(ENGAGED)
- If browser: task.on(TASK_EVENTS.TASK_MEDIA, handleTaskMedia)

### handleConsultOffer (lines 378–380)
- refreshTaskList()

### handleConferenceStarted (lines 412–419)
- setIsQueueConsultInProgress(false)
- setCurrentConsultQueueId(null)
- setConsultStartTimeStamp(null)
- refreshTaskList()

### handleConferenceEnded (lines 421–423)
- refreshTaskList()

### refreshTaskList (lines 262–281)
- taskList = cc.taskManager.getAllTasks()
- If empty: handleTaskRemove(currentTask), setCurrentTask(null), setState({reset: true})
- Else if currentTask in list: setCurrentTask(taskList[currentTask.data.interactionId])
- Else: handleTaskRemove(currentTask), setCurrentTask(taskList[taskListKeys[0]])

### setTaskCallback / removeTaskCallback (lines 354–384)
- setTaskCallback: task.on(event, callback) — task from taskList[taskId]
- removeTaskCallback: task.off(event, callback)

### setupIncomingTaskHandler (lines 603–668)
- CC events: TASK_HYDRATE, TASK_INCOMING, TASK_MERGED
- handleTaskHydrate, handleIncomingTask, handleTaskMerged

### handleTaskHydrate (lines 494–528)
- registerTaskEventListeners(task)
- refreshTaskList()
- setCurrentTask(task)
- Consult/wrapup state handling

### handleTaskMerged (lines 488–492)
- registerTaskEventListeners(task)
- refreshTaskList()

---

## 3. `packages/contact-center/store/src/task-utils.ts` — UTILITY FUNCTIONS

| Function | Purpose |
|----------|---------|
| `isIncomingTask(task, agentId)` | Determines if task is incoming (new/consult/connected/conference, !wrapUpRequired, !hasJoined) |
| `getConsultMPCState(task, agentId)` | Consult state derivation |
| `isSecondaryAgent(task)` | Secondary agent in consult |
| `isSecondaryEpDnAgent(task)` | Secondary EP-DN agent |
| `getTaskStatus(task, agentId)` | Task status string |
| `getConsultStatus(task, agentId)` | ConsultStatus enum |
| `getIsConferenceInProgress(task)` | Conference in progress check |
| `getConferenceParticipants(task, agentId)` | Active conference participants (excl. agent) |
| `getConferenceParticipantsCount(task)` | Participant count |
| `getIsCustomerInCall(task)` | Customer in call check |
| `getIsConsultInProgress(task)` | Consult in progress |
| `isInteractionOnHold(task)` | Any media on hold |
| `setmTypeForEPDN(task, mType)` | mType adjustment for EP-DN |
| `findMediaResourceId(task, mType)` | Media resource ID lookup |
| `findHoldStatus(task, mType, agentId)` | Hold status for media |
| `findHoldTimestamp(task, mType)` | Hold timestamp (task, mType) |

**Note:** Store `findHoldTimestamp(task, mType)` vs task package `findHoldTimestamp(interaction, mType)` — different signatures.

---

## 4. `packages/contact-center/cc-components/src/components/task/CallControl/call-control.tsx`

- **Props:** currentTask, toggleHold, toggleRecording, toggleMute, wrapupCall, controlVisibility, secondsUntilAutoWrapup, cancelAutoWrapup, etc.
- **Task usage:** `currentTask.data.interaction`, `currentTask.autoWrapup`, `updateCallStateFromTask(currentTask, setIsRecording)`
- **Pattern:** Presentational; receives all handlers from hook

---

## 5. `packages/contact-center/cc-components/src/components/task/CallControl/call-control.utils.ts`

- **updateCallStateFromTask(currentTask, setIsRecording):** Reads `currentTask.data.interaction.callProcessingDetails.isPaused`
- **buildCallControlButtons:** Uses controlVisibility, no direct task access
- **filterButtonsForConsultation:** Filters hold/consult when consult initiated + telephony

---

## 6. `packages/contact-center/cc-components/src/components/task/task.types.ts`

- **TaskProps, ControlProps, CallControlComponentProps:** ITask, currentTask, incomingTask, taskList
- **TaskListItemData, TaskComponentData:** Task-derived display types
- **TASK_EVENTS** not in this file (in store.types.ts)

---

## 7. `packages/contact-center/cc-components/src/components/task/IncomingTask/incoming-task.tsx`

- Uses `extractIncomingTaskData(incomingTask, ...)`
- Renders Task with accept/reject callbacks
- No direct SDK/store access

---

## 8. `packages/contact-center/cc-components/src/components/task/TaskList/task-list.tsx`

- Uses `extractTaskListItemData`, `getTasksArray`, `createTaskSelectHandler`, `isCurrentTaskSelected`
- Imports `isIncomingTask` from @webex/cc-store
- Renders Task for each task in taskList

---

## 9. `packages/contact-center/task/src/Utils/timer-utils.ts`

- **calculateStateTimerData(currentTask, controlVisibility, agentId):** Wrap-up/post-call timer from participant
- **calculateConsultTimerData(currentTask, controlVisibility, agentId):** Consult timer; uses `findHoldTimestamp(currentTask, 'consult')` from @webex/cc-store
- **Imports:** ITask, findHoldTimestamp from @webex/cc-store

---

## 10. `packages/contact-center/task/src/Utils/useHoldTimer.ts`

- **Imports:** findHoldTimestamp from `./task-util` (task package)
- **Signature:** findHoldTimestamp(interaction, mType) — passes `currentTask.data.interaction`
- **Uses:** Web Worker for hold elapsed time
- **Note:** Task package findHoldTimestamp(interaction, mType) vs store findHoldTimestamp(task, mType)

---

## 11. CallControlCustom/

| File | Task Usage |
|------|------------|
| consult-transfer-popover.tsx | No direct task; receives buddyAgents, getQueues, etc. |
| consult-transfer-popover-hooks.ts | Paginated data; no task |
| call-control-consult.tsx | consultTimerLabel, consultTimerTimestamp, controlVisibility — from props |
| call-control-custom.utils.ts | ControlVisibility, ButtonConfig; no task |
| consult-transfer-list-item.tsx | No task |
| consult-transfer-dial-number.tsx | No task |
| consult-transfer-empty-state.tsx | No task |

---

## 12. Task/

| File | Task Usage |
|------|------------|
| index.tsx | Props: interactionId, title, state, startTimeStamp, ronaTimeout, acceptTask, declineTask, onTaskSelect |
| task.utils.ts | extractTaskComponentData; no direct task object |

---

## 13. TaskTimer/

- **Props:** startTimeStamp, countdown, ronaTimeout
- Web Worker for elapsed/countdown display
- No ITask reference

---

## 14. AutoWrapupTimer/

- **Props:** secondsUntilAutoWrapup, allowCancelAutoWrapup, handleCancelWrapup
- getTimerUIState(secondsUntilAutoWrapup)
- No ITask reference

---

## 15. `packages/contact-center/store/src/store.ts`

- **Observables:** currentTask, taskList
- **init(options, setupEventListeners):** Passes setupIncomingTaskHandler
- No direct task logic

---

## 16. `packages/contact-center/store/src/store.types.ts`

- **TASK_EVENTS** enum (lines 168–207)
- **CC_EVENTS** enum
- **IStore:** currentTask, taskList
- **ITask** from @webex/contact-center

---

## 17. `packages/contact-center/store/src/constants.ts`

- Task/consult state constants: TASK_STATE_CONSULT, TASK_STATE_CONSULTING, INTERACTION_STATE_*, CONSULT_STATE_*, etc.
- EXCLUDED_PARTICIPANT_TYPES, MEDIA_TYPE_CONSULT

---

## 18. `packages/contact-center/task/src/Utils/task-util.ts`

- **findHoldTimestamp(interaction, mType):** Task package version — takes interaction
- **getControlsVisibility(deviceType, featureFlags, task, agentId, conferenceEnabled):** Full control visibility
- Imports from @webex/cc-store: getConsultStatus, getIsConsultInProgress, getIsCustomerInCall, getConferenceParticipantsCount, findHoldStatus

---

## 19. `widgets-samples/cc/samples-cc-react-app/`

- **App.tsx:** IncomingTask, TaskList, CallControl; onIncomingTaskCB, onAccepted, onRejected, onTaskAccepted, onTaskDeclined, onTaskSelected; store.currentTask, store.setIncomingTaskCb
- **EngageWidget.tsx:** store.currentTask, mediaType, isSupportedTask
- **Task usage:** currentTask, taskList, incomingTasks state, task.data.interactionId

---

## CRITICAL MIGRATION PATTERNS

### 1. findHoldTimestamp Signature Mismatch
- **Store (task-utils.ts):** `findHoldTimestamp(task: ITask, mType: string)`
- **Task package (task-util.ts):** `findHoldTimestamp(interaction: Interaction, mType: string)`
- **useHoldTimer** uses task package version with `currentTask.data.interaction`
- **timer-utils.ts** uses store version with `currentTask`

### 2. useCallControl Event Cleanup Mismatch (BUG)
- Setup: TASK_RECORDING_PAUSED, TASK_RECORDING_RESUMED
- Cleanup: CONTACT_RECORDING_PAUSED, CONTACT_RECORDING_RESUMED
- **Bug:** Cleanup uses wrong event names — callbacks are never removed; should use TASK_RECORDING_* in cleanup to match setup

### 3. SDK Method Calls (require migration)
- task.accept(), task.decline()
- task.hold(), task.resume(), task.hold(id), task.resume(id)
- task.end(), task.wrapup(), task.pauseRecording(), task.resumeRecording()
- task.toggleMute()
- task.transfer(), task.consult(), task.endConsult()
- task.consultConference(), task.exitConference(), task.consultTransfer(), task.transferConference()
- task.cancelAutoWrapupTimer()

### 4. Event Subscriptions
- Per-task: task.on(TASK_EVENTS.*, callback)
- CC-level: ccSDK.on(TASK_EVENTS.TASK_INCOMING, ...), TASK_HYDRATE, TASK_MERGED

### 5. Store Task Flow
- refreshTaskList → cc.taskManager.getAllTasks()
- setCurrentTask uses isIncomingTask(task, agentId) to skip incoming
- handleTaskRemove unregisters all task listeners

---

## FILES SUMMARY

| Location | Task-Related |
|----------|--------------|
| task/src/helper.ts | ✅ All 4 hooks |
| store/storeEventsWrapper.ts | ✅ All handlers |
| store/task-utils.ts | ✅ All utilities |
| store/store.ts | ✅ currentTask, taskList |
| store/store.types.ts | ✅ TASK_EVENTS, ITask |
| store/constants.ts | ✅ Task state constants |
| task/src/Utils/task-util.ts | ✅ findHoldTimestamp, getControlsVisibility |
| task/src/Utils/timer-utils.ts | ✅ Timer computation |
| task/src/Utils/useHoldTimer.ts | ✅ Hold timer |
| cc-components CallControl/* | ✅ Props, utils |
| cc-components Task/* | ✅ Display |
| cc-components TaskList/* | ✅ Utils, isIncomingTask |
| cc-components IncomingTask/* | ✅ Utils |
| samples-cc-react-app | ✅ Full usage |

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
