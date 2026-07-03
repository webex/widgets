import React, {useMemo} from 'react';
import {Avatar, Text} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import {RealTimeTranscriptComponentProps} from '../task.types';
import './real-time-transcript.style.scss';

const formatSpeaker = (speaker?: string) => speaker || 'Unknown';
const EMPTY_TRANSCRIPT_MESSAGE = 'No live transcript available.';

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
          <Text className="real-time-transcript__empty" tagname="div" type="body-midsize-regular">
            {EMPTY_TRANSCRIPT_MESSAGE}
          </Text>
        ) : (
          <>
            {sortedEntries.map((entry) => (
              <React.Fragment key={entry.id}>
                {entry.event ? (
                  <Text
                    className="real-time-transcript__event"
                    data-testid="real-time-transcript:event"
                    tagname="div"
                    type="body-midsize-regular"
                  >
                    {entry.event}
                    {entry.displayTime ? (
                      <Text className="real-time-transcript__event-time" tagname="span" type="body-midsize-regular">
                        . {entry.displayTime}
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
                <div className="real-time-transcript__item" data-testid="real-time-transcript:item">
                  <div className="real-time-transcript__avatar-wrap">
                    <Avatar
                      className="real-time-transcript__avatar-fallback"
                      icon-name={entry.avatarUrl || entry.isCustomer ? undefined : 'placeholder-bold'}
                      src={entry.avatarUrl}
                      title={formatSpeaker(entry.speaker)}
                    >
                      {entry.initials || (entry.isCustomer ? 'CU' : 'YO')}
                    </Avatar>
                  </div>
                  <div className="real-time-transcript__text-block">
                    <div className="real-time-transcript__meta">
                      <Text tagname="span" type="body-large-bold">
                        {formatSpeaker(entry.speaker)}
                      </Text>
                      {entry.displayTime ? (
                        <Text className="real-time-transcript__time" tagname="span" type="body-midsize-regular">
                          {entry.displayTime}
                        </Text>
                      ) : null}
                    </div>
                    <Text className="real-time-transcript__message" tagname="p" type="body-large-regular">
                      {entry.message}
                    </Text>
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
