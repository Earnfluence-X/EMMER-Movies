import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Info, Plus, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { IMG, type Movie } from "../api/tmdb";
import { useDownloads } from "../context/DownloadContext";
import { useMyList } from "../context/MyListContext";

export default function Hero({ movies }: { movies: Movie[] }) {
  const [idx, setIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const { has, add } = useDownloads();
  const { has: hasInList, add: addToList, remove: removeFromList } = useMyList();

  useEffect(() => {
    if (movies.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % Math.min(movies.length, 5)), 8000);
    return () => clearInterval(t);
  }, [movies.length]);

  if (!movies.length) {
    return <div className="h-[85vh] bg-zinc-900 animate-pulse" />;
  }

  const m = movies[idx];
  const title = m.title || m.name || "";
  const bg = IMG(m.backdrop_path, "original");
  const isInList = hasInList(m.id);
  const isDownloaded = has(m.id);

  const handleMyListClick = () => {
    if (isInList) {
      removeFromList(m.id);
    } else {
      addToList(m);
    }
  };

  return (
    <div className="relative h-[85vh] min-h-[500px] w-full overflow-hidden">
      {/* Background Image */}
      {bg && (
        <img
          key={m.id}
          src={bg}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_1s_ease-out]"
        />
      )}
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Content */}
      <div className="relative h-full flex items-end md:items-center pb-16 md:pb-0">
        <div className="px-4 md:px-10 max-w-2xl">
          {/* Badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block bg-[#e50914] text-white text-xs font-bold px-2 py-0.5 rounded">
              NEW
            </span>
            <span className="text-green-500 font-bold text-sm flex items-center gap-1">
              <span>★</span> {Math.round(m.vote_average * 10)}% Match
            </span>
            <span className="text-zinc-300 text-sm">{(m.release_date || "").slice(0, 4)}</span>
            <span className="border border-zinc-500 px-1.5 text-xs text-zinc-300">HD</span>
            {m.runtime && (
              <span className="text-zinc-300 text-sm hidden md:inline">
                {Math.floor(m.runtime / 60)}h {m.runtime % 60}m
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-black leading-tight drop-shadow-2xl">
            {title}
          </h1>

          {/* Description */}
          <p className="text-zinc-200 text-sm md:text-base mt-4 line-clamp-3 md:line-clamp-4 drop-shadow-lg max-w-xl">
            {m.overview}
          </p>

          {/* Genres */}
          {m.genres && (
            <div className="flex flex-wrap gap-2 mt-4">
              {m.genres.slice(0, 3).map((g) => (
                <span key={g.id} className="text-zinc-400 text-xs">
                  {g.name}
                  {m.genres && m.genres.indexOf(g) < Math.min(m.genres.length, 3) - 1 && " • "}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to={`/movie/${m.id}?play=1`}
              className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-md hover:bg-white/90 transition text-lg"
            >
              <Play size={24} className="fill-black" /> Play
            </Link>
            
            <Link
              to={`/movie/${m.id}`}
              className="flex items-center gap-2 bg-zinc-600/70 backdrop-blur text-white font-bold px-6 py-3 rounded-md hover:bg-zinc-600 transition text-lg"
            >
              <Info size={22} /> More Info
            </Link>

            <button
              onClick={handleMyListClick}
              className="flex items-center gap-2 bg-black/50 border border-white/40 text-white font-bold px-4 py-3 rounded-md hover:bg-black/80 transition"
              title={isInList ? "Remove from list" : "Add to list"}
            >
              {isInList ? <Check size={20} /> : <Plus size={20} />}
              {isInList ? "In List" : "Add to List"}
            </button>

            {!isDownloaded && (
              <button
                onClick={() => add(m, "1080p")}
                className="flex items-center gap-2 bg-black/50 border border-white/40 text-white font-bold px-4 py-3 rounded-md hover:bg-black/80 transition"
                title="Download"
              >
                <Plus size={20} /> Download
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slider Dots */}
      <div className="absolute bottom-24 right-6 hidden md:flex flex-col gap-1.5">
        {movies.slice(0, 5).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-1.5 rounded-full transition-all duration-300 ${
              i === idx ? "bg-[#e50914] h-8" : "bg-zinc-600 h-4 hover:bg-zinc-400"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Age Rating */}
      <div className="absolute bottom-32 right-10 hidden lg:block">
        <div className="border-2 border-white/30 px-2 py-1 text-xs text-white/70 font-medium">
          TV-MA
        </div>
      </div>

      {/* Mute Toggle (for background video) */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-32 right-10 lg:right-24 text-white/50 hover:text-white/80 transition text-xs"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}