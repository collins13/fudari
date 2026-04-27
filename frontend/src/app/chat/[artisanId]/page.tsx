'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { messagesAPI, workersAPI, aiAPI } from '@/lib/api';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtisanInfo {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string;
  locationName?: string;
  trustScore?: number;
  skills?: { skillType: string }[];
}

interface MessageResponse {
  id: number | string;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  pendingId?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function skillLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CustomerChatPage() {
  const { artisanId } = useParams<{ artisanId: string }>();
  const searchParams = useSearchParams();
  const bookingCode = searchParams.get('booking') ?? undefined;

  const [artisan, setArtisan] = useState<ArtisanInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [thread, setThread] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  // Guest identity modal state
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestPhone, setGuestPhone] = useState('+254');
  const [guestName, setGuestName] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [chatReady, setChatReady] = useState(false);

  // ── AI Chat Assistant state (Feature 3) ──
  const [aiAssistantMessage, setAiAssistantMessage] = useState<string | null>(null);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);
  const aiIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCustomerMsgRef = useRef<string>('');

  const stompRef = useRef<Client | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingIdsRef = useRef<Set<string>>(new Set());

  // ── 1. Load artisan profile ───────────────────────────────────────────────
  useEffect(() => {
    if (!artisanId) return;
    workersAPI.getWorkerProfile(Number(artisanId)).then((res) => {
      setArtisan(res.data);
    });
  }, [artisanId]);

  // ── 2. Check if already logged in ────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (token && userRaw) {
      try {
        const u = JSON.parse(userRaw);
        setCurrentUserId(u.id ?? u.userId);
        setChatReady(true);
      } catch {
        setShowGuestModal(true);
      }
    } else {
      setShowGuestModal(true);
    }
  }, []);

  // ── 3. Load thread once chatReady + artisanId are both set ───────────────
  useEffect(() => {
    if (!chatReady || !artisanId) return;
    (async () => {
      try {
        setLoadingThread(true);
        const res = await messagesAPI.getThread(Number(artisanId));
        setThread(res.data ?? []);
      } catch {
        /* ignore — no messages yet */
      } finally {
        setLoadingThread(false);
      }
    })();
  }, [chatReady, artisanId]);

  // ── 4. Auto-scroll on new messages ───────────────────────────────────────
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // ── 5. WebSocket connection ───────────────────────────────────────────────
  useEffect(() => {
    if (!chatReady) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8080';

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/user/queue/messages', (frame: IMessage) => {
          const msg: MessageResponse = JSON.parse(frame.body);

          // Server echo of our own send — replace optimistic bubble, don't duplicate
          if (msg.pendingId && pendingIdsRef.current.has(msg.pendingId)) {
            pendingIdsRef.current.delete(msg.pendingId);
            setThread((prev) =>
              prev.map((m) => (m.id === msg.pendingId ? { ...msg } : m))
            );
            return;
          }

          // Message from the artisan — append
          if (
            msg.senderId === Number(artisanId) ||
            msg.receiverId === Number(artisanId)
          ) {
            setThread((prev) => [...prev, msg]);
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, [chatReady, artisanId]);

  // ── Guest identification ──────────────────────────────────────────────────
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestPhone || guestPhone.length < 10) {
      setGuestError('Enter a valid phone number');
      return;
    }
    try {
      setGuestLoading(true);
      setGuestError('');
      const res = await api.post('/auth/guest-token', {
        phoneNumber: guestPhone,
        name: guestName || undefined,
      });
      // AuthResponse is a flat object: { token, userId, firstName, lastName, ... }
      const data = res.data;
      const user = {
        id: data.userId,
        email: data.email,
        phoneNumber: data.phoneNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        vettingLevel: data.vettingLevel,
      };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUserId(user.id);
      setShowGuestModal(false);
      setChatReady(true);
    } catch {
      setGuestError('Could not identify you. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !artisanId || !currentUserId) return;

    const payload = {
      receiverId: Number(artisanId),
      content: text,
      bookingCode,
    };

    if (stompRef.current?.connected) {
      const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pendingIdsRef.current.add(pendingId);

      stompRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ ...payload, pendingId }),
      });

      // Optimistic bubble — will be replaced when server echo arrives
      setThread((prev) => [
        ...prev,
        {
          id: pendingId,
          senderId: currentUserId,
          senderName: 'You',
          receiverId: Number(artisanId),
          receiverName: artisan?.firstName ?? '',
          content: text,
          isRead: false,
          createdAt: new Date().toISOString(),
          pendingId,
        },
      ]);
    } else {
      messagesAPI.send(payload).then((res) => {
        setThread((prev) => [...prev, res.data]);
      });
    }

    setInput('');
    inputRef.current?.focus();

    // ── AI idle timer: if artisan hasn't replied in 10 min, trigger assistant ──
    lastCustomerMsgRef.current = text;
    setAiAssistantVisible(false);
    if (aiIdleTimerRef.current) clearTimeout(aiIdleTimerRef.current);
    aiIdleTimerRef.current = setTimeout(async () => {
      // Only fire if the last message is still from the customer (no artisan reply)
      try {
        const history = thread
          .slice(-6)
          .map((m) => `${m.senderId === currentUserId ? 'Customer' : 'Artisan'}: ${m.content}`)
          .join('\n');

        const res = await aiAPI.chatAssistant({
          artisanFirstName: artisan?.firstName ?? 'the artisan',
          artisanSkill: artisan?.skills?.[0]?.skillType ?? 'ARTISAN',
          conversationHistory: history,
          customerLastMessage: text,
        });
        setAiAssistantMessage(res.data.customerMessage);
        setAiAssistantVisible(true);
      } catch { /* silently ignore */ }
    }, 10 * 60 * 1000); // 10 minutes
  }, [input, artisanId, currentUserId, bookingCode, artisan, thread]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : 'Artisan';
  const primarySkill = artisan?.skills?.[0]?.skillType;

  return (
    <>
      <Navbar />

      {/* Guest identity modal */}
      {showGuestModal && (
        <div
          className="modal d-flex align-items-center justify-content-center"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          }}
        >
          <div className="card border-0 rounded-4 shadow-lg p-4" style={{ width: '100%', maxWidth: 400 }}>
            <h5 className="fw-bold mb-1">Who are you?</h5>
            <p className="text-muted small mb-4">
              Enter your phone number to chat with {artisan?.firstName ?? 'this artisan'}. No account needed.
            </p>
            <form onSubmit={handleGuestSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Phone number</label>
                <input
                  type="tel"
                  className="form-control rounded-3"
                  placeholder="+254712345678"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Your name <span className="text-muted">(optional)</span></label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  placeholder="e.g. John Kamau"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              {guestError && (
                <div className="alert alert-danger py-2 small rounded-3">{guestError}</div>
              )}
              <div className="d-flex gap-2 mt-3">
                <button
                  type="submit"
                  className="btn btn-primary rounded-5 flex-grow-1"
                  disabled={guestLoading}
                >
                  {guestLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Verifying…</>
                  ) : (
                    'Start Chatting'
                  )}
                </button>
                <Link href={`/artisans/${artisanId}`} className="btn btn-outline-secondary rounded-5">
                  Cancel
                </Link>
              </div>
              <p className="text-muted text-center mt-3 mb-0" style={{ fontSize: '0.75rem' }}>
                Already have an account?{' '}
                <Link href={`/login?redirect=/chat/${artisanId}`} className="text-primary">Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Chat UI */}
      <div className="container py-4" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <Link href={`/artisans/${artisanId}`} className="btn btn-sm btn-outline-secondary rounded-5">
            <i className="fa-solid fa-arrow-left me-1" />Back
          </Link>
          {artisan && (
            <>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                style={{
                  width: 46, height: 46, fontSize: '0.9rem',
                  backgroundImage: artisan.profileImage ? `url(${artisan.profileImage})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  backgroundColor: artisan.profileImage ? 'transparent' : '#6366f1',
                }}
              >
                {!artisan.profileImage && initials(artisanName)}
              </div>
              <div>
                <div className="fw-bold">{artisanName}</div>
                <div className="text-muted small">
                  {primarySkill && <span>{skillLabel(primarySkill)}</span>}
                  {artisan.locationName && (
                    <span> · <i className="fa-solid fa-location-dot me-1" />{artisan.locationName}</span>
                  )}
                </div>
              </div>
            </>
          )}
          <span
            className={`badge ms-auto ${connected ? 'bg-success' : 'bg-secondary'}`}
            style={{ fontSize: '0.72rem' }}
          >
            {connected ? '● Live' : '○ Connecting…'}
          </span>
        </div>

        {bookingCode && (
          <div className="alert alert-info rounded-3 py-2 small mb-3">
            <i className="fa-solid fa-link me-2" />
            Chatting about booking <strong>{bookingCode}</strong>
          </div>
        )}

        {/* Chat card */}
        <div
          className="card border-0 shadow-sm rounded-4 d-flex flex-column"
          style={{ height: 'calc(100vh - 300px)', minHeight: 420 }}
        >
          {/* Messages */}
          <div className="flex-grow-1 p-3 overflow-auto" style={{ background: '#f8f9fa' }}>
            {!chatReady ? (
              <div className="text-center text-muted py-5">
                <i className="fa-solid fa-lock fa-2x mb-2 d-block opacity-25" />
                Enter your phone number above to start chatting
              </div>
            ) : loadingThread ? (
              <div className="text-center text-muted py-5">
                <div className="spinner-border spinner-border-sm" />
              </div>
            ) : thread.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="fa-solid fa-comment fa-2x mb-2 d-block opacity-25" />
                No messages yet — say hello to {artisan?.firstName}!
              </div>
            ) : (
              thread.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
                  >
                    <div
                      className="px-3 py-2 rounded-3 shadow-sm"
                      style={{
                        maxWidth: '72%',
                        background: isMine ? '#6366f1' : '#ffffff',
                        color: isMine ? '#ffffff' : '#212529',
                        borderBottomRightRadius: isMine ? 4 : undefined,
                        borderBottomLeftRadius: !isMine ? 4 : undefined,
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                      }}
                    >
                      <div>{msg.content}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: 4, opacity: 0.6, textAlign: 'right' }}>
                        {formatTime(msg.createdAt)}
                        {isMine && <span className="ms-1">{msg.isRead ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* AI assistant bubble — Feature 3 */}
          {aiAssistantVisible && aiAssistantMessage && (
            <div className="px-3 py-2 border-top" style={{ background: 'rgba(99,102,241,0.05)' }}>
              <div className="d-flex align-items-start gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white"
                  style={{ width: 28, height: 28, background: '#6366f1', fontSize: '0.75rem' }}
                >
                  AI
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-primary" style={{ fontSize: '0.78rem' }}>
                    AI Assistant · {artisan?.firstName} is currently busy
                  </div>
                  <p className="mb-1 small text-muted" style={{ lineHeight: 1.5 }}>
                    {aiAssistantMessage}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-sm flex-shrink-0"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => setAiAssistantVisible(false)}
                  aria-label="Dismiss"
                />
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-top bg-white d-flex gap-2" style={{ borderRadius: '0 0 1rem 1rem' }}>
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder={chatReady ? `Message ${artisan?.firstName ?? 'artisan'}…` : 'Identify yourself first…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!chatReady}
              style={{ borderRadius: 24, fontSize: '0.9rem' }}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44, borderRadius: '50%', padding: 0 }}
              onClick={sendMessage}
              disabled={!input.trim() || !chatReady}
              aria-label="Send"
            >
              <i className="fas fa-paper-plane" style={{ fontSize: '0.9rem' }} />
            </button>
          </div>
        </div>

        {/* Book CTA */}
        <div className="mt-4 text-center">
          <p className="text-muted small mb-2">Ready to hire?</p>
          <Link
            href={`/artisans/${artisanId}/book`}
            className="btn btn-primary rounded-5"
          >
            <i className="fa-solid fa-calendar-check me-2" />Book {artisan?.firstName ?? 'this artisan'}
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
