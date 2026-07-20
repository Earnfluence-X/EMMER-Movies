import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import MovieRow from "../components/MovieRow";
import { tmdb, type Movie } from "../api/tmdb";
import { Loader2 } from "lucide-react";
import { useMyList } from "../context/MyListContext";
import { useWatchHistory } from "../context/WatchHistoryContext";
import { usePrefetch } from "../hooks/usePrefetch";

interface ListResp {
  results: Movie[];
}

export default function Home() {
  const { items: myListItems } = useMyList();
  const { history } = useWatchHistory();

  const continueWatchingMovies = history
    .filter(item => {
      const progress = item.progress;
      return progress && progress.progress > 0 && progress.progress < 100;
    })
    .slice(0, 10)
    .map(item => item as Movie);

  const queries = useQueries({
    queries: [
      // Movies
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
      // TV Shows
      { queryKey: ["trendingTv"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.trendingTv(signal) },
      { queryKey: ["popularTv"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.popularTv(signal) },
      { queryKey: ["topRatedTv"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.topRatedTv(signal) },
      { queryKey: ["airingToday"], queryFn: ({ signal }: { signal: AbortSignal }) => tmdb.airingToday(signal) },
    ],
  });

  const [
    trending,
    popular,
    topRated,
    upcoming,
    nowPlaying,
    action,
    comedy,
    horror,
    scifi,
    animation,
    trendingTv,
    popularTv,
    topRatedTv,
    airingToday,
  ] = queries;

  const trendingResults = (trending.data as ListResp | undefined)?.results ?? [];
  const get = (q: typeof queries[number]) => ((q.data as ListResp | undefined)?.results ?? []);

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
      <div className="-mt-16 md:-mt-24 relative z-10">
        {/* Continue Watching */}
        {continueWatchingMovies.length > 0 && (
          <MovieRow
            title="▶️ Continue Watching"
            movies={continueWatchingMovies}
            large
            showMore
            category="continue-watching"
          />
        )}

        {/* My List */}
        {myListItems.length > 0 && (
          <MovieRow
            title="⭐ My List"
            movies={myListItems.slice(0, 10)}
            large
            showMore
            category="mylist"
          />
        )}

        {/* Movies */}
        <MovieRow title="🔥 Trending Movies" movies={trendingResults} large showMore category="trending" />
        <MovieRow title="Popular Movies" movies={get(popular)} showMore category="popular" />
        <MovieRow title="Now Playing" movies={get(nowPlaying)} showMore category="now-playing" />
        <MovieRow title="Top Rated Movies" movies={get(topRated)} large showMore category="top-rated" />
        <MovieRow title="Coming Soon" movies={get(upcoming)} showMore category="upcoming" />

        {/* TV Shows */}
        <MovieRow title="📺 Trending TV Shows" movies={get(trendingTv)} large showMore category="trending-tv" />
        <MovieRow title="📺 Popular TV Shows" movies={get(popularTv)} showMore category="popular-tv" />
        <MovieRow title="📺 Top Rated TV Shows" movies={get(topRatedTv)} showMore category="top-rated-tv" />
        <MovieRow title="📺 Airing Today" movies={get(airingToday)} showMore category="airing-today" />

        {/* Genre Movies */}
        <MovieRow title="Action & Adventure" movies={get(action)} showMore category="action" />
        <MovieRow title="Sci-Fi Spectacles" movies={get(scifi)} showMore category="sci-fi" />
        <MovieRow title="Comedy Hits" movies={get(comedy)} showMore category="comedy" />
        <MovieRow title="Horror Nights" movies={get(horror)} showMore category="horror" />
        <MovieRow title="Animated Worlds" movies={get(animation)} showMore category="animation" />
      </div>
    </div>
  );
}