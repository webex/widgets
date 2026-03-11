# Migration Doc 009: Types and Constants Alignment

## Summary

CC Widgets defines its own types for control visibility, task state, and constants. These must be aligned with the new SDK types (`TaskUIControls`, `TaskState`, etc.) to ensure type safety and avoid duplication.

---

## Type Mapping: Old → New

### Control Visibility Type

| Old (CC Widgets) | New (CC SDK) |
|------------------|--------------|
| `Visibility` from `@webex/cc-components` = `{ isVisible: boolean; isEnabled: boolean }` | `TaskUIControlState` = `{ isVisible: boolean; isEnabled: boolean }` |

**Same shape, different name.** Can either:
- (A) Import `TaskUIControlState` from SDK and alias
- (B) Keep `Visibility` as-is since shape is identical
- **Recommendation:** Keep `Visibility` in `cc-components` for UI-layer independence; accept `TaskUIControls` from SDK in hooks.

### Controls Object Type

| Old (CC Widgets) | New (CC SDK) |
|------------------|--------------|
| No unified type — `getControlsVisibility()` returns ad-hoc object with 22 controls + 7 flags | `TaskUIControls` = `{ [17 control names]: { isVisible, isEnabled } }` |

**Action:** Import and use `TaskUIControls` from SDK. Map to component props.

### Task State Constants

| Old (CC Widgets Store) | New (CC SDK) | Notes |
|------------------------|--------------|-------|
| `TASK_STATE_CONSULT` | `TaskState.CONSULT_INITIATING` | **Not a 1:1 map** — old constant represents consult requested, not yet accepted. SDK `CONSULT_INITIATING` is the intermediate async state. SDK also has `TaskState.CONSULT_INITIATED` but it is **"NOT IMPLEMENTED"**. Do NOT collapse with `TASK_STATE_CONSULTING` |
| `TASK_STATE_CONSULTING` | `TaskState.CONSULTING` | Consult accepted, actively consulting |
| `TASK_STATE_CONSULT_COMPLETED` | `TaskState.CONNECTED` | Consult ended, back to connected state |
| `INTERACTION_STATE_WRAPUP` | `TaskState.WRAPPING_UP` | |
| `INTERACTION_STATE_POST_CALL` | `TaskState.POST_CALL` | SDK marks this **"NOT IMPLEMENTED"** |
| `INTERACTION_STATE_CONNECTED` | `TaskState.CONNECTED` | |
| `INTERACTION_STATE_CONFERENCE` | `TaskState.CONFERENCING` | |
| *(no old equivalent)* | `TaskState.IDLE` | New — task created but not yet offered |
| *(no old equivalent)* | `TaskState.OFFERED` | New — task offered to agent |
| *(no old equivalent)* | `TaskState.HOLD_INITIATING` | New — intermediate async state for hold request |
| *(no old equivalent)* | `TaskState.HELD` | New — task is on hold |
| *(no old equivalent)* | `TaskState.RESUME_INITIATING` | New — intermediate async state for resume request |
| *(no old equivalent)* | `TaskState.CONF_INITIATING` | New — intermediate async state for conference merge |
| *(no old equivalent)* | `TaskState.COMPLETED` | New — task completed |
| *(no old equivalent)* | `TaskState.TERMINATED` | New — task terminated |
| *(no old equivalent)* | `TaskState.CONSULT_COMPLETED` | **"NOT IMPLEMENTED"** in SDK |
| *(no old equivalent)* | `TaskState.PARKED` | **"NOT IMPLEMENTED"** in SDK |
| *(no old equivalent)* | `TaskState.MONITORING` | **"NOT IMPLEMENTED"** in SDK |

**Full `TaskState` enum (SDK):** `IDLE`, `OFFERED`, `CONNECTED`, `HOLD_INITIATING`, `HELD`, `RESUME_INITIATING`, `CONSULT_INITIATING`, `CONSULTING`, `CONF_INITIATING`, `CONFERENCING`, `WRAPPING_UP`, `COMPLETED`, `TERMINATED`, `CONSULT_INITIATED` (not impl), `CONSULT_COMPLETED` (not impl), `POST_CALL` (not impl), `PARKED` (not impl), `MONITORING` (not impl)

### Consult Status Constants

