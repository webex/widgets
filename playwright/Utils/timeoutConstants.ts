/**
 * Timeout constants for Playwright actions to ensure consistent timing across all test utilities.
 * These values are optimized for reliable test execution while providing fast feedback on failures.
 */

// Basic interaction timeouts
export const TIMEOUT_CONSTANTS = {
  // Quick actions (click, check, uncheck)
  CLICK: 10000,
  CHECK: 10000,

  // Form interactions (fill, type, press)
  FILL: 10000,
  TYPE: 10000,
  PRESS: 10000,

  // Visual interactions
  HOVER: 15000,

  // Wait operations
  WAIT_VISIBLE: 10000,
  WAIT_HIDDEN: 10000,

  // State transitions (longer timeout for system responses)
  STATE_TRANSITION: 30000,
  PAGE_LOAD: 30000,

  // Specific timeouts for different contexts
  EXTENSION_CALL: 40000,
  CHAT_IFRAME_LOAD: 60000,
  LOGIN_FORM: 20000,
  LOGOUT_VERIFICATION: 30000,

  // Short timeouts for quick checks
  QUICK_CHECK: 5000,
  IMMEDIATE_CHECK: 2000,

  // Wrapup and task operations
  WRAPUP_OPERATION: 5000,
  TASK_OPERATION: 5000,

  // Widget initialization
  WIDGET_INIT: 30000,
} as const;

// Type for timeout keys
export type TimeoutKey = keyof typeof TIMEOUT_CONSTANTS;
