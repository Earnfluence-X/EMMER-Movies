import { memo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import type { Movie } from "../api/tmdb";

function MovieRowImpl({ title, movies, large }: { title: string; movies: Movie[]; large?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * (ref.current.clientWidth * 0.85), behavior: "smooth" });
  };

  if (!movies?.length) return null;

  return (
    <section className="my-6 md:my-8 group/row">
      <h2 className="text-white text-lg md:text-2xl font-bold mb-3 px-4 md:px-10">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-0 z-20 w-10 md:w-14 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="Scroll left"
        >
          <ChevronLeft className="text-white" size={28} />
        </button>
        <div
          ref={ref}
          className="flex gap-2 md:gap-3 overflow-x-auto scroll-smooth px-4 md:px-10 pb-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} large={large} />
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-0 z-20 w-10 md:w-14 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="Scroll right"
        >
          <ChevronRight className="text-white" size={28} />
        </button>
      </div>
    </section>
  );
}

// Memoized to prevent re-renders when parent state changes but the movies prop is stable.
const MovieRow = memo(MovieRowImpl, (prev, next) => {
  return (
    prev.title === next.title &&
    prev.large === next.large &&
    prev.movies === next.movies
  );
});

export default MovieRow;
