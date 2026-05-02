import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tmdb, type Movie } from "../api/tmdb";
import MovieCard from "../components/MovieCard";
import { Loader2, SearchX } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [input, setInput] = useState(initial);
  const debounced = useDebounce(input, 400);

  // Keep URL in sync (debounced)
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

  const results = (data?.results ?? []).filter(
    (m: Movie) => m.media_type !== "person" && (m.poster_path || m.backdrop_path),
  );

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 min-h-screen">
      <div className="max-w-2xl mb-6">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search movies, shows, actors…"
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#e50914] outline-none rounded-lg px-4 py-3 text-white text-lg transition-colors"
        />
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
      <p className="text-zinc-400 text-sm mb-8">{debounced ? `${results.length} titles found` : "API requests are debounced 400ms"}</p>

      {isFetching ? (
        <div className="flex justify-center py-20">
          <Loader2 className="text-white animate-spin" size={40} />
        </div>
      ) : debounced && results.length === 0 ? (
        <div className="flex flex-col items-center text-zinc-400 py-20">
          <SearchX size={60} className="mb-3" />
          <p>No results found. Try another search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {results.map((m: Movie) => (
            <div key={m.id} className="flex justify-center">
              <MovieCard movie={m} large />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
