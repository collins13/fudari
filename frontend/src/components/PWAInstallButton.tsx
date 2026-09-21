'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'tx-pwa-install-dismissed-at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

interface PWAInstallButtonProps {
  /** Visual variant */
  variant?: 'pill' | 'compact';
  className?: string;
}

export default function PWAInstallButton({ variant = 'pill', className = '' }: PWAInstallButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    // Honour recent dismissal
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // Show the iOS instructions button if no native prompt is available
    if (isIOS()) setInstallable(true);

    const onInstalled = () => {
      setInstallable(false);
      setDeferred(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onClick = useCallback(async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'dismissed') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
      setDeferred(null);
      setInstallable(false);
      return;
    }
    if (isIOS()) {
      setShowIosSheet(true);
    }
  }, [deferred]);

  if (!installable) return null;

  const baseBtn =
    variant === 'compact'
      ? 'tx-pwa-btn tx-pwa-btn--compact'
      : 'tx-pwa-btn tx-pwa-btn--pill';

  return (
    <>
      <button type="button" onClick={onClick} className={`${baseBtn} ${className}`} aria-label="Install FUDARI app">
        <i className="fa-solid fa-download"></i>
        <span>Install app</span>
      </button>

      {showIosSheet && (
        <div className="tx-pwa-sheet" role="dialog" aria-modal="true" onClick={() => setShowIosSheet(false)}>
          <div className="tx-pwa-sheet__card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tx-pwa-sheet__close"
              aria-label="Close"
              onClick={() => setShowIosSheet(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="tx-pwa-sheet__icon">
              <i className="fa-solid fa-mobile-screen"></i>
            </div>
            <h5 className="fw-bold mb-2">Install FUDARI on iPhone</h5>
            <p className="text-muted small mb-3">Get the full-screen app experience in two taps.</p>
            <ol className="tx-pwa-sheet__steps">
              <li>
                Tap the <strong>Share</strong> icon
                <span className="tx-pwa-inline-icon"><i className="fa-solid fa-arrow-up-from-bracket"></i></span>
                in the Safari toolbar.
              </li>
              <li>
                Scroll and tap <strong>“Add to Home Screen”</strong>
                <span className="tx-pwa-inline-icon"><i className="fa-solid fa-square-plus"></i></span>.
              </li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <button type="button" className="btn btn-primary w-100 rounded-pill" onClick={() => setShowIosSheet(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .tx-pwa-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          border: 0;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .tx-pwa-btn i { font-size: 0.875rem; }
        .tx-pwa-btn:active { transform: scale(0.97); }

        .tx-pwa-btn--pill {
          background: linear-gradient(135deg, #157A83 0%, #0D5C63 100%);
          color: #fff;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          box-shadow: 0 4px 14px -4px rgba(13, 92, 99, 0.55);
        }
        .tx-pwa-btn--pill:hover {
          box-shadow: 0 8px 22px -4px rgba(13, 92, 99, 0.65);
          transform: translateY(-1px);
        }

        .tx-pwa-btn--compact {
          background: rgba(13, 92, 99, 0.1);
          color: #0d5c63;
          padding: 0.4rem 0.85rem;
          border-radius: 0.5rem;
        }
        .tx-pwa-btn--compact:hover { background: rgba(13, 92, 99, 0.18); }

        /* iOS instructions sheet */
        .tx-pwa-sheet {
          position: fixed;
          inset: 0;
          background: rgba(13, 20, 38, 0.55);
          backdrop-filter: blur(4px);
          z-index: 1080;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
          animation: txPwaFade 0.18s ease;
        }
        @keyframes txPwaFade { from { opacity: 0; } to { opacity: 1; } }

        .tx-pwa-sheet__card {
          background: #fff;
          width: 100%;
          max-width: 420px;
          border-radius: 18px;
          padding: 1.5rem 1.25rem 1.25rem;
          position: relative;
          animation: txPwaSlideUp 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.2);
        }
        @keyframes txPwaSlideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        [data-bs-theme="dark"] .tx-pwa-sheet__card { background: #1a1d24; color: #e7e9ed; }

        @media (min-width: 576px) {
          .tx-pwa-sheet { align-items: center; }
        }

        .tx-pwa-sheet__close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border: 0;
          background: rgba(13, 20, 38, 0.06);
          color: inherit;
          border-radius: 50%;
          cursor: pointer;
        }
        .tx-pwa-sheet__close:hover { background: rgba(13, 20, 38, 0.12); }

        .tx-pwa-sheet__icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #157A83 0%, #0D5C63 100%);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin-bottom: 0.75rem;
          box-shadow: 0 8px 20px -6px rgba(13, 92, 99, 0.55);
        }

        .tx-pwa-sheet__steps {
          padding-left: 1.1rem;
          margin: 0 0 1.25rem;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .tx-pwa-sheet__steps li { margin-bottom: 0.5rem; }
        .tx-pwa-inline-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          background: rgba(13, 20, 38, 0.06);
          margin: 0 0.25rem;
          font-size: 0.75rem;
          vertical-align: -0.2rem;
        }
      `}</style>
    </>
  );
}
