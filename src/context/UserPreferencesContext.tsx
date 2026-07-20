import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserPreferences {
  // Audio/Video
  defaultQuality: "auto" | "1080p" | "720p" | "480p" | "360p";
  defaultSpeed: number;
  defaultVolume: number;
  muted: boolean;
  
  // Subtitles
  subtitleLanguage: string;
  subtitleSize: "small" | "medium" | "large";
  subtitleColor: string;
  subtitleBackground: string;
  
  // Interface
  theme: "dark" | "light" | "system";
  language: string;
  autoplayTrailers: boolean;
  autoplayNext: boolean;
  
  // Parental
  matureContent: boolean;
  pinProtection: string | null;
  
  // Downloads
  downloadQuality: "720p" | "1080p" | "4K";
  autoDeleteWatched: boolean;
  downloadOverWifi: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultQuality: "auto",
  defaultSpeed: 1,
  defaultVolume: 0.7,
  muted: false,
  subtitleLanguage: "en",
  subtitleSize: "medium",
  subtitleColor: "#ffffff",
  subtitleBackground: "rgba(0,0,0,0.8)",
  theme: "dark",
  language: "en",
  autoplayTrailers: true,
  autoplayNext: true,
  matureContent: true,
  pinProtection: null,
  downloadQuality: "1080p",
  autoDeleteWatched: false,
  downloadOverWifi: true,
};

const STORAGE_KEY = "emmer-preferences";

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportPreferences = (): string => {
    return JSON.stringify(preferences, null, 2);
  };

  const importPreferences = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      // Validate the imported preferences
      if (typeof parsed !== "object") return false;
      setPreferences(prev => ({ ...prev, ...parsed }));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        updatePreference,
        resetPreferences,
        exportPreferences,
        importPreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  }
  return context;
}