import { queryClient } from "../App";
import { tmdb } from "../api/tmdb";

interface PreloadConfig {
  maxConcurrent?: number;
  priority?: "high" | "medium" | "low";
  retryCount?: number;
  retryDelay?: number;
}

export class ContentPreloader {
  private static instance: ContentPreloader;
  private preloadedKeys = new Set<string>();
  private preloading = new Set<string>();
  private queue: Array<{ key: string; fn: () => Promise<any>; priority: number }> = [];
  private isProcessing = false;
  private config: Required<PreloadConfig>;

  private constructor(config: PreloadConfig = {}) {
    this.config = {
      maxConcurrent: 3,
      priority: "medium",
      retryCount: 2,
      retryDelay: 1000,
      ...config,
    };
  }

  static getInstance(config?: PreloadConfig): ContentPreloader {
    if (!ContentPreloader.instance) {
      ContentPreloader.instance = new ContentPreloader(config);
    }
    return ContentPreloader.instance;
  }

  private getPriorityWeight(priority: PreloadConfig["priority"]): number {
    switch (priority) {
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 2;
    }
  }

  private async preloadWithRetry<T>(
    fn: () => Promise<T>,
    key: string,
    retries: number = this.config.retryCount
  ): Promise<T | null> {
    try {
      const result = await fn();
      this.preloadedKeys.add(key);
      return result;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.preloadWithRetry(fn, key, retries - 1);
      }
      console.warn(`Failed to preload ${key}:`, error);
      return null;
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      // Sort by priority (higher number = higher priority)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // Process in batches
      const batch = this.queue.splice(0, this.config.maxConcurrent);
      
      await Promise.all(
        batch.map(async ({ key, fn }) => {
          if (this.preloadedKeys.has(key) || this.preloading.has(key)) return;
          
          this.preloading.add(key);
          await this.preloadWithRetry(fn, key);
          this.preloading.delete(key);
        })
      );
      
      // Continue processing queue
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  enqueue(key: string, fn: () => Promise<any>, priority: PreloadConfig["priority"] = this.config.priority) {
    const priorityWeight = this.getPriorityWeight(priority);
    
    // Remove existing entry if present
    this.queue = this.queue.filter(item => item.key !== key);
    
    this.queue.push({
      key,
      fn,
      priority: priorityWeight,
    });
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Preload specific content types
  async preloadHomePage() {
    const keys = [
      { key: "trending", fn: () => tmdb.trending(), priority: "high" },
      { key: "popular", fn: () => tmdb.popular(), priority: "high" },
      { key: "topRated", fn: () => tmdb.topRated(), priority: "medium" },
      { key: "upcoming", fn: () => tmdb.upcoming(), priority: "medium" },
      { key: "nowPlaying", fn: () => tmdb.nowPlaying(), priority: "medium" },
    ];

    for (const item of keys) {
      this.enqueue(item.key, item.fn, item.priority as any);
    }

    // Prefetch genres
    const genres = [28, 35, 878, 27, 16, 10751];
    for (const genreId of genres) {
      this.enqueue(
        `genre-${genreId}`,
        () => tmdb.byGenre(genreId),
        "low"
      );
    }
  }

  async preloadMovieDetail(id: number) {
    const key = `movie-${id}`;
    if (this.preloadedKeys.has(key)) return;

    this.enqueue(
      key,
      () => Promise.all([
        tmdb.detail(id),
        tmdb.videos(id),
        tmdb.similar(id),
      ]),
      "high"
    );
  }

  async preloadSearchResults(query: string) {
    if (!query.trim()) return;
    const key = `search-${query}`;
    
    this.enqueue(
      key,
      () => tmdb.search(query),
      "medium"
    );
  }

  preloadImage(url: string, priority: PreloadConfig["priority"] = "low") {
    const key = `img-${url}`;
    if (this.preloadedKeys.has(key)) return;

    this.enqueue(
      key,
      () => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      }),
      priority
    );
  }

  // Preload a batch of movie details
  preloadMovies(movies: Array<{ id: number; priority?: PreloadConfig["priority"] }>) {
    for (const movie of movies) {
      this.preloadMovieDetail(movie.id);
    }
  }

  // Check if content is preloaded
  isPreloaded(key: string): boolean {
    return this.preloadedKeys.has(key);
  }

  // Get preload status
  getStatus(): {
    preloaded: number;
    preloading: number;
    queued: number;
    total: number;
  } {
    return {
      preloaded: this.preloadedKeys.size,
      preloading: this.preloading.size,
      queued: this.queue.length,
      total: this.preloadedKeys.size + this.preloading.size + this.queue.length,
    };
  }

  // Clear preload cache (useful for testing)
  clearCache() {
    this.preloadedKeys.clear();
    this.preloading.clear();
    this.queue = [];
  }
}