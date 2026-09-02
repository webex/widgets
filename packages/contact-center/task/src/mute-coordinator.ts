import {ITask} from '@webex/cc-store';
import store from '@webex/cc-store';
import {useCallControlProps} from './task.types';
import {TelephonyToastAction} from './wxapp-error.utils';

export type MuteCoordinatorCallbacks = {
  onToggleMute?: useCallControlProps['onToggleMute'];
  logger: useCallControlProps['logger'];
  showTelephonyToast: (error: unknown, action: TelephonyToastAction) => void;
};

export type EnqueueMuteToggleParams = {
  task: ITask;
  callbacks: MuteCoordinatorCallbacks;
};

// Single-flight mute coordinator — see enqueueMuteToggle below. Module-scoped (not a
// useRef/useState) because more than one useCallControl instance can be mounted against the
// same store singleton at once (e.g. CallControl plus CallControlCAD in the sample app); a
// per-instance ref would only serialize within one widget, letting a second widget's
// concurrent toggleMute() race the first and coalesce mute intent incorrectly.
let muteChain = Promise.resolve();
let muteGeneration = 0;
let pendingMuteTarget: boolean | null = null;
let activeMuteTarget: boolean | null = null;
let muteChainInFlight = false;
let muteTaskRef: ITask | null = null;
let muteCallbacksRef: MuteCoordinatorCallbacks | null = null;
let coordinatorInteractionId: string | null | undefined;

export const resetMuteCoordinator = (): void => {
  muteGeneration += 1;
  muteChain = Promise.resolve();
  pendingMuteTarget = null;
  activeMuteTarget = null;
  muteChainInFlight = false;
  muteTaskRef = null;
  muteCallbacksRef = null;
};

export const resetMuteCoordinatorForInteraction = (interactionId: string | undefined): void => {
  const next = interactionId ?? null;
  if (coordinatorInteractionId === next) {
    return;
  }
  coordinatorInteractionId = next;
  resetMuteCoordinator();
};

/** Test-only reset for module-level mute serialization state between Jest cases. */
export const resetMuteCoordinatorForTests = (): void => {
  coordinatorInteractionId = undefined;
  resetMuteCoordinator();
};

const isMuteCompletionStillValid = (interactionId: string | null | undefined): boolean => {
  if (!interactionId || muteTaskRef?.data?.interactionId !== interactionId) {
    return false;
  }

  return store.currentTask?.data?.interactionId === interactionId;
};

const invokeOnToggleMute = (
  callbacks: MuteCoordinatorCallbacks | null | undefined,
  payload: {isMuted: boolean; task: ITask},
  method: 'toggleMute' | 'toggleMuteCallback'
): void => {
  if (!callbacks?.onToggleMute) {
    return;
  }

  try {
    callbacks.onToggleMute(payload);
  } catch (error) {
    callbacks.logger.error(`onToggleMute callback failed: ${error}`, {
      module: 'useCallControl',
      method,
    });
  }
};

export const enqueueMuteToggle = ({task, callbacks}: EnqueueMuteToggleParams): Promise<void> => {
  const generation = muteGeneration;
  muteTaskRef = task;
  muteCallbacksRef = callbacks;

  if (muteChainInFlight) {
    const base = pendingMuteTarget ?? activeMuteTarget ?? !store.isMuted;
    pendingMuteTarget = !base;
  } else {
    pendingMuteTarget = !store.isMuted;
  }

  muteChain = muteChain
    .then(async () => {
      if (generation !== muteGeneration) {
        return;
      }

      muteChainInFlight = true;

      try {
        while (pendingMuteTarget !== null) {
          if (generation !== muteGeneration) {
            break;
          }

          const intendedMuteState = pendingMuteTarget;
          pendingMuteTarget = null;
          activeMuteTarget = intendedMuteState;

          const activeTask = muteTaskRef;
          const activeCallbacks = muteCallbacksRef;
          const interactionId = activeTask?.data?.interactionId;

          if (!activeTask) {
            break;
          }

          try {
            await activeTask.toggleMute({muted: intendedMuteState});

            if (!isMuteCompletionStillValid(interactionId)) {
              break;
            }

            store.setIsMuted(intendedMuteState);

            invokeOnToggleMute(activeCallbacks, {isMuted: intendedMuteState, task: activeTask}, 'toggleMuteCallback');

            activeCallbacks?.logger.info(`Mute state toggled to: ${intendedMuteState}`, {
              module: 'useCallControl',
              method: 'toggleMute',
            });
          } catch (error) {
            activeMuteTarget = null;

            if (!isMuteCompletionStillValid(interactionId)) {
              break;
            }

            activeCallbacks?.logger.error(`toggleMute failed: ${error}`, {
              module: 'useCallControl',
              method: 'toggleMute',
            });
            activeCallbacks?.showTelephonyToast(error, intendedMuteState ? 'mute' : 'unmute');

            invokeOnToggleMute(activeCallbacks, {isMuted: store.isMuted, task: activeTask}, 'toggleMuteCallback');
            break;
          }
        }
      } finally {
        if (generation === muteGeneration) {
          muteChainInFlight = false;
          activeMuteTarget = null;
        }
      }
    })
    .catch((error) => {
      muteCallbacksRef?.logger.error(`mute coordinator chain failed: ${error}`, {
        module: 'useCallControl',
        method: 'toggleMute',
      });
    });

  return muteChain;
};
