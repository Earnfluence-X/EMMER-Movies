import { useState } from 'react';
import { Download, Loader2, Check, AlertCircle, Search, Film, CheckCircle2, Wifi } from 'lucide-react';
import { downloadVideo, downloadMagnet } from '../lib/downloader';
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
      
      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        setSources(data.sources);
        setStatus('found');
        setMessage(`✅ Found ${data.sources.length} sources. Click one to download.`);
      } else {
        setStatus('error');
        setMessage(`❌ No sources found. Try a different title.`);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleDownload = (source: any) => {
    setStatus('downloading');
    
    try {
      const isMagnet = source.url && source.url.startsWith('magnet:');
      
      if (isMagnet) {
        setMessage(`🧲 Opening magnet link in torrent client...`);
        const success = downloadMagnet(source.url);
        if (success) {
          setStatus('success');
          setMessage('✅ Magnet link opened! Download will start in qBittorrent.');
        } else {
          setStatus('error');
          setMessage('❌ Failed to open magnet link. Is qBittorrent installed?');
        }
        return;
      }

      // Direct download
      setMessage(`📥 Downloading from ${source.source}...`);
      const filename = `${movie.title || 'video'}.mp4`;
      const success = downloadVideo(source.url, filename);
      
      if (success) {
        setStatus('success');
        setMessage(`✅ Download started! Check your downloads folder.`);
      } else {
        setStatus('error');
        setMessage('❌ Download failed. Try another source.');
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
            const isDirect = source.url && !source.url.startsWith('magnet:');
            
            return (
              <button
                key={i}
                onClick={() => handleDownload(source)}
                className={`text-xs px-3 py-2 rounded transition flex items-center gap-2 w-full sm:w-auto ${
                  isMagnet 
                    ? 'bg-blue-800 hover:bg-blue-700 text-white' 
                    : isDirect
                    ? 'bg-green-800 hover:bg-green-700 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
              >
                {isMagnet ? <Wifi size={12} /> : <Film size={12} />}
                {source.quality || 'HD'} - {source.source}
                {source.size && <span className="text-zinc-400">({source.size})</span>}
                {isMagnet && <span className="text-blue-300 text-[10px]">🧲 Magnet</span>}
                {isDirect && <span className="text-green-300 text-[10px]">⬇️ Direct</span>}
                {source.working && <CheckCircle2 size={12} className="text-green-500" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex-1">
            <p className="text-xs text-blue-300 flex items-center gap-2">
              <Wifi size={12} />
              🧲 Magnet = Opens in qBittorrent
            </p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex-1">
            <p className="text-xs text-green-300 flex items-center gap-2">
              <Film size={12} />
              ⬇️ Direct = Downloads immediately
            </p>
          </div>
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
        {message.includes('qBittorrent') && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
            <p className="text-xs text-yellow-300">
              💡 Make sure qBittorrent is installed and running.
              <br />
              <a href="https://www.qbittorrent.org/download" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Download qBittorrent
              </a>
            </p>
          </div>
        )}
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
            Find & Download
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