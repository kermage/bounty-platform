import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function GoogleSignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    try {
      await login(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => alert('Google login failed')}
      theme="filled_black"
      shape="pill"
      size="large"
      text="signin_with"
    />
  );
}
