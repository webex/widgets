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
  conversationId: string;
  jwtToken: string;
  apiEndpoint: string;
  signalREndpoint: string;
  onError?: (error: unknown) => boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface ConversationData {
  id: string;
  status: string;
  timestamp: string;
}

export interface Message {
  id: string;
  content: string;
  conversationId: string;
  timestamp: string;
  type: 'sent' | 'received';
}
