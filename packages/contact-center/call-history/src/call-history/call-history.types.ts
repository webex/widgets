/**
 * Props for CallHistory widget
 */
export interface CallHistoryProps {
  /**
   * Filter to apply to call history
   * @default 'all'
   */
  filter?: 'all' | 'missed';

  /**
   * Callback when user clicks dial icon
   * @param phoneNumber - Phone number to dial
   */
  onDial?: (phoneNumber: string) => void;

  /**
   * Callback when error occurs
   * @param error - Error object
   */
  onError?: (error: Error) => void;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Custom inline styles
   */
  customStyles?: React.CSSProperties;
}

/**
 * Individual call record
 */
export interface CallRecord {
  /**
   * Unique identifier for the call
   */
  id: string;

  /**
   * Contact name
   */
  contactName: string;

  /**
   * Phone number
   */
  phoneNumber: string;

  /**
   * Call date/time
   */
  date: Date;

  /**
   * Call type
   */
  type: 'incoming' | 'outgoing' | 'missed';

  /**
   * Call duration in seconds
   */
  duration: number;
}

/**
 * Grouped calls by contact
 */
export interface GroupedCalls {
  /**
   * Contact name
   */
  contactName: string;

  /**
   * Contact phone number
   */
  phoneNumber: string;

  /**
   * Avatar initials or URL
   */
  avatar: string;

  /**
   * Total number of calls with this contact
   */
  callCount: number;

  /**
   * List of calls with this contact
   */
  calls: CallRecord[];
}

