import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AddressBookEntry,
  ContactServiceQueue,
  EntryPointRecord,
  ILogger,
  FetchPaginatedList,
  PaginatedListParams,
  TransformPaginatedData,
} from '@webex/cc-store';
import {
  CategoryType,
  UseConsultTransferParams,
  CATEGORY_DIAL_NUMBER,
  CATEGORY_ENTRY_POINT,
  CATEGORY_QUEUES,
  CATEGORY_AGENTS,
} from '../../task.types';
import {debounce} from './call-control-custom.utils';
import {DEFAULT_PAGE_SIZE} from '../../constants';

/**
 * React hook to load, transform and manage paginated data with optional search.
 *
 * @template T - The item type returned by the provided `fetchFunction` (raw API/entity).
 * @template U - The transformed item type stored internally and returned to consumers.
 * @param fetchFunction - Fetcher that returns a paginated list of items of type T.
 * @param transformFunction - Mapper that converts each T into U for UI consumption.
 * @param categoryName - Human-readable name used for logging/telemetry.
 * @param logger - Optional logger instance for diagnostics.
 * @returns An object containing the transformed data (U[]), pagination state and helpers.
 */
export const usePaginatedData = <T, U>(
  fetchFunction: FetchPaginatedList<T> | undefined,
  transformFunction: TransformPaginatedData<T, U>,
  categoryName: string,
  logger?: ILogger
) => {
  const MODULE = 'cc-components#consult-transfer-popover-hooks.ts';
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
        const apiParams: PaginatedListParams = {
          page: currentPage,
          pageSize: DEFAULT_PAGE_SIZE,
        };

        if (search && search.trim()) {
          apiParams.search = search;
        }

        logger?.info(`CC-Components: Loading ${categoryName}`, {
          module: MODULE,
          method: 'usePaginatedData#loadData',
        });
        const response = await fetchFunction(apiParams);

        if (!response || !response.data) {
          logger?.error(`CC-Components: No data received from fetch function for ${categoryName}`, {
            module: MODULE,
            method: 'usePaginatedData#loadData',
          });
          if (reset || currentPage === 0) {
            setData([]);
          }
          setHasMore(false);
          return;
        }

        logger?.info(`CC-Components: Loaded ${response.data.length} ${categoryName}`, {
          module: MODULE,
          method: 'usePaginatedData#loadData',
        });

        const transformedEntries = response.data.map((entry, index) => transformFunction(entry, currentPage, index));

        if (reset || currentPage === 0) {
          setData(transformedEntries);
        } else {
          setData((prev) => [...prev, ...transformedEntries]);
        }

        const newPage = response.meta?.page ?? currentPage;
        const totalPages = response.meta?.totalPages ?? 0;

        setPage(newPage);
        setHasMore(totalPages > 0 && newPage < totalPages - 1);

        logger?.info('CC-Components: Pagination state updated', {
          module: MODULE,
          method: 'usePaginatedData#loadData',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger?.error(`CC-Components: Error loading ${categoryName}`, {
          module: MODULE,
          method: 'usePaginatedData#loadData',
          error: errorMessage,
        });
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

export function useConsultTransferPopover({
  showDialNumberTab,
  showEntryPointTab,
  getAddressBookEntries,
  getEntryPoints,
  getQueues,
  logger,
}: UseConsultTransferParams) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(CATEGORY_AGENTS);
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
    CATEGORY_DIAL_NUMBER,
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
    CATEGORY_ENTRY_POINT,
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
    CATEGORY_QUEUES,
    logger
  );

  const loadNextPage = useCallback(() => {
    if (!canLoadCategory(selectedCategory)) return;
    const nextPage = currentPageForCategory(selectedCategory) + 1;
    loadCategory(selectedCategory, nextPage, searchQuery);
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
    const triggerSearch = (query: string, category: CategoryType) => {
      if (query.length === 0 || query.length >= 2) {
        loadCategory(category, 0, query, true);
      }
    };
    debouncedSearchRef.current = debounce(triggerSearch, 500);
  }

  useEffect(() => {
    return () => {
      debouncedSearchRef.current = undefined;
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (selectedCategory !== CATEGORY_AGENTS) {
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
  const handleAgentsClick = createCategoryClickHandler(CATEGORY_AGENTS);
  const handleQueuesClick = createCategoryClickHandler(CATEGORY_QUEUES);
  const handleDialNumberClick = createCategoryClickHandler(CATEGORY_DIAL_NUMBER);
  const handleEntryPointClick = createCategoryClickHandler(CATEGORY_ENTRY_POINT);

  // Helper: determines if the given category can load next page now
  const canLoadCategory = (category: CategoryType): boolean => {
    if (category === CATEGORY_DIAL_NUMBER) return hasMoreDialNumbers && !loadingDialNumbers;
    if (category === CATEGORY_ENTRY_POINT) return hasMoreEntryPoints && !loadingEntryPoints;
    if (category === CATEGORY_QUEUES) return hasMoreQueues && !loadingQueues;
    return false;
  };

  // Helper: gets current page number for the given category
  const currentPageForCategory = (category: CategoryType): number => {
    if (category === CATEGORY_DIAL_NUMBER) return dialNumbersPage;
    if (category === CATEGORY_ENTRY_POINT) return entryPointsPage;
    if (category === CATEGORY_QUEUES) return queuesPage;
    return 0;
  };

  // Helper: invokes appropriate loader for the given category
  const loadCategory = (category: CategoryType, page: number, search: string, reset = false) => {
    switch (category) {
      case CATEGORY_DIAL_NUMBER:
        loadDialNumbers(page, search, reset);
        break;
      case CATEGORY_ENTRY_POINT:
        loadEntryPoints(page, search, reset);
        break;
      case CATEGORY_QUEUES:
        loadQueues(page, search, reset);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
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
    if (selectedCategory === CATEGORY_DIAL_NUMBER && showDialNumberTab && dialNumbers.length === 0) {
      loadCategory(CATEGORY_DIAL_NUMBER, 0, '', true);
    } else if (selectedCategory === CATEGORY_ENTRY_POINT && showEntryPointTab && entryPoints.length === 0) {
      loadCategory(CATEGORY_ENTRY_POINT, 0, '', true);
    } else if (selectedCategory === CATEGORY_QUEUES && queuesData.length === 0) {
      loadCategory(CATEGORY_QUEUES, 0, '', true);
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
