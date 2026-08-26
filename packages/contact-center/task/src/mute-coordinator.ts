import {ITask} from '@webex/contact-center';
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
let pendingMuteTarget: boolean | null = null;
let activeMuteTarget: boolean | null = null;
let muteChainInFlight = false;
let muteTaskRef: ITask | null = null;
let muteCallbacksRef: MuteCoordinatorCallbacks | null = null;

export const resetMuteCoordinator = (): void => {
  muteChain = Promise.resolve();
  pendingMuteTarget = null;
  activeMuteTarget = null;
  muteChainInFlight = false;
  muteTaskRef = null;
  muteCallbacksRef = null;
};

/** Test-only reset for module-level mute serialization state. */
export const resetMuteCoordinatorForTests = resetMuteCoordinator;

export const enqueueMuteToggle = ({task, callbacks}: EnqueueMuteToggleParams): Promise<void> => {
  muteTaskRef = task;
  muteCallbacksRef = callbacks;

  if (muteChainInFlight) {
    const base = pendingMuteTarget ?? activeMuteTarget ?? !store.isMuted;
    pendingMuteTarget = !base;
  } else {
    pendingMuteTarget = !store.isMuted;
  }

  muteChain = muteChain.then(async () => {
    muteChainInFlight = true;

    try {
      while (pendingMuteTarget !== null) {
        const intendedMuteState = pendingMuteTarget;
        pendingMuteTarget = null;
        activeMuteTarget = intendedMuteState;

        const activeTask = muteTaskRef;
        const activeCallbacks = muteCallbacksRef;

        if (!activeTask) {
          break;
        }

        try {
          await activeTask.toggleMute({muted: intendedMuteState});

          store.setIsMuted(intendedMuteState);

          if (activeCallbacks?.onToggleMute) {
            activeCallbacks.onToggleMute({
              isMuted: intendedMuteState,
              task: activeTask,
            });
          }

          activeCallbacks?.logger.info(`Mute state toggled to: ${intendedMuteState}`, {
            module: 'useCallControl',
            method: 'toggleMute',
          });
        } catch (error) {
          activeMuteTarget = null;
          activeCallbacks?.logger.error(`toggleMute failed: ${error}`, {
            module: 'useCallControl',
            method: 'toggleMute',
          });
          activeCallbacks?.showTelephonyToast(error, intendedMuteState ? 'mute' : 'unmute');

          if (activeCallbacks?.onToggleMute) {
            activeCallbacks.onToggleMute({
              isMuted: store.isMuted,
              task: activeTask,
            });
          }
          break;
        }
      }
    } finally {
      muteChainInFlight = false;
      activeMuteTarget = null;
    }
  });

  return muteChain;
};
