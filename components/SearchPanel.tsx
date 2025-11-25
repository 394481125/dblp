import React, { useState } from 'react';
import { Search, Globe, Filter, Calendar, ListFilter } from 'lucide-react';
import { SearchParams } from '../types';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

const PRESETS = [
  { name: 'CVPR', url: 'https://dblp.org/db/conf/cvpr/' },
  { name: 'ICCV', url: 'https://dblp.org/db/conf/iccv/' },
  { name: 'ECCV', url: 'https://dblp.org/db/conf/eccv/' },
  { name: 'MICCAI', url: 'https://dblp.org/db/conf/miccai/' },
  { name: 'NeurIPS', url: 'https://dblp.org/db/conf/nips/' },
  { name: 'ICML', url: 'https://dblp.org/db/conf/icml/' },
  { name: 'TPAMI', url: 'https://dblp.org/db/journals/tpami/' },
  { name: 'IJCV', url: 'https://dblp.org/db/journals/ijcv/' },
  { name: 'TMI', url: 'https://dblp.org/db/journals/tmi/' },
  { name: 'MedIA', url: 'https://dblp.org/db/journals/media/' },
  { name: 'TNNLS', url: 'https://dblp.org/db/journals/tnnls/' },
];

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, isLoading }) => {
  const [mode, setMode] = useState<'keyword' | 'url'>('keyword');
  const [query, setQuery] = useState('');
  const [yearStart, setYearStart] = useState<string>('2020');
  const [yearEnd, setYearEnd] = useState<string>('2025');
  const [typeFilter, setTypeFilter] = useState<'all' | 'journal' | 'conference'>('all');
  const [maxResults, setMaxResults] = useState(10000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      mode,
      query,
      yearStart,
      yearEnd,
      typeFilter,
      maxResults
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex gap-4 mb-6 border-b border-slate-100 pb-4">
        <button
          onClick={() => setMode('keyword')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'keyword' 
              ? 'bg-dblp-50 text-dblp-700 ring-1 ring-dblp-200' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Search size={18} />
          Keyword Search
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'url' 
              ? 'bg-dblp-50 text-dblp-700 ring-1 ring-dblp-200' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Globe size={18} />
          Exact Journal/Conf URL
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {mode === 'keyword' ? 'Search Terms' : 'DBLP URL (e.g., dblp.org/db/journals/tnnls/)'}
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'keyword' ? "e.g., Large Language Models Medical" : "https://dblp.org/db/journals/tnnls/"}
              className="w-full pl-4 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-dblp-500 focus:border-dblp-500 transition-all outline-none"
            />
          </div>
          
          {mode === 'url' && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Presets (AI/BioMed):</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setQuery(p.url)}
                    className="px-3 py-1 bg-slate-50 hover:bg-dblp-100 text-slate-600 hover:text-dblp-700 text-xs rounded-full border border-slate-200 hover:border-dblp-200 transition-colors font-medium"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Year Filter */}
          <div className="md:col-span-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar size={16} /> Year Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-dblp-500 outline-none"
                placeholder="Start"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-dblp-500 outline-none"
                placeholder="End"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-4">
             <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Filter size={16} /> Venue Type
            </label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-dblp-500 outline-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="journal">Journals Only</option>
              <option value="conference">Conferences Only</option>
            </select>
          </div>

           {/* Limit */}
           <div className="md:col-span-4">
             <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <ListFilter size={16} /> Max Results
            </label>
            <select 
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-dblp-500 outline-none bg-white"
            >
              <option value="10000">Show All (Up to 10k)</option>
              <option value="20">20 items</option>
              <option value="50">50 items</option>
              <option value="100">100 items</option>
              <option value="500">500 items</option>
              <option value="1000">1000 items</option>
              <option value="1500">1500 items</option>
              <option value="2000">2000 items</option>
              <option value="2500">2500 items</option>
              <option value="3000">3000 items</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-8 py-3 rounded-lg font-semibold text-white shadow-lg transition-all transform active:scale-95 ${
              isLoading 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-dblp-600 hover:bg-dblp-700 hover:shadow-xl'
            }`}
          >
            {isLoading ? 'Crawling DBLP...' : 'Start Aggregation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchPanel;