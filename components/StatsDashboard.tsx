import React, { useMemo, useState } from 'react';
import { Article } from '../types';
import { extractKeywords, generateTrends, generateAuthorNetwork, generateCorrelationHeatmap } from '../services/analytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { BarChart3, TrendingUp, Network, Grid3X3 } from 'lucide-react';

interface StatsDashboardProps {
  articles: Article[];
}

const COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#f43f5e', '#eab308'];

const StatsDashboard: React.FC<StatsDashboardProps> = ({ articles }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'network' | 'correlations'>('overview');

  // --- Data Preparation ---
  const { yearData, typeData } = useMemo(() => {
    const yCounts: Record<string, number> = {};
    const tCounts: Record<string, number> = {};
    articles.forEach(a => {
      yCounts[a.year] = (yCounts[a.year] || 0) + 1;
      tCounts[a.venueType] = (tCounts[a.venueType] || 0) + 1;
    });
    return {
      yearData: Object.entries(yCounts).map(([year, count]) => ({ year, count })).sort((a, b) => parseInt(a.year) - parseInt(b.year)),
      typeData: Object.entries(tCounts).map(([name, value]) => ({ name, value }))
    };
  }, [articles]);

  const { keywordData, trendData, topKeywords } = useMemo(() => {
    const kws = extractKeywords(articles, 40);
    const top5 = kws.slice(0, 5).map(k => k.text);
    const trends = generateTrends(articles, top5);
    return { keywordData: kws, trendData: trends, topKeywords: kws.map(k => k.text) };
  }, [articles]);

  const networkData = useMemo(() => generateAuthorNetwork(articles, 25), [articles]);
  
  const heatmapData = useMemo(() => generateCorrelationHeatmap(articles, topKeywords), [articles, topKeywords]);

  // --- Render Functions ---

  const renderWordCloud = () => (
    <div className="flex flex-wrap gap-3 justify-center p-6 h-80 overflow-y-auto content-start">
      {keywordData.map((kw, idx) => {
        // Calculate dynamic font size between 0.75rem and 2.5rem
        const maxVal = keywordData[0]?.value || 1;
        const minVal = keywordData[keywordData.length - 1]?.value || 0;
        const normalized = (kw.value - minVal) / (maxVal - minVal || 1);
        const fontSize = 0.8 + normalized * 1.7; // rem
        const opacity = 0.6 + normalized * 0.4;
        
        return (
          <span 
            key={kw.text}
            className="font-bold text-slate-700 hover:text-dblp-600 transition-colors cursor-default"
            style={{ fontSize: `${fontSize}rem`, opacity }}
            title={`${kw.value} occurrences`}
          >
            {kw.text}
          </span>
        );
      })}
    </div>
  );

  const renderAuthorNetwork = () => {
    // Simple Circular Layout SVG
    const width = 600;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 140;

    const nodes = networkData.nodes;
    const nodeCount = nodes.length;
    
    // Calculate positions
    const nodePositions = nodes.map((node, i) => {
      const angle = (i / nodeCount) * 2 * Math.PI;
      return {
        ...node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        r: Math.max(4, Math.min(15, node.count * 1.5)) // radius based on papers
      };
    });

    const posMap = new Map<string, typeof nodePositions[0]>(nodePositions.map(n => [n.id, n]));

    return (
      <div className="flex items-center justify-center h-80 overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
           <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="20" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#cbd5e1" />
            </marker>
          </defs>
          {/* Links */}
          {networkData.links.map((link, i) => {
            const source = posMap.get(link.source);
            const target = posMap.get(link.target);
            if (!source || !target) return null;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#cbd5e1"
                strokeWidth={Math.min(3, link.value)}
                opacity={0.6}
              />
            );
          })}
          {/* Nodes */}
          {nodePositions.map((node, i) => (
            <g key={i}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill="#0ea5e9"
                stroke="white"
                strokeWidth={2}
                className="hover:fill-dblp-700 transition-colors cursor-pointer"
              >
                <title>{node.name}: {node.count} papers</title>
              </circle>
              <text
                x={node.x}
                y={node.y - node.r - 5}
                textAnchor="middle"
                fontSize="10"
                fill="#475569"
                className="pointer-events-none font-medium bg-white"
                style={{textShadow: "0px 0px 4px white"}}
              >
                {node.name.split(' ').pop()} 
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (articles.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-dblp-600 border-t-2 border-t-dblp-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart3 size={16} /> Overview
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'keywords' ? 'bg-white text-dblp-600 border-t-2 border-t-dblp-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp size={16} /> Trends & Keywords
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'network' ? 'bg-white text-dblp-600 border-t-2 border-t-dblp-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Network size={16} /> Author Network
        </button>
        <button
          onClick={() => setActiveTab('correlations')}
          className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'correlations' ? 'bg-white text-dblp-600 border-t-2 border-t-dblp-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Grid3X3 size={16} /> Correlations
        </button>
      </div>

      <div className="p-6">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64">
              <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Publications by Year</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Publication Types</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Keywords & Trends */}
        {activeTab === 'keywords' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">High Frequency Topics</h4>
              <div className="bg-slate-50 rounded-lg border border-slate-100">
                {renderWordCloud()}
              </div>
            </div>
            <div className="h-80">
              <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Topic Trends (Top 5)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  {Object.keys(trendData[0] || {}).filter(k => k !== 'year').map((k, i) => (
                    <Line 
                      key={k} 
                      type="monotone" 
                      dataKey={k} 
                      stroke={COLORS[i % COLORS.length]} 
                      strokeWidth={2} 
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: Author Network */}
        {activeTab === 'network' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase">Top 20 Authors Collaboration Network</h4>
              <span className="text-xs text-slate-400">Node size = Papers count, Link = Co-authorship</span>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-100">
              {renderAuthorNetwork()}
            </div>
          </div>
        )}

        {/* Tab 4: Correlations */}
        {activeTab === 'correlations' && (
          <div>
             <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Keyword Co-occurrence Heatmap</h4>
             <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid />
                  <XAxis type="category" dataKey="x" name="Keyword 1" allowDuplicatedCategory={false} fontSize={10} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis type="category" dataKey="y" name="Keyword 2" allowDuplicatedCategory={false} fontSize={10} width={80} />
                  <ZAxis type="number" dataKey="value" range={[50, 400]} name="Count" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={heatmapData} fill="#8b5cf6" shape="circle" />
                </ScatterChart>
              </ResponsiveContainer>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StatsDashboard;