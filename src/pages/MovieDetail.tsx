import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Download, Check, X, Star, Calendar, Clock, ArrowLeft, Loader2, Info } from "lucide-react";
import { tmdb, IMG, STREAM_PROVIDERS, type VideoResult } from "../api/tmdb";
import { searchSubtitles } from "../api/subtitles";
import { useDownloads } from "../context/DownloadContext";
import MovieRow from "../components/MovieRow";
import CustomPlayer from "../components/CustomPlayer";

// Public demo streams used as fallback so users can test the custom player
// even when no direct movie URL is available.
const DEMO_STREAMS = [
  {
    label: "Big Buck Bunny (HLS demo)",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    label: "Sintel (MP4 demo)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  },
  {
    label: "Tears of Steel (MP4 demo)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
];

type PlayerMode = "embed" | "custom";

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const movieId = Number(id);
  const [providerIdx, setProviderIdx] = useState(0);
  const [showPlayer, setShowPlayer] = useState(params.get("play") === "1");
  const [showDownload, setShowDownload] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [mode, setMode] = useState<PlayerMode>("embed");
  const [customUrl, setCustomUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");

  const { has, add } = useDownloads();

  const { data: movie } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: ({ signal }) => tmdb.detail(movieId, signal),
    staleTime: 5 * 60_000,
  });
  const { data: videosData } = useQuery({
    queryKey: ["videos", movieId],
    queryFn: ({ signal }) => tmdb.videos(movieId, signal),
    staleTime: 5 * 60_000,
  });
  const { data: similarData } = useQuery({
    queryKey: ["similar", movieId],
    queryFn: ({ signal }) => tmdb.similar(movieId, signal),
    staleTime: 5 * 60_000,
  });
  const { data: extIds } = useQuery({
    queryKey: ["externalIds", movieId],
    queryFn: ({ signal }) => tmdb.externalIds(movieId, signal),
    staleTime: 60 * 60_000,
  });

  const { data: subtitles = [], refetch: refetchSubs } = useQuery({
    queryKey: ["subs", extIds?.imdb_id],
    queryFn: ({ signal }) => searchSubtitles(extIds?.imdb_id || "", signal),
    enabled: !!extIds?.imdb_id,
    staleTime: 60 * 60_000,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [movieId]);

  useEffect(() => {
    if (params.get("play") === "1") setShowPlayer(true);
  }, [params]);

  const videos: VideoResult[] = videosData?.results ?? [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube");

  if (!movie) {
    return (
      <div className="pt-32 flex justify-center">
        <Loader2 className="text-white animate-spin" size={40} />
      </div>
    );
  }

  const title = movie.title || movie.name || "";
  const year = (movie.release_date || "").slice(0, 4);

  const openPlayer = () => {
    setShowPlayer(true);
    setIframeLoading(true);
    setParams({ play: "1" });
  };
  const closePlayer = () => {
    setShowPlayer(false);
    setActiveUrl(null);
    params.delete("play");
    setParams(params);
  };

  const startDownloadFromUrl = (url: string) => {
    if (!url.trim()) return;
    add(movie, url.trim());
    setShowDownload(false);
    setDownloadUrl("");
  };

  return (
    <div className="pb-20">
      <div className="relative h-[60vh] min-h-[400px] w-full">
        {movie.backdrop_path && (
          <img src={IMG(movie.backdrop_path, "original")} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
        <Link to="/" className="absolute top-20 left-4 md:left-10 flex items-center gap-2 text-white bg-black/50 hover:bg-black/80 px-3 py-1.5 rounded-md backdrop-blur z-10 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      <div className="px-4 md:px-10 -mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {movie.poster_path && (
            <img src={IMG(movie.poster_path, "w500")} alt={title} className="w-44 md:w-64 rounded-lg shadow-2xl shrink-0 self-center md:self-start" />
          )}
          <div className="flex-1 text-white">
            <h1 className="text-3xl md:text-5xl font-black drop-shadow-2xl">{title}</h1>
            {movie.tagline && <p className="text-zinc-400 italic mt-1">{movie.tagline}</p>}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-300">
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-bold">
                  <Star size={16} className="fill-yellow-400" /> {movie.vote_average.toFixed(1)}
                </span>
              )}
              {year && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {year}
                </span>
              )}
              {movie.runtime ? (
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              ) : null}
              <span className="border border-zinc-500 px-1.5 text-xs">HD</span>
            </div>

            {movie.genres && (
              <div className="flex flex-wrap gap-2 mt-3">
                {movie.genres.map((g) => (
                  <span key={g.id} className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full text-xs">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <p className="text-zinc-200 mt-5 leading-relaxed max-w-3xl">{movie.overview}</p>

            <div className="flex flex-wrap gap-3 mt-7">
              <button
                onClick={openPlayer}
                className="flex items-center gap-2 bg-[#e50914] text-white font-bold px-7 py-3 rounded-md hover:bg-[#f40612] transition shadow-lg shadow-red-900/40"
              >
                <Play size={22} className="fill-white" /> Watch Now
              </button>
              <button
                onClick={() => setShowDownload(true)}
                disabled={has(movie.id)}
                className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 text-white font-bold px-7 py-3 rounded-md hover:bg-zinc-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {has(movie.id) ? <Check size={20} /> : <Download size={20} />}
                {has(movie.id) ? "In Library" : "Download"}
              </button>
              {trailer && (
                <a
                  href={`https://youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-transparent border border-zinc-600 text-white font-bold px-5 py-3 rounded-md hover:bg-zinc-800 transition"
                >
                  ▶ Trailer
                </a>
              )}
            </div>
          </div>
        </div>

        {trailer && !showPlayer && (
          <section className="mt-12">
            <h2 className="text-white text-2xl font-bold mb-4">Official Trailer</h2>
            <div className="relative aspect-video max-w-4xl rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title="Trailer"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {(similarData?.results?.length ?? 0) > 0 && (
          <div className="mt-12 -mx-4 md:-mx-10">
            <MovieRow title="More Like This" movies={similarData!.results} />
          </div>
        )}
      </div>

      {showPlayer && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="flex items-center justify-between p-3 md:p-4 bg-black border-b border-zinc-900">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-white font-bold truncate">{title}</h3>
              <span className="text-zinc-500 text-xs hidden sm:inline">
                {mode === "embed" ? `via ${STREAM_PROVIDERS[providerIdx].name}` : "Custom Player"}
              </span>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <div className="bg-zinc-900 rounded-full p-0.5 flex text-xs">
                <button
                  onClick={() => setMode("embed")}
                  className={`px-3 py-1.5 rounded-full font-medium transition ${
                    mode === "embed" ? "bg-[#e50914] text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Embed
                </button>
                <button
                  onClick={() => setMode("custom")}
                  className={`px-3 py-1.5 rounded-full font-medium transition ${
                    mode === "custom" ? "bg-[#e50914] text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Custom Player
                </button>
              </div>
              <button onClick={closePlayer} className="text-white bg-zinc-800 hover:bg-zinc-700 rounded-full p-2" aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-black">
            {mode === "embed" ? (
              <>
                {iframeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 z-10">
                    <Loader2 className="animate-spin mb-3" size={40} />
                    <p className="text-sm">Searching the web for free streams…</p>
                  </div>
                )}
                <iframe
                  key={providerIdx + "-" + movieId}
                  src={STREAM_PROVIDERS[providerIdx].url(movieId)}
                  title={title}
                  onLoad={() => setIframeLoading(false)}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </>
            ) : activeUrl ? (
              <CustomPlayer
                src={activeUrl}
                poster={IMG(movie.backdrop_path, "original")}
                title={title}
                subtitles={subtitles}
                onSubtitleSearch={() => refetchSubs()}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 overflow-y-auto">
                <div className="max-w-2xl w-full">
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-lg p-3 mb-5 flex gap-2">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p>
                      The Custom Player gives you <b>full controls</b> — fast-forward, playback speed (0.25×–2×), subtitles, keyboard shortcuts, and fullscreen — but it needs a <b>direct video URL</b> (.mp4 or .m3u8 stream). Embed providers don't expose those URLs publicly. Paste a link below or try a demo stream:
                    </p>
                  </div>

                  <label className="text-zinc-300 text-sm block mb-2">Direct video URL</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/movie.mp4 or .m3u8"
                      className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-[#e50914] outline-none rounded-md px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={() => customUrl.trim() && setActiveUrl(customUrl.trim())}
                      disabled={!customUrl.trim()}
                      className="bg-[#e50914] hover:bg-[#f40612] disabled:opacity-40 text-white font-bold px-5 rounded-md transition"
                    >
                      Play
                    </button>
                  </div>

                  <p className="text-zinc-400 text-sm mb-2">Or try a demo stream to test the player:</p>
                  <div className="grid gap-2">
                    {DEMO_STREAMS.map((d) => (
                      <button
                        key={d.url}
                        onClick={() => setActiveUrl(d.url)}
                        className="text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md px-4 py-2.5 text-white text-sm flex items-center justify-between transition"
                      >
                        <span>🎬 {d.label}</span>
                        <Play size={14} className="text-[#e50914]" />
                      </button>
                    ))}
                  </div>

                  <p className="text-zinc-500 text-xs mt-5">
                    💡 {subtitles.length > 0
                      ? `${subtitles.length} subtitle tracks auto-found for this movie via Wyzie/OpenSubtitles.`
                      : "Subtitles will be auto-searched once playback starts."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {mode === "embed" && (
            <div className="bg-black border-t border-zinc-900 p-3 flex flex-wrap items-center gap-2 justify-center">
              <span className="text-zinc-500 text-xs mr-2">If video doesn't load, try another source:</span>
              {STREAM_PROVIDERS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setProviderIdx(i);
                    setIframeLoading(true);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                    i === providerIdx ? "bg-[#e50914] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {mode === "custom" && activeUrl && (
            <div className="bg-black border-t border-zinc-900 p-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveUrl(null)}
                className="text-zinc-400 hover:text-white text-xs underline"
              >
                ← Change source
              </button>
            </div>
          )}
        </div>
      )}

      {showDownload && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowDownload(false)}
        >
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 border border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white text-xl font-bold">Download for offline</h3>
              <button onClick={() => setShowDownload(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-zinc-400 text-sm mb-4">
              Paste a direct video URL (.mp4) for "{title}".
            </p>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => window.open(`https://www.google.com/search?q=intitle:index.of?mp4+${title}+${year}`, '_blank')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2 rounded-md transition border border-zinc-600"
              >
                🔍 Magic Find Link (Google)
              </button>
              <button
                onClick={() => window.open(`https://dl8.itopit.com/Search?q=${title}`, '_blank')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs py-2 rounded-md transition border border-zinc-600"
              >
                ⚡ Mirror Search
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-lg p-3 mb-4 flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>
                Browsers can only download from servers that allow CORS. Embed providers don't expose direct URLs — but the demo
                streams below work, and so does any direct .mp4 link you find.
              </p>
            </div>

            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://example.com/movie.mp4"
              className="w-full bg-black border border-zinc-700 focus:border-[#e50914] outline-none rounded-md px-3 py-2 text-white text-sm mb-3"
            />
            <button
              onClick={() => startDownloadFromUrl(downloadUrl)}
              disabled={!downloadUrl.trim()}
              className="w-full bg-[#e50914] hover:bg-[#f40612] disabled:opacity-40 text-white font-bold py-2.5 rounded-md transition flex items-center justify-center gap-2 mb-4"
            >
              <Download size={18} /> Start Download
            </button>

            <p className="text-zinc-400 text-xs mb-2">Or download a demo stream to test:</p>
            <div className="space-y-1.5">
              {[
                { label: "Sintel (~130 MB MP4)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
                { label: "Tears of Steel (~170 MB MP4)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
                { label: "Big Buck Bunny (~150 MB MP4)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
              ].map((d) => (
                <button
                  key={d.url}
                  onClick={() => startDownloadFromUrl(d.url)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 rounded text-left flex items-center justify-between transition"
                >
                  <span>🎬 {d.label}</span>
                  <Download size={12} className="text-[#e50914]" />
                </button>
              ))}
            </div>
            <p className="text-zinc-500 text-xs mt-4 text-center">
              View progress, pause/resume, and play offline from <Link to="/downloads" className="text-[#e50914] underline">My Library</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
