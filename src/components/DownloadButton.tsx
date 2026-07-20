import { useState } from "react";
import { Download, Check, Loader2, Play, Pause, X } from "lucide-react";
import { useDownloadManager } from "../hooks/useDownloadManager";
import type { Movie } from "../api/tmdb";

interface DownloadButtonProps {
  movie: Movie;
  className?: string;
  onDownloadStart?: () => void;
}

export function DownloadButton({ movie, className = "", onDownloadStart }: DownloadButtonProps) {
  const { startDownload, getDownloadStatus, downloads, pauseDownload, cancelDownload } = useDownloadManager();
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const status = getDownloadStatus(movie.id);
  const download = downloads.find(d => d.movieId === movie.id);

  const handleDownload = async () => {
    if (status === "complete") return;
    
    setIsLoading(true);
    try {
      // Auto-find and download the best available source
      // For now, use demo stream
      const demoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      await startDownload(movie, demoUrl, "1080p");
      onDownloadStart?.();
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (download) {
      pauseDownload(download.id);
    }
  };

  const handleCancel = () => {
    if (download) {
      cancelDownload(download.id);
    }
  };

  if (status === "complete") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 text-green-500 text-sm font-medium">
          <Check size={18} />
          Downloaded
        </div>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {showOptions && (
          <div className="absolute bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 min-w-[150px] z-20">
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition"
            >
              Remove Download
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === "downloading" || (download && download.status === "pending")) {
    const progress = download?.progress || 0;
    const speed = download?.speed || 0;
    const speedText = speed > 0 ? `${(speed / 1024 / 1024).toFixed(1)} MB/s` : "Starting...";

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[100px]">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-0.5">
              <span>{download?.status === "paused" ? "Paused" : "Downloading"}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e50914] to-red-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{speedText}</div>
          </div>
          
          {download?.status === "paused" ? (
            <button
              onClick={handleDownload}
              className="p-1.5 bg-[#e50914] hover:bg-[#f40612] rounded-full transition"
              title="Resume"
            >
              <Play size={14} className="fill-white text-white" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full transition"
              title="Pause"
            >
              <Pause size={14} className="text-white" />
            </button>
          )}
          <button
            onClick={handleCancel}
            className="p-1.5 bg-zinc-800 hover:bg-red-500/20 rounded-full transition"
            title="Cancel"
          >
            <X size={14} className="text-zinc-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={`flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-4 py-2 rounded-md transition disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Searching...
        </>
      ) : (
        <>
          <Download size={18} />
          Download
        </>
      )}
    </button>
  );
}