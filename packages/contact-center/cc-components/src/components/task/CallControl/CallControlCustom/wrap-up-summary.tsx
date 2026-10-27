import React, {useState} from 'react';
import {
  Button,
  Chip,
  Combobox,
  Icon,
  Option,
  Selectlistbox,
  StaticChip,
  Text,
} from '@momentum-design/components/dist/react';
import AISummary, {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../AIAssistant/AISummary';
import type {WrapUpSummaryProps, WrapUpSummaryReason} from '../../task.types';
import './wrap-up-summary.styles.scss';

const WrapUpSummary: React.FC<WrapUpSummaryProps> = ({
  reasons,
  summary,
  selectedReasonId,
  onReasonChange,
  onComplete,
}) => {
  const selectedReason = reasons.find((reason) => reason.id === selectedReasonId);
  // Retain the committed picker value only while searching. Clearing the eligible
  // reason must not reset Momentum's typed filter or erase its first character.
  const [searchingValue, setSearchingValue] = useState<string>();
  const isSearching = searchingValue !== undefined;
  const pickerValue = searchingValue ?? selectedReason?.id ?? '';
  const selectReason = (reason?: WrapUpSummaryReason) => {
    setSearchingValue(undefined);
    onReasonChange(reason ?? {id: '', name: ''});
  };
  const suggestedReasons = (summary?.content?.suggestedWrapUpCodes ?? []).reduce<WrapUpSummaryReason[]>(
    (suggestions, suggestion) => {
      const matches = reasons.filter((reason) =>
        typeof suggestion.id === 'string' ? reason.id === suggestion.id : reason.name === suggestion.name
      );
      const reason = matches.length === 1 ? matches[0] : undefined;
      if (reason && !suggestions.some((existing) => existing.id === reason.id)) suggestions.push(reason);
      return suggestions;
    },
    []
  );
  const suggestionMessage = summary?.content?.suggestedWrapUpCodesMessage;
  const showSuggestions = suggestedReasons.length
    ? !suggestedReasons.some((reason) => reason.id === selectedReasonId)
    : Boolean(suggestionMessage);

  return (
    <section className="wrap-up-summary agent-popover-content" data-testid="wrap-up-summary">
      <div className="wrap-up-summary__scroll-content" data-testid="wrap-up-summary:scroll-content">
        <header className="wrap-up-summary__header">
          <Text tagname="h2" type="body-large-bold" className="wrap-up-summary__eyebrow">
            {AI_SUMMARY_MESSAGES.postCall.heading}
          </Text>
          <Text tagname="p" type="body-midsize-regular" className="wrap-up-summary__intro">
            {AI_SUMMARY_MESSAGES.postCall.instructions}
          </Text>
        </header>
        <Combobox
          className="wrap-up-summary__reason-picker"
          data-testid="wrap-up-summary:reason-picker"
          data-aria-label={AI_SUMMARY_MESSAGES.postCall.chooseReason}
          label={AI_SUMMARY_MESSAGES.postCall.chooseReason}
          placeholder={AI_SUMMARY_MESSAGES.postCall.searchPlaceholder}
          noResultText={AI_SUMMARY_MESSAGES.postCall.noReasonMatches}
          controlType="controlled"
          value={pickerValue}
          strategy="fixed"
          boundary="body"
          onInput={(event) => {
            // Momentum also emits input before a selected-option change; only typing clears the selection.
            if (event.detail?.label === undefined) {
              setSearchingValue(pickerValue);
              onReasonChange({id: '', name: ''});
            }
          }}
          onChange={(event) => {
            const reason = reasons.find((candidate) => candidate.id === event.detail?.value);
            selectReason(reason);
          }}
        >
          <Selectlistbox>
            {reasons.map((reason) => (
              <Option key={reason.id} value={reason.id} label={reason.name}>
                {reason.name}
              </Option>
            ))}
          </Selectlistbox>
        </Combobox>
        {showSuggestions && (
          <div className="wrap-up-summary__suggestions" data-testid="wrap-up-summary:suggestions">
            <Text tagname="span" type="body-midsize-regular" className="wrap-up-summary__suggestions-label">
              <Icon
                name="sparkle-filled"
                size={1.25}
                lengthUnit="rem"
                className="wrap-up-summary__suggestions-icon"
                aria-hidden="true"
              />
              {AI_SUMMARY_MESSAGES.postCall.suggested}
            </Text>
            <div className="wrap-up-summary__suggestion-chips">
              {suggestedReasons.map((reason) => (
                <Chip
                  key={reason.id}
                  className="wrap-up-summary__suggestion-chip"
                  icon-name="plus-bold"
                  label={reason.name}
                  onClick={() => selectReason(reason)}
                />
              ))}
              {!suggestedReasons.length && suggestionMessage ? (
                <StaticChip icon-name="dnd-presence-filled" label={suggestionMessage} />
              ) : null}
            </div>
          </div>
        )}
        {summary && summary.state !== 'omitted' ? (
          <div className="wrap-up-summary__body" data-testid="wrap-up-summary:body">
            <AISummary {...summary} mode="post-call" state={summary.state} />
          </div>
        ) : null}
      </div>
      {/* As in Agent Desktop, a summary that is still generating does not hold back wrap-up. */}
      <Button
        className="wrap-up-summary__actions"
        type="button"
        variant="primary"
        size={32}
        disabled={!selectedReason || isSearching}
        aria-label={AI_SUMMARY_MESSAGES.postCall.completeAction}
        onClick={selectedReason && !isSearching ? () => onComplete(selectedReason) : undefined}
      >
        {AI_SUMMARY_MESSAGES.postCall.completeAction}
      </Button>
    </section>
  );
};

export default WrapUpSummary;
