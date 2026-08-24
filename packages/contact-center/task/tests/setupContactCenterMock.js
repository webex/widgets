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
