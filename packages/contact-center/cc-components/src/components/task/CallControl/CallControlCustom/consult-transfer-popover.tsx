import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useSummaryViewed} from '../../../AISummary/use-summary-viewed';
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
import AISummary, {AI_SUMMARY_MESSAGES} from '../../../AISummary';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {
  CategoryType,
  ConsultTransferDestinationLayout,
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
import type {ConsultTransferSummaryProps} from './consult-transfer-summary.types';
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

let headingInstanceCounter = 0;

const createHeadingId = (): string => {
  headingInstanceCounter += 1;
  return `consult-transfer-popover-heading-${headingInstanceCounter}`;
};

type ConsultTransferPopoverWithSummaryProps = ConsultTransferPopoverComponentProps &
  ConsultTransferSummaryProps & {
    isTelephony?: boolean;
    onClose?: () => void;
  };

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverWithSummaryProps> = ({
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
  requestMidCallSummary,
  isTelephony = false,
  onClose,
  destinationLayout,
  isActionPending = false,
  onExistingPartyConfirm,
  existingPartyConfirmLabel,
  summaryActionType: summaryActionTypeProp,
  requestSummaryOnOpen = true,
  logger,
}) => {
  const headingId = useMemo(createHeadingId, []);
  const [latchedDestinationLayout] = useState<ConsultTransferDestinationLayout>(
    () => destinationLayout ?? (isTelephony ? 'voice-radio' : 'non-voice-pill')
  );
  const isVoiceDestinationLayout = latchedDestinationLayout === 'voice-radio';
  const isExistingPartyActionLayout = latchedDestinationLayout === 'existing-party-action';
  const consultTransferPanelRef = useRef<HTMLDivElement | null>(null);
  const summaryRootRef = useRef<HTMLElement | null>(null);
  const summaryFocusedControlRef = useRef<HTMLElement | null>(null);
  const editSummary = useSummaryViewed(summary);
  const previousSummaryVisibleRef = useRef(false);
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
  const agentLoadKeyRef = useRef<string | null>(null);
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
  const [hasSummaryFocusFallback, setHasSummaryFocusFallback] = useState(summaryVisible);
  const panelFocusEnabled = isVoiceDestinationLayout || isExistingPartyActionLayout || hasSummaryFocusFallback;

  const clearSummaryFocusSnapshot = () => {
    summaryFocusedControlRef.current = null;
  };

  const restoreSummaryRemovalFocus = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement.isConnected) {
      clearSummaryFocusSnapshot();
      return;
    }
    const focusedSummaryControl = summaryFocusedControlRef.current;
    if (focusedSummaryControl && !focusedSummaryControl.isConnected) {
      consultTransferPanelRef.current?.focus();
    }
    clearSummaryFocusSnapshot();
  };

  useLayoutEffect(() => {
    if (summaryVisible && !hasSummaryFocusFallback) {
      setHasSummaryFocusFallback(true);
    }
    const previousSummaryVisible = previousSummaryVisibleRef.current;
    previousSummaryVisibleRef.current = summaryVisible;
    if (previousSummaryVisible && !summaryVisible) {
      restoreSummaryRemovalFocus();
    }
  }, [hasSummaryFocusFallback, summaryVisible]);

  const handleSummaryFocusCapture = (event: React.FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      summaryFocusedControlRef.current = target;
    }
  };

  const summaryRequestPending = summary?.requestPending === true;
  const destinationActionDisabled = isActionPending || summaryRequestPending;

  const renderList = <T extends {id?: string; name: string; number?: string; presence?: 'active' | 'away'}>(
    items: T[],
    onButtonPress: (item: T) => void
  ) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item) => (
        <ConsultTransferListComponent
          key={`${item.id ?? item.name}-${item.number ?? ''}`}
          className="consult-list-item-wrapper"
          title={item.name}
          subtitle={item.number}
          presence={item.presence}
          buttonIcon={isVoiceDestinationLayout ? 'next-regular' : buttonIcon}
          onButtonPress={() => onButtonPress(item)}
          actionDisabled={destinationActionDisabled}
          logger={logger}
        />
      ))}
      {items.length === 0 && (
        <li>
          <Text tagName="small" type="body-secondary">
            No {selectedCategory.toLowerCase()} found
          </Text>
        </li>
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

  const summaryHeading =
    summary?.actionType === 'TRANSFER'
      ? AI_SUMMARY_MESSAGES.midCall.transferHeading
      : AI_SUMMARY_MESSAGES.midCall.consultHeading;
  const summaryActionType = summaryActionTypeProp ?? (action === 'Transfer' ? 'TRANSFER' : 'CONSULT');
  const existingPartyConfirmDisabled = destinationActionDisabled || Boolean(summary?.controlsDisabled);
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

  const runDestinationAction = (actionCallback: () => void) => {
    if (destinationActionDisabled) {
      return;
    }
    actionCallback();
  };

  useEffect(() => {
    if (
      isExistingPartyActionLayout ||
      selectedCategory !== CATEGORY_AGENTS ||
      !isAgentsTabVisible ||
      !loadBuddyAgents ||
      loadingBuddyAgents
    ) {
      return;
    }

    const loadKey = `${action}:${availableCategories.join('|')}`;
    if (buddyAgents.length > 0) {
      agentLoadKeyRef.current = loadKey;
      return;
    }
    if (agentLoadKeyRef.current === loadKey) {
      return;
    }

    agentLoadKeyRef.current = loadKey;
    void loadBuddyAgents(action);
  }, [
    action,
    availableCategories,
    buddyAgents.length,
    isAgentsTabVisible,
    isExistingPartyActionLayout,
    loadBuddyAgents,
    loadingBuddyAgents,
    selectedCategory,
  ]);

  useEffect(() => {
    if (
      !requestSummaryOnOpen ||
      (!isVoiceDestinationLayout && !isExistingPartyActionLayout) ||
      !requestMidCallSummary
    ) {
      return;
    }

    void requestMidCallSummary(summaryActionType).then(
      () => undefined,
      () => {
        logger?.warn?.('CC-Widgets: CallControl: AI summary request did not complete', {
          module: 'consult-transfer-popover.tsx',
          method: 'requestMidCallSummary',
        });
      }
    );
  }, [
    isExistingPartyActionLayout,
    isVoiceDestinationLayout,
    logger,
    requestMidCallSummary,
    requestSummaryOnOpen,
    summaryActionType,
  ]);

  return (
    <div
      className={`agent-popover-content${
        isVoiceDestinationLayout ? ' agent-popover-content--voice' : ''
      }${isExistingPartyActionLayout ? ' agent-popover-content--existing-party' : ''}`}
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

      {(isVoiceDestinationLayout || isExistingPartyActionLayout) && onClose && (
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

      {!isExistingPartyActionLayout && (
        <div className="consult-search-row">
          {isVoiceDestinationLayout && (
            <Icon name="search-regular" className="consult-search-icon" aria-hidden="true" />
          )}
          <TextInput
            id="consult-search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(value: string) => handleSearchChange(value)}
            clearAriaLabel={CLEAR_SEARCH}
            aria-label={AI_SUMMARY_MESSAGES.midCall.searchDestinations}
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
                  aria-disabled={destinationActionDisabled}
                  onPress={() => runDestinationAction(consultTransferManualAction.onClick)}
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
      )}

      {!isVoiceDestinationLayout && !isExistingPartyActionLayout ? (
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

      {!isExistingPartyActionLayout && (
        <div
          className="consult-list-container"
          tabIndex={0}
          aria-disabled={destinationActionDisabled || undefined}
          onMouseDown={(event) => event.stopPropagation()}
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
                  number: isVoiceDestinationLayout ? (agent as {dn?: string}).dn : undefined,
                  presence: agent.state?.toLowerCase() === 'available' ? ('active' as const) : ('away' as const),
                })),
                (item) =>
                  runDestinationAction(() =>
                    handleAgentSelection(item.id, item.name, allowParticipantsToInteract, onAgentSelect, logger)
                  )
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
                    ? runDestinationAction(() =>
                        handleQueueSelection(item.id, item.name, allowParticipantsToInteract, onQueueSelect, logger)
                      )
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
                    runDestinationAction(() => onDialNumberSelect(item.number!, allowParticipantsToInteract));
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
                  runDestinationAction(() => onEntryPointSelect(item.id, item.name, allowParticipantsToInteract));
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
          {availableCategories.length === 0 && (
            <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
          )}
        </div>
      )}
      {summary && summary.state !== 'omitted' && (
        <section
          className="consult-transfer-summary"
          data-testid="consult-transfer:summary"
          onFocusCapture={handleSummaryFocusCapture}
          ref={summaryRootRef}
        >
          <Text tagName="h4" className="consult-transfer-summary__heading" type="body-midsize-regular">
            <Icon name="sparkle-filled" className="consult-transfer-summary__sparkle" aria-hidden="true" />
            {summaryHeading}
          </Text>
          <AISummary
            mode="mid-call-initiator"
            state={summary.state}
            requestPending={summary.requestPending}
            controlsDisabled={summary.controlsDisabled || isActionPending}
            selectedFeedback={summary.selectedFeedback}
            content={summary.content}
            contentRevision={summary.contentRevision}
            actionType={summary.actionType}
            onEdit={editSummary}
            onCopy={summary.onCopy}
            onFeedback={summary.onFeedback}
            containingPanelFocusTarget={consultTransferPanelRef}
          />
        </section>
      )}
      {isExistingPartyActionLayout && onExistingPartyConfirm && (
        <div className="consult-existing-party-actions">
          <button
            className="consult-existing-party-confirm ai-summary__button"
            type="button"
            data-testid="consult-transfer:existing-party-confirm"
            aria-disabled={existingPartyConfirmDisabled}
            onClick={() => {
              if (!existingPartyConfirmDisabled) {
                onExistingPartyConfirm();
              }
            }}
          >
            {existingPartyConfirmLabel ?? heading}
          </button>
        </div>
      )}
      {!isExistingPartyActionLayout && isConferenceInProgress && (
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
