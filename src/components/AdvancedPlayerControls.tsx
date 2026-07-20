import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, SkipBack, SkipForward, Subtitles, Loader2,
  ZoomIn, ZoomOut, Bookmark, Scissors, Music, Plus, Minus,
  ChevronUp, ChevronDown, Monitor, Smartphone, Tv
} from "lucide-react";
import { useAdaptiveBitrate } from "../hooks/useAdaptiveBitrate";
import { useToast } from "../hooks/useToast";

interface AdvancedControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onBookmark?: (time: number, note: string) => void;
  onSceneSkip?: (direction: "forward" | "backward") => void;
  onSongDetect?: () => Promise<string>;
  subtitles?: Array<{ id: string; label: string; url: string }>;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function AdvancedPlayerControls({
  videoRef,
  onBookmark,
  onSceneSkip,
  onSongDetect,
  subtitles = [],
}: AdvancedControlsProps) {
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"speed" | "quality" | "subtitles" | "audio">("speed");
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [frameMode, setFrameMode] = useState(false);
  const [frameNumber, setFrameNumber] = useState(0);
  const [bookmarks, setBookmarks] = useState<Array<{ time: number; note: string }>>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isDetectingSong, setIsDetectingSong] = useState(false);
  
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const { showToast } = useToast();
  
  // Adaptive bitrate
  const { quality, setQuality, bufferHealth } = useAdaptiveBitrate(videoRef);

  // Format time
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  };

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlers = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => {
        setCurrentTime(video.currentTime);
        setFrameNumber(Math.floor(video.currentTime * 30));
      },
      loadedmetadata: () => setDuration(video.duration),
      volumechange: () => {
        setVolume(video.volume);
        setMuted(video.muted);
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      video.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        video.removeEventListener(event, handler);
      });
    };
  }, [videoRef]);

  // Auto-hide controls
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [playing]);

  // Frame advance
  const advanceFrame = useCallback((direction: 1 | -1) => {
    const video = videoRef.current;
    if (!video) return;
    if (!frameMode) setFrameMode(true);
    const frameTime = 1 / 30;
    const newTime = video.currentTime + frameTime * direction;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, newTime));
    setFrameNumber(Math.floor(video.currentTime * 30));
  }, [videoRef, frameMode]);

  // Zoom controls
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

  // Song detection
  const detectSong = async () => {
    if (!onSongDetect) return;
    setIsDetectingSong(true);
    try {
      const song = await onSongDetect();
      showToast(`🎵 Now playing: ${song}`, "info");
    } catch {
      showToast("Couldn't identify song", "error");
    } finally {
      setIsDetectingSong(false);
    }
  };

  // Add bookmark
  const addBookmark = () => {
    if (!onBookmark) return;
    const note = bookmarkNote || `Bookmark at ${formatTime(currentTime)}`;
    onBookmark(currentTime, note);
    setBookmarks(prev => [...prev, { time: currentTime, note }]);
    setBookmarkNote("");
    setShowBookmarkDialog(false);
    showToast("📌 Bookmark added!", "success");
    bumpControls();
  };

  // Jump to bookmark
  const jumpToBookmark = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      bumpControls();
    }
  };

  // Scene skip
  const skipScene = (direction: "forward" | "backward") => {
    if (onSceneSkip) {
      onSceneSkip(direction);
      bumpControls();
    }
  };

  return (
    <div 
      className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"
      onMouseMove={bumpControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Frame counter */}
      {frameMode && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm font-mono">
          Frame: {frameNumber}
        </div>
      )}

      {/* Bookmark indicators on timeline */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <div className="relative h-4">
          {bookmarks.map((bm, i) => (
            <button
              key={i}
              onClick={() => jumpToBookmark(bm.time)}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full hover:scale-150 transition"
              style={{ left: `${(bm.time / duration) * 100}%` }}
              title={bm.note}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress bar */}
        <div className="relative mb-2">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              if (videoRef.current) {
                videoRef.current.currentTime = Number(e.target.value);
              }
            }}
            className="w-full h-1 bg-white/25 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#e50914] [&::-webkit-slider-thumb]:rounded-full"
          />
          <div 
            className="absolute top-0 left-0 h-1 bg-[#e50914] rounded-full pointer-events-none"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2 text-white flex-wrap">
          <button onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}>
            {playing ? <Pause size={20} /> : <Play size={20} className="fill-white" />}
          </button>
          
          <button onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}>
            <SkipBack size={18} />
          </button>
          <button onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}>
            <SkipForward size={18} />
          </button>

          {/* Frame advance buttons */}
          <button 
            onClick={() => advanceFrame(-1)}
            className="text-zinc-400 hover:text-white text-xs font-mono px-1"
          >
            ◀ Frame
          </button>
          <button 
            onClick={() => advanceFrame(1)}
            className="text-zinc-400 hover:text-white text-xs font-mono px-1"
          >
            Frame ▶
          </button>

          {/* Scene skip */}
          <button onClick={() => skipScene("backward")} className="text-zinc-400 hover:text-white">
            <Scissors size={16} className="rotate-180" />
          </button>
          <button onClick={() => skipScene("forward")} className="text-zinc-400 hover:text-white">
            <Scissors size={16} />
          </button>

          <div className="flex-1" />

          {/* Bookmark button */}
          <button 
            onClick={() => setShowBookmarkDialog(true)}
            className="text-zinc-400 hover:text-yellow-500 transition"
            title="Add bookmark"
          >
            <Bookmark size={18} />
          </button>

          {/* Bookmark list toggle */}
          {bookmarks.length > 0 && (
            <button 
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              📌 {bookmarks.length}
            </button>
          )}

          {/* Song detection */}
          {onSongDetect && (
            <button 
              onClick={detectSong}
              disabled={isDetectingSong}
              className="text-zinc-400 hover:text-white transition disabled:opacity-50"
              title="What song is playing?"
            >
              {isDetectingSong ? <Loader2 size={18} className="animate-spin" /> : <Music size={18} />}
            </button>
          )}

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

          {/* Settings */}
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-zinc-400 hover:text-white transition"
            >
              <Settings size={20} />
            </button>

            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-lg p-4 min-w-[250px] max-h-[400px] overflow-y-auto">
                {/* Settings tabs */}
                <div className="flex gap-2 mb-3 border-b border-zinc-800 pb-2">
                  {["speed", "quality", "subtitles"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSettingsTab(tab as any)}
                      className={`text-xs px-3 py-1 rounded-full transition ${
                        settingsTab === tab 
                          ? "bg-[#e50914] text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Speed settings */}
                {settingsTab === "speed" && (
                  <div className="grid grid-cols-4 gap-1">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setSpeed(s);
                          if (videoRef.current) videoRef.current.playbackRate = s;
                        }}
                        className={`px-2 py-1.5 rounded text-sm transition ${
                          s === speed 
                            ? "bg-[#e50914] text-white" 
                            : "hover:bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {s === 1 ? "Normal" : `${s}×`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quality settings */}
                {settingsTab === "quality" && (
                  <div className="space-y-1">
                    {["auto", "high", "medium", "low"].map(q => (
                      <button
                        key={q}
                        onClick={() => setQuality(q as any)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition flex items-center justify-between ${
                          quality === q 
                            ? "bg-[#e50914] text-white" 
                            : "hover:bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <span>{q.charAt(0).toUpperCase() + q.slice(1)}</span>
                        {quality === q && <span>✓</span>}
                      </button>
                    ))}
                    {bufferHealth !== undefined && (
                      <div className="mt-2 text-xs text-zinc-500">
                        Buffer: {Math.round(bufferHealth * 100)}%
                      </div>
                    )}
                  </div>
                )}

                {/* Subtitle settings */}
                {settingsTab === "subtitles" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedSub(null);
                        // Disable subtitles
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                        !selectedSub 
                          ? "bg-[#e50914] text-white" 
                          : "hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      Off
                    </button>
                    {subtitles.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSub(sub.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition flex items-center justify-between ${
                          selectedSub === sub.id 
                            ? "bg-[#e50914] text-white" 
                            : "hover:bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <span>{sub.label}</span>
                        {selectedSub === sub.id && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button 
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setFullscreen(true);
              } else {
                document.exitFullscreen();
                setFullscreen(false);
              }
            }}
            className="text-zinc-400 hover:text-white"
          >
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-white text-sm font-mono">{formatTime(currentTime)}</span>
          <span className="text-zinc-400 text-sm">/</span>
          <span className="text-zinc-400 text-sm font-mono">{formatTime(duration)}</span>
          {speed !== 1 && (
            <span className="text-xs text-zinc-400 ml-2">{speed}×</span>
          )}
          {quality !== "auto" && (
            <span className="text-xs text-zinc-400 ml-2">
              {quality === "high" ? "1080p" : quality === "medium" ? "720p" : "480p"}
            </span>
          )}
        </div>
      </div>

      {/* Bookmark dialog */}
      {showBookmarkDialog && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur flex items-center justify-center">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-sm w-full border border-zinc-800">
            <h3 className="text-white font-bold mb-2">Add Bookmark</h3>
            <p className="text-zinc-400 text-sm mb-4">
              At {formatTime(currentTime)}
            </p>
            <input
              type="text"
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white text-sm mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={addBookmark}
                className="flex-1 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-2 rounded transition"
              >
                Save
              </button>
              <button
                onClick={() => setShowBookmarkDialog(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks list */}
      {showBookmarks && bookmarks.length > 0 && (
        <div className="absolute bottom-24 left-4 bg-black/90 backdrop-blur border border-zinc-800 rounded-lg p-3 max-h-[200px] overflow-y-auto min-w-[200px]">
          <div className="text-white text-sm font-bold mb-2">Bookmarks</div>
          {bookmarks.map((bm, i) => (
            <button
              key={i}
              onClick={() => jumpToBookmark(bm.time)}
              className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded text-sm text-zinc-300 flex items-center justify-between"
            >
              <span>{formatTime(bm.time)}</span>
              <span className="text-xs text-zinc-500 truncate max-w-[100px]">
                {bm.note}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className={`absolute bottom-28 right-4 text-[10px] text-zinc-500 transition-opacity ${
        showControls ? "opacity-100" : "opacity-0"
      }`}>
        Press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white text-[10px]">?</kbd> for shortcuts
      </div>
    </div>
  );
}