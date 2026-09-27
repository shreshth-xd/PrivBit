'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FocusEvent, useRef, useState } from 'react';
import { ChevronDown, HelpCircle, LogOut, MoreVertical, PlusCircle, Search, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError, deleteCapture, listCaptures, updateCaptureTitle, type CaptureListItem } from '@/lib/api';

const navItems = [
  { href: '/', label: 'Quick Capture', icon: PlusCircle },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [threadsExpanded, setThreadsExpanded] = useState(false);
  const [captures, setCaptures] = useState<CaptureListItem[]>([]);
  const [capturesLoading, setCapturesLoading] = useState(false);
  const [capturesError, setCapturesError] = useState<string | null>(null);
  const [openCaptureMenuId, setOpenCaptureMenuId] = useState<string | null>(null);
  const [editingCaptureId, setEditingCaptureId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [captureActionErrors, setCaptureActionErrors] = useState<Record<string, string>>({});
  const cancelRenameBlurRef = useRef(false);

  const toggleThreads = () => {
    const shouldExpand = !threadsExpanded;
    setThreadsExpanded(shouldExpand);
    if (!shouldExpand || capturesLoading) return;

    setCapturesLoading(true);
    setCapturesError(null);
    void listCaptures()
      .then((response) => {
        setCaptures(response.captures);
      })
      .catch((err: unknown) => {
        setCapturesError(err instanceof ApiError ? err.detail : 'Unable to load conversations.');
      })
      .finally(() => setCapturesLoading(false));
  };

  const beginRename = (capture: CaptureListItem) => {
    setTitleDraft(capture.title || 'Untitled capture');
    setEditingCaptureId(capture.id);
    setOpenCaptureMenuId(null);
    setCaptureActionErrors((current) => {
      const next = { ...current };
      delete next[capture.id];
      return next;
    });
  };

  const saveCaptureRename = async (captureId: string, value: string) => {
    const nextTitle = value.trim();
    const capture = captures.find((item) => item.id === captureId);
    const previousTitle = capture?.title || 'Untitled capture';
    setEditingCaptureId(null);

    if (!nextTitle || nextTitle === previousTitle) {
      setTitleDraft(previousTitle);
      return;
    }

    try {
      const updatedCapture = await updateCaptureTitle(captureId, nextTitle);
      setCaptures((current) => current.map((item) => (
        item.id === captureId ? { ...item, title: updatedCapture.title } : item
      )));
      setCaptureActionErrors((current) => {
        const next = { ...current };
        delete next[captureId];
        return next;
      });
    } catch (err) {
      setTitleDraft(previousTitle);
      setCaptureActionErrors((current) => ({
        ...current,
        [captureId]: err instanceof ApiError ? err.detail : 'Unable to rename this conversation.',
      }));
    }
  };

  const handleRenameBlur = (captureId: string, event: FocusEvent<HTMLInputElement>) => {
    if (cancelRenameBlurRef.current) {
      cancelRenameBlurRef.current = false;
      return;
    }
    void saveCaptureRename(captureId, event.currentTarget.value);
  };

  const handleDeleteCapture = async (capture: CaptureListItem) => {
    setOpenCaptureMenuId(null);
    if (!window.confirm(`Delete "${capture.title || 'Untitled capture'}"? This cannot be undone.`)) return;

    setCaptureActionErrors((current) => {
      const next = { ...current };
      delete next[capture.id];
      return next;
    });

    try {
      await deleteCapture(capture.id);
      setCaptures((current) => current.filter((item) => item.id !== capture.id));
      if (pathname === `/threads/${capture.id}`) router.push('/threads');
    } catch (err) {
      setCaptureActionErrors((current) => ({
        ...current,
        [capture.id]: err instanceof ApiError ? err.detail : 'Unable to delete this conversation.',
      }));
    }
  };

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

        <div className="my-5 h-2" aria-hidden="true" />

        <div>
          <button
            type="button"
            onClick={toggleThreads}
            aria-expanded={threadsExpanded}
            aria-controls="sidebar-threads-list"
            className={
              pathname?.startsWith('/threads')
                ? 'flex w-full items-center gap-3 rounded-lg border border-[#d8dadc]/50 bg-white px-4 py-3 text-left font-bold text-[#1e293b] shadow-sm transition-all'
                : 'group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[#64748b] transition-all hover:bg-white hover:shadow-sm'
            }
          >
            <span className={pathname?.startsWith('/threads') ? undefined : 'font-medium'}>Threads</span>
            <ChevronDown
              size={16}
              className={`ml-auto transition-transform ${threadsExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {threadsExpanded && (
            <div id="sidebar-threads-list" className="mt-1 space-y-1">
              {capturesLoading ? (
                <p className="px-4 py-2 text-xs text-[#94a3b8]">Loading conversations...</p>
              ) : capturesError ? (
                <p className="px-4 py-2 text-xs text-red-600" role="alert">{capturesError}</p>
              ) : captures.length === 0 ? (
                <p className="px-4 py-2 text-xs text-[#94a3b8]">No conversations yet</p>
              ) : (
                captures.map((capture) => {
                  const active = pathname === `/threads/${capture.id}`;
                  return (
                    <div key={capture.id} className="group/capture relative">
                      <div className={`flex min-w-0 items-center rounded-lg pr-1 transition-colors ${
                        active
                          ? 'bg-white font-semibold text-[#1e293b] shadow-sm'
                          : 'text-[#64748b] hover:bg-white hover:text-[#1e293b]'
                      }`}>
                        {editingCaptureId === capture.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onBlur={(event) => handleRenameBlur(capture.id, event)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                event.currentTarget.blur();
                              } else if (event.key === 'Escape') {
                                event.preventDefault();
                                cancelRenameBlurRef.current = true;
                                event.currentTarget.blur();
                                setTitleDraft(capture.title || 'Untitled capture');
                                setEditingCaptureId(null);
                              }
                            }}
                            aria-label="Rename conversation"
                            className="h-9 min-w-0 flex-1 rounded-md border border-[#d8dadc] bg-white px-2 text-sm outline-none focus:border-[#0D9488]"
                          />
                        ) : (
                          <Link
                            href={`/threads/${capture.id}`}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setOpenCaptureMenuId(null)}
                            className="min-w-0 flex-1 truncate py-2 pl-11 pr-2 text-sm"
                          >
                            {capture.title || 'Untitled capture'}
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenCaptureMenuId((current) => current === capture.id ? null : capture.id)}
                          aria-label={`Actions for ${capture.title || 'Untitled capture'}`}
                          aria-haspopup="menu"
                          aria-expanded={openCaptureMenuId === capture.id}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[#64748b] opacity-60 transition hover:bg-[#f2f4f6] hover:text-[#1e293b] hover:opacity-100 focus-visible:opacity-100"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                      {openCaptureMenuId === capture.id && (
                        <div role="menu" className="absolute right-1 top-9 z-20 min-w-32 rounded-md border border-[#d8dadc] bg-white p-1 shadow-lg">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => beginRename(capture)}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-[#1e293b] hover:bg-[#f2f4f6]"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void handleDeleteCapture(capture)}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {captureActionErrors[capture.id] && (
                        <p className="px-3 py-1 text-xs text-red-600" role="alert">
                          {captureActionErrors[capture.id]}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
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
