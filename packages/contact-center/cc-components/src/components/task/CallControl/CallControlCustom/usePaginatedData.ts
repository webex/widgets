import {useState, useCallback} from 'react';

type Logger = {
  info: (message: string) => void;
  error: (message: string, error?: unknown) => void;
};

type FetchFunction<T> = (params: {
  page: number;
  pageSize: number;
  search?: string;
}) => Promise<{data: T[]; meta?: {page?: number; totalPages?: number}}>;

type TransformFunction<T, U> = (item: T, page: number, index: number) => U;

export const usePaginatedData = <T, U>(
  fetchFunction: FetchFunction<T> | undefined,
  transformFunction: TransformFunction<T, U>,
  logger: Logger | undefined,
  categoryName: string
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
