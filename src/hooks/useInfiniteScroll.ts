import { useEffect, useRef, useCallback, useState } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  rootElement?: HTMLElement | null;
  enabled?: boolean;
  delay?: number;
}

export function useInfiniteScroll(
  callback: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up old observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && options.enabled !== false) {
      observerRef.current = new IntersectionObserver(
        async ([entry]) => {
          if (entry.isIntersecting && !isLoading) {
            setIsLoading(true);
            
            // Optional delay before triggering
            if (options.delay) {
              timeoutRef.current = setTimeout(() => {
                callbackRef.current();
                setTimeout(() => setIsLoading(false), 300);
              }, options.delay);
            } else {
              callbackRef.current();
              setTimeout(() => setIsLoading(false), 300);
            }
          }
        },
        {
          threshold: options.threshold || 0.1,
          rootMargin: options.rootMargin || "0px 0px 100px 0px",
          root: options.rootElement || null,
        }
      );
      
      observerRef.current.observe(node);
      targetRef.current = node;
    }
  }, [options, isLoading]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset loading state
  const reset = useCallback(() => {
    setIsLoading(false);
  }, []);

  return { setRef, isLoading, reset };
}

// Enhanced version with pagination support
export function useInfiniteScrollWithPagination<T>(
  fetchMore: (page: number) => Promise<T[]>,
  options: UseInfiniteScrollOptions & { initialPage?: number } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(options.initialPage || 1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { setRef } = useInfiniteScroll(
    async () => {
      if (isLoading || !hasMore) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const newItems = await fetchMore(page + 1);
        if (newItems.length === 0) {
          setHasMore(false);
        } else {
          setItems(prev => [...prev, ...newItems]);
          setPage(prev => prev + 1);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    options
  );

  const resetPagination = useCallback(() => {
    setItems([]);
    setPage(options.initialPage || 1);
    setHasMore(true);
    setError(null);
  }, [options.initialPage]);

  return {
    items,
    setItems,
    page,
    hasMore,
    isLoading,
    error,
    ref: setRef,
    reset: resetPagination,
  };
}