import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Trash2, HardDrive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDownloadManager, type DownloadJob } from "../hooks/useDownloadManager";
import { IMG } from "../api/tmdb";
import CustomPlayer from "../components/CustomPlayer";
import { fmtBytes } from "../lib/downloader";

export default function OfflineDownloads() {
  const { downloads, removeDownload, playDownload, openDB } = useDownloadManager();
  const [playing, setPlaying] = useState<{ job: DownloadJob; url: string } | null>(null);
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 0 });

  useEffect(() => {
    const getStorage = async () => {
      if ("storage" in navigator && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageInfo({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    };
    getStorage();
  }, [downloads]);

  const completed = downloads.filter(d => d.status === "complete");

  const playOffline = async (job: DownloadJob) => {
    if (job.blob) {
      const url = URL.createObjectURL(job.blob);
      setPlaying({ job, url });
    } else {
      // Try to get from IndexedDB
      try {
        const db = await openDB();
        const tx = db.transaction("downloads", "readonly");
        const store = tx.objectStore("downloads");
        const result = await new Promise<any>((resolve) => {
          const request = store.get(job.movieId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });
        if (result?.blob) {
          const url = URL.createObjectURL(result.blob);
          setPlaying({ job, url });
        }
      } catch {}
    }
  };

  const totalBytes = completed.reduce((sum, d) => sum + d.downloadedSize, 0);

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-3xl md:text-4xl font-black">Offline Downloads</h1>
          <p className="text-zinc-400 mt-1">
            {completed.length} movies ready for offline viewing
          </p>
        </div>
        <div className="flex items-center gap-2 text-zinc-300 text-sm bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
          <HardDrive size={16} />
          <span>
            <b className="text-white">{fmtBytes(totalBytes)}</b> used
            {storageInfo.quota > 0 && (
              <> · {Math.round((storageInfo.used / storageInfo.quota) * 100)}% of {fmtBytes(storageInfo.quota)}</>
            )}
          </span>
        </div>
      </div>

      {/* Storage bar */}
      {storageInfo.quota > 0 && (
        <div className="mb-8 max-w-2xl">
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e50914] to-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (storageInfo.used / storageInfo.quota) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Downloading status */}
      {downloads.some(d => d.status === "downloading" || d.status === "pending") && (
        <div className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={20} className="animate-spin text-[#e50914]" />
            <span className="text-white font-medium">Downloading in progress...</span>
          </div>
          {downloads.filter(d => d.status === "downloading").map(d => (
            <div key={d.id} className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400 truncate">{d.title}</span>
              <span className="text-zinc-500 ml-auto">{Math.round(d.progress)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {completed.length === 0 && (
        <div className="flex flex-col items-center text-center text-zinc-400 py-24 border-2 border-dashed border-zinc-800 rounded-2xl">
          <HardDrive size={64} className="mb-4 text-zinc-600" />
          <h2 className="text-white text-xl font-bold mb-1">No offline downloads</h2>
          <p className="mb-5 max-w-md">
            Movies you download will appear here for offline viewing. Click the Download button on any movie to get started.
          </p>
          <Link to="/" className="bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-6 py-2.5 rounded-md transition">
            Browse Movies
          </Link>
        </div>
      )}

      {/* Downloads grid */}
      {completed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {completed.map(job => (
            <div key={job.id} className="group relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition">
              {/* Poster */}
              {job.poster ? (
                <img
                  src={IMG(job.poster, "w300")}
                  alt={job.title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-zinc-600 text-sm">
                  No poster
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playOffline(job)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-2 rounded hover:bg-zinc-200 transition"
                  >
                    <Play size={14} className="fill-black" />
                    Play
                  </button>
                  <button
                    onClick={() => removeDownload(job.id)}
                    className="p-2 bg-black/60 hover:bg-red-500/60 rounded transition"
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Quality badge */}
              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded">
                {job.quality || "1080p"}
              </div>

              {/* Checkmark */}
              <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 size={12} /> Ready
              </div>

              {/* Title */}
              <div className="p-2">
                <h3 className="text-white text-sm font-medium truncate">{job.title}</h3>
                <p className="text-zinc-500 text-xs">{fmtBytes(job.downloadedSize)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player modal */}
      {playing && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="flex items-center justify-between p-3 md:p-4 bg-black border-b border-zinc-900">
            <div className="min-w-0">
              <h3 className="text-white font-bold truncate">{playing.job.title}</h3>
              <span className="text-zinc-500 text-xs">📴 Playing offline</span>
            </div>
            <button
              onClick={() => setPlaying(null)}
              className="text-white bg-zinc-800 hover:bg-zinc-700 rounded-full p-2"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 relative bg-black">
            <CustomPlayer
              src={playing.url}
              title={playing.job.title}
              poster={IMG(playing.job.poster, "original")}
            />
          </div>
        </div>
      )}
    </div>
  );
}