import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../services/hyperliquid';
import { Trader } from '../types';
import { formatNumber, truncateAddress, copyToClipboard } from '../utils/helpers';
import { cn } from '../utils/cn';

interface TopTradersProps {
  onSelectWallet?: (address: string) => void;
}

export default function TopTraders({ onSelectWallet }: TopTradersProps) {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTraders, setSelectedTraders] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'profitable' | 'volume'>('all');
  const [sortBy, setSortBy] = useState<'pnl' | 'volume' | 'pnlRatio'>('pnl');
  const [minPnl, setMinPnl] = useState<number>(0);
  const [maxResults, setMaxResults] = useState<number>(50);

  const loadTraders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(maxResults);
      let filtered = data;
      
      if (filterType === 'profitable') {
        filtered = filtered.filter(t => t.pnl > 0);
      } else if (filterType === 'volume') {
        filtered = filtered.filter(t => t.volume > 1000000);
      }
      
      filtered = filtered.filter(t => t.pnl >= minPnl);
      filtered = [...filtered].sort((a, b) => {
        if (sortBy === 'pnl') return b.pnl - a.pnl;
        if (sortBy === 'volume') return b.volume - a.volume;
        return b.pnlRatio - a.pnlRatio;
      });
      
      setTraders(filtered.slice(0, maxResults));
    } catch (err) {
      setError('Error loading traders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraders();
  }, []);

  const toggleSelectTrader = (address: string) => {
    const newSelected = new Set(selectedTraders);
    if (newSelected.has(address)) {
      newSelected.delete(address);
    } else {
      newSelected.add(address);
      onSelectWallet?.(address);
    }
    setSelectedTraders(newSelected);
  };

  const selectAll = () => {
    setSelectedTraders(new Set(traders.map(t => t.address)));
    traders.forEach(t => onSelectWallet?.(t.address));
  };

  const deselectAll = () => {
    setSelectedTraders(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🏆 Top Traders</h2>
        <button
          onClick={loadTraders}
          disabled={loading}
          className={cn(
            "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-2 px-4 rounded-lg transition-all",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total Traders</div>
          <div className="text-2xl font-bold text-cyan-400">{traders.length}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Selected</div>
          <div className="text-2xl font-bold text-purple-400">{selectedTraders.size}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total PnL</div>
          <div className="text-2xl font-bold text-green-400">
            {formatNumber(traders.reduce((sum, t) => sum + t.pnl, 0))}
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total Volume</div>
          <div className="text-2xl font-bold text-pink-400">
            {formatNumber(traders.reduce((sum, t) => sum + t.volume, 0))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Filter Type</label>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'profitable' | 'volume')}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Traders</option>
              <option value="profitable">Profitable Only</option>
              <option value="volume">High Volume</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Sort By</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'pnl' | 'volume' | 'pnlRatio')}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="pnl">Profit (PnL)</option>
              <option value="volume">Trading Volume</option>
              <option value="pnlRatio">Profit Ratio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Min PnL ($)</label>
            <input 
              type="number" 
              value={minPnl}
              onChange={(e) => setMinPnl(Number(e.target.value))}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Max Results</label>
            <input 
              type="number" 
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              min="1"
              max="200"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={loadTraders}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-2 px-4 rounded-lg transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button 
          onClick={selectAll}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Select All
        </button>
        <button 
          onClick={deselectAll}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Deselect All
        </button>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700/50 text-slate-300">
                <th className="p-4 text-right w-16">
                  <input 
                    type="checkbox"
                    checked={selectedTraders.size === traders.length && traders.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) selectAll();
                      else deselectAll();
                    }}
                    className="w-5 h-5 rounded cursor-pointer accent-purple-500"
                  />
                </th>
                <th className="p-4 text-right w-16">Rank</th>
                <th className="p-4 text-right">Wallet Address</th>
                <th className="p-4 text-right">Profit (PnL)</th>
                <th className="p-4 text-right">Volume</th>
                <th className="p-4 text-right">Ratio</th>
                <th className="p-4 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading data...
                    </div>
                  </td>
                </tr>
              ) : traders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No traders found
                  </td>
                </tr>
              ) : (
                traders.map((trader, index) => (
                  <tr 
                    key={trader.address}
                    className={cn(
                      "border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors",
                      selectedTraders.has(trader.address) && "bg-purple-500/10"
                    )}
                  >
                    <td className="p-4">
                      <input 
                        type="checkbox"
                        checked={selectedTraders.has(trader.address)}
                        onChange={() => toggleSelectTrader(trader.address)}
                        className="w-5 h-5 rounded cursor-pointer accent-purple-500"
                      />
                    </td>
                    <td className="p-4">
                      <span 
                        className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                          index === 0 && "bg-yellow-500/20 text-yellow-400",
                          index === 1 && "bg-slate-400/20 text-slate-300",
                          index === 2 && "bg-amber-600/20 text-amber-500",
                          index > 2 && "bg-slate-700/50 text-slate-400"
                        )}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(trader.address)}
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Click to copy"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <span 
                          className="font-mono text-sm text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                          onClick={() => copyToClipboard(trader.address)}
                        >
                          {truncateAddress(trader.address)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "font-semibold",
                        trader.pnl >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {formatNumber(trader.pnl)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      {formatNumber(trader.volume)}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "font-semibold",
                        trader.pnlRatio >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {trader.pnlRatio >= 0 ? '+' : ''}{trader.pnlRatio.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(trader.lastActive).toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
