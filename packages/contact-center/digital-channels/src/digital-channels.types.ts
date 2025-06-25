export interface IDigitalChannelsProps {
  conversationId: string;
  jwtToken: string;
  apiEndpoint: string;
  signalREndpoint: string;
  onError: (error: Error | unknown) => boolean;
}
