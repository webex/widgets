import {ITask, isInteractionOnHold, isSecondaryAgent, isSecondaryEpDnAgent} from '@webex/cc-store';
import {Interaction, TaskUIControls} from '@webex/contact-center';
import {resolveMainCadHoldTimestampMs} from './task-util';

type MediaEntry = {
  mType?: string;
  isHold?: boolean;
};

type InteractionParticipant = {
  pType?: string;
  hasLeft?: boolean;
  isConsulted?: boolean;
};

type InteractionWithMedia = Interaction & {
  media?: Record<string, MediaEntry>;
  participants?: Record<string, InteractionParticipant>;
};

type TaskStateSnapshot = {
  type?: string;
  interaction?: InteractionWithMedia;
};

type TaskWithStateSnapshot = ITask & {
  state?: {
    context?: {
      taskData?: TaskStateSnapshot;
    };
  };
};

const getMediaEntries = (media: InteractionWithMedia['media']): MediaEntry[] =>
  media ? (Object.values(media) as MediaEntry[]) : [];

const getParticipants = (participants: InteractionWithMedia['participants']): InteractionParticipant[] =>
  participants ? (Object.values(participants) as InteractionParticipant[]) : [];

export type MainCadHoldInputs = {
  currentTask: ITask | null;
  controls: TaskUIControls;
  agentId?: string;
  holdDataVersion?: number;
};

export type MainCadHoldResult = {
  isHeld: boolean;
  interaction: Interaction | undefined;
  holdTimestampMs: number | null;
};

/**
 * Single source of truth for main CAD "On Hold" chip + timer inputs.
 *
 * Covers: simple consult (Agent 2), EP/DN consult, conference nested consult,
 * plain conference hold, and refresh timer continuity (via resolveMainCadHoldTimestampMs).
 */
export function deriveMainCadHoldState({
  currentTask,
  controls,
  agentId,
  holdDataVersion = 0,
}: MainCadHoldInputs): MainCadHoldResult {
  void holdDataVersion;

  if (!currentTask?.data) {
    return {isHeld: false, interaction: undefined, holdTimestampMs: null};
  }

  // Prefer the latest state-machine taskData snapshot when available.
  // currentTask.data can lag one event behind in conference transitions.
  const taskWithSnapshot = currentTask as TaskWithStateSnapshot;
  const latestTaskData = taskWithSnapshot.state?.context?.taskData;
  const snapInteraction = latestTaskData?.interaction;
  const dataInteraction = currentTask?.data?.interaction as InteractionWithMedia | undefined;

  const isConsulted =
    Boolean(currentTask?.data?.isConsulted) ||
    Boolean(currentTask && isSecondaryAgent(currentTask)) ||
    Boolean(controls?.main?.endConsult?.isVisible && !controls?.consult?.endConsult?.isVisible) ||
    Boolean(
      agentId &&
        (dataInteraction?.participants?.[agentId]?.isConsulted || snapInteraction?.participants?.[agentId]?.isConsulted)
    );

  const isInConference = (snapInteraction?.state ?? dataInteraction?.state) === 'conference';

  // Explicit AgentContactHeld/AgentContactUnheld events are the authoritative signal for the MAIN
  // leg hold state. TaskManager refreshes currentTask.data for every event (before the state-machine
  // transition runs), so on a resume the data view carries AgentContactUnheld even when the
  // state-machine snapshot still lags one transition behind (e.g. it stayed on AgentConsultEnded with
  // main still held after ending a consult inside a conference). Trust the data view for these events
  // so the On-hold chip/timer and Pause/Resume toggle don't get stuck after resuming a conference
  // consult. Non-hold events keep the existing snapshot-first preference (conference lag handling).
  const dataEventType = currentTask?.data?.type;
  const dataIsExplicitHoldEvent = dataEventType === 'AgentContactHeld' || dataEventType === 'AgentContactUnheld';
  const preferDataForHold = !isConsulted && dataIsExplicitHoldEvent;

  // Consulted agents: task.data is freshest on AgentContactHeld/Unheld (simple consult + conference).
  const interaction =
    isConsulted || preferDataForHold ? (dataInteraction ?? snapInteraction) : (snapInteraction ?? dataInteraction);

  const taskEventType = preferDataForHold ? dataEventType : (latestTaskData?.type ?? currentTask?.data?.type);
  const isExplicitUnheldEvent = taskEventType === 'AgentContactUnheld';
  const isExplicitHeldEvent = taskEventType === 'AgentContactHeld';
  const currentCallProcessingDetails = interaction?.callProcessingDetails as Record<string, unknown> | undefined;
  const latestCallProcessingDetails = latestTaskData?.interaction?.callProcessingDetails as
    | Record<string, unknown>
    | undefined;
  const conferenceHoldParticipant =
    currentCallProcessingDetails?.conferenceHoldParticipant ?? latestCallProcessingDetails?.conferenceHoldParticipant;
  const conferenceHoldKnown =
    conferenceHoldParticipant === true ||
    conferenceHoldParticipant === false ||
    conferenceHoldParticipant === 'true' ||
    conferenceHoldParticipant === 'false';
  const isConferenceParticipantHeld = conferenceHoldParticipant === true || conferenceHoldParticipant === 'true';

  const epDnConsultRelationship =
    currentCallProcessingDetails?.relationshipType === 'consult' ||
    latestCallProcessingDetails?.relationshipType === 'consult';
  const parentInteractionId =
    currentCallProcessingDetails?.parentInteractionId ?? latestCallProcessingDetails?.parentInteractionId;
  const hasConsultMedia = Boolean(getMediaEntries(interaction?.media).some((media) => media.mType === 'consult'));
  const isEpDnUiPattern = Boolean(
    controls?.main?.endConsult?.isVisible &&
      !controls?.consult?.endConsult?.isVisible &&
      controls?.activeLeg === 'main' &&
      !hasConsultMedia
  );
  const isEpDnConsultedAgent =
    Boolean(currentTask && isSecondaryEpDnAgent(currentTask)) ||
    Boolean(
      interaction?.mediaType === 'telephony' &&
        epDnConsultRelationship &&
        parentInteractionId &&
        interaction?.interactionId &&
        parentInteractionId !== interaction.interactionId
    ) ||
    isEpDnUiPattern;

  const isConsulting =
    controls?.consult?.endConsult?.isVisible ||
    controls?.main?.endConsult?.isVisible ||
    Boolean(currentTask && isSecondaryEpDnAgent(currentTask) && epDnConsultRelationship);
  const customerPresent = Boolean(
    getParticipants(interaction?.participants).some((p) => p.pType === 'Customer' && !p.hasLeft)
  );
  const mainCallMediaHeld = Boolean(
    getMediaEntries(interaction?.media).some(
      (media) => (media.mType === 'mainCall' || media.mType === 'main') && media.isHold === true
    )
  );
  const consultMediaHeld = Boolean(
    getMediaEntries(interaction?.media).some((media) => media.mType === 'consult' && media.isHold === true)
  );

  if (!interaction) {
    return {isHeld: false, interaction: undefined, holdTimestampMs: null};
  }

  const isHeld = getMainCadHold({
    currentTask,
    controls,
    isConsulted,
    isEpDnConsultedAgent,
    isInConference,
    isConsulting,
    customerPresent,
    mainCallMediaHeld,
    consultMediaHeld,
    isExplicitUnheldEvent,
    isExplicitHeldEvent,
    conferenceHoldKnown,
    isConferenceParticipantHeld,
  });

  const holdTimestampMs = resolveMainCadHoldTimestampMs(interaction, isHeld, interaction.interactionId);

  return {isHeld, interaction, holdTimestampMs};
}

