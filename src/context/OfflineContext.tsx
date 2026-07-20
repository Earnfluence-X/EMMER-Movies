import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface OfflineContextType {
  isOnline: boolean;
  wasOffline: boolean;
  reconnectAttempts: number;
  isReconnecting: boolean;
  reconnect: () => Promise<void>;
  pendingActions: Array<{ id: string; action: () => void }>;
  queueAction: (action: () => void) => string;
  clearQueue: () => void;
  getStorageStatus: () => Promise<{ usage: number; quota: number; available: boolean }>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [pendingActions, setPendingActions] = useState<Array<{ id: string; action: () => void }>>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReconnectAttempts(0);
      setWasOffline(false);
      
      // Execute pending actions
      if (pendingActions.length > 0) {
        pendingActions.forEach(({ action }) => {
          try {
            action();
          } catch (error) {
            console.error("Failed to execute pending action:", error);
          }
        });
        setPendingActions([]);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodically check connection status
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        setWasOffline(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [pendingActions]);

  const reconnect = async (): Promise<void> => {
    if (isOnline) {
      setIsOnline(true);
      return;
    }

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);

    try {
      // Try to fetch a lightweight resource to test connectivity
      const response = await fetch("/", { 
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        setIsOnline(true);
        setWasOffline(false);
        setReconnectAttempts(0);
      } else {
        throw new Error("Still offline");
      }
    } catch (error) {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        // Retry after delay
        setTimeout(() => {
          reconnect();
        }, RECONNECT_DELAY);
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  const queueAction = (action: () => void): string => {
    const id = Math.random().toString(36).substring(7);
    setPendingActions(prev => [...prev, { id, action }]);
    return id;
  };

  const clearQueue = () => {
    setPendingActions([]);
  };

  const getStorageStatus = async (): Promise<{ usage: number; quota: number; available: boolean }> => {
    if ("storage" in navigator && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        available: quota - usage > 1024 * 1024 * 10, // At least 10MB free
      };
    }
    return { usage: 0, quota: 0, available: false };
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        wasOffline,
        reconnectAttempts,
        isReconnecting,
        reconnect,
        pendingActions,
        queueAction,
        clearQueue,
        getStorageStatus,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return context;
}