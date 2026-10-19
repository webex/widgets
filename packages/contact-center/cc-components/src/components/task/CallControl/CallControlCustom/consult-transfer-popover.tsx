import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  Text,
  ListNext,
  TextInput,
  Button,
  ButtonCircle,
  TooltipNext,
  RadioGroupNext as RadioGroup,
} from '@momentum-ui/react-collaboration';
import {Icon, Checkbox, Spinner} from '@momentum-design/components/dist/react';
import AISummary, {AI_ASSISTANT_SUMMARY_MESSAGES as AI_SUMMARY_MESSAGES} from '../../../AIAssistant/AISummary';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {
  CategoryType,
  ConsultTransferPopoverComponentProps,
  CATEGORY_AGENTS,
  CATEGORY_DIAL_NUMBER,
  CATEGORY_ENTRY_POINT,
  CATEGORY_QUEUES,
} from '../../task.types';
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
} from '../../constants';
import './consult-transfer-summary.styles.scss';

const DESTINATION_CATEGORY = {
  agent: CATEGORY_AGENTS,
  queue: CATEGORY_QUEUES,
  dialNumber: CATEGORY_DIAL_NUMBER,
  entryPoint: CATEGORY_ENTRY_POINT,
} as const;

const VOICE_DESTINATION_CATEGORY_LABELS: Record<CategoryType, string> = {
  Agents: 'Agent',
  Queues: 'Queues',
  'Dial Number': 'Dial number',
  'Entry Point': 'Entry point',
};

const useReactId = (React as typeof React & {useId: () => string}).useId;

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
  onClose,
  logger,
}) => {
  const headingId = useReactId();
  const consultTransferPanelRef = useRef<HTMLDivElement | null>(null);
  const summaryFocusedControlRef = useRef<HTMLElement | null>(null);
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
  const [hasShownSummary, setHasShownSummary] = useState(summaryVisible);
  // Keep the summary layout stable until this popover closes after summary eligibility is revoked.
  const isVoiceDestinationLayout = isTelephony && (Boolean(summary) || hasShownSummary);
  const panelFocusEnabled = isVoiceDestinationLayout || hasShownSummary;

  useLayoutEffect(() => {
    if (summaryVisible && !hasShownSummary) {
      setHasShownSummary(true);
    }
    const focusedSummaryControl = summaryFocusedControlRef.current;
    if (!focusedSummaryControl || focusedSummaryControl.isConnected) return;

    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || activeElement === document.body || !activeElement.isConnected) {
      consultTransferPanelRef.current?.focus();
    }
    summaryFocusedControlRef.current = null;
  });

  const handleSummaryFocusCapture = (event: React.FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      summaryFocusedControlRef.current = target;
    }
  };

  const handleSummaryBlurCapture = (event: React.FocusEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof HTMLElement && relatedTarget !== document.body && relatedTarget.isConnected) {
      summaryFocusedControlRef.current = null;
    }
  };

  const renderList = <T extends {id?: string; name: string; number?: string; presence?: 'active' | 'away'}>(
    items: T[],
    onButtonPress: (item: T) => void
  ) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item) => {
        const key = `${item.id ?? item.name}-${item.number ?? ''}`;
        const listItem = (
          <ConsultTransferListComponent
            key={key}
            className={isVoiceDestinationLayout ? 'consult-list-item-wrapper' : undefined}
            title={item.name}
            subtitle={item.number}
            presence={item.presence}
            buttonIcon={isVoiceDestinationLayout ? 'next-regular' : buttonIcon}
            buttonAriaLabel={isVoiceDestinationLayout ? `Select ${item.name}` : undefined}
            onButtonPress={() => onButtonPress(item)}
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
      {items.length === 0 &&
        (isVoiceDestinationLayout ? (
          <li>
            <Text tagName="small" type="body-secondary">
              No {selectedCategory.toLowerCase()} found
            </Text>
          </li>
        ) : (
          <Text tagName="small" type="body-secondary">
            No {selectedCategory.toLowerCase()} found
          </Text>
        ))}
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

  const summaryHeading =
    action === 'Transfer' ? AI_SUMMARY_MESSAGES.midCall.transferHeading : AI_SUMMARY_MESSAGES.midCall.consultHeading;
  const searchPlaceholder = isVoiceDestinationLayout
    ? AI_SUMMARY_MESSAGES.midCall.searchPlaceholder
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
      tabIndex={panelFocusEnabled ? -1 : undefined}
      ref={consultTransferPanelRef}
      aria-labelledby={panelFocusEnabled ? headingId : undefined}
    >
      <Text
        tagName="h3"
        className="agent-popover-title"
        type="body-large-bold"
        id={panelFocusEnabled ? headingId : undefined}
      >
        {heading}
      </Text>

      {isVoiceDestinationLayout && onClose && (
        <ButtonCircle className="consult-close-button" aria-label="Close popover" ghost size={20} onPress={onClose}>
          <Icon name="cancel-regular" aria-hidden="true" />
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
        {isVoiceDestinationLayout && <Icon name="search-regular" className="consult-search-icon" aria-hidden="true" />}
        <TextInput
          id="consult-search"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(value: string) => handleSearchChange(value)}
          clearAriaLabel={CLEAR_SEARCH}
          aria-label={isVoiceDestinationLayout ? AI_SUMMARY_MESSAGES.midCall.searchDestinations : undefined}
          aria-labelledby={isVoiceDestinationLayout ? undefined : 'consult-search-label'}
          className="consult-search-input"
        />
        {!isVoiceDestinationLayout && (
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
        )}
        {consultTransferManualAction.visible && (
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

      <div
        className="consult-list-container"
        tabIndex={isVoiceDestinationLayout ? 0 : undefined}
        onMouseDown={isVoiceDestinationLayout ? (event) => event.stopPropagation() : undefined}
      >
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
          className="consult-transfer-summary"
          data-testid="consult-transfer:summary"
          onFocusCapture={handleSummaryFocusCapture}
          onBlurCapture={handleSummaryBlurCapture}
        >
          <Text tagName="h4" className="consult-transfer-summary__heading" type="body-midsize-regular">
            <Icon name="sparkle-filled" className="consult-transfer-summary__sparkle" aria-hidden="true" />
            {summaryHeading}
          </Text>
          <AISummary
            {...summary}
            mode="mid-call-initiator"
            state={summary.state}
            containingPanelFocusTarget={consultTransferPanelRef}
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
    </div>
  );
};

export default ConsultTransferPopoverComponent;
