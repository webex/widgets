declare module '@webex/cc-digital-interactions' {
  export function initializeApp(dataCenter: string, jwtToken: string): Promise<void>;

  const Engage: React.ComponentType<{
    conversationId: string;
    jwtToken: string;
    dataCenter: string;
    onError?: (error: unknown) => boolean;
    key?: string;
  }>;
  export default Engage;
}
