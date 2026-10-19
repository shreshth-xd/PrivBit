"use client";

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, ApiError } from '@/lib/auth-context';

const SignupMobileRefined = () => {
  const router = useRouter();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAccepted, setIsAccepted] = useState<boolean>(false);
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

  const toggleAcceptance = () => {
    setIsAccepted((currentValue) => !currentValue);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isAccepted) {
      setError('Please acknowledge the encryption notice to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, password });
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
    <div className="min-h-screen bg-app-bg flex flex-col font-sans text-ink">
      {/* Top Branding */}
      <header className="pt-12 pb-8 flex justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-ink">PrivBit</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 px-6 pb-24">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-primary-soft rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm">
            <Shield size={28} />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight text-ink">Create Sanctuary</h1>
          <p className="text-sm text-ink-soft leading-relaxed max-w-[280px]">
            Your digital environment, secured by design. No tracking, absolute focus.
          </p>
        </div>

        {/* Auth Card */}
        <form onSubmit={handleSubmit} className="bg-card rounded-[32px] border border-border shadow-sm p-8 space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft px-1">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-primary transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={handleEmailChange}
                required
                className="w-full pl-12 pr-6 py-4 bg-surface-muted border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-ink-muted text-sm"
              />
            </div>
          </div>

          {/* Master Password Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft px-1">
              Master Password
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-primary transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                required
                minLength={8}
                className="w-full pl-12 pr-12 py-4 bg-surface-muted border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-ink-muted text-sm"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[10px] text-ink-muted px-1 leading-tight">
              Use at least 12 characters, numbers, and symbols.
            </p>
          </div>

          {/* Acknowledgement Checkbox */}
          <div
            onClick={toggleAcceptance}
            className="flex gap-3 p-4 bg-surface-muted border border-border rounded-2xl cursor-pointer hover:bg-card transition-colors group"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleAcceptance();
              }
            }}
          >
            <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all ${isAccepted ? 'bg-primary border-primary' : 'bg-card border border-border group-hover:border-primary'}`}>
              {isAccepted && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              I understand that PrivBit uses end-to-end encryption. If I lose my master password, my data cannot be recovered.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-danger px-1" role="alert">
              {error}
            </p>
          )}

          {/* Fixed Action Button (moved inside form so Enter/submit works) */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 group active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{submitting ? 'Initializing...' : 'Initialize Vault'}</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-ink-soft">
            Already have a sanctuary?{' '}
            <button type="button" onClick={() => router.push('/signin')} className="font-bold text-primary hover:underline transition-all">
              Sign in
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignupMobileRefined;