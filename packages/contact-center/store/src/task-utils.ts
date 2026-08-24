import {EXCLUDED_PARTICIPANT_TYPES, RELATIONSHIP_TYPE_CONSULT} from './constants';
import {
  ConferenceParticipantDropRoster,
  ConferenceParticipantDropTarget,
  ConferenceParticipantDropType,
  ITask,
  MEDIA_TYPE_TELEPHONY_LOWER,
  Participant,
} from './store.types';

/**
 * Determines if a task is an incoming task
 * @param task - The task object
 * @returns Whether the task is incoming
 */
export const isIncomingTask = (task: ITask, agentId: string): boolean => {
  const taskData = task?.data;
  const taskState = taskData?.interaction?.state;
  const participants = taskData?.interaction?.participants;
  const hasJoined = agentId && participants?.[agentId]?.hasJoined;

  return (
    !taskData?.wrapUpRequired &&
    !hasJoined &&
    (taskState === 'new' || taskState === 'consult' || taskState === 'connected' || taskState === 'conference')
  );
};

/**
 * Checks if the current agent is a secondary agent in a consultation scenario.
 * Secondary agents are those who were consulted (not the original call owner).
 * @param {Object} task - The task object containing interaction details
 * @returns {boolean} True if this is a secondary agent (consulted party)
 */
export function isSecondaryAgent(task: ITask): boolean {
  const interaction = task?.data?.interaction;
  const callProcessingDetails = interaction?.callProcessingDetails;

  if (!callProcessingDetails) {
    return false;
  }

  return (
    callProcessingDetails.relationshipType === RELATIONSHIP_TYPE_CONSULT &&
    Boolean(callProcessingDetails.parentInteractionId) &&
    callProcessingDetails.parentInteractionId !== interaction?.interactionId
  );
}

/**
 * Checks if the current agent is a secondary EP-DN (Entry Point Dial Number) agent.
 * This is specifically for telephony consultations to external numbers/entry points.
 */
export function isSecondaryEpDnAgent(task: ITask): boolean {
  return task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER && isSecondaryAgent(task);
}

const isMainCallMedia = (mType: string | undefined): boolean => mType === 'mainCall' || mType === 'main';

/**
 * Resolves the main-call media leg for conference participant lookup.
 * During nested consult, task.data.interactionId can point at the consult leg;
 * conference participants remain on the mainCall media entry.
 */
const getMainCallMediaEntry = (task: ITask) => {
  const media = task?.data?.interaction?.media;
  if (!media) {
    return undefined;
  }

  const mainCallMediaId = findMediaResourceId(task, 'mainCall');
  if (mainCallMediaId && media[mainCallMediaId]) {
    return media[mainCallMediaId];
  }

  const typedMainCallMedia = Object.values(media).find((entry) => isMainCallMedia(entry.mType));
  if (typedMainCallMedia) {
    return typedMainCallMedia;
  }

  // Legacy payloads map interactionId directly to main-call media and may omit mType.
  const interactionMedia = task.data.interactionId ? media[task.data.interactionId] : undefined;
  if (interactionMedia && interactionMedia.mType !== 'consult') {
    return interactionMedia;
  }

  return undefined;
};

/**
 * Retrieves the list of active conference participants excluding the current agent
 * Filters out customers, supervisors, VVAs, and participants who have left
 *
 * @param task - The task object containing interaction data
 * @param agentId - The ID of the current agent to exclude from results
 * @returns Array of active agent participants in the conference
 */
