import { useState } from 'react';
import { Download, Loader2, Check, AlertCircle, Search, Film, CheckCircle2, Wifi } from 'lucide-react';
import { downloadVideo, downloadMagnet } from '../lib/downloader';
import type { Movie } from '../api/tmdb';

export function SmartDownloadButton({ movie }: { movie: Movie }) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'downloading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<any[]>([]);

  // REMOVED: The "Find Sources" button functionality is removed
  // The button now only shows manual download option

  // Simplified: Just show a manual download input
  const [manualUrl, setManualUrl] = useState('');

  const handleManualDownload = () => {
    if (!manualUrl.trim()) return;
    
    setStatus('downloading');
    setMessage('📥 Downloading...');
    
    try {
      const filename = `${movie.title || 'video'}.mp4`;
      const success = downloadVideo(manualUrl, filename);
      
      if (success) {
        setStatus('success');
        setMessage('✅ Download started! Check your downloads folder.');
        setManualUrl('');
      } else {
        setStatus('error');
        setMessage('❌ Download failed. Try another URL.');
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

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setStatus('idle')}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-md transition text-sm"
        >
          <AlertCircle size={16} />
          Retry
        </button>
        <p className="text-xs text-red-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      <div className="flex gap-2">
        <input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Paste direct video URL (.mp4)"
          className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-[#e50914] outline-none rounded-md px-3 py-2 text-white text-sm"
        />
        <button
          onClick={handleManualDownload}
          disabled={status === 'downloading' || !manualUrl.trim()}
          className="flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {status === 'downloading' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download size={16} />
              Download
            </>
          )}
        </button>
      </div>
      
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-zinc-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}