import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, TrendingUp, Film, Tv } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { tmdb } from "../api/tmdb";

interface SearchSuggestion {
  id: number;
  title: string;
  poster: string | null;
  year: string;
  media_type: "movie" | "tv" | "person";
  vote_average: number;
}

export function SmartSearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("recent-searches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    tmdb.trending().then(data => {
      const results = data.results.slice(0, 5).map(m => ({
        id: m.id,
        title: m.title || m.name || "",
        poster: m.poster_path,
        year: (m.release_date || m.first_air_date || "").slice(0, 4),
        media_type: m.media_type || "movie",
        vote_average: m.vote_average,
      }));
      setTrending(results);
    });
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    
    tmdb.search(debouncedQuery, controller.signal)
      .then(data => {
        const results = data.results
          .filter(m => m.media_type !== "person")
          .slice(0, 8)
          .map(m => ({
            id: m.id,
            title: m.title || m.name || "",
            poster: m.poster_path,
            year: (m.release_date || m.first_air_date || "").slice(0, 4),
            media_type: m.media_type || "movie",
            vote_average: m.vote_average || 0,
          }));
        setSuggestions(results);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recent-searches", JSON.stringify(updated));
    
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const getMediaIcon = (type: string) => {
    return type === "tv" ? <Tv size={14} /> : <Film size={14} />;
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="flex items-center bg-black/70 border border-zinc-700 rounded-md focus-within:border-white transition group">
        <Search className="ml-3 text-zinc-400 group-focus-within:text-white" size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search movies, shows..."
          className="bg-transparent outline-none px-2 py-2 text-white text-sm w-full"
        />
        {query && (
          <button 
            onClick={() => setQuery("")} 
            className="mr-2 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto z-50">
          {query ? (
            <>
              {isLoading ? (
                <div className="p-4 text-zinc-400 text-sm flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Searching...
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="px-4 py-2 text-zinc-500 text-xs font-medium border-b border-zinc-800">
                    Suggestions
                  </div>
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSearch(s.title)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition text-left group"
                    >
                      {s.poster ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w92${s.poster}`} 
                          alt="" 
                          className="w-10 h-14 object-cover rounded" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-zinc-800 rounded flex items-center justify-center text-zinc-600 text-xs">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{s.title}</p>
                        <p className="text-zinc-400 text-xs flex items-center gap-2">
                          {s.year} • 
                          <span className="flex items-center gap-1">
                            {getMediaIcon(s.media_type)}
                            {s.media_type}
                          </span>
                          {s.vote_average > 0 && (
                            <span className="text-yellow-400">★ {s.vote_average.toFixed(1)}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => handleSearch(query)}
                    className="w-full px-4 py-2.5 text-[#e50914] text-sm font-medium hover:bg-zinc-800 text-center border-t border-zinc-800 transition"
                  >
                    See all results for "{query}"
                  </button>
                </>
              ) : (
                <div className="p-8 text-zinc-400 text-sm text-center">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  No results found for "{query}"
                </div>
              )}
            </>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <>
                  <div className="px-4 py-2 text-zinc-500 text-xs font-medium flex items-center justify-between border-b border-zinc-800">
                    <span className="flex items-center gap-2">
                      <Clock size={14} /> Recent Searches
                    </span>
                    <button
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem("recent-searches");
                      }}
                      className="text-zinc-500 hover:text-white text-xs"
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSearch(s)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition text-left"
                    >
                      <Clock size={14} className="text-zinc-500" />
                      <span className="text-white text-sm">{s}</span>
                    </button>
                  ))}
                </>
              )}

              {trending.length > 0 && (
                <>
                  <div className="px-4 py-2 text-zinc-500 text-xs font-medium flex items-center gap-2 border-t border-zinc-800">
                    <TrendingUp size={14} /> Trending Now
                  </div>
                  {trending.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSearch(s.title)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition text-left"
                    >
                      {s.poster ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w92${s.poster}`} 
                          alt="" 
                          className="w-8 h-11 object-cover rounded" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-11 bg-zinc-800 rounded" />
                      )}
                      <span className="text-white text-sm">{s.title}</span>
                      {s.vote_average > 7 && (
                        <span className="ml-auto text-xs text-green-500 font-medium">🔥 Hot</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {recentSearches.length === 0 && trending.length === 0 && (
                <div className="p-8 text-zinc-400 text-sm text-center">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  Start typing to search
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}