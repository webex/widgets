export type CampaignErrorType = 'ACCEPT_FAILED' | 'SKIP_FAILED' | 'REMOVE_FAILED';

export interface CampaignErrorDialogProps {
  errorType: CampaignErrorType;
  isOpen: boolean;
  onClose: () => void;
}

export const ERROR_TITLES: Record<CampaignErrorType, string> = {
  ACCEPT_FAILED: "Can't accept contact",
  SKIP_FAILED: "Can't skip contact",
  REMOVE_FAILED: "Can't remove contact",
};

export const ERROR_MESSAGE =
  'We ran into an issue connecting you with this contact. Check your network connection and try again.';
