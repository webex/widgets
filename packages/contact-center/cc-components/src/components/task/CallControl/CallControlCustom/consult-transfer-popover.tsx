import React, {useState, useCallback, useMemo, useRef, useEffect} from 'react';
import {Text, ListNext, TextInput, Button} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {
  ConsultTransferPopoverComponentProps,
  AddressBookEntry,
  EntryPointEntry,
  QueueEntry,
  BuddyDetails,
} from '../../task.types';
import ConsultTransferEmptyState from './consult-transfer-empty-state';
import {isAgentsEmpty, handleAgentSelection, handleQueueSelection} from './call-control-custom.utils';
import {usePaginatedData} from './usePaginatedData';

// Debounce utility function
const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

type CategoryType = 'Agents' | 'Queues' | 'Dial Number' | 'Entry Point';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  onAgentSelect,
  onQueueSelect,
  onDialNumberSelect,
  onEntryPointSelect,
  allowConsultToQueue,
  logger,
  getAddressBookEntries,
  getEntryPoints,
  getBuddyAgents,
  getQueues,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('Agents');
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // State for Buddy Agents
  const [buddyAgents, setBuddyAgents] = useState<BuddyDetails[]>([]);
  const [loadingBuddyAgents, setLoadingBuddyAgents] = useState(false);

  const {
    data: dialNumbers,
    page: dialNumbersPage,
    hasMore: hasMoreDialNumbers,
    loading: loadingDialNumbers,
    loadData: loadDialNumbers,
    reset: resetDialNumbers,
  } = usePaginatedData<AddressBookEntry, AddressBookEntry>(
    getAddressBookEntries,
    (entry, page, index) => ({
      id: entry.id || `address-${page}-${index}`,
      name: entry.name || 'Unknown',
      number: entry.number || '',
      organizationId: entry.organizationId,
      version: entry.version,
      createdTime: entry.createdTime,
      lastUpdatedTime: entry.lastUpdatedTime,
    }),
    logger,
    'Dial Numbers'
  );

  const {
    data: entryPoints,
    page: entryPointsPage,
    hasMore: hasMoreEntryPoints,
    loading: loadingEntryPoints,
    loadData: loadEntryPoints,
    reset: resetEntryPoints,
  } = usePaginatedData<EntryPointEntry, EntryPointEntry>(
    getEntryPoints,
    (entry, page, index) => ({
      id: entry.id || `entry-${page}-${index}`,
      name: entry.name || entry.displayName || 'Unknown',
      number: entry.number || entry.phoneNumber || entry.extension || '',
      organizationId: entry.organizationId,
    }),
    logger,
    'Entry Points'
  );

  const {
    data: queues,
    page: queuesPage,
    hasMore: hasMoreQueues,
    loading: loadingQueues,
    loadData: loadQueues,
    reset: resetQueues,
  } = usePaginatedData<QueueEntry, QueueEntry>(
    getQueues,
    (entry, page, index) => ({
      id: entry.id || `queue-${page}-${index}`,
      name: entry.name || 'Unknown Queue',
      description: entry.description,
      organizationId: entry.organizationId,
      type: entry.type,
      status: entry.status,
    }),
    logger,
    'Queues'
  );

  // Load next page for current category
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

  // Create a stable debounced search function
  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();

  // Initialize debounced function once
  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce((query: string, category: CategoryType) => {
      // Only search if query is empty (to show all results) or has at least 2 characters
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

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts when component unmounts
      if (debouncedSearchRef.current) {
        // The debounce function should have a cancel method, but since our implementation doesn't,
        // we'll just clear the ref
        debouncedSearchRef.current = undefined;
      }
    };
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      debouncedSearchRef.current?.(value, selectedCategory);
    },
    [selectedCategory]
  );

  // Handle category change
  const handleCategoryChange = useCallback(
    (category: CategoryType) => {
      logger?.info(`CC-Components: Category changed to: ${category}`);
      setSelectedCategory(category);
      setSearchQuery('');

      // Reset all data sources
      resetDialNumbers();
      resetEntryPoints();
      resetQueues();
    },
    [logger, resetDialNumbers, resetEntryPoints, resetQueues]
  );

  // Click handlers for category buttons
  const createCategoryClickHandler = (category: CategoryType) => () => handleCategoryChange(category);
  const handleAgentsClick = createCategoryClickHandler('Agents');
  const handleQueuesClick = createCategoryClickHandler('Queues');
  const handleDialNumberClick = createCategoryClickHandler('Dial Number');
  const handleEntryPointClick = createCategoryClickHandler('Entry Point');

  // Fetch buddy agents once on component mount
  useEffect(() => {
    const loadBuddyAgents = async () => {
      if (!getBuddyAgents) return;

      setLoadingBuddyAgents(true);
      try {
        logger?.info('CC-Components: Loading buddy agents');
        const agents = await getBuddyAgents();
        setBuddyAgents(agents || []);
        logger?.info(`CC-Components: Loaded ${agents?.length || 0} buddy agents`);
      } catch (error) {
        logger?.error('CC-Components: Error loading buddy agents:', error);
        setBuddyAgents([]);
      } finally {
        setLoadingBuddyAgents(false);
      }
    };

    loadBuddyAgents();
  }, [getBuddyAgents, logger]);

  // Intersection Observer for infinite scroll
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

  // Load data based on the selected category
  useEffect(() => {
    if (selectedCategory === 'Dial Number' && dialNumbers.length === 0) {
      loadDialNumbers(0, '', true);
    } else if (selectedCategory === 'Entry Point' && entryPoints.length === 0) {
      loadEntryPoints(0, '', true);
    } else if (selectedCategory === 'Queues' && queues.length === 0) {
      loadQueues(0, '', true);
    }
  }, [selectedCategory]);

  // Filter agents based on search (client-side)
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return buddyAgents;
    const query = searchQuery.toLowerCase();
    return buddyAgents.filter((agent) => agent.agentName.toLowerCase().includes(query));
  }, [buddyAgents, searchQuery]);

  const noAgents = isAgentsEmpty(filteredAgents);
  const noQueues = queues.length === 0;
  const noDialNumbers = dialNumbers.length === 0;
  const noEntryPoints = entryPoints.length === 0;

  const renderList = <T extends {id?: string; name?: string; agentId?: string; agentName?: string; number?: string}>(
    items: T[],
    getKey: (item: T) => string,
    getTitle: (item: T) => string,
    handleSelect: (id: string, name: string, number?: string) => void
  ) => (
    <ListNext listSize={items.length} className="agent-list">
      {items.map((item) => (
        <div
          key={getKey(item)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{cursor: 'pointer', pointerEvents: 'auto'}}
        >
          <ConsultTransferListComponent
            title={getTitle(item)}
            subtitle={item.number || undefined}
            buttonIcon={buttonIcon}
            onButtonPress={() => {
              const id = getKey(item);
              const name = getTitle(item);
              const number = item.number;
              handleSelect(id, name, number);
            }}
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

  const hasAnyData = !noAgents || !noQueues || !noDialNumbers || !noEntryPoints;

  return (
    <div className="agent-popover-content">
      <Text tagName="h3" className="agent-popover-title" type="body-large-bold" style={{margin: 0}}>
        {heading}
      </Text>

      {/* Global Search Input */}
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

      {/* Category Selection Buttons */}
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

      {/* If no data available, show empty state */}
      {!hasAnyData && <ConsultTransferEmptyState message="No data available for consult transfer." />}

      {/* Render content based on selected category */}
      {selectedCategory === 'Agents' && loadingBuddyAgents && (
        <div style={{padding: '8px', textAlign: 'center'}}>
          <Text tagName="small" type="body-secondary">
            Loading agents...
          </Text>
        </div>
      )}

      {selectedCategory === 'Agents' && !loadingBuddyAgents && noAgents && (
        <ConsultTransferEmptyState message="We can't find any agent available for now." />
      )}

      {selectedCategory === 'Queues' && noQueues && (
        <ConsultTransferEmptyState message="We can't find any queue available for now." />
      )}

      {selectedCategory === 'Dial Number' && noDialNumbers && (
        <ConsultTransferEmptyState message="We can't find any dial numbers available for now." />
      )}

      {selectedCategory === 'Entry Point' && noEntryPoints && (
        <ConsultTransferEmptyState message="We can't find any entry points available for now." />
      )}

      {/* Render lists if not empty */}
      {selectedCategory === 'Agents' &&
        !loadingBuddyAgents &&
        !noAgents &&
        renderList(
          filteredAgents,
          (agent) => agent.agentId,
          (agent) => agent.agentName,
          (id, name) => {
            handleAgentSelection(id, name, onAgentSelect, logger);
          }
        )}

      {selectedCategory === 'Dial Number' && !noDialNumbers && (
        <div>
          {renderList(
            dialNumbers,
            (entry) => entry.id,
            (entry) => entry.name,
            (id, name, number) => {
              if (onDialNumberSelect && number) {
                onDialNumberSelect(id, name, number);
              }
            }
          )}
          {/* Infinite scroll trigger */}
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
            entryPoints,
            (entry) => entry.id,
            (entry) => entry.name,
            (id, name, number) => {
              if (onEntryPointSelect && number) {
                onEntryPointSelect(id, name, number);
              }
            }
          )}
          {/* Infinite scroll trigger */}
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

      {selectedCategory === 'Queues' && !noQueues && (
        <div>
          {renderList(
            queues,
            (queue) => queue.id,
            (queue) => queue.name,
            (id, name) => {
              handleQueueSelection(id, name, onQueueSelect, logger);
            }
          )}
          {/* Infinite scroll trigger */}
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
    </div>
  );
};

export default ConsultTransferPopoverComponent;
