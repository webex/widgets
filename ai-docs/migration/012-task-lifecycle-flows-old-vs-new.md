# Migration Doc 012: Task Lifecycle Flows — Complete Old vs New

## Purpose

This document traces **every task scenario from start to finish**, showing exactly what happens at each step in both the old and new approach. Each flow maps:
- User/system action
- SDK event chain
- Widget/store layer behavior
- UI controls shown
- State machine state (new only)

---

## Flow 1: Incoming Voice Call → Accept → Connected

### Old Flow
```
1. WebSocket: AgentContactReserved
2. SDK emits: task:incoming (with ITask)
3. Store: handleIncomingTask() → refreshTaskList() → cc.taskManager.getAllTasks()
         → runInAction: store.taskList updated, store.incomingTask set
4. Widget: IncomingTask (observer) re-renders
5. Hook: useIncomingTask registers callbacks (TASK_ASSIGNED, TASK_REJECT, etc.)
6. UI Controls: getAcceptButtonVisibility(isBrowser, isPhoneDevice, webRtcEnabled, isCall, isDigitalChannel)
                getDeclineButtonVisibility(isBrowser, webRtcEnabled, isCall)
7. User clicks Accept
8. Hook: incomingTask.accept() → SDK API call
9. WebSocket: AgentContactAssigned
10. SDK emits: task:assigned
11. Store: handleTaskAssigned() → refreshTaskList() → update taskList, set currentTask
12. Hook: TASK_ASSIGNED callback fires → onAccepted({task})
13. Widget: CallControl appears
14. UI Controls: getControlsVisibility() computes all 22 controls from raw task data
         → hold, mute, end, transfer, consult visible and enabled
```

### New Flow
```
1. WebSocket: AgentContactReserved
2. SDK: TaskManager maps to TaskEvent.TASK_INCOMING
3. SDK: task.sendStateMachineEvent(TASK_INCOMING) → State: IDLE → OFFERED
4. SDK: computeUIControls(OFFERED, context) → accept/decline visible (WebRTC)
5. SDK emits: task:incoming, task:ui-controls-updated
6. Store: handleIncomingTask() → store.incomingTask set
7. Widget: IncomingTask (observer) re-renders
8. Hook: useIncomingTask reads task.uiControls.accept / task.uiControls.decline
9. User clicks Accept
10. Hook: incomingTask.accept() → SDK API call
11. WebSocket: AgentContactAssigned
12. SDK: TaskManager maps to TaskEvent.ASSIGN
13. SDK: task.sendStateMachineEvent(ASSIGN) → State: OFFERED → CONNECTED
14. SDK: computeUIControls(CONNECTED, context) → hold, mute, end, transfer, consult
15. SDK emits: task:assigned, task:ui-controls-updated
16. Store: handleTaskAssigned() → set currentTask
17. Widget: CallControl appears
18. Hook: useCallControl reads task.uiControls directly (no computation)
```

### Key Difference
| Step | Old | New |
|------|-----|-----|
| Controls computation | Widget runs `getControlsVisibility()` on every render | SDK pre-computes `task.uiControls` on every state transition |
| Data freshness | `refreshTaskList()` re-fetches all tasks | SDK updates `task.data` in state machine action |
| Re-render trigger | MobX observable change after `refreshTaskList()` | `task:ui-controls-updated` event |

---

## Flow 2: Incoming Voice Call → Reject / RONA (Timeout)

### Old Flow
```
1-6. Same as Flow 1 (incoming → show accept/decline)
7. User clicks Decline (or timer expires → auto-reject)
8. Hook: incomingTask.decline() → SDK API call
9. WebSocket: AgentContactReservedTimeout (RONA) or rejection
10. SDK emits: task:rejected
11. Store: handleTaskReject() → refreshTaskList() → remove task from list
12. Hook: TASK_REJECT callback fires → onRejected({task})
13. Widget: IncomingTask unmounts
```

