"use client"
import React from 'react';
import { 
  PlusCircle, 
  BookOpen, 
  Search, 
  Settings, 
  Shield, 
  HelpCircle,
  ArrowLeft,
  Edit2,
  Trash2,
  Lock,
  Clock,
  MoreVertical,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface Tag {
  label: string;
  color: string;
}

const NoteDetailDesktop: React.FC = () => {
  const tags: Tag[] = [
    { label: '#Research', color: 'bg-[#ccfbf1] text-[#0d9488]' },
    { label: '#Cryptography', color: 'bg-[#f1f5f9] text-[#475569]' },
    { label: '#Tech-2024', color: 'bg-[#f1f5f9] text-[#475569]' },
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
          
          <button className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-[#1e293b] text-white text-sm font-bold rounded-xl hover:bg-[#2d3a4f] transition-colors shadow-sm">
            <PlusCircle size={18} />
            New Note
          </button>

          <div className="mt-8 flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#1e293b]/10 overflow-hidden border border-[#d8dadc]">
               <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Alex Riviera</p>
              <p className="text-[10px] text-[#64748b]">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header */}
        <header className="h-16 border-b border-[#f1f5f9] flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2 text-[#0d9488]">
            <Shield size={20} />
            <span className="font-bold text-lg">PrivBit</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#94a3b8]">
                <Search size={14} />
              </div>
              <input 
                type="text" 
                placeholder="Search workspace..." 
                className="pl-9 pr-4 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-full text-xs outline-none focus:ring-2 focus:ring-[#0d9488]/10 transition-all w-64"
              />
            </div>
            <button className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors">
              <Clock size={20} />
            </button>
            <button className="p-2 text-[#64748b] hover:text-[#1e293b] transition-colors">
              <Shield size={20} />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e2e8f0]">
               <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Note Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-[#f7f9fb] p-8">
          <div className="max-w-4xl mx-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-8">
              <button className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#1e293b] transition-colors font-medium">
                <ArrowLeft size={18} />
                Back to Library
              </button>
              <div className="flex items-center gap-6">
                <span className="px-2 py-1 bg-[#f1f5f9] rounded text-[10px] font-bold text-[#64748b] uppercase tracking-widest">
                  Decrypted
                </span>
                <span className="text-xs text-[#94a3b8]">Edited 2h ago</span>
              </div>
            </div>

            {/* Note Header */}
            <div className="mb-10">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-4xl font-bold text-[#1e293b] leading-tight max-w-2xl">
                  Quantum Cryptography & Post-Quantum Resilience Standards
                </h1>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[#64748b] hover:text-[#0d9488] hover:bg-[#0d9488]/5 rounded-lg transition-all">
                    <Edit2 size={20} />
                  </button>
                  <button className="p-2 text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/5 rounded-lg transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold ${tag.color}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Content Card */}
            <article className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-12 text-[#334155] leading-relaxed">
              <p className="text-lg mb-8">
                The transition to post-quantum cryptography (PQC) is no longer a theoretical necessity but a practical imperative. As Shor's algorithm looms over current RSA and Elliptic Curve implementations, the "Harvest Now, Decrypt Later" strategy employed by state actors makes the protection of long-term data sensitivity a critical priority today.
              </p>

              <h2 className="text-2xl font-bold text-[#1e293b] mb-6">Core NIST PQC Selection</h2>
              <p className="mb-8">
                Recent NIST standards have converged on several primary algorithms designed to withstand attacks from quantum computers. The focus has shifted from classical integer factorization to lattice-based problems:
              </p>

              <ul className="space-y-6 mb-12">
                <li className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] mt-2.5 shrink-0" />
                  <p>
                    <span className="font-bold text-[#1e293b]">CRYSTALS-Kyber:</span> Selected for general encryption (KEM), offering a balance of performance and security levels.
                  </p>
                </li>
                <li className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] mt-2.5 shrink-0" />
                  <p>
                    <span className="font-bold text-[#1e293b]">CRYSTALS-Dilithium:</span> The primary recommendation for digital signatures, utilizing the same lattice frameworks.
                  </p>
                </li>
                <li className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] mt-2.5 shrink-0" />
                  <p>
                    <span className="font-bold text-[#1e293b]">Sphincs+:</span> A stateless hash-based signature scheme providing a high level of security as a fallback mechanism.
                  </p>
                </li>
              </ul>

              <div className="bg-[#f8fafc] border-l-4 border-[#0d9488] p-8 rounded-r-2xl italic text-xl text-[#475569] mb-12">
                "Quantum resilience is not a single upgrade, but a continuous architectural shift toward cryptographic agility."
              </div>

              <h2 className="text-2xl font-bold text-[#1e293b] mb-6">Implementation Strategies</h2>
              <p>
                To ensure a smooth transition, organizations are encouraged to adopt hybrid classical-quantum schemes, providing protection against current threats while preparing for a quantum-enabled future...
              </p>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NoteDetailDesktop;
