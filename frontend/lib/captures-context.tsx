"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  listCaptures,
  subscribeToCaptureEvents,
  type CaptureListItem,
} from "@/lib/api";

interface CapturesContextValue {
  captures: CaptureListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  processingIds: Set<string>;
  trackCapture: (id: string) => void;
}

const CapturesContext = createContext<CapturesContextValue | undefined>(undefined);

export function CapturesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [captures, setCaptures] = useState<CaptureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(() => new Set());
  const subscriptions = useRef(new Map<string, () => void>());

  const refresh = useCallback(async () => {
    if (!user) {
      setCaptures([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listCaptures();
      setCaptures(response.captures);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load captures.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const refreshTimer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [authLoading, refresh]);

  useEffect(() => {
    if (user) return;
    for (const unsubscribe of subscriptions.current.values()) unsubscribe();
    subscriptions.current.clear();
    const clearProcessingTimer = window.setTimeout(() => setProcessingIds(new Set()), 0);
    return () => window.clearTimeout(clearProcessingTimer);
  }, [user]);

  useEffect(() => () => {
    for (const unsubscribe of subscriptions.current.values()) unsubscribe();
    subscriptions.current.clear();
  }, []);

  const trackCapture = useCallback((id: string) => {
    if (!user || subscriptions.current.has(id)) return;

    setProcessingIds((current) => new Set(current).add(id));
    const unsubscribe = subscribeToCaptureEvents(id, (status) => {
      if (status !== "ready" && status !== "failed") return;
      subscriptions.current.delete(id);
      setProcessingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      void refresh();
    });
    subscriptions.current.set(id, unsubscribe);
  }, [refresh, user]);

  return (
    <CapturesContext.Provider value={{ captures, loading, error, refresh, processingIds, trackCapture }}>
      {children}
    </CapturesContext.Provider>
  );
}

export function useCaptures(): CapturesContextValue {
  const context = useContext(CapturesContext);
  if (!context) {
    throw new Error("useCaptures must be used within a CapturesProvider");
  }
  return context;
}