### New Flow
```
1-8. Same as Flow 1 new (incoming → OFFERED state)
7. User clicks Decline (or timer expires → auto-reject)
8. Hook: incomingTask.decline() → SDK API call
9. WebSocket: RONA or rejection
10. SDK: task.sendStateMachineEvent(RONA) → State: OFFERED → TERMINATED
11. SDK: computeUIControls(TERMINATED) → all controls disabled
12. SDK emits: task:rejected, task:ui-controls-updated
13. Store: handleTaskReject() → remove task from list
14. Hook: TASK_REJECT callback fires → onRejected({task})
15. Widget: IncomingTask unmounts
```

---

## Flow 3: Connected → Hold → Resume

### Old Flow
```
1. User clicks Hold
2. Hook: toggleHold(true) → currentTask.hold()
3. SDK: API call to backend
4. WebSocket: AgentContactHeld
5. SDK emits: task:hold
6. Store: refreshTaskList() → cc.taskManager.getAllTasks() → update store.taskList
7. Hook: TASK_HOLD callback fires → onHoldResume({ isHeld: true })
8. UI Controls: getControlsVisibility() recalculates:
         → findHoldStatus(task, 'mainCall', agentId) returns true
         → holdResume: { isVisible: true, isEnabled: true } (for resume)
         → end: { isVisible: true, isEnabled: false } (disabled while held)
         → mute: same
9. User clicks Resume
10. Hook: toggleHold(false) → currentTask.resume()
11. WebSocket: AgentContactUnheld
12. SDK emits: task:resume
13. Store: refreshTaskList() → update store.taskList
14. Hook: TASK_RESUME callback fires → onHoldResume({ isHeld: false })
15. UI Controls: getControlsVisibility() recalculates → controls back to connected state
```

### New Flow
```
1. User clicks Hold
2. Hook: toggleHold(true) → currentTask.hold()
3. SDK: sends TaskEvent.HOLD_INITIATED → State: CONNECTED → HOLD_INITIATING
4. SDK: computeUIControls(HOLD_INITIATING) → hold visible but transitioning
5. SDK emits: task:ui-controls-updated (optimistic)
6. SDK: API call to backend
7. WebSocket: AgentContactHeld
8. SDK: sends TaskEvent.HOLD_SUCCESS → State: HOLD_INITIATING → HELD
9. SDK: computeUIControls(HELD) → hold visible (for resume), end/mute disabled
10. SDK emits: task:hold, task:ui-controls-updated
11. Store: TASK_HOLD callback fires → onHoldResume({ isHeld: true })
12. Hook: controls state updated via task:ui-controls-updated listener
13. User clicks Resume
14. Hook: toggleHold(false) → currentTask.resume()
15. SDK: sends TaskEvent.UNHOLD_INITIATED → State: HELD → RESUME_INITIATING
16. SDK: API call to backend
17. WebSocket: AgentContactUnheld
18. SDK: sends TaskEvent.UNHOLD_SUCCESS → State: RESUME_INITIATING → CONNECTED
19. SDK: computeUIControls(CONNECTED) → all active controls enabled
20. SDK emits: task:resume, task:ui-controls-updated
21. Store: TASK_RESUME callback fires
22. Hook: controls state updated
```

### Key Difference
| Step | Old | New |
|------|-----|-----|
| Hold initiation | Immediate API call, wait for response | Optimistic: HOLD_INITIATING state before API call |
| Intermediate states | None (binary: held or not) | HOLD_INITIATING, RESUME_INITIATING (UI can show spinner) |
| Controls update | After `refreshTaskList()` + `getControlsVisibility()` | After each state transition via `task:ui-controls-updated` |

---

## Flow 4: Connected → Consult → End Consult

