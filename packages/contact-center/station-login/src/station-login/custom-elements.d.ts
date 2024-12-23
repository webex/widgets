// This is used to let know typescript that the custom element is available in the global scope.
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'uuip-wc-user-profile': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        getProfileDataTriggered: boolean;
        userRole: string;
        preferenceRoleName: string;
        isCallMonitoringEnabled: boolean;
        teams: string[];
        defaultTeam: any;
        loginVoiceOptions: string[];
        trackingId: string;
        extensions: string;
        extensionErrorCases: string;
        defaultDn: string;
        allowDefaultDnOverwrite: boolean;
      };
    }
  }
}