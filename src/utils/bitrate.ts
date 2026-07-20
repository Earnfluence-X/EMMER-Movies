export interface BitrateProfile {
  label: string;
  bitrate: number; // bits per second
  resolution: string;
  codec: string;
  bandwidth: number; // estimated bandwidth needed
}

export const BITRATE_PROFILES: BitrateProfile[] = [
  { label: "4K Ultra HD", bitrate: 20000000, resolution: "3840x2160", codec: "H.265", bandwidth: 25000000 },
  { label: "1080p", bitrate: 8000000, resolution: "1920x1080", codec: "H.264", bandwidth: 10000000 },
  { label: "720p", bitrate: 3000000, resolution: "1280x720", codec: "H.264", bandwidth: 4000000 },
  { label: "480p", bitrate: 1000000, resolution: "854x480", codec: "H.264", bandwidth: 1500000 },
  { label: "360p", bitrate: 500000, resolution: "640x360", codec: "H.264", bandwidth: 800000 },
  { label: "240p", bitrate: 200000, resolution: "426x240", codec: "H.264", bandwidth: 300000 },
];

export function getBitrateForQuality(quality: string): number {
  const map: Record<string, number> = {
    "4K": 20000000,
    "1080p": 8000000,
    "720p": 3000000,
    "480p": 1000000,
    "360p": 500000,
    "240p": 200000,
    auto: 0,
  };
  return map[quality] || 0;
}

export function getQualityForBitrate(bitrate: number): string {
  if (bitrate >= 20000000) return "4K";
  if (bitrate >= 8000000) return "1080p";
  if (bitrate >= 3000000) return "720p";
  if (bitrate >= 1000000) return "480p";
  if (bitrate >= 500000) return "360p";
  return "240p";
}

export function estimateBandwidth(progress: number, time: number): number {
  // Estimate bandwidth based on download progress
  if (time === 0) return 0;
  return progress / time; // bytes per second
}

export function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  }
  if (bitrate >= 1000) {
    return `${Math.round(bitrate / 1000)} Kbps`;
  }
  return `${Math.round(bitrate)} bps`;
}

export function canPlayAtQuality(
  estimatedBandwidth: number,
  quality: BitrateProfile
): boolean {
  // Add 20% buffer for overhead
  return estimatedBandwidth >= quality.bandwidth * 1.2;
}

export function getOptimalQuality(
  estimatedBandwidth: number,
  profiles: BitrateProfile[] = BITRATE_PROFILES
): BitrateProfile | null {
  // Sort by bitrate descending
  const sorted = [...profiles].sort((a, b) => b.bitrate - a.bitrate);
  
  for (const profile of sorted) {
    if (canPlayAtQuality(estimatedBandwidth, profile)) {
      return profile;
    }
  }
  
  // Return lowest quality if nothing matches
  return sorted[sorted.length - 1] || null;
}

export function getQualityScore(quality: string): number {
  const scores: Record<string, number> = {
    "4K": 100,
    "1080p": 80,
    "720p": 60,
    "480p": 40,
    "360p": 20,
    "240p": 10,
  };
  return scores[quality] || 0;
}

export function calculateBandwidthSavings(
  currentQuality: string,
  targetQuality: string,
  duration: number // in seconds
): number {
  const currentBitrate = getBitrateForQuality(currentQuality);
  const targetBitrate = getBitrateForQuality(targetQuality);
  const savings = (currentBitrate - targetBitrate) * duration / 8; // bytes saved
  return savings;
}

export function getNetworkQuality(connection: any): {
  type: string;
  quality: "high" | "medium" | "low";
  bandwidth: number;
} {
  if (!connection) {
    return { type: "unknown", quality: "medium", bandwidth: 5000000 };
  }
  
  const type = connection.effectiveType || "unknown";
  const downlink = connection.downlink || 5; // Mbps
  
  let quality: "high" | "medium" | "low";
  if (type === "4g" || downlink >= 10) {
    quality = "high";
  } else if (type === "3g" || downlink >= 5) {
    quality = "medium";
  } else {
    quality = "low";
  }
  
  return {
    type,
    quality,
    bandwidth: downlink * 1000000, // Convert to bps
  };
}