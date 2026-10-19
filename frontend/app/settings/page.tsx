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
  <div className="flex items-center justify-between p-4 bg-card hover:bg-surface-muted transition-colors cursor-pointer border-b border-border last:border-0 first:rounded-t-2xl last:rounded-b-2xl">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${destructive ? 'text-danger bg-danger/10' : 'text-ink-soft bg-surface-muted'}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${destructive ? 'text-danger' : 'text-ink'}`}>{title}</span>
        {subtitle && <span className="text-[11px] text-ink-soft">{subtitle}</span>}
      </div>
    </div>
    <div className="flex items-center">
      {action === 'toggle' && (
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className={`w-11 h-6 rounded-full transition-colors relative ${isToggled ? 'bg-primary' : 'bg-border'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-card rounded-full transition-transform ${isToggled ? 'left-6' : 'left-1'}`} />
        </button>
      )}
      {action === 'chevron' && <ChevronRight size={18} className="text-ink-muted" />}
      {action === 'text' && <span className="text-xs font-bold text-ink-muted">{actionText}</span>}
    </div>
  </div>
);

const SettingsMobile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-app-bg font-sans text-ink">
      {/* Top App Bar */}
      <header className="px-6 py-4 flex items-center justify-between bg-app-bg/80 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <div className="flex items-center gap-4">
          <Shield size={22} className="text-ink-soft" />
          <div className="w-8 h-8 rounded-full border border-border bg-ink/10 flex items-center justify-center text-xs font-bold text-ink uppercase">
            {user?.email ? user.email.charAt(0) : 'U'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pb-24">
        {/* Privacy First Header Card */}
        <section className="mt-4 mb-8 bg-card rounded-3xl p-6 shadow-sm border border-border">
          <div className="w-12 h-12 bg-primary-soft rounded-2xl flex items-center justify-center mb-4 text-primary">
            <Shield size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2">Privacy First</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-6">
            All your data is locally encrypted using AES-256 before syncing.
          </p>
          <div className="flex items-center justify-between bg-surface-muted rounded-xl px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Encryption Key Active</span>
            <div className="flex items-center gap-1.5 text-primary">
              <CheckCircle2 size={14} />
              <span className="text-xs font-bold">Secure</span>
            </div>
          </div>
        </section>

        {/* Security & Access Section */}
        <div className="mb-8">
          <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-3">Security & Access</h3>
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
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
          <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-3">Workspace</h3>
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
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
          <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-danger mb-3">Account Safety</h3>
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
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
          <p className="text-xs font-medium text-ink-soft">PrivBit v2.4.1 (Stable)</p>
          <p className="text-[10px] text-ink-soft mt-1">Built with privacy by design</p>
        </footer>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card/90 backdrop-blur-lg border-t border-border flex items-center justify-around px-6 pb-safe z-30">
        <Link href="/" className="flex flex-col items-center gap-1 text-ink-muted">
          <Edit3 size={24} />
          <span className="text-[10px] font-bold">Capture</span>
        </Link>
        <Link href="/threads" className="flex flex-col items-center gap-1 text-ink-muted">
          <FolderOpen size={24} />
          <span className="text-[10px] font-bold">Threads</span>
        </Link>
        <Link href="/search" className="flex flex-col items-center gap-1 text-ink-muted">
          <Search size={24} />
          <span className="text-[10px] font-bold">Search</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-primary relative">
          <div className="absolute -top-1 px-4 py-4 bg-primary-soft/30 rounded-2xl -z-10" />
          <SettingsIcon size={24} />
          <span className="text-[10px] font-bold">Settings</span>
        </Link>
      </nav>
    </div>
  );
};

export default SettingsMobile;