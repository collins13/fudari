'use client';

/**
 * Draft persistence and a retry queue for booking submissions.
 *
 * Mobile network handovers in Kenya routinely drop a request mid-submit. Without
 * this, a customer loses everything they typed and usually abandons the booking.
 */

const DRAFT_PREFIX = 'tufixit:booking-draft:';
const OUTBOX_KEY = 'tufixit:booking-outbox';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface BookingDraft {
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  jobDescription: string;
  budget: string;
  urgency: string;
  scheduledTime: string;
}

interface StoredDraft {
  savedAt: number;
  data: BookingDraft;
}

export interface QueuedBooking {
  id: string;
  artisanId: number;
  payload: Record<string, unknown>;
  queuedAt: number;
  attempts: number;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Drafts ──────────────────────────────────────────────────────────────────

export function saveDraft(artisanId: number, data: BookingDraft) {
  if (typeof window === 'undefined') return;
  try {
    const entry: StoredDraft = { savedAt: Date.now(), data };
    localStorage.setItem(DRAFT_PREFIX + artisanId, JSON.stringify(entry));
  } catch {
    /* storage full or blocked — drafts are best-effort */
  }
}

export function loadDraft(artisanId: number): BookingDraft | null {
  if (typeof window === 'undefined') return null;
  const entry = safeParse<StoredDraft>(localStorage.getItem(DRAFT_PREFIX + artisanId));
  if (!entry) return null;
  if (Date.now() - entry.savedAt > DRAFT_TTL_MS) {
    clearDraft(artisanId);
    return null;
  }
  return entry.data;
}

export function clearDraft(artisanId: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_PREFIX + artisanId);
  } catch {
    /* ignore */
  }
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export function readOutbox(): QueuedBooking[] {
  if (typeof window === 'undefined') return [];
  return safeParse<QueuedBooking[]>(localStorage.getItem(OUTBOX_KEY)) || [];
}

function writeOutbox(items: QueuedBooking[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function enqueueBooking(artisanId: number, payload: Record<string, unknown>): QueuedBooking {
  const item: QueuedBooking = {
    id: `${artisanId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    artisanId,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  };
  writeOutbox([...readOutbox(), item]);
  return item;
}

export function removeFromOutbox(id: string) {
  writeOutbox(readOutbox().filter((i) => i.id !== id));
}

export function markAttempt(id: string) {
  writeOutbox(readOutbox().map((i) => (i.id === id ? { ...i, attempts: i.attempts + 1 } : i)));
}

/** A request that never reached the server is safe to retry; a rejected one is not. */
export function isRetryableError(err: unknown): boolean {
  const e = err as { response?: { status?: number }; code?: string };
  if (!e?.response) return true; // network failure / timeout
  const status = e.response.status;
  return status === undefined || status === 0 || status === 408 || status === 429 || status >= 500;
}
