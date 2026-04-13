import React, {useMemo} from 'react';
import {Avatar} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import {RealTimeTranscriptComponentProps} from '../task.types';
import './real-time-transcript.style.scss';

const formatSpeaker = (speaker?: string) => speaker || 'Unknown';

const RealTimeTranscriptComponent: React.FC<RealTimeTranscriptComponentProps> = ({
  liveTranscriptEntries = [],
  className,
}) => {
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
      <div className="real-time-transcript__content" data-testid="real-time-transcript:live-content">
        {sortedEntries.length === 0 ? (
          <div className="real-time-transcript__empty">No live transcript available.</div>
        ) : (
          <>
            {sortedEntries.map((entry) => (
              <React.Fragment key={entry.id}>
                {entry.event ? (
                  <div className="real-time-transcript__event" data-testid="real-time-transcript:event">
                    {entry.event}
                    {entry.displayTime ? (
                      <span className="real-time-transcript__event-time">. {entry.displayTime}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="real-time-transcript__item" data-testid="real-time-transcript:item">
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
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </section>
  );
};

const RealTimeTranscriptComponentWithMetrics = withMetrics(RealTimeTranscriptComponent, 'RealTimeTranscript');

export default RealTimeTranscriptComponentWithMetrics;
