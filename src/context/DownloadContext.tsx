import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type { Movie } from "../api/tmdb";
import { videoStore, getStorageEstimate, requestPersistent } from "../lib/idb";
import { startDownload, type DownloadHandle, type DownloadStatus } from "../lib/downloader";
import { SourceFinder } from "../lib/sourceFinder";

export interface DownloadItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  addedAt: number;
  status: DownloadStatus;
  loaded: number;
  total: number;
  speed: number;
  url: string;
  mime?: string;
  quality?: "720p" | "1080p" | "4K";
  sizeMB?: number;
  progress?: number;
  priority?: number;
  source?: "auto" | "manual";
}

interface Ctx {
  items: DownloadItem[];
  add: (m: Movie, url: string, quality?: "720p" | "1080p" | "4K", source?: "auto" | "manual") => Promise<void>;
  pause: (id: number) => void;
  resume: (id: number) => void;
  cancel: (id: number) => void;
  remove: (id: number) => Promise<void>;
  has: (id: number) => boolean;
  get: (id: number) => DownloadItem | undefined;
  getBlobUrl: (id: number) => Promise<string | null>;
  saveToDevice: (id: number) => Promise<void>;
  storage: { usage: number; quota: number } | null;
  refreshStorage: () => Promise<void>;
  getQueueStatus: () => { queued: number; downloading: number; completed: number };
  autoDownload: (movie: Movie) => Promise<boolean>;
  smartDownload: (movie: Movie) => Promise<boolean>;
  isAutoDownloading: boolean;
  findSource: (movie: Movie) => Promise<string | null>;
  clearLegacyItems: () => Promise<void>;
}

const DownloadCtx = createContext<Ctx | null>(null);
const KEY = "emmer.downloads.v2";
const LEGACY_KEY = "emmer.downloads";
const MAX_CONCURRENT = 3;

