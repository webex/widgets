import {useCallback, useEffect, useRef, useState} from 'react';
import {AddressBookEntry, ContactServiceQueue, EntryPointRecord, ILogger} from '@webex/cc-store';
import {FetchPaginatedList} from '../../task.types';
import {debounce} from './call-control-custom.utils';

type TransformPaginatedData<T, U> = (item: T, page: number, index: number) => U;

export const usePaginatedData = <T, U>(
  fetchFunction: FetchPaginatedList<T> | undefined,
  transformFunction: TransformPaginatedData<T, U>,
  categoryName: string,
  logger?: ILogger
) => {
  const [data, setData] = useState<U[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    async (currentPage = 0, search = '', reset = false) => {
      if (!fetchFunction) {
        setData([]);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const apiParams: {page: number; pageSize: number; search?: string} = {
          page: currentPage,
          pageSize: 25,
        };

        if (search && search.trim()) {
          apiParams.search = search;
        }

        logger?.info(`CC-Components: Loading ${categoryName} - page: ${currentPage}, search: "${search}"`);
        const response = await fetchFunction(apiParams);

        if (!response || !response.data) {
          logger?.error(`CC-Components: Invalid response from fetch function for ${categoryName}`);
          if (reset || currentPage === 0) {
            setData([]);
          }
          setHasMore(false);
          return;
        }

        logger?.info(`CC-Components: Loaded ${response.data.length} ${categoryName} for page ${currentPage}`);

        const transformedEntries = response.data.map((entry, index) => transformFunction(entry, currentPage, index));

        if (reset || currentPage === 0) {
          setData(transformedEntries);
        } else {
          setData((prev) => [...prev, ...transformedEntries]);
        }

        const newPage = response.meta?.page ?? currentPage;
        const totalPages = response.meta?.totalPages ?? 1;

        setPage(newPage);
        setHasMore(newPage < totalPages - 1);

        logger?.info(
          `CC-Components: ${categoryName} pagination state - current: ${newPage}, total: ${totalPages}, hasMore: ${newPage < totalPages - 1}`
        );
      } catch (error) {
        logger?.error(`CC-Components: Error loading ${categoryName}:`, error);
        if (reset || currentPage === 0) {
          setData([]);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchFunction, transformFunction, logger, categoryName]
  );

  const reset = useCallback(() => {
    setData([]);
    setPage(0);
    setHasMore(true);
  }, []);

  return {data, page, hasMore, loading, loadData, reset};
};

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
