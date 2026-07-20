import { useState } from 'react';
import { Download, Loader2, Check, AlertCircle, Search, Film, CheckCircle2, Wifi } from 'lucide-react';
import { openVideoInNewTab, downloadMagnet } from '../lib/downloader';
import type { Movie } from '../api/tmdb';

export function SmartDownloadButton({ movie }: { movie: Movie }) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'downloading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<any[]>([]);

  const handleSearch = async () => {
    setStatus('searching');
    setMessage('🔍 Searching for sources...');

    try {
      const response = await fetch(
        `/api/search?title=${encodeURIComponent(movie.title || '')}&year=${movie.release_date || ''}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        setSources(data.sources);
        setStatus('found');
        setMessage(`✅ Found ${data.sources.length} sources. Click one to watch/download.`);
      } else {
        setStatus('error');
        setMessage(`❌ No sources found for "${movie.title}". Try a different title.`);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleDownload = (source: any) => {
    setStatus('downloading');
    
    try {
      // Check if it's a magnet link
      if (source.url && source.url.startsWith('magnet:')) {
        setMessage(`🧲 Opening magnet link...`);
        window.open(source.url, '_blank');
        setStatus('success');
        setMessage('✅ Magnet link opened! qBittorrent should open.');
        return;
      }

      // For video URLs - OPEN IN NEW TAB (THIS WORKS!)
      setMessage(`📺 Opening video...`);
      const success = openVideoInNewTab(source.url);
      
      if (success) {
        setStatus('success');
        setMessage(`✅ Video opened in new tab! It should play or download.`);
      } else {
        setStatus('error');
        setMessage('❌ Failed to open video. Try another source.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Failed: ${error.message}`);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-500 text-sm">
        <Check size={18} />
        {message}
      </div>
    );
  }

  if (status === 'found') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <p className="text-xs text-zinc-400 mb-2">{message}</p>
        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 bg-zinc-900/50 rounded-lg">
          {sources.map((source, i) => {
            const isMagnet = source.url && source.url.startsWith('magnet:');
            return (
              <button
                key={i}
                onClick={() => handleDownload(source)}
                className={`text-xs px-3 py-2 rounded transition flex items-center gap-2 w-full sm:w-auto ${
                  isMagnet 
                    ? 'bg-blue-800 hover:bg-blue-700 text-white' 
                    : 'bg-green-800 hover:bg-green-700 text-white'
                }`}
              >
                {isMagnet ? <Wifi size={12} /> : <Film size={12} />}
                {source.quality || 'HD'} - {source.source}
                {source.size && <span className="text-zinc-400">({source.size})</span>}
                {isMagnet ? '🧲 Magnet' : '▶️ Watch/Download'}
              </button>
            );
          })}
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mt-2">
          <p className="text-xs text-yellow-300 flex items-center gap-2">
            💡 Click a button - the video will open in a new tab where you can watch or download it!
          </p>
        </div>
        <button
          onClick={() => setStatus('idle')}
          className="text-xs text-zinc-500 hover:text-white transition mt-1"
        >
          ← Back to search
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setStatus('idle')}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-md transition"
        >
          <AlertCircle size={20} />
          Retry Search
        </button>
        <p className="text-xs text-red-400">{message}</p>
        <p className="text-xs text-zinc-500">
          💡 Try searching for: "Big Buck Bunny" or "Sintel"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSearch}
        disabled={status === 'searching' || status === 'downloading'}
        className="flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-6 py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'searching' ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search size={20} />
            Find Sources
          </>
        )}
      </button>
      
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-zinc-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}