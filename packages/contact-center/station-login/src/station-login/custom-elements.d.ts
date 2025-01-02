// This is used to let know typescript that the custom element is available in the global scope.
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
    'uuip-wc-user-station-login': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        isModalOpen: boolean;
        userRoles:string;
        teams: string;
        defaultTeam: string;
        extensions: string;
        dialNumbers: string;
        loginVoiceOptions: string;
      };
    }
  }
}