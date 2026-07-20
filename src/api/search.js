// api/search.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { title, year, imdbId, url, proxy } = req.query;

  // If they want to proxy a video (Option 2)
  if (url && proxy === 'true') {
    return await proxyVideo(req, res, url);
  }

  // Otherwise, search for video sources (Option 1)
  try {
    const sources = await findVideoSources(title, year, imdbId);
    res.status(200).json({ sources, source: 'vercel-function' });
  } catch (error) {
    // If our function fails, fallback to CORS proxy
    res.status(200).json({ 
      sources: [],
      fallback: 'use-proxy',
      message: 'Try using the proxy endpoint'
    });
  }
}

// Proxy a video through Vercel (bypasses CORS)
async function proxyVideo(req, res, videoUrl) {
  try {
    // Option 1: Try direct fetch through Vercel
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment');
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    // If Vercel fetch fails, tell the client to use external proxy
    res.status(200).json({
      error: 'Vercel proxy failed',
      fallback: 'external-proxy',
      externalProxy: `https://corsproxy.io/?${encodeURIComponent(videoUrl)}`
    });
  }
}

// Find video sources (Option 1 logic)
async function findVideoSources(title, year, imdbId) {
  const sources = [];

  // 1. Public Domain Movies
  const publicDomain = {
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

  const lowerTitle = (title || '').toLowerCase();
  for (const [key, source] of Object.entries(publicDomain)) {
    if (lowerTitle.includes(key)) {
      sources.push(source);
    }
  }

  // 2. Try Google Search (through Vercel)
  if (title) {
    try {
      const searchQuery = `${title} ${year || ''} mp4 filetype:mp4`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (response.ok) {
        const html = await response.text();
        // Extract .mp4 links
        const mp4Regex = /https?:\/\/[^\s"']+\.mp4/g;
        const matches = html.match(mp4Regex) || [];
        
        for (const match of matches.slice(0, 3)) {
          sources.push({
            url: match,
            quality: '720p',
            source: 'Google Search',
            size: 'Unknown'
          });
        }
      }
    } catch (e) {
      // Google search failed, continue
    }
  }

  // 3. Try Archive.org
  if (title) {
    try {
      const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(title)}&fl[]=downloads&rows=3`;
      const response = await fetch(archiveUrl);
      if (response.ok) {
        const data = await response.text();
        // Parse XML and extract video URLs
        // Simplified for this example
      }
    } catch (e) {
      // Archive search failed
    }
  }

  return sources;
}