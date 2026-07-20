// downloader.ts - Complete working version for personal use
export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "error" | "canceled";

export interface DownloadProgress {
  loaded: number;
  total: number;
  status: DownloadStatus;
  speed: number;
}

export interface DownloadHandle {
  pause(): void;
  resume(): void;
  cancel(): void;
  getStatus(): DownloadStatus;
}

interface StartOpts {
  url: string;
  onProgress: (p: DownloadProgress) => void;
  onComplete: (blob: Blob) => void;
  onError: (err: Error) => void;
}

// ============================================
// DIRECT DOWNLOAD - WORKS FOR PERSONAL USE
// ============================================
export async function directDownloadToDevice(url: string, filename: string): Promise<boolean> {
  try {
    // Show download status
    console.log(`📥 Downloading: ${filename}`);
    console.log(`📡 Source: ${url}`);
    
    // Fetch the video directly
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    // Get the video as a blob
    const blob = await response.blob();
    console.log(`✅ Downloaded ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Create a download link and trigger download
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
    return true;
  } catch (error) {
    console.error('❌ Download failed:', error);
    return false;
  }
}

// ============================================
// TEST IF URL IS ACCESSIBLE
// ============================================
export async function testUrl(url: string): Promise<{ ok: boolean; status: number; size?: number }> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
    });
    const size = response.headers.get('content-length');
    return {
      ok: response.ok,
      status: response.status,
      size: size ? parseInt(size) : undefined
    };
  } catch {
    return { ok: false, status: 0 };
  }
}

// ============================================
// ORIGINAL CHUNK DOWNLOADER (Keep for reference)
// ============================================
const CHUNK_SIZE = 4 * 1024 * 1024;

export function startDownload({ url, onProgress, onComplete, onError }: StartOpts): DownloadHandle {
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  let total = 0;
  let status: DownloadStatus = "queued";
  let controller: AbortController | null = null;
  let lastTickBytes = 0;
  let lastTickTime = Date.now();
  let speed = 0;
  let mimeType = "video/mp4";

  const emit = () => onProgress({ loaded, total, status, speed });

  async function probe(): Promise<void> {
    try {
      const r = await fetch(url, { method: "HEAD" });
      const len = r.headers.get("content-length");
      const ct = r.headers.get("content-type");
      if (len) total = parseInt(len, 10);
      if (ct) mimeType = ct;
    } catch {
      // Some servers block HEAD
    }
  }

  async function loop(): Promise<void> {
    while (status === "downloading") {
      const start = loaded;
      const end = total > 0 ? Math.min(start + CHUNK_SIZE - 1, total - 1) : start + CHUNK_SIZE - 1;
      controller = new AbortController();

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { Range: `bytes=${start}-${end}` },
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        status = "error";
        onError(err as Error);
        emit();
        return;
      }

      if (res.status === 416) {
        status = "completed";
        finalize();
        return;
      }
      if (!res.ok && res.status !== 206 && res.status !== 200) {
        status = "error";
        onError(new Error(`HTTP ${res.status}`));
        emit();
        return;
      }

      const cr = res.headers.get("content-range");
      if (cr && total === 0) {
        const m = cr.match(/\/(\d+)$/);
        if (m) total = parseInt(m[1], 10);
      }
      if (!cr && total === 0) {
        const cl = res.headers.get("content-length");
        if (cl) total = parseInt(cl, 10);
      }

      if (res.status === 200 && start === 0) {
        const reader = res.body?.getReader();
        if (!reader) {
          status = "error";
          onError(new Error("No response body"));
          return;
        }
        while (true) {
          if ((status as DownloadStatus) !== "downloading") return;
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          tickSpeed();
          emit();
        }
        status = "completed";
        finalize();
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        status = "error";
        onError(new Error("No response body"));
        return;
      }
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          tickSpeed();
          emit();
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        status = "error";
        onError(err as Error);
        return;
      }

      if (total > 0 && loaded >= total) {
        status = "completed";
        finalize();
        return;
      }
    }
  }

  function tickSpeed() {
    const now = Date.now();
    const dt = (now - lastTickTime) / 1000;
    if (dt >= 0.5) {
      speed = (loaded - lastTickBytes) / dt;
      lastTickBytes = loaded;
      lastTickTime = now;
    }
  }

  function finalize() {
    const blob = new Blob(chunks as BlobPart[], { type: mimeType });
    chunks.length = 0;
    onComplete(blob);
    emit();
  }

  // Kick off
  (async () => {
    status = "downloading";
    emit();
    await probe();
    emit();
    loop();
  })();

  return {
    pause() {
      if (status === "downloading") {
        status = "paused";
        controller?.abort();
        emit();
      }
    },
    resume() {
      if (status === "paused") {
        status = "downloading";
        lastTickTime = Date.now();
        lastTickBytes = loaded;
        emit();
        loop();
      }
    },
    cancel() {
      status = "canceled";
      controller?.abort();
      chunks.length = 0;
      emit();
    },
    getStatus: () => status,
  };
}

export function fmtBytes(b: number): string {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
}

export function fmtSpeed(bps: number): string {
  return `${fmtBytes(bps)}/s`;
}