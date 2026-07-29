import React, {useEffect, useRef} from 'react';
import {Button, Input, Spinner, Text} from '@momentum-design/components/dist/react';
import AdaptiveCardRenderer from '../AdaptiveCardRenderer/adaptive-card-renderer';
import {extractCustomerStatementTitle} from '../AdaptiveCardRenderer/adaptive-card-renderer.utils';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import {RealTimeAssistProps} from '../ai-assistant.types';
import {EMPTY_TITLE, GET_ASSISTANCE_LABEL, LISTENING_TEXT, REQUEST_FAILED_TEXT, REQUESTING_TEXT} from '../constants';

const AssistantIcon: React.FC = () => (
  <span className="ai-assistant__assistant-icon" aria-hidden="true">
    <CiscoAIAssistantColorIcon size={20} />
  </span>
);

const ListeningStatus: React.FC = () => (
  <div className="ai-assistant__chat-listening" data-testid="ai-assistant:listening">
    <span className="ai-assistant__chat-listening-dots" aria-hidden="true">
      <span className="ai-assistant__chat-listening-dot" />
      <span className="ai-assistant__chat-listening-dot" />
      <span className="ai-assistant__chat-listening-dot" />
    </span>
    <Text tagname="span" type="body-midsize-regular">
      {LISTENING_TEXT}
    </Text>
  </div>
);

const RealTimeAssist: React.FC<RealTimeAssistProps> = ({
  status,
  errorMessage,
  chatEntries,
  contextDraft,
  onRequestRealTimeAssist,
  onContextDraftChange,
  onSubmitContext,
  hasInitialRequestSucceeded,
  onRealTimeAssistAction,
  logger,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the chat list to the bottom whenever a new entry lands.
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [chatEntries.length, status]);

  const handleContextSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contextDraft.trim()) return;
    onSubmitContext();
  };

  const content = (() => {
    if (!hasInitialRequestSucceeded) {
      return (
        <div className="ai-assistant__body-empty" data-testid="ai-assistant:empty">
          <Text tagname="h3" type="body-large-bold">
            {EMPTY_TITLE}
          </Text>
          {status === 'listening' ? (
            <Spinner size="small" role="status" aria-label={REQUESTING_TEXT} data-testid="ai-assistant:requesting" />
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="ai-assistant__pill-button"
              onClick={() => onRequestRealTimeAssist()}
              data-testid="ai-assistant:get-suggestions"
            >
              {GET_ASSISTANCE_LABEL}
            </Button>
          )}
          {status === 'error' ? (
            <Text
              tagname="p"
              type="body-midsize-regular"
              className="ai-assistant__error-text"
              data-testid="ai-assistant:error"
            >
              {errorMessage || REQUEST_FAILED_TEXT}
            </Text>
          ) : null}
        </div>
      );
    }

    if (chatEntries.length > 0) {
      return (
        <div className="ai-assistant__chat" ref={listRef} data-testid="ai-assistant:chat">
          {chatEntries.map((entry) => {
            if (entry.type === 'user') {
              return (
                <div
                  key={entry.id}
                  className="ai-assistant__chat-item ai-assistant__chat-item--user"
                  data-testid="ai-assistant:chat-user"
                >
                  <div className="ai-assistant__user-bubble">{entry.text}</div>
                </div>
              );
            }
            if (entry.type === 'assistant-greeting') {
              return (
                <div
                  key={entry.id}
                  className="ai-assistant__chat-item ai-assistant__chat-item--assistant"
                  data-testid="ai-assistant:chat-greeting"
                >
                  <div className="ai-assistant__assistant-header">
                    <AssistantIcon />
                    <Text tagname="p" type="body-large-bold" className="ai-assistant__suggestion-title">
                      {entry.text}
                    </Text>
                  </div>
                </div>
              );
            }
            const adaptiveCard = entry.realTimeAssist?.data?.adaptiveCard;
            const assistantTitle = entry.realTimeAssist?.data?.title || extractCustomerStatementTitle(adaptiveCard);
            return (
              <div
                key={entry.id}
                className="ai-assistant__chat-item ai-assistant__chat-item--assistant"
                data-testid="ai-assistant:chat-assistant"
              >
                {assistantTitle ? (
                  <div className="ai-assistant__assistant-header">
                    <AssistantIcon />
                    <Text tagname="h3" type="body-large-bold" className="ai-assistant__suggestion-title">
                      {assistantTitle}
                    </Text>
                  </div>
                ) : null}
                <AdaptiveCardRenderer
                  card={adaptiveCard}
                  assistantTitle={assistantTitle}
                  fallbackText={entry.realTimeAssist?.data?.suggestion as string | undefined}
                  publishTimestamp={entry.realTimeAssist?.data?.publishTimestamp}
                  suggestionText={entry.realTimeAssist?.data?.suggestion as string | undefined}
                  onUserAction={(event) =>
                    entry.realTimeAssist ? onRealTimeAssistAction?.(event, entry.realTimeAssist) : undefined
                  }
                  logger={logger}
                />
              </div>
            );
          })}
          <ListeningStatus />
        </div>
      );
    }

    return <ListeningStatus />;
  })();

  return (
    <div className="ai-assistant__real-time-assist">
      {content}
      {hasInitialRequestSucceeded ? (
        <form className="ai-assistant__context" onSubmit={handleContextSubmit} data-testid="ai-assistant:context-form">
          <Input
            className="ai-assistant__context-input"
            placeholder="Add context to refine suggestions"
            value={contextDraft}
            aria-label="Add context"
            data-testid="ai-assistant:context-input"
            // @ts-expect-error momentum-design Input emits a CustomEvent
            onInput={(event: CustomEvent<{value: string}> & {target: HTMLInputElement}) =>
              onContextDraftChange(event.detail?.value ?? event.target?.value ?? '')
            }
          />
          <Button
            type="submit"
            variant="primary"
            size={28}
            disabled={!contextDraft.trim()}
            data-testid="ai-assistant:context-submit"
          >
            Send
          </Button>
        </form>
      ) : null}
    </div>
  );
};

export default RealTimeAssist;
