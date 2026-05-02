import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { DownloadProvider } from "./context/DownloadContext";

// 🚀 Lazy-loaded pages for faster initial load (code splitting)
const Home = lazy(() => import("./pages/Home"));
const Browse = lazy(() => import("./pages/Browse"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const Search = lazy(() => import("./pages/Search"));
const Downloads = lazy(() => import("./pages/Downloads"));

// Use HashRouter so the app works on any static host / single-file deployment.
const Router = (window as any).__USE_BROWSER_ROUTER__ ? BrowserRouter : HashRouter;

// 🧠 React Query — caches API responses, prevents refetching, handles retries.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      gcTime: 30 * 60 * 1000, // 30 min memory
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  // 📦 Register service worker for offline poster + API caching
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker.register(swUrl).catch(() => {
        /* SW registration failed — likely sandboxed preview, safe to ignore */
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DownloadProvider>
          <Router>
            <div className="min-h-screen bg-black text-white font-sans">
              <Navbar />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/browse" element={<Browse />} />
                    <Route path="/movie/:id" element={<MovieDetail />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/downloads" element={<Downloads />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <footer className="border-t border-zinc-900 px-4 md:px-10 py-8 text-zinc-500 text-xs text-center">
                <p>
                  <span className="text-[#e50914] font-bold">EMMER MOVIES</span> · Movie data from{" "}
                  <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="underline hover:text-white">
                    TMDB
                  </a>
                  . Streams aggregated from third-party providers across the web.
                </p>
                <p className="mt-1">For demonstration purposes — no content is hosted on this site.</p>
              </footer>
            </div>
          </Router>
        </DownloadProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
