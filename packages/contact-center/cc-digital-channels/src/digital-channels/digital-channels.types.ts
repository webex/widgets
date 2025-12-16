import React from 'react';
import {ITask} from '@webex/cc-store';

export interface UseDigitalChannelsProps {
  currentTask: ITask;
  jwtToken: string;
  dataCenter: string;
  onError?: (error: unknown) => boolean;
  logger?: {
    log: (message: string, meta?: any) => void;
    error: (message: string, error?: any, meta?: any) => void;
  };
}

export interface DigitalChannelsProps {
  jwtToken: string;
  dataCenter: string;
  onError?: (error: unknown) => boolean;
}