type MainCadHoldContext = {
  currentTask: ITask;
  controls: TaskUIControls;
  isConsulted: boolean;
  isEpDnConsultedAgent: boolean;
  isInConference: boolean;
  isConsulting: boolean;
  customerPresent: boolean;
  mainCallMediaHeld: boolean;
  consultMediaHeld: boolean;
  isExplicitUnheldEvent: boolean;
  isExplicitHeldEvent: boolean;
  conferenceHoldKnown: boolean;
  isConferenceParticipantHeld: boolean;
};

function getMainCadHold({
  currentTask,
  controls,
  isConsulted,
  isEpDnConsultedAgent,
  isInConference,
  isConsulting,
  customerPresent,
  mainCallMediaHeld,
  consultMediaHeld,
  isExplicitUnheldEvent,
  isExplicitHeldEvent,
  conferenceHoldKnown,
  isConferenceParticipantHeld,
}: MainCadHoldContext): boolean {
  const nestedConsultContext = Boolean(isConsulting && customerPresent);
  const isAgentNameConsulted = isConsulted && !isEpDnConsultedAgent;

  // EP/DN consulted agent: single mainCall leg; activeLeg stays "main" (never "consult").
  // mainCall.isHold = own leg parked (hide). !isHold + customer = customer on hold (show).
  if (isEpDnConsultedAgent) {
    if (mainCallMediaHeld) {
      return false;
    }
    return customerPresent;
  }

  // Consult leg parked — not customer/main on hold (wins over stale mainCall.isHold).
  if (consultMediaHeld) {
    return false;
  }

  if (mainCallMediaHeld) {
    return true;
  }

  // Agent-name consulted agent: activeLeg can lead media; activeLeg main without main hold = parked.
  if (isAgentNameConsulted) {
    if (controls?.activeLeg === 'main') {
      return false;
    }
    return Boolean(controls?.activeLeg === 'consult' && customerPresent);
  }

  // Initiator nested consult — activeLeg before mainCall isHold catches up.
  if (nestedConsultContext) {
    return Boolean(controls?.activeLeg === 'consult' && customerPresent);
  }

  // Plain conference hold — event type overrides stale conferenceHoldParticipant.
  if (isInConference) {
    if (isExplicitUnheldEvent) {
      return false;
    }
    if (isExplicitHeldEvent) {
      return true;
    }
    if (conferenceHoldKnown) {
      return isConferenceParticipantHeld;
    }
  }

  return isInteractionOnHold(currentTask);
}
