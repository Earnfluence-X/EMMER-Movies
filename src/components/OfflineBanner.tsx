import { useState, useEffect } from "react";
import { WifiOff, X, Download, RefreshCw } from "lucide-react";
import { useOfflineDetection } from "../hooks/useOfflineDetection";

export function OfflineBanner() {
  const { isOnline, wasOffline, reconnectAttempts } = useOfflineDetection();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Auto-dismiss after being online for 5 seconds
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline || isDismissed) return null;

  const handleReconnect = () => {
    setIsReconnecting(true);
    // Force a check
    if (navigator.onLine) {
      window.dispatchEvent(new Event('online'));
    }
    setTimeout(() => {
      setIsReconnecting(false);
      if (navigator.onLine) {
        setIsDismissed(true);
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-x-0 top-16 z-40 animate-slide-down">
      <div className="bg-gradient-to-r from-yellow-600/95 to-amber-600/95 backdrop-blur-sm text-white p-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <WifiOff size={20} className="shrink-0 animate-pulse" />
              {!isOnline && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse-dot" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm flex items-center gap-2">
                You're offline
                {reconnectAttempts > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    Reconnect attempt {reconnectAttempts}/5
                  </span>
                )}
              </p>
              <p className="text-xs opacity-80 truncate">
                {wasOffline 
                  ? "Your downloaded content is available for offline viewing"
                  : "Checking connection..."
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              {isReconnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Retry
                </>
              )}
            </button>

            <a
              href="/downloads"
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              <Download size={14} />
              Downloads
            </a>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar for reconnect attempts */}
        {!isOnline && reconnectAttempts > 0 && (
          <div className="mt-2 max-w-7xl mx-auto">
            <div className="h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/60 rounded-full transition-all duration-1000"
                style={{ width: `${(reconnectAttempts / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}