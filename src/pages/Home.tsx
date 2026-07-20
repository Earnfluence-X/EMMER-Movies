import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import MovieRow from "../components/MovieRow";
import { tmdb, type Movie } from "../api/tmdb";
import { Loader2 } from "lucide-react";
import { useMyList } from "../context/MyListContext";
import { useWatchHistory } from "../context/WatchHistoryContext";
import { usePrefetch } from "../hooks/usePrefetch";
import { useDownloads } from "../context/DownloadContext";

interface ListResp {
  results: Movie[];
}

export default function Home() {
  const { items: myListItems } = useMyList();
  const { history } = useWatchHistory();
  const { items: downloadItems, isAutoDownloading, getQueueStatus } = useDownloads();
  const { downloading } = getQueueStatus();

  // Get movies from watch history
  const continueWatchingMovies = history
    .filter(item => {
      const progress = item.progress;
      return progress && progress.progress > 0 && progress.progress < 100;
    })
    .slice(0, 10)
    .map(item => item as Movie);

  const queries = useQueries({
    queries: [
      { queryKey: ["trending"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.trending(signal) },
      { queryKey: ["popular"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.popular(signal) },
      { queryKey: ["topRated"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.topRated(signal) },
      { queryKey: ["upcoming"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.upcoming(signal) },
      { queryKey: ["nowPlaying"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.nowPlaying(signal) },
      { queryKey: ["genre", 28], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.byGenre(28, signal) },
      { queryKey: ["genre", 35], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.byGenre(35, signal) },
      { queryKey: ["genre", 27], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.byGenre(27, signal) },
      { queryKey: ["genre", 878], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.byGenre(878, signal) },
      { queryKey: ["genre", 16], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.byGenre(16, signal) },
      { queryKey: ["trendingTv"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.trendingTv(signal) },
    ],
  });

  const [trending, popular, topRated, upcoming, nowPlaying, action, comedy, horror, scifi, animation, tv] = queries;

  const trendingResults = (trending.data as ListResp | undefined)?.results ?? [];
  const get = (q: typeof queries[number]) => ((q.data as ListResp | undefined)?.results ?? []);

  // Prefetch home page content
  usePrefetch(["prefetch-home"], () => Promise.all([
    tmdb.trending(),
    tmdb.popular(),
    tmdb.topRated(),
  ]), { threshold: 0.1, delay: 1000 });

  if (trending.isLoading && trendingResults.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="text-[#e50914] animate-spin" size={48} />
      </div>
    );
  }

  if (trending.isError) {
    return (
      <div className="pt-24 px-4 md:px-10 text-center text-zinc-300">
        <h2 className="text-2xl font-bold text-white mb-2">Couldn't load movies</h2>
        <p className="text-sm text-zinc-500">Check your connection and refresh.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Hero movies={trendingResults} />
      
      {/* Download Status Bar */}
      {(downloading > 0 || isAutoDownloading) && (
        <div className="px-4 md:px-10 mt-4 mb-2">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 flex items-center gap-3 animate-fade-in">
            <Loader2 size={20} className="animate-spin text-[#e50914]" />
            <span className="text-sm text-zinc-300">
              {isAutoDownloading ? "Auto-downloading..." : `Downloading ${downloading} movie${downloading > 1 ? 's' : ''}...`}
            </span>
            <span className="text-xs text-zinc-500 ml-auto">
              {downloadItems.filter(d => d.status === "downloading").map(d => (
                <span key={d.id} className="ml-2">
                  {Math.round(d.progress || 0)}%
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      <div className="-mt-16 md:-mt-24 relative z-10">
        {/* Continue Watching Row */}
        {continueWatchingMovies.length > 0 && (
          <MovieRow 
            title="▶️ Continue Watching" 
            movies={continueWatchingMovies} 
            large 
            showMore 
            category="continue-watching"
          />
        )}

        {/* My List Row */}
        {myListItems.length > 0 && (
          <MovieRow 
            title="⭐ My List" 
            movies={myListItems.slice(0, 10)} 
            large 
            showMore 
            category="mylist"
          />
        )}

        <MovieRow title="🔥 Trending This Week" movies={trendingResults} large showMore category="trending" />
        <MovieRow title="Popular on EMMER" movies={get(popular)} showMore category="popular" />
        <MovieRow title="Now Playing in Theaters" movies={get(nowPlaying)} showMore category="now-playing" />
        <MovieRow title="Top Rated of All Time" movies={get(topRated)} large showMore category="top-rated" />
        <MovieRow title="Coming Soon" movies={get(upcoming)} showMore category="upcoming" />
        <MovieRow title="Action & Adventure" movies={get(action)} showMore category="action" />
        <MovieRow title="Sci-Fi Spectacles" movies={get(scifi)} showMore category="sci-fi" />
        <MovieRow title="Comedy Hits" movies={get(comedy)} showMore category="comedy" />
        <MovieRow title="Horror Nights" movies={get(horror)} showMore category="horror" />
        <MovieRow title="Animated Worlds" movies={get(animation)} showMore category="animation" />
        <MovieRow title="Trending TV Shows" movies={get(tv)} showMore category="tv-shows" />
      </div>
    </div>
  );
}