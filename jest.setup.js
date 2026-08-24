// Mock canvas methods to prevent errors in tests
// This is a workaround for the fact that JSDOM does not support canvas methods like getContext.
import 'jest-canvas-mock';

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

// Set up the global that cc-digital-interactions expects
global.AGENTX_SERVICE = {};

// Web components used in @momentum-design imports rely on browser-only APIs like attachInternals.
// Jest (via JSDOM) doesn't support these, causing runtime errors in tests.
// We mock these methods on HTMLElement to prevent test failures.
window.HTMLElement.prototype.attachInternals = function () {
  return {
    setValidity: () => {},
    checkValidity: () => true,
    reportValidity: () => true,
    setFormValue: () => {},
  };
};

// Mock scrollIntoView for TabList component
window.HTMLElement.prototype.scrollIntoView = function () {};

// Mock IntersectionObserver for infinite scroll tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver for TabList component
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};
