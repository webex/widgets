import React from 'react';
import {Text, ListNext, TextInput, Button} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';
import ConsultTransferEmptyState from './consult-transfer-empty-state';
import {isAgentsEmpty, handleAgentSelection, handleQueueSelection} from './call-control-custom.utils';
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
    showEntryPointTab,
    getAddressBookEntries,
    getEntryPoints,
    getQueues,
    logger,
  });

  const noAgents = isAgentsEmpty(buddyAgents, logger);

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

  const noQueues = queuesData.length === 0;
  const noDialNumbers = !showDialNumberTab || dialNumbers.length === 0;
  const noEntryPoints = !showEntryPointTab || entryPoints.length === 0;

  const hasAnyData = !noAgents || !noQueues || !noDialNumbers || !noEntryPoints;

  return (
    <div className="agent-popover-content">
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold">
        {heading}
      </Text>

      <div>
        <TextInput
          id="consult-search"
          placeholder={SEARCH_PLACEHOLDER}
          value={searchQuery}
          onChange={(value: string) => handleSearchChange(value)}
          clearAriaLabel={CLEAR_SEARCH}
          aria-labelledby="consult-search-label"
          className="consult-search-input"
        />
      </div>

      <div className="consult-category-buttons">
        <Button
          variant={selectedCategory === 'Agents' ? 'primary' : 'secondary'}
          size="small"
          onClick={handleAgentsClick}
          className={`consult-category-button-standard ${
            selectedCategory === 'Agents' ? 'consult-category-button-active' : ''
          }`}
        >
          Agents
        </Button>
        <Button
          variant={selectedCategory === 'Queues' ? 'primary' : 'secondary'}
          size="small"
          onClick={handleQueuesClick}
          disabled={!allowConsultToQueue}
          className={`consult-category-button-standard ${
            selectedCategory === 'Queues' ? 'consult-category-button-active' : ''
          }`}
        >
          Queues
        </Button>
        {showDialNumberTab && (
          <Button
            variant={selectedCategory === 'Dial Number' ? 'primary' : 'secondary'}
            size="small"
            onClick={handleDialNumberClick}
            className={`consult-category-button-wide ${
              selectedCategory === 'Dial Number' ? 'consult-category-button-active' : ''
            }`}
          >
            Dial Number
          </Button>
        )}
        {showEntryPointTab && (
          <Button
            variant={selectedCategory === 'Entry Point' ? 'primary' : 'secondary'}
            size="small"
            onClick={handleEntryPointClick}
            className={`consult-category-button-wide ${
              selectedCategory === 'Entry Point' ? 'consult-category-button-active' : ''
            }`}
          >
            Entry Point
          </Button>
        )}
      </div>

      {!hasAnyData && <ConsultTransferEmptyState message={NO_DATA_AVAILABLE_CONSULT_TRANSFER} />}

      {selectedCategory === 'Agents' &&
        !noAgents &&
        renderList(
          buddyAgents.map((agent) => ({id: agent.agentId, name: agent.agentName})),
          (item) => handleAgentSelection(item.id, item.name, onAgentSelect, logger)
        )}

      {selectedCategory === 'Queues' && !noQueues && (
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
      )}

      {showDialNumberTab && selectedCategory === 'Dial Number' && !noDialNumbers && (
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
      )}

      {showEntryPointTab && selectedCategory === 'Entry Point' && !noEntryPoints && (
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
      )}
    </div>
  );
};

export default ConsultTransferPopoverComponent;
