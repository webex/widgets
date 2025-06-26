export interface IDigitalChannelsProps {
  jwtToken: string;
  apiEndpoint: string;
  signalREndpoint: string;
  onError: (error: Error | unknown) => boolean;
}
