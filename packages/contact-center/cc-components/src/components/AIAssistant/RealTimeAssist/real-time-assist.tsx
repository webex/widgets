import React, {useEffect, useRef} from 'react';
import {Button, Input, Text} from '@momentum-design/components/dist/react';
import AdaptiveCardRenderer from '../AdaptiveCardRenderer/adaptive-card-renderer';
import CiscoAIAssistantColorIcon from '../CiscoAIAssistantColorIcon';
import {RealTimeAssistProps} from '../ai-assistant.types';
import {EMPTY_DESCRIPTION, EMPTY_TITLE, FLAG_OFF_MESSAGE, GET_SUGGESTIONS_LABEL, LISTENING_TEXT} from '../constant';

const AssistantIcon: React.FC = () => (
  <span className="ai-assistant__assistant-icon" aria-hidden="true">
    <CiscoAIAssistantColorIcon size={20} />
  </span>
);

const RealTimeAssist: React.FC<RealTimeAssistProps> = ({
  status,
  errorMessage,
  chatEntries,
  contextDraft,
  onRequestSuggestion,
  onContextDraftChange,
  onSubmitContext,
  isFeatureEnabled,
  hasFiredInitialRequest,
  onRealTimeAssistAction,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the chat list to the bottom whenever a new entry lands.
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [chatEntries.length, status]);

  const contextDisabled = !isFeatureEnabled || !hasFiredInitialRequest;
  const handleContextSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contextDraft.trim()) return;
    onSubmitContext();
  };

  const content = (() => {
    if (!isFeatureEnabled) {
      return (
        <div className="ai-assistant__body-empty" data-testid="ai-assistant:flag-off">
          <Text tagname="p" type="body-midsize-regular">
            {FLAG_OFF_MESSAGE}
          </Text>
        </div>
      );
    }

    const hasEntries = chatEntries.length > 0;

    if (hasEntries) {
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
            return (
              <div
                key={entry.id}
                className="ai-assistant__chat-item ai-assistant__chat-item--assistant"
                data-testid="ai-assistant:chat-assistant"
              >
                {entry.realTimeAssist?.data?.title ? (
                  <div className="ai-assistant__assistant-header">
                    <AssistantIcon />
                    <Text tagname="h3" type="body-large-bold" className="ai-assistant__suggestion-title">
                      {entry.realTimeAssist.data.title}
                    </Text>
                  </div>
                ) : null}
                <AdaptiveCardRenderer
                  card={entry.realTimeAssist?.data?.adaptiveCard}
                  fallbackText={entry.realTimeAssist?.data?.suggestion as string | undefined}
                  publishTimestamp={entry.realTimeAssist?.data?.publishTimestamp}
                  suggestionText={entry.realTimeAssist?.data?.suggestion as string | undefined}
                  onFeedback={(event) => entry.realTimeAssist && onRealTimeAssistAction?.(event, entry.realTimeAssist)}
                />
              </div>
            );
          })}
          {hasFiredInitialRequest && status !== 'error' ? (
            <div className="ai-assistant__chat-listening" data-testid="ai-assistant:listening">
              <span className="ai-assistant__chat-listening-dot" aria-hidden="true" />
              <Text tagname="span" type="body-midsize-regular">
                {LISTENING_TEXT}
              </Text>
            </div>
          ) : null}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="ai-assistant__body-error" data-testid="ai-assistant:error">
          <Text tagname="p" type="body-midsize-regular">
            {errorMessage || 'Something went wrong while requesting a suggestion.'}
          </Text>
          <Button type="button" variant="primary" onClick={onRequestSuggestion} data-testid="ai-assistant:retry">
            Try again
          </Button>
        </div>
      );
    }

    if (status === 'listening' || hasFiredInitialRequest) {
      return (
        <div className="ai-assistant__chat-listening" data-testid="ai-assistant:listening">
          <span className="ai-assistant__chat-listening-dot" aria-hidden="true" />
          <Text tagname="span" type="body-midsize-regular">
            {LISTENING_TEXT}
          </Text>
        </div>
      );
    }

    return (
      <div className="ai-assistant__body-empty" data-testid="ai-assistant:empty">
        <Text tagname="h3" type="body-large-bold">
          {EMPTY_TITLE}
        </Text>
        <Text tagname="p" type="body-midsize-regular">
          {EMPTY_DESCRIPTION}
        </Text>
        <Button
          type="button"
          variant="secondary"
          className="ai-assistant__pill-button"
          onClick={onRequestSuggestion}
          data-testid="ai-assistant:get-suggestions"
        >
          {GET_SUGGESTIONS_LABEL}
        </Button>
      </div>
    );
  })();

  return (
    <div className="ai-assistant__real-time-assist">
      {content}
      <form className="ai-assistant__context" onSubmit={handleContextSubmit} data-testid="ai-assistant:context-form">
        <Input
          className="ai-assistant__context-input"
          placeholder={
            hasFiredInitialRequest
              ? 'Add context to refine suggestions'
              : 'Click "Get Suggestions" first to start a session'
          }
          value={contextDraft}
          disabled={contextDisabled}
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
          disabled={contextDisabled || !contextDraft.trim()}
          data-testid="ai-assistant:context-submit"
        >
          Send
        </Button>
      </form>
    </div>
  );
};

export default RealTimeAssist;
