'use client';

import { useState, type KeyboardEvent } from 'react';
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
  X,
  Menu
} from 'lucide-react';

const QuickCaptureDesktop = () => {
  const [noteText, setNoteText] = useState('');
  const [tags, setTags] = useState<string[]>(['research']);
  const [newTag, setNewTag] = useState('');

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
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white/50 rounded-lg transition-colors">
            <BookOpen size={20} />
            <span>Library</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white/50 rounded-lg transition-colors">
            <Search size={20} />
            <span>Search</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white/50 rounded-lg transition-colors">
            <Settings size={20} />
            <span>Settings</span>
          </a>
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
            <div className="w-8 h-8 rounded-full bg-[#1e293b]/10 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden text-ellipsis">
              <p className="text-sm font-medium">Alex Chen</p>
            </div>
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
