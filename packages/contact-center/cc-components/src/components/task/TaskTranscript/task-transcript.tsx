import React, {useMemo} from 'react';
import {Avatar} from '@momentum-design/components/dist/react';
import {withMetrics} from '@webex/cc-ui-logging';
import {TaskTranscriptComponentProps} from '../task.types';
import './styles.scss';

const formatSpeaker = (speaker?: string) => speaker || 'Unknown';

const TaskTranscriptComponent: React.FC<TaskTranscriptComponentProps> = ({
  ivrTranscript = '',
  liveTranscriptEntries = [],
  activeTab = 'live',
  onTabChange,
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
    <section className={`task-transcript ${className || ''}`.trim()} data-testid="task-transcript:root">
      <div className="task-transcript__tabs" role="tablist" aria-label="Conversation transcript tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ivr'}
          className={`task-transcript__tab ${activeTab === 'ivr' ? 'task-transcript__tab--active' : ''}`.trim()}
          onClick={() => onTabChange?.('ivr')}
          data-testid="task-transcript:ivr-tab"
        >
          IVR transcript
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'live'}
          className={`task-transcript__tab ${activeTab === 'live' ? 'task-transcript__tab--active' : ''}`.trim()}
          onClick={() => onTabChange?.('live')}
          data-testid="task-transcript:live-tab"
        >
          Live transcript
        </button>
      </div>

      {activeTab === 'ivr' ? (
        <div className="task-transcript__empty" data-testid="task-transcript:ivr-content">
          {ivrTranscript || 'No IVR transcript available.'}
        </div>
      ) : (
        <div className="task-transcript__content" data-testid="task-transcript:live-content">
          {sortedEntries.length === 0 ? (
            <div className="task-transcript__empty">No live transcript available.</div>
          ) : (
            <>
              {sortedEntries[0].event ? (
                <div className="task-transcript__event" data-testid="task-transcript:first-event">
                  {sortedEntries[0].event}
                </div>
              ) : null}
              {sortedEntries.map((entry) => (
                <div key={entry.id} className="task-transcript__item" data-testid="task-transcript:item">
                  <div className="task-transcript__avatar-wrap">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={formatSpeaker(entry.speaker)} className="task-transcript__avatar-image" />
                    ) : (
                      <Avatar
                        className="task-transcript__avatar-fallback"
                        icon-name={entry.isCustomer ? undefined : 'placeholder-bold'}
                        title={formatSpeaker(entry.speaker)}
                      >
                        {entry.initials || (entry.isCustomer ? 'CU' : 'YO')}
                      </Avatar>
                    )}
                  </div>
                  <div className="task-transcript__text-block">
                    <div className="task-transcript__meta">
                      <span>{formatSpeaker(entry.speaker)}</span>
                      {entry.displayTime ? <span className="task-transcript__time">{entry.displayTime}</span> : null}
                    </div>
                    <p className="task-transcript__message">{entry.message}</p>
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

const TaskTranscriptComponentWithMetrics = withMetrics(TaskTranscriptComponent, 'TaskTranscript');

export default TaskTranscriptComponentWithMetrics;
