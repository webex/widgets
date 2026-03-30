import React, {useMemo} from 'react';
import {Avatar} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import {RealtimeTranscriptComponentProps} from '../task.types';
import './real-time-transcripts.style.scss';

const formatSpeaker = (speaker?: string) => speaker || 'Unknown';

const RealTimeTranscriptComponent: React.FC<RealtimeTranscriptComponentProps> = ({
  ivrTranscript = '',
  liveTranscriptEntries = [],
  activeTab = 'live',
  onTabChange,
  className,
}) => {
  console.log('pkesari_from component liveTranscriptEntries', liveTranscriptEntries);
  const sortedEntries = useMemo(
    () =>
      [...liveTranscriptEntries].sort((a, b) => {
        if (a.timestamp === b.timestamp) return 0;
        return a.timestamp > b.timestamp ? 1 : -1;
      }),
    [liveTranscriptEntries]
  );

  return (
    <section className={`real-time-transcript ${className || ''}`.trim()} data-testid="real-time-transcript:root">
      <div className="real-time-transcript__tabs" role="tablist" aria-label="Conversation transcript tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'live'}
          className={`real-time-transcript__tab ${activeTab === 'live' ? 'real-time-transcript__tab--active' : ''}`.trim()}
          onClick={() => onTabChange?.('live')}
          data-testid="real-time-transcript:live-tab"
        >
          Live transcript
        </button>
      </div>

      {activeTab === 'ivr' ? (
        <div className="real-time-transcript__empty" data-testid="real-time-transcript:ivr-content">
          {ivrTranscript || 'No IVR transcript available.'}
        </div>
      ) : (
        <div className="real-time-transcript__content" data-testid="real-time-transcript:live-content">
          {sortedEntries.length === 0 ? (
            <div className="real-time-transcript__empty">No live transcript available.</div>
          ) : (
            <>
              {sortedEntries[0].event ? (
                <div className="real-time-transcript__event" data-testid="real-time-transcript:first-event">
                  {sortedEntries[0].event}
                </div>
              ) : null}
              {sortedEntries.map((entry) => (
                <div key={entry.id} className="real-time-transcript__item" data-testid="real-time-transcript:item">
                  <div className="real-time-transcript__avatar-wrap">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={formatSpeaker(entry.speaker)}
                        className="real-time-transcript__avatar-image"
                      />
                    ) : (
                      <Avatar
                        className="real-time-transcript__avatar-fallback"
                        icon-name={entry.isCustomer ? undefined : 'placeholder-bold'}
                        title={formatSpeaker(entry.speaker)}
                      >
                        {entry.initials || (entry.isCustomer ? 'CU' : 'YO')}
                      </Avatar>
                    )}
                  </div>
                  <div className="real-time-transcript__text-block">
                    <div className="real-time-transcript__meta">
                      <span>{formatSpeaker(entry.speaker)}</span>
                      {entry.displayTime ? (
                        <span className="real-time-transcript__time">{entry.displayTime}</span>
                      ) : null}
                    </div>
                    <p className="real-time-transcript__message">{entry.message}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
};

const RealTimeTranscriptComponentWithMetrics = withMetrics(RealTimeTranscriptComponent, 'RealTimeTranscript');

export default RealTimeTranscriptComponentWithMetrics;
