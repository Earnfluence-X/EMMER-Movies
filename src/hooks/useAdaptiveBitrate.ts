import { useState, useEffect, useRef, useCallback } from "react";

export interface BitrateConfig {
  initial?: number;
  max?: number;
  min?: number;
  adjustmentInterval?: number;
  bufferTarget?: number; // Seconds of buffer to aim for
}

export function useAdaptiveBitrate(
  videoRef: React.RefObject<HTMLVideoElement>,
  config: BitrateConfig = {}
) {
  const [currentBitrate, setCurrentBitrate] = useState(config.initial || 2000);
  const [quality, setQuality] = useState<"auto" | "high" | "medium" | "low">("auto");
  const [bufferHealth, setBufferHealth] = useState(1);
  const [estimatedBandwidth, setEstimatedBandwidth] = useState<number | null>(null);
  
  const bufferHealthRef = useRef(1);
  const lastCheck = useRef(Date.now());
  const bytesDownloaded = useRef(0);
  const lastBytesDownloaded = useRef(0);
  const lastBandwidthCheck = useRef(Date.now());
  const levelHistory = useRef<number[]>([]);

  // Estimate bandwidth based on download speed
  const estimateBandwidth = useCallback(() => {
    const now = Date.now();
    const delta = (now - lastBandwidthCheck.current) / 1000;
    if (delta >= 1) {
      const bytes = bytesDownloaded.current - lastBytesDownloaded.current;
      const bps = bytes / delta;
      if (bps > 0) {
        setEstimatedBandwidth(bps);
        // Store history for smoothing
        levelHistory.current.push(bps);
        if (levelHistory.current.length > 10) {
          levelHistory.current.shift();
        }
      }
      lastBytesDownloaded.current = bytesDownloaded.current;
      lastBandwidthCheck.current = now;
    }
  }, []);

  const getAverageBandwidth = useCallback(() => {
    if (levelHistory.current.length === 0) return null;
    const sum = levelHistory.current.reduce((a, b) => a + b, 0);
    return sum / levelHistory.current.length;
  }, []);

  const adjustBitrate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const health = bufferHealthRef.current;
    const avgBandwidth = getAverageBandwidth();

    if (quality === "auto" && avgBandwidth) {
      // Auto-adjust based on bandwidth and buffer health
      let newBitrate = currentBitrate;

      // If buffer is low, downgrade aggressively
      if (health < 0.3) {
        newBitrate = Math.max(config.min || 500, currentBitrate * 0.7);
      } 
      // If buffer is good and bandwidth allows, upgrade
      else if (health > 0.8 && avgBandwidth > currentBitrate * 1.5) {
        newBitrate = Math.min(config.max || 8000, currentBitrate * 1.2);
      }
      // If buffer is moderate and bandwidth is low, downgrade slightly
      else if (health < 0.5 && avgBandwidth < currentBitrate * 0.8) {
        newBitrate = Math.max(config.min || 500, currentBitrate * 0.9);
      }

      if (newBitrate !== currentBitrate) {
        setCurrentBitrate(newBitrate);
        applyBitrate(newBitrate);
      }
    }
  }, [videoRef, quality, currentBitrate, config, getAverageBandwidth]);

  const applyBitrate = useCallback((bitrate: number) => {
    const video = videoRef.current;
    if (!video) return;

    // For HLS.js
    const hls = (video as any).hls;
    if (hls && hls.levels) {
      const levels = hls.levels;
      // Find the best level for this bitrate
      let bestLevel = 0;
      let bestDiff = Infinity;
      
      for (let i = 0; i < levels.length; i++) {
        const diff = Math.abs(levels[i].bitrate - bitrate);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestLevel = i;
        }
      }
      
      if (hls.currentLevel !== bestLevel) {
        hls.currentLevel = bestLevel;
        return true;
      }
    }
    
    // For native HLS (Safari) or MP4, we can't control bitrate
    return false;
  }, [videoRef]);

  // Monitor buffer and download speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkBuffer = () => {
      if (!video.buffered.length) return;

      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const currentTime = video.currentTime;
      const bufferAhead = bufferedEnd - currentTime;
      const duration = video.duration || 1;
      
      // Calculate buffer health (0-1)
      const targetBuffer = config.bufferTarget || 10;
      const health = Math.min(1, bufferAhead / targetBuffer);
      bufferHealthRef.current = health;
      setBufferHealth(health);

      // Track download progress for bandwidth estimation
      if (video.buffered.length > 0) {
        const currentBufferEnd = video.buffered.end(video.buffered.length - 1);
        // We can't directly get bytes, but we can approximate from downloaded segments
        // This is a rough estimate
      }

      // Check if we need to adjust
      const now = Date.now();
      if (now - lastCheck.current > (config.adjustmentInterval || 2000)) {
        adjustBitrate();
        lastCheck.current = now;
      }

      // Update bandwidth estimate
      estimateBandwidth();
    };

    // Track bytes downloaded (approximate)
    const onProgress = () => {
      // For HLS.js, we can get more accurate data
      const hls = (video as any).hls;
      if (hls && hls.levels) {
        const stats = hls.bandwidthEstimate;
        if (stats) {
          bytesDownloaded.current = stats;
        }
      }
    };

    video.addEventListener("progress", checkBuffer);
    
    // Monitor for HLS.js events
    const hls = (video as any).hls;
    if (hls) {
      hls.on(hls.Events.BUFFER_APPENDING, onProgress);
    }

    const interval = setInterval(() => {
      checkBuffer();
    }, 1000);

    return () => {
      video.removeEventListener("progress", checkBuffer);
      if (hls) {
        hls.off(hls.Events.BUFFER_APPENDING, onProgress);
      }
      clearInterval(interval);
    };
  }, [videoRef, config, adjustBitrate, estimateBandwidth]);

  const setQualityManually = useCallback((q: "auto" | "high" | "medium" | "low") => {
    setQuality(q);
    if (q !== "auto") {
      const bitrateMap = { high: 8000, medium: 3000, low: 1000 };
      const newBitrate = bitrateMap[q];
      setCurrentBitrate(newBitrate);
      applyBitrate(newBitrate);
    }
  }, [applyBitrate]);

  return {
    currentBitrate,
    quality,
    setQuality: setQualityManually,
    bufferHealth,
    estimatedBandwidth,
    isAdaptive: quality === "auto",
  };
}