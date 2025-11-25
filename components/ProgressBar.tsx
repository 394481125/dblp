import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
        <span>Fetching records...</span>
        <span>{current} / {total > 0 ? total : '?'}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-dblp-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-2">
        Processing batches from DBLP... {percentage}%
      </p>
    </div>
  );
};

export default ProgressBar;