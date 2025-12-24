import { useState, useEffect } from 'react';
import { fetchLeaderboard, fetchUserTrades } from '../services/hyperliquid';
import { Trader, TradeStats } from '../types';
import { formatNumber, truncateAddress, copyToClipboard } from '../utils/helpers';
import { cn } from '../utils/cn';

interface TradeStatisticsProps {
  onSelectWallet?: (address: string) => void;
}

interface ExtendedTradeStats extends TradeStats {
  trader?: Trader;
}

export default function TradeStatistics({ onSelectWallet }: TradeStatisticsProps) {
  const [tradeStats, setTradeStats] = useState<Map<string, ExtendedTradeStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mostTrades' | 'highestVolume' | 'bestWinRate'>('mostTrades');
  const [selectedTraders, setSelectedTraders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const leaderboardData = await fetchLeaderboard(100);

      // Load trade stats for top traders
      const statsMap = new Map<string, ExtendedTradeStats>();
      const addressesToFetch = leaderboardData.slice(0, 30).map(t => t.address);
      
      for (const address of addressesToFetch) {
        const stats = await fetchUserTrades(address);
        const trader = leaderboardData.find(t => t.address === address);
        statsMap.set(address, { ...stats, trader });
      }
      
      setTradeStats(statsMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedByMostTrades = Array.from(tradeStats.values())
    .sort((a, b) => b.totalTrades - a.totalTrades)
    .slice(0, 20);

  const sortedByHighestVolume = Array.from(tradeStats.values())
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 20);

  const sortedByWinRate = Array.from(tradeStats.values())
    .filter(s => s.totalTrades >= 10)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 20);

  const sortedByBestPnl = Array.from(tradeStats.values())
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, 20);

  const getCurrentData = () => {
    switch (activeTab) {
      case 'mostTrades': return sortedByMostTrades;
      case 'highestVolume': return sortedByHighestVolume;
      case 'bestWinRate': return sortedByWinRate;
      default: return sortedByMostTrades;
    }
  };

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

  const selectAllVisible = () => {
    const currentData = getCurrentData();
    const newSelected = new Set(selectedTraders);
    currentData.forEach(item => {
      newSelected.add(item.address);
      onSelectWallet?.(item.address);
    });
    setSelectedTraders(newSelected);
  };

  const currentData = getCurrentData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">📊 Trade Statistics</h2>
        <button
          onClick={loadData}
          disabled={loading}
          className={cn(
            "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-2 px-4 rounded-lg transition-all",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total Traders</div>
          <div className="text-2xl font-bold text-cyan-400">{tradeStats.size}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Selected</div>
          <div className="text-2xl font-bold text-purple-400">{selectedTraders.size}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total Trades</div>
          <div className="text-2xl font-bold text-green-400">
            {Array.from(tradeStats.values()).reduce((sum, s) => sum + s.totalTrades, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total Volume</div>
          <div className="text-2xl font-bold text-pink-400">
            {formatNumber(Array.from(tradeStats.values()).reduce((sum, s) => sum + s.totalVolume, 0))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        <div className="border-b border-slate-700/50">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {[
              { id: 'mostTrades', label: '📈 Most Trades', icon: '📈' },
              { id: 'highestVolume', label: '💰 Highest Volume', icon: '💰' },
              { id: 'bestWinRate', label: '🎯 Best Win Rate', icon: '🎯' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-slate-400 text-sm">
              Showing top 20 by {activeTab === 'mostTrades' ? 'number of trades' : activeTab === 'highestVolume' ? 'trading volume' : 'win rate'}
            </div>
            <button
              onClick={selectAllVisible}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Select All Visible
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 text-sm">
                    <th className="p-3 text-right w-12">Rank</th>
                    <th className="p-3 text-right">Wallet</th>
                    <th className="p-3 text-right">
                      {activeTab === 'mostTrades' ? 'Total Trades' : 
                       activeTab === 'highestVolume' ? 'Total Volume' : 'Win Rate'}
                    </th>
                    <th className="p-3 text-right">Total PnL</th>
                    <th className="p-3 text-right">Avg Trade</th>
                    <th className="p-3 text-right">Last Trade</th>
                    <th className="p-3 text-center w-16">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((stats, index) => (
                    <tr 
                      key={stats.address}
                      className={cn(
                        "border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors",
                        selectedTraders.has(stats.address) && "bg-green-500/10"
                      )}
                    >
                      <td className="p-3">
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                          index === 0 && "bg-yellow-500/20 text-yellow-400",
                          index === 1 && "bg-slate-400/20 text-slate-300",
                          index === 2 && "bg-amber-600/20 text-amber-500",
                          index > 2 && "bg-slate-700/50 text-slate-400"
                        )}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(stats.address)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <span className="font-mono text-sm text-cyan-400">
                            {truncateAddress(stats.address)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {activeTab === 'mostTrades' ? (
                          <span className="text-white font-semibold">{stats.totalTrades.toLocaleString()}</span>
                        ) : activeTab === 'highestVolume' ? (
                          <span className="text-green-400 font-semibold">{formatNumber(stats.totalVolume)}</span>
                        ) : (
                          <span className="text-purple-400 font-semibold">{stats.winRate.toFixed(1)}%</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "font-semibold",
                          stats.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {formatNumber(stats.totalPnl)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {formatNumber(stats.avgTradeSize)}
                      </td>
                      <td className="p-3 text-slate-400 text-sm">
                        {new Date(stats.lastTradeTime).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedTraders.has(stats.address)}
                          onChange={() => toggleSelectTrader(stats.address)}
                          className="w-5 h-5 rounded cursor-pointer accent-green-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Additional Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 Top 5 by PnL</h3>
          <div className="space-y-3">
            {sortedByBestPnl.slice(0, 5).map((stats, index) => (
              <div key={stats.address} className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 && "bg-yellow-500/20 text-yellow-400",
                  index === 1 && "bg-slate-400/20 text-slate-300",
                  index === 2 && "bg-amber-600/20 text-amber-500",
                  "bg-slate-700/50 text-slate-400"
                )}>
                  {index + 1}
                </span>
                <span className="font-mono text-sm text-cyan-400 flex-1 truncate">
                  {truncateAddress(stats.address)}
                </span>
                <span className={cn(
                  "font-semibold",
                  stats.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatNumber(stats.totalPnl)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Performance Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-sm">Avg Win Rate</div>
              <div className="text-2xl font-bold text-green-400">
                {(Array.from(tradeStats.values()).reduce((sum, s) => sum + s.winRate, 0) / tradeStats.size || 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-sm">Avg Trades/Wallet</div>
              <div className="text-2xl font-bold text-cyan-400">
                {(Array.from(tradeStats.values()).reduce((sum, s) => sum + s.totalTrades, 0) / tradeStats.size || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-sm">Profitable Wallets</div>
              <div className="text-2xl font-bold text-green-400">
                {Array.from(tradeStats.values()).filter(s => s.totalPnl > 0).length}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-slate-400 text-sm">Losing Wallets</div>
              <div className="text-2xl font-bold text-red-400">
                {Array.from(tradeStats.values()).filter(s => s.totalPnl < 0).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
