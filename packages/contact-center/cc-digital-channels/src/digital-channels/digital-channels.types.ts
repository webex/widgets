import {ITask} from '@webex/cc-store';

export interface DigitalChannelsInitHookProps {
  currentTask: ITask;
  jwtToken: string;
  dataCenter: string;
  logger: {
    log: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, error?: unknown, meta?: Record<string, unknown>) => void;
  };
  isDigitalChannelsInitialized: boolean;
  setDigitalChannelsInitialized: (value: boolean) => void;
  skipInit?: boolean;
}

export interface DigitalChannelsDataHookProps {
  getAccessToken: () => Promise<string>;
  currentTask: ITask | null;
  logger?: {
    log: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
}

export interface DigitalChannelsProps {
  currentTheme?: string;
}

export interface DigitalChannelsComponentProps {
  conversationId: string;
  jwtToken: string;
  dataCenter: string;
  currentTheme?: string;
}
