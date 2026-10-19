"use client";

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useAuth, ApiError } from '@/lib/auth-context';

const LoginDesktop = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((currentValue) => !currentValue);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 font-sans text-ink">
      {/* Auth Card */}
      <div className="w-full max-w-[560px] bg-card rounded-[32px] border border-border shadow-sm p-12 flex flex-col items-center animate-in fade-in zoom-in duration-500">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-12 h-12 bg-card border-2 border-ink rounded-xl flex items-center justify-center mb-6 shadow-sm">
            <Shield size={24} className="text-ink" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={24} className="text-ink" />
            <h1 className="text-2xl font-bold tracking-tight">PrivBit</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Welcome Back</h2>
          <p className="text-ink-soft leading-relaxed max-w-[340px]">
            Enter your credentials to access your sanctuary.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink px-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={handleEmailChange}
                required
                className="w-full px-6 py-4 bg-surface-muted border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-ink-muted"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink">
                Password
              </label>
              <button type="button" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                required
                className="w-full px-6 py-4 bg-surface-muted border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-ink-muted"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-danger px-1" role="alert">
              {error}
            </p>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/10 group mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{submitting ? 'SIGNING IN...' : 'SIGN IN'}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border w-full text-center">
          <p className="text-sm text-ink-soft">
            Don't have an account?{' '}
            <button type="button" onClick={() => router.push('/signup')} className="font-bold text-primary hover:underline">
              Create an Account
            </button>
          </p>
          <button
            type="button"
            className="mt-6 text-[10px] font-bold text-ink-muted uppercase tracking-widest hover:text-ink transition-colors"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginDesktop;