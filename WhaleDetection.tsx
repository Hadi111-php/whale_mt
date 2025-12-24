import { useState, useEffect } from 'react';
import { fetchWhales, fetchUserPositions } from '../services/hyperliquid';
import { Whale, Position } from '../types';
import { formatNumber, truncateAddress, copyToClipboard, WHALE_THRESHOLDS } from '../utils/helpers';
import { cn } from '../utils/cn';

interface WhaleDetectionProps {
  onSelectWallet?: (address: string) => void;
}

export default function WhaleDetection({ onSelectWallet }: WhaleDetectionProps) {
  const [whales, setWhales] = useState<Whale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWhales, setSelectedWhales] = useState<Set<string>>(new Set());
  const [minBalance, setMinBalance] = useState<number>(500000);
  const [expandedWhale, setExpandedWhale] = useState<string | null>(null);
  const [whalePositions, setWhalePositions] = useState<Record<string, Position[]>>({});
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());

  const loadWhales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWhales(minBalance);
      setWhales(data);
    } catch (err) {
      setError('Error loading whale data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhales();
  }, [minBalance]);

  const loadWhalePositions = async (address: string) => {
    if (whalePositions[address] || loadingPositions.has(address)) return;
    
    setLoadingPositions(prev => new Set([...prev, address]));
    try {
      const positions = await fetchUserPositions(address);
      setWhalePositions(prev => ({ ...prev, [address]: positions }));
    } catch (err) {
      console.error('Error loading positions:', err);
    } finally {
      setLoadingPositions(prev => {
        const next = new Set(prev);
        next.delete(address);
        return next;
      });
    }
  };

  const toggleSelectWhale = (address: string) => {
    const newSelected = new Set(selectedWhales);
    if (newSelected.has(address)) {
      newSelected.delete(address);
    } else {
      newSelected.add(address);
      onSelectWallet?.(address);
    }
    setSelectedWhales(newSelected);
  };

  const toggleExpandWhale = async (address: string) => {
    if (expandedWhale === address) {
      setExpandedWhale(null);
    } else {
      setExpandedWhale(address);
      await loadWhalePositions(address);
    }
  };

  const selectAll = () => {
    setSelectedWhales(new Set(whales.map(w => w.address)));
    whales.forEach(w => onSelectWallet?.(w.address));
  };

  const deselectAll = () => {
    setSelectedWhales(new Set());
  };

  const totalBalance = whales.reduce((sum, w) => sum + w.balance, 0);
  const totalPnl = whales.reduce((sum, w) => sum + w.pnl, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">🐋 Whale Detection</h2>
        <button
          onClick={loadWhales}
          disabled={loading}
          className={cn(
            "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-all",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-900/50 via-purple-900/50 to-cyan-900/50 rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-slate-400 mb-2">
              💰 Minimum Balance Threshold
            </label>
            <select 
              value={minBalance}
              onChange={(e) => setMinBalance(Number(e.target.value))}
              className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
            >
              {WHALE_THRESHOLDS.map(threshold => (
                <option key={threshold.value} value={threshold.value}>
                  {threshold.label}
                </option>
              ))}
              <option value={10000000}>$10,000,000</option>
            </select>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-600">
              <div className="text-slate-400 text-xs">Whales Found</div>
              <div className="text-xl font-bold text-cyan-400">{whales.length}</div>
            </div>
            <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-600">
              <div className="text-slate-400 text-xs">Total Balance</div>
              <div className="text-xl font-bold text-green-400">{formatNumber(totalBalance)}</div>
            </div>
            <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-600">
              <div className="text-slate-400 text-xs">Total PnL</div>
              <div className={cn("text-xl font-bold", totalPnl >= 0 ? "text-green-400" : "text-red-400")}>
                {formatNumber(totalPnl)}
              </div>
            </div>
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
          Select All Whales
        </button>
        <button 
          onClick={deselectAll}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Deselect All
        </button>
        <span className="text-slate-400 py-2">
          Selected: {selectedWhales.size} whales
        </span>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 text-center border border-slate-700/50">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              Scanning for whales...
            </div>
          </div>
        ) : whales.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 text-center border border-slate-700/50">
            <p className="text-slate-400">No whales found with balance above {formatNumber(minBalance)}</p>
          </div>
        ) : (
          whales.map((whale, index) => (
            <div 
              key={whale.address}
              className={cn(
                "bg-slate-800/50 backdrop-blur-sm rounded-xl border transition-all",
                expandedWhale === whale.address ? "border-cyan-500/50" : "border-slate-700/50"
              )}
            >
              <div className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <input 
                    type="checkbox"
                    checked={selectedWhales.has(whale.address)}
                    onChange={() => toggleSelectWhale(whale.address)}
                    className="w-5 h-5 rounded cursor-pointer accent-cyan-500"
                  />
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    index === 0 && "bg-yellow-500/20 text-yellow-400",
                    index === 1 && "bg-slate-400/20 text-slate-300",
                    index === 2 && "bg-amber-600/20 text-amber-500",
                    index > 2 && "bg-slate-700/50 text-slate-400"
                  )}>
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <button
                      onClick={() => copyToClipboard(whale.address)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy address"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <span className="font-mono text-sm text-cyan-400">
                      {truncateAddress(whale.address)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center">
                      <div className="text-slate-400 text-xs">Balance</div>
                      <div className="text-lg font-bold text-green-400">{formatNumber(whale.balance)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-xs">PnL</div>
                      <div className={cn("text-lg font-bold", whale.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                        {formatNumber(whale.pnl)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-xs">Win Rate</div>
                      <div className="text-lg font-bold text-purple-400">{whale.winRate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-xs">Volume</div>
                      <div className="text-lg font-bold text-pink-400">{formatNumber(whale.volume)}</div>
                    </div>
                    <button
                      onClick={() => toggleExpandWhale(whale.address)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        expandedWhale === whale.address 
                          ? "bg-cyan-600 text-white" 
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      )}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {expandedWhale === whale.address && (
                <div className="border-t border-slate-700/50 p-4 bg-slate-900/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📊</span> Active Positions
                  </h3>
                  {loadingPositions.has(whale.address) ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(whalePositions[whale.address] || whale.positions).map((pos, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "bg-slate-800/50 rounded-lg p-3 border",
                            pos.side === 'long' ? "border-green-500/30" : "border-red-500/30"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-white">{pos.coin}</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-xs font-semibold",
                              pos.side === 'long' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            )}>
                              {pos.side.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Size:</span>
                              <span className="text-white ml-1">{pos.size.toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Leverage:</span>
                              <span className="text-white ml-1">{pos.leverage}x</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Entry:</span>
                              <span className="text-white ml-1">${pos.entryPrice.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Mark:</span>
                              <span className="text-white ml-1">${pos.markPrice.toFixed(2)}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400">PnL:</span>
                              <span className={cn("ml-1 font-semibold", pos.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                                {formatNumber(pos.pnl)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
