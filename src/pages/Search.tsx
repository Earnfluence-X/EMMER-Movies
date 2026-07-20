import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, type Movie, getTitle, getYear } from "../api/tmdb";
import MovieCard from "../components/MovieCard";
import { Loader2, SearchX, Tv, Film } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [input, setInput] = useState(initial);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const debounced = useDebounce(input, 400);

  useEffect(() => {
    if (debounced) setParams({ q: debounced }, { replace: true });
    else setParams({}, { replace: true });
  }, [debounced, setParams]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: ({ signal }) => tmdb.search(debounced, signal),
    enabled: debounced.trim().length > 0,
    staleTime: 60_000,
  });

  // Filter out people, keep movies and TV shows
  const results = (data?.results ?? []).filter(
    (m: Movie) => m.media_type !== "person" && (m.poster_path || m.backdrop_path)
  );

  const filteredResults = results.filter((m: Movie) => {
    if (filter === "all") return true;
    if (filter === "movie") return m.media_type === "movie";
    if (filter === "tv") return m.media_type === "tv";
    return true;
  });

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
      <div className="max-w-2xl mb-4">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search movies, TV shows, actors…"
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#e50914] outline-none rounded-lg px-4 py-3 text-white text-lg transition-colors"
        />
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            filter === "all" ? "bg-[#e50914] text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("movie")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 ${
            filter === "movie" ? "bg-[#e50914] text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <Film size={14} /> Movies
        </button>
        <button
          onClick={() => setFilter("tv")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 ${
            filter === "tv" ? "bg-[#e50914] text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <Tv size={14} /> TV Shows
        </button>
        <span className="text-xs text-zinc-500 ml-auto">
          {filteredResults.length} results
        </span>
      </div>

      <h1 className="text-white text-xl md:text-2xl font-bold mb-1">
        {debounced ? (
          <>
            Results for "<span className="text-[#e50914]">{debounced}</span>"
          </>
        ) : (
          "Start typing to search"
        )}
      </h1>

      {isFetching ? (
        <div className="flex justify-center py-20">
          <Loader2 className="text-white animate-spin" size={40} />
        </div>
      ) : debounced && filteredResults.length === 0 ? (
        <div className="flex flex-col items-center text-zinc-400 py-20">
          <SearchX size={60} className="mb-3" />
          <p>No results found. Try another search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {filteredResults.map((m: Movie) => (
            <div key={m.id} className="relative">
              {/* TV Show badge */}
              {m.media_type === "tv" && (
                <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  TV
                </div>
              )}
              <MovieCard movie={m} large />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}