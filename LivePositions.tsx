import { useState, useEffect, useCallback } from 'react';
import { fetchLeaderboard, fetchLivePositions } from '../services/hyperliquid';
import { LivePosition } from '../types';
import { formatNumber, truncateAddress, copyToClipboard, formatTime, formatTimeShort } from '../utils/helpers';
import { cn } from '../utils/cn';

interface LivePositionsProps {
  onSelectWallet?: (address: string) => void;
}

export default function LivePositions({ onSelectWallet }: LivePositionsProps) {
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [selectedTraders, setSelectedTraders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      // Get top traders addresses
      const traders = await fetchLeaderboard(50);
      const addresses = traders.map(t => t.address);

      const livePositions = await fetchLivePositions(addresses);
      setPositions(livePositions);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadPositions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, loadPositions]);

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

  const filteredPositions = positions.filter(pos => {
    if (activeTab === 'open') return pos.status === 'open';
    if (activeTab === 'closed') return pos.status === 'closed';
    return true;
  });

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status === 'closed');

  // Group positions by wallet
  const positionsByWallet = filteredPositions.reduce((acc, pos) => {
    if (!acc[pos.address]) {
      acc[pos.address] = [];
    }
    acc[pos.address].push(pos);
    return acc;
  }, {} as Record<string, LivePosition[]>);

  // Get unique wallets with their positions
  const walletsWithPositions = Object.entries(positionsByWallet).map(([address, pos]) => ({
    address,
    positions: pos,
    totalPnl: pos.reduce((sum, p) => sum + p.pnl, 0),
    openCount: pos.filter(p => p.status === 'open').length,
    closedCount: pos.filter(p => p.status === 'closed').length,
  })).sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl));

  const formatDuration = (startTime: number, endTime?: number): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">⚡ Live Positions</h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time position tracking with timestamps
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-slate-400">
            <input 
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded accent-orange-500"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={loadPositions}
            disabled={loading}
            className={cn(
              "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-all",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-orange-900/20 rounded-xl p-4 border border-orange-500/30 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-orange-400">Live tracking active</span>
        </div>
        <div className="text-slate-400 text-sm">
          Last update: {formatTimeShort(lastUpdate.getTime())}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Total Positions</div>
          <div className="text-2xl font-bold text-orange-400">{positions.length}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Open Positions</div>
          <div className="text-2xl font-bold text-green-400">{openPositions.length}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Closed Positions</div>
          <div className="text-2xl font-bold text-red-400">{closedPositions.length}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">Unique Wallets</div>
          <div className="text-2xl font-bold text-cyan-400">{walletsWithPositions.length}</div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        <div className="border-b border-slate-700/50">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {[
              { id: 'all', label: 'All Positions', count: positions.length },
              { id: 'open', label: '🟢 Open', count: openPositions.length },
              { id: 'closed', label: '🔴 Closed', count: closedPositions.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-orange-600 to-red-600 text-white"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                )}
              >
                {tab.label}
                <span className="bg-slate-900/50 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No positions found
            </div>
          ) : (
            <div className="space-y-4">
              {walletsWithPositions.slice(0, 20).map((wallet) => (
                <div 
                  key={wallet.address}
                  className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden"
                >
                  {/* Wallet Header */}
                  <div className="bg-slate-800/50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={selectedTraders.has(wallet.address)}
                        onChange={() => toggleSelectTrader(wallet.address)}
                        className="w-5 h-5 rounded cursor-pointer accent-orange-500"
                      />
                      <button
                        onClick={() => copyToClipboard(wallet.address)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <span className="font-mono text-sm text-cyan-400">
                        {truncateAddress(wallet.address)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400">
                        🟢 {wallet.openCount} | 🔴 {wallet.closedCount}
                      </span>
                      <span className={cn(
                        "font-semibold",
                        wallet.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        Total: {formatNumber(wallet.totalPnl)}
                      </span>
                    </div>
                  </div>

                  {/* Positions */}
                  <div className="divide-y divide-slate-700/50">
                    {wallet.positions.map((pos) => (
                      <div 
                        key={pos.id}
                        className={cn(
                          "p-4 hover:bg-slate-800/30 transition-colors",
                          pos.status === 'open' && "bg-green-900/10"
                        )}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "px-3 py-1 rounded-lg font-bold text-sm",
                              pos.side === 'long' 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {pos.side.toUpperCase()}
                            </span>
                            <span className="text-white font-bold">{pos.coin}</span>
                            <span className="text-slate-400">×{pos.size.toFixed(4)}</span>
                            <span className="text-slate-400">{pos.leverage}x</span>
                          </div>

                          <div className="flex items-center gap-6 flex-wrap">
                            <div className="text-center">
                              <div className="text-slate-400 text-xs">Entry Price</div>
                              <div className="text-white">${pos.entryPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-400 text-xs">Current</div>
                              <div className="text-white">${pos.currentPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-slate-400 text-xs">PnL</div>
                              <div className={cn(
                                "font-bold",
                                pos.pnl >= 0 ? "text-green-400" : "text-red-400"
                              )}>
                                {formatNumber(pos.pnl)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-slate-400 text-xs">Opened</div>
                              <div className="text-white">{formatTime(pos.openedAt)}</div>
                              <div className="text-slate-500 text-xs">
                                ({formatDuration(pos.openedAt, pos.closedAt || Date.now())})
                              </div>
                            </div>
                            {pos.status === 'closed' && pos.closedAt && (
                              <div className="text-center">
                                <div className="text-slate-400 text-xs">Closed</div>
                                <div className="text-white">{formatTime(pos.closedAt)}</div>
                              </div>
                            )}
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-semibold",
                              pos.status === 'open' 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {pos.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">📜 Recent Activity Log</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {filteredPositions
            .sort((a, b) => b.openedAt - a.openedAt)
            .slice(0, 15)
            .map((pos, index) => (
              <div 
                key={`${pos.id}-${index}`}
                className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg"
              >
                <span className={cn(
                  "w-3 h-3 rounded-full",
                  pos.status === 'open' ? "bg-green-500" : "bg-red-500"
                )}></span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold",
                  pos.side === 'long' 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {pos.side.toUpperCase()}
                </span>
                <span className="text-white font-medium">{pos.coin}</span>
                <span className="text-slate-400">
                  {pos.status === 'open' ? 'Position opened' : 'Position closed'}
                </span>
                <span className="text-slate-500 text-sm flex-1 text-right">
                  {getTimeAgo(pos.openedAt)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
