# Participant Drop Cross-Repository Intake

Status: Implemented and verified locally on `feature/participant-drop`; live widget validation and SDK publication remain release gates.

## Goal and delivery order

Add owner-controlled participant removal to the Contact Center conference roster. Delivery is intentionally split into two sequential changes based on `next`:

1. `webex-js-sdk` adds the SDK task API, AQM correlation, tests, and Contact Center sample behavior.
2. `widgets-1` consumes the published SDK API and adds Drop only to `CallControlCAD`.

The remote routing/media backend and Agent Desktop are outside these repositories. No SDK initialization flag, widget flag, or new public failure event is introduced.

## SDK contract

```ts
export type DropConferenceParticipantPayload = {
  participantId: string;
};

task.dropConferenceParticipant(
  payload: DropConferenceParticipantPayload
): Promise<TaskResponse>;
```

The voice task resolves the latest main interaction ID and delegates to the existing AQM contact service:

```http
POST /v1/tasks/{interactionId}/conference/participants/{encodeURIComponent(participantId)}/drop
Content-Type: application/json

{}
```

Completion is event-correlated: `ParticipantLeftConference` resolves, `ParticipantDropConferenceFailed` rejects, and the existing 20-second AQM timeout applies. Existing participant-left task handling updates conference state and the participant roster; clients do not remove rows optimistically. Non-voice tasks reject as unsupported.

For EP-DN cross-channel lifecycle ordering, `ContactMerged` replaces the child task with the main-interaction task and publishes `task:merged`. `ParticipantLeftConference` and `AgentConsultEnded` first use exact task correlation, then one unique `mainInteractionId`/`parentInteractionId` relationship. Updated `mainCall` membership is authoritative for whether the current Agent ended, independent of consult state or initiator role. Widgets consume the existing terminal events and defer their task-list read by one microtask so SDK final cleanup is visible; they never delete or terminate an SDK task locally.

## Widget behavior

`@webex/cc-store` derives a Drop-specific roster from the current main-call media leg without changing `getConferenceParticipants` for its existing consumers. The viewing agent must remain active, and any supported non-customer row keeps the roster visible. Main-leg membership remains authoritative when conference state, flags, controls, or wrap-up signals lag behind participant updates.

- Exclude the viewing agent, departed/not-yet-joined participants, VVA, unsupported types, and consult-only participants.
- Include Agent and joined EP-DN rows; include Supervisor rows as read-only.
- Synthesize Customer only while an active main-leg Customer exists, using inbound ANI or outbound DNIS.
- After Customer leaves, retain Participants while at least one eligible Agent, EP-DN, or Supervisor remains with the viewing agent, even if backend conference state, flags, controls, or wrap-up signals downgrade.
- Customer-only calls use the original 1-to-1 UI. Dropping the final non-customer participant while Customer remains returns to that UI; Agent-to-Agent remains visible so the primary owner can Drop the other Agent.
- Merge only the current active Entry Point/EP-DN consult leg. Classify the destination from both SDK `pType` and `type` because Entry Point IDs can occupy `pType` while `type` carries `EpDn`. While ringing, display `dn` with participant/media ID fallback; once answered, replace the dialed number with the answering Agent name even before merge. Exclude stale legs and ordinary consult-only Agents, deduplicate after main-leg join, and keep the owner action disabled until merge.
- Show Drop only when `interaction.owner === currentAgentId`; Supervisor always remains read-only.
- Disable every Drop action during an active, non-held consult.
- Agent and joined EP-DN drop immediately; a ringing Entry Point/EP-DN or its pre-merge answering Agent is visible but disabled; Customer requires confirmation.
- Permit one request at a time, display `Dropping…` on only the selected row, and wait for SDK task hydration before a row disappears.
- On success announce `Participant removed from the conference.`
- On failure announce `Unable to drop participant from the call. Try again.` and invoke the existing `CallControlCAD` host error callback with a sanitized error.

The `CallControlCAD` participant surface uses the installed Momentum Design primitives throughout: a compact tertiary `Button` with Momentum secondary-button background tokens triggers a focus-trapped `Popover`; `List`/`ListItem`, `Icon`, `Text`, and `Divider` render the roster; `primary-participant-regular` identifies the primary agent while `meet-regular` remains on other rows; compact secondary/negative `Button` components render Drop actions; and a controlled `Dialog` with Momentum footer actions handles Customer confirmation. The installed Dialog version forces its named footer-button slots to the default color, so its documented custom footer slot is used to preserve the destructive primary/negative Drop action; the remaining footer CSS controls layout only. The participant Popover closes before Customer confirmation so two focus traps never overlap. The Dialog is positioned against the viewport and focus is explicitly restored to the stable participant trigger, falling back to end-call when hydration removes the roster. Momentum owns overlay visuals, keyboard dismissal, and focus trapping. Other component CSS is restricted to compact layout, sizing, overflow/truncation, overlay positioning, and theme-token colors; visible live-region feedback is not duplicated with a screen-reader announcer.

Backend authorization remains mandatory. Owner-based UI visibility is not an authorization boundary.

## Public surfaces and compatibility

Only the existing React `CallControlCAD` export and `widget-cc-call-control-cad` custom element gain behavior. Standard `CallControl` remains visually unchanged. No widget prop, custom-element attribute/property, initialization option, or callback is added.

The widget consumes published `@webex/contact-center@3.12.0-next.106` from `@webex/cc-store`; local links, absolute paths, portals, tarballs, and temporary resolutions must never be committed.

## Verification

- SDK: build, unit, and style tests plus the Contact Center sample on port 8001.
- Widgets: build, store selector tests, task hook/shell tests, component tests, cc-widgets tests, and style checks.
- Local samples: React on port 3000 and Web Component on port 4000.
- Manual coverage: owner/non-owner, Customer/Agent/EP-DN/Supervisor, confirmation and cancellation, consult gating, global pending lock, failure recovery, owner transfer, and final conference downgrade.

## Security and privacy

Participant IDs, names, ANI/DNIS, raw task/routing payloads, request URLs, credentials, and authorization headers must not enter widget logs or metrics. React text rendering is used for participant-derived display values. Failure reporting carries only the generic message and static module/method context.
