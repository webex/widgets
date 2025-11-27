import { CSSProperties } from 'react';

/**
 * Call record interface
 */
export interface CallRecord {
  id: string;
  contactName: string;
  phoneNumber: string;
  date: Date;
  type: 'incoming' | 'outgoing' | 'missed';
  duration: number;
}

/**
 * Grouped calls by contact
 */
export interface GroupedCalls {
  contactName: string;
  phoneNumber: string;
  avatar: string;
  callCount: number;
  calls: CallRecord[];
}

/**
 * Props for CallHistoryComponent
 */
export interface CallHistoryComponentProps {
  /**
   * Grouped call data
   */
  groupedCalls: GroupedCalls[];

  /**
   * Whether widget is minimized
   */
  isMinimized: boolean;

  /**
   * Active filter
   */
  activeFilter: 'all' | 'missed';

  /**
   * Callback when user clicks dial icon
   */
  onDial?: (phoneNumber: string) => void;

  /**
   * Callback when filter changes
   */
  onFilterChange?: (filter: 'all' | 'missed') => void;

  /**
   * Callback when minimize/maximize clicked
   */
  onToggleMinimize?: () => void;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Custom inline styles
   */
  customStyles?: CSSProperties;
}