export const getConferenceParticipants = (task: ITask, agentId: string): Participant[] => {
  const participantsList: Participant[] = [];

  if (!task?.data?.interaction?.media) {
    return participantsList;
  }

  // Consult-only child tasks (EP-DN) inherit parent data but are not conference members.
  if (isSecondaryAgent(task)) {
    return participantsList;
  }

  const mediaMainCall = getMainCallMediaEntry(task);
  const participantsInMainCall = new Set(mediaMainCall?.participants ?? []);

  // Nested consult during conference: consulted agent inherits parent interaction state
  // and mainCall media, but is only joined on the consult leg — not a conference member.
  if (agentId && !participantsInMainCall.has(agentId)) {
    return participantsList;
  }

  const participants = task.data.interaction.participants ?? {};

  if (participantsInMainCall.size > 0 && participants) {
    participantsInMainCall.forEach((participantId: string) => {
      const participant = participants[participantId];
      // Include only active agent participants (excluding current agent, customers, supervisors, and VVAs)
      if (
        participant &&
        !EXCLUDED_PARTICIPANT_TYPES.includes(participant.pType) &&
        !participant.hasLeft &&
        participant.id !== agentId
      ) {
        participantsList.push({
          id: participant.id,
          pType: participant.pType,
          name: participant.name ? participant.name : participant.id,
        });
      }
    });
  }

  return participantsList;
};

const TERMINAL_CONFERENCE_STATES = new Set(['ended', 'disconnected', 'terminated']);

type RosterTaskData = ITask['data'];
type RosterInteraction = RosterTaskData['interaction'];
type RosterParticipant = NonNullable<RosterInteraction['participants']>[string];
type RosterMedia = NonNullable<RosterInteraction['media']>[string];

type TaskWithStateSnapshot = ITask & {
  state?: {
    context?: {
      taskData?: RosterTaskData;
    };
  };
};

const normalizeParticipantType = (participantType?: string): string =>
  String(participantType || '')
    .trim()
    .toUpperCase()
    .replaceAll('_', '-');

const getParticipantTypeTokens = (participant: RosterParticipant): string[] =>
  [participant.pType, participant.type]
    .map((participantType) => normalizeParticipantType(participantType))
    .filter(Boolean);

const participantHasType = (participant: RosterParticipant, participantType: string): boolean =>
  getParticipantTypeTokens(participant).includes(participantType);

const hasVisibleControls = (controls: ITask['uiControls']['consult'] | undefined): boolean =>
  Boolean(controls && Object.values(controls).some((control) => control?.isVisible));

const hasActiveConsultSignal = (task: ITask): boolean => {
  const interactionState = task?.data?.interaction?.state?.toLowerCase();

  return Boolean(
    hasVisibleControls(task?.uiControls?.consult) ||
      task?.uiControls?.main?.endConsult?.isVisible ||
      ['consult', 'consulting'].includes(interactionState)
  );
};

const isViewingAgentActiveOnMainLeg = (task: ITask, mainParticipantIds: string[], agentId: string): boolean => {
  const participants = task?.data?.interaction?.participants ?? {};
  return mainParticipantIds.some((participantId) => {
    const participant = participants[participantId];

    if (!participant || participant.hasLeft || participant.hasJoined === false) {
      return false;
    }

    return participantId === agentId || participant.id === agentId;
  });
};

const isEligibleConference = (task: ITask, mainParticipantIds: string[], agentId: string): boolean => {
  const interaction = task?.data?.interaction;
  const interactionState = interaction?.state?.toLowerCase();
  const isTerminated = Boolean(interaction?.isTerminated || TERMINAL_CONFERENCE_STATES.has(interactionState));

  return Boolean(
    interaction?.mediaType?.toLowerCase() === MEDIA_TYPE_TELEPHONY_LOWER &&
      mainParticipantIds.length > 0 &&
      !isTerminated &&
      isViewingAgentActiveOnMainLeg(task, mainParticipantIds, agentId)
  );
};

const getMediaRecencyTimestamp = (media: Record<string, unknown>): number | undefined => {
  const candidateTimestamps = [
    media.lastUpdated,
    media.joinTimestamp,
    media.consultTimestamp,
    media.holdTimestamp,
    media.eventTime,
    media.createdAt,
  ];

  for (const value of candidateTimestamps) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return undefined;
};

const getMediaRecencyScore = (media: Record<string, unknown>, fallbackIndex: number): number =>
  getMediaRecencyTimestamp(media) ?? fallbackIndex;

