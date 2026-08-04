"use client"
import React, { useState } from 'react';
import { 
  PlusCircle, 
  BookOpen, 
  Search, 
  Settings, 
  Shield, 
  HelpCircle,
  LayoutGrid,
  List,
  ChevronDown,
  MoreVertical,
  Pin,
  Star,
  Lock,
  Clock,
  User
} from 'lucide-react';

interface NoteCard {
  id: string;
  title: string;
  preview: string;
  category: string;
  date: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isLocked?: boolean;
  image?: string;
  tags?: string[];
  tasks?: { label: string; completed: boolean }[];
}

const LibraryDesktop: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState('All Notes');

  const filters = ['All Notes', 'Project A', 'Research', 'Meetings'];

  const notes: NoteCard[] = [
    {
      id: '1',
      title: 'Zero-Knowledge...',
      preview: 'The implementation of zk-SNARKs in the core protocol requires a...',
      category: 'Research',
      date: 'Oct 24, 2023',
      isPinned: true,
    },
    {
      id: '2',
      title: 'Visual Identity...',
      preview: 'Reference images for the "Digital Sanctuary"...',
      category: 'Design',
      date: 'Oct 22, 2023',
      isFavorite: true,
      image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=250&fit=crop'
    },
    {
      id: '3',
      title: 'Q4 Strategy...',
      preview: 'Expand user base to include academic institutions. Privacy...',
      category: 'Urgent',
      date: 'Oct 20, 2023',
    },
    {
      id: '4',
      title: 'Weekly Focus Items',
      preview: '',
      category: 'Personal',
      date: 'Yesterday',
      tasks: [
        { label: 'Update encryption keys', completed: true },
        { label: 'Draft blog post', completed: false },
        { label: 'Security audit review', completed: false },
      ]
    },
    {
      id: '5',
      title: 'Quantum...',
      preview: 'Evaluating lattice-based cryptography for long-term data durability...',
      category: 'Research',
      date: 'Oct 15, 2023',
    },
    {
      id: '6',
      title: 'API Documentation...',
      preview: 'Endpoints for secure note retrieval and multi-device synchronization...',
      category: 'Reference',
      date: 'Oct 12, 2023',
    }
  ];

  return (
    <div className="flex h-screen bg-[#f7f9fb] text-[#1e293b] font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#f2f4f6] border-r border-[#d8dadc] flex flex-col p-6 shrink-0">
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
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white hover:shadow-sm rounded-lg transition-all group">
            <PlusCircle size={20} />
            <span className="font-medium">Quick Capture</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white shadow-sm rounded-lg text-[#1e293b] font-bold transition-all border border-[#d8dadc]/50">
            <BookOpen size={20} />
            <span>Library</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white hover:shadow-sm rounded-lg transition-all group">
            <Search size={20} />
            <span className="font-medium">Search</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white hover:shadow-sm rounded-lg transition-all group">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
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
          
          <button className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-[#0D9488] text-white text-sm font-bold rounded-xl hover:bg-[#0b7a70] transition-colors shadow-sm">
            <PlusCircle size={18} />
            New Note
          </button>

          <div className="mt-8 flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#1e293b]/10 overflow-hidden border border-[#d8dadc]">
               <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">User Profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Library Interface */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[#d8dadc] flex items-center justify-between px-8 bg-white/50 backdrop-blur-sm shrink-0">
          <h2 className="text-xl font-bold">Library</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#94a3b8]">
                <Search size={14} />
              </div>
              <input 
                type="text" 
                placeholder="Search notes..." 
                className="pl-9 pr-4 py-1.5 bg-[#f2f4f6] border border-[#d8dadc] rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0D9488]/10 transition-all w-64"
              />
            </div>
            <button className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors">
              <Clock size={18} />
            </button>
            <button className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors">
              <Shield size={18} />
            </button>
          </div>
        </header>

        {/* Toolbar & Filters */}
        <div className="px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeFilter === filter 
                  ? 'bg-[#1e293b] text-white' 
                  : 'bg-[#f2f4f6] text-[#64748b] hover:bg-[#e2e8f0]'
                }`}
              >
                {filter}
              </button>
            ))}
            <button className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#1e293b]">
              <PlusCircle size={16} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium hover:text-[#1e293b]">
              <List size={14} />
              <span>Date Modified</span>
              <ChevronDown size={14} />
            </button>
            <div className="flex items-center bg-[#f2f4f6] p-1 rounded-lg border border-[#d8dadc]">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-[#94a3b8]'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-[#94a3b8]'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <section className="flex-1 overflow-y-auto px-8 pb-12">
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {notes.map((note) => (
              <div 
                key={note.id} 
                className="group bg-white border border-[#d8dadc] rounded-2xl overflow-hidden hover:shadow-md hover:border-[#0D9488]/30 transition-all cursor-pointer flex flex-col"
              >
                {note.image && viewMode === 'grid' && (
                  <div className="h-40 overflow-hidden border-b border-[#d8dadc]">
                    <img src={note.image} alt={note.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-0.5 bg-[#f2f4f6] text-[#0D9488] text-[10px] font-bold rounded uppercase tracking-tight">
                      {note.category}
                    </span>
                    <div className="flex gap-1">
                      {note.isPinned && <Pin size={14} className="text-[#94a3b8]" />}
                      {note.isFavorite && <Star size={14} className="text-[#0D9488]" />}
                      <button className="text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-[#1e293b] mb-2 line-clamp-1 group-hover:text-[#0D9488] transition-colors">
                    {note.title}
                  </h3>
                  
                  {note.preview && (
                    <p className="text-xs text-[#64748b] leading-relaxed mb-4 line-clamp-3">
                      {note.preview}
                    </p>
                  )}

                  {note.tasks && (
                    <div className="space-y-2 mb-4">
                      {note.tasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${task.completed ? 'bg-[#0D9488] border-[#0D9488]' : 'border-[#cbd5e1]'}`}>
                            {task.completed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <span className={task.completed ? 'text-[#94a3b8] line-through' : 'text-[#475569]'}>{task.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-auto pt-4 flex justify-between items-center text-[10px] text-[#94a3b8]">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {note.date}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LibraryDesktop;
