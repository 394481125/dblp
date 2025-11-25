import { Article, SearchParams } from '../types';

const DBLP_API_BASE = 'https://dblp.org/search/publ/api';

// Helper to clean text (remove HTML entities sometimes returned by DBLP)
const cleanText = (text: string): string => {
  if (!text) return '';
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    return text;
  }
};

// Helper to determine venue type from key or type field
const getVenueType = (type: string, key: string): 'Journal' | 'Conference' | 'Editorship' | 'Unknown' => {
  if (type === 'Article' || (key && key.startsWith('journals/'))) return 'Journal';
  if (type === 'Inproceedings' || (key && key.startsWith('conf/'))) return 'Conference';
  if (type === 'Editorship') return 'Editorship';
  return 'Unknown';
};

// Helper to normalize authors which can be a single object or array in DBLP JSON
const parseAuthors = (info: any): string[] => {
  if (!info || !info.authors) return ['Unknown Author'];
  
  const authorsData = info.authors.author;
  if (!authorsData) return ['Unknown Author'];
  
  if (Array.isArray(authorsData)) {
    return authorsData.map((a: any) => cleanText(a.text));
  } else if (typeof authorsData === 'object') {
    return [cleanText(authorsData.text)];
  }
  return ['Unknown Author'];
};

// Helper for polite crawling
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Robust fetch with retry logic
const fetchWithRetry = async (url: string, retries = 3, signal?: AbortSignal): Promise<Response> => {
  let lastError: any;
  
  const fetchOptions: RequestInit = {
    signal,
    method: 'GET',
    mode: 'cors', // Explicitly request CORS
    credentials: 'omit', // Do not send cookies to avoid security triggers on DBLP side
    headers: {
      'Accept': 'application/json',
    }
  };

  for (let i = 0; i < retries; i++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok) return response;
      
      // Retry on 5xx errors or 429 Too Many Requests
      if (response.status >= 500 || response.status === 429) {
        const waitTime = 1000 * (i + 1);
        await delay(waitTime);
        continue;
      }
      
      throw new Error(`DBLP API Error: ${response.status} ${response.statusText}`);
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      lastError = e;
      // Exponential backoff for network errors
      await delay(1000 * (i + 1));
    }
  }
  throw lastError || new Error("Failed to connect to DBLP API.");
};

