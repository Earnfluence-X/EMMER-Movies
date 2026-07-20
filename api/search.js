export default async function handler(req, res) { 
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); 
 
  if (req.method === 'OPTIONS') { 
    return res.status(200).end(); 
  } 
 
  const { title, year, imdbId, url, proxy } = req.query; 
 
    try { 
      const response = await fetch(url); 
      const buffer = await response.arrayBuffer(); 
      res.status(200).send(Buffer.from(buffer)); 
    } catch (error) { 
      res.status(200).json({ fallback: 'external-proxy' }); 
    } 
    return; 
  } 
 
  try { 
    const sources = []; 
    const publicDomain = { 
      'big buck bunny': { url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4', quality: '1080p', source: 'Public Domain' }, 
      'sintel': { url: 'https://download.blender.org/peach/bigbuckbunny_movies/Sintel.mp4', quality: '1080p', source: 'Public Domain' }, 
      'tears of steel': { url: 'https://download.blender.org/peach/bigbuckbunny_movies/TearsOfSteel.mp4', quality: '1080p', source: 'Public Domain' } 
    }; 
 
    for (const [key, source] of Object.entries(publicDomain)) { 
      if (lowerTitle.includes(key)) { 
        sources.push(source); 
      } 
    } 
 
    if (title) { 
      try { 
        const response = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }); 
        if (response.ok) { 
          const html = await response.text(); 
          for (const match of matches.slice(0, 3)) { 
            sources.push({ url: match, quality: '720p', source: 'Google Search' }); 
          } 
        } 
      } catch (e) {} 
    } 
 
    res.status(200).json({ sources }); 
  } catch (error) { 
    res.status(200).json({ sources: [] }); 
  } 
} 
