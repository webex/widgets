// Mock canvas methods to prevent errors in tests
// This is a workaround for the fact that JSDOM does not support canvas methods like getContext.
import 'jest-canvas-mock';

// Webpack's browser-relative lazy chunks derive their base URL from the
// currently loaded script. JSDOM does not create one, so provide the same
// minimal browser invariant for tests that import built workspace packages.
const webpackEntryScript = document.createElement('script');
webpackEntryScript.src = 'http://localhost/index.js';
document.head.appendChild(webpackEntryScript);

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
  VOICE_CONNECTION_EVENTS: {STATE_CHANGE: 'voice:connectionStateChange'},
  VOICE_CONNECTION_STATUS: {READY: 'ready', UNAVAILABLE: 'unavailable', NOT_REQUIRED: 'not-required'},
  VoiceLineStatus: {
    UNKNOWN: 'unknown',
    CONNECTING: 'connecting',
    REGISTERED: 'registered',
    RECONNECTING: 'reconnecting',
    RECONNECTED: 'reconnected',
    UNREGISTERED: 'unregistered',
    ERROR: 'error',
  },
  VoiceMobiusSocketStatus: {
    UNKNOWN: 'unknown',
    NOT_IN_USE: 'not-in-use',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
  },
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
