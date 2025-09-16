import React, {useState, useCallback, useMemo, useRef, useEffect} from 'react';
import {Text, ListNext, TextInput, Button} from '@momentum-ui/react-collaboration';
import ConsultTransferListComponent from './consult-transfer-list-item';
import {ConsultTransferPopoverComponentProps, AddressBookEntry} from '../../task.types';
import ConsultTransferEmptyState from './consult-transfer-empty-state';
import {isAgentsEmpty, isQueuesEmpty, handleAgentSelection, handleQueueSelection} from './call-control-custom.utils';

// Types for entry point entries
interface EntryPointEntry {
  id: string;
  name: string;
  number: string;
}

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
};

type CategoryType = 'Agents' | 'Queues' | 'Dial Number' | 'Entry Point';

const ConsultTransferPopoverComponent: React.FC<ConsultTransferPopoverComponentProps> = ({
  heading,
  buttonIcon,
  buddyAgents,
  queues,
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

  // State for Dial Numbers infinite scroll
  const [dialNumbers, setDialNumbers] = useState<AddressBookEntry[]>([]);
  const [dialNumbersPage, setDialNumbersPage] = useState(0);
  const [hasMoreDialNumbers, setHasMoreDialNumbers] = useState(true);
  const [loadingDialNumbers, setLoadingDialNumbers] = useState(false);

  // State for Entry Points infinite scroll
  const [entryPoints, setEntryPoints] = useState<EntryPointEntry[]>([]);
  const [entryPointsPage, setEntryPointsPage] = useState(0);
  const [hasMoreEntryPoints, setHasMoreEntryPoints] = useState(true);
  const [loadingEntryPoints, setLoadingEntryPoints] = useState(false);

  // Load initial data for Dial Numbers with proper pagination and search
  const loadDialNumbers = useCallback(
    async (page = 0, search = '', reset = false) => {
      setLoadingDialNumbers(true);
      try {
        // Build API parameters for pagination and search
        const apiParams = {
          page,
          pageSize: 25, // Use smaller page size for better UX
          ...(search && {search}), // Only include search if provided
        };

        logger?.info(`CC-Components: Loading address book entries - page: ${page}, search: "${search}"`);
        const response = await getAddressBookEntries(apiParams);

        // Ensure response has expected structure
        if (!response || !response.data) {
          logger?.error('CC-Components: Invalid response from getAddressBookEntries');
          setDialNumbers([]);
          setHasMoreDialNumbers(false);
          return;
        }

        logger?.info(`CC-Components: Loaded ${response.data.length} address book entries for page ${page}`);

        // Transform the entries to match our expected format
        const transformedEntries: AddressBookEntry[] = response.data.map((entry, index) => ({
          id: entry.id || `address-${page}-${index}`,
          name: entry.name || 'Unknown',
          number: entry.number || '',
          organizationId: entry.organizationId,
          version: entry.version,
          createdTime: entry.createdTime,
          lastUpdatedTime: entry.lastUpdatedTime,
        }));

        // Update state based on whether this is a reset (new search/category) or append (pagination)
        if (reset || page === 0) {
          setDialNumbers(transformedEntries);
        } else {
          setDialNumbers((prev) => [...prev, ...transformedEntries]);
        }

        // Update pagination state based on API response
        const currentPage = response.meta?.page ?? page;
        const totalPages = response.meta?.totalPages ?? 1;

        setDialNumbersPage(currentPage);
        setHasMoreDialNumbers(currentPage < totalPages - 1);

        logger?.info(
          `CC-Components: Pagination state - current: ${currentPage}, total: ${totalPages}, hasMore: ${currentPage < totalPages - 1}`
        );
      } catch (error) {
        logger?.error('CC-Components: Error loading dial numbers:', error);
        if (reset || page === 0) {
          setDialNumbers([]);
        }
        setHasMoreDialNumbers(false);
      } finally {
        setLoadingDialNumbers(false);
      }
    },
    [getAddressBookEntries, logger]
  );

  // Load initial data for Entry Points
  const loadEntryPoints = useCallback(
    async (page = 0, search = '', reset = false) => {
      setLoadingEntryPoints(true);
      try {
        const entries = await getEntryPoints();

        // Ensure entries is an array before proceeding
        const entriesArray = Array.isArray(entries) ? entries : [];
        logger?.info(`CC-Components: Loaded ${entriesArray.length} entry points`);

        // Transform the entries to match our expected format
        const transformedEntries: EntryPointEntry[] = entriesArray.map((entry: any, index: number) => ({
          id: entry.id || `entry-${index}`,
          name: entry.name || entry.displayName || 'Unknown',
          number: entry.number || entry.phoneNumber || entry.extension || '',
        }));

        // Apply search filter if provided
        let filteredEntries = transformedEntries;
        if (search) {
          const query = search.toLowerCase();
          filteredEntries = transformedEntries.filter(
            (entry) => entry.name.toLowerCase().includes(query) || entry.number.includes(query)
          );
        }

        // For now, we'll load all entries since the API doesn't support pagination
        // In a real implementation, you might want to implement client-side pagination
        setEntryPoints(filteredEntries);
        setHasMoreEntryPoints(false); // No pagination for now
        setEntryPointsPage(page);
      } catch (error) {
        logger?.error('Error loading entry points:', error);
        setEntryPoints([]);
        setHasMoreEntryPoints(false);
      } finally {
        setLoadingEntryPoints(false);
      }
    },
    [getEntryPoints, logger]
  );

  // Load next page for current category
  const loadNextPage = useCallback(() => {
    if (selectedCategory === 'Dial Number' && hasMoreDialNumbers && !loadingDialNumbers) {
      loadDialNumbers(dialNumbersPage + 1, searchQuery, false);
    } else if (selectedCategory === 'Entry Point' && hasMoreEntryPoints && !loadingEntryPoints) {
      loadEntryPoints(entryPointsPage + 1, searchQuery, false);
    }
  }, [
    selectedCategory,
    hasMoreDialNumbers,
    hasMoreEntryPoints,
    loadingDialNumbers,
    loadingEntryPoints,
    dialNumbersPage,
    entryPointsPage,
    searchQuery,
    loadDialNumbers,
    loadEntryPoints,
  ]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string, category: CategoryType) => {
      if (category === 'Dial Number') {
        setDialNumbersPage(0); // Reset pagination
        setHasMoreDialNumbers(true); // Reset pagination state
        loadDialNumbers(0, query, true);
      } else if (category === 'Entry Point') {
        setEntryPointsPage(0); // Reset pagination
        setHasMoreEntryPoints(true); // Reset pagination state
        loadEntryPoints(0, query, true);
      }
    }, 300),
    [loadDialNumbers, loadEntryPoints]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // For categories that support API search, use debounced search
      if (selectedCategory === 'Dial Number' || selectedCategory === 'Entry Point') {
        debouncedSearch(value, selectedCategory);
      }
      // For Agents and Queues, trigger fresh API calls if search functions are available
      else if (selectedCategory === 'Agents' && getBuddyAgents) {
        // Reset search query and let the filtered memoized result handle client-side filtering
        // In future, this could be enhanced to use getBuddyAgents(value) for server-side search
      } else if (selectedCategory === 'Queues' && getQueues) {
        // Reset search query and let the filtered memoized result handle client-side filtering
        // In future, this could be enhanced to use getQueues(value) for server-side search
      }
    },
    [selectedCategory, debouncedSearch, getBuddyAgents, getQueues]
  );

  // Handle category change
  const handleCategoryChange = useCallback(
    (category: CategoryType) => {
      console.log(`Category change attempted: ${category}`); // Console log for immediate debugging
      logger?.info(`CC-Components: Category changed to: ${category}`);
      setSelectedCategory(category);
      setSearchQuery('');

      // Reset pagination state for all categories
      setDialNumbersPage(0);
      setHasMoreDialNumbers(true);
      setEntryPointsPage(0);
      setHasMoreEntryPoints(true);

      // Clear existing data and let useEffect handle loading
      if (category === 'Dial Number') {
        setDialNumbers([]); // Clear existing data
      } else if (category === 'Entry Point') {
        setEntryPoints([]); // Clear existing data
      }
    },
    [logger]
  );

  // Alternative click handlers for individual radio buttons
  const handleAgentsClick = useCallback(() => {
    console.log('Agents clicked directly');
    handleCategoryChange('Agents');
  }, [handleCategoryChange]);

  const handleQueuesClick = useCallback(() => {
    console.log('Queues clicked directly');
    handleCategoryChange('Queues');
  }, [handleCategoryChange]);

  const handleDialNumberClick = useCallback(() => {
    console.log('Dial Number clicked directly');
    handleCategoryChange('Dial Number');
  }, [handleCategoryChange]);

  const handleEntryPointClick = useCallback(() => {
    console.log('Entry Point clicked directly');
    handleCategoryChange('Entry Point');
  }, [handleCategoryChange]);

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

  // Load initial data when component mounts or category changes
  useEffect(() => {
    if (selectedCategory === 'Dial Number' && !loadingDialNumbers) {
      // Always load if we don't have data OR if we just switched to this category
      if (dialNumbers.length === 0) {
        logger?.info('CC-Components: Loading dial numbers for first time or after category switch');
        loadDialNumbers(0, '', true);
      }
    } else if (selectedCategory === 'Entry Point' && !loadingEntryPoints) {
      // Always load if we don't have data OR if we just switched to this category
      if (entryPoints.length === 0) {
        logger?.info('CC-Components: Loading entry points for first time or after category switch');
        loadEntryPoints(0, '', true);
      }
    }
  }, [
    selectedCategory,
    dialNumbers.length,
    entryPoints.length,
    loadDialNumbers,
    loadEntryPoints,
    loadingDialNumbers,
    loadingEntryPoints,
    logger,
  ]);

  // Filter agents based on search (client-side)
  const filteredAgents = useMemo(() => {
    if (selectedCategory !== 'Agents' || !searchQuery) {
      return buddyAgents;
    }
    const query = searchQuery.toLowerCase();
    return buddyAgents.filter((agent) => agent.agentName.toLowerCase().includes(query));
  }, [buddyAgents, searchQuery, selectedCategory]);

  // Filter queues based on search (client-side for now)
  const filteredQueues = useMemo(() => {
    if (selectedCategory !== 'Queues' || !searchQuery || !queues) {
      return queues || [];
    }
    const query = searchQuery.toLowerCase();
    return queues.filter((queue) => queue.name.toLowerCase().includes(query));
  }, [queues, searchQuery, selectedCategory]);

  const noAgents = isAgentsEmpty(filteredAgents);
  const noQueues = isQueuesEmpty(filteredQueues);
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

  // Debug logging
  useEffect(() => {
    logger?.info(`CC-Components: Debug - selectedCategory: ${selectedCategory}`);
    logger?.info(`CC-Components: Debug - buddyAgents: ${JSON.stringify(buddyAgents?.slice(0, 2) || [])}`);
    logger?.info(`CC-Components: Debug - queues: ${JSON.stringify(queues?.slice(0, 2) || [])}`);
    logger?.info(`CC-Components: Debug - dialNumbers: ${JSON.stringify(dialNumbers.slice(0, 2))}`);
    logger?.info(`CC-Components: Debug - entryPoints: ${JSON.stringify(entryPoints.slice(0, 2))}`);
    logger?.info(`CC-Components: Debug - hasAnyData: ${hasAnyData}`);
  }, [selectedCategory, buddyAgents, queues, dialNumbers, entryPoints, hasAnyData, logger]);

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
      {selectedCategory === 'Agents' && noAgents && (
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
        !noAgents &&
        renderList(
          filteredAgents,
          (agent) => agent.agentId,
          (agent) => agent.agentName,
          (id, name) => {
            handleAgentSelection(id, name, onAgentSelect, logger);
          }
        )}

      {selectedCategory === 'Queues' &&
        !noQueues &&
        renderList(
          filteredQueues,
          (queue) => queue.id,
          (queue) => queue.name,
          (id, name) => {
            handleQueueSelection(id, name, onQueueSelect, logger);
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
    </div>
  );
};

export default ConsultTransferPopoverComponent;
