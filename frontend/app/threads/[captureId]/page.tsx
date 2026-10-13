'use client';

import { FormEvent, FocusEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowUp, Pencil } from 'lucide-react';
import { ApiError, getMessages, postMessage, updateCaptureTitle, type MessageResponse } from '@/lib/api';
import { useCaptures } from '@/lib/captures-context';

export default function ThreadPage() {
  const { captureId } = useParams<{ captureId: string }>();
  const { captures, loading: capturesLoading, processingIds, refresh } = useCaptures();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [draft, setDraft] = useState('');
  const [loadedCaptureId, setLoadedCaptureId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const cancelTitleBlurRef = useRef(false);
  const isProcessing = processingIds.has(captureId);
  const loading = isProcessing || loadedCaptureId !== captureId;
  const capture = captures.find((item) => item.id === captureId);
  const displayedTitle = capturesLoading ? 'Conversation' : capture?.title || 'Untitled capture';

  useEffect(() => {
    if (isProcessing) return;
    let active = true;

    const loadMessages = async () => {
      try {
        const response = await getMessages(captureId);
        if (active) {
          setMessages(response.messages);
          setError(null);
          setLoadedCaptureId(captureId);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.detail : 'Unable to load this conversation.');
          setLoadedCaptureId(captureId);
        }
      }
    };

    void loadMessages();
    return () => {
      active = false;
    };
  }, [captureId, isProcessing]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const saveCaptureTitle = async (value: string) => {
    const nextTitle = value.trim();
    const previousTitle = capture?.title || 'Untitled capture';
    setEditingTitle(false);

    if (!nextTitle) {
      setTitleDraft(previousTitle);
      return;
    }
    if (nextTitle === previousTitle) return;

    setSavingTitle(true);
    setError(null);
    try {
      const updatedCapture = await updateCaptureTitle(captureId, nextTitle);
      setTitleDraft(updatedCapture.title || 'Untitled capture');
      void refresh();
    } catch (err) {
      setTitleDraft(previousTitle);
      setError(err instanceof ApiError ? err.detail : 'Unable to update this title.');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (cancelTitleBlurRef.current) {
      cancelTitleBlurRef.current = false;
      return;
    }
    void saveCaptureTitle(event.currentTarget.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: MessageResponse = {
      id: optimisticId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setError(null);
    setMessages((current) => [...current, optimisticMessage]);
    setSending(true);

    try {
      const reply = await postMessage(captureId, content);
      setMessages((current) => [...current, reply]);
      setDraft('');
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setError(err instanceof ApiError ? err.detail : 'Unable to send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center border-b border-[#d8dadc] bg-white/70 px-5 sm:px-8">
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                cancelTitleBlurRef.current = true;
                event.currentTarget.blur();
                setTitleDraft(displayedTitle);
                setEditingTitle(false);
              }
            }}
            aria-label="Conversation title"
            className="h-9 w-full max-w-md rounded-md border border-[#d8dadc] bg-white px-3 text-sm font-semibold text-[#1e293b] outline-none focus:border-[#0D9488]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(displayedTitle);
              setEditingTitle(true);
            }}
            disabled={capturesLoading || savingTitle}
            aria-label={`Edit title: ${displayedTitle}`}
            className="group flex min-w-0 items-center gap-2 text-sm font-semibold text-[#1e293b] disabled:cursor-default"
          >
            <span className="truncate">{displayedTitle}</span>
            <Pencil size={14} className="shrink-0 text-[#94a3b8] transition-colors group-hover:text-[#0D9488]" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {isProcessing ? (
            <p className="py-8 text-center text-sm text-[#94a3b8]">Setting up this conversation...</p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-[#94a3b8]">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#94a3b8]">Start the conversation with a message.</p>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
                      isUser
                        ? 'rounded-br-sm bg-[#0D9488] text-white'
                        : 'rounded-bl-sm border border-[#d8dadc] bg-white text-[#1e293b]'
                    }`}
                  >
                    {message.content}
                  </p>
                </div>
              );
            })
          )}
          {sending && (
            <div className="flex justify-start" role="status" aria-label="Assistant is thinking">
              <p className="rounded-2xl rounded-bl-sm border border-[#d8dadc] bg-white px-4 py-3 text-sm text-[#64748b]">
                Thinking...
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[#d8dadc] bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={loading || sending}
            placeholder="Write a message..."
            aria-label="Message"
            className="h-12 min-w-0 flex-1 rounded-lg border border-[#d8dadc] bg-[#f7f9fb] px-4 text-sm text-[#1e293b] outline-none placeholder:text-[#94a3b8] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || sending || !draft.trim()}
            aria-label="Send message"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0D9488] text-white transition-colors hover:bg-[#0b7a70] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}