import { useEffect, useState, useCallback, useMemo } from 'react';
import { runInAction } from 'mobx';
import store from '@webex/cc-store';
import type { CallHistoryProps, CallRecord, GroupedCalls } from './call-history/call-history.types';

/**
 * Custom hook for CallHistory business logic
 * Handles call history fetching, grouping, filtering
 */
export function useCallHistory(props: CallHistoryProps) {
  // ========================================
  // LOCAL STATE
  // ========================================

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'missed'>(props.filter || 'all');

  // ========================================
  // STORE OBSERVABLES (READ)
  // ========================================

  // Note: In production, store should have call history data
  // populated by subscribing to TASK_* events
  // For now, using empty array as placeholder
  const storeCallHistory: CallRecord[] = [];

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // In production: Fetch call history from SDK or store
        // For now, using mock data structure
        // const history = await store.cc.getCallHistory?.() || [];

        // Using store data (populated by task events)
        setCallHistory(storeCallHistory);
      } catch (err) {
        const error = err as Error;
        setError(error);
        props.onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Subscribe to store updates for new calls
    // In production: listen to TASK_END, TASK_INCOMING events
    const cleanup = () => {
      // Unsubscribe from events
    };

    return cleanup;
  }, [storeCallHistory]);

  // ========================================
  // DATA PROCESSING
  // ========================================

  /**
   * Filter calls based on active filter
   */
  const filteredCalls = useMemo(() => {
    if (activeFilter === 'missed') {
      return callHistory.filter((call) => call.type === 'missed');
    }
    return callHistory;
  }, [callHistory, activeFilter]);

  /**
   * Group calls by contact/phone number
   */
  const groupedCalls = useMemo<GroupedCalls[]>(() => {
    const groups = new Map<string, GroupedCalls>();

    filteredCalls.forEach((call) => {
      const key = call.phoneNumber;

      if (!groups.has(key)) {
        // Create avatar initials from contact name
        const initials = call.contactName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        groups.set(key, {
          contactName: call.contactName,
          phoneNumber: call.phoneNumber,
          avatar: initials,
          callCount: 0,
          calls: [],
        });
      }

      const group = groups.get(key)!;
      group.callCount++;
      group.calls.push(call);
    });

    // Sort groups by most recent call
    return Array.from(groups.values()).sort((a, b) => {
      const aLatest = Math.max(...a.calls.map((c) => c.date.getTime()));
      const bLatest = Math.max(...b.calls.map((c) => c.date.getTime()));
      return bLatest - aLatest;
    });
  }, [filteredCalls]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle dial button click
   */
  const handleDial = useCallback(
    async (phoneNumber: string) => {
      try {
        // Call SDK startOutdial method
        // Note: startOutdial is available on the SDK instance
        if (store.cc && typeof (store.cc as any).startOutdial === 'function') {
          await (store.cc as any).startOutdial(phoneNumber, 'CallHistory');
        }

        // Notify parent component
        props.onDial?.(phoneNumber);
      } catch (err) {
        const error = err as Error;
        setError(error);
        props.onError?.(error);
      }
    },
    [props]
  );

  /**
   * Handle filter tab change
   */
  const handleFilterChange = useCallback((filter: 'all' | 'missed') => {
    setActiveFilter(filter);
  }, []);

  /**
   * Handle minimize/maximize toggle
   */
  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // ========================================
  // RETURN API
  // ========================================

  return {
    // State
    groupedCalls,
    isLoading,
    error,
    isMinimized,
    activeFilter,

    // Handlers
    handleDial,
    handleFilterChange,
    handleToggleMinimize,
  };
}