### Old Flow
```
1. User initiates consult
2. Hook: consultCall(destination, type, allowInteract) → currentTask.consult(payload)
3. SDK: API call to backend
4. WebSocket: AgentConsultCreated
5. SDK emits: task:consultCreated
6. Store: handleConsultCreated() → refreshTaskList() → update taskList
7. UI Controls: getControlsVisibility() recalculates:
         → getConsultStatus() returns CONSULT_INITIATED
         → endConsult visible, consultTransfer visible, switchToMainCall visible
         → hold disabled, transfer hidden
8. WebSocket: AgentConsulting (consult agent answered)
9. SDK emits: task:consulting
10. Store: handleConsulting() → refreshTaskList()
11. UI Controls: getControlsVisibility() recalculates:
         → getConsultStatus() returns CONSULT_ACCEPTED
         → mergeConference enabled, consultTransfer enabled
         → switchToMainCall/switchToConsult available
12. User clicks End Consult
13. Hook: endConsultCall() → currentTask.endConsult(payload)
14. WebSocket: AgentConsultEnded
15. SDK emits: task:consultEnd
16. Store: refreshTaskList()
17. UI Controls: getControlsVisibility() → back to connected state controls
```

### New Flow
```
1. User initiates consult
2. Hook: consultCall(destination, type, allowInteract) → currentTask.consult(payload)
3. SDK: sends TaskEvent.CONSULT → State: CONNECTED → CONSULT_INITIATING
4. SDK: computeUIControls(CONSULT_INITIATING) → consult controls transitioning
5. SDK emits: task:ui-controls-updated
6. SDK: API call → success
7. SDK: sends TaskEvent.CONSULT_SUCCESS → stays CONSULT_INITIATING (waiting for agent)
8. WebSocket: AgentConsultCreated → TaskEvent.CONSULT_CREATED
9. SDK: task data updated
10. WebSocket: AgentConsulting → TaskEvent.CONSULTING_ACTIVE
11. SDK: State: CONSULT_INITIATING → CONSULTING
12. SDK: context.consultDestinationAgentJoined = true
13. SDK: computeUIControls(CONSULTING):
         → endConsult visible+enabled, mergeToConference visible+enabled
         → switchToMainCall visible, switchToConsult visible
         → transfer visible (for consult transfer)
         → hold disabled (in consult)
14. SDK emits: task:consulting, task:ui-controls-updated
15. Hook: controls updated via listener
16. User clicks End Consult
17. Hook: endConsultCall() → currentTask.endConsult(payload)
18. WebSocket: AgentConsultEnded → TaskEvent.CONSULT_END
19. SDK: State: CONSULTING → CONNECTED (or CONFERENCING if from conference)
20. SDK: context cleared (consultInitiator=false, consultDestinationAgentJoined=false)
21. SDK: computeUIControls(CONNECTED) → back to normal connected controls
22. SDK emits: task:consultEnd, task:ui-controls-updated
23. Hook: controls updated
```

### Key Difference
| Step | Old | New |
|------|-----|-----|
| Consult state tracking | `getConsultStatus()` inspects participants | State machine: CONSULT_INITIATING → CONSULTING |
| Agent joined detection | `ConsultStatus.CONSULT_ACCEPTED` from participant flags | `context.consultDestinationAgentJoined` set by action |
| Controls | Computed from raw data every render | Pre-computed on each state transition |

---

## Flow 5: Consulting → Merge to Conference → Exit Conference

### Old Flow
```
1. In consulting state (Flow 4 steps 1-11)
2. User clicks Merge Conference
3. Hook: consultConference() → currentTask.consultConference()
4. SDK: API call
5. WebSocket: AgentConsultConferenced / ParticipantJoinedConference
6. SDK emits: task:conferenceStarted / task:participantJoined
7. Store: handleConferenceStarted() → refreshTaskList()
8. UI Controls: getControlsVisibility():
         → task.data.isConferenceInProgress = true
         → exitConference visible+enabled
         → consult visible+enabled (can add more agents)
         → hold disabled (in conference)
         → mergeConference hidden (already in conference)
9. User clicks Exit Conference
10. Hook: exitConference() → currentTask.exitConference()
11. WebSocket: ParticipantLeftConference / AgentConsultConferenceEnded
12. SDK emits: task:conferenceEnded / task:participantLeft
13. Store: handleConferenceEnded() → refreshTaskList()
14. UI Controls: getControlsVisibility() → may go to wrapup or connected
```

