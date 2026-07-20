import { useState, useEffect, useCallback, useRef } from "react";
import { tmdb, type Movie } from "../api/tmdb";

interface DownloadSource {
  url: string;
  quality: "720p" | "1080p" | "4K";
  size: string;
  provider: string;
}

interface DownloadJob {
  id: string;
  movieId: number;
  title: string;
  poster: string | null;
  progress: number;
  status: "pending" | "downloading" | "complete" | "error" | "paused";
  downloadedSize: number;
  totalSize: number;
  speed: number;
  url: string;
  quality: string;
  blob?: Blob;
  error?: string;
}

export function useDownloadManager() {
  const [downloads, setDownloads] = useState<DownloadJob[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const activeDownloads = useRef<Map<string, { controller: AbortController; chunks: Uint8Array[] }>>(new Map());

  // Load saved downloads from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("emmer-downloads");
      if (saved) {
        const parsed = JSON.parse(saved);
        setDownloads(parsed.filter((d: DownloadJob) => d.status === "complete" || d.status === "paused"));
      }
    } catch {}
  }, []);

  // Save downloads to localStorage
  useEffect(() => {
    try {
      const toSave = downloads.filter(d => d.status === "complete" || d.status === "paused");
      localStorage.setItem("emmer-downloads", JSON.stringify(toSave));
    } catch {}
  }, [downloads]);

  // Search for download sources
  const searchSources = useCallback(async (movie: Movie): Promise<DownloadSource[]> => {
    setIsSearching(true);
    const sources: DownloadSource[] = [];

    try {
      const title = encodeURIComponent(movie.title || movie.name || "");
      const year = (movie.release_date || "").slice(0, 4);

      // Try different search strategies
      const searchQueries = [
        `${title} ${year} 1080p`,
        `${title} ${year} 720p`,
        `${title} ${year} mp4`,
        `index.of ${title} ${year} mp4`,
      ];

      // Use an API to find video sources (this is a mock - replace with actual service)
      // For now, we'll use the demo streams as fallback
      const demoStreams = [
        { 
          url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          quality: "1080p" as const,
          size: "~150 MB",
          provider: "Demo"
        },
        { 
          url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
          quality: "1080p" as const,
          size: "~130 MB",
          provider: "Demo"
        },
        { 
          url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
          quality: "1080p" as const,
          size: "~170 MB",
          provider: "Demo"
        },
      ];

      // For real movies, we'd search the web here
      // This is where you'd integrate with a search API
      
      // For now, return demo streams as available sources
      sources.push(...demoStreams);

    } catch (error) {
      console.error("Error searching for sources:", error);
    } finally {
      setIsSearching(false);
    }

    return sources;
  }, []);

  // Start download
  const startDownload = useCallback(async (movie: Movie, url: string, quality: string = "1080p") => {
    // Check if already downloading
    if (downloads.some(d => d.movieId === movie.id && d.status !== "complete")) {
      return;
    }

    const jobId = `download-${movie.id}-${Date.now()}`;
    const job: DownloadJob = {
      id: jobId,
      movieId: movie.id,
      title: movie.title || movie.name || "Untitled",
      poster: movie.poster_path,
      progress: 0,
      status: "pending",
      downloadedSize: 0,
      totalSize: 0,
      speed: 0,
      url,
      quality,
    };

    setDownloads(prev => [...prev, job]);

    // Start the actual download
    const controller = new AbortController();
    const chunks: Uint8Array[] = [];

    activeDownloads.current.set(jobId, { controller, chunks });

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get("content-length");
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
      const contentType = response.headers.get("content-type") || "video/mp4";

      setDownloads(prev => 
        prev.map(d => 
          d.id === jobId 
            ? { ...d, status: "downloading", totalSize, downloadedSize: 0 }
            : d
        )
      );

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let downloaded = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let speed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloaded += value.length;

        // Calculate speed
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        if (delta >= 0.5) {
          speed = (downloaded - lastBytes) / delta;
          lastBytes = downloaded;
          lastTime = now;
        }

        const progress = totalSize > 0 ? (downloaded / totalSize) * 100 : 0;

        setDownloads(prev =>
          prev.map(d =>
            d.id === jobId
              ? {
                  ...d,
                  downloadedSize: downloaded,
                  progress: Math.min(progress, 100),
                  speed,
                  status: "downloading",
                }
              : d
          )
        );
      }

      // Download complete
      const blob = new Blob(chunks, { type: contentType });
      const finalJob = {
        ...job,
        status: "complete" as const,
        progress: 100,
        downloadedSize: downloaded,
        totalSize: downloaded,
        blob,
        speed: 0,
      };

      setDownloads(prev => prev.map(d => d.id === jobId ? finalJob : d));

      // Save to IndexedDB for offline playback
      try {
        const db = await openDB();
        const tx = db.transaction("downloads", "readwrite");
        const store = tx.objectStore("downloads");
        store.put({
          id: movie.id,
          title: job.title,
          poster: job.poster,
          blob: blob,
          quality: quality,
          timestamp: Date.now(),
        });
        await tx.done;
      } catch (error) {
        console.error("Failed to save to IndexedDB:", error);
      }

      // Clean up
      activeDownloads.current.delete(jobId);

    } catch (error: any) {
      if (error.name === "AbortError") {
        // User paused or cancelled
        setDownloads(prev =>
          prev.map(d =>
            d.id === jobId
              ? { ...d, status: "paused" as const }
              : d
          )
        );
      } else {
        setDownloads(prev =>
          prev.map(d =>
            d.id === jobId
              ? { ...d, status: "error" as const, error: error.message }
              : d
          )
        );
      }
      activeDownloads.current.delete(jobId);
    }
  }, [downloads]);

  // Pause download
  const pauseDownload = useCallback((jobId: string) => {
    const job = downloads.find(d => d.id === jobId);
    if (!job || job.status !== "downloading") return;

    const active = activeDownloads.current.get(jobId);
    if (active) {
      active.controller.abort();
      activeDownloads.current.delete(jobId);
    }

    setDownloads(prev =>
      prev.map(d =>
        d.id === jobId
          ? { ...d, status: "paused" as const, speed: 0 }
          : d
      )
    );
  }, [downloads]);

  // Resume download
  const resumeDownload = useCallback((jobId: string) => {
    const job = downloads.find(d => d.id === jobId);
    if (!job || job.status !== "paused") return;

    // Restart the download with range header
    const active = activeDownloads.current.get(jobId);
    if (active) {
      // Resume from where we left off
      const { controller, chunks } = active;
      // Continue download logic...
    }

    // For now, restart the download
    setDownloads(prev =>
      prev.map(d =>
        d.id === jobId
          ? { ...d, status: "pending" as const, progress: 0, downloadedSize: 0 }
          : d
      )
    );
  }, [downloads]);

  // Cancel download
  const cancelDownload = useCallback((jobId: string) => {
    const active = activeDownloads.current.get(jobId);
    if (active) {
      active.controller.abort();
      activeDownloads.current.delete(jobId);
    }

    setDownloads(prev => prev.filter(d => d.id !== jobId));
  }, []);

  // Remove completed download
  const removeDownload = useCallback((jobId: string) => {
    setDownloads(prev => prev.filter(d => d.id !== jobId));
  }, []);

  // Play downloaded video
  const playDownload = useCallback((job: DownloadJob) => {
    if (job.blob) {
      return URL.createObjectURL(job.blob);
    }
    return null;
  }, []);

  // Get download status for a movie
  const getDownloadStatus = useCallback((movieId: number) => {
    const download = downloads.find(d => d.movieId === movieId && d.status === "complete");
    if (download) return "complete";
    const inProgress = downloads.find(d => d.movieId === movieId && (d.status === "downloading" || d.status === "pending"));
    if (inProgress) return "downloading";
    return null;
  }, [downloads]);

  // Open IndexedDB
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("emmer-downloads", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("downloads")) {
          db.createObjectStore("downloads", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  return {
    downloads,
    isSearching,
    searchSources,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    playDownload,
    getDownloadStatus,
    openDB,
  };
}