import React, {useEffect, useMemo, useState} from 'react';
import {
  Text,
  ListNext,
  TextInput,
  Button,
  ButtonCircle,
  TooltipNext,
  RadioGroupNext as RadioGroup,
} from '@momentum-ui/react-collaboration';
import {Button as MomentumButton, Icon, Checkbox, Searchfield, Spinner} from '@momentum-design/components/dist/react';
import AISummary, {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../AIAssistant/AISummary';
import ConsultTransferListComponent from './consult-transfer-list-item';
import type {CategoryType, ConsultTransferPopoverComponentProps} from '../../task.types';
import {CATEGORY_AGENTS, CATEGORY_DIAL_NUMBER, CATEGORY_ENTRY_POINT, CATEGORY_QUEUES} from '../../task.types';
import ConsultTransferEmptyState from './consult-transfer-empty-state';
import {
  handleAgentSelection,
  handleQueueSelection,
  shouldAddConsultTransferAction,
  getAgentsForDisplay,
} from './call-control-custom.utils';
import {useConsultTransferPopover} from './consult-transfer-popover-hooks';
import {
  SEARCH_PLACEHOLDER,
  CLEAR_SEARCH,
  SCROLL_TO_LOAD_MORE,
  NO_DATA_AVAILABLE_CONSULT_TRANSFER,
  VOICE_DESTINATION_CATEGORY_LABELS,
  VOICE_DESTINATION_SEARCH_PLACEHOLDERS,
  CANCEL,
} from '../../constants';
import './consult-transfer-summary.styles.scss';

const DESTINATION_CATEGORY = {
  agent: CATEGORY_AGENTS,
  queue: CATEGORY_QUEUES,
  dialNumber: CATEGORY_DIAL_NUMBER,
  entryPoint: CATEGORY_ENTRY_POINT,
} as const;

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  loadingBuddyAgents,
  loadBuddyAgents,
  getAddressBookEntries,
  getEntryPoints,
  getQueues,
  onAgentSelect,
  onQueueSelect,
  onDialNumberSelect,
  onEntryPointSelect,
  action,
  availableDestinations,
  consultTransferOptions,
  isConferenceInProgress,
  summary,
  isTelephony = false,
  inDialog = false,
  onClose,
  onCancel,
  onSummaryRequest,
  logger,
}) => {
  const summaryVisible = Boolean(summary && summary.state !== 'omitted');
  const {showDialNumberTab = true, showEntryPointTab = true} = consultTransferOptions || {};
  const availableCategories = useMemo(
    () =>
      availableDestinations
        .filter((destination) => showDialNumberTab || destination !== 'dialNumber')
        .filter((destination) => showEntryPointTab || destination !== 'entryPoint')
        .map((destination) => DESTINATION_CATEGORY[destination]),
    [availableDestinations, showDialNumberTab, showEntryPointTab]
  );
  const isAgentsTabVisible = availableCategories.includes(CATEGORY_AGENTS);
  const isQueueTabVisible = availableCategories.includes(CATEGORY_QUEUES);
  const isDialNumberTabVisible = availableCategories.includes(CATEGORY_DIAL_NUMBER);
  const isEntryPointTabVisible = availableCategories.includes(CATEGORY_ENTRY_POINT);
  const {
    selectedCategory,
    searchQuery,
    loadMoreRef,
    dialNumbers,
    hasMoreDialNumbers,
    loadingDialNumbers,
    entryPoints,
    hasMoreEntryPoints,
    loadingEntryPoints,
    queuesData,
    hasMoreQueues,
    loadingQueues,
    handleSearchChange,
    handleCategoryChange,
    handleReload,
  } = useConsultTransferPopover({
    availableCategories,
    getAddressBookEntries,
    getEntryPoints,
    getQueues,
    logger,
  });
  const [allowParticipantsToInteract, setAllowParticipantsToInteract] = useState<boolean>(false);
  const [destinationSubmitted, setDestinationSubmitted] = useState(false);
  const [selectedDestinations, setSelectedDestinations] = useState<
    Partial<Record<CategoryType, {id?: string; name: string; number?: string}>>
  >({});
  const summaryLayoutActive = isTelephony ? Boolean(summary) : summaryVisible;
  const [hasShownSummary, setHasShownSummary] = useState(summaryLayoutActive);
  // Keep the summary layout stable until this popover closes after summary eligibility is revoked.
  const isVoiceDestinationLayout = isTelephony && (Boolean(summary) || hasShownSummary);

  useEffect(() => {
    if (summaryLayoutActive && !hasShownSummary) {
      setHasShownSummary(true);
    }
  }, [summaryLayoutActive, hasShownSummary]);

  const renderList = <T extends {id?: string; name: string; number?: string; presence?: 'active' | 'away'}>(
    items: T[],
    onButtonPress: (item: T) => void
  ) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item, index) => {
        const key = `${item.id ?? item.name}-${item.number ?? ''}`;
        const listItem = (
          <ConsultTransferListComponent
            key={key}
            className={isVoiceDestinationLayout ? 'consult-list-item-wrapper' : undefined}
            itemIndex={isVoiceDestinationLayout ? index : undefined}
            title={item.name}
            subtitle={isVoiceDestinationLayout && selectedCategory === CATEGORY_AGENTS ? undefined : item.number}
            presence={item.presence}
            buttonIcon={isVoiceDestinationLayout ? 'next-regular' : buttonIcon}
            buttonAriaLabel={isVoiceDestinationLayout ? `Select ${item.name}` : undefined}
            isSelected={
              isVoiceDestinationLayout
                ? selectedDestinations[selectedCategory]?.id === item.id &&
                  selectedDestinations[selectedCategory]?.name === item.name &&
                  selectedDestinations[selectedCategory]?.number === item.number
                : undefined
            }
            onButtonPress={() => {
              if (isVoiceDestinationLayout) {
                setSelectedDestinations((selected) => ({...selected, [selectedCategory]: item}));
              } else {
                onButtonPress(item);
              }
            }}
            logger={logger}
          />
        );
        return isVoiceDestinationLayout ? (
          listItem
        ) : (
          <div key={key} onMouseDown={(event) => event.stopPropagation()} className="consult-list-item-wrapper">
            {listItem}
          </div>
        );
      })}
      {items.length === 0 && (
        <Text tagName="small" type="body-secondary">
          No {selectedCategory.toLowerCase()} found
        </Text>
      )}
    </ListNext>
  );

  const noQueues = queuesData.length === 0;
  const noDialNumbers = dialNumbers.length === 0;
  const noEntryPoints = entryPoints.length === 0;

  const consultTransferManualAction = shouldAddConsultTransferAction(
    selectedCategory,
    isEntryPointTabVisible,
    allowParticipantsToInteract,
    searchQuery,
    entryPoints,
    onDialNumberSelect,
    onEntryPointSelect
  );

  // Preserve a choice per category, but never submit a destination that the current list no longer exposes.
  const selectedDestination = selectedDestinations[selectedCategory];
  const selectedDestinationAvailable =
    availableCategories.includes(selectedCategory) &&
    selectedDestination &&
    (selectedCategory === CATEGORY_AGENTS
      ? buddyAgents.some((agent) => agent.agentId === selectedDestination.id)
      : selectedCategory === CATEGORY_QUEUES
        ? queuesData.some((queue) => queue.id === selectedDestination.id)
        : selectedCategory === CATEGORY_DIAL_NUMBER
          ? dialNumbers.some((number) => number.number === selectedDestination.number)
          : entryPoints.some((entryPoint) => entryPoint.id === selectedDestination.id));

  const clearCurrentSelection = () => {
    setSelectedDestinations((selected) => ({...selected, [selectedCategory]: undefined}));
  };

  const manualDestinationAvailable =
    availableCategories.includes(selectedCategory) && consultTransferManualAction.visible;

  const submitVoiceDestination = () => {
    if (destinationSubmitted || (!selectedDestinationAvailable && !manualDestinationAvailable)) return;
    setDestinationSubmitted(true);
    try {
      if (!selectedDestinationAvailable) {
        consultTransferManualAction.onClick?.();
      } else {
        switch (selectedCategory) {
          case CATEGORY_AGENTS:
            if (selectedDestination.id) {
              onAgentSelect(selectedDestination.id, selectedDestination.name, allowParticipantsToInteract);
            }
            break;
          case CATEGORY_QUEUES:
            if (selectedDestination.id) {
              onQueueSelect(selectedDestination.id, selectedDestination.name, allowParticipantsToInteract);
            }
            break;
          case CATEGORY_DIAL_NUMBER:
            if (selectedDestination.number) {
              onDialNumberSelect(selectedDestination.number, allowParticipantsToInteract);
            }
            break;
          case CATEGORY_ENTRY_POINT:
            if (selectedDestination.id) {
              onEntryPointSelect(selectedDestination.id, selectedDestination.name, allowParticipantsToInteract);
            }
            break;
        }
      }
    } catch {
      setDestinationSubmitted(false);
      logger.error('CC-Components: Failed to submit consult/transfer destination', {
        module: 'consult-transfer-popover.tsx',
        method: 'submitVoiceDestination',
      });
      return;
    }
    onClose?.();
  };

  const summaryHeading =
    action === 'Transfer' ? AI_SUMMARY_MESSAGES.midCall.transferHeading : AI_SUMMARY_MESSAGES.midCall.consultHeading;
  const searchPlaceholder = isVoiceDestinationLayout
    ? VOICE_DESTINATION_SEARCH_PLACEHOLDERS[selectedCategory]
    : SEARCH_PLACEHOLDER;
  const voiceCategoryOptions = useMemo(
    () =>
      availableCategories.map((category) => ({
        label: VOICE_DESTINATION_CATEGORY_LABELS[category],
        value: category,
      })),
    [availableCategories]
  );

  return (
    <div
      className={`agent-popover-content${isVoiceDestinationLayout ? ' agent-popover-content--voice' : ''}`}
      aria-label={inDialog || summaryLayoutActive || hasShownSummary ? heading : undefined}
    >
      {!inDialog && (
        <Text tagName="h3" className="agent-popover-title" type="body-large-bold">
          {heading}
        </Text>
      )}

      {!inDialog && isVoiceDestinationLayout && onClose && (
        <ButtonCircle className="consult-close-button" aria-label="Close popover" ghost size={20} onPress={onClose}>
          <Icon name="cancel-regular" size={1} lengthUnit="rem" aria-hidden="true" />
        </ButtonCircle>
      )}

      {isVoiceDestinationLayout ? (
        <RadioGroup
          aria-label={AI_SUMMARY_MESSAGES.midCall.destinationCategory}
          className="consult-category-radios"
          value={selectedCategory}
          options={voiceCategoryOptions}
          onChange={(value) => {
            const category = availableCategories.find((candidate) => candidate === value);
            if (category) handleCategoryChange(category);
          }}
        />
      ) : null}

      <div className="consult-search-row">
        {isVoiceDestinationLayout ? (
          <Searchfield
            id="consult-search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            dataAriaLabel={AI_SUMMARY_MESSAGES.midCall.searchDestinations}
            clearAriaLabel={CLEAR_SEARCH}
            className="consult-search-input"
            onInput={(event) => {
              clearCurrentSelection();
              handleSearchChange(event.target.value);
            }}
            onClear={() => {
              clearCurrentSelection();
              handleSearchChange('');
            }}
          />
        ) : (
          <TextInput
            id="consult-search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            clearAriaLabel={CLEAR_SEARCH}
            aria-labelledby="consult-search-label"
            className="consult-search-input"
          />
        )}
        <div className="consult-action-buttons">
          <TooltipNext
            key={`reload-button-${selectedCategory}`}
            triggerComponent={
              <ButtonCircle
                className="consult-reload-button call-control-button"
                aria-label={`Reload ${selectedCategory}`}
                size={32}
                data-testid="consult-reload-button"
                onPress={() => {
                  if (isVoiceDestinationLayout) clearCurrentSelection();
                  if (selectedCategory === CATEGORY_AGENTS && loadBuddyAgents) {
                    loadBuddyAgents(action);
                  } else {
                    handleReload();
                  }
                }}
                disabled={loadingBuddyAgents || loadingDialNumbers || loadingEntryPoints || loadingQueues}
              >
                <Icon name="refresh-bold" />
              </ButtonCircle>
            }
            color="secondary"
            delay={[0, 0]}
            placement="bottom-start"
            type="description"
            variant="small"
            className="tooltip"
          >
            <Text tagName="p">{`Reload ${selectedCategory}`}</Text>
          </TooltipNext>
        </div>
        {!isVoiceDestinationLayout && consultTransferManualAction.visible && (
          <TooltipNext
            triggerComponent={
              <ButtonCircle
                className="consult-quick-action-button"
                aria-label={`${heading} via search`}
                onPress={consultTransferManualAction.onClick}
                size={32}
                color="join"
                data-testid={`consult-quick-action:${heading.toLowerCase()}`}
              >
                <Icon name={buttonIcon} />
              </ButtonCircle>
            }
            color="primary"
            delay={[0, 0]}
            placement="bottom-start"
            type="description"
            variant="small"
            className="tooltip"
          >
            <p>{`${heading} via search`}</p>
          </TooltipNext>
        )}
      </div>

      {!isVoiceDestinationLayout ? (
        <div className="consult-category-buttons">
          {availableCategories.map((category: CategoryType) => {
            const isWide = category === CATEGORY_DIAL_NUMBER || category === CATEGORY_ENTRY_POINT;

            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'primary' : 'secondary'}
                size="small"
                onClick={() => handleCategoryChange(category)}
                className={`${isWide ? 'consult-category-button-wide' : 'consult-category-button-standard'} ${
                  selectedCategory === category ? 'consult-category-button-active' : ''
                }`}
              >
                {category}
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="consult-list-container">
        {isAgentsTabVisible &&
          selectedCategory === CATEGORY_AGENTS &&
          (loadingBuddyAgents ? (
            <div className="consult-loading-spinner">
              <Spinner />
            </div>
          ) : getAgentsForDisplay(selectedCategory, buddyAgents, searchQuery).length === 0 ? (
            <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
          ) : (
            renderList(
              getAgentsForDisplay(selectedCategory, buddyAgents, searchQuery).map((agent) => ({
                id: agent.agentId,
                name: agent.agentName,
                number: isVoiceDestinationLayout ? agent.dn : undefined,
                presence: agent.state?.toLowerCase() === 'available' ? ('active' as const) : ('away' as const),
              })),
              (item) => handleAgentSelection(item.id, item.name, allowParticipantsToInteract, onAgentSelect, logger)
            )
          ))}

        {isQueueTabVisible &&
          selectedCategory === CATEGORY_QUEUES &&
          (loadingQueues && queuesData.length === 0 ? (
            <div className="consult-loading-spinner">
              <Spinner />
            </div>
          ) : noQueues ? (
            <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
          ) : (
            <div>
              {renderList(queuesData, (item) =>
                item.id
                  ? handleQueueSelection(item.id, item.name, allowParticipantsToInteract, onQueueSelect, logger)
                  : undefined
              )}
              {hasMoreQueues && (
                <div ref={loadMoreRef} className="consult-load-more">
                  {loadingQueues ? (
                    <div className="consult-loading-spinner">
                      <Spinner />
                    </div>
                  ) : (
                    <Text tagName="small" type="body-secondary">
                      {SCROLL_TO_LOAD_MORE}
                    </Text>
                  )}
                </div>
              )}
            </div>
          ))}

        {isDialNumberTabVisible &&
          selectedCategory === CATEGORY_DIAL_NUMBER &&
          (loadingDialNumbers && dialNumbers.length === 0 ? (
            <div className="consult-loading-spinner">
              <Spinner />
            </div>
          ) : noDialNumbers ? (
            <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
          ) : (
            <div>
              {renderList(dialNumbers, (item) => {
                if (item.number) {
                  onDialNumberSelect(item.number, allowParticipantsToInteract);
                }
              })}
              {hasMoreDialNumbers && (
                <div ref={loadMoreRef} className="consult-load-more">
                  {loadingDialNumbers ? (
                    <div className="consult-loading-spinner">
                      <Spinner />
                    </div>
                  ) : (
                    <Text tagName="small" type="body-secondary">
                      {SCROLL_TO_LOAD_MORE}
                    </Text>
                  )}
                </div>
              )}
            </div>
          ))}

        {isEntryPointTabVisible &&
          selectedCategory === CATEGORY_ENTRY_POINT &&
          (loadingEntryPoints && entryPoints.length === 0 ? (
            <div className="consult-loading-spinner">
              <Spinner />
            </div>
          ) : noEntryPoints ? (
            <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
          ) : (
            <div>
              {renderList(entryPoints, (item) => {
                onEntryPointSelect(item.id, item.name, allowParticipantsToInteract);
              })}
              {hasMoreEntryPoints && (
                <div ref={loadMoreRef} className="consult-load-more">
                  {loadingEntryPoints ? (
                    <div className="consult-loading-spinner">
                      <Spinner />
                    </div>
                  ) : (
                    <Text tagName="small" type="body-secondary">
                      {SCROLL_TO_LOAD_MORE}
                    </Text>
                  )}
                </div>
              )}
            </div>
          ))}
        {availableCategories.length === 0 && <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />}
      </div>
      {summary && summary.state !== 'omitted' && (
        <section
          className={`consult-transfer-summary${summary.excluded ? ' consult-transfer-summary--excluded' : ''}`}
          aria-disabled={summary.excluded || undefined}
          data-testid="consult-transfer:summary"
        >
          {!summary.content?.adaptiveCard && !summary.content?.editAdaptiveCard && (
            <Text tagName="h4" className="consult-transfer-summary__heading" type="body-midsize-regular">
              <Icon
                name="sparkle-filled"
                size={1}
                lengthUnit="rem"
                className="consult-transfer-summary__sparkle"
                aria-hidden="true"
              />
              {summaryHeading}
            </Text>
          )}
          <AISummary
            {...summary}
            mode="mid-call-initiator"
            state={summary.state}
            controlsDisabled={summary.excluded || summary.controlsDisabled}
            onRetry={
              onSummaryRequest
                ? () => onSummaryRequest(action === 'Transfer' ? 'TRANSFER' : 'CONSULT')
                : summary.onRetry
            }
          />
        </section>
      )}
      {isConferenceInProgress && (
        <div className="consult-checkbox-container">
          <Checkbox
            checked={allowParticipantsToInteract}
            aria-label="Allow participants to continue interacting"
            id="allow-participants-checkbox"
            label="Allow participants to continue interacting."
            // @ts-expect-error: TODO: https://github.com/momentum-design/momentum-design/pull/1118
            onchange={() => {
              setAllowParticipantsToInteract(!allowParticipantsToInteract);
            }}
          />
        </div>
      )}
      {isVoiceDestinationLayout && (
        <div className="consult-transfer-actions">
          {summary && summary.state !== 'omitted' && summary.onExcludeChange && (
            <Checkbox
              className="consult-transfer-actions__exclude"
              label="Exclude summary"
              checked={summary.excluded ?? false}
              disabled={destinationSubmitted}
              onChange={() => summary.onExcludeChange?.(!summary.excluded)}
            />
          )}
          <MomentumButton type="button" variant="secondary" size={32} onClick={onCancel ?? onClose}>
            {CANCEL}
          </MomentumButton>
          <MomentumButton
            type="button"
            variant="primary"
            size={32}
            disabled={destinationSubmitted || (!selectedDestinationAvailable && !manualDestinationAvailable)}
            onClick={submitVoiceDestination}
          >
            {action}
          </MomentumButton>
        </div>
      )}
    </div>
  );
};

export default ConsultTransferPopoverComponent;