### New Flow
```
1. In CONSULTING state (Flow 4 new steps 1-15)
2. User clicks Merge Conference
3. Hook: consultConference() → currentTask.consultConference()
4. SDK: sends TaskEvent.MERGE_TO_CONFERENCE → State: CONSULTING → CONF_INITIATING
5. SDK: computeUIControls(CONF_INITIATING) → transitioning controls
6. SDK emits: task:ui-controls-updated
7. WebSocket: AgentConsultConferenced → TaskEvent.CONFERENCE_START
8. SDK: State: CONF_INITIATING → CONFERENCING
9. SDK: computeUIControls(CONFERENCING):
         → exitConference visible+enabled
         → consult visible (can add more)
         → hold disabled
         → mergeToConference hidden
10. SDK emits: task:conferenceStarted, task:ui-controls-updated
11. User clicks Exit Conference
12. Hook: exitConference() → currentTask.exitConference()
13. WebSocket: ParticipantLeftConference → TaskEvent.PARTICIPANT_LEAVE
14. SDK: guards check: didCurrentAgentLeaveConference? shouldWrapUp?
15. SDK: State: CONFERENCING → WRAPPING_UP (if wrapup required) or CONNECTED
16. SDK: computeUIControls for new state
17. SDK emits: task:conferenceEnded, task:ui-controls-updated
```

---

## Flow 6: Connected → End → Wrapup → Complete

### Old Flow
```
1. User clicks End
2. Hook: endCall() → currentTask.end()
3. SDK: API call
4. WebSocket: ContactEnded + AgentWrapup
5. SDK emits: task:end, task:wrapup
6. Store: handleTaskEnd() may refresh; handleWrapup → refreshTaskList()
7. UI Controls: getControlsVisibility():
         → getWrapupButtonVisibility(task) → { isVisible: task.data.wrapUpRequired }
         → all other controls hidden/disabled
8. Widget: Wrapup form appears
9. User selects reason, clicks Submit
10. Hook: wrapupCall(reason, auxCodeId) → currentTask.wrapup({wrapUpReason, auxCodeId})
11. SDK: API call
12. WebSocket: AgentWrappedup
13. SDK emits: task:wrappedup
14. Store: refreshTaskList() → task removed or updated
15. Hook: AGENT_WRAPPEDUP callback fires → onWrapUp({task, wrapUpReason})
16. Post-wrapup: store.setCurrentTask(nextTask), store.setState(ENGAGED)
```

### New Flow
```
1. User clicks End
2. Hook: endCall() → currentTask.end()
3. SDK: API call
4. WebSocket: ContactEnded → TaskEvent.CONTACT_ENDED
5. SDK: guards: shouldWrapUp? → State: CONNECTED → WRAPPING_UP
6. SDK: computeUIControls(WRAPPING_UP) → only wrapup visible+enabled
7. SDK emits: task:end, task:wrapup, task:ui-controls-updated
8. Hook: controls updated → only wrapup control shown
9. Widget: Wrapup form appears
10. User selects reason, clicks Submit
11. Hook: wrapupCall(reason, auxCodeId) → currentTask.wrapup({wrapUpReason, auxCodeId})
12. SDK: API call
13. WebSocket: AgentWrappedup → TaskEvent.WRAPUP_COMPLETE
14. SDK: State: WRAPPING_UP → COMPLETED
15. SDK: computeUIControls(COMPLETED) → all controls disabled
16. SDK: emitTaskWrappedup action → cleanupResources action
17. SDK emits: AGENT_WRAPPEDUP (AgentWrappedUp), task:ui-controls-updated, task:cleanup
18. Store: handleTaskEnd/cleanup → remove task from list
19. Hook: AGENT_WRAPPEDUP callback fires → onWrapUp({task, wrapUpReason})
20. Post-wrapup: store.setCurrentTask(nextTask), store.setState(ENGAGED)
```

---

## Flow 7: Auto-Wrapup Timer

