import {ITask} from '@webex/cc-store';

export interface UseDigitalChannelsInitProps {
  currentTask: ITask;
  jwtToken: string;
  dataCenter: string;
  onError?: (error: unknown) => boolean;
  logger: {
    log: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, error?: unknown, meta?: Record<string, unknown>) => void;
  };
  isDigitalChannelsInitialized: boolean;
  setDigitalChannelsInitialized: (value: boolean) => void;
}

export interface UseDigitalChannelsProps {
  currentTask: ITask;
  jwtToken: string;
  dataCenter: string;
  onError?: (error: unknown) => boolean;
  logger?: {
    log: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, error?: unknown, meta?: Record<string, unknown>) => void;
  };
}

export interface DigitalChannelsProps {
  jwtToken: string;
  dataCenter: string;
  onError?: (error: unknown) => boolean;
}
