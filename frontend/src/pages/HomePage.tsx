import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold mb-6">
          🏆 Cardano <span className="text-cardano-light">Bounty</span> Platform
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Post bounties, fund them with stablecoins, and pay contributors, all secured by smart contracts on Cardano.
        </p>
        <div className="flex gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard" className="bg-cardano-blue hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition">
              Go to Dashboard →
            </Link>
          ) : (
            <Link to="/login" className="bg-cardano-blue hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition">
              Get Started →
            </Link>
          )}
          <Link to="/bounties" className="border border-gray-600 hover:border-cardano-light text-white px-8 py-4 rounded-xl text-lg font-semibold transition">
            Browse Bounties
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: '🔒', title: 'Smart Contract Escrow', desc: 'Funds locked on-chain until work is verified and approved.' },
          { icon: '💰', title: 'Stablecoin Rewards', desc: 'Pay in USDM, USDA, or USDCx, no ADA price volatility.' },
          { icon: '⚖️', title: 'Built-in Arbitration', desc: 'Disputes resolved fairly by platform arbitrators on-chain.' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