const sourceFinder = new SourceFinder();

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DownloadItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw) as DownloadItem[];
        return arr.map((i) => 
          i.status === "downloading" ? { ...i, status: "paused" as DownloadStatus, speed: 0 } : i
        );
      }
    } catch {
      localStorage.removeItem(KEY);
    }
    return [];
  });

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [isAutoDownloading, setIsAutoDownloading] = useState(false);
  const handles = useRef<Map<number, DownloadHandle>>(new Map());
  const activeDownloads = useRef<Set<number>>(new Set());
  const queueTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save downloads:", e);
    }
  }, [items]);

  const refreshStorage = async () => {
    try {
      const e = await getStorageEstimate();
      if (e) setStorage(e);
    } catch {}
  };

  useEffect(() => {
    requestPersistent();
    refreshStorage();
  }, []);

  const update = (id: number, patch: Partial<DownloadItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const processQueue = () => {
    if (queueTimeout.current) clearTimeout(queueTimeout.current);
    
    const active = activeDownloads.current.size;
    if (active >= MAX_CONCURRENT) return;

    const queued = items
      .filter((i) => i.status === "queued" && i.url)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (queued.length === 0) return;

    const item = queued[0];
    startJob(item);
    
    queueTimeout.current = setTimeout(processQueue, 100);
  };

  const startJob = (item: DownloadItem) => {
    if (activeDownloads.current.has(item.id)) return;
    if (!item.url) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      return;
    }
    
    activeDownloads.current.add(item.id);
    update(item.id, { status: "downloading" });

    const handle = startDownload({
      url: item.url,
      onProgress: (p) => {
        update(item.id, { 
          loaded: p.loaded, 
          total: p.total || item.total, 
          status: p.status, 
          speed: p.speed 
        });
      },
      onComplete: async (blob) => {
        try {
          await videoStore.put(item.id, blob);
          update(item.id, { 
            status: "completed", 
            loaded: blob.size, 
            total: blob.size, 
            speed: 0, 
            mime: blob.type 
          });
          refreshStorage();
        } catch (err) {
          update(item.id, { status: "error", speed: 0 });
          console.error("Failed to save blob:", err);
        } finally {
          activeDownloads.current.delete(item.id);
          processQueue();
        }
      },
      onError: (err) => {
        update(item.id, { status: "error", speed: 0 });
        console.error("Download error:", err);
        activeDownloads.current.delete(item.id);
        processQueue();
      },
    });
    handles.current.set(item.id, handle);
  };

  const findSource = useCallback(async (movie: Movie): Promise<string | null> => {
    const source = await sourceFinder.findBestSource(movie);
    return source?.url || null;
  }, []);

  const add: Ctx["add"] = async (m, url, quality = "1080p", source: "auto" | "manual" = "manual") => {
    const existing = items.find((i) => i.id === m.id);
    if (existing) {
      if (existing.status === "completed" || existing.status === "downloading") {
        return;
      }
      await remove(m.id);
    }

    if (!url) {
      console.warn("Invalid URL for download");
      return;
    }
    
    const item: DownloadItem = {
      id: m.id,
      title: m.title || m.name || "Untitled",
      poster_path: m.poster_path,
      backdrop_path: m.backdrop_path,
      overview: m.overview,
      vote_average: m.vote_average,
      release_date: m.release_date,
      addedAt: Date.now(),
      status: "queued",
      loaded: 0,
      total: 0,
      speed: 0,
      url,
      quality,
      priority: quality === "4K" ? 3 : quality === "1080p" ? 2 : 1,
      source,
    };
    
    setItems((prev) => [...prev, item]);
    setTimeout(processQueue, 100);
  };

  const smartDownload = useCallback(async (movie: Movie): Promise<boolean> => {
    const existing = items.find(i => i.id === movie.id);
    if (existing && existing.status === "completed") {
      return false;
    }

    setIsAutoDownloading(true);
    try {
      const source = await sourceFinder.findBestSource(movie);
      if (!source) {
        console.error("No source found for:", movie.title);
        return false;
      }

      await add(movie, source.url, source.quality, "auto");
      return true;
    } catch (error) {
      console.error("Smart download failed:", error);
      return false;
    } finally {
      setIsAutoDownloading(false);
    }
  }, [items, add]);

  const autoDownload = useCallback(async (movie: Movie): Promise<boolean> => {
    return smartDownload(movie);
  }, [smartDownload]);

  const pause: Ctx["pause"] = (id) => {
    handles.current.get(id)?.pause();
    update(id, { status: "paused", speed: 0 });
    activeDownloads.current.delete(id);
    processQueue();
  };

  const resume: Ctx["resume"] = (id) => {
    const h = handles.current.get(id);
    const item = items.find((i) => i.id === id);
    if (!item) return;
    
    if (h && h.getStatus() === "paused") {
      h.resume();
      update(id, { status: "downloading" });
      activeDownloads.current.add(id);
    } else {
      if (item.url) {
        update(id, { loaded: 0, total: 0, status: "queued" });
        processQueue();
      } else {
        setItems(prev => prev.filter(i => i.id !== id));
      }
    }
  };

  const cancel: Ctx["cancel"] = (id) => {
    handles.current.get(id)?.cancel();
    handles.current.delete(id);
    activeDownloads.current.delete(id);
    update(id, { status: "canceled", speed: 0 });
    processQueue();
  };

  const remove: Ctx["remove"] = async (id) => {
    handles.current.get(id)?.cancel();
    handles.current.delete(id);
    activeDownloads.current.delete(id);
    try {
      await videoStore.delete(id);
    } catch {
      /* ignore */
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    refreshStorage();
    processQueue();
  };

  const clearLegacyItems = async () => {
    const legacyItems = items.filter(
      (it) => it.loaded === 0 && it.total === 0 && it.status !== "completed"
    );
    if (legacyItems.length === 0) {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    
    for (const item of legacyItems) {
      await remove(item.id);
    }
    localStorage.removeItem(LEGACY_KEY);
    await refreshStorage();
  };

  const has: Ctx["has"] = (id) => items.some((i) => i.id === id);
  const get: Ctx["get"] = (id) => items.find((i) => i.id === id);

  const getBlobUrl: Ctx["getBlobUrl"] = async (id) => {
    try {
      const blob = await videoStore.get(id);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  };

  const saveToDevice: Ctx["saveToDevice"] = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const blob = await videoStore.get(id);
    if (!blob) return;
    const ext = (blob.type.split("/")[1] || "mp4").split(";")[0];
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${item.title.replace(/[^\w\s-]/g, "")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getQueueStatus = () => {
    const queued = items.filter((i) => i.status === "queued").length;
    const downloading = items.filter((i) => i.status === "downloading").length;
    const completed = items.filter((i) => i.status === "completed").length;
    return { queued, downloading, completed };
  };

  return (
    <DownloadCtx.Provider
      value={{ 
        items, 
        add, 
        pause, 
        resume, 
        cancel, 
        remove, 
        has, 
        get, 
        getBlobUrl, 
        saveToDevice, 
        storage, 
        refreshStorage,
        getQueueStatus,
        autoDownload,
        smartDownload,
        isAutoDownloading,
        findSource,
        clearLegacyItems,
      }}
    >
      {children}
    </DownloadCtx.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadCtx);
  if (!ctx) throw new Error("useDownloads must be used within DownloadProvider");
  return ctx;
}