import { useEffect, useState } from "react";
import { useDownloadManager } from "../hooks/useDownloadManager";
import { useWatchHistory } from "../context/WatchHistoryContext";
import { useMyList } from "../context/MyListContext";

export function AutoDownloadManager() {
  const { startDownload, getDownloadStatus } = useDownloadManager();
  const { history } = useWatchHistory();
  const { items: myList } = useMyList();
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);

  // Auto-download movies from watch history and my list
  useEffect(() => {
    const autoDownload = async () => {
      if (isProcessing) return;
      
      // Get movies that aren't downloaded yet
      const moviesToDownload = [...myList, ...history]
        .filter(movie => movie && movie.id)
        .filter(movie => {
          const status = getDownloadStatus(movie.id);
          return status !== "complete" && status !== "downloading";
        })
        .slice(0, 3); // Limit to 3 at a time

      if (moviesToDownload.length === 0) return;

      setIsProcessing(true);

      for (const movie of moviesToDownload) {
        try {
          // Use demo stream for now
          const demoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
          await startDownload(movie, demoUrl, "1080p");
          setDownloadedCount(prev => prev + 1);
          
          // Wait a bit between downloads
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to download ${movie.title}:`, error);
        }
      }

      setIsProcessing(false);
    };

    // Auto-download when component mounts and when list changes
    autoDownload();
  }, [myList, history, startDownload, getDownloadStatus]);

  return null; // This is a background component
}