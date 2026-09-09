'use client';

import { useEffect, useState } from 'react';

const PHONE = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '254703954539').replace(/[^0-9]/g, '');

const QUICK_PROMPTS = [
  { icon: '⚡', label: 'Electrician needed' },
  { icon: '🚰', label: 'Plumbing emergency' },
  { icon: '🚚', label: 'Mover / relocation' },
  { icon: '📦', label: 'Pickup or transport' },
  { icon: '🔧', label: 'Appliance repair' },
  { icon: '🎨', label: 'Painting / renovation' },
  { icon: '💬', label: 'Something else' },
];

function buildLink(text: string) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
}

export default function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  // Stop the attention pulse once the user has opened the widget once
  useEffect(() => {
    if (open) setPulse(false);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* ── Greeting / quick-prompt panel ──────────────────────── */}
      {open && (
        <div className="tx-wa-panel" role="dialog" aria-label="Chat on WhatsApp">
          <div className="tx-wa-panel__header">
            <div className="tx-wa-panel__avatar">
              <i className="fa-brands fa-whatsapp"></i>
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2">
                <strong className="text-white">FUDARI Booking Bot</strong>
                <span className="tx-wa-online">
                  <span className="dot"></span> Online
                </span>
              </div>
              <small className="text-white-50">Typically replies in a few minutes</small>
            </div>
            <button
              type="button"
              className="tx-wa-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="tx-wa-panel__body">
            <div className="tx-wa-bubble">
              <p className="mb-1">👋 Hi there!</p>
              <p className="mb-0 small">
                I can help you book a verified artisan in minutes. What do you need help with?
              </p>
              <span className="tx-wa-bubble__time">Now</span>
            </div>

            <div className="tx-wa-prompts">
              {QUICK_PROMPTS.map((p) => (
                <a
                  key={p.label}
                  href={buildLink(`Hi FUDARI, I need an artisan: ${p.label}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-wa-prompt"
                  onClick={() => setOpen(false)}
                >
                  <span aria-hidden>{p.icon}</span> {p.label}
                </a>
              ))}
            </div>
          </div>

          <a
            href={buildLink('Hi FUDARI, I need help with a job')}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-wa-cta"
            onClick={() => setOpen(false)}
          >
            <i className="fa-brands fa-whatsapp"></i>
            Start chat on WhatsApp
          </a>
        </div>
      )}

      {/* ── Floating button ────────────────────────────────────── */}
      <button
        type="button"
        className={`tx-wa-fab ${open ? 'is-open' : ''} ${pulse && !open ? 'has-pulse' : ''}`}
        aria-label={open ? 'Close chat' : 'Chat on WhatsApp'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <i className="fa-solid fa-xmark"></i>
        ) : (
          <>
            <i className="fa-brands fa-whatsapp"></i>
            <span className="tx-wa-fab__badge" aria-hidden>1</span>
          </>
        )}
      </button>

      <style jsx global>{`
        .tx-wa-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 0;
          background: #25d366;
          color: #fff;
          font-size: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1050;
          box-shadow: 0 10px 30px -8px rgba(37, 211, 102, 0.55),
                      0 4px 12px rgba(0, 0, 0, 0.18);
          transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        .tx-wa-fab:hover {
          transform: scale(1.06);
          background: #1ebe5b;
          box-shadow: 0 14px 36px -8px rgba(37, 211, 102, 0.7),
                      0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .tx-wa-fab:active { transform: scale(0.97); }
        .tx-wa-fab.is-open {
          background: #0d1426;
          font-size: 22px;
        }
        .tx-wa-fab.is-open:hover { background: #1a2236; }

        .tx-wa-fab__badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          background: #0d5c63;
          color: #fff;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
        }

        .tx-wa-fab.has-pulse::before,
        .tx-wa-fab.has-pulse::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(37, 211, 102, 0.55);
          animation: txWaPulse 2s ease-out infinite;
          z-index: -1;
        }
        .tx-wa-fab.has-pulse::after { animation-delay: 1s; }
        @keyframes txWaPulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          80%  { transform: scale(1.7); opacity: 0;   }
          100% { transform: scale(1.7); opacity: 0;   }
        }

        /* ── Panel ─────────────────────────────────────────── */
        .tx-wa-panel {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: min(360px, calc(100vw - 32px));
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          z-index: 1051;
          box-shadow: 0 20px 50px -12px rgba(13, 20, 38, 0.35),
                      0 8px 24px rgba(13, 20, 38, 0.18);
          animation: txWaSlideUp 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 140px);
        }
        @keyframes txWaSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        [data-bs-theme="dark"] .tx-wa-panel { background: #1a1d24; }

        .tx-wa-panel__header {
          background: linear-gradient(135deg, #128c7e 0%, #25d366 100%);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          position: relative;
        }
        .tx-wa-panel__avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }
        .tx-wa-online {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          background: rgba(255, 255, 255, 0.18);
          padding: 2px 8px;
          border-radius: 999px;
          color: #fff;
        }
        .tx-wa-online .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.3);
        }
        .tx-wa-close {
          width: 32px;
          height: 32px;
          border: 0;
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .tx-wa-close:hover { background: rgba(255, 255, 255, 0.28); }

        .tx-wa-panel__body {
          padding: 18px 16px 12px;
          background:
            radial-gradient(circle at 15% 20%, rgba(37, 211, 102, 0.05), transparent 40%),
            #f0f2f5;
          flex: 1;
          overflow-y: auto;
        }
        [data-bs-theme="dark"] .tx-wa-panel__body { background: #11141a; }

        .tx-wa-bubble {
          background: #fff;
          padding: 12px 14px;
          border-radius: 4px 14px 14px 14px;
          max-width: 88%;
          font-size: 0.9rem;
          color: #0d1426;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
          position: relative;
          margin-bottom: 16px;
        }
        [data-bs-theme="dark"] .tx-wa-bubble {
          background: #2a2f3a;
          color: #e7e9ed;
        }
        .tx-wa-bubble__time {
          font-size: 0.65rem;
          color: #9aa0a6;
          float: right;
          margin-left: 8px;
          margin-top: 4px;
        }

        .tx-wa-prompts {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tx-wa-prompt {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #fff;
          border: 1px solid rgba(13, 20, 38, 0.08);
          border-radius: 12px;
          color: #0d1426;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        .tx-wa-prompt:hover {
          border-color: #25d366;
          color: #128c7e;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -4px rgba(37, 211, 102, 0.35);
        }
        [data-bs-theme="dark"] .tx-wa-prompt {
          background: #2a2f3a;
          border-color: rgba(255, 255, 255, 0.08);
          color: #e7e9ed;
        }

        .tx-wa-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #25d366;
          color: #fff;
          padding: 14px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .tx-wa-cta:hover { background: #1ebe5b; color: #fff; }
        .tx-wa-cta i { font-size: 1.15rem; }

        @media (max-width: 575.98px) {
          .tx-wa-fab { bottom: 18px; right: 18px; width: 56px; height: 56px; font-size: 26px; }
          .tx-wa-panel { bottom: 88px; right: 16px; left: 16px; width: auto; }
        }
      `}</style>
    </>
  );
}
