'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusCircle, 
  BookOpen, 
  Search, 
  Settings, 
  Shield, 
  HelpCircle, 
  Paperclip, 
  Mic, 
  Check, 
  Menu,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const QuickCaptureDesktop = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [noteText, setNoteText] = useState('');
  interface Capture { id: string; title: string; date?: string }
  const [recentCaptures, setRecentCaptures] = useState<Capture[]>([]);
  
  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  // Route guard: once the initial /me check resolves, if there's no
  // authenticated user, kick them to signin. Runs after `loading`
  // flips to false so we don't redirect prematurely mid-check.
  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [loading, user, router]);

  

  // While the /me check is in flight, or if we're mid-redirect for an
  // unauthenticated visitor, render nothing rather than flashing the
  // real page content.
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fb]">
        <p className="text-sm text-[#64748b]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f7f9fb] text-[#1e293b] font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#f2f4f6] border-r border-[#d8dadc] flex flex-col p-6">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1e293b] rounded flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">PrivBit</h1>
            <p className="text-[10px] uppercase tracking-wider text-[#64748b]">Encrypted Workspace</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white shadow-sm rounded-lg text-[#1e293b] font-bold transition-all">
            <PlusCircle size={20} />
            <span>Quick Capture</span>
          </a>
          <Link href="/library" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white/50 rounded-lg transition-colors">
            <BookOpen size={20} />
            <span>Library</span>
          </Link>
          <Link href="/search" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white/50 rounded-lg transition-colors">
            <Search size={20} />
            <span>Search</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white/50 rounded-lg transition-colors">
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="pt-6 border-t border-[#d8dadc] space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-xs text-[#64748b] hover:text-[#1e293b] transition-colors">
            <Shield size={16} />
            <span>Security</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-xs text-[#64748b] hover:text-[#1e293b] transition-colors">
            <HelpCircle size={16} />
            <span>Support</span>
          </a>
          <div className="mt-8 flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#1e293b]/10 flex items-center justify-center text-xs font-bold text-[#1e293b] uppercase">
              {user.email.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden text-ellipsis">
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#64748b] hover:text-[#ef4444] transition-colors"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-12 max-w-5xl mx-auto">
        <header className="w-full mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4">What's on your mind?</h2>
          <p className="text-[#64748b]">Your thoughts are encrypted end-to-end and stored securely.</p>
        </header>

        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-[#d8dadc] p-8 relative overflow-hidden group focus-within:ring-2 focus-within:ring-[#0D9488]/20 transition-all">
          <textarea
            placeholder="Start typing your thought..."
            className="w-full h-64 resize-none outline-none text-xl leading-relaxed text-[#1e293b] placeholder:text-[#94a3b8]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          
          
        </div>

        <div className="w-full max-w-3xl mt-8 flex justify-between items-center">
          <div className="flex gap-2">
            <button className="p-3 rounded-full bg-white border border-[#d8dadc] text-[#64748b] hover:bg-[#f2f4f6] transition-colors">
              <Paperclip size={20} />
            </button>
            <button className="p-3 rounded-full bg-white border border-[#d8dadc] text-[#64748b] hover:bg-[#f2f4f6] transition-colors">
              <Mic size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-xs text-[#94a3b8] flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-[#cbd5e1] rounded text-[10px]">⌘</kbd> + <kbd className="px-1.5 py-0.5 border border-[#cbd5e1] rounded text-[10px]">Enter</kbd> to save
            </span>
            <button className="flex items-center gap-2 px-8 py-3.5 bg-[#0D9488] text-white font-bold rounded-2xl hover:bg-[#0b7a70] transition-colors shadow-lg shadow-[#0D9488]/20 group">
              Save Note
              <Check size={18} className="group-active:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Captures (Small Footer Section) */}
        <div className="w-full max-w-3xl mt-24">
          <p className="text-[10px] uppercase tracking-widest text-[#94a3b8] mb-6 text-center">Recent Captures</p>
          {recentCaptures.length === 0 ? (
            <div className="py-12 flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">No recent captures found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {recentCaptures.map((capture) => (
                <div key={capture.id} className="p-4 bg-white/40 border border-[#d8dadc]/50 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                  <p className="text-xs font-medium text-[#1e293b] line-clamp-2 mb-2">{capture.title}</p>
                  <p className="text-[10px] text-[#94a3b8]">{capture.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuickCaptureDesktop;