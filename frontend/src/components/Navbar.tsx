import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
          🏆 <span className="text-cardano-light">Cardano</span> Bounties
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/bounties" className="text-gray-300 hover:text-white transition">
            Browse Bounties
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-gray-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link to="/bounties/create" className="bg-cardano-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                Post Bounty
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">{user?.email}</span>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition text-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="bg-cardano-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