| Old (CC Widgets Store) | New (CC SDK Context) |
|------------------------|---------------------|
| `CONSULT_STATE_INITIATED` | `context.consultInitiator` = true |
| `CONSULT_STATE_COMPLETED` | SDK transitions back to CONNECTED/CONFERENCING |
| `CONSULT_STATE_CONFERENCING` | `TaskState.CONFERENCING` |
| `ConsultStatus.CONSULT_INITIATED` | `TaskState.CONSULT_INITIATING` |
| `ConsultStatus.CONSULT_ACCEPTED` | `context.consultDestinationAgentJoined` = true |
| `ConsultStatus.BEING_CONSULTED` | `context.isConsultedAgent` (derived by SDK) |
| `ConsultStatus.BEING_CONSULTED_ACCEPTED` | `context.isConsultedAgent` + CONSULTING state |
| `ConsultStatus.CONSULT_COMPLETED` | SDK clears consult context on CONSULT_END |

### Event Constants

| Old (CC Widgets) | Old Value | New (CC SDK) | New Value | Change |
|------------------|-----------|--------------|-----------|--------|
| `TASK_EVENTS.TASK_INCOMING` | `'task:incoming'` | `TASK_EVENTS.TASK_INCOMING` | `'task:incoming'` | Same |
| `TASK_EVENTS.TASK_ASSIGNED` | `'task:assigned'` | `TASK_EVENTS.TASK_ASSIGNED` | `'task:assigned'` | Same |
| `TASK_EVENTS.TASK_HOLD` | `'task:hold'` | `TASK_EVENTS.TASK_HOLD` | `'task:hold'` | Same |
| `TASK_EVENTS.TASK_RESUME` | `'task:resume'` | `TASK_EVENTS.TASK_RESUME` | `'task:resume'` | Same |
| `TASK_EVENTS.TASK_END` | `'task:end'` | `TASK_EVENTS.TASK_END` | `'task:end'` | Same |
| `TASK_EVENTS.TASK_WRAPUP` | `'task:wrapup'` | `TASK_EVENTS.TASK_WRAPUP` | `'task:wrapup'` | Same |
| `TASK_EVENTS.AGENT_WRAPPEDUP` | `'AgentWrappedUp'` | `TASK_EVENTS.TASK_WRAPPEDUP` | `'task:wrappedup'` | **Renamed + value changed** — widget uses CC-level event name, SDK uses task-level |
| `TASK_EVENTS.AGENT_CONSULT_CREATED` | `'AgentConsultCreated'` | `TASK_EVENTS.TASK_CONSULT_CREATED` | `'task:consultCreated'` | **Renamed + value changed** |
| `TASK_EVENTS.AGENT_OFFER_CONTACT` | `'AgentOfferContact'` | `TASK_EVENTS.TASK_OFFER_CONTACT` | `'task:offerContact'` | **Renamed + value changed** |
| `TASK_EVENTS.CONTACT_RECORDING_PAUSED` | `'ContactRecordingPaused'` | `TASK_EVENTS.TASK_RECORDING_PAUSED` | `'task:recordingPaused'` | **Renamed + value changed** |
| `TASK_EVENTS.CONTACT_RECORDING_RESUMED` | `'ContactRecordingResumed'` | `TASK_EVENTS.TASK_RECORDING_RESUMED` | `'task:recordingResumed'` | **Renamed + value changed** |
| — | — | `TASK_EVENTS.TASK_UI_CONTROLS_UPDATED` | `'task:ui-controls-updated'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_UNASSIGNED` | `'task:unassigned'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_CLEANUP` | `'task:cleanup'` | **NEW** — state machine terminal state cleanup |
| — | — | `TASK_EVENTS.TASK_RECORDING_STARTED` | `'task:recordingStarted'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_RECORDING_PAUSE_FAILED` | `'task:recordingPauseFailed'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_RECORDING_RESUME_FAILED` | `'task:recordingResumeFailed'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_CONSULT_QUEUE_FAILED` | `'task:consultQueueFailed'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_EXIT_CONFERENCE` | `'task:exitConference'` | **NEW** |
| — | — | `TASK_EVENTS.TASK_TRANSFER_CONFERENCE` | `'task:transferConference'` | **NEW** |
| `TASK_EVENTS.TASK_CONSULT_END` | Same | `TASK_EVENTS.TASK_CONSULT_END` | Same | Same |
| `TASK_EVENTS.TASK_CONSULT_ACCEPTED` | Same | `TASK_EVENTS.TASK_CONSULT_ACCEPTED` | Same | Same |
| `TASK_EVENTS.TASK_CONSULTING` | Same | `TASK_EVENTS.TASK_CONSULTING` | Same | Same |
| `TASK_EVENTS.TASK_OFFER_CONSULT` | Same | `TASK_EVENTS.TASK_OFFER_CONSULT` | Same | Same |
| All conference events | Same | Same | Same | Same |

