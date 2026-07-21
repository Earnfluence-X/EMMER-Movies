import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { DownloadProvider } from "./context/DownloadContext";
import { MyListProvider } from "./context/MyListContext";
import { WatchHistoryProvider } from "./context/WatchHistoryContext";
import { DataSaverProvider } from "./context/DataSaverContext";
import { OfflineProvider } from "./context/OfflineContext";
import { ToastProvider } from "./context/ToastContext";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { OfflineBanner } from "./components/OfflineBanner";
import { ContentPreloader } from "./lib/preloader";

// Lazy loaded pages
const Home = lazy(() => import("./pages/Home"));
const Browse = lazy(() => import("./pages/Browse"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const Search = lazy(() => import("./pages/Search"));
const Downloads = lazy(() => import("./pages/Downloads"));
const MyList = lazy(() => import("./pages/MyList"));
const ContinueWatching = lazy(() => import("./pages/ContinueWatching"));
const OfflineDownloads = lazy(() => import("./pages/OfflineDownloads"));

const Router = (window as any).__USE_BROWSER_ROUTER__ ? BrowserRouter : HashRouter;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker.register(swUrl).catch(() => {});
    }
  }, []);

  // Preload popular content
  useEffect(() => {
    if (import.meta.env.PROD) {
      const preloader = ContentPreloader.getInstance();
      setTimeout(() => preloader.preloadHomePage(), 3000);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <DataSaverProvider>
            <OfflineProvider>
              <DownloadProvider>
                <MyListProvider>
                  <WatchHistoryProvider>
                    <Router>
                      <div className="min-h-screen bg-black text-white font-sans">
                        <Navbar />
                        <OfflineBanner />
                        <ErrorBoundary>
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                              <Route path="/" element={<Home />} />
                              <Route path="/browse" element={<Browse />} />
                              {/* Movie route ONLY - TV route REMOVED */}
                              <Route path="/movie/:id" element={<MovieDetail />} />
                              <Route path="/search" element={<Search />} />
                              <Route path="/downloads" element={<Downloads />} />
                              <Route path="/mylist" element={<MyList />} />
                              <Route path="/continue-watching" element={<ContinueWatching />} />
                              <Route path="/offline-downloads" element={<OfflineDownloads />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>
                        <KeyboardShortcuts />
                        <footer className="border-t border-zinc-900 px-4 md:px-10 py-8 text-zinc-500 text-xs text-center">
                          <p>
                            <span className="text-[#e50914] font-bold">EMMER MOVIES</span> · Movie data from{" "}
                            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="underline hover:text-white">
                              TMDB
                            </a>
                            . Streams aggregated from third-party providers.
                          </p>
                          <p className="mt-1">For demonstration purposes — no content is hosted on this site.</p>
                          <p className="mt-2 text-[10px] text-zinc-600">
                            Press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded">?</kbd> for keyboard shortcuts
                          </p>
                        </footer>
                      </div>
                    </Router>
                  </WatchHistoryProvider>
                </MyListProvider>
              </DownloadProvider>
            </OfflineProvider>
          </DataSaverProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}