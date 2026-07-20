import { memo, useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import type { Movie } from "../api/tmdb";
import { usePrefetch } from "../hooks/usePrefetch";
import { tmdb } from "../api/tmdb";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  large?: boolean;
  showMore?: boolean;
  category?: string;
}

function MovieRowImpl({ 
  title, 
  movies, 
  large = false, 
  showMore = true,
  category = ""
}: MovieRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Prefetch next movies when scrolling
  const { ref: prefetchRef } = usePrefetch(
    ["movie", movies[0]?.id],
    () => tmdb.detail(movies[0]?.id),
    { threshold: 0.5 }
  );

  const scroll = (dir: 1 | -1) => {
    if (!ref.current) return;
    const scrollAmount = ref.current.clientWidth * 0.85;
    ref.current.scrollBy({ 
      left: dir * scrollAmount, 
      behavior: "smooth" 
    });
  };

  const checkScroll = () => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [movies]);

  if (!movies?.length) return null;

  return (
    <section className="my-6 md:my-8 group/row relative">
      <div className="flex items-center justify-between px-4 md:px-10 mb-3">
        <h2 className="text-white text-lg md:text-2xl font-semibold hover:text-[#e50914] transition cursor-pointer">
          {title}
        </h2>
        {showMore && category && (
          <Link 
            to={`/browse?category=${category}`}
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            See All →
          </Link>
        )}
      </div>
      
      <div className="relative">
        {/* Left Scroll Button */}
        {showLeft && (
          <button
            onClick={() => scroll(-1)}
            className="row-scroll-btn row-scroll-btn-left"
            aria-label="Scroll left"
          >
            <ChevronLeft className="text-white" size={28} />
          </button>
        )}

        {/* Movies Container */}
        <div
          ref={ref}
          className="flex gap-2 md:gap-3 overflow-x-auto scroll-smooth px-4 md:px-10 pb-4 row-scroll"
        >
          {movies.map((m, index) => (
            <div 
              key={m.id} 
              ref={index === movies.length - 1 ? prefetchRef : undefined}
              className="shrink-0"
            >
              <MovieCard movie={m} large={large} />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        {showRight && (
          <button
            onClick={() => scroll(1)}
            className="row-scroll-btn row-scroll-btn-right"
            aria-label="Scroll right"
          >
            <ChevronRight className="text-white" size={28} />
          </button>
        )}
      </div>
    </section>
  );
}

const MovieRow = memo(MovieRowImpl, (prev, next) => {
  return (
    prev.title === next.title &&
    prev.large === next.large &&
    prev.showMore === next.showMore &&
    prev.category === next.category &&
    prev.movies === next.movies
  );
});

export default MovieRow;