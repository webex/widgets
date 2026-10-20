import React from 'react';
import {Text} from '@momentum-design/components/dist/react';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import type {WellnessBreakHistoryEntry, WellnessBreakHistoryProps} from '../ai-assistant.types';
import WellnessBreakOfferCard from './wellness-break-offer-card';
import {
  WELLNESS_ACKNOWLEDGEMENT_COPY,
  WELLNESS_BLOCKED_ACKNOWLEDGEMENT_COPY,
  WELLNESS_NOTICE_COPY,
} from './wellness-break-copy';

const formatMessageTime = (createdAt: number): string =>
  new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit'}).format(createdAt);

const AssistantIcon: React.FC = () => (
  <span className="wellness-break-history__assistant-icon" aria-hidden="true">
    <CiscoAIAssistantColorIcon size={20} />
  </span>
);

const AssistantMessage: React.FC<{entry: Extract<WellnessBreakHistoryEntry, {type: 'acknowledgement' | 'notice'}>}> = ({
  entry,
}) => {
  const isCompletion = entry.type === 'notice' && entry.notice === 'completed';
  const text =
    entry.type === 'acknowledgement'
      ? entry.hasBlockingTasks
        ? WELLNESS_BLOCKED_ACKNOWLEDGEMENT_COPY
        : WELLNESS_ACKNOWLEDGEMENT_COPY
      : entry.notice === 'not-allowed' && entry.actionText?.trim()
        ? entry.actionText.trim()
        : WELLNESS_NOTICE_COPY[entry.notice];

  return (
    <section className="wellness-break-history__assistant-entry" data-testid={`wellness-break:history-${entry.type}`}>
      <div className="wellness-break-history__assistant-heading">
        <AssistantIcon />
        <Text tagname="h3" type="body-midsize-bold">
          {isCompletion ? 'Well-being break completed' : text}
        </Text>
      </div>
      {isCompletion ? (
        <div className="wellness-break-history__card">
          <Text tagname="p" type="body-small-regular">
            {text}
          </Text>
          <time dateTime={new Date(entry.createdAt).toISOString()}>{formatMessageTime(entry.createdAt)}</time>
        </div>
      ) : null}
    </section>
  );
};

const WellnessBreakHistory: React.FC<WellnessBreakHistoryProps> = ({entries, onAccept, onLater}) => (
  <div className="wellness-break-history" data-testid="wellness-break:history" aria-live="polite">
    {entries.map((entry) => {
      if (entry.type === 'offer') {
        return (
          <div className="wellness-break-history__offer" key={entry.id}>
            <AssistantIcon />
            <WellnessBreakOfferCard
              event={entry.event}
              disabled={!entry.actionable}
              showActions={entry.actionable}
              onAccept={onAccept}
              onLater={onLater}
            />
          </div>
        );
      }
      if (entry.type === 'user-action') {
        return (
          <Text
            key={entry.id}
            tagname="p"
            type="body-small-regular"
            className="wellness-break-history__user-action"
            data-testid="wellness-break:history-user-action"
          >
            {entry.action === 'later' ? 'Later' : 'Take a break'}
          </Text>
        );
      }
      return <AssistantMessage key={entry.id} entry={entry} />;
    })}
  </div>
);

export default WellnessBreakHistory;
