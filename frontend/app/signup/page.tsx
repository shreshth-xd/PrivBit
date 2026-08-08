"use client";

import { useState, type ChangeEvent } from 'react';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const SignupMobileRefined = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAccepted, setIsAccepted] = useState<boolean>(false);

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

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col font-sans text-[#1e293b]">
      {/* Top Branding */}
      <header className="pt-12 pb-8 flex justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-[#1e293b]">PrivBit</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 px-6 pb-24">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-[#99f6e4] rounded-2xl flex items-center justify-center mb-6 text-[#0D9488] shadow-sm">
            <Shield size={28} />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight text-[#1e293b]">Create Sanctuary</h1>
          <p className="text-sm text-[#64748b] leading-relaxed max-w-[280px]">
            Your digital environment, secured by design. No tracking, absolute focus.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-[32px] border border-[#d8dadc] shadow-sm p-8 space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] px-1">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-[#0D9488] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={handleEmailChange}
                className="w-full pl-12 pr-6 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl outline-none focus:ring-2 focus:ring-[#0D9488]/10 focus:border-[#0D9488]/30 transition-all placeholder:text-[#94a3b8] text-sm"
              />
            </div>
          </div>

          {/* Master Password Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] px-1">
              Master Password
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-[#0D9488] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                className="w-full pl-12 pr-12 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl outline-none focus:ring-2 focus:ring-[#0D9488]/10 focus:border-[#0D9488]/30 transition-all placeholder:text-[#94a3b8] text-sm"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1e293b] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[10px] text-[#94a3b8] px-1 leading-tight">
              Use at least 12 characters, numbers, and symbols.
            </p>
          </div>

          {/* Acknowledgement Checkbox */}
          <div
            onClick={toggleAcceptance}
            className="flex gap-3 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl cursor-pointer hover:bg-white transition-colors group"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleAcceptance();
              }
            }}
          >
            <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all ${isAccepted ? 'bg-[#0D9488] border-[#0D9488]' : 'bg-white border border-[#cbd5e1] group-hover:border-[#0D9488]'}`}>
              {isAccepted && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <p className="text-xs text-[#64748b] leading-relaxed">
              I understand that PrivBit uses end-to-end encryption. If I lose my master password, my data cannot be recovered.
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#64748b]">
            Already have a sanctuary?{' '}
            <button type="button" className="font-bold text-[#0D9488] hover:underline transition-all">
              Sign in
            </button>
          </p>
        </div>
      </main>

      {/* Fixed Action Button */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f7f9fb] via-[#f7f9fb] to-transparent pt-12">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-[#0D9488] text-white font-bold rounded-2xl hover:bg-[#0b7a70] transition-all shadow-lg shadow-[#0D9488]/20 group active:scale-[0.98]"
        >
          <span>Initialize Vault</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  );
};

export default SignupMobileRefined;
