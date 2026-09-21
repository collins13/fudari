'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { messagesAPI } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageResponse {
  id: number | string; // string when optimistic (pendingId used as id)
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  receiverId: number;
  receiverName: string;
  content: string;
  isRead: boolean;
  bookingCode: string | null;
  createdAt: string;
  pendingId?: string | null; // echoed back by server to replace optimistic entry
}

interface ConversationSummary {
  partnerId: number;
  partnerName: string;
  partnerAvatar: string | null;
  partnerRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activePartner, setActivePartner] = useState<ConversationSummary | null>(null);
  const [thread, setThread] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [connected, setConnected] = useState(false);

  const stompRef = useRef<Client | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks pendingIds of optimistic messages awaiting server confirmation
  const pendingIdsRef = useRef<Set<string>>(new Set());

  // ── Read current user from localStorage ──────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setCurrentUserId(u.id ?? u.userId ?? null);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ── Load inbox ────────────────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    try {
      setLoadingInbox(true);
      const res = await messagesAPI.getInbox();
      setConversations(res.data ?? []);
    } catch {
      /* silently ignore auth errors */
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // ── Load thread when active partner changes ───────────────────────────────
  useEffect(() => {
    if (!activePartner) return;
    (async () => {
      try {
        setLoadingThread(true);
        const res = await messagesAPI.getThread(activePartner.partnerId);
        setThread(res.data ?? []);
        // Clear unread badge for this conversation
        setConversations((prev) =>
          prev.map((c) =>
            c.partnerId === activePartner.partnerId ? { ...c, unreadCount: 0 } : c
          )
        );
      } finally {
        setLoadingThread(false);
      }
    })();
  }, [activePartner]);

  // ── Scroll to bottom when thread updates ─────────────────────────────────
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
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

        // Subscribe to private message queue
        client.subscribe('/user/queue/messages', (frame: IMessage) => {
          const msg: MessageResponse = JSON.parse(frame.body);

          // If this is the server confirmation of our own optimistic message,
          // replace the placeholder instead of appending a duplicate.
          if (msg.pendingId && pendingIdsRef.current.has(msg.pendingId)) {
            pendingIdsRef.current.delete(msg.pendingId);
            setThread((prev) =>
              prev.map((m) => (m.id === msg.pendingId ? { ...msg, id: msg.id } : m))
            );
            return;
          }

          // Incoming message from the other party — append to open thread
          setActivePartner((current) => {
            if (
              current &&
              (msg.senderId === current.partnerId || msg.receiverId === current.partnerId)
            ) {
              setThread((prev) => [...prev, msg]);
            }
            return current;
          });

          // Bump unread count in sidebar for other conversations
          setConversations((prev) => {
            const exists = prev.find((c) => c.partnerId === msg.senderId);
            if (exists) {
              return prev.map((c) =>
                c.partnerId === msg.senderId
                  ? {
                      ...c,
                      lastMessage: msg.content,
                      lastMessageAt: msg.createdAt,
                      unreadCount: c.unreadCount + 1,
                    }
                  : c
              );
            }
            // Brand-new conversation — reload inbox
            loadInbox();
            return prev;
          });
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [loadInbox]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = () => {
    const text = input.trim();
    if (!text || !activePartner || !currentUserId) return;

    const payload = { receiverId: activePartner.partnerId, content: text };

    if (stompRef.current?.connected) {
      // Generate a client-side ID to track this optimistic message
      const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pendingIdsRef.current.add(pendingId);

      stompRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ ...payload, pendingId }),
      });

      // Optimistic bubble — use pendingId as temporary id
      const optimistic: MessageResponse = {
        id: pendingId,
        senderId: currentUserId,
        senderName: 'You',
        senderAvatar: null,
        receiverId: activePartner.partnerId,
        receiverName: activePartner.partnerName,
        content: text,
        isRead: false,
        bookingCode: null,
        createdAt: new Date().toISOString(),
        pendingId,
      };
      setThread((prev) => [...prev, optimistic]);
    } else {
      // REST fallback (WebSocket not connected)
      messagesAPI.send(payload).then((res) => {
        setThread((prev) => [...prev, res.data]);
      });
    }

    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Page header */}
      <div className="row mb-3 align-items-center">
        <div className="col">
          <h4 className="mb-0 fw-bold">Messages</h4>
        </div>
        <div className="col-auto">
          <span
            className={`badge ${connected ? 'bg-success' : 'bg-secondary'}`}
            style={{ fontSize: '0.75rem' }}
          >
            {connected ? '● Live' : '○ Connecting…'}
          </span>
        </div>
      </div>

      <div
        className="card shadow-sm"
        style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}
      >
        <div className="row g-0 h-100">
          {/* ── Sidebar: conversation list ── */}
          <div
            className="col-12 col-md-4 border-end d-flex flex-column"
            style={{ overflowY: 'auto' }}
          >
            <div className="p-3 border-bottom">
              <h6
                className="mb-0 fw-semibold text-muted"
                style={{
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Conversations
              </h6>
            </div>

            {loadingInbox ? (
              <div className="p-4 text-center text-muted">
                <div className="spinner-border spinner-border-sm me-2" />
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <i className="fas fa-comments fa-2x mb-2 d-block opacity-25" />
                <p className="mb-0 small">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.partnerId}
                  type="button"
                  onClick={() => setActivePartner(conv)}
                  className="d-flex align-items-center gap-3 p-3 border-bottom text-start w-100 bg-transparent border-0"
                  style={{
                    cursor: 'pointer',
                    background:
                      activePartner?.partnerId === conv.partnerId
                        ? 'rgba(99,102,241,0.08)'
                        : undefined,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold"
                    style={{
                      width: 44,
                      height: 44,
                      fontSize: '0.85rem',
                      backgroundImage: conv.partnerAvatar
                        ? `url(${conv.partnerAvatar})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: conv.partnerAvatar ? 'transparent' : '#6366f1',
                    }}
                  >
                    {!conv.partnerAvatar && initials(conv.partnerName)}
                  </div>

                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                        {conv.partnerName}
                      </span>
                      <small
                        className="text-muted"
                        style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      >
                        {formatTime(conv.lastMessageAt)}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <span
                        className="text-muted text-truncate"
                        style={{ fontSize: '0.8rem', maxWidth: '75%' }}
                      >
                        {conv.lastMessage}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span
                          className="badge rounded-pill bg-primary ms-1"
                          style={{ fontSize: '0.7rem' }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ── Thread: message area ── */}
          <div className="col-12 col-md-8 d-flex flex-column h-100">
            {!activePartner ? (
              <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted">
                <i className="fas fa-comment-dots fa-3x mb-3 opacity-25" />
                <p className="mb-0">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="p-3 border-bottom d-flex align-items-center gap-3 bg-white">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold"
                    style={{
                      width: 40,
                      height: 40,
                      fontSize: '0.8rem',
                      backgroundImage: activePartner.partnerAvatar
                        ? `url(${activePartner.partnerAvatar})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: activePartner.partnerAvatar ? 'transparent' : '#6366f1',
                    }}
                  >
                    {!activePartner.partnerAvatar && initials(activePartner.partnerName)}
                  </div>
                  <div>
                    <div className="fw-semibold">{activePartner.partnerName}</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {activePartner.partnerRole === 'WORKER' ? 'Artisan' : 'Client'}
                    </small>
                  </div>
                </div>

                {/* Message bubbles */}
                <div
                  className="flex-grow-1 p-3 overflow-auto"
                  style={{ background: '#f8f9fa' }}
                >
                  {loadingThread ? (
                    <div className="text-center text-muted py-5">
                      <div className="spinner-border spinner-border-sm" />
                    </div>
                  ) : thread.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-comment fa-2x mb-2 d-block opacity-25" />
                      No messages yet — say hello!
                    </div>
                    ) : (
                    thread.map((msg) => {
                      const isMine = msg.senderId === currentUserId;
                      // Use a composite key: id + content + createdAt to avoid dupes
                      const msgKey = `${msg.id}-${msg.content.substring(0, 20)}-${msg.createdAt}`;
                      return (
                        <div
                          key={msgKey}
                          className={`d-flex mb-3 ${
                            isMine ? 'justify-content-end' : 'justify-content-start'
                          }`}
                        >
                          <div
                            className="px-3 py-2 rounded-3 shadow-sm"
                            style={{
                              maxWidth: '70%',
                              background: isMine ? '#6366f1' : '#ffffff',
                              color: isMine ? '#ffffff' : '#212529',
                              borderBottomRightRadius: isMine ? 4 : undefined,
                              borderBottomLeftRadius: !isMine ? 4 : undefined,
                              fontSize: '0.9rem',
                              lineHeight: 1.5,
                            }}
                          >
                            <div>{msg.content}</div>
                            <div
                              style={{
                                fontSize: '0.7rem',
                                marginTop: 4,
                                opacity: 0.65,
                                textAlign: 'right',
                              }}
                            >
                              {formatTime(msg.createdAt)}
                              {isMine && (
                                <span className="ms-1">{msg.isRead ? '✓✓' : '✓'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={threadEndRef} />
                </div>

                {/* Input bar */}
                <div className="p-3 border-top bg-white d-flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control"
                    placeholder="Type a message…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ borderRadius: 24, fontSize: '0.9rem' }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: '50%', padding: 0 }}
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    aria-label="Send"
                  >
                    <i className="fas fa-paper-plane" style={{ fontSize: '0.9rem' }} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