### Old Flow
```
1. Task enters wrapup state (Flow 6 steps 1-7)
2. Hook: useEffect detects currentTask.autoWrapup && controlVisibility.wrapup
3. Hook: reads currentTask.autoWrapup.getTimeLeftSeconds()
4. Hook: setInterval every 1s → decrements secondsUntilAutoWrapup
5. Widget: AutoWrapupTimer component shows countdown
6. If user clicks Cancel: cancelAutoWrapup() → currentTask.cancelAutoWrapupTimer()
7. If timer reaches 0: SDK auto-submits wrapup with default reason
```

### New Flow
```
1. Task enters WRAPPING_UP state (Flow 6 new steps 1-8)
2. Hook: useEffect detects currentTask.autoWrapup && controls.wrapup.isVisible
         (changed: controlVisibility.wrapup → controls.wrapup)
3-7. Same as old — auto-wrapup is a widget-layer timer concern, SDK unchanged
```

### Key Difference
| Aspect | Old | New |
|--------|-----|-----|
| Timer trigger condition | `controlVisibility.wrapup` (computed by widget) | `controls.wrapup.isVisible` (from SDK) |
| Timer behavior | Unchanged | Unchanged |
| Cancel action | Unchanged | Unchanged |

---

## Flow 8: Recording Pause/Resume

### Old Flow
```
1. User clicks Pause Recording
2. Hook: toggleRecording() → currentTask.pauseRecording()
3. SDK: API call
4. WebSocket: ContactRecordingPaused
5. SDK emits: task:recordingPaused
6. Store: fires callback
7. Hook: pauseRecordingCallback() → setIsRecording(false), onRecordingToggle({isRecording: false})
8. UI Controls: getPauseResumeRecordingButtonVisibility() unchanged (still visible)
9. Widget: Button label changes to "Resume Recording"
```

### New Flow
```
1. User clicks Pause Recording
2. Hook: toggleRecording() → currentTask.pauseRecording()
3. SDK: sends TaskEvent.PAUSE_RECORDING → context.recordingInProgress = false
4. SDK: computeUIControls → recording: { isVisible: true, isEnabled: true }
         (visible and enabled = agent can click to resume recording)
5. SDK: API call
6. WebSocket: ContactRecordingPaused
7. SDK emits: task:recordingPaused, task:ui-controls-updated
8. Hook: setIsRecording(false), controls updated
9. Widget: Button label changes to "Resume Recording"
```

### Key Difference
| Aspect | Old | New |
|--------|-----|-----|
| Recording state tracking | Widget local state (`isRecording`) | SDK context (`recordingInProgress`) + widget local state |
| Recording button visibility | `getPauseResumeRecordingButtonVisibility()` | `controls.recording` from SDK |
| Recording indicator | Separate `recordingIndicator` control | Merged into `recording` control |

---

## Flow 9: Blind Transfer

### Old Flow
```
1. User clicks Transfer, selects destination
2. Hook: transferCall(to, type) → currentTask.transfer({to, destinationType})
3. SDK: API call
4. WebSocket: AgentBlindTransferred
5. SDK emits: (leads to task:end or task:wrapup depending on config)
6. Store: refreshTaskList()
7. UI Controls: getControlsVisibility() → wrapup or all disabled
```

### New Flow
```
1. User clicks Transfer, selects destination
2. Hook: transferCall(to, type) → currentTask.transfer({to, destinationType})
3. SDK: API call
4. WebSocket: AgentBlindTransferred → TaskEvent.TRANSFER_SUCCESS
5. SDK: guards: shouldWrapUpOrIsInitiator?
6. SDK: State → WRAPPING_UP (if wrapup required) or stays CONNECTED
7. SDK: computeUIControls for new state
8. SDK emits: task:end/task:wrapup, task:ui-controls-updated
```

---

## Flow 10: Digital Task (Chat/Email) — Accept → End → Wrapup

