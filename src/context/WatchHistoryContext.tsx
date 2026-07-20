import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Movie } from "../api/tmdb";

interface WatchProgress {
  movieId: number;
  progress: number; // 0-100
  lastWatched: number; // timestamp
  duration?: number; // total duration in seconds
  currentTime?: number; // current position in seconds
}

interface WatchHistoryContextType {
  history: (Movie & { progress?: WatchProgress })[];
  addToHistory: (movie: Movie, progress?: number, currentTime?: number) => void;
  updateProgress: (movieId: number, progress: number, currentTime?: number) => void;
  getProgress: (movieId: number) => WatchProgress | null;
  removeFromHistory: (movieId: number) => void;
  clearHistory: () => void;
  isWatched: (movieId: number) => boolean;
  getContinueWatching: () => (Movie & { progress: WatchProgress })[];
}

const WatchHistoryContext = createContext<WatchHistoryContextType | null>(null);

const STORAGE_KEY = "emmer-watch-history-v2";
const PROGRESS_KEY = "emmer-watch-progress-v2";

export function WatchHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Ignore errors
    }
    return [];
  });

  const [progressMap, setProgressMap] = useState<Record<number, WatchProgress>>(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore errors
    }
    return {};
  });

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage errors
    }
  }, [history]);

  // Persist progress
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressMap));
    } catch {
      // Ignore storage errors
    }
  }, [progressMap]);

  const addToHistory = useCallback((movie: Movie, progress: number = 0, currentTime: number = 0) => {
    // Add to history if not already there
    setHistory(prev => {
      if (prev.some(item => item.id === movie.id)) return prev;
      return [movie, ...prev];
    });

    // Initialize progress
    if (progress > 0) {
      setProgressMap(prev => ({
        ...prev,
        [movie.id]: {
          movieId: movie.id,
          progress,
          lastWatched: Date.now(),
          currentTime,
        },
      }));
    }
  }, []);

  const updateProgress = useCallback((movieId: number, progress: number, currentTime?: number) => {
    setProgressMap(prev => {
      const existing = prev[movieId];
      return {
        ...prev,
        [movieId]: {
          movieId,
          progress: Math.min(100, Math.max(0, progress)),
          lastWatched: Date.now(),
          currentTime: currentTime || existing?.currentTime || 0,
          duration: existing?.duration,
        },
      };
    });
  }, []);

  const getProgress = useCallback((movieId: number): WatchProgress | null => {
    return progressMap[movieId] || null;
  }, [progressMap]);

  const removeFromHistory = useCallback((movieId: number) => {
    setHistory(prev => prev.filter(item => item.id !== movieId));
    setProgressMap(prev => {
      const { [movieId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setProgressMap({});
  }, []);

  const isWatched = useCallback((movieId: number): boolean => {
    const progress = progressMap[movieId];
    return progress ? progress.progress >= 100 : false;
  }, [progressMap]);

  const getContinueWatching = useCallback(() => {
    return history
      .filter(movie => {
        const progress = progressMap[movie.id];
        return progress && progress.progress > 0 && progress.progress < 100;
      })
      .map(movie => ({
        ...movie,
        progress: progressMap[movie.id]!,
      }))
      .sort((a, b) => b.progress.lastWatched - a.progress.lastWatched);
  }, [history, progressMap]);

  // Combine history with progress
  const historyWithProgress = history.map(movie => ({
    ...movie,
    progress: progressMap[movie.id],
  }));

  return (
    <WatchHistoryContext.Provider
      value={{
        history: historyWithProgress,
        addToHistory,
        updateProgress,
        getProgress,
        removeFromHistory,
        clearHistory,
        isWatched,
        getContinueWatching,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
}

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error("useWatchHistory must be used within WatchHistoryProvider");
  }
  return context;
}