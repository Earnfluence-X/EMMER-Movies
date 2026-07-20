import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWatchHistory } from "../context/WatchHistoryContext";
import { useMyList } from "../context/MyListContext";
import { SkeletonGrid } from "../components/Skeleton";
import { IMG } from "../api/tmdb";
import { Play, Clock, Trash2, BookOpen, CheckCircle } from "lucide-react";

export default function ContinueWatching() {
  const { history, removeFromHistory, clearHistory, getProgress } = useWatchHistory();
  const { has: isInMyList } = useMyList();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Get items with progress
  const itemsWithProgress = history
    .map(item => ({
      ...item,
      progress: getProgress(item.id),
    }))
    .filter(item => item.progress)
    .sort((a, b) => {
      // Sort by last watched, but prioritize in-progress over completed
      if (a.progress!.progress >= 100 && b.progress!.progress < 100) return 1;
      if (a.progress!.progress < 100 && b.progress!.progress >= 100) return -1;
      return b.lastWatched - a.lastWatched;
    });

  const inProgress = itemsWithProgress.filter(i => i.progress!.progress > 0 && i.progress!.progress < 100);
  const completed = itemsWithProgress.filter(i => i.progress!.progress >= 100);

  if (isLoading) {
    return (
      <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
        <div className="h-10 w-64 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-8" />
        <SkeletonGrid count={12} />
      </div>
    );
  }

  const renderItem = (item: any) => {
    const progress = item.progress!;
    const isComplete = progress.progress >= 100;
    
    return (
      <Link
        key={item.id}
        to={`/movie/${item.id}`}
        className="group relative block"
      >
        <div className="relative rounded-lg overflow-hidden bg-zinc-900">
          <img
            src={IMG(item.poster_path, "w300")}
            alt={item.title}
            className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2 text-white">
                <Play size={20} className="fill-white" />
                <span>Continue Watching</span>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
            <div
              className={`h-full transition-all ${
                isComplete ? "bg-green-500" : "bg-[#e50914]"
              }`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          {/* Status badge */}
          {isComplete && (
            <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle size={12} />
              Watched
            </div>
          )}
        </div>
        
        <div className="mt-2">
          <h3 className="text-white text-sm font-medium truncate">{item.title}</h3>
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              {isComplete ? "100%" : `${Math.round(progress.progress)}%`}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(item.lastWatched).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-3xl md:text-4xl font-black flex items-center gap-3">
            <BookOpen size={32} className="text-[#e50914]" />
            Continue Watching
          </h1>
          <p className="text-zinc-400 mt-1">
            {itemsWithProgress.length} {itemsWithProgress.length === 1 ? "title" : "titles"} in progress
          </p>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear your entire watch history?")) {
                clearHistory();
              }
            }}
            className="text-sm text-zinc-500 hover:text-red-500 transition flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        )}
      </div>

      {/* Empty state */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <BookOpen size={40} className="text-zinc-600" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Nothing in progress</h2>
          <p className="text-zinc-400 max-w-md mb-6">
            Watch a movie and we'll track your progress here so you can pick up where you left off.
          </p>
          <Link
            to="/"
            className="bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-6 py-3 rounded-lg transition"
          >
            Browse Movies
          </Link>
        </div>
      )}

      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <div className="mb-10">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-[#e50914]" />
            In Progress
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {inProgress.map(renderItem)}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Completed
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {completed.map(renderItem)}
          </div>
        </div>
      )}

      {/* Recently Watched but not in My List */}
      {history.length > 0 && (
        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <p className="text-zinc-400 text-sm text-center">
            💡 {history.filter(item => !isInMyList(item.id)).length} titles you've watched aren't in your list.
            <Link to="/mylist" className="text-[#e50914] hover:underline ml-1">
              View My List →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}