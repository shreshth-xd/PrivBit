'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, HelpCircle, LogOut, PlusCircle, Search, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/', label: 'Quick Capture', icon: PlusCircle },
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  const isActiveRoute = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <aside className="hidden md:flex w-64 bg-[#f2f4f6] border-r border-[#d8dadc] flex-col p-6 shrink-0">
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActiveRoute(href);

          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? 'flex items-center gap-3 px-4 py-3 bg-white shadow-sm rounded-lg text-[#1e293b] font-bold transition-all border border-[#d8dadc]/50'
                  : 'flex items-center gap-3 px-4 py-3 text-[#64748b] hover:bg-white hover:shadow-sm rounded-lg transition-all group'
              }
            >
              <Icon size={20} />
              <span className={active ? undefined : 'font-medium'}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-[#d8dadc] space-y-2">
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-xs text-[#64748b] hover:text-[#1e293b] hover:drop-shadow-[0_0_10px_rgba(15,23,42,0.12)] transition-all"
        >
          <Shield size={16} />
          <span>Security</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-4 py-2 text-xs text-[#64748b] hover:text-[#1e293b] hover:drop-shadow-[0_0_10px_rgba(15,23,42,0.12)] transition-all"
        >
          <HelpCircle size={16} />
          <span>Support</span>
        </a>

        <div className="mt-8 flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-[#1e293b]/10 flex items-center justify-center text-xs font-bold text-[#1e293b] uppercase">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.email ?? 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#64748b] hover:text-[#ef4444] transition-colors"
            aria-label="Log out"
            type="button"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
