import type { Movie } from "../api/tmdb";

export interface VideoSource {
  url: string;
  quality: string;
  source: string;
  size?: string;
  type?: 'direct' | 'proxy' | 'stream';
}

export class SourceFinder {
  private backendUrl = '/api';
  private externalProxy = 'https://corsproxy.io/?';

  async findBestSource(movie: Movie): Promise<VideoSource | null> {
    // Strategy 1: Check public domain
    const publicDomain = await this.checkPublicDomain(movie);
    if (publicDomain) return publicDomain;

    // Strategy 2: Try Vercel function
    const vercelResult = await this.searchViaVercel(movie);
    if (vercelResult) return vercelResult;

    // Strategy 3: Try external proxy
    const proxyResult = await this.searchViaProxy(movie);
    if (proxyResult) return proxyResult;

    return null;
  }

  async checkPublicDomain(movie: Movie): Promise<VideoSource | null> {
    const publicDomainMovies: Record<string, VideoSource> = {
      'big buck bunny': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~150 MB'
      },
      'sintel': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/Sintel.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~130 MB'
      },
      'tears of steel': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/TearsOfSteel.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~170 MB'
      }
    };

    const title = (movie.title || '').toLowerCase();
    for (const [key, source] of Object.entries(publicDomainMovies)) {
      if (title.includes(key)) {
        return source;
      }
    }
    return null;
  }

  async searchViaVercel(movie: Movie): Promise<VideoSource | null> {
    try {
      const response = await fetch(
        `${this.backendUrl}/search?title=${encodeURIComponent(movie.title || '')}&year=${movie.release_date || ''}&imdbId=${movie.id}`
      );
      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        return data.sources[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  async searchViaProxy(movie: Movie): Promise<VideoSource | null> {
    try {
      const searchQuery = `${movie.title} ${movie.release_date || ''} mp4`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(`${this.externalProxy}${encodeURIComponent(searchUrl)}`);
      const html = await response.text();
      
      const mp4Regex = /https?:\/\/[^\s"']+\.mp4/g;
      const matches = html.match(mp4Regex) || [];
      
      if (matches.length > 0) {
        return {
          url: `${this.externalProxy}${encodeURIComponent(matches[0])}`,
          quality: '720p',
          source: 'Proxy Search',
          size: 'Unknown'
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  getProxiedUrl(videoUrl: string): string {
    return `${this.backendUrl}/search?url=${encodeURIComponent(videoUrl)}&proxy=true`;
  }

  getExternalProxiedUrl(videoUrl: string): string {
    return `${this.externalProxy}${encodeURIComponent(videoUrl)}`;
  }
}