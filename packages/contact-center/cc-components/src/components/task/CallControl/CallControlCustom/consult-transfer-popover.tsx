import React, {useState, useRef, useEffect, useCallback} from 'react';
import {Text, ListNext, TextInput, Button} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps} from '../../task.types';
import {AddressBookEntry, EntryPointRecord, ContactServiceQueue} from '@webex/cc-store';
import ConsultTransferEmptyState from './consult-transfer-empty-state';
import {
  isAgentsEmpty,
  handleAgentSelection,
  handleQueueSelection,
  debounce,
  usePaginatedData,
} from './call-control-custom.utils';
type CategoryType = 'Agents' | 'Queues' | 'Dial Number' | 'Entry Point';

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
  logger,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('Agents');
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const noAgents = isAgentsEmpty(buddyAgents, logger);

  const renderList = <T extends {id: string; name: string; number?: string}>(
    items: T[],
    onButtonPress: (item: T) => void
  ) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item) => (
        <div key={item.id} onMouseDown={(e) => e.stopPropagation()} style={{cursor: 'pointer', pointerEvents: 'auto'}}>
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

  const {
    data: dialNumbers,
    page: dialNumbersPage,
    hasMore: hasMoreDialNumbers,
    loading: loadingDialNumbers,
    loadData: loadDialNumbers,
    reset: resetDialNumbers,
  } = usePaginatedData<AddressBookEntry, AddressBookEntry>(
    getAddressBookEntries,
    (entry) => ({
      id: entry.id,
      name: entry.name,
      number: entry.number,
      organizationId: entry.organizationId,
      version: entry.version,
      createdTime: entry.createdTime,
      lastUpdatedTime: entry.lastUpdatedTime,
    }),
    'Dial Numbers',
    logger
  );

  const {
    data: entryPoints,
    page: entryPointsPage,
    hasMore: hasMoreEntryPoints,
    loading: loadingEntryPoints,
    loadData: loadEntryPoints,
    reset: resetEntryPoints,
  } = usePaginatedData<EntryPointRecord, {id: string; name: string}>(
    getEntryPoints,
    (entry) => ({id: entry.id, name: entry.name}),
    'Entry Points',
    logger
  );

  const {
    data: queuesData,
    page: queuesPage,
    hasMore: hasMoreQueues,
    loading: loadingQueues,
    loadData: loadQueues,
    reset: resetQueues,
  } = usePaginatedData<ContactServiceQueue, {id: string; name: string; description?: string}>(
    getQueues,
    (entry) => ({id: entry.id, name: entry.name, description: entry.description}),
    'Queues',
    logger
  );

  const loadNextPage = useCallback(() => {
    if (selectedCategory === 'Dial Number' && hasMoreDialNumbers && !loadingDialNumbers) {
      loadDialNumbers(dialNumbersPage + 1, searchQuery);
    } else if (selectedCategory === 'Entry Point' && hasMoreEntryPoints && !loadingEntryPoints) {
      loadEntryPoints(entryPointsPage + 1, searchQuery);
    } else if (selectedCategory === 'Queues' && hasMoreQueues && !loadingQueues) {
      loadQueues(queuesPage + 1, searchQuery);
    }
  }, [
    selectedCategory,
    hasMoreDialNumbers,
    hasMoreEntryPoints,
    hasMoreQueues,
    loadingDialNumbers,
    loadingEntryPoints,
    loadingQueues,
    dialNumbersPage,
    entryPointsPage,
    queuesPage,
    searchQuery,
    loadDialNumbers,
    loadEntryPoints,
    loadQueues,
  ]);

  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();
  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce((query: string, category: CategoryType) => {
      if (query.length === 0 || query.length >= 2) {
        if (category === 'Dial Number') {
          loadDialNumbers(0, query, true);
        } else if (category === 'Entry Point') {
          loadEntryPoints(0, query, true);
        } else if (category === 'Queues') {
          loadQueues(0, query, true);
        }
      }
    }, 500);
  }

  useEffect(() => {
    return () => {
      debouncedSearchRef.current = undefined;
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (selectedCategory !== 'Agents') {
        debouncedSearchRef.current?.(value, selectedCategory);
      }
    },
    [selectedCategory]
  );

  const handleCategoryChange = useCallback(
    (category: CategoryType) => {
      setSelectedCategory(category);
      setSearchQuery('');
      resetDialNumbers();
      resetEntryPoints();
      resetQueues();
    },
    [resetDialNumbers, resetEntryPoints, resetQueues]
  );

  const createCategoryClickHandler = (category: CategoryType) => () => handleCategoryChange(category);
  const handleAgentsClick = createCategoryClickHandler('Agents');
  const handleQueuesClick = createCategoryClickHandler('Queues');
  const handleDialNumberClick = createCategoryClickHandler('Dial Number');
  const handleEntryPointClick = createCategoryClickHandler('Entry Point');

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadNextPage();
        }
      },
      {threshold: 1.0}
    );
    observer.observe(loadMoreElement);
    return () => {
      observer.unobserve(loadMoreElement);
    };
  }, [loadNextPage]);

  useEffect(() => {
    if (selectedCategory === 'Dial Number' && dialNumbers.length === 0) {
      loadDialNumbers(0, '', true);
    } else if (selectedCategory === 'Entry Point' && entryPoints.length === 0) {
      loadEntryPoints(0, '', true);
    } else if (selectedCategory === 'Queues' && queuesData.length === 0) {
      loadQueues(0, '', true);
    }
  }, [selectedCategory]);

  const noQueues = queuesData.length === 0;
  const noDialNumbers = dialNumbers.length === 0;
  const noEntryPoints = entryPoints.length === 0;

  const hasAnyData = !noAgents || !noQueues || !noDialNumbers || !noEntryPoints;

  return (
    <div className="agent-popover-content">
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold" style={{margin: 0}}>
        {heading}
      </Text>

      <div style={{margin: '8px 0'}}>
        <TextInput
          id="consult-search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(value: string) => handleSearchChange(value)}
          clearAriaLabel="Clear search"
          aria-labelledby="consult-search-label"
          style={{width: '100%'}}
        />
      </div>

      <div style={{margin: '8px 0', display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap'}}>
        <Button
          variant={selectedCategory === 'Agents' ? 'primary' : 'secondary'}
          size="small"
          onClick={handleAgentsClick}
          style={{minWidth: '80px'}}
        >
          Agents
        </Button>
        <Button
          variant={selectedCategory === 'Queues' ? 'primary' : 'secondary'}
          size="small"
          onClick={handleQueuesClick}
          disabled={!allowConsultToQueue}
          style={{minWidth: '80px'}}
        >
          Queues
        </Button>
        <Button
          variant={selectedCategory === 'Dial Number' ? 'primary' : 'secondary'}
          size="small"
          onClick={handleDialNumberClick}
          style={{minWidth: '100px'}}
        >
          Dial Number
        </Button>
        <Button
          variant={selectedCategory === 'Entry Point' ? 'primary' : 'secondary'}
          size="small"
          onClick={handleEntryPointClick}
          style={{minWidth: '100px'}}
        >
          Entry Point
        </Button>
      </div>

      {!hasAnyData && <ConsultTransferEmptyState message="No data available for consult transfer." />}

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
            <div
              ref={loadMoreRef}
              style={{
                padding: '8px',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loadingQueues ? (
                <Text tagName="small" type="body-secondary">
                  Loading more queues...
                </Text>
              ) : (
                <Text tagName="small" type="body-secondary">
                  Scroll to load more
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      {selectedCategory === 'Dial Number' && !noDialNumbers && (
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
            <div
              ref={loadMoreRef}
              style={{
                padding: '8px',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loadingDialNumbers ? (
                <Text tagName="small" type="body-secondary">
                  Loading more dial numbers...
                </Text>
              ) : (
                <Text tagName="small" type="body-secondary">
                  Scroll to load more
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      {selectedCategory === 'Entry Point' && !noEntryPoints && (
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
            <div
              ref={loadMoreRef}
              style={{
                padding: '8px',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loadingEntryPoints ? (
                <Text tagName="small" type="body-secondary">
                  Loading more entry points...
                </Text>
              ) : (
                <Text tagName="small" type="body-secondary">
                  Scroll to load more
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
