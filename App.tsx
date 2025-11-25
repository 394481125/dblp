import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SearchParams, Article, FetchStats, FilterConfig, DisplayDensity, SimilarityResult } from './types';
import { fetchDBLPData, generateBibTeX } from './services/dblpService';
import { findSimilarArticles, exportToCSV } from './services/analytics';
import SearchPanel from './components/SearchPanel';
import ArticleCard from './components/ArticleCard';
import StatsDashboard from './components/StatsDashboard'; // This is now the Analytics Dashboard
import ProgressBar from './components/ProgressBar';
import ResultsFilter from './components/ResultsFilter';
import { BookMarked, LayoutDashboard, Download, Trash2, History, AlertCircle, Filter, Grid, LayoutList, AlignJustify, Search, CheckSquare, FileSpreadsheet, X } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'search' | 'saved'>('search');
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);
  const [density, setDensity] = useState<DisplayDensity>('standard');
  
  // Progress State
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Post-fetch Filter State
  const [filters, setFilters] = useState<FilterConfig>({ keyword: '', venue: '' });

  // Modal State
  const [similarityModal, setSimilarityModal] = useState<{ isOpen: boolean; source?: Article; results: SimilarityResult[] }>({ isOpen: false, results: [] });

  // Abort Controller Ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Load saved articles from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dblp_saved_articles');
    if (saved) {
      setSavedArticles(JSON.parse(saved));
    }
  }, []);

  // Save articles to local storage on change
  useEffect(() => {
    localStorage.setItem('dblp_saved_articles', JSON.stringify(savedArticles));
  }, [savedArticles]);

  const handleSearch = async (params: SearchParams) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setLastParams(params);
    setArticles([]); // Clear previous
    setProgress({ current: 0, total: 0 }); // Reset progress
    setFilters({ keyword: '', venue: '' }); // Reset post-filters
    setCurrentView('search');

    try {
      const results = await fetchDBLPData(params, (current, total) => {
        setProgress({ current, total });
      }, controller.signal);
      
      setArticles(results);
      if (results.length === 0) {
        setError('No articles found matching your criteria. Try broadening your search terms or year range.');
      }
    } catch (err: any) {
      // Ignore abort errors (user cancelled or new search started)
      if (err.name === 'AbortError') {
        console.log('Request cancelled by user');
        return;
      }

      console.error(err);
      let msg = err.message || 'An unexpected error occurred while crawling DBLP.';
      // Provide a more helpful message for network errors (Failed to fetch)
      if (msg.includes('Failed') || msg.includes('fetch')) {
        msg = 'Unable to connect to DBLP API. This may be due to a network issue, ad-blocker, or the API is temporarily unavailable. Please check your connection.';
      }
      setError(msg);
      setLoading(false); // Ensure loading stops on error
    } finally {
      // Only turn off loading if this was the active request (not aborted)
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  const handleToggleSavedSelect = (id: string) => {
    setSavedArticles(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  const toggleBookmark = (article: Article) => {
    if (savedArticles.some(a => a.id === article.id)) {
      setSavedArticles(prev => prev.filter(a => a.id !== article.id));
    } else {
      setSavedArticles(prev => [...prev, { ...article, selected: false }]);
    }
  };

  const handleFindSimilar = (article: Article) => {
    // Search within all currently loaded articles
    const results = findSimilarArticles(article, articles);
    setSimilarityModal({
      isOpen: true,
      source: article,
      results
    });
  };

  const handleBulkExportBibTex = () => {
    const targetList = currentView === 'search' ? articles : savedArticles;
    const selected = targetList.filter(a => a.selected);
    
    if (selected.length === 0) {
      alert('Please select at least one article to export.');
      return;
    }

    const bibtexContent = selected.map(a => generateBibTeX(a)).join('\n\n');
    const blob = new Blob([bibtexContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dblp_export_${new Date().toISOString().slice(0, 10)}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkExportCSV = () => {
    const targetList = currentView === 'search' ? articles : savedArticles;
    const selected = targetList.filter(a => a.selected);
    
    if (selected.length === 0) {
      alert('Please select at least one article to export.');
      return;
    }
    exportToCSV(selected);
  };

  const activeRawList = currentView === 'search' ? articles : savedArticles;
  const toggleSelectHandler = currentView === 'search' ? handleToggleSelect : handleToggleSavedSelect;

  // Apply Advanced Filters
  const filteredArticles = useMemo(() => {
    return activeRawList.filter(article => {
      const keywordMatch = !filters.keyword || 
        article.title.toLowerCase().includes(filters.keyword.toLowerCase()) || 
        article.authors.some(a => a.toLowerCase().includes(filters.keyword.toLowerCase()));
      
      const venueMatch = !filters.venue || 
        article.venue.toLowerCase().includes(filters.venue.toLowerCase());

      return keywordMatch && venueMatch;
    });
  }, [activeRawList, filters]);

  // Handle Select All based on currently filtered view
  const handleSelectAll = () => {
    const idsToSelect = new Set(filteredArticles.map(a => a.id));
    // If all currently filtered are selected, deselect them. Otherwise, select them.
    const allSelected = filteredArticles.every(a => a.selected);
    
    const updater = (prev: Article[]) => prev.map(a => {
      if (idsToSelect.has(a.id)) {
        return { ...a, selected: !allSelected };
      }
      return a;
    });

    if (currentView === 'search') setArticles(updater);
    else setSavedArticles(updater);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-dblp-600 p-2 rounded-lg">
              <BookMarked className="text-white h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">DBLP Scholar Crawler</h1>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentView('search')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                currentView === 'search' ? 'bg-slate-100 text-dblp-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard size={18} />
              Crawler
            </button>
            <button
              onClick={() => setCurrentView('saved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                currentView === 'saved' ? 'bg-slate-100 text-dblp-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History size={18} />
              Saved Collection
              {savedArticles.length > 0 && (
                <span className="bg-dblp-100 text-dblp-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {savedArticles.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {currentView === 'search' && (
          <SearchPanel onSearch={handleSearch} isLoading={loading} />
        )}

        {/* Loading State with Progress Bar */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
             <div className="w-16 h-16 border-4 border-dblp-100 border-t-dblp-600 rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-slate-600">Crawling DBLP database...</p>
            <ProgressBar current={progress.current} total={progress.total} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4 text-red-700 mb-8">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg">Aggregation Failed</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Post-fetch Tools (Stats & Filters) - Only show if we have data */}
        {!loading && activeRawList.length > 0 && (
          <>
            <StatsDashboard articles={filteredArticles} />
            <ResultsFilter 
              filters={filters} 
              onFilterChange={setFilters} 
              resultCount={filteredArticles.length}
              totalCount={activeRawList.length}
            />
          </>
        )}

        {/* Results Header */}
        <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {currentView === 'search' 
                ? (loading ? 'Aggregating Data...' : `Search Results`) 
                : `My Collection`}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {currentView === 'search' 
                 ? "Select articles to export or save to your collection." 
                 : "Manage your curated list of literature."}
            </p>
          </div>

          {activeRawList.length > 0 && !loading && (
            <div className="flex flex-wrap gap-3 justify-end items-center">
              
              {/* Select All */}
               <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                  title="Select All visible"
                >
                  <CheckSquare size={18} />
                  Select All
                </button>

              {/* Density Toggle */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 h-10 shadow-sm">
                <button
                  onClick={() => setDensity('standard')}
                  title="Standard View"
                  className={`p-1.5 rounded-md transition-colors ${
                    density === 'standard' ? 'bg-slate-100 text-dblp-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Grid size={18} />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setDensity('compact')}
                  title="Compact View"
                  className={`p-1.5 rounded-md transition-colors ${
                    density === 'compact' ? 'bg-slate-100 text-dblp-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <LayoutList size={18} />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setDensity('minimal')}
                  title="Very Compact View"
                  className={`p-1.5 rounded-md transition-colors ${
                    density === 'minimal' ? 'bg-slate-100 text-dblp-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <AlignJustify size={18} />
                </button>
              </div>

              {currentView === 'saved' && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all saved articles?')) {
                      setSavedArticles([]);
                    }
                  }}
                  className="p-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                  title="Clear All Saved"
                >
                  <Trash2 size={18} />
                </button>
              )}
              
               {/* Export Actions */}
              <div className="flex gap-2">
                 <button
                  onClick={handleBulkExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow"
                >
                  <FileSpreadsheet size={18} />
                  CSV
                </button>
                <button
                  onClick={handleBulkExportBibTex}
                  className="flex items-center gap-2 px-4 py-2 bg-dblp-600 text-white rounded-lg text-sm font-medium hover:bg-dblp-700 transition-colors shadow-sm hover:shadow"
                >
                  <Download size={18} />
                  BibTeX
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Articles Grid */}
        <div className="space-y-4">
          {filteredArticles.length > 0 ? (
             filteredArticles.map(article => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                onToggleSelect={toggleSelectHandler}
                onBookmark={toggleBookmark}
                onFindSimilar={currentView === 'search' ? handleFindSimilar : undefined}
                isBookmarked={savedArticles.some(a => a.id === article.id)}
                density={density}
              />
            ))
          ) : (
            !loading && !error && (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                  <Search className="text-slate-400 w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No articles found</h3>
                <p className="text-slate-500 mt-1">
                  {activeRawList.length > 0 
                    ? "Adjust your filters to see results." 
                    : "Start a search or load your saved collection."}
                </p>
              </div>
            )
          )}
        </div>

      </main>

      {/* Similar Articles Modal */}
      {similarityModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Similar Research</h3>
                <p className="text-xs text-slate-500 truncate max-w-md">Based on: {similarityModal.source?.title}</p>
              </div>
              <button 
                onClick={() => setSimilarityModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {similarityModal.results.length > 0 ? (
                similarityModal.results.map((res, idx) => (
                  <div key={res.article.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-dblp-300 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-dblp-600 bg-dblp-50 px-2 py-0.5 rounded-full">
                        {Math.round(res.score * 100)}% Match
                      </span>
                      <span className="text-xs text-slate-400">{res.article.year}</span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">{res.article.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{res.article.authors.join(', ')}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {res.sharedTerms.slice(0, 5).map(term => (
                        <span key={term} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  No similar articles found in the current dataset.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setSimilarityModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;