import {useCallback, useEffect, useRef, useState} from 'react';
import {AddressBookEntry, ContactServiceQueue, EntryPointRecord, ILogger} from '@webex/cc-store';
import {FetchPaginatedList} from '../../task.types';
import {debounce, usePaginatedData} from './call-control-custom.utils';

export type CategoryType = 'Agents' | 'Queues' | 'Dial Number' | 'Entry Point';

type UseConsultTransferParams = {
  showDialNumberTab: boolean;
  showEntryPointTab: boolean;
  getAddressBookEntries?: FetchPaginatedList<AddressBookEntry>;
  getEntryPoints?: FetchPaginatedList<EntryPointRecord>;
  getQueues?: FetchPaginatedList<ContactServiceQueue>;
  logger?: ILogger;
};

export function useConsultTransferPopover({
  showDialNumberTab,
  showEntryPointTab,
  getAddressBookEntries,
  getEntryPoints,
  getQueues,
  logger,
}: UseConsultTransferParams) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('Agents');
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
    if (selectedCategory === 'Dial Number' && showDialNumberTab && dialNumbers.length === 0) {
      loadDialNumbers(0, '', true);
    } else if (selectedCategory === 'Entry Point' && showEntryPointTab && entryPoints.length === 0) {
      loadEntryPoints(0, '', true);
    } else if (selectedCategory === 'Queues' && queuesData.length === 0) {
      loadQueues(0, '', true);
    }
  }, [selectedCategory]);

  return {
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
  };
}
