import { useQueries } from "@tanstack/react-query";
import Hero from "../components/Hero";
import MovieRow from "../components/MovieRow";
import { tmdb, type Movie } from "../api/tmdb";
import { Loader2 } from "lucide-react";

interface ListResp {
  results: Movie[];
}

export default function Home() {
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
        <MovieRow title="🔥 Trending This Week" movies={trendingResults} large />
        <MovieRow title="Popular on EMMER" movies={get(popular)} />
        <MovieRow title="Now Playing in Theaters" movies={get(nowPlaying)} />
        <MovieRow title="Top Rated of All Time" movies={get(topRated)} large />
        <MovieRow title="Coming Soon" movies={get(upcoming)} />
        <MovieRow title="Action & Adventure" movies={get(action)} />
        <MovieRow title="Sci-Fi Spectacles" movies={get(scifi)} />
        <MovieRow title="Comedy Hits" movies={get(comedy)} />
        <MovieRow title="Horror Nights" movies={get(horror)} />
        <MovieRow title="Animated Worlds" movies={get(animation)} />
        <MovieRow title="Trending TV Shows" movies={get(tv)} />
      </div>
    </div>
  );
}
