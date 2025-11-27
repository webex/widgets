import React from 'react';
import { Icon } from '@momentum-design/components/dist/react';
import { ButtonCircle, AvatarNext } from '@momentum-ui/react-collaboration';
import type { CallHistoryComponentProps } from './call-history.types';
import './call-history.scss';

/**
 * CallHistoryComponent - Pure presentational component
 * Displays grouped call history with tabs and dial functionality
 */
export const CallHistoryComponent: React.FC<CallHistoryComponentProps> = (props) => {
  const {
    groupedCalls,
    isMinimized,
    activeFilter,
    onDial,
    onFilterChange,
    onToggleMinimize,
    className = '',
    customStyles,
  } = props;

  /**
   * Format call duration for display
   */
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return 'Missed';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  /**
   * Format call type for display
   */
  const formatType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div
      className={`call-history ${isMinimized ? 'call-history--minimized' : ''} ${className}`}
      style={customStyles}
    >
      {/* Header */}
      <div className="call-history__header">
        <h2 className="call-history__title">Calls</h2>
        <button
          className="call-history__minimize-btn"
          onClick={onToggleMinimize}
          aria-label={isMinimized ? 'Maximize' : 'Minimize'}
        >
          <Icon name={isMinimized ? 'arrow-up-bold' : 'arrow-down-bold'} />
        </button>
      </div>

      {/* Content (hidden when minimized) */}
      {!isMinimized && (
        <div className="call-history__content">
          {/* Filter Tabs */}
          <div className="call-history__tabs">
            <button
              className={`call-history__tab ${activeFilter === 'all' ? 'call-history__tab--active' : ''}`}
              onClick={() => onFilterChange?.('all')}
              aria-label="Show all calls"
            >
              All
            </button>
            <button
              className={`call-history__tab ${activeFilter === 'missed' ? 'call-history__tab--active' : ''}`}
              onClick={() => onFilterChange?.('missed')}
              aria-label="Show missed calls only"
            >
              Missed
            </button>
          </div>

          {/* Call List */}
          <div className="call-history__list">
            {groupedCalls.length === 0 ? (
              <div className="call-history__empty">
                <p>No call history available</p>
              </div>
            ) : (
              groupedCalls.map((group) => (
                <div key={group.phoneNumber} className="call-history__contact-group">
                  {/* Contact Header */}
                  <div className="call-history__contact-header">
                    <AvatarNext
                      initials={group.avatar}
                      size={48}
                      className="call-history__avatar"
                    />
                    <div className="call-history__contact-info">
                      <div className="call-history__contact-name">
                        <span className="call-history__contact-name-text">{group.contactName}</span>
                        <span className="call-history__call-count">({group.callCount})</span>
                      </div>
                      <div className="call-history__phone-number">
                        Work: {group.phoneNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => onDial?.(group.phoneNumber)}
                      aria-label={`Dial ${group.phoneNumber}`}
                      className="call-history__dial-button"
                      title={`Dial ${group.phoneNumber}`}
                    >
                      <Icon name="handset-filled" style={{ color: 'var(--mds-color-theme-text-success-normal)' }} />
                    </button>
                  </div>

                  {/* Call Details */}
                  <div className="call-history__call-details">
                    {group.calls.map((call) => (
                      <div key={call.id} className="call-history__call-item">
                        <div className="call-history__call-info">
                          <span className="call-history__call-date">{formatDate(call.date)}</span>
                          <span className="call-history__call-type">{formatType(call.type)}</span>
                          <span
                            className={`call-history__call-duration ${
                              call.type === 'missed' ? 'call-history__call-duration--missed' : ''
                            }`}
                          >
                            {formatDuration(call.duration)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Display name
CallHistoryComponent.displayName = 'CallHistoryComponent';

