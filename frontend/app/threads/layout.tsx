'use client';

import Sidebar from '@/components/Sidebar';

export default function ThreadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-w-0 bg-[#f7f9fb] text-[#1e293b]">
      <Sidebar />
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}