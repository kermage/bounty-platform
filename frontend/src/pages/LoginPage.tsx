import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function LoginPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-12 text-center max-w-md w-full mx-4">
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-gray-400 mb-8">Sign in to access the Cardano Bounty Platform</p>

        <div className="flex justify-center mb-6">
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <GoogleSignIn />
          </GoogleOAuthProvider>
        </div>

        <p className="text-xs text-gray-500">
          By signing in, you agree to our Terms of Service.<br />
          A Cardano wallet will be automatically created for you.
        </p>
      </div>
    </div>
  );
}
