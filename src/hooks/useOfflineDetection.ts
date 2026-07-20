import { useState, useEffect, useCallback } from "react";

interface OfflineDetectionOptions {
  checkInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useOfflineDetection(options: OfflineDetectionOptions = {}) {
  const {
    checkInterval = 5000,
    maxRetries = 5,
    retryDelay = 2000,
    onOnline,
    onOffline,
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);

  // Get network info if available
  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || null);
      setDownlink(connection.downlink || null);
      setRtt(connection.rtt || null);
    }
  }, []);

  // Check connectivity by trying to fetch a resource
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a lightweight resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch("/", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (isOnline) {
      setIsOnline(true);
      return;
    }

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);

    try {
      const connected = await checkConnectivity();
      
      if (connected) {
        setIsOnline(true);
        setWasOffline(false);
        setReconnectAttempts(0);
        onOnline?.();
      } else {
        throw new Error("Still offline");
      }
    } catch (error) {
      if (reconnectAttempts < maxRetries) {
        // Retry after delay
        setTimeout(() => {
          reconnect();
        }, retryDelay);
      }
    } finally {
      setIsReconnecting(false);
    }
  }, [isOnline, reconnectAttempts, maxRetries, retryDelay, checkConnectivity, onOnline]);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(false);
      setReconnectAttempts(0);
      updateNetworkInfo();
      onOnline?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      onOffline?.();
    };

    // Network info changes
    const handleConnectionChange = () => {
      updateNetworkInfo();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
      updateNetworkInfo();
    }

    // Periodic check when online but might have lost connection
    const interval = setInterval(() => {
      if (navigator.onLine && !isOnline) {
        // We think we're online but the state says offline - check
        checkConnectivity().then(connected => {
          if (connected) {
            handleOnline();
          }
        });
      }
    }, checkInterval);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
      clearInterval(interval);
    };
  }, [isOnline, checkInterval, checkConnectivity, updateNetworkInfo, onOnline, onOffline]);

  return {
    isOnline,
    wasOffline,
    reconnectAttempts,
    isReconnecting,
    reconnect,
    connectionType,
    downlink,
    rtt,
    isSlowConnection: connectionType === "2g" || connectionType === "3g",
  };
}