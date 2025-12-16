declare module '@webex/cc-digital-interactions' {
  import {ComponentType} from 'react';

  interface EngageProps {
    conversationId: string;
    jwtToken: string;
    dataCenter: string;
    onError?: (error: unknown) => boolean;
  }

  const Engage: ComponentType<EngageProps>;
  export default Engage;
}
