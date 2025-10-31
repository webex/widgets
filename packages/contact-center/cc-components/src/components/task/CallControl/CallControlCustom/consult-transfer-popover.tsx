import React from 'react';
import {Text, ListNext, TextInput, Button, ButtonCircle, TooltipNext} from '@momentum-ui/react-collaboration';
import {Icon} from '@momentum-design/components/dist/react';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';
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
  LOADING_MORE_QUEUES,
  LOADING_MORE_DIAL_NUMBERS,
  LOADING_MORE_ENTRY_POINTS,
  NO_DATA_AVAILABLE_CONSULT_TRANSFER,
} from '../../constants';
import {CATEGORY_AGENTS, CATEGORY_DIAL_NUMBER, CATEGORY_ENTRY_POINT, CATEGORY_QUEUES} from '../../task.types';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  getAddressBookEntries,
  getEntryPoints,
  getQueues,
  onAgentSelect,
  onQueueSelect,
  onDialNumberSelect,
  onEntryPointSelect,
  allowConsultToQueue,
  consultTransferOptions,
  logger,
}) => {
  const {showDialNumberTab = true, showEntryPointTab = true} = consultTransferOptions || {};
  const isEntryPointTabVisible = showEntryPointTab && heading === 'Consult';
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
    handleAgentsClick,
    handleQueuesClick,
    handleDialNumberClick,
    handleEntryPointClick,
  } = useConsultTransferPopover({
    showDialNumberTab,
    showEntryPointTab: isEntryPointTabVisible,
    getAddressBookEntries,
    getEntryPoints,
    getQueues,
    logger,
  });

  const renderList = <T extends {id: string; name: string; number?: string}>(
    items: T[],
    onButtonPress: (item: T) => void
  ) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item) => (
        <div key={item.id} onMouseDown={(e) => e.stopPropagation()} className="consult-list-item-wrapper">
          <ConsultTransferListComponent
            title={item.name}
            subtitle={item.number}
            buttonIcon={buttonIcon}
            onButtonPress={() => onButtonPress(item)}
            logger={logger}
          />
        </div>
      ))}
      {items.length === 0 && (
        <Text tagName="small" type="body-secondary">
          No {selectedCategory.toLowerCase()} found
        </Text>
      )}
    </ListNext>
  );

  const noQueues = !allowConsultToQueue || queuesData.length === 0;
  const noDialNumbers = !showDialNumberTab || dialNumbers.length === 0;
  const noEntryPoints = !isEntryPointTabVisible || entryPoints.length === 0;

  const consultTransferManualAction = shouldAddConsultTransferAction(
    selectedCategory,
    isEntryPointTabVisible,
    searchQuery,
    entryPoints,
    onDialNumberSelect,
    onEntryPointSelect
  );

  return (
    <div className="agent-popover-content">
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold">
        {heading}
      </Text>

      <div className="consult-search-row">
        <TextInput
          id="consult-search"
          placeholder={SEARCH_PLACEHOLDER}
          value={searchQuery}
          onChange={(value: string) => handleSearchChange(value)}
          clearAriaLabel={CLEAR_SEARCH}
          aria-labelledby="consult-search-label"
          className="consult-search-input"
        />
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

      <div className="consult-category-buttons">
        <Button
          variant={selectedCategory === CATEGORY_AGENTS ? 'primary' : 'secondary'}
          size="small"
          onClick={handleAgentsClick}
          className={`consult-category-button-standard ${
            selectedCategory === CATEGORY_AGENTS ? 'consult-category-button-active' : ''
          }`}
        >
          {CATEGORY_AGENTS}
        </Button>
        {allowConsultToQueue && (
          <Button
            variant={selectedCategory === CATEGORY_QUEUES ? 'primary' : 'secondary'}
            size="small"
            onClick={handleQueuesClick}
            className={`consult-category-button-standard ${
              selectedCategory === CATEGORY_QUEUES ? 'consult-category-button-active' : ''
            }`}
          >
            {CATEGORY_QUEUES}
          </Button>
        )}
        {showDialNumberTab && (
          <Button
            variant={selectedCategory === CATEGORY_DIAL_NUMBER ? 'primary' : 'secondary'}
            size="small"
            onClick={handleDialNumberClick}
            className={`consult-category-button-wide ${
              selectedCategory === CATEGORY_DIAL_NUMBER ? 'consult-category-button-active' : ''
            }`}
          >
            {CATEGORY_DIAL_NUMBER}
          </Button>
        )}
        {isEntryPointTabVisible && (
          <Button
            variant={selectedCategory === CATEGORY_ENTRY_POINT ? 'primary' : 'secondary'}
            size="small"
            onClick={handleEntryPointClick}
            className={`consult-category-button-wide ${
              selectedCategory === CATEGORY_ENTRY_POINT ? 'consult-category-button-active' : ''
            }`}
          >
            {CATEGORY_ENTRY_POINT}
          </Button>
        )}
      </div>

      {selectedCategory === 'Agents' &&
        (getAgentsForDisplay(selectedCategory, buddyAgents, searchQuery).length === 0 ? (
          <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
        ) : (
          renderList(
            getAgentsForDisplay(selectedCategory, buddyAgents, searchQuery).map((agent) => ({
              id: agent.agentId,
              name: agent.agentName,
            })),
            (item) => handleAgentSelection(item.id, item.name, onAgentSelect, logger)
          )
        ))}

      {selectedCategory === 'Queues' &&
        (noQueues ? (
          <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
        ) : (
          <div>
            {renderList(
              queuesData.map((q) => ({id: q.id, name: q.name})),
              (item) => handleQueueSelection(item.id, item.name, onQueueSelect, logger)
            )}
            {hasMoreQueues && (
              <div ref={loadMoreRef} className="consult-load-more">
                {loadingQueues ? (
                  <Text tagName="small" type="body-secondary">
                    {LOADING_MORE_QUEUES}
                  </Text>
                ) : (
                  <Text tagName="small" type="body-secondary">
                    {SCROLL_TO_LOAD_MORE}
                  </Text>
                )}
              </div>
            )}
          </div>
        ))}

      {showDialNumberTab &&
        selectedCategory === CATEGORY_DIAL_NUMBER &&
        (noDialNumbers ? (
          <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
        ) : (
          <div>
            {renderList(
              dialNumbers.map((d) => ({id: d.id, name: d.name, number: d.number})),
              (item) => {
                if (item.number) {
                  if (onDialNumberSelect) {
                    onDialNumberSelect(item.number);
                  }
                }
              }
            )}
            {hasMoreDialNumbers && (
              <div ref={loadMoreRef} className="consult-load-more">
                {loadingDialNumbers ? (
                  <Text tagName="small" type="body-secondary">
                    {LOADING_MORE_DIAL_NUMBERS}
                  </Text>
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
        (noEntryPoints ? (
          <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />
        ) : (
          <div>
            {renderList(
              entryPoints.map((e) => ({id: e.id, name: e.name})),
              (item) => {
                if (onEntryPointSelect) {
                  onEntryPointSelect(item.id, item.name);
                }
              }
            )}
            {hasMoreEntryPoints && (
              <div ref={loadMoreRef} className="consult-load-more">
                {loadingEntryPoints ? (
                  <Text tagName="small" type="body-secondary">
                    {LOADING_MORE_ENTRY_POINTS}
                  </Text>
                ) : (
                  <Text tagName="small" type="body-secondary">
                    {SCROLL_TO_LOAD_MORE}
                  </Text>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default ConsultTransferPopoverComponent;
