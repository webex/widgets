import {
  ConsultTransferDestinationControls,
  getDefaultUIControls,
  InteractionUIControls,
  TaskUIControls,
  TaskUILeg,
} from '@webex/cc-store';

const disabledControl = {isVisible: false, isEnabled: false};
const enabledControl = {isVisible: true, isEnabled: true};

/**
 * Creates a TaskUIControls mock for unit tests, merging overrides onto SDK defaults.
 */
export function createMockTaskUIControls(overrides?: {
  main?: Partial<InteractionUIControls>;
  consult?: Partial<InteractionUIControls>;
  activeLeg?: TaskUILeg;
  consultTransferDestinations?: Partial<ConsultTransferDestinationControls>;
}): TaskUIControls {
  const base = getDefaultUIControls();
  return {
    activeLeg: overrides?.activeLeg ?? base.activeLeg,
    main: {...base.main, ...overrides?.main},
    consult: {...base.consult, ...overrides?.consult},
    consultTransferDestinations: {
      consult:
        overrides?.consultTransferDestinations?.consult ??
        base.consultTransferDestinations.consult,
      transfer:
        overrides?.consultTransferDestinations?.transfer ??
        base.consultTransferDestinations.transfer,
    },
  };
}

/** All main-leg controls visible and enabled (typical connected-call test default). */
export function createEnabledMainTaskUIControls(
  overrides?: Partial<InteractionUIControls>,
  activeLeg: TaskUILeg = 'main'
): TaskUIControls {
  const main: InteractionUIControls = {
    accept: enabledControl,
    decline: enabledControl,
    hold: enabledControl,
    transfer: enabledControl,
    consult: enabledControl,
    end: enabledControl,
    mute: enabledControl,
    recording: enabledControl,
    wrapup: disabledControl,
    conference: disabledControl,
    exitConference: disabledControl,
    mergeToConference: disabledControl,
    consultTransfer: disabledControl,
    transferConference: disabledControl,
    endConsult: disabledControl,
    switch: disabledControl,
    ...overrides,
  };

  return createMockTaskUIControls({main, activeLeg});
}

export {disabledControl, enabledControl};