export const fetchDBLPData = async (
  params: SearchParams,
  onProgress?: (fetched: number, total: number) => void,
  signal?: AbortSignal
): Promise<Article[]> => {
  let q = params.query.trim();
  
  // Logic to handle "URL Mode" - extracting the stream key
  if (params.mode === 'url') {
    const match = params.query.match(/db\/(journals\/[^/]+|conf\/[^/]+)/);
    if (match && match[1]) {
      q = `stream:${match[1]}:`;
    } else if (params.query.includes('/') && !params.query.startsWith('http') && !params.query.startsWith('stream:')) {
       q = `stream:${params.query}:`;
    }
  }
  
  if (!q) {
    throw new Error("Search query cannot be empty.");
  }

  // OPTIMIZATION: Reduced batch size for better stability on "Failed to fetch" errors
  const BATCH_SIZE = 100; 
  const CONCURRENCY_LIMIT = 8; // Increased concurrency to compensate for smaller batches

  const maxResults = params.maxResults || 50;
  
  let allHits: any[] = [];
  let totalMatches = 0;

  try {
    // 1. Fetch the FIRST page to get total count and first batch of data
    const firstUrl = `${DBLP_API_BASE}?q=${encodeURIComponent(q)}&h=${BATCH_SIZE}&f=0&format=json`;
    const firstRes = await fetchWithRetry(firstUrl, 3, signal);
    const firstData = await firstRes.json();
    
    if (firstData.result?.hits?.['@total']) {
      totalMatches = parseInt(firstData.result.hits['@total'], 10);
    }

    const firstHits = firstData.result?.hits?.hit || [];
    if (Array.isArray(firstHits)) {
      allHits = [...firstHits];
    }

    // Update progress immediately
    if (onProgress) {
      const effectiveTotal = totalMatches > 0 ? Math.min(totalMatches, maxResults) : maxResults;
      onProgress(allHits.length, effectiveTotal);
    }

    // 2. Calculate remaining pages if we need more data
    const targetCount = Math.min(totalMatches, maxResults);
    
    if (allHits.length < targetCount) {
      const offsetsToFetch: number[] = [];
      
      // Calculate all offsets needed
      for (let f = BATCH_SIZE; f < targetCount; f += BATCH_SIZE) {
        offsetsToFetch.push(f);
      }

      // 3. Fetch remaining pages using Sliding Window Concurrency Pool
      const activePromises = new Set<Promise<void>>();
      
      // Helper to fetch a single batch and update state
      const fetchBatch = async (offset: number) => {
        if (signal?.aborted) return;

        const url = `${DBLP_API_BASE}?q=${encodeURIComponent(q)}&h=${BATCH_SIZE}&f=${offset}&format=json`;
        const res = await fetchWithRetry(url, 3, signal);
        const data = await res.json();
        const hits = data.result?.hits?.hit || [];
        
        if (Array.isArray(hits)) {
          allHits.push(...hits);
        }

        if (onProgress) {
          onProgress(Math.min(allHits.length, targetCount), targetCount);
        }
      };

      for (const offset of offsetsToFetch) {
        if (signal?.aborted) break;

        // Wrap fetchBatch in a catch block so one failure doesn't crash the whole Promise.race loop
        const p = fetchBatch(offset)
          .catch(err => {
             // If a specific batch fails, log it but continue processing others.
             // This prevents the "Failed to fetch" from killing the entire result set.
             console.warn(`Batch failed at offset ${offset}. Continuing...`, err);
             if (err.name === 'AbortError') throw err;
          })
          .then(() => {
            activePromises.delete(p);
          });
        
        activePromises.add(p);

        // If we reached the limit, wait for the first one to finish before starting a new one
        if (activePromises.size >= CONCURRENCY_LIMIT) {
          await Promise.race(activePromises);
        }
      }

      // Wait for any remaining requests to finish
      await Promise.all(activePromises);
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // 4. Map to internal model
    // Slice ensures we don't exceed maxResults if the last batch pushed us over
    const rawArticles = allHits.slice(0, maxResults);

    const articles: Article[] = rawArticles.map((hit: any) => {
      const info = hit.info || {};
      const venueType = getVenueType(info.type, info.key || '');
      
      return {
        id: hit['@id'] || info.key || Math.random().toString(),
        title: cleanText(info.title),
        authors: parseAuthors(info),
        venue: cleanText(info.venue),
        venueType: venueType,
        year: info.year || '',
        type: info.type || 'Unknown',
        doi: info.doi,
        url: info.url,
        key: info.key,
        selected: false,
      };
    });

    // 5. Client-side Filtering
    return articles.filter(a => {
      const y = parseInt(a.year, 10);
      if (isNaN(y)) return true;

      const start = params.yearStart ? parseInt(params.yearStart, 10) : 0;
      const end = params.yearEnd ? parseInt(params.yearEnd, 10) : 9999;
      
      const yearMatch = y >= start && y <= end;

      let typeMatch = true;
      if (params.typeFilter === 'journal') typeMatch = a.venueType === 'Journal';
      if (params.typeFilter === 'conference') typeMatch = a.venueType === 'Conference';

      return yearMatch && typeMatch;
    });

  } catch (error: any) {
    // Rethrow abort errors so UI can handle them
    if (error.name === 'AbortError') throw error;

    console.error("Failed to fetch DBLP data", error);
    throw new Error(error.message || "Failed to fetch data from DBLP service.");
  }
};

export const generateBibTeX = (article: Article): string => {
  const type = article.venueType === 'Journal' ? 'article' : 'inproceedings';
  const key = article.key?.split('/').pop() || `dblp_${Math.floor(Math.random() * 10000)}`;
  const authorText = article.authors.join(' and ');
  
  return `@${type}{${key},
  author    = {${authorText}},
  title     = {${article.title}},
  booktitle = {${article.venue}},
  year      = {${article.year}},
  ${article.doi ? `doi       = {${article.doi}},` : ''}
  bibsource = {dblp computer science bibliography, https://dblp.org}
}`;
};