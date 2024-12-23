// This is used to let know typescript that the custom element is available in the global scope.
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
    'uuip-wc-user-station-login': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        isModalOpen: boolean;
        isRememberMeChecked: boolean;
        isSubmitBusy: boolean;
        isDesktopEmergencyNotificationEnabled: boolean;
        isEmergencyNotificationAlreadyDisplayed: boolean;
        userRoles: string[];
        teams: { teamId: string; teamName: string }[];
        defaultTeam: { teamId: string; teamName: string };
        extensions: string[];
        isCallMonitoringEnabled: boolean;
        dialNumbers: string[];
        defaultDialNumber: string;
        loginVoiceOptions: string[];
        preferenceRoleName: string;
        'signout-clicked': () => void;
        'confirm-clicked': (e: Event) => void;
      };
    }
  }
}