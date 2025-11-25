export interface DBLPAuthor {
  text: string;
  pid?: string;
}

export interface Article {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  venueType: 'Journal' | 'Conference' | 'Editorship' | 'Unknown';
  year: string;
  type: string;
  doi?: string;
  url?: string;
  key?: string; // DBLP key e.g., "journals/corr/abs-2001-00001"
  selected?: boolean; // For UI selection state
}

export interface SearchParams {
  mode: 'keyword' | 'url';
  query: string;
  yearStart?: string;
  yearEnd?: string;
  typeFilter: 'all' | 'journal' | 'conference';
  maxResults: number;
}

export interface FetchStats {
  totalFound: number;
  fetchedCount: number;
  status: 'idle' | 'loading' | 'completed' | 'error';
  errorMsg?: string;
}

export interface FilterConfig {
  keyword: string; // Title or Author
  venue: string;   // Venue name specific filtering
}

export type DisplayDensity = 'standard' | 'compact' | 'minimal';

// --- New Types for Analytics ---

export interface KeywordData {
  text: string;
  value: number;
}

export interface KeywordTrend {
  year: string;
  [keyword: string]: number | string;
}

export interface AuthorNode {
  id: string;
  name: string;
  count: number;
}

export interface AuthorLink {
  source: string;
  target: string;
  value: number; // strength of collaboration
}

export interface NetworkData {
  nodes: AuthorNode[];
  links: AuthorLink[];
}

export interface SimilarityResult {
  article: Article;
  score: number; // 0 to 1
  sharedTerms: string[];
}