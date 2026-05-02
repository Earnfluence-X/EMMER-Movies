import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Movie } from "../api/tmdb";
import { videoStore, getStorageEstimate, requestPersistent } from "../lib/idb";
import { startDownload, type DownloadHandle, type DownloadStatus } from "../lib/downloader";

export interface DownloadItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  addedAt: number;
  status: DownloadStatus; // queued | downloading | paused | completed | error | canceled
  loaded: number;
  total: number;
  speed: number;
  url: string; // direct video URL
  mime?: string;
  // Legacy fields kept for backward compat with old saved items
  quality?: "720p" | "1080p" | "4K";
  sizeMB?: number;
  progress?: number;
}

interface Ctx {
  items: DownloadItem[];
  add: (m: Movie, url: string) => Promise<void>;
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
}

const DownloadCtx = createContext<Ctx | null>(null);
const KEY = "emmer.downloads.v2";

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DownloadItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? (JSON.parse(raw) as DownloadItem[]) : [];
      // Resume any "downloading" items as paused on reload
      return arr.map((i) => (i.status === "downloading" ? { ...i, status: "paused" as DownloadStatus, speed: 0 } : i));
    } catch {
      return [];
    }
  });

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const handles = useRef<Map<number, DownloadHandle>>(new Map());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const refreshStorage = async () => {
    const e = await getStorageEstimate();
    if (e) setStorage(e);
  };

  useEffect(() => {
    requestPersistent();
    refreshStorage();
  }, []);

  const update = (id: number, patch: Partial<DownloadItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const startJob = (item: DownloadItem) => {
    const handle = startDownload({
      url: item.url,
      onProgress: (p) => {
        update(item.id, { loaded: p.loaded, total: p.total || item.total, status: p.status, speed: p.speed });
      },
      onComplete: async (blob) => {
        try {
          await videoStore.put(item.id, blob);
          update(item.id, { status: "completed", loaded: blob.size, total: blob.size, speed: 0, mime: blob.type });
          refreshStorage();
        } catch (err) {
          update(item.id, { status: "error", speed: 0 });
          // eslint-disable-next-line no-console
          console.error("Failed to save blob:", err);
        }
      },
      onError: (err) => {
        update(item.id, { status: "error", speed: 0 });
        // eslint-disable-next-line no-console
        console.error("Download error:", err);
      },
    });
    handles.current.set(item.id, handle);
  };

  const add: Ctx["add"] = async (m, url) => {
    if (items.some((i) => i.id === m.id)) return;
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
    };
    setItems((prev) => [...prev, item]);
    startJob(item);
  };

  const pause: Ctx["pause"] = (id) => {
    handles.current.get(id)?.pause();
    update(id, { status: "paused", speed: 0 });
  };

  const resume: Ctx["resume"] = (id) => {
    const h = handles.current.get(id);
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (h && h.getStatus() === "paused") {
      h.resume();
      update(id, { status: "downloading" });
    } else {
      // Handle was lost (e.g. page reload) → start a fresh job from byte 0.
      // For simplicity we restart the whole download.
      update(id, { loaded: 0, total: 0, status: "queued" });
      startJob({ ...item, loaded: 0, total: 0, status: "queued" });
    }
  };

  const cancel: Ctx["cancel"] = (id) => {
    handles.current.get(id)?.cancel();
    handles.current.delete(id);
    update(id, { status: "canceled", speed: 0 });
  };

  const remove: Ctx["remove"] = async (id) => {
    handles.current.get(id)?.cancel();
    handles.current.delete(id);
    try {
      await videoStore.delete(id);
    } catch {
      /* ignore */
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    refreshStorage();
  };

  const has: Ctx["has"] = (id) => items.some((i) => i.id === id);
  const get: Ctx["get"] = (id) => items.find((i) => i.id === id);

  const getBlobUrl: Ctx["getBlobUrl"] = async (id) => {
    const blob = await videoStore.get(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
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

  return (
    <DownloadCtx.Provider
      value={{ items, add, pause, resume, cancel, remove, has, get, getBlobUrl, saveToDevice, storage, refreshStorage }}
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
