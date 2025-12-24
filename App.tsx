import { useState } from 'react';
import { cn } from './utils/cn';
import TopTraders from './components/TopTraders';
import WhaleDetection from './components/WhaleDetection';
import TradeStatistics from './components/TradeStatistics';
import LivePositions from './components/LivePositions';

type Tab = 'traders' | 'whales' | 'statistics' | 'live';

interface SelectedWallet {
  address: string;
  source: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('traders');
  const [selectedWallets, setSelectedWallets] = useState<SelectedWallet[]>([]);

  const handleSelectWallet = (address: string, source: string) => {
    const exists = selectedWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (!exists) {
      setSelectedWallets(prev => [...prev, { address, source }]);
    }
  };

  const removeWallet = (address: string) => {
    setSelectedWallets(prev => prev.filter(w => w.address.toLowerCase() !== address.toLowerCase()));
  };

  const clearAllWallets = () => {
    setSelectedWallets([]);
  };

  const saveWalletsToFile = (format: 'txt' | 'csv' | 'json') => {
    if (selectedWallets.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(selectedWallets, null, 2);
      filename = `hyperliquid_wallets_${Date.now()}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      content = 'Address,Source,Selected At\n';
      selectedWallets.forEach(w => {
        content += `${w.address},${w.source},${new Date().toISOString()}\n`;
      });
      filename = `hyperliquid_wallets_${Date.now()}.csv`;
      mimeType = 'text/csv';
    } else {
      content = selectedWallets.map(w => w.address).join('\n');
      filename = `wallet_addresses_${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'traders' as Tab, label: '🏆 Top Traders', icon: '🏆', color: 'from-purple-600 to-pink-600' },
    { id: 'whales' as Tab, label: '🐋 Whale Detection', icon: '🐋', color: 'from-cyan-600 to-blue-600' },
    { id: 'statistics' as Tab, label: '📊 Trade Statistics', icon: '📊', color: 'from-green-600 to-emerald-600' },
    { id: 'live' as Tab, label: '⚡ Live Positions', icon: '⚡', color: 'from-orange-600 to-red-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                HyperLiquid Analytics
              </h1>
              <p className="text-slate-400 text-sm">
                Traders • Whales • Statistics • Live Positions
              </p>
            </div>

            {/* Selected Wallets Counter */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "px-4 py-2 rounded-lg border transition-all",
                selectedWallets.length > 0
                  ? "bg-green-500/20 border-green-500/50 text-green-400"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400"
              )}>
                <span className="font-semibold">{selectedWallets.length}</span>
                <span className="text-sm mr-1">wallets selected</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                )}
              >
                <span>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'traders' && (
          <TopTraders onSelectWallet={(addr) => handleSelectWallet(addr, 'Top Traders')} />
        )}
        {activeTab === 'whales' && (
          <WhaleDetection onSelectWallet={(addr) => handleSelectWallet(addr, 'Whale Detection')} />
        )}
        {activeTab === 'statistics' && (
          <TradeStatistics onSelectWallet={(addr) => handleSelectWallet(addr, 'Trade Statistics')} />
        )}
        {activeTab === 'live' && (
          <LivePositions onSelectWallet={(addr) => handleSelectWallet(addr, 'Live Positions')} />
        )}
      </main>

      {/* Selected Wallets Sidebar/Modal */}
      {selectedWallets.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-2xl max-w-sm w-full">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>📁</span> Selected Wallets ({selectedWallets.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearAllWallets}
                  className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {selectedWallets.map((wallet, index) => (
                <div 
                  key={`${wallet.address}-${index}`}
                  className="p-3 border-b border-slate-700/30 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-cyan-400 truncate">
                      {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
                    </div>
                    <div className="text-xs text-slate-500">{wallet.source}</div>
                  </div>
                  <button
                    onClick={() => removeWallet(wallet.address)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-700/50 flex gap-2">
              <button
                onClick={() => saveWalletsToFile('txt')}
                className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              >
                TXT
              </button>
              <button
                onClick={() => saveWalletsToFile('csv')}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              >
                CSV
              </button>
              <button
                onClick={() => saveWalletsToFile('json')}
                className="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>HyperLiquid Analytics Dashboard</p>
          <p className="mt-2">
            <a 
              href="https://hyperliquid.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              HyperLiquid Exchange
            </a>
            <span className="mx-2">•</span>
            <a 
              href="https://hyperliquid.gitbook.io/hyperliquid-docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              API Documentation
            </a>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Data is simulated for demonstration. Connect to live API for real data.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
