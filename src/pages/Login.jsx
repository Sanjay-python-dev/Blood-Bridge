import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, AlertCircle, Building, ShieldAlert } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

export default function Login() {
  const navigate = useNavigate();
  const { user, signIn, loginAdmin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/donor-dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (cleanEmail.includes('admin')) {
        // Administrative sign in
        await loginAdmin({ email: cleanEmail, password });
        showToast('Super Administrator session authorized.', 'success');
        navigate('/admin-dashboard');
      } else {
        // Standard user/donor sign in
        await signIn({ email: cleanEmail, password });
        showToast('Logged in successfully. Welcome back!', 'success');
        navigate('/donor-dashboard');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_grant')) {
        setError('Invalid email or password. Please verify your credentials and try again.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Your email has not been verified yet. Please check your inbox for the confirmation link.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to initialize Google login.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#050505] relative overflow-hidden">
      
      {/* Background Red Glow Elements */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E50914]/15 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo at the top */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="large" />
          <h2 className="text-3xl font-black text-white mt-6 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-sm text-[#B0B0B0] mt-1">
            Access your Blood Bridge portal and manage donation status
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-lvl2 border border-white/15 hover:border-white/25 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all relative overflow-hidden">
          {/* Top edge glass reflection highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com (or admin@bloodbridge.org)"
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
                />
                <Mail className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); showToast('Password reset instructions dispatched to your email.', 'info'); }}
                  className="text-xs font-semibold text-[#FF2B2B] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
                />
                <Lock className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#737373] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                />
                <span className="text-xs font-medium text-[#B0B0B0]">
                  Remember Me on this device
                </span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_35px_rgba(229,9,20,0.8)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>LOGGING IN...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>LOGIN</span>
                </>
              )}
            </button>
          </form>

          {/* Hospital Gateway Callout */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <Link
              to="/hospital-portal"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-xs font-bold text-sky-400 hover:text-white transition-all shadow-sm"
            >
              <Building className="w-3.5 h-3.5" />
              <span>Are you a Hospital? Clinical Authorization Portal →</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-[#111111] px-3 text-xs text-[#737373] uppercase font-mono">
              Or continue with
            </span>
          </div>

          {/* Social login: Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl bg-[#161616] hover:bg-[#1e1e1e] border border-[#2e2e2e] hover:border-white/40 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2.5 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-1.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Don't have an account */}
          <div className="mt-8 text-center text-xs text-[#B0B0B0]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-[#FF2B2B] hover:underline font-bold"
            >
              REGISTER NOW
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
