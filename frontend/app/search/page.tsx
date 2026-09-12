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
import { search } from '@/lib/api';
import { ApiError } from '@/lib/auth-context';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sourcesCount, setSourcesCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleSearch = async () => {
    setError(null);
    setAnswer(null);
    setSourcesCount(null);
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await search(searchQuery.trim());
      setAnswer(res.answer);
      setSourcesCount(res.sources_count);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
            <div className="absolute inset-y-0 right-6 flex items-center">
              <button
                onClick={() => void handleSearch()}
                disabled={loading || !searchQuery.trim()}
                className="px-4 py-2 bg-[#0D9488] text-white rounded-2xl font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
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
            <div>
              {error && (
                <p className="text-sm text-red-600 px-1" role="alert">{error}</p>
              )}

              {answer ? (
                <div className="bg-white border border-[#d8dadc] rounded-2xl p-6 mt-6">
                  <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-2">Answer</h3>
                  <p className="text-[#475569] leading-relaxed mb-4">{answer}</p>
                  {sourcesCount !== null && (
                    <p className="text-xs text-[#94a3b8]">{sourcesCount} sources</p>
                  )}
                </div>
              ) : (
                <div className="py-12 flex items-center justify-center">
                  <p className="text-sm text-[#94a3b8]">Type a query and press Enter or click Search to run semantic search.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SearchDesktop;
