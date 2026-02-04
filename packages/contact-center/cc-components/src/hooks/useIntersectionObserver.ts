import {useEffect, useRef} from 'react';

interface UseIntersectionObserverOptions {
  /**
   * Callback function to be called when the target element intersects
   */
  onIntersect: () => void;
  /**
   * Whether the observer should be active
   */
  enabled?: boolean;
  /**
   * IntersectionObserver options
   */
  options?: IntersectionObserverInit;
}

/**
 * Custom hook that sets up an IntersectionObserver for infinite scroll or lazy loading
 *
 * @param onIntersect - Callback to execute when intersection occurs
 * @param enabled - Whether the observer is active (default: true)
 * @param options - IntersectionObserver options (default: {threshold: 1.0})
 * @returns ref - React ref to attach to the sentinel element
 *
 * @example
 * const observerRef = useIntersectionObserver({
 *   onIntersect: loadMoreItems,
 *   enabled: hasMore && !loading,
 *   options: { threshold: 1.0 }
 * });
 *
 * return (
 *   <div ref={observerRef} />
 * );
 */
export const useIntersectionObserver = ({
  onIntersect,
  enabled = true,
  options = {threshold: 1.0},
}: UseIntersectionObserverOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onIntersect();
      }
    }, options);

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [onIntersect, enabled, options]);

  return observerTarget;
};