type ConsultMediaEntry = {
  mediaId: string;
  media: RosterMedia;
  interaction: RosterInteraction;
  taskData: RosterTaskData;
  isConfiguredMedia: boolean;
  source: 'observable' | 'snapshot';
};

const getConsultMediaEntry = (
  taskData: RosterTaskData,
  source: ConsultMediaEntry['source']
): ConsultMediaEntry | undefined => {
  const interaction = taskData?.interaction;
  const configuredConsultMediaId = taskData?.consultMediaResourceId;
  const matchingMedia = Object.entries(interaction?.media ?? {}).filter(([, media]) => media.mType === 'consult');

  if (!interaction || matchingMedia.length === 0) {
    return undefined;
  }

  const configuredEntry = configuredConsultMediaId
    ? matchingMedia.find(
        ([mediaId, media]) => mediaId === configuredConsultMediaId || media.mediaResourceId === configuredConsultMediaId
      )
    : undefined;
  const [mediaId, media] =
    configuredEntry ??
    matchingMedia.reduce((latest, current, index) => {
      const latestScore = getMediaRecencyScore(latest[1] as Record<string, unknown>, index - 1);
      const currentScore = getMediaRecencyScore(current[1] as Record<string, unknown>, index);
      return currentScore >= latestScore ? current : latest;
    });

  return {
    mediaId: media.mediaResourceId || mediaId,
    media,
    interaction,
    taskData,
    isConfiguredMedia: Boolean(configuredEntry),
    source,
  };
};

const selectCurrentConsultMediaEntry = (
  current: ConsultMediaEntry,
  candidate: ConsultMediaEntry
): ConsultMediaEntry => {
  const currentTimestamp = getMediaRecencyTimestamp(current.media as Record<string, unknown>);
  const candidateTimestamp = getMediaRecencyTimestamp(candidate.media as Record<string, unknown>);

  if (current.mediaId === candidate.mediaId) {
    if (currentTimestamp !== undefined && candidateTimestamp !== undefined && candidateTimestamp > currentTimestamp) {
      return candidate;
    }

    // Preserve the existing observable-data behavior when both sources describe
    // the same leg and there is no positive evidence that the snapshot is newer.
    return current;
  }

  if (currentTimestamp !== candidateTimestamp) {
    if (currentTimestamp !== undefined && candidateTimestamp !== undefined) {
      return candidateTimestamp > currentTimestamp ? candidate : current;
    }

    if (current.isConfiguredMedia === candidate.isConfiguredMedia) {
      return candidateTimestamp !== undefined ? candidate : current;
    }
  }

  if (current.isConfiguredMedia !== candidate.isConfiguredMedia) {
    return candidate.isConfiguredMedia ? candidate : current;
  }

  // The state-machine context can advance before observable task hydration.
  // Prefer it when recency and current-media signals cannot distinguish the legs.
  return candidate.source === 'snapshot' ? candidate : current;
};

const getCurrentConsultMediaEntry = (task: ITask) => {
  const taskWithSnapshot = task as TaskWithStateSnapshot;
  const snapshotTaskData = taskWithSnapshot.state?.context?.taskData;

  if (!hasActiveConsultSignal(task)) {
    return undefined;
  }

  const candidates = [
    getConsultMediaEntry(task.data, 'observable'),
    snapshotTaskData ? getConsultMediaEntry(snapshotTaskData, 'snapshot') : undefined,
  ].filter((candidate): candidate is ConsultMediaEntry => Boolean(candidate));

  return candidates.length > 0 ? candidates.reduce(selectCurrentConsultMediaEntry) : undefined;
};

const hasActiveNonHeldConsult = (task: ITask): boolean => {
  const consultMedia = getCurrentConsultMediaEntry(task)?.media;

  // Treat an active consult without a hydrated media leg conservatively as non-held.
  // Drop becomes available again once the SDK explicitly reports that consult leg held.
  return Boolean(hasActiveConsultSignal(task) && consultMedia?.isHold !== true);
};

