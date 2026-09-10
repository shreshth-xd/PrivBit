"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { 
  PlusCircle, 
  BookOpen, 
  Search as SearchIcon, 
  Shield,
  RefreshCw,
  Command,
  ArrowRight
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  matchPercentage?: number;
}

const SearchDesktop: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock results based on the design
  const results: SearchResult[] = [
    {
      id: '1',
      title: 'Strategic roadmap for 2024 scaling',
      excerpt: 'The focus for the next two quarters will be on decentralizing the storage nodes while...',
      date: '2 hours ago • Project Alpha',
      tags: ['roadmap', 'security'],
      matchPercentage: 98
    },
    {
      id: '2',
      title: 'Key Rotation Script (V2)',
      excerpt: 'Updated the Python script to handle batch rotation of keys in the staging environment...',
      date: 'Mar 12 • Development',
      tags: [],
      matchPercentage: 82
    }
  ];

  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#f7f9fb] text-[#1e293b] font-sans">
      <Sidebar />

      {/* Main Search Interface */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-[#d8dadc] flex items-center justify-between px-8 bg-white/50 backdrop-blur-sm shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-bold">Semantic Search Engine</span>
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors">
              <RefreshCw size={18} />
            </button>
            <button className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors">
              <Shield size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#1e293b]/10 flex items-center justify-center text-xs font-bold text-[#1e293b] uppercase">
              {user?.email ? user.email.charAt(0) : 'U'}
            </div>
          </div>
        </header>

        {/* Search Bar Area */}
        <section className="px-12 py-10 max-w-5xl mx-auto w-full flex-1 flex flex-col">
          <div className="relative group mb-12">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-[#94a3b8] group-focus-within:text-[#0D9488] transition-colors">
              <SearchIcon size={22} />
            </div>
            <input 
              type="text" 
              placeholder="Search across your encrypted universe..."
              className="w-full pl-16 pr-24 py-6 bg-white border border-[#d8dadc] rounded-2xl shadow-sm text-xl outline-none focus:ring-4 focus:ring-[#0D9488]/5 focus:border-[#0D9488] transition-all placeholder:text-[#94a3b8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-6 flex items-center">
              <div className="flex items-center gap-1 px-2 py-1 bg-[#f2f4f6] border border-[#cbd5e1] rounded text-[11px] text-[#64748b] font-medium">
                <Command size={10} />
                <span>K</span>
              </div>
            </div>
          </div>

          {searchQuery === '' ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-[#d8dadc] mb-6 text-[#0D9488]">
                 <SearchIcon size={32} />
              </div>
              <h2 className="text-3xl font-bold text-[#1e293b] mb-4">Deep Knowledge, Instantly Found</h2>
              <p className="text-[#64748b] max-w-md leading-relaxed">
                Ask natural questions like "What did I learn about zero-knowledge proofs last month?" or "Find my notes on the Tokyo trip."
              </p>
            </div>
          ) : (
            /* Results State */
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-wider">Top Results</h3>
                <span className="text-xs text-[#94a3b8]">{results.length} notes found</span>
              </div>
              
              {results.map((result) => (
                <div key={result.id} className="bg-white border border-[#d8dadc] rounded-2xl p-6 hover:shadow-md hover:border-[#0D9488]/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f7f9fb] flex items-center justify-center text-[#64748b]">
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-[#1e293b] group-hover:text-[#0D9488] transition-colors">{result.title}</h4>
                        <p className="text-xs text-[#94a3b8]">{result.date}</p>
                      </div>
                    </div>
                    {result.matchPercentage && (
                      <span className="px-2 py-1 bg-[#f2f4f6] rounded text-[10px] font-bold text-[#64748b] uppercase tracking-tight">
                        {result.matchPercentage}% Match
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[#475569] leading-relaxed mb-6">
                    {result.excerpt}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {result.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-[#f2f4f6] rounded text-[10px] font-bold text-[#0D9488]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-[#94a3b8] group-hover:text-[#0D9488] group-hover:translate-x-1 transition-all">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SearchDesktop;
