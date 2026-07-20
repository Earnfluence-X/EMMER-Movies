import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMyList } from "../context/MyListContext";
import { useWatchHistory } from "../context/WatchHistoryContext";
import { SkeletonGrid } from "../components/Skeleton";
import { IMG } from "../api/tmdb";
import { Play, Trash2, Clock, TrendingUp, List, X } from "lucide-react";

export default function MyList() {
  const { items, remove, clear, has } = useMyList();
  const { getProgress } = useWatchHistory();
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unwatched" | "in-progress" | "completed">("all");
  const [sort, setSort] = useState<"recent" | "title" | "rating">("recent");

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter items
  const filteredItems = items.filter(item => {
    const progress = getProgress(item.id);
    switch (filter) {
      case "unwatched":
        return !progress || progress.progress === 0;
      case "in-progress":
        return progress && progress.progress > 0 && progress.progress < 100;
      case "completed":
        return progress && progress.progress >= 100;
      default:
        return true;
    }
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sort) {
      case "title":
        return (a.title || "").localeCompare(b.title || "");
      case "rating":
        return (b.vote_average || 0) - (a.vote_average || 0);
      default: // recent
        return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  if (isLoading) {
    return (
      <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
        <div className="h-10 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-8" />
        <SkeletonGrid count={12} />
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-3xl md:text-4xl font-black flex items-center gap-3">
            <List size={32} className="text-[#e50914]" />
            My List
          </h1>
          <p className="text-zinc-400 mt-1">
            {items.length} {items.length === 1 ? "title" : "titles"} saved
          </p>
        </div>
        
        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear all items from your list?")) {
                clear();
              }
            }}
            className="text-sm text-zinc-500 hover:text-red-500 transition flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === "all"
                ? "bg-[#e50914] text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unwatched")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === "unwatched"
                ? "bg-[#e50914] text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            Unwatched
          </button>
          <button
            onClick={() => setFilter("in-progress")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === "in-progress"
                ? "bg-[#e50914] text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === "completed"
                ? "bg-[#e50914] text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            Completed
          </button>
          
          <div className="flex-1" />
          
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#e50914]"
          >
            <option value="recent">Recently Added</option>
            <option value="title">Alphabetical</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <List size={40} className="text-zinc-600" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Your list is empty</h2>
          <p className="text-zinc-400 max-w-md mb-6">
            Add movies and shows you want to watch. They'll appear here for easy access.
          </p>
          <Link
            to="/"
            className="bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-6 py-3 rounded-lg transition"
          >
            Browse Movies
          </Link>
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {sortedItems.map(movie => {
            const progress = getProgress(movie.id);
            const progressPercent = progress ? progress.progress : 0;
            
            return (
              <div key={movie.id} className="relative group">
                <Link to={`/movie/${movie.id}`}>
                  <div className="relative">
                    <img
                      src={IMG(movie.poster_path, "w300")}
                      alt={movie.title}
                      className="w-full rounded-md object-cover aspect-[2/3]"
                      loading="lazy"
                    />
                    
                    {/* Progress bar */}
                    {progressPercent > 0 && progressPercent < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                        <div
                          className="h-full bg-[#e50914] transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                    
                    {progressPercent >= 100 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Watched
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <h3 className="text-white text-sm font-medium truncate">{movie.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{movie.release_date?.slice(0, 4) || "N/A"}</span>
                      {movie.vote_average > 0 && (
                        <span className="flex items-center gap-1">
                          <span>★</span>
                          {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                
                <button
                  onClick={() => remove(movie.id)}
                  className="absolute top-2 right-2 bg-black/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition hover:bg-[#e50914]"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}