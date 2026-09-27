'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { ApiError, getMessages, postMessage, type MessageResponse } from '@/lib/api';

export default function ThreadPage() {
  const { captureId } = useParams<{ captureId: string }>();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [draft, setDraft] = useState('');
  const [loadedCaptureId, setLoadedCaptureId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const loading = loadedCaptureId !== captureId;

  useEffect(() => {
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
  }, [captureId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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
        <h2 className="text-sm font-semibold text-[#1e293b]">Conversation</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {loading ? (
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