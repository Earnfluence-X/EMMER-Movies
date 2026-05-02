import { memo } from "react";
import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";
import { IMG, type Movie } from "../api/tmdb";

function MovieCardImpl({ movie, large = false }: { movie: Movie; large?: boolean }) {
  const title = movie.title || movie.name || "Untitled";
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
  const poster = IMG(movie.poster_path, "w300");

  return (
    <Link
      to={`/movie/${movie.id}`}
      className={`group relative shrink-0 rounded-md overflow-hidden bg-zinc-900 transition-transform duration-300 hover:scale-105 hover:z-10 ${
        large ? "w-44 md:w-52" : "w-32 md:w-40"
      }`}
    >
      {poster ? (
        <img
          src={poster}
          alt={title}
          loading="lazy"
          decoding="async"
          className={`w-full ${large ? "h-64 md:h-72" : "h-48 md:h-56"} object-cover`}
        />
      ) : (
        <div className={`w-full ${large ? "h-64 md:h-72" : "h-48 md:h-56"} flex items-center justify-center text-zinc-500 text-xs p-2 text-center`}>
          {title}
        </div>
      )}
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
        </div>
        <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">{title}</h3>
        {year && <p className="text-zinc-400 text-xs mt-0.5">{year}</p>}
      </div>
    </Link>
  );
}

export default memo(MovieCardImpl);
