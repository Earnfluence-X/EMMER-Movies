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
      // Try public domain sources first
      setMessage('📚 Checking public domain...');
      const publicDomain = await checkPublicDomain(movie);
      
      if (publicDomain) {
        setMessage(`✅ Found public domain source`);
        await startDownload(publicDomain);
        return;
      }

      // Try using the Vercel API
      setMessage('📡 Checking Vercel API...');
      const vercelSource = await searchViaVercel(movie);
      
      if (vercelSource) {
        setMessage(`✅ Found source via Vercel`);
        await startDownload(vercelSource);
        return;
      }

      // Try using external proxy
      setMessage('🌐 Searching via proxy...');
      const proxySource = await searchViaProxy(movie);
      
      if (proxySource) {
        setMessage(`✅ Found source via proxy`);
        await startDownload(proxySource);
        return;
      }

      setStatus('error');
      setMessage('❌ No video sources found. Try a different movie or paste a URL manually.');

    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const checkPublicDomain = async (movie: Movie) => {
    const publicDomainMovies: Record<string, any> = {
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
      },
      'elephants dream': {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~150 MB'
      }
    };

    const title = (movie.title || '').toLowerCase();
    for (const [key, source] of Object.entries(publicDomainMovies)) {
      if (title.includes(key)) {
        return source;
      }
    }
    return null;
  };

  const searchViaVercel = async (movie: Movie) => {
    try {
      const response = await fetch(
        `/api/search?title=${encodeURIComponent(movie.title || '')}&year=${movie.release_date || ''}&imdbId=${movie.id}`
      );
      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        return data.sources[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  const searchViaProxy = async (movie: Movie) => {
    try {
      const proxyUrl = 'https://corsproxy.io/?';
      const searchQuery = `${movie.title} ${movie.release_date} mp4`;
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(`${proxyUrl}${encodeURIComponent(searchUrl)}`);
      const html = await response.text();
      
      const mp4Regex = /https?:\/\/[^\s"']+\.mp4/g;
      const matches = html.match(mp4Regex) || [];
      
      if (matches.length > 0) {
        return {
          url: `${proxyUrl}${encodeURIComponent(matches[0])}`,
          quality: '720p',
          source: 'Proxy Search',
          size: 'Unknown'
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const startDownload = async (source: any) => {
    setStatus('downloading');
    setMessage('📥 Starting download...');
    
    try {
      await add(movie, source.url, source.quality, 'auto');
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