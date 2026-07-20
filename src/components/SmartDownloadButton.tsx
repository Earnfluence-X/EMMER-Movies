import { useState } from 'react';
import { Download, Loader2, Check, AlertCircle, Search } from 'lucide-react';
import { useDownloads } from '../context/DownloadContext';
import type { Movie } from '../api/tmdb';

export function SmartDownloadButton({ movie }: { movie: Movie }) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'downloading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const { add } = useDownloads();

  const handleSearch = async () => {
    setStatus('searching');
    setMessage('🔍 Searching open directories...');

    try {
      const response = await fetch(
        `/api/search?title=${encodeURIComponent(movie.title || '')}&year=${movie.release_date || ''}`
      );
      
      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        setSources(data.sources);
        setStatus('found');
        setMessage(`✅ Found ${data.sources.length} potential sources. Select one to download.`);
      } else {
        setStatus('error');
        setMessage('❌ No sources found. Try a different movie.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleDownload = async (source: any) => {
    setSelectedSource(source);
    setStatus('downloading');
    setMessage(`📥 Downloading from: ${source.source}...`);

    try {
      await add(movie, source.url, source.quality || 'Unknown', 'auto');
      setStatus('success');
      setMessage('✅ Download started! Check your Library.');
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Download failed: ${error.message}`);
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
        <p className="text-xs text-zinc-400">{message}</p>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {sources.map((source, i) => (
            <button
              key={i}
              onClick={() => handleDownload(source)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition flex items-center gap-1"
            >
              <Download size={12} />
              {source.quality} - {source.source}
            </button>
          ))}
        </div>
        <button
          onClick={() => setStatus('idle')}
          className="text-xs text-zinc-500 hover:text-white transition"
        >
          ← Back
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
            Search & Download
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