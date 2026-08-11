export interface E911ModalProps {
  isOpen: boolean;
  onSaveAndContinue: () => Promise<void>;
  onCancel: () => void;
}
