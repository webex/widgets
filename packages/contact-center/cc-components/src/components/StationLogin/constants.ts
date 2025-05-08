// String consts
export const StationLoginLabels = {
  MULTIPLE_SIGN_IN_ALERT_MESSAGE:
    'You are signed in to the Desktop in multiple application instances. Click Continue to proceed with the Desktop in this application instance. Else, close this window.',
  MULTIPLE_SIGN_IN_ALERT_TITLE: 'Multiple Sign In Alert',
  CONTINUE: 'Continue',
  CANCEL: 'Cancel',
  SIGN_OUT: 'Sign Out',
  LOGOUT: 'Logout',
  SAVE_AND_CONTINUE: 'Save & Continue',
  CC_SIGN_OUT: 'Sign out of Contact Center',
  CC_SIGN_OUT_CONFIRM: 'Are you sure you want to sign out?',
  INTERACTION_PREFERENCES: 'Set your interaction preferences',
  HANDLE_CALLS: 'Handle calls using',
  HANDLE_CALLS_TOOLTIP:
    'This is your preferred method for receiving and making calls. Choose between your phone number, extension (if available), or your web browser.',
  YOUR_TEAM: 'Your Team',
  IS_REQUIRED: ' is required',
  DN_FORMAT_ERROR: 'Enter a valid US dial number. For help, reach out to your administrator or support team.',
};

// Utility consts
const DIALNUMBER: string = 'AGENT_DN';
const EXTENSION: string = 'EXTENSION';
const DESKTOP: string = 'BROWSER';

const LoginOptions: {[key: string]: string} = {
  [DIALNUMBER]: 'Dial Number',
  [EXTENSION]: 'Extension',
  [DESKTOP]: 'Desktop',
};

export {DIALNUMBER, EXTENSION, DESKTOP, LoginOptions};
