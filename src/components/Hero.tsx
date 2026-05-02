import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Info, Plus, Check } from "lucide-react";
import { IMG, type Movie } from "../api/tmdb";
import { useDownloads } from "../context/DownloadContext";

export default function Hero({ movies }: { movies: Movie[] }) {
  const [idx, setIdx] = useState(0);
  const { has, add } = useDownloads();

  useEffect(() => {
    if (movies.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % Math.min(movies.length, 5)), 8000);
    return () => clearInterval(t);
  }, [movies.length]);

  if (!movies.length) {
    return <div className="h-[70vh] bg-zinc-900 animate-pulse" />;
  }

  const m = movies[idx];
  const title = m.title || m.name || "";
  const bg = IMG(m.backdrop_path, "original");

  return (
    <div className="relative h-[85vh] min-h-[500px] w-full overflow-hidden">
      {bg && (
        <img
          key={m.id}
          src={bg}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_1s_ease-out]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <div className="relative h-full flex items-end md:items-center pb-16 md:pb-0">
        <div className="px-4 md:px-10 max-w-2xl">
          <span className="inline-block text-[#e50914] font-bold text-sm tracking-widest mb-3">
            🔥 TRENDING NOW
          </span>
          <h1 className="text-white text-4xl md:text-6xl font-black leading-tight drop-shadow-2xl">
            {title}
          </h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-zinc-300">
            <span className="text-green-500 font-bold">
              {Math.round(m.vote_average * 10)}% Match
            </span>
            <span>{(m.release_date || "").slice(0, 4)}</span>
            <span className="border border-zinc-500 px-1 text-xs">HD</span>
          </div>
          <p className="text-zinc-200 text-sm md:text-base mt-4 line-clamp-3 md:line-clamp-4 drop-shadow-lg">
            {m.overview}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to={`/movie/${m.id}?play=1`}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-md hover:bg-white/80 transition"
            >
              <Play size={20} className="fill-black" /> Play
            </Link>
            <Link
              to={`/movie/${m.id}`}
              className="flex items-center gap-2 bg-zinc-600/70 backdrop-blur text-white font-bold px-6 py-2.5 rounded-md hover:bg-zinc-600 transition"
            >
              <Info size={20} /> More Info
            </Link>
            <button
              onClick={() => !has(m.id) && add(m, "1080p")}
              className="flex items-center gap-2 bg-black/50 border border-white/40 text-white font-bold px-4 py-2.5 rounded-md hover:bg-black/80 transition"
              title={has(m.id) ? "In your library" : "Add to downloads"}
            >
              {has(m.id) ? <Check size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-24 right-6 hidden md:flex flex-col gap-1.5">
        {movies.slice(0, 5).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-1 h-8 rounded-full transition-all ${i === idx ? "bg-[#e50914] h-12" : "bg-zinc-600"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
