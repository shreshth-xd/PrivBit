'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Markdown from '@/components/Markdown';
import { ApiError, search, type SearchResponse } from '@/lib/api';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query || loading) return;
    setHasSearched(true);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      setResult(await search(query));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-app-bg text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-card/70 px-6 sm:px-8">
          <span className="text-sm font-semibold">Search</span>
        </header>

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
          <form onSubmit={handleSearch} className="relative mb-8">
            <SearchIcon className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-soft" size={20} />
            <input
              type="text"
              placeholder="Search your captures"
              aria-label="Search your captures"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-14 w-full rounded-xl border border-8a9bb0 bg-card pl-14 pr-28 text-base text-ink outline-none placeholder:text-5b6b80 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="absolute right-2 top-2 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
            >
              Search
            </button>
          </form>

          {error && <p className="mb-5 text-sm text-danger" role="alert">{error}</p>}

          {loading ? (
            <div className="space-y-4" role="status" aria-label="Searching captures">
              <div className="h-4 w-32 animate-pulse rounded bg-dde5ee" />
              <div className="space-y-3 rounded-lg border border-b6c3d1 bg-card p-6">
                <div className="h-4 w-full animate-pulse rounded bg-dde5ee" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-dde5ee" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-dde5ee" />
              </div>
            </div>
          ) : result ? (
            <div className="space-y-5">
              <section className="rounded-lg border border-b6c3d1 bg-card p-5 shadow-sm sm:p-7" aria-label="Search answer">
                <h1 className="mb-4 text-sm font-semibold uppercase text-ink-soft">Answer</h1>
                <div className="text-sm text-ink">
                  <Markdown content={result.answer} />
                </div>
              </section>

              {result.sources.length > 0 ? (
                <section aria-label="Search sources">
                  <p className="mb-3 text-sm font-medium text-ink-soft">Based on {result.sources_count} captures</p>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((source) => (
                      <Link
                        key={source.capture_id}
                        href={`/threads/${source.capture_id}`}
                        className="max-w-full truncate rounded-md border border-b6c3d1 bg-card px-3 py-2 text-sm text-0f172a hover:border-0f766e hover:text-0f766e"
                      >
                        {source.title || 'Untitled capture'}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : (
                <p className="text-sm text-ink-soft">No relevant captures found.</p>
              )}
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-b6c3d1 bg-card text-0f766e">
                <SearchIcon size={24} />
              </div>
              <h1 className="text-xl font-semibold text-0f172a">Ready to search</h1>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}