import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Grid, type CellComponentProps } from "react-window";
import { tmdb, GENRES, type Movie } from "../api/tmdb";
import MovieCard from "../components/MovieCard";
import { Loader2 } from "lucide-react";

const CARD_W = 180;
const CARD_H = 300;

interface CellExtra {
  movies: Movie[];
  cols: number;
  onNeedMore: () => void;
  needMoreAt: number;
}

function Cell({
  columnIndex,
  rowIndex,
  style,
  movies,
  cols,
  onNeedMore,
  needMoreAt,
}: CellComponentProps<CellExtra>) {
  const idx = rowIndex * cols + columnIndex;
  if (idx === needMoreAt) onNeedMore();
  const m = movies[idx];
  if (!m) return <div style={style} />;
  return (
    <div style={style} className="flex items-start justify-center pt-2">
      <MovieCard movie={m} large />
    </div>
  );
}

export default function Browse() {
  const [genre, setGenre] = useState(GENRES[0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 700 });

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ w: rect.width, h: Math.max(500, window.innerHeight - rect.top - 20) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["browseGenre", genre.id],
    queryFn: ({ pageParam = 1, signal }) => tmdb.byGenrePage(genre.id, pageParam as number, signal),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (all.length < (last.total_pages ?? 1) ? all.length + 1 : undefined),
    staleTime: 5 * 60_000,
  });

  const movies = useMemo<Movie[]>(() => (data?.pages ?? []).flatMap((p) => p.results), [data]);

  const cols = Math.max(2, Math.floor(size.w / CARD_W));
  const rows = Math.ceil(movies.length / cols);
  const colW = size.w > 0 ? Math.floor(size.w / cols) : CARD_W;

  const onNeedMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const needMoreAt = Math.max(0, movies.length - cols * 2);

  return (
    <div className="pt-24 px-4 md:px-10 pb-4 min-h-screen flex flex-col">
      <h1 className="text-white text-3xl md:text-4xl font-black mb-2">Browse by Genre</h1>
      <p className="text-zinc-400 mb-6">Virtualized for smooth scrolling — handles thousands of movies.</p>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {GENRES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGenre(g)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              g.id === genre.id ? "bg-[#e50914] text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="flex-1 min-h-[500px]">
        {isFetching && movies.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-white animate-spin" size={40} />
          </div>
        ) : size.w > 0 && movies.length > 0 ? (
          <Grid<CellExtra>
            cellComponent={Cell}
            cellProps={{ movies, cols, onNeedMore, needMoreAt }}
            columnCount={cols}
            rowCount={rows}
            columnWidth={colW}
            rowHeight={CARD_H}
            defaultWidth={size.w}
            defaultHeight={size.h}
            style={{ width: size.w, height: size.h }}
            className="!overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded"
          />
        ) : null}
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="text-zinc-400 animate-spin" size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
