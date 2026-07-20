// TMDB API client with AbortController support and a public demo key.
const API_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const BASE = "https://api.themoviedb.org/3";

export const IMG = (
  path: string | null,
  size: "w200" | "w300" | "w500" | "w780" | "original" = "w500"
) => (path ? `https://image.tmdb.org/t/p/${size}${path}` : "");

export interface Movie {
  id: number;
  title?: string;
  name?: string; // TV shows use 'name' instead of 'title'
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string; // TV shows use this
  last_air_date?: string; // TV shows use this
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  media_type?: "movie" | "tv" | "person";
  runtime?: number;
  episode_run_time?: number[]; // TV shows have this
  number_of_seasons?: number; // TV shows have this
  number_of_episodes?: number; // TV shows have this
  genres?: { id: number; name: string }[];
  tagline?: string;
  status?: string; // TV shows have this
  seasons?: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
  }[];
}

export interface VideoResult {
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}

async function fetchJson<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(BASE + path);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// Helper to get title from movie or TV show
export function getTitle(item: Movie): string {
  return item.title || item.name || "Untitled";
}

// Helper to get year from movie or TV show
export function getYear(item: Movie): string {
  return (item.release_date || item.first_air_date || "").slice(0, 4);
}

export const tmdb = {
  // ============================================
  // MOVIE ENDPOINTS
  // ============================================
  trending: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/trending/movie/week", {}, s),
  popular: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/movie/popular", {}, s),
  topRated: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/movie/top_rated", {}, s),
  upcoming: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/movie/upcoming", {}, s),
  nowPlaying: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/movie/now_playing", {}, s),
  byGenre: (id: number, s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>(
      "/discover/movie",
      { with_genres: String(id), sort_by: "popularity.desc" },
      s
    ),
  byGenrePage: (id: number, page: number, s?: AbortSignal) =>
    fetchJson<{ results: Movie[]; total_pages: number }>(
      "/discover/movie",
      { with_genres: String(id), sort_by: "popularity.desc", page: String(page) },
      s
    ),
  detail: (id: number, s?: AbortSignal) =>
    fetchJson<Movie>(`/movie/${id}`, {}, s),
  videos: (id: number, s?: AbortSignal) =>
    fetchJson<{ results: VideoResult[] }>(`/movie/${id}/videos`, {}, s),
  similar: (id: number, s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>(`/movie/${id}/similar`, {}, s),
  externalIds: (id: number, s?: AbortSignal) =>
    fetchJson<{ imdb_id: string | null }>(`/movie/${id}/external_ids`, {}, s),

  // ============================================
  // TV SHOW ENDPOINTS
  // ============================================
  trendingTv: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/trending/tv/week", {}, s),
  popularTv: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/tv/popular", {}, s),
  topRatedTv: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/tv/top_rated", {}, s),
  airingToday: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/tv/airing_today", {}, s),
  onTheAir: (s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/tv/on_the_air", {}, s),
  tvDetail: (id: number, s?: AbortSignal) =>
    fetchJson<Movie>(`/tv/${id}`, {}, s),
  tvVideos: (id: number, s?: AbortSignal) =>
    fetchJson<{ results: VideoResult[] }>(`/tv/${id}/videos`, {}, s),
  tvSimilar: (id: number, s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>(`/tv/${id}/similar`, {}, s),
  tvExternalIds: (id: number, s?: AbortSignal) =>
    fetchJson<{ imdb_id: string | null }>(`/tv/${id}/external_ids`, {}, s),

  // ============================================
  // SEARCH (Movies + TV Shows)
  // ============================================
  search: (q: string, s?: AbortSignal) =>
    fetchJson<{ results: Movie[] }>("/search/multi", { query: q }, s),
};

export const GENRES: { id: number; name: string }[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

export const STREAM_PROVIDERS = [
  { name: "EMMER Pro", url: (id: number) => `https://vidsrc.me/embed/movie?tmdb=${id}` },
  { name: "VidSrc", url: (id: number) => `https://vidsrc.to/embed/movie/${id}` },
  { name: "VidSrc.xyz", url: (id: number) => `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
  { name: "2Embed", url: (id: number) => `https://www.2embed.cc/embed/${id}` },
  { name: "MultiEmbed", url: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { name: "AutoEmbed", url: (id: number) => `https://player.autoembed.cc/embed/movie/${id}` },
];