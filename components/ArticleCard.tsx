import React from 'react';
import { BookOpen, Users, Calendar, ExternalLink, Download, Bookmark, Check, Sparkles } from 'lucide-react';
import { Article, DisplayDensity } from '../types';
import { generateBibTeX } from '../services/dblpService';

interface ArticleCardProps {
  article: Article;
  onToggleSelect: (id: string) => void;
  onBookmark: (article: Article) => void;
  onFindSimilar?: (article: Article) => void;
  isBookmarked: boolean;
  density?: DisplayDensity;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  onToggleSelect, 
  onBookmark, 
  onFindSimilar,
  isBookmarked,
  density = 'standard' 
}) => {
  
  const handleDownloadBibTex = () => {
    const bibtex = generateBibTeX(article);
    const blob = new Blob([bibtex], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.key?.replace(/\//g, '_') || 'citation'}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Dynamic styles based on density
  const getStyles = () => {
    switch (density) {
      case 'minimal':
        return {
          container: 'p-3',
          titleSize: 'text-sm',
          metaGap: 'mb-1',
          rowGap: 'mb-1',
          iconSize: 12,
          buttonClass: 'px-2 py-0.5 text-[10px]',
          badgeClass: 'px-1.5 py-0 text-[10px]',
          checkboxSize: 'w-4 h-4'
        };
      case 'compact':
        return {
          container: 'p-4',
          titleSize: 'text-base',
          metaGap: 'mb-2',
          rowGap: 'mb-2',
          iconSize: 14,
          buttonClass: 'px-2.5 py-1 text-xs',
          badgeClass: 'px-2 py-0.5 text-xs',
          checkboxSize: 'w-4 h-4'
        };
      case 'standard':
      default:
        return {
          container: 'p-5',
          titleSize: 'text-lg',
          metaGap: 'mb-3',
          rowGap: 'mb-3',
          iconSize: 16,
          buttonClass: 'px-3 py-1.5 text-xs',
          badgeClass: 'px-2.5 py-0.5 text-xs',
          checkboxSize: 'w-5 h-5'
        };
    }
  };

  const s = getStyles();

  return (
    <div className={`group relative bg-white rounded-xl border transition-all duration-200 hover:shadow-lg ${
      article.selected ? 'border-dblp-500 ring-1 ring-dblp-500' : 'border-slate-200 hover:border-dblp-300'
    }`}>
      <div className={s.container}>
        {/* Top Meta Tags */}
        <div className={`flex justify-between items-start ${s.metaGap}`}>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full font-medium ${s.badgeClass} ${
              article.venueType === 'Journal' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {article.venueType}
            </span>
            <span className={`inline-flex items-center rounded-full font-medium bg-slate-100 text-slate-700 ${s.badgeClass}`}>
              <Calendar size={s.iconSize - 2} className="mr-1" />
              {article.year}
            </span>
          </div>
          <div className="flex gap-2">
             <input
              type="checkbox"
              checked={article.selected || false}
              onChange={() => onToggleSelect(article.id)}
              className={`${s.checkboxSize} text-dblp-600 rounded border-slate-300 focus:ring-dblp-500 cursor-pointer`}
            />
          </div>
        </div>

        {/* Title */}
        <h3 className={`${s.titleSize} font-bold text-slate-900 ${s.rowGap} leading-tight group-hover:text-dblp-700 transition-colors`}>
          {article.title}
        </h3>

        {/* Authors */}
        <div className={`flex items-start gap-2 text-slate-600 text-sm ${s.rowGap}`}>
          <Users size={s.iconSize} className="mt-0.5 shrink-0 text-slate-400" />
          <span className="line-clamp-2">{article.authors.join(', ')}</span>
        </div>

        {/* Venue */}
        <div className={`flex items-start gap-2 text-slate-600 text-sm ${s.rowGap === 'mb-1' ? 'mb-2' : 'mb-4'}`}>
          <BookOpen size={s.iconSize} className="mt-0.5 shrink-0 text-slate-400" />
          <span className="font-medium">{article.venue}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-auto">
          {article.doi ? (
            <a 
              href={`https://doi.org/${article.doi}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 font-medium text-dblp-700 bg-dblp-50 hover:bg-dblp-100 rounded-md transition-colors ${s.buttonClass}`}
            >
              <ExternalLink size={s.iconSize - 2} />
              DOI
            </a>
          ) : (
             <span className={`inline-flex items-center gap-1.5 font-medium text-slate-400 bg-slate-50 rounded-md cursor-not-allowed ${s.buttonClass}`}>
              <ExternalLink size={s.iconSize - 2} />
              No DOI
            </span>
          )}

          <button
            onClick={handleDownloadBibTex}
            className={`inline-flex items-center gap-1.5 font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-md transition-colors ${s.buttonClass}`}
          >
            <Download size={s.iconSize - 2} />
            BibTeX
          </button>

          {onFindSimilar && (
            <button
              onClick={() => onFindSimilar(article)}
              className={`inline-flex items-center gap-1.5 font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors ${s.buttonClass}`}
              title="Find similar articles"
            >
              <Sparkles size={s.iconSize - 2} />
              Similar
            </button>
          )}

          <button
            onClick={() => onBookmark(article)}
            className={`inline-flex items-center gap-1.5 font-medium rounded-md transition-colors ml-auto ${s.buttonClass} ${
              isBookmarked 
                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' 
                : 'text-slate-600 hover:text-dblp-600'
            }`}
          >
            {isBookmarked ? <Check size={s.iconSize - 2} /> : <Bookmark size={s.iconSize - 2} />}
            {isBookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;