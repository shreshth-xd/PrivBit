'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Paperclip, 
  Mic, 
  Check, 
  X,
  Menu
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';

const QuickCaptureDesktop = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [noteText, setNoteText] = useState('');
  const [tags, setTags] = useState<string[]>(['research']);
  const [newTag, setNewTag] = useState('');

  // Route guard: once the initial /me check resolves, if there's no
  // authenticated user, kick them to signin. Runs after `loading`
  // flips to false so we don't redirect prematurely mid-check.
  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [loading, user, router]);

  const removeTag = (tagToRemove: string) => {
    setTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  };

  const addTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }

    const normalizedTag = newTag.trim();
    if (!normalizedTag) {
      return;
    }

    setTags((currentTags) => {
      if (currentTags.includes(normalizedTag)) {
        return currentTags;
      }
      return [...currentTags, normalizedTag];
    });
    setNewTag('');
  };

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
      <Sidebar />

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
          
          <div className="mt-6 flex flex-wrap gap-2 items-center min-h-10">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f4f6] rounded-lg text-sm text-[#475569]">
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-[#ef4444] transition-colors">
                  <X size={14} />
                </button>
              </span>
            ))}
            <input 
              type="text" 
              placeholder="Add tag..." 
              className="bg-transparent border-none outline-none text-sm text-[#475569] placeholder:text-[#94a3b8] w-24"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={addTag}
            />
          </div>
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
          <div className="grid grid-cols-3 gap-6">
            {[
              { title: "The philosophy of digital minimalism in...", date: "2 hours ago" },
              { title: "Weekly grocery list for the mountain cabin...", date: "Yesterday" },
              { title: "Project Phoenix architecture diagram...", date: "Aug 24" }
            ].map((capture, idx) => (
              <div key={idx} className="p-4 bg-white/40 border border-[#d8dadc]/50 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                <p className="text-xs font-medium text-[#1e293b] line-clamp-2 mb-2">{capture.title}</p>
                <p className="text-[10px] text-[#94a3b8]">{capture.date}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuickCaptureDesktop;