import { CallHistory } from './call-history';
import { withMetrics } from '@webex/cc-ui-logging';

/**
 * CallHistory wrapped with metrics tracking
 * Automatically logs:
 * - WIDGET_MOUNTED
 * - WIDGET_UNMOUNTED
 * - Errors (if onError not handled)
 */
const CallHistoryWithMetrics = withMetrics(CallHistory, 'CallHistory');

// Export with metrics wrapper
export { CallHistoryWithMetrics as CallHistory };

// Export types
export type { CallHistoryProps, CallRecord, GroupedCalls } from './call-history/call-history.types';

