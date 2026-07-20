// Streaming downloader with pause / resume / cancel.
// Strategy: HTTP Range requests. We fetch [start, end] chunks and accumulate them.
// On pause, we abort the current request but keep accumulated chunks in memory.
// On resume, we re-issue a Range request starting at the next byte.
//
// ⚠️ Limitations imposed by the browser:
//   - The remote server must allow CORS (Access-Control-Allow-Origin) AND
//     advertise Accept-Ranges: bytes. Most public test streams do.
//   - HLS (.m3u8) is NOT supported here — that's a playlist, not a single file.
//     For HLS you'd need to download each segment; out of scope for now.

export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "error" | "canceled";

export interface DownloadProgress {
  loaded: number;
  total: number;
  status: DownloadStatus;
  speed: number; // bytes per second
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

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB per range request

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
    // HEAD request to discover total length and range support.
    try {
      const r = await fetch(url, { method: "HEAD" });
      const len = r.headers.get("content-length");
      const ct = r.headers.get("content-type");
      if (len) total = parseInt(len, 10);
      if (ct) mimeType = ct;
    } catch {
      /* some servers block HEAD; we'll discover total on first GET */
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
        if ((err as Error).name === "AbortError") return; // pause/cancel
        status = "error";
        onError(err as Error);
        emit();
        return;
      }

      if (res.status === 416) {
        // Range not satisfiable → we're past the end → done
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

      // Discover total from Content-Range if we didn't have it
      const cr = res.headers.get("content-range");
      if (cr && total === 0) {
        const m = cr.match(/\/(\d+)$/);
        if (m) total = parseInt(m[1], 10);
      }
      if (!cr && total === 0) {
        const cl = res.headers.get("content-length");
        if (cl) total = parseInt(cl, 10);
      }

      // If server ignored Range and returned the whole file, we just take it all.
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

      // Stream the chunk
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
    chunks.length = 0; // free memory
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