const getCustomerDropTargetId = (task: ITask): string => {
  const interaction = task?.data?.interaction;
  const direction = interaction?.contactDirection?.type?.toLowerCase();
  const callDetails = interaction?.callAssociatedDetails;
  const processingDetails = interaction?.callProcessingDetails;

  if (direction === 'inbound') {
    return callDetails?.ani || processingDetails?.ani || '';
  }

  if (direction === 'outbound') {
    return callDetails?.dnis || processingDetails?.dnis || '';
  }

  return '';
};

const getParticipantType = (
  normalizedType: string
): {participantType: ConferenceParticipantDropType; isSupervisor: boolean} | null => {
  if (normalizedType === 'AGENT') {
    return {participantType: 'Agent', isSupervisor: false};
  }

  if (['EP-DN', 'EPDN', 'DN'].includes(normalizedType)) {
    return {participantType: 'EP-DN', isSupervisor: false};
  }

  if (normalizedType === 'SUPERVISOR') {
    return {participantType: 'Supervisor', isSupervisor: true};
  }

  return null;
};

const getParticipantTypeDetails = (
  participant: RosterParticipant
): {participantType: ConferenceParticipantDropType; isSupervisor: boolean} | null => {
  for (const participantType of getParticipantTypeTokens(participant)) {
    const typeDetails = getParticipantType(participantType);

    if (typeDetails) {
      return typeDetails;
    }
  }

  return null;
};

const isEpDnConsultDestination = (destinationType?: string): boolean =>
  ['ENTRYPOINT', 'ENTRY-POINT', 'DIALNUMBER', 'DIAL-NUMBER', 'EP-DN', 'EPDN', 'DN'].includes(
    normalizeParticipantType(destinationType)
  );

const isTrueLike = (value: boolean | string | undefined): boolean =>
  value === true || String(value).toLowerCase() === 'true';

/**
 * Derives the owner-aware participant Drop roster from the active main-call media leg.
 * The viewing agent is never returned as a target and backend authorization remains authoritative.
 */
