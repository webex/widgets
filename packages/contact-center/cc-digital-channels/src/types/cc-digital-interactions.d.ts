// Override @webex/cc-digital-interactions types to match runtime behavior
declare module '@webex/cc-digital-interactions' {
  import {FunctionComponent} from 'react';

  export interface AppProps {
    conversationId: string;
    jwtToken: string;
    dataCenter: string;
    onError?: (error: unknown) => boolean;
    readonly?: boolean;
    isVisualRebrand?: boolean;
    theme?: string;
    interactionId?: string;
    key?: string;
  }

  export const initializeApp: (dataCenter: string, jwtToken: string) => Promise<void>;

  const Engage: FunctionComponent<AppProps>;
  export default Engage;
}
