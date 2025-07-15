import React from 'react';
import {ITask} from '@webex/plugin-cc';

export interface UseDigitalChannelsProps {
  currentTask: ITask;
  jwtToken: string;
  apiEndpoint: string;
  signalREndpoint: string;
  onError?: (error: unknown) => boolean;
  logger?: {
    log: (message: string, meta?: any) => void;
    error: (message: string, error?: any, meta?: any) => void;
  };
}

export interface DigitalChannelsProps {
  jwtToken: string;
  apiEndpoint: string;
  signalREndpoint: string;
  onError?: (error: unknown) => boolean;
}
