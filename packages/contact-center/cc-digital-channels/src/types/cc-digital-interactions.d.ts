declare module '@webex/cc-digital-interactions' {
  export function initializeApp(dataCenter: string, jwtToken: string): Promise<void>;

  const Engage: any;
  export default Engage;
}
