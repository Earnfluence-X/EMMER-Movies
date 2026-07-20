import { useState, useEffect } from "react";
import { Keyboard, X, Play, Pause, SkipForward, SkipBack, Volume2, Maximize, Settings, Bookmark, Music } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    key: string;
    description: string;
    icon?: React.ReactNode;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Playback",
    shortcuts: [
      { key: "Space / K", description: "Play/Pause", icon: <Play size={14} /> },
      { key: "← / →", description: "Seek backward/forward 5s", icon: <SkipBack size={14} /> },
      { key: "J / L", description: "Seek backward/forward 10s", icon: <SkipForward size={14} /> },
      { key: "0-9", description: "Seek to 0-90% of video" },
    ],
  },
  {
    title: "Audio & Video",
    shortcuts: [
      { key: "↑ / ↓", description: "Volume up/down", icon: <Volume2 size={14} /> },
      { key: "M", description: "Mute/Unmute" },
      { key: "F", description: "Toggle fullscreen", icon: <Maximize size={14} /> },
      { key: ", / .", description: "Decrease/Increase speed" },
    ],
  },
  {
    title: "Advanced",
    shortcuts: [
      { key: "Shift + ← / →", description: "Frame-by-frame advance" },
      { key: "C", description: "Toggle subtitles" },
      { key: "B", description: "Add bookmark", icon: <Bookmark size={14} /> },
      { key: "S", description: "Detect song (Shazam)", icon: <Music size={14} /> },
      { key: "Shift + P", description: "Picture-in-picture" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { key: "?", description: "Toggle this dialog", icon: <Settings size={14} /> },
      { key: "Escape", description: "Close dialogs / fullscreen" },
      { key: "Home", description: "Scroll to top" },
    ],
  },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger if not in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Filter shortcuts based on search
  const filteredGroups = SHORTCUT_GROUPS.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(s => 
      s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.shortcuts.length > 0);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-zinc-900/80 backdrop-blur text-zinc-400 hover:text-white p-2.5 rounded-full border border-zinc-800 transition hover:scale-110 z-40 group"
        title="Keyboard shortcuts (Press ?)"
      >
        <Keyboard size={20} className="group-hover:rotate-12 transition" />
        <span className="absolute -top-1 -right-1 bg-[#e50914] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
          ?
        </span>
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-white text-2xl font-bold flex items-center gap-3">
              <Keyboard size={24} className="text-[#e50914]" />
              Keyboard Shortcuts
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Master the player with keyboard shortcuts</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter shortcuts..."
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#e50914] outline-none transition"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="overflow-y-auto max-h-[55vh] p-4">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Keyboard size={48} className="mx-auto mb-3 opacity-30" />
              <p>No shortcuts found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredGroups.map((group, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut, sIdx) => (
                    <div 
                      key={sIdx} 
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition group/shortcut"
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon && (
                          <span className="text-zinc-500 group-hover/shortcut:text-white transition">
                            {shortcut.icon}
                          </span>
                        )}
                        <span className="text-zinc-300 text-sm">{shortcut.description}</span>
                      </div>
                      <kbd className="bg-zinc-800 group-hover/shortcut:bg-zinc-700 text-white px-3 py-1 rounded text-sm font-mono transition border border-zinc-700 group-hover/shortcut:border-zinc-600">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-500 text-center">
            Press <kbd className="bg-zinc-800 px-2 py-0.5 rounded text-xs text-white">?</kbd> to toggle this dialog • 
            Press <kbd className="bg-zinc-800 px-2 py-0.5 rounded text-xs text-white">Escape</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}