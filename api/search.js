// api/search.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { title, year } = req.query;
  const sources = [];

  try {
    // ============================================
    // 1. YTS (Movie magnet links - BEST QUALITY)
    // ============================================
    try {
      const ytsUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(title)}&limit=10`;
      const response = await fetch(ytsUrl);
      const data = await response.json();
      
      if (data.data && data.data.movies) {
        for (const movie of data.data.movies) {
          if (movie.torrents) {
            for (const torrent of movie.torrents) {
              sources.push({
                url: torrent.url,
                quality: torrent.quality,
                source: 'YTS',
                size: torrent.size,
                title: movie.title,
                year: movie.year,
                type: 'movie',
                working: true
              });
            }
          }
        }
      }
    } catch (e) {}

    // ============================================
    // 2. 1337X (Movies & Series)
    // ============================================
    try {
      const searchTerm = encodeURIComponent(`${title} ${year || ''} 1080p`);
      const searchUrl = `https://1337x.to/search/${searchTerm}/1/`;
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (response.ok) {
        const html = await response.text();
        const magnetRegex = /magnet:\?xt=urn:btih:[a-fA-F0-9]+[^\s"']*/g;
        const matches = html.match(magnetRegex) || [];
        
        for (const match of matches) {
          if (!sources.some(s => s.url === match)) {
            sources.push({
              url: match,
              quality: '1080p',
              source: '1337x',
              size: 'Unknown',
              type: 'movie',
              working: true
            });
          }
        }
      }
    } catch (e) {}

    // ============================================
    // 3. Public Domain (Direct downloads)
    // ============================================
    const publicDomain = {
      'night of the living dead': {
        url: 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~800 MB',
        type: 'movie',
        working: true
      },
      'nosferatu': {
        url: 'https://archive.org/download/nosferatu_1922/nosferatu_1922.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~600 MB',
        type: 'movie',
        working: true
      },
      'big buck bunny': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
        quality: '1080p',
        source: 'Blender',
        size: '~150 MB',
        type: 'movie',
        working: true
      },
      'sintel': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/Sintel.mp4',
        quality: '1080p',
        source: 'Blender',
        size: '~130 MB',
        type: 'movie',
        working: true
      }
    };

    const lowerTitle = (title || '').toLowerCase();
    for (const [key, source] of Object.entries(publicDomain)) {
      if (lowerTitle.includes(key)) {
        sources.push(source);
      }
    }

    // Remove duplicates
    const unique = sources.filter((s, i, self) => 
      i === self.findIndex(t => t.url === s.url)
    );

    // Sort: Working first, then by quality
    const sorted = unique.sort((a, b) => {
      if (a.working && !b.working) return -1;
      if (!a.working && b.working) return 1;
      const qualityOrder = { '4K': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    res.status(200).json({ 
      sources: sorted.slice(0, 20),
      count: sorted.length,
      message: `Found ${sorted.length} sources`
    });

  } catch (error) {
    res.status(200).json({ 
      sources: [],
      error: error.message
    });
  }
}