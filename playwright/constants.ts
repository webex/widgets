export const BASE_URL = 'http://localhost:3000';

export const USER_STATES = {
  MEETING: 'Meeting',
  AVAILABLE: 'Available',
  LUNCH: 'Lunch Break',
  RONA: 'RONA',
  ENGAGED: 'Engaged',
  AGENT_DECLINED: 'Agent_Declined',
};

export type userState = (typeof USER_STATES)[keyof typeof USER_STATES];

export const THEME_COLORS = {
  AVAILABLE: 'rgb(206, 245, 235)',
  MEETING: 'rgba(0, 0, 0, 0.11)',
  ENGAGED: 'rgb(255, 235, 194)',
  RONA: 'rgb(250, 233, 234)',
};

export type ThemeColor = (typeof THEME_COLORS)[keyof typeof THEME_COLORS];

export const LOGIN_MODE = {
  DESKTOP: 'Desktop',
  EXTENSION: 'Extension',
  DIAL_NUMBER: 'Dial Number',
};

export type LoginMode = (typeof LOGIN_MODE)[keyof typeof LOGIN_MODE];

export const LONG_WAIT = 40000;

// Universal timeout for all await operations in Playwright tests
export const AWAIT_TIMEOUT = 10000;

export const CALL_URL = 'https://web.webex.com/calling?calling';

export const TASK_TYPES = {
  CALL: 'Call',
  CHAT: 'Chat',
  EMAIL: 'Email',
  SOCIAL: 'Social',
};

export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];

export const CHAT_URL = 'https://v0-host-web-page.vercel.app';

export const WRAPUP_REASONS = {
  SALE: 'Sale',
  RESOLVED: 'Resolved',
};

export type WrapupReason = (typeof WRAPUP_REASONS)[keyof typeof WRAPUP_REASONS];

export const RONA_OPTIONS = {
  AVAILABLE: 'Available',
  IDLE: 'Idle',
};

export type RonaOption = (typeof RONA_OPTIONS)[keyof typeof RONA_OPTIONS];

export const AGENT_NAMES = {
  AGENT1: 'User11 Agent11',
  AGENT2: 'User13 Agent13',
};

export type AgentName = (typeof AGENT_NAMES)[keyof typeof AGENT_NAMES];

export const QUEUE_NAMES = {
  QUEUE_4: 'Queue 4',
};

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
