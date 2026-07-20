import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";

export function usePrefetch<T>(
  queryKey: (string | number)[],
  fetcher: () => Promise<T>,
  options?: { 
    threshold?: number; 
    enabled?: boolean;
    delay?: number;
  }
) {
  const queryClient = useQueryClient();
  const { ref, inView } = useInView({
    threshold: options?.threshold || 0.1,
  });
  const prefetched = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (prefetched.current) return;

    const prefetch = () => {
      if (options?.enabled !== false) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: fetcher,
          staleTime: 5 * 60 * 1000,
        });
        prefetched.current = true;
      }
    };

    if (inView) {
      if (options?.delay) {
        timeoutRef.current = setTimeout(prefetch, options.delay);
      } else {
        prefetch();
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inView, queryKey, queryClient, fetcher, options]);

  return { ref };
}

// Prefetch next episode/movie sequence
export function usePrefetchSequence(
  items: { id: number; type: "movie" | "tv" }[],
  fetcher: (id: number) => Promise<any>
) {
  const queryClient = useQueryClient();
  const prefetched = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Prefetch next 3 items
    const toPrefetch = items
      .slice(0, 3)
      .filter(item => !prefetched.current.has(item.id));

    if (toPrefetch.length === 0) return;

    toPrefetch.forEach(item => {
      queryClient.prefetchQuery({
        queryKey: ["detail", item.type, item.id],
        queryFn: () => fetcher(item.id),
        staleTime: 5 * 60 * 1000,
      });
      prefetched.current.add(item.id);
    });
  }, [items, queryClient, fetcher]);
}