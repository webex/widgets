/* global jest */

const createEnumProxy = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => String(prop),
    }
  );

jest.mock('@webex/contact-center', () => ({
  init: jest.fn(() => ({
    once: jest.fn(),
    cc: {},
  })),
  TASK_EVENTS: createEnumProxy(),
  CC_EVENTS: createEnumProxy(),
  WELLNESS_BREAK_NOTIFICATION_ACTIONS: {
    PROVIDE_WELLNESS_BREAK: 'PROVIDE_WELLNESS_BREAK',
    SUGGEST_WELLNESS_BREAK: 'SUGGEST_WELLNESS_BREAK',
    WELLNESS_BREAK_NOT_ALLOWED: 'WELLNESS_BREAK_NOT_ALLOWED',
  },
  WELLNESS_BREAK_USER_ACTIONS: {
    REQUESTED: 'REQUESTED',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    NO_RESPONSE: 'NO_RESPONSE',
  },
  getDefaultUIControls: () => ({
    activeLeg: 'main',
    main: {},
    consult: {},
    consultTransferDestinations: {
      consult: [],
      transfer: [],
    },
  }),
}));
