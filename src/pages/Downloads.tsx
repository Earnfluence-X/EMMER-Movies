import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Trash2,
  DownloadCloud,
  CheckCircle2,
  HardDrive,
  Pause,
  RotateCw,
  X as XIcon,
  AlertCircle,
  Save,
} from "lucide-react";
import { useDownloads, type DownloadItem } from "../context/DownloadContext";
import { fmtBytes, fmtSpeed } from "../lib/downloader";
import { IMG } from "../api/tmdb";
import CustomPlayer from "../components/CustomPlayer";

export default function Downloads() {
  const { items, remove, pause, resume, cancel, getBlobUrl, saveToDevice, storage, refreshStorage } = useDownloads();
  const [playing, setPlaying] = useState<{ item: DownloadItem; url: string } | null>(null);

  useEffect(() => {
    refreshStorage();
  }, [items.length, refreshStorage]);

  useEffect(() => {
    return () => {
      if (playing?.url) URL.revokeObjectURL(playing.url);
    };
  }, [playing]);

  const totalBytes = items.reduce((s, i) => s + (i.loaded || 0), 0);

  const playOffline = async (item: DownloadItem) => {
    const url = await getBlobUrl(item.id);
    if (url) setPlaying({ item, url });
  };

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-3xl md:text-4xl font-black">My Library</h1>
          <p className="text-zinc-400 mt-1">Real downloads, stored in your browser. Watch fully offline.</p>
        </div>
        <div className="flex items-center gap-2 text-zinc-300 text-sm bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
          <HardDrive size={16} />
          <span>
            <b className="text-white">{items.length}</b> titles · <b className="text-white">{fmtBytes(totalBytes)}</b>
            {storage && (
              <>
                {" "}
                · <span className="text-zinc-500">{fmtBytes(storage.usage)} of {fmtBytes(storage.quota)} used</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Storage quota bar */}
      {storage && storage.quota > 0 && (
        <div className="mb-8 max-w-2xl">
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e50914] to-amber-400"
              style={{ width: `${Math.min(100, (storage.usage / storage.quota) * 100)}%` }}
            />
          </div>
          <p className="text-zinc-500 text-xs mt-1.5">
            Browser storage quota — you can store roughly {fmtBytes(storage.quota - storage.usage)} more.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center text-zinc-400 py-24 border-2 border-dashed border-zinc-800 rounded-2xl">
          <DownloadCloud size={64} className="mb-4 text-zinc-600" />
          <h2 className="text-white text-xl font-bold mb-1">Your library is empty</h2>
          <p className="mb-5 max-w-md">
            Open any movie → Watch Now → Custom Player → paste a direct video URL → Download. Files are saved in your browser
            and play fully offline.
          </p>
          <Link to="/" className="bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-6 py-2.5 rounded-md transition">
            Browse Movies
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => {
            const pct = it.total > 0 ? (it.loaded / it.total) * 100 : 0;
            const isLegacy = (it as any).quality && it.loaded === 0 && it.total === 0 && it.status !== "completed";
            return (
              <div key={it.id} className="flex bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition">
                <Link to={`/movie/${it.id}`} className="shrink-0">
                  {it.poster_path ? (
                    <img src={IMG(it.poster_path, "w200")} alt={it.title} className="w-24 md:w-32 h-full object-cover" />
                  ) : (
                    <div className="w-24 md:w-32 h-full bg-zinc-800" />
                  )}
                </Link>
                <div className="flex-1 p-4 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-bold truncate">{it.title}</h3>
                      <p className="text-zinc-400 text-xs mt-0.5 truncate">
                        {(it.release_date || "").slice(0, 4)}
                        {it.total > 0 && <> · {fmtBytes(it.total)}</>}
                        {it.status === "downloading" && it.speed > 0 && <> · {fmtSpeed(it.speed)}</>}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-zinc-500 hover:text-red-500 p-1.5 rounded transition shrink-0"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {isLegacy && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 rounded p-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>Legacy item from old simulated downloads. Delete and re-download via Custom Player URL.</span>
                    </div>
                  )}

                  <div className="mt-auto pt-3">
                    {it.status === "downloading" || it.status === "queued" || it.status === "paused" ? (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-zinc-400 flex items-center gap-1.5">
                            {it.status === "downloading" && (
                              <>
                                <DownloadCloud size={12} className="animate-pulse" /> Downloading
                              </>
                            )}
                            {it.status === "paused" && (
                              <>
                                <Pause size={12} /> Paused
                              </>
                            )}
                            {it.status === "queued" && <>⌛ Queued…</>}
                          </span>
                          <span className="text-white font-bold tabular-nums">
                            {fmtBytes(it.loaded)}
                            {it.total > 0 && ` / ${fmtBytes(it.total)}`} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full transition-all ${
                              it.status === "paused" ? "bg-zinc-500" : "bg-gradient-to-r from-[#e50914] to-red-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex gap-2">
                          {it.status === "downloading" ? (
                            <button
                              onClick={() => pause(it.id)}
                              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                            >
                              <Pause size={12} /> Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => resume(it.id)}
                              className="flex items-center gap-1 bg-[#e50914] hover:bg-[#f40612] text-white text-xs font-bold px-3 py-1.5 rounded transition"
                            >
                              <Play size={12} className="fill-white" /> Resume
                            </button>
                          )}
                          <button
                            onClick={() => cancel(it.id)}
                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded transition"
                          >
                            <XIcon size={12} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : it.status === "completed" ? (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                          <CheckCircle2 size={14} /> Ready offline
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveToDevice(it.id)}
                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                            title="Save to your device"
                          >
                            <Save size={12} /> Save
                          </button>
                          <button
                            onClick={() => playOffline(it)}
                            className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-zinc-200 transition"
                          >
                            <Play size={12} className="fill-black" /> Play
                          </button>
                        </div>
                      </div>
                    ) : it.status === "error" ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertCircle size={14} /> Failed (CORS or network)
                        </span>
                        <button
                          onClick={() => resume(it.id)}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded"
                        >
                          <RotateCw size={12} /> Retry
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">Canceled</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Offline player modal */}
      {playing && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="flex items-center justify-between p-3 md:p-4 bg-black border-b border-zinc-900">
            <div className="min-w-0">
              <h3 className="text-white font-bold truncate">{playing.item.title}</h3>
              <span className="text-zinc-500 text-xs">📴 Playing offline from your device</span>
            </div>
            <button
              onClick={() => setPlaying(null)}
              className="text-white bg-zinc-800 hover:bg-zinc-700 rounded-full p-2"
              aria-label="Close"
            >
              <XIcon size={20} />
            </button>
          </div>
          <div className="flex-1 relative bg-black">
            <CustomPlayer src={playing.url} title={playing.item.title} poster={IMG(playing.item.backdrop_path, "original")} />
          </div>
        </div>
      )}
    </div>
  );
}
