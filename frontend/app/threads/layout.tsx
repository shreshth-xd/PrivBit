'use client';

import Sidebar from '@/components/Sidebar';

export default function ThreadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-w-0 bg-app-bg text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}