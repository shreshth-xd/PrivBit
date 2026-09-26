"use client"
import React from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { 
  Shield, 
  ChevronRight, 
  Smartphone, 
  Trash2, 
  CheckCircle2,
  Edit3,
  FolderOpen,
  Search,
  Settings as SettingsIcon,
  Timer
} from 'lucide-react';

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: 'toggle' | 'chevron' | 'text';
  actionText?: string;
  isToggled?: boolean;
  onToggle?: () => void;
  destructive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, 
  title, 
  subtitle, 
  action = 'chevron', 
  actionText,
  isToggled,
  onToggle,
  destructive
}) => (
  <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0 first:rounded-t-2xl last:rounded-b-2xl">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${destructive ? 'text-red-500 bg-red-50' : 'text-slate-600 bg-slate-50'}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${destructive ? 'text-red-500' : 'text-slate-900'}`}>{title}</span>
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>
    </div>
    <div className="flex items-center">
      {action === 'toggle' && (
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className={`w-11 h-6 rounded-full transition-colors relative ${isToggled ? 'bg-[#0D9488]' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isToggled ? 'left-6' : 'left-1'}`} />
        </button>
      )}
      {action === 'chevron' && <ChevronRight size={18} className="text-slate-400" />}
      {action === 'text' && <span className="text-xs font-bold text-slate-400">{actionText}</span>}
    </div>
  </div>
);

const SettingsMobile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-[#f7f9fb] font-sans text-slate-900">
      {/* Top App Bar */}
      <header className="px-6 py-4 flex items-center justify-between bg-[#f7f9fb]/80 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <div className="flex items-center gap-4">
          <Shield size={22} className="text-slate-700" />
          <div className="w-8 h-8 rounded-full border border-slate-200 bg-[#1e293b]/10 flex items-center justify-center text-xs font-bold text-[#1e293b] uppercase">
            {user?.email ? user.email.charAt(0) : 'U'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pb-24">
        {/* Privacy First Header Card */}
        <section className="mt-4 mb-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-[#99f6e4] rounded-2xl flex items-center justify-center mb-4 text-[#0D9488]">
            <Shield size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2">Privacy First</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            All your data is locally encrypted using AES-256 before syncing.
          </p>
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Encryption Key Active</span>
            <div className="flex items-center gap-1.5 text-[#0D9488]">
              <CheckCircle2 size={14} />
              <span className="text-xs font-bold">Secure</span>
            </div>
          </div>
        </section>

        {/* Security & Access Section */}
        <div className="mb-8">
          <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Security & Access</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <SettingsItem 
              icon={<Timer size={20} />} 
              title="Self-Destruct Timer" 
              subtitle="Clear local cache after 48h" 
              action="chevron"
            />
          </div>
        </div>

        {/* Workspace Section */}
        <div className="mb-8">
          <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Workspace</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <SettingsItem 
              icon={<Smartphone size={20} />} 
              title="Connected Devices" 
              subtitle="2 active sessions" 
              action="chevron"
            />
          </div>
        </div>

        {/* Account Safety Section */}
        <div className="mb-8">
          <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-red-500 mb-3">Account Safety</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <SettingsItem 
              icon={<Trash2 size={20} />} 
              title="Purge All Data" 
              subtitle="Permanently delete encryption keys" 
              action="chevron"
              destructive
            />
          </div>
        </div>

        {/* App Info */}
        <footer className="text-center pb-8 opacity-50">
          <p className="text-xs font-medium text-slate-600">PrivBit v2.4.1 (Stable)</p>
          <p className="text-[10px] text-slate-500 mt-1">Built with privacy by design</p>
        </footer>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-lg border-t border-slate-100 flex items-center justify-around px-6 pb-safe z-30">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-400">
          <Edit3 size={24} />
          <span className="text-[10px] font-bold">Capture</span>
        </Link>
        <Link href="/library" className="flex flex-col items-center gap-1 text-slate-400">
          <FolderOpen size={24} />
          <span className="text-[10px] font-bold">Library</span>
        </Link>
        <Link href="/search" className="flex flex-col items-center gap-1 text-slate-400">
          <Search size={24} />
          <span className="text-[10px] font-bold">Search</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-[#0D9488] relative">
          <div className="absolute -top-1 px-4 py-4 bg-[#99f6e4]/30 rounded-2xl -z-10" />
          <SettingsIcon size={24} />
          <span className="text-[10px] font-bold">Settings</span>
        </Link>
      </nav>
    </div>
  );
};

export default SettingsMobile;