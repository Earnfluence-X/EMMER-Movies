import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface DataSaverContextType {
  isEnabled: boolean;
  toggle: () => void;
  getImageUrl: (path: string, size?: string) => string;
  shouldPreload: boolean;
  quality: "low" | "medium" | "high";
  setQuality: (quality: "low" | "medium" | "high") => void;
  autoPlayVideo: boolean;
  toggleAutoPlay: () => void;
  thumbnailQuality: "low" | "medium" | "high";
}

const DataSaverContext = createContext<DataSaverContextType | null>(null);

const STORAGE_KEY = "emmer-data-saver";

export function DataSaverProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      isEnabled: false,
      quality: "high" as const,
      autoPlayVideo: true,
      thumbnailQuality: "medium" as const,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Detect if user is on cellular
    const connection = (navigator as any).connection;
    if (connection) {
      const isCellular = connection.effectiveType === "4g" || 
                        connection.effectiveType === "3g" ||
                        connection.effectiveType === "2g";
      if (isCellular && !localStorage.getItem("data-saver-prompted")) {
        // Suggest enabling data saver
        if (window.confirm("You're on a cellular connection. Enable Data Saver to reduce data usage?")) {
          setSettings(prev => ({ ...prev, isEnabled: true }));
        }
        localStorage.setItem("data-saver-prompted", "true");
      }
    }
  }, [settings]);

  const toggle = () => {
    setSettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const getImageUrl = (path: string, size: string = "w500") => {
    if (!path) return "";
    
    if (settings.isEnabled) {
      // Use smaller images in data saver mode
      const sizeMap: Record<string, string> = {
        "w500": "w300",
        "w300": "w200",
        "original": "w780",
        "w780": "w500",
      };
      
      // Further reduce based on quality setting
      const qualitySuffix = settings.quality === "low" ? "w200" : 
                           settings.quality === "medium" ? "w300" : "w500";
      
      const newSize = sizeMap[size] || qualitySuffix;
      return `https://image.tmdb.org/t/p/${newSize}${path}`;
    }
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  return (
    <DataSaverContext.Provider
      value={{
        isEnabled: settings.isEnabled,
        toggle,
        getImageUrl,
        shouldPreload: !settings.isEnabled,
        quality: settings.quality,
        setQuality: (quality) => setSettings(prev => ({ ...prev, quality })),
        autoPlayVideo: settings.autoPlayVideo,
        toggleAutoPlay: () => setSettings(prev => ({ ...prev, autoPlayVideo: !prev.autoPlayVideo })),
        thumbnailQuality: settings.thumbnailQuality,
      }}
    >
      {children}
    </DataSaverContext.Provider>
  );
}

export function useDataSaver() {
  const context = useContext(DataSaverContext);
  if (!context) {
    throw new Error("useDataSaver must be used within DataSaverProvider");
  }
  return context;
}