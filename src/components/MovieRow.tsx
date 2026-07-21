import { memo, useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import type { Movie } from "../api/tmdb";

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
        <h2 className="text-white text-lg md:text-2xl font-bold hover:text-[#e50914] transition cursor-pointer">
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
            className="absolute left-0 top-0 bottom-0 z-20 w-10 md:w-14 bg-black/60 hover:bg-black/80 transition-opacity flex items-center justify-center rounded-r"
            aria-label="Scroll left"
          >
            <ChevronLeft className="text-white" size={28} />
          </button>
        )}

        {/* Movies Container */}
        <div
          ref={ref}
          className="flex gap-2 md:gap-3 overflow-x-auto scroll-smooth px-4 md:px-10 pb-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {movies.map((m) => (
            <div key={m.id} className="shrink-0">
              <MovieCard movie={m} large={large} />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        {showRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-0 bottom-0 z-20 w-10 md:w-14 bg-black/60 hover:bg-black/80 transition-opacity flex items-center justify-center rounded-l"
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