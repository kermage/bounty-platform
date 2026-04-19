import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../services/api';
import { Link } from 'react-router-dom';

interface Wallet {
  cardano_address: string;
  created_at: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newMnemonic, setNewMnemonic] = useState<string[] | null>(null);

  useEffect(() => {
    walletApi.getWallet()
      .then((res) => setWallet(res.data.wallet))
      .catch(() => setWallet(null))
      .finally(() => setWalletLoading(false));
  }, []);

  const handleGenerateWallet = async () => {
    setGenerating(true);
    try {
      const res = await walletApi.generateWallet();
      setWallet({ cardano_address: res.data.address, created_at: new Date().toISOString() });
      if (res.data.mnemonic) {
        setNewMnemonic(res.data.mnemonic);
      }
    } catch {
      alert('Failed to generate wallet');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-10">Welcome back, {user?.email}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-gray-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4">💳 Your Wallet</h2>
            {walletLoading ? (
              <div className="animate-pulse h-6 bg-gray-700 rounded w-3/4"></div>
            ) : wallet ? (
              <div>
                <p className="text-xs text-gray-400 mb-1">Cardano Address (Preview)</p>
                <p className="text-xs font-mono text-cardano-light break-all">{wallet.cardano_address}</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-4">No wallet yet. Generate one to get started.</p>
                <button
                  onClick={handleGenerateWallet}
                  disabled={generating}
                  className="bg-cardano-blue hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Wallet'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4">⚡ Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Link to="/bounties/create" className="bg-cardano-blue hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition text-center">
                + Post a Bounty
              </Link>
              <Link to="/bounties" className="border border-gray-600 hover:border-cardano-light text-white px-6 py-3 rounded-lg transition text-center">
                Browse Open Bounties
              </Link>
            </div>
          </div>
        </div>

        {newMnemonic && (
          <div className="bg-yellow-900 border border-yellow-600 rounded-2xl p-8 mb-10">
            <h3 className="text-yellow-400 font-bold text-lg mb-2">⚠️ Save Your Recovery Phrase!</h3>
            <p className="text-yellow-200 text-sm mb-4">This is shown ONCE. Write it down and store it safely.</p>
            <div className="grid grid-cols-3 gap-2">
              {newMnemonic.map((word, i) => (
                <div key={i} className="bg-yellow-800 rounded px-3 py-2 text-sm font-mono">
                  <span className="text-yellow-500 mr-2">{i + 1}.</span>{word}
                </div>
              ))}
            </div>
            <button onClick={() => setNewMnemonic(null)} className="mt-4 text-yellow-400 hover:text-yellow-200 text-sm underline">
              I've saved it, dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Active Bounties Posted', value: '—' },
            { label: 'Submissions Made', value: '—' },
            { label: 'ADA Earned', value: '—' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800 rounded-2xl p-6 text-center">
              <p className="text-3xl font-bold text-cardano-light mb-1">{stat.value}</p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