> **Critical:** Five widget event names (`AGENT_WRAPPEDUP`, `AGENT_CONSULT_CREATED`, `AGENT_OFFER_CONTACT`, `CONTACT_RECORDING_PAUSED`, `CONTACT_RECORDING_RESUMED`) use CC-level naming convention (`'AgentWrappedUp'`, etc.) but the SDK uses task-level naming (`'task:wrappedup'`, etc.). Widget `store.types.ts` re-declares these and must be updated to match SDK values.

**Widget-only events (no SDK equivalent — must verify or remove):**

| Widget Event | Widget Value | SDK Status |
|-------------|-------------|------------|
| `TASK_UNHOLD` | `'task:unhold'` | SDK uses `TASK_RESUME` (`'task:resume'`) instead — no separate unhold event |
| `TASK_CONSULT` | `'task:consult'` | Not in SDK `TASK_EVENTS` — SDK uses `TASK_CONSULT_CREATED` / `TASK_CONSULTING` |
| `TASK_PAUSE` | `'task:pause'` | Not in SDK `TASK_EVENTS` — SDK uses recording events instead |
| `AGENT_CONTACT_ASSIGNED` | `'AgentContactAssigned'` | CC-level event — may still be needed for `cc.on()` subscriptions |

**Note:** Widget `store.types.ts` line 210 has `TODO: remove this once cc sdk exports this enum`. The SDK now exports `TASK_EVENTS` from `@webex/contact-center`. During migration, **delete the local `TASK_EVENTS` enum** and import from SDK directly.

### Media Type / Channel Type Constants

| Old (CC Widgets) | New (CC SDK) | SDK Source |
|------------------|--------------|------------|
| `MEDIA_TYPE_TELEPHONY` = `'telephony'` | `TASK_CHANNEL_TYPE.VOICE` = `'voice'` | `services/task/types.ts` |
| `MEDIA_TYPE_CHAT` = `'chat'` | `TASK_CHANNEL_TYPE.DIGITAL` = `'digital'` | `services/task/types.ts` |
| `MEDIA_TYPE_EMAIL` = `'email'` | `TASK_CHANNEL_TYPE.DIGITAL` = `'digital'` | `services/task/types.ts` |

**Note:** SDK uses `TASK_CHANNEL_TYPE` (`VOICE`/`DIGITAL`) for UI control computation. Widget media types may still be needed for display purposes.

**Type:** `TaskChannelType = 'voice' | 'digital'` (derived from `typeof TASK_CHANNEL_TYPE`)

### Voice Variant Constants (NEW)

| Constant | Value | Purpose |
|----------|-------|---------|
| `VOICE_VARIANT.PSTN` | `'pstn'` | PSTN telephony — no `decline`/`toggleMute` in UI controls |
| `VOICE_VARIANT.WEBRTC` | `'webrtc'` | WebRTC browser — `decline` and `toggleMute` available |

**Type:** `VoiceVariant = 'pstn' | 'webrtc'` (derived from `typeof VOICE_VARIANT`)

