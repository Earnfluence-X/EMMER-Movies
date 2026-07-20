// api/search.js - Finds movie sources
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { title, year, imdbId } = req.query;
  const sources = [];

  try {
    // ============================================
    // 1. PUBLIC DOMAIN MOVIES
    // ============================================
    const publicDomain = {
      'night of the living dead': {
        url: 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~800 MB'
      },
      'nosferatu': {
        url: 'https://archive.org/download/nosferatu_1922/nosferatu_1922.mp4',
        quality: '1080p',
        source: 'Public Domain',
        size: '~600 MB'
      },
      'big buck bunny': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
        quality: '1080p',
        source: 'Blender',
        size: '~150 MB'
      },
      'sintel': {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/Sintel.mp4',
        quality: '1080p',
        source: 'Blender',
        size: '~130 MB'
      }
    };

    const lowerTitle = (title || '').toLowerCase();
    for (const [key, source] of Object.entries(publicDomain)) {
      if (lowerTitle.includes(key)) {
        sources.push(source);
      }
    }

    // ============================================
    // 2. SEARCH ARCHIVE.ORG
    // ============================================
    if (title) {
      try {
        const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(title)}&fl[]=identifier&rows=5`;
        const response = await fetch(searchUrl);
        const text = await response.text();
        
        const idMatches = text.match(/<str name="identifier">([^<]+)<\/str>/g) || [];
        for (const idMatch of idMatches) {
          const id = idMatch.replace(/<[^>]+>/g, '');
          const formats = ['.mp4', '.mkv', '.webm'];
          for (const format of formats) {
            const url = `https://archive.org/download/${id}/${id}${format}`;
            if (!sources.some(s => s.url === url)) {
              sources.push({
                url,
                quality: 'Unknown',
                source: 'Archive.org',
                size: 'Unknown'
              });
            }
          }
        }
      } catch (e) {}
    }

    // ============================================
    // 3. SEARCH YTS API
    // ============================================
    if (title) {
      try {
        const ytsUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(title)}&limit=5`;
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
                  size: torrent.size
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    // ============================================
    // 4. Add a note if no sources found
    // ============================================
    if (sources.length === 0) {
      sources.push({
        url: null,
        quality: null,
        source: 'No sources found',
        size: null,
        note: `No sources found for "${title}". Try a different movie.`
      });
    }

    // Remove duplicates
    const unique = sources.filter((s, i, self) => 
      i === self.findIndex(t => t.url === s.url)
    );

    res.status(200).json({ 
      sources: unique.slice(0, 20),
      count: unique.length,
      message: `Found ${unique.length} sources`
    });

  } catch (error) {
    res.status(200).json({ 
      sources: [],
      error: error.message
    });
  }
}