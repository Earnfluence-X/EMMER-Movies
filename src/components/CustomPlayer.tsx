import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Loader2,
  RotateCcw,
  RotateCw,
  Bookmark,
  Music,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { type Subtitle, loadSubtitleAsVttUrl } from "../api/subtitles";
import { useToast } from "../hooks/useToast";

interface Props {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: Subtitle[];
  onSubtitleSearch?: () => void;
  onBookmark?: (time: number, note: string) => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

function fmtTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

// Check if URL is CORS-enabled by trying a HEAD request
async function testCors(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
    });
    return response.ok || response.status === 206;
  } catch {
    return false;
  }
}

export default function CustomPlayer({ 
  src, 
  poster, 
  title, 
  subtitles = [], 
  onSubtitleSearch,
  onBookmark 
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [subBlobUrl, setSubBlobUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<"none" | "speed" | "subs">("none");
  const [bookmarks, setBookmarks] = useState<Array<{ time: number; note: string }>>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [frameMode, setFrameMode] = useState(false);
  const [frameNumber, setFrameNumber] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showToast } = useToast();

  // Load source with CORS handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    
    setLoading(true);
    setError(null);
    setRetryCount(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const loadVideo = async () => {
      try {
        // Test CORS first
        const corsOk = await testCors(src);
        if (!corsOk) {
          setError("Video source blocked by CORS. Try a different source.");
          setLoading(false);
          return;
        }

        const isHls = /\.m3u8($|\?)/i.test(src);

        if (isHls && Hls.isSupported()) {
          const hls = new Hls({ 
            enableWorker: true,
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            },
          });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) {
              setError(`Stream error: ${data.type}. Try a different source.`);
              setLoading(false);
            }
          });
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
          });
        } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          video.src = src;
          video.load();
        } else {
          // MP4 or other formats
          video.src = src;
          video.load();
        }
      } catch (err) {
        setError("Failed to load video. The URL may be invalid or blocked.");
        setLoading(false);
      }
    };

    loadVideo();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrent(v.currentTime);
      setFrameNumber(Math.floor(v.currentTime * 30));
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onMeta = () => {
      setDuration(v.duration);
      setLoading(false);
    };
    const onWait = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onCanPlay = () => setLoading(false);
    const onError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      const errorCode = video.error?.code;
      let errorMsg = "Couldn't load this video.";
      
      switch (errorCode) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMsg = "Playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMsg = "Network error. Check your connection.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMsg = "Video format not supported.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = "Video source not supported.";
          break;
        default:
          errorMsg = "Couldn't load this video. The URL may be invalid or blocked by CORS.";
      }
      
      setError(errorMsg);
      setLoading(false);
      
      // If it's a CORS or network error, try with a proxy
      if (errorCode === MediaError.MEDIA_ERR_NETWORK || errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            setError(null);
            setLoading(true);
            // Try loading again with crossorigin attribute
            video.crossOrigin = "anonymous";
            video.load();
          }, 2000);
        }
      }
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [retryCount]);

  // Fullscreen state
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Auto-hide controls
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!wrapRef.current?.contains(document.activeElement) && document.activeElement?.tagName !== "BODY") return;
      const v = videoRef.current;
      if (!v) return;
      
      if (e.shiftKey) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          advanceFrame(1);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          advanceFrame(-1);
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case "arrowright":
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
          break;
        case "arrowleft":
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case "j":
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case "l":
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((vol) => {
            const nv = Math.min(1, vol + 0.05);
            v.volume = nv;
            return nv;
          });
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((vol) => {
            const nv = Math.max(0, vol - 0.05);
            v.volume = nv;
            return nv;
          });
          break;
        case "m":
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "c":
          setShowSettings(showSettings === "subs" ? "none" : "subs");
          break;
        case "b":
          addBookmark();
          break;
        case ">":
        case ".":
          changeSpeed(Math.min(3, speed + 0.25));
          break;
        case "<":
        case ",":
          changeSpeed(Math.max(0.25, speed - 0.25));
          break;
      }
      bumpControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speed, bumpControls, showSettings]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (error) {
      setError(null);
      setLoading(true);
      v.load();
      return;
    }
    v.paused ? v.play() : v.pause();
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await wrapRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };

  const onSeekBar = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  const advanceFrame = (direction: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    if (!frameMode) setFrameMode(true);
    const frameTime = 1 / 30;
    const newTime = v.currentTime + frameTime * direction;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, newTime));
    setFrameNumber(Math.floor(v.currentTime * 30));
  };

  const handleZoom = (direction: "in" | "out") => {
    const video = videoRef.current;
    if (!video) return;
    const newZoom = direction === "in" 
      ? Math.min(2, zoomLevel + 0.1) 
      : Math.max(0.5, zoomLevel - 0.1);
    setZoomLevel(newZoom);
    video.style.transform = `scale(${newZoom})`;
    video.style.transformOrigin = "center";
    bumpControls();
  };

  const addBookmark = () => {
    const note = prompt("Bookmark note:", `Bookmark at ${fmtTime(current)}`);
    if (note !== null) {
      const newBookmark = { time: current, note: note || `Bookmark at ${fmtTime(current)}` };
      setBookmarks(prev => [...prev, newBookmark]);
      if (onBookmark) onBookmark(current, note || `Bookmark at ${fmtTime(current)}`);
      showToast("📌 Bookmark added!", "success");
    }
  };

  // Apply subtitle
  useEffect(() => {
    let cancelled = false;
    if (subBlobUrl) {
      URL.revokeObjectURL(subBlobUrl);
      setSubBlobUrl(null);
    }
    if (!activeSub) return;
    const sub = subtitles.find((s) => s.id === activeSub);
    if (!sub) return;
    loadSubtitleAsVttUrl(sub)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setSubBlobUrl(url);
        setTimeout(() => {
          const v = videoRef.current;
          if (!v) return;
          for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = "showing";
        }, 100);
      })
      .catch(() => setActiveSub(null));
    return () => {
      cancelled = true;
    };
  }, [activeSub, subtitles]);

  return (
    <div
      ref={wrapRef}
      onMouseMove={bumpControls}
      onMouseLeave={() => playing && setShowControls(false)}
      className="relative w-full h-full bg-black group/player select-none"
      tabIndex={0}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        className="w-full h-full"
        onClick={togglePlay}
      >
        {subBlobUrl && <track kind="subtitles" src={subBlobUrl} default label="Subtitles" />}
      </video>

      {/* Frame counter */}
      {frameMode && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm font-mono z-10">
          Frame: {frameNumber}
        </div>
      )}

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="text-white animate-spin" size={56} />
          <p className="absolute bottom-1/3 text-zinc-500 text-xs">Loading video...</p>
        </div>
      )}

      {/* Error with retry button */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/80">
          <p className="text-red-400 font-bold mb-2">⚠ Playback Error</p>
          <p className="text-zinc-300 text-sm max-w-md">{error}</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                const v = videoRef.current;
                if (v) {
                  v.crossOrigin = "anonymous";
                  v.load();
                }
              }}
              className="bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-4 py-2 rounded-md transition"
            >
              Retry
            </button>
            <button
              onClick={() => {
                setError(null);
                setLoading(false);
                // Try using a proxy
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(src)}`;
                const v = videoRef.current;
                if (v) {
                  v.src = proxyUrl;
                  v.load();
                }
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-md transition"
            >
              Try Proxy
            </button>
          </div>
        </div>
      )}

      {/* Center play button */}
      {!playing && !loading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-20 h-20 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition"
          aria-label="Play"
        >
          <Play className="text-white fill-white ml-1" size={32} />
        </button>
      )}

      {/* Bookmark indicators */}
      <div className="absolute bottom-20 left-0 right-0 px-4 pointer-events-none">
        {bookmarks.map((bm, i) => (
          <button
            key={i}
            onClick={() => seek(bm.time)}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full hover:scale-150 transition pointer-events-auto"
            style={{ left: `${(bm.time / duration) * 100}%` }}
            title={bm.note}
          />
        ))}
      </div>

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-16 pb-3 px-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress bar */}
        <div
          onClick={onSeekBar}
          className="relative h-1.5 hover:h-2 transition-all bg-white/25 rounded-full cursor-pointer mb-3 group/bar"
        >
          <div
            className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[#e50914] rounded-full"
            style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#e50914] rounded-full opacity-0 group-hover/bar:opacity-100 transition"
            style={{ left: `calc(${duration ? (current / duration) * 100 : 0}% - 6px)` }}
          />
        </div>

        <div className="flex items-center gap-2 text-white flex-wrap">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="hover:scale-110 transition">
            {playing ? <Pause size={22} /> : <Play size={22} className="fill-white" />}
          </button>

          {/* Skip buttons */}
          <button onClick={() => skip(-10)} className="hover:scale-110 transition">
            <RotateCcw size={18} />
          </button>
          <button onClick={() => skip(10)} className="hover:scale-110 transition">
            <RotateCw size={18} />
          </button>

          {/* Frame advance */}
          <button 
            onClick={() => advanceFrame(-1)}
            className="text-zinc-400 hover:text-white text-xs font-mono px-1"
          >
            ◀ F
          </button>
          <button 
            onClick={() => advanceFrame(1)}
            className="text-zinc-400 hover:text-white text-xs font-mono px-1"
          >
            F ▶
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 group/vol">
            <button
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.muted = !v.muted;
                setMuted(v.muted);
              }}
              className="hover:scale-110 transition"
            >
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                const nv = Number(e.target.value);
                v.volume = nv;
                v.muted = nv === 0;
                setVolume(nv);
                setMuted(nv === 0);
              }}
              className="w-0 group-hover/vol:w-20 opacity-0 group-hover/vol:opacity-100 transition-all accent-[#e50914]"
            />
          </div>

          {/* Time */}
          <span className="text-xs tabular-nums text-zinc-200 whitespace-nowrap">
            {fmtTime(current)} / {fmtTime(duration)}
          </span>

          {title && (
            <span className="ml-2 text-sm font-medium truncate hidden md:inline flex-1 text-zinc-300">
              {title}
            </span>
          )}

          <div className="flex-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => handleZoom("out")} className="text-zinc-400 hover:text-white">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-zinc-400 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => handleZoom("in")} className="text-zinc-400 hover:text-white">
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Bookmark */}
          <button 
            onClick={addBookmark}
            className="text-zinc-400 hover:text-yellow-500 transition"
            title="Add bookmark (B)"
          >
            <Bookmark size={18} />
          </button>

          {/* Subtitles */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(showSettings === "subs" ? "none" : "subs")}
              className={`hover:scale-110 transition ${activeSub ? "text-[#e50914]" : ""}`}
              title="Subtitles (C)"
            >
              <Subtitles size={20} />
            </button>
            {showSettings === "subs" && (
              <div className="absolute bottom-10 right-0 bg-zinc-950/95 backdrop-blur border border-zinc-800 rounded-lg w-64 max-h-72 overflow-y-auto p-2 text-sm">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="font-bold">Subtitles</span>
                  {onSubtitleSearch && (
                    <button
                      onClick={() => {
                        onSubtitleSearch();
                        setShowSettings("none");
                      }}
                      className="text-xs text-[#e50914] hover:underline"
                    >
                      🔄 Refresh
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActiveSub(null);
                    setShowSettings("none");
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 ${!activeSub ? "text-[#e50914]" : ""}`}
                >
                  Off
                </button>
                {subtitles.length === 0 && (
                  <p className="px-2 py-2 text-xs text-zinc-500">No subtitles found.</p>
                )}
                {subtitles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSub(s.id);
                      setShowSettings("none");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 flex items-center gap-2 ${
                      activeSub === s.id ? "text-[#e50914]" : ""
                    }`}
                  >
                    {s.flagUrl && <img src={s.flagUrl} alt="" className="w-4 h-3 object-cover" />}
                    <span className="truncate">{s.display}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(showSettings === "speed" ? "none" : "speed")}
              className="hover:scale-110 transition flex items-center gap-1"
              title="Playback speed"
            >
              <Settings size={20} />
              {speed !== 1 && <span className="text-xs font-bold">{speed}×</span>}
            </button>
            {showSettings === "speed" && (
              <div className="absolute bottom-10 right-0 bg-zinc-950/95 backdrop-blur border border-zinc-800 rounded-lg w-48 p-2 text-sm">
                <p className="px-2 py-1 font-bold border-b border-zinc-800 mb-1">Playback speed</p>
                <div className="grid grid-cols-3 gap-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        changeSpeed(s);
                        setShowSettings("none");
                      }}
                      className={`px-2 py-1.5 rounded text-sm transition ${
                        s === speed ? "bg-[#e50914] text-white" : "hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {s === 1 ? "Normal" : `${s}×`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="hover:scale-110 transition" title="Fullscreen (F)">
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        <p className="text-[10px] text-zinc-500 mt-2 hidden md:block">
          Shortcuts: Space/K=play · ←/→=5s · J/L=10s · ↑/↓=volume · M=mute · F=fullscreen · &lt;/&gt;=speed · B=bookmark · Shift+←/→=frame
        </p>
      </div>
    </div>
  );
}