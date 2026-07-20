import { memo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Star, Plus, Check } from "lucide-react";
import { IMG, type Movie } from "../api/tmdb";
import { useMyList } from "../context/MyListContext";
import { useWatchHistory } from "../context/WatchHistoryContext";
import { useGesture } from "../hooks/useGesture";
import { tmdb } from "../api/tmdb";

function MovieCardImpl({ movie, large = false }: { movie: Movie; large?: boolean }) {
  const title = movie.title || movie.name || "Untitled";
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
  const poster = IMG(movie.poster_path, "w300");
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showMyListBtn, setShowMyListBtn] = useState(false);
  const { has, add, remove } = useMyList();
  const { getProgress } = useWatchHistory();
  const progress = getProgress(movie.id);
  const progressPercent = progress ? progress.progress : 0;
  const isInMyList = has(movie.id);

  // Fetch trailer on hover with debounce
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isHovered) {
      timeout = setTimeout(async () => {
        try {
          const videos = await tmdb.videos(movie.id);
          const trailer = videos.results.find(
            (v) => v.site === "YouTube" && v.type === "Trailer"
          );
          if (trailer) setTrailerKey(trailer.key);
        } catch {
          // Ignore errors
        }
      }, 300);
    } else {
      setTrailerKey(null);
    }
    return () => clearTimeout(timeout);
  }, [isHovered, movie.id]);

  // Gesture support
  useGesture(cardRef, {
    onSwipeLeft: () => {
      // Navigate to detail
      window.location.href = `/movie/${movie.id}`;
    },
    onSwipeRight: () => {
      window.location.href = `/movie/${movie.id}`;
    },
    onDoubleTap: () => {
      // Add/Remove from My List
      if (isInMyList) {
        remove(movie.id);
      } else {
        add(movie);
      }
    },
    onLongPress: () => {
      setShowMyListBtn(true);
      setTimeout(() => setShowMyListBtn(false), 3000);
    },
  });

  const handleMyListClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInMyList) {
      remove(movie.id);
    } else {
      add(movie);
    }
  };

  return (
    <div
      ref={cardRef}
      className="group relative shrink-0 rounded-md overflow-hidden bg-zinc-900 transition-all duration-300 hover:scale-105 hover:z-10 movie-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/movie/${movie.id}`}>
        {/* Poster Image */}
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            decoding="async"
            className={`w-full ${large ? "h-64 md:h-72" : "h-48 md:h-56"} object-cover transition-opacity duration-300 ${
              isHovered && trailerKey ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : (
          <div className={`w-full ${large ? "h-64 md:h-72" : "h-48 md:h-56"} flex items-center justify-center text-zinc-500 text-xs p-2 text-center`}>
            {title}
          </div>
        )}

        {/* Trailer Video - Autoplays on hover */}
        {trailerKey && isHovered && (
          <div className="absolute inset-0 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0`}
              className="w-full h-full pointer-events-none"
              allow="autoplay; encrypted-media"
              frameBorder="0"
            />
          </div>
        )}

        {/* Progress Bar */}
        {progressPercent > 0 && progressPercent < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-[#e50914] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
              <Play size={14} className="text-white fill-white" />
            </div>
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <Star size={11} className="fill-yellow-400" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
            {progressPercent >= 100 && (
              <span className="text-[10px] text-green-500 font-medium ml-auto">
                Watched
              </span>
            )}
          </div>
          <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">{title}</h3>
          {year && <p className="text-zinc-400 text-xs mt-0.5">{year}</p>}
        </div>

        {/* My List Button - shows on hover */}
        <button
          onClick={handleMyListClick}
          className={`absolute top-2 right-2 bg-black/80 backdrop-blur rounded-full p-1.5 transition-all duration-300 ${
            isHovered || showMyListBtn ? "opacity-100" : "opacity-0"
          } hover:bg-[#e50914]`}
          aria-label={isInMyList ? "Remove from list" : "Add to list"}
        >
          {isInMyList ? <Check size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
        </button>

        {/* Watched badge */}
        {progressPercent >= 100 && (
          <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            ✓ Watched
          </div>
        )}
      </Link>
    </div>
  );
}

export default memo(MovieCardImpl);