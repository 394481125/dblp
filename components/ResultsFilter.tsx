import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FilterConfig } from '../types';

interface ResultsFilterProps {
  filters: FilterConfig;
  onFilterChange: (newFilters: FilterConfig) => void;
  resultCount: number;
  totalCount: number;
}

const ResultsFilter: React.FC<ResultsFilterProps> = ({ filters, onFilterChange, resultCount, totalCount }) => {
  
  const updateFilter = (key: keyof FilterConfig, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({ keyword: '', venue: '' });
  };

  const hasActiveFilters = filters.keyword || filters.venue;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Filter size={16} className="text-dblp-600" />
          Refine Results
        </h3>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* Title/Author Filter */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Filter by Title, Author..."
            value={filters.keyword}
            onChange={(e) => updateFilter('keyword', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-dblp-500 focus:border-dblp-500 outline-none transition-all"
          />
        </div>

        {/* Venue Filter */}
        <div className="flex-1 relative">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Filter by Venue name (e.g. CVPR)..."
            value={filters.venue}
            onChange={(e) => updateFilter('venue', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-dblp-500 focus:border-dblp-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 flex justify-between items-center border-t border-slate-50 pt-2">
        <span>Showing <strong>{resultCount}</strong> of <strong>{totalCount}</strong> articles</span>
        {hasActiveFilters && <span className="text-dblp-600 font-medium">Filters Active</span>}
      </div>
    </div>
  );
};

export default ResultsFilter;