### Old Flow
```
1. WebSocket: AgentContactReserved (mediaType: chat)
2. SDK emits: task:incoming
3. Store: handleIncomingTask()
4. UI Controls: getAcceptButtonVisibility():
         → isBrowser && isDigitalChannel → accept visible
         → decline NOT visible (digital channels)
5. User clicks Accept
6. incomingTask.accept() → task:assigned
7. UI Controls: getControlsVisibility():
         → end visible, transfer visible, wrapup hidden
         → hold/mute/consult/conference/recording: all hidden (digital)
8. User clicks End
9. currentTask.end() → task:end, task:wrapup
10. UI Controls: wrapup visible (if wrapUpRequired)
```

### New Flow
```
1. WebSocket: AgentContactReserved (mediaType: chat)
2. SDK: State: IDLE → OFFERED, channelType: DIGITAL
3. SDK: computeDigitalUIControls(OFFERED) → accept visible, decline hidden
4. SDK emits: task:incoming, task:ui-controls-updated
5. User clicks Accept
6. incomingTask.accept() → ASSIGN → State: OFFERED → CONNECTED
7. SDK: computeDigitalUIControls(CONNECTED) → end visible, transfer visible
         → hold/mute/consult/conference/recording: all disabled (digital)
8. User clicks End
9. currentTask.end() → CONTACT_ENDED → WRAPPING_UP
10. SDK: computeDigitalUIControls(WRAPPING_UP) → wrapup visible
```

### Key Difference
| Aspect | Old | New |
|--------|-----|-----|
| Channel detection | Widget checks `mediaType === 'telephony'` vs chat/email | SDK checks `channelType: VOICE` vs `DIGITAL` |
| Digital controls | `getControlsVisibility()` with `isCall=false, isDigitalChannel=true` | `computeDigitalUIControls()` — much simpler logic |
| Controls shown | Same end result | Same end result (accept, end, transfer, wrapup only) |

---

## Flow 11: Page Refresh → Hydration

### Old Flow
```
1. Agent refreshes browser page
2. SDK reconnects, receives AgentContact for active task
3. SDK emits: task:hydrate
4. Store: handleTaskHydrate() → refreshTaskList() → cc.taskManager.getAllTasks()
5. Store: sets currentTask, taskList from fetched data
6. Widgets: observer re-renders with restored task
7. UI Controls: getControlsVisibility() computes from raw task data
         → Must correctly derive: held state, consult state, conference state
         → Error-prone: depends on raw interaction data being complete
```

### New Flow
```
1. Agent refreshes browser page
2. SDK reconnects, receives AgentContact for active task
3. SDK: TaskManager sends TaskEvent.HYDRATE with task data
4. SDK: State machine guards determine correct state:
         → isInteractionTerminated? → WRAPPING_UP
         → isInteractionConsulting? → CONSULTING
         → isInteractionHeld? → HELD
         → isInteractionConnected? → CONNECTED
         → isConferencingByParticipants? → CONFERENCING
         → default → IDLE (data update only)
5. SDK: computeUIControls for resolved state → correct controls for restored state
6. SDK emits: task:hydrate, task:ui-controls-updated
7. Store: handleTaskHydrate() → set currentTask, taskList
8. Widgets: observer re-renders; controls from task.uiControls are correct
```

### Key Difference
| Aspect | Old | New |
|--------|-----|-----|
| State recovery | `refreshTaskList()` + `getControlsVisibility()` from raw data | State machine guards determine correct state |
| Reliability | Can show wrong controls if interaction data is incomplete | Guards explicitly check each condition; predictable |
| Conference recovery | Depends on `isConferenceInProgress` flag in data | Guard: `isConferencingByParticipants` counts agents |

---

## Flow 12: Outdial → New Task

### Old Flow
```
1. User enters number, clicks Dial
2. Hook: startOutdial(destination, origin) → cc.startOutdial(destination, origin)
3. SDK: API call (CC-level, not task-level)
4. Backend creates task, sends AgentContactReserved
5. Flow continues as Flow 1 (Incoming → Accept → Connected)
```

### New Flow
```
Identical — outdial initiation is CC-level. Once the task is created,
the state machine takes over and flows follow Flow 1 new approach.
No changes needed.
```

---

## Flow 13: Consult Transfer (from Consulting State)

### Old Flow
```
1. In consulting state (Flow 4 steps 1-11)
2. User clicks Consult Transfer
3. Hook: consultTransfer() checks currentTask.data.isConferenceInProgress:
         → false: currentTask.consultTransfer()
         → true: currentTask.transferConference()
4. SDK: API call
5. WebSocket: AgentConsultTransferred / AgentConferenceTransferred
6. SDK emits: task events (leads to end/wrapup)
7. Store: refreshTaskList()
8. UI Controls: wrapup or all disabled
```

### New Flow
```
1. In CONSULTING state (Flow 4 new steps 1-15)
2. User clicks Transfer (transfer control now handles consult transfer)
3. Hook: consultTransfer() checks controls.transferConference.isVisible:
         → false: currentTask.consultTransfer()
         → true: currentTask.transferConference()
4. SDK: API call
5. WebSocket: → TaskEvent.TRANSFER_SUCCESS or TRANSFER_CONFERENCE_SUCCESS
6. SDK: State → WRAPPING_UP or TERMINATED
7. SDK: computeUIControls for new state
8. SDK emits: events + task:ui-controls-updated
```

### Key Difference
| Aspect | Old | New |
|--------|-----|-----|
| Conference check | `currentTask.data.isConferenceInProgress` | `controls.transferConference.isVisible` (or keep data check) |
| Transfer button | Separate `consultTransferConsult` control | `controls.transfer` (consult transfer) / `controls.transferConference` (conference transfer) |

---

## Flow 14: Switch Between Main Call and Consult Call

### Old Flow
```
1. In consulting state, agent is on consult leg
2. User clicks "Switch to Main Call"
3. Hook: switchToMainCall():
         → currentTask.resume(findMediaResourceId(task, 'consult'))
         (resumes consult media → puts consult on hold → main call active)
4. WebSocket: AgentContactHeld (consult) + AgentContactUnheld (main)
5. SDK emits: task:hold, task:resume
6. Store: refreshTaskList() (twice)
7. UI Controls: getControlsVisibility():
         → consultCallHeld = true → switchToConsult visible
         → switchToMainCall hidden
```

### New Flow
```
1. In CONSULTING state, agent is on consult leg
2. User clicks "Switch to Main Call"
3. Hook: switchToMainCall():
         → currentTask.resume(findMediaResourceId(task, 'consult'))
4. SDK: HOLD_INITIATED / UNHOLD_INITIATED → state machine tracks
5. SDK: context.consultCallHeld updated
6. SDK: computeUIControls(CONSULTING, updated context):
         → switchToConsult visible (consult is now held)
         → switchToMainCall hidden
7. SDK emits: task:hold, task:resume, task:ui-controls-updated
8. Hook: controls updated via listener
```

### Key Difference
| Aspect | Old | New |
|--------|-----|-----|
| consultCallHeld tracking | `findHoldStatus(task, 'consult', agentId)` | `context.consultCallHeld` in state machine |
| Controls update | After 2x `refreshTaskList()` | Single `task:ui-controls-updated` after state settles |

---

## State Machine States → Widget Controls Summary

| TaskState (New) | Old Equivalent | Controls Visible |
|-----------------|---------------|-----------------|
| `IDLE` | No task / before incoming | All disabled |
| `OFFERED` | Incoming task shown | accept, decline (WebRTC voice); accept only (digital) |
| `CONNECTED` | Active call | hold, mute, end, transfer, consult, recording |
| `HOLD_INITIATING` | (no equivalent) | hold visible (transitioning) |
| `HELD` | `isHeld = true` | hold (for resume), transfer, consult |
| `RESUME_INITIATING` | (no equivalent) | hold visible (transitioning) |
| `CONSULT_INITIATING` | `ConsultStatus.CONSULT_INITIATED` | endConsult, switchToMainCall, switchToConsult |
| `CONSULTING` | `ConsultStatus.CONSULT_ACCEPTED` | endConsult, mergeToConference, transfer, switchToMainCall/Consult |
| `CONF_INITIATING` | (no equivalent) | conference transitioning |
| `CONFERENCING` | `isConferenceInProgress = true` | exitConference, consult, transferConference |
| `WRAPPING_UP` | `wrapUpRequired && interaction terminated` | wrapup only |
| `COMPLETED` | Task removed after wrapup | All disabled |
| `TERMINATED` | Task rejected / ended without wrapup | All disabled |

