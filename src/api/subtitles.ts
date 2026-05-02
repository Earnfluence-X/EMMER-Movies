// Wyzie Subs is a free public subtitle API (https://sub.wyzie.ru) that aggregates
// from OpenSubtitles. Returns an array of subtitle objects with downloadable URLs
// in .srt or .vtt format. We convert .srt → .vtt on the fly so HTML5 <track> can use them.

export interface Subtitle {
  id: string;
  url: string;
  format: "srt" | "vtt";
  display: string; // human-readable label e.g. "English"
  language: string; // ISO code e.g. "en"
  flagUrl?: string;
  encoding?: string;
}

interface WyzieResult {
  id: string;
  url: string;
  format: string;
  display: string;
  language: string;
  flagUrl?: string;
  encoding?: string;
}

export async function searchSubtitles(imdbId: string, signal?: AbortSignal): Promise<Subtitle[]> {
  if (!imdbId) return [];
  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  try {
    const res = await fetch(`https://sub.wyzie.ru/search?id=${id}&format=srt,vtt`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as WyzieResult[];
    return data.map((d) => ({
      id: d.id,
      url: d.url,
      format: (d.format?.toLowerCase() === "vtt" ? "vtt" : "srt") as "srt" | "vtt",
      display: d.display || d.language,
      language: d.language,
      flagUrl: d.flagUrl,
      encoding: d.encoding,
    }));
  } catch {
    return [];
  }
}

// Convert SRT to WebVTT in-browser so we can use HTML5 <track>.
export function srtToVtt(srt: string): string {
  const body = srt
    .replace(/\r+/g, "")
    .replace(/^\s*\d+\s*$/gm, "") // strip cue numbers
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2"); // commas → dots
  return "WEBVTT\n\n" + body.trim();
}

// Fetches the subtitle file, converts to VTT if needed, and returns a blob URL
// suitable for a <track> element's src attribute.
export async function loadSubtitleAsVttUrl(sub: Subtitle): Promise<string> {
  const res = await fetch(sub.url);
  const text = await res.text();
  const vtt = sub.format === "vtt" ? text : srtToVtt(text);
  const blob = new Blob([vtt], { type: "text/vtt" });
  return URL.createObjectURL(blob);
}
