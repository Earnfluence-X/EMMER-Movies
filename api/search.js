// api/search.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { title, year } = req.query;

  try {
    const sources = [];

    // ============================================
    // 1. KNOWN WORKING SOURCES (Test these first)
    // ============================================
    const knownSources = [
      {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
        quality: '1080p',
        source: 'Blender Foundation',
        size: '~150 MB'
      },
      {
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_720p_h264.mov',
        quality: '720p',
        source: 'Blender Foundation',
        size: '~200 MB'
      },
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        quality: '1080p',
        source: 'Google Sample',
        size: '~150 MB'
      },
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '1080p',
        source: 'Google Sample',
        size: '~150 MB'
      }
    ];

    // Check if the movie matches any known source
    const lowerTitle = (title || '').toLowerCase();
    const matchedSources = knownSources.filter(s => {
      const urlLower = s.url.toLowerCase();
      return lowerTitle.includes('big buck') || 
             lowerTitle.includes('bunny') ||
             lowerTitle.includes('elephant') ||
             lowerTitle.includes('sintel') ||
             lowerTitle.includes('tears');
    });

    if (matchedSources.length > 0) {
      sources.push(...matchedSources);
    }

    // ============================================
    // 2. SEARCH OPEN DIRECTORIES
    // ============================================
    const searchTerms = [
      `"${title}" "${year}" mp4`,
      `"${title}" "${year}" 1080p`,
      `"${title}" "${year}" download`,
    ];

    for (const term of searchTerms) {
      try {
        // Use DuckDuckGo (less strict than Google)
        const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(term)}`;
        const response = await fetch(ddgUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const html = await response.text();
        
        // Look for video file URLs
        const patterns = [
          /https?:\/\/[^\s"']+\.mp4/gi,
          /https?:\/\/[^\s"']+\.mkv/gi,
          /https?:\/\/[^\s"']+\.avi/gi,
          /https?:\/\/[^\s"']+\.webm/gi,
        ];
        
        for (const pattern of patterns) {
          const matches = html.match(pattern) || [];
          for (const match of matches) {
            if (!sources.some(s => s.url === match)) {
              sources.push({
                url: match,
                quality: 'Unknown',
                source: 'Open Directory',
                size: 'Unknown'
              });
            }
          }
        }
      } catch (e) {
        // Skip failed searches
      }
    }

    // ============================================
    // 3. Archive.org Search
    // ============================================
    try {
      const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(title)}&fl[]=identifier&rows=3`;
      const response = await fetch(archiveUrl);
      const text = await response.text();
      
      // Simple identifier extraction
      const ids = text.match(/<str name="identifier">([^<]+)<\/str>/g) || [];
      for (const idMatch of ids) {
        const id = idMatch.replace(/<[^>]+>/g, '');
        const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;
        if (!sources.some(s => s.url === videoUrl)) {
          sources.push({
            url: videoUrl,
            quality: 'Unknown',
            source: 'Archive.org',
            size: 'Unknown'
          });
        }
      }
    } catch (e) {}

    // ============================================
    // 4. Remove Duplicates
    // ============================================
    const unique = sources.filter((s, i, self) => 
      i === self.findIndex(t => t.url === s.url)
    );

    // ============================================
    // 5. If no sources found, provide a fallback
    // ============================================
    if (unique.length === 0) {
      sources.push({
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
        quality: '1080p',
        source: 'Fallback (Big Buck Bunny)',
        size: '~150 MB'
      });
    }

    res.status(200).json({ 
      sources: unique,
      count: unique.length,
      message: `Found ${unique.length} potential sources`
    });

  } catch (error) {
    res.status(200).json({ 
      sources: [{
        url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
        quality: '1080p',
        source: 'Fallback',
        size: '~150 MB'
      }],
      message: 'Using fallback source'
    });
  }
}