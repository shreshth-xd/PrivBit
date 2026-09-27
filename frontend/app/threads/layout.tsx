'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ApiError, listCaptures, type CaptureListItem } from '@/lib/api';

export default function ThreadsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [captures, setCaptures] = useState<CaptureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCaptures = async () => {
      try {
        const response = await listCaptures();
        if (active) setCaptures(response.captures);
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.detail : 'Unable to load conversations.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadCaptures();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-screen min-w-0 bg-[#f7f9fb] text-[#1e293b]">
      <Sidebar />
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#d8dadc] bg-white sm:w-72">
        <header className="flex h-16 shrink-0 items-center border-b border-[#d8dadc] px-5">
          <h1 className="text-lg font-bold">Threads</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="px-3 py-4 text-sm text-[#94a3b8]">Loading conversations...</p>
          ) : error ? (
            <p className="px-3 py-4 text-sm text-red-600" role="alert">{error}</p>
          ) : captures.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[#94a3b8]">No conversations yet</p>
          ) : (
            <nav aria-label="Conversations" className="space-y-1">
              {captures.map((capture) => {
                const active = pathname === `/threads/${capture.id}`;
                return (
                  <Link
                    key={capture.id}
                    href={`/threads/${capture.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={`block truncate rounded-md px-3 py-3 text-sm transition-colors ${
                      active
                        ? 'bg-[#0D9488]/10 font-semibold text-[#0D9488]'
                        : 'text-[#475569] hover:bg-[#f2f4f6] hover:text-[#1e293b]'
                    }`}
                  >
                    {capture.title || 'Untitled capture'}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}