---

## Event Chain Mapping: Old Widget Events → New SDK State Machine

| Widget Action | Old Event Chain | New Event Chain |
|--------------|----------------|-----------------|
| Accept task | `accept()` → `task:assigned` | `accept()` → `ASSIGN` → `task:assigned` + `task:ui-controls-updated` |
| Decline task | `decline()` → `task:rejected` | `decline()` → `RONA` → `task:rejected` + `task:ui-controls-updated` |
| Hold | `hold()` → `task:hold` | `hold()` → `HOLD_INITIATED` → `HOLD_SUCCESS` → `task:hold` + `task:ui-controls-updated` |
| Resume | `resume()` → `task:resume` | `resume()` → `UNHOLD_INITIATED` → `UNHOLD_SUCCESS` → `task:resume` + `task:ui-controls-updated` |
| End call | `end()` → `task:end` | `end()` → `CONTACT_ENDED` → `task:end` + `task:ui-controls-updated` |
| Wrapup | `wrapup()` → `task:wrappedup` | `wrapup()` → `WRAPUP_COMPLETE` → `AGENT_WRAPPEDUP` (AgentWrappedUp) + `task:ui-controls-updated` |
| Transfer | `transfer()` → `task:end` | `transfer()` → `TRANSFER_SUCCESS` → `task:end` + `task:ui-controls-updated` |
| Start consult | `consult()` → `task:consultCreated` | `consult()` → `CONSULT` → `CONSULT_SUCCESS` → `CONSULTING_ACTIVE` → `task:consulting` + `task:ui-controls-updated` |
| End consult | `endConsult()` → `task:consultEnd` | `endConsult()` → `CONSULT_END` → `task:consultEnd` + `task:ui-controls-updated` |
| Merge conference | `consultConference()` → `task:conferenceStarted` | `consultConference()` → `MERGE_TO_CONFERENCE` → `CONFERENCE_START` → `task:conferenceStarted` + `task:ui-controls-updated` |
| Exit conference | `exitConference()` → `task:conferenceEnded` | `exitConference()` → `PARTICIPANT_LEAVE` / `CONFERENCE_END` → `task:conferenceEnded` + `task:ui-controls-updated` |
| Pause recording | `pauseRecording()` → `task:recordingPaused` | `pauseRecording()` → `PAUSE_RECORDING` → `task:recordingPaused` + `task:ui-controls-updated` |
| Resume recording | `resumeRecording()` → `task:recordingResumed` | `resumeRecording()` → `RESUME_RECORDING` → `task:recordingResumed` + `task:ui-controls-updated` |

### Universal New Pattern
Every action now follows: **User action → SDK method → State machine event(s) → task.uiControls recomputed → `task:ui-controls-updated` emitted**. Widgets never need to compute controls themselves.

---

## Timer Utils: Old vs New Control References

**File:** `packages/contact-center/task/src/Utils/timer-utils.ts`

| Old Reference in Timer Utils | New Equivalent |
|-----------------------------|---------------|
| `controlVisibility.wrapup?.isVisible` | `controls.wrapup.isVisible` |
| `controlVisibility.consultCallHeld` | `controls.switchToConsult.isVisible` |
| `controlVisibility.isConsultInitiated` | `controls.endConsult.isVisible && !controls.mergeToConference.isEnabled` |

---

_Created: 2026-03-09_
_Parent: [001-migration-overview.md](./001-migration-overview.md)_
