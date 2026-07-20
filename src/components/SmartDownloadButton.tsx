import { useState } from 'react';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';
import { useDownloads } from '../context/DownloadContext';
import type { Movie } from '../api/tmdb';

export function SmartDownloadButton({ movie }: { movie: Movie }) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'downloading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { add } = useDownloads();

  const handleDownload = async () => {
    setStatus('searching');
    setMessage('🔍 Searching for video sources...');

    try {
      // Call your Vercel API
      const response = await fetch(
        `/api/search?title=${encodeURIComponent(movie.title || '')}&year=${movie.release_date || ''}&imdbId=${movie.id}`
      );
      
      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        const source = data.sources[0];
        setMessage(`✅ Found source: ${source.source}`);
        
        setStatus('downloading');
        setMessage('📥 Downloading...');
        
        await add(movie, source.url, source.quality, 'auto');
        setStatus('success');
        setMessage('✅ Download complete! Check your Library.');
      } else {
        setStatus('error');
        setMessage('❌ No video sources found.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
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

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setStatus('idle')}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-md transition"
        >
          <AlertCircle size={20} />
          Retry Download
        </button>
        <p className="text-xs text-red-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        disabled={status === 'searching' || status === 'downloading'}
        className="flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-6 py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'searching' || status === 'downloading' ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {status === 'searching' ? 'Searching...' : 'Downloading...'}
          </>
        ) : (
          <>
            <Download size={20} />
            Smart Download
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