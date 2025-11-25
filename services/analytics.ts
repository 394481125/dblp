import { Article, KeywordData, KeywordTrend, NetworkData, SimilarityResult, AuthorLink } from '../types';

// Common academic/English stopwords to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
  'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'which', 'who', 
  'what', 'when', 'where', 'how', 'why', 'based', 'using', 'via', 'through', 'approach', 'method',
  'system', 'analysis', 'survey', 'review', 'study', 'towards', 'new', 'novel', 'application',
  'performance', 'evaluation', 'data', 'model', 'algorithm', 'network', 'networks', 'learning',
  'problem', 'problems', 'efficient', 'multi', 'large', 'scale', 'real', 'time', 'under', 'during',
  'between', 'among', 'proposed', 'framework', 'architecture'
]);

// Helper: Clean and tokenize text
const tokenize = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
};

export const extractKeywords = (articles: Article[], limit = 50): KeywordData[] => {
  const counts: Record<string, number> = {};
  
  articles.forEach(article => {
    const tokens = tokenize(article.title);
    tokens.forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

export const generateTrends = (articles: Article[], topKeywords: string[]): KeywordTrend[] => {
  const years = Array.from(new Set(articles.map(a => a.year))).sort();
  
  return years.map(year => {
    const yearArticles = articles.filter(a => a.year === year);
    const entry: KeywordTrend = { year };
    
    topKeywords.forEach(kw => {
      let count = 0;
      yearArticles.forEach(a => {
        if (tokenize(a.title).includes(kw)) count++;
      });
      entry[kw] = count;
    });
    return entry;
  });
};

export const generateAuthorNetwork = (articles: Article[], topN = 20): NetworkData => {
  const authorCounts: Record<string, number> = {};
  const pairs: Record<string, number> = {};

  // 1. Count individual authors
  articles.forEach(a => {
    a.authors.forEach(auth => {
      authorCounts[auth] = (authorCounts[auth] || 0) + 1;
    });

    // 2. Count pairs (Collaboration)
    for (let i = 0; i < a.authors.length; i++) {
      for (let j = i + 1; j < a.authors.length; j++) {
        const p = [a.authors[i], a.authors[j]].sort().join('|||');
        pairs[p] = (pairs[p] || 0) + 1;
      }
    }
  });

  // Filter top N authors
  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ id: name, name, count }));

  const topAuthorNames = new Set(topAuthors.map(a => a.name));

  // Filter links between top authors only
  const links: AuthorLink[] = [];
  Object.entries(pairs).forEach(([key, value]) => {
    const [source, target] = key.split('|||');
    if (topAuthorNames.has(source) && topAuthorNames.has(target)) {
      links.push({ source, target, value });
    }
  });

  return { nodes: topAuthors, links };
};

export const generateCorrelationHeatmap = (articles: Article[], topKeywords: string[]): { x: string, y: string, value: number }[] => {
  // Take top 10 keywords for matrix
  const matrixKeys = topKeywords.slice(0, 10);
  const data: { x: string, y: string, value: number }[] = [];

  for (let i = 0; i < matrixKeys.length; i++) {
    for (let j = 0; j < matrixKeys.length; j++) {
      const k1 = matrixKeys[i];
      const k2 = matrixKeys[j];
      
      let count = 0;
      articles.forEach(a => {
        const tokens = tokenize(a.title);
        if (tokens.includes(k1) && tokens.includes(k2)) {
          count++;
        }
      });
      
      // Don't include self-correlation or 0
      if (count > 0) {
        data.push({ x: k1, y: k2, value: count });
      }
    }
  }
  return data;
};

export const findSimilarArticles = (target: Article, allArticles: Article[], limit = 5): SimilarityResult[] => {
  const targetTokens = new Set(tokenize(target.title));
  
  const results = allArticles
    .filter(a => a.id !== target.id) // Exclude self
    .map(article => {
      const articleTokens = tokenize(article.title);
      // Jaccard Similarityish (Intersection count for now is better for short titles)
      const intersection = articleTokens.filter(t => targetTokens.has(t));
      
      const score = intersection.length / (Math.sqrt(targetTokens.size * articleTokens.length) || 1);
      
      return {
        article,
        score,
        sharedTerms: intersection
      };
    })
    .filter(r => r.score > 0.1) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
};

export const exportToCSV = (articles: Article[]): void => {
  const headers = ['ID', 'Title', 'Authors', 'Venue', 'Type', 'Year', 'DOI', 'DBLP Key'];
  
  const rows = articles.map(a => [
    `"${a.id}"`,
    `"${a.title.replace(/"/g, '""')}"`, // Escape quotes
    `"${a.authors.join('; ')}"`,
    `"${a.venue}"`,
    `"${a.venueType}"`,
    `"${a.year}"`,
    `"${a.doi || ''}"`,
    `"${a.key || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dblp_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};