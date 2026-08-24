import {ConferenceParticipantDropTarget} from '@webex/cc-store';

export type ParticipantRosterSectionProps = {
  heading: 'Customer' | 'Participants';
  headingId: string;
  targets: ConferenceParticipantDropTarget[];
  pendingParticipantDropId: string | null;
  participantDropIsPending: boolean;
  rosterDropDisabled: boolean;
  onParticipantDropRequest: (target: ConferenceParticipantDropTarget, trigger: HTMLElement) => void;
};