export const getConferenceParticipantDropRoster = (
  task: ITask,
  agentId: string
): ConferenceParticipantDropRoster | null => {
  const interaction = task?.data?.interaction;
  const mainCallMedia = getMainCallMediaEntry(task);
  const mainParticipantIds = mainCallMedia?.participants ?? [];

  if (!interaction || !isEligibleConference(task, mainParticipantIds, agentId) || isSecondaryAgent(task)) {
    return null;
  }

  const participants = interaction.participants ?? {};
  const mainParticipantIdSet = new Set(mainParticipantIds);

  const isOwner = interaction.owner === agentId;
  const participantRows: ConferenceParticipantDropTarget[] = [];
  const includedParticipantIds = new Set<string>();
  const currentConsult = getCurrentConsultMediaEntry(task);
  let hasActiveCustomer = false;

  mainParticipantIdSet.forEach((participantId) => {
    const participant = participants[participantId];

    if (!participant || participant.hasLeft || participant.hasJoined === false) {
      return;
    }

    const resolvedParticipantId = participant.id || participantId;
    if (participantHasType(participant, 'CUSTOMER')) {
      hasActiveCustomer = true;
      return;
    }

    if (participantId === agentId || resolvedParticipantId === agentId || participantHasType(participant, 'VVA')) {
      return;
    }

    const typeDetails = getParticipantTypeDetails(participant);

    if (!typeDetails) {
      return;
    }

    const {participantType, isSupervisor} = typeDetails;
    const displayName =
      participantType === 'EP-DN'
        ? participant.dn || resolvedParticipantId || participantId
        : participant.name || resolvedParticipantId || participantType;

    participantRows.push({
      participantType,
      displayName: String(displayName),
      dropTargetId: resolvedParticipantId,
      isPrimary: interaction.owner === participantId || interaction.owner === resolvedParticipantId,
      isReadOnly: !isOwner || isSupervisor,
      isDropDisabled: false,
      requiresConfirmation: false,
    });
    includedParticipantIds.add(participantId);
    includedParticipantIds.add(resolvedParticipantId);
  });

  const consultParticipantIds = currentConsult?.media.participants ?? [];
  const consultParticipants = currentConsult?.interaction.participants ?? participants;
  const pendingEpDnEntry = consultParticipantIds
    .map((participantId) => ({participantId, participant: consultParticipants[participantId]}))
    .find(({participantId, participant}) => {
      if (!participant || participant.hasLeft) {
        return false;
      }

      const resolvedParticipantId = participant.id || participantId;
      return (
        getParticipantTypeDetails(participant)?.participantType === 'EP-DN' &&
        participantId !== agentId &&
        resolvedParticipantId !== agentId
      );
    });
  const consultProcessingDetails = currentConsult?.interaction.callProcessingDetails;
  const rawDestinationAgentName = consultProcessingDetails?.consultDestinationAgentName;
  const destinationAgentJoined =
    isTrueLike(consultProcessingDetails?.consultDestinationAgentJoined) || Boolean(rawDestinationAgentName);
  const destinationAgentName = destinationAgentJoined ? rawDestinationAgentName : '';
  const answeredAgentEntries = consultParticipantIds
    .map((participantId) => ({participantId, participant: consultParticipants[participantId]}))
    .filter(({participantId, participant}) => {
      if (!participant || participant.hasLeft || participant.hasJoined === false) {
        return false;
      }

      const resolvedParticipantId = participant.id || participantId;
      return (
        getParticipantTypeDetails(participant)?.participantType === 'Agent' &&
        participantId !== agentId &&
        resolvedParticipantId !== agentId
      );
    });
  // A nested Entry Point consult can contain both the consulting conference
  // Agent and the newly answering Agent. Prefer the explicit destination, then
  // a consulted non-main participant, so the row never regresses to the caller.
  const answeredAgentEntry =
    answeredAgentEntries.find(({participant}) =>
      Boolean(destinationAgentName && participant?.name === destinationAgentName)
    ) ||
    answeredAgentEntries.find(({participantId, participant}) => {
      const resolvedParticipantId = participant?.id || participantId;
      return participant?.isConsulted === true && !mainParticipantIdSet.has(resolvedParticipantId);
    }) ||
    answeredAgentEntries.find(({participantId, participant}) => {
      const resolvedParticipantId = participant?.id || participantId;
      return !mainParticipantIdSet.has(participantId) && !mainParticipantIdSet.has(resolvedParticipantId);
    });
  const epDnConsultIsActive = Boolean(
    currentConsult &&
      (pendingEpDnEntry ||
        isEpDnConsultDestination(currentConsult.taskData.destinationType) ||
        isEpDnConsultDestination(task.data.destinationType))
  );

  if (epDnConsultIsActive) {
    const answeredAgent = answeredAgentEntry?.participant;
    const pendingEpDn = pendingEpDnEntry?.participant;
    const visibleParticipant = answeredAgent || pendingEpDn;
    const visibleParticipantId = answeredAgentEntry?.participantId || pendingEpDnEntry?.participantId;

    if (visibleParticipant && visibleParticipantId) {
      const resolvedParticipantId = visibleParticipant.id || visibleParticipantId;
      const answeredAgentAlreadyVisible = participantRows.some(
        (target) =>
          target.participantType === 'Agent' &&
          Boolean(destinationAgentName) &&
          target.displayName === destinationAgentName
      );

      if (
        !mainParticipantIdSet.has(visibleParticipantId) &&
        !includedParticipantIds.has(resolvedParticipantId) &&
        !answeredAgentAlreadyVisible
      ) {
        const participantType = answeredAgent ? 'Agent' : 'EP-DN';
        const displayName = answeredAgent
          ? answeredAgent.name || destinationAgentName || resolvedParticipantId
          : destinationAgentName || pendingEpDn?.dn || resolvedParticipantId || currentConsult.media.mediaResourceId;

        participantRows.push({
          participantType,
          displayName: String(displayName),
          dropTargetId: resolvedParticipantId,
          isPrimary: false,
          isReadOnly: !isOwner,
          isDropDisabled: true,
          requiresConfirmation: false,
        });
        includedParticipantIds.add(visibleParticipantId);
        includedParticipantIds.add(resolvedParticipantId);
      }
    }
  }

  const customerDropTargetId = hasActiveCustomer ? getCustomerDropTargetId(task) : '';
  const customer: ConferenceParticipantDropTarget | null = customerDropTargetId
    ? {
        participantType: 'Customer',
        displayName: customerDropTargetId,
        dropTargetId: customerDropTargetId,
        isPrimary: false,
        isReadOnly: !isOwner,
        isDropDisabled: false,
        requiresConfirmation: true,
      }
    : null;

  // Customer-only calls retain the original 1-to-1 UI. Any supported
  // non-customer row keeps the participant roster visible.
  if (participantRows.length === 0) {
    return null;
  }

  return {
    customer,
    participants: participantRows,
    isDropDisabled: hasActiveNonHeldConsult(task),
  };
};