**Widget impact:** Widgets do NOT set voice variant directly — the SDK resolves it internally when creating the task. But widgets should understand this affects which controls appear (e.g., PSTN tasks won't show decline button).

---

## New Types to Import from SDK

| Type | Source | Purpose | Package Entry Point Status |
|------|--------|---------|---------------------------|
| `TaskUIControls` | `@webex/contact-center` | Pre-computed control states (17 controls) | Exported from source file; pending addition to `src/index.ts` (Jira tracked) |
| `TaskUIControlState` | `@webex/contact-center` | Single control `{ isVisible, isEnabled }` | Local type in source file; pending export + addition to `src/index.ts` |
| `TASK_EVENTS.TASK_UI_CONTROLS_UPDATED` | `@webex/contact-center` | New event | Available — part of `TASK_EVENTS` enum already exported |
| `TASK_CHANNEL_TYPE` | `@webex/contact-center` | `{ VOICE, DIGITAL }` constant | Exported from source file; pending addition to `src/index.ts` |
| `VoiceVariant` | `@webex/contact-center` | `'pstn' \| 'webrtc'` | Exported from source file; pending addition to `src/index.ts` |
| `Participant` | `@webex/contact-center` | `{ id, name?, pType? }` for conference UI | Exported from source file; pending addition to `src/index.ts` |
| `getDefaultUIControls` | `@webex/contact-center` | Default controls fallback (all disabled) | Exported from source file; pending addition to `src/index.ts` |
| `TaskState` | `@webex/contact-center` | Enum for explicit task states — needed for consult timer labeling (`CONSULT_INITIATING` vs `CONSULTING`) | Exported from state-machine module; pending addition to `src/index.ts` |

> **See [001-migration-overview.md § SDK Package Entry Point — Pending Additions](./001-migration-overview.md)** for the full list and exact `src/index.ts` changes needed. A Jira ticket is being created to track these SDK-side additions.

**Note:** `TaskState` and `TaskEvent` enums are exported from the state-machine internal module but NOT from the package-level `index.ts`. Widgets should use `task.uiControls` for control state. However, widgets **do need `TaskState`** for consult timer labeling (`calculateConsultTimerData` needs to distinguish `CONSULT_INITIATING` from `CONSULTING`). `TaskState` must be added to SDK package exports — tracked in the [SDK missing items Confluence page](./confluence-sdk-missing-items.md).

### SDK Task Subtype Interfaces

The SDK defines three task subtype interfaces. Widgets currently use `ITask` but may need these for type narrowing:

| Interface | Extends | Additional Members | Package Entry Point Status |
|-----------|---------|-------------------|---------------------------|
| `ITask` | `EventEmitter` | `data`, `webCallMap`, `autoWrapup`, `accept()`, `decline()`, `hold()`, `resume()`, `end()`, `wrapup()`, `pauseRecording()`, `resumeRecording()`, `consult()`, `endConsult()`, `transfer()`, `consultConference()`, `exitConference()`, `transferConference()`, `toggleMute()`, `consultTransfer()`, `cancelAutoWrapupTimer()` | Available in `src/index.ts` |
| `IVoice` | `ITask` | `holdResume()` — single hold/resume toggle for voice | Defined in source; pending addition to `src/index.ts` |
| `IDigital` | `Omit<ITask, 'updateTaskData'>` | `uiControls: TaskUIControls`, `updateTaskData()` returns `IDigital` | Defined in source; pending addition to `src/index.ts` |
| `IWebRTC` | `IVoice` | `toggleMute()`, `decline()`, `unregisterWebCallListeners()` | Defined in source; pending addition to `src/index.ts` |

**Important:** `uiControls` is currently only declared on `IDigital`, not on `ITask`. The concrete `Task` class has a `public get uiControls()` getter inherited by all subclasses (Voice, Digital, WebRTC). Adding `uiControls` to `ITask` is tracked in the Jira ticket — see 001 for details.

---

---

## Before/After: Type Imports

### Before (task.types.ts)
```typescript
// task/src/task.types.ts — old approach
import {ITask, Interaction} from '@webex/contact-center';
import {Visibility, ControlProps} from '@webex/cc-components';

export interface useCallControlProps {
  currentTask: ITask;
  deviceType: string;            // Used for control visibility computation
  featureFlags: {[key: string]: boolean}; // Used for control visibility
  agentId: string;               // Used for control visibility AND timer participant lookup
  conferenceEnabled: boolean;    // Used for control visibility
  isMuted: boolean;
  logger: ILogger;
  onHoldResume?: (data: any) => void;
  onEnd?: (data: any) => void;
  onWrapUp?: (data: any) => void;
  onRecordingToggle?: (data: any) => void;
  onToggleMute?: (data: any) => void;
}
// Return type is ad-hoc — includes 22 controls + 7 flags + hook state + actions
```

### After (task.types.ts)
```typescript
// task/src/task.types.ts — new approach
import {ITask, TaskUIControls} from '@webex/contact-center';

export interface useCallControlProps {
  currentTask: ITask;
  // REMOVED: deviceType, featureFlags, conferenceEnabled
  //          (SDK computes controls via UIControlConfig, set at task creation)
  agentId: string;  // RETAINED — still needed by timer utils for participant lookup
  isMuted: boolean;
  logger: ILogger;
  onHoldResume?: (data: any) => void;
  onEnd?: (data: any) => void;
  onWrapUp?: (data: any) => void;
  onRecordingToggle?: (data: any) => void;
  onToggleMute?: (data: any) => void;
}

export interface CallControlHookResult {
  controls: TaskUIControls;   // NEW: all 17 controls from SDK
  currentTask: ITask;
  isMuted: boolean;
  isRecording: boolean;
  holdTime: number;
  startTimestamp: number;
  stateTimerLabel: string | null;
  stateTimerTimestamp: number;
  consultTimerLabel: string;
  consultTimerTimestamp: number;
  secondsUntilAutoWrapup: number | null;
  buddyAgents: BuddyDetails[];
  loadingBuddyAgents: boolean;
  consultAgentName: string;
  conferenceParticipants: Participant[];
  lastTargetType: TargetType;
  // Actions
  toggleHold: (hold: boolean) => void;
  toggleMute: () => Promise<void>;
  toggleRecording: () => void;
  endCall: () => void;
  wrapupCall: (reason: string, auxCodeId: string) => void;
  transferCall: (to: string, type: DestinationType) => Promise<void>;
  consultCall: (dest: string, type: DestinationType, interact: boolean) => Promise<void>;
  endConsultCall: () => Promise<void>;
  consultTransfer: () => Promise<void>;
  consultConference: () => Promise<void>;
  switchToMainCall: () => Promise<void>;
  switchToConsult: () => Promise<void>;
  exitConference: () => Promise<void>;
  cancelAutoWrapup: () => void;
  loadBuddyAgents: () => Promise<void>;
  getAddressBookEntries: (params: PaginatedListParams) => Promise<any>;
  getEntryPoints: (params: PaginatedListParams) => Promise<any>;
  getQueuesFetcher: (params: PaginatedListParams) => Promise<any>;
  setLastTargetType: (type: TargetType) => void;
  setConsultAgentName: (name: string) => void;
}
```

### Before/After: Constants

#### Before (store/constants.ts)
```typescript
// Used throughout for consult status derivation
export const TASK_STATE_CONSULT = 'consult';
export const TASK_STATE_CONSULTING = 'consulting';
export const TASK_STATE_CONSULT_COMPLETED = 'consultCompleted';
export const INTERACTION_STATE_WRAPUP = 'wrapup';
export const POST_CALL = 'postCall';
export const CONNECTED = 'connected';
export const CONFERENCE = 'conference';
export const CONSULT_STATE_INITIATED = 'initiated';
export const CONSULT_STATE_COMPLETED = 'completed';
export const CONSULT_STATE_CONFERENCING = 'conferencing';
export const RELATIONSHIP_TYPE_CONSULT = 'consult';
export const MEDIA_TYPE_CONSULT = 'consult';
```

#### After
```typescript
// REMOVE these (no longer needed for control computation):
// TASK_STATE_CONSULT, TASK_STATE_CONSULTING, TASK_STATE_CONSULT_COMPLETED
// INTERACTION_STATE_WRAPUP, INTERACTION_STATE_POST_CALL, INTERACTION_STATE_CONNECTED, INTERACTION_STATE_CONFERENCE
// CONSULT_STATE_INITIATED, CONSULT_STATE_COMPLETED, CONSULT_STATE_CONFERENCING

// KEEP these (still used for display or action logic):
export const RELATIONSHIP_TYPE_CONSULT = 'consult';
export const MEDIA_TYPE_CONSULT = 'consult'; // Used by findMediaResourceId
```

---

## UIControlConfig Note

**Important:** Widgets do NOT need to provide `UIControlConfig`. The SDK builds it internally:
- `channelType` — resolved from `task.data.interaction.mediaType` (telephony → voice, else digital)
- `voiceVariant` — set by Voice/WebRTC layer (PSTN vs WebRTC)
- `isEndTaskEnabled` / `isEndConsultEnabled` — from agent profile config flags
- `isRecordingEnabled` — from `callProcessingDetails.pauseResumeEnabled`
- `agentId` — from `taskManager.setAgentId()`

This means the widget no longer needs to pass `deviceType`, `featureFlags`, or `conferenceEnabled` for control computation. **Note:** `agentId` is retained — it is still needed by timer utilities for participant lookup.

---

## Files to Modify

| File | Action |
|------|--------|
| `task/src/task.types.ts` | Import `TaskUIControls` from SDK; update hook return types |
| `cc-components/.../task/task.types.ts` | Add `TaskUIControls` prop type for CallControl |
| `store/src/store.types.ts` | **Delete local `TASK_EVENTS` enum** — import from SDK `@webex/contact-center` instead. Update all 5 CC-level event names to SDK task-level names. Delete local `CC_EVENTS` if SDK exports it. |
| `store/src/constants.ts` | Review/remove consult state constants |
| `task/src/Utils/constants.ts` | Review/remove media type constants used only for controls |
| All files importing from `store.types.ts` | Update imports to use SDK `TASK_EVENTS` |

---

## Validation Criteria

- [ ] `TaskUIControls` type imported from SDK compiles correctly
- [ ] No type mismatches between SDK controls and component props
- [ ] `TASK_UI_CONTROLS_UPDATED` event constant available
- [ ] Old constants still available where needed (display purposes)
- [ ] No unused type imports remain

---

_Parent: [001-migration-overview.md](./001-migration-overview.md)_
_Updated: 2026-03-11 (complete TaskState enum, event name mapping with values, SDK interfaces, VoiceVariant, TASK_CHANNEL_TYPE, SDK export gaps)_
