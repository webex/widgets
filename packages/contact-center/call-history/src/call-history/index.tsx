import React from 'react';
import { observer } from 'mobx-react-lite';
import { ErrorBoundary } from 'react-error-boundary';
import { useCallHistory } from '../helper';
import { CallHistoryComponent } from '@webex/cc-components';
import type { CallHistoryProps } from './call-history.types';

/**
 * Internal CallHistory widget component (with observer HOC)
 * This is the smart/container component
 */
const CallHistoryInternal: React.FC<CallHistoryProps> = observer((props) => {
  const {
    className = '',
    customStyles,
    ...restProps
  } = props;

  // Use custom hook for business logic
  const {
    groupedCalls,
    isLoading,
    error,
    isMinimized,
    activeFilter,
    handleDial,
    handleFilterChange,
    handleToggleMinimize,
  } = useCallHistory(props);

  // Handle error state
  if (error) {
    return (
      <div className={`call-history call-history--error ${className}`} style={customStyles}>
        <div className="call-history__error-message">
          Error loading call history: {error.message}
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className={`call-history call-history--loading ${className}`} style={customStyles}>
        <div className="call-history__loader">Loading call history...</div>
      </div>
    );
  }

  // Render presentational component
  return (
    <CallHistoryComponent
      className={className}
      customStyles={customStyles}
      groupedCalls={groupedCalls}
      isMinimized={isMinimized}
      activeFilter={activeFilter}
      onDial={handleDial}
      onFilterChange={handleFilterChange}
      onToggleMinimize={handleToggleMinimize}
      {...restProps}
    />
  );
});

// Display name for debugging
CallHistoryInternal.displayName = 'CallHistoryInternal';

/**
 * CallHistory widget with error boundary
 * This is the public export
 */
const CallHistory: React.FC<CallHistoryProps> = (props) => (
  <ErrorBoundary
    fallback={
      <div className="call-history call-history--error">
        <div className="call-history__error-boundary">
          Something went wrong while loading call history. Please try again.
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('CallHistory Error:', error, errorInfo);
      props.onError?.(error);
    }}
  >
    <CallHistoryInternal {...props} />
  </ErrorBoundary>
);

// Display name for debugging
CallHistory.displayName = 'CallHistory';

export { CallHistory };
export type { CallHistoryProps };

