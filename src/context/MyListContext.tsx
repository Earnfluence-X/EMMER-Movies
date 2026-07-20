import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Movie } from "../api/tmdb";

interface MyListContextType {
  items: Movie[];
  add: (movie: Movie) => void;
  remove: (id: number) => void;
  toggle: (movie: Movie) => void;
  has: (id: number) => boolean;
  clear: () => void;
  count: number;
}

const MyListContext = createContext<MyListContextType | null>(null);

const STORAGE_KEY = "emmer-mylist-v2";

export function MyListProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Movie[]>(() => {
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

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items]);

  const add = useCallback((movie: Movie) => {
    setItems(prev => {
      if (prev.some(item => item.id === movie.id)) return prev;
      return [...prev, movie];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const toggle = useCallback((movie: Movie) => {
    setItems(prev => {
      const exists = prev.some(item => item.id === movie.id);
      if (exists) {
        return prev.filter(item => item.id !== movie.id);
      }
      return [...prev, movie];
    });
  }, []);

  const has = useCallback((id: number) => {
    return items.some(item => item.id === id);
  }, [items]);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const count = items.length;

  return (
    <MyListContext.Provider value={{ items, add, remove, toggle, has, clear, count }}>
      {children}
    </MyListContext.Provider>
  );
}

export function useMyList() {
  const context = useContext(MyListContext);
  if (!context) {
    throw new Error("useMyList must be used within MyListProvider");
  }
  return context;
}