export function isInteractionOnHold(task: ITask): boolean {
  if (!task || !task.data || !task.data.interaction) {
    return false;
  }
  const interaction = task.data.interaction;
  if (!interaction.media) {
    return false;
  }
  // Only check the main call media — consult hold is handled separately
  // in the consulting section UI. Without this filter, switching to
  // main call during a consult would incorrectly show the hold indicator
  // because the consult media has isHold: true.
  return Object.values(interaction.media).some((media) => media.mType === 'mainCall' && media.isHold);
}

export const setmTypeForEPDN = (task: ITask, mType: string) => {
  if (isSecondaryEpDnAgent(task)) {
    return 'mainCall';
  }

  return mType;
};
export const findMediaResourceId = (task: ITask, mType: string) => {
  if (!task?.data?.interaction?.media) {
    return '';
  }

  const matchingMedia = Object.values(task.data.interaction.media).filter((media) => media.mType === mType);

  if (matchingMedia.length === 0) {
    return '';
  }

  if (matchingMedia.length === 1) {
    return matchingMedia[0].mediaResourceId;
  }

  // In some consult flows, stale consult legs are retained in media. Prefer the
  // latest snapshot to avoid resolving an older consulted agent.
  const getMediaRecencyScore = (media: Record<string, unknown>, fallbackIndex: number): number => {
    const candidateTimestamps = [
      media.lastUpdated,
      media.joinTimestamp,
      media.consultTimestamp,
      media.holdTimestamp,
      media.eventTime,
      media.createdAt,
    ];

    for (const value of candidateTimestamps) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    // Fall back to the object traversal order if no timestamp exists.
    return fallbackIndex;
  };

  const latestMedia = matchingMedia.reduce((latest, media, index) => {
    const latestScore = getMediaRecencyScore(latest as Record<string, unknown>, index - 1);
    const currentScore = getMediaRecencyScore(media as Record<string, unknown>, index);
    return currentScore >= latestScore ? media : latest;
  });

  return latestMedia.mediaResourceId || '';
};

/**
 * Finds the hold timestamp for a specific media type (mainCall, consult, etc.)
 * Used for timer alignment in Consult & Conference scenarios to match Agent Desktop behavior.
 *
 * @param task - The task object containing interaction data
 * @param mType - The media type to search for ('mainCall', 'consult', 'conference')
 * @returns The hold timestamp in milliseconds or null if not on hold
 */
export const findHoldTimestamp = (task: ITask, mType: string): number | null => {
  const interaction = task?.data?.interaction;

  if (!interaction || !interaction.media) {
    return null;
  }

  // Adjust mType if agent is secondary EPDN agent
  mType = setmTypeForEPDN(task, mType);

  // Find media ID for the specified type (mainCall, consult, etc.)
  const mediaId = findMediaResourceId(task, mType);

  // Return the holdTimestamp if media exists and has a hold timestamp
  if (mediaId && interaction.media[mediaId]?.holdTimestamp !== undefined) {
    return interaction.media[mediaId].holdTimestamp;
  }

  return null;
};
