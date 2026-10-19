'use client';

import { useState, useEffect, useEffectEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, 
  Menu,
  LogOut
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { createCapture } from '@/lib/api';
import { ApiError } from '@/lib/auth-context';
import { isCaptureStalled, useCaptures } from '@/lib/captures-context';

const formatCaptureDate = (createdAt: string) => {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return 'Unknown date';

  const differenceInSeconds = Math.round((createdDate.getTime() - Date.now()) / 1000);
  const absoluteDifference = Math.abs(differenceInSeconds);
  const units = [
    { seconds: 86400, unit: 'day' as const },
    { seconds: 3600, unit: 'hour' as const },
    { seconds: 60, unit: 'minute' as const },
  ];
  const relativeUnit = units.find(({ seconds }) => absoluteDifference >= seconds);

  if (relativeUnit) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round(differenceInSeconds / relativeUnit.seconds),
      relativeUnit.unit,
    );
  }

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(createdDate);
};

const QuickCaptureDesktop = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { captures: recentCaptures, loading: capturesLoading, error: capturesError, refresh, processingIds, trackCapture } = useCaptures();

  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  // Route guard: once the initial /me check resolves, if there's no
  // authenticated user, kick them to signin. Runs after `loading`
  // flips to false so we don't redirect prematurely mid-check.
  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [loading, user, router]);

  const handleSave = async () => {
    setError(null);
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const capture = await createCapture(noteText.trim());
      setNoteText('');
      trackCapture(capture.id);
      void refresh();
      setSuccess('Saved. Processing...');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveFromKeyboardShortcut = useEffectEvent(() => {
    void handleSave();
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        saveFromKeyboardShortcut();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  

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
          <h2 className="text-4xl font-bold mb-4">What&apos;s on your mind?</h2>
          <p className="text-[#64748b]">Your thoughts are encrypted end-to-end and stored securely.</p>
        </header>

        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-[#d8dadc] p-8 relative overflow-hidden group focus-within:ring-2 focus-within:ring-[#0D9488]/20 transition-all">
          <textarea
            placeholder="Start typing your thought..."
            className="w-full h-64 resize-none outline-none text-xl leading-relaxed text-[#1e293b] placeholder:text-[#94a3b8]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          
          
        </div>

        <div className="w-full max-w-3xl mt-8 flex justify-end">
          <div className="flex flex-col items-end gap-2">
            {error && (
              <p className="text-sm text-red-600 px-1" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600 px-1" role="status">
                {success}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !noteText.trim()}
              className="flex items-center gap-2 px-8 py-3.5 bg-[#0D9488] text-white font-bold rounded-2xl hover:bg-[#0b7a70] transition-colors shadow-lg shadow-[#0D9488]/20 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{saving ? 'SAVING...' : 'Save Note'}</span>
              <Check size={18} className="group-active:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Captures (Small Footer Section) */}
        <div className="w-full max-w-3xl mt-24">
          <p className="text-[10px] uppercase tracking-widest text-[#94a3b8] mb-6 text-center">Recent Captures</p>
          {capturesLoading ? (
            <div className="py-12 flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">Loading recent captures...</p>
            </div>
          ) : capturesError ? (
            <div className="py-12 flex items-center justify-center">
              <p className="text-sm text-red-500">{capturesError}</p>
            </div>
          ) : recentCaptures.length === 0 ? (
            <div className="py-12 flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">No recent captures found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {recentCaptures.map((capture) => {
                const statusLabel = capture.status === 'failed'
                  ? 'Failed to process'
                  : processingIds.has(capture.id)
                    ? 'Processing...'
                    : capture.status === 'processing'
                      ? isCaptureStalled(capture) ? 'Processing stalled' : 'Processing...'
                      : null;
                return (
                  <div key={capture.id} className="p-4 bg-white/40 border border-[#d8dadc]/50 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                    <p className="text-xs font-medium text-[#1e293b] line-clamp-2 mb-2">{capture.title ?? 'Untitled capture'}</p>
                    <p className="text-[10px] text-[#94a3b8]">{formatCaptureDate(capture.created_at)}</p>
                    {statusLabel && (
                      <p className="mt-2 text-[10px] text-[#94a3b8]">{statusLabel}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuickCaptureDesktop;