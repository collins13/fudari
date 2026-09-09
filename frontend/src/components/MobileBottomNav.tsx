'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { whatsappBotLink } from '@/lib/whatsapp';

// Dashboard and estate routes have their own chrome, so the customer bar stays out of them.
const HIDDEN_PREFIXES = ['/dashboard', '/estate', '/login', '/register', '/complete-profile', '/forgot-password'];

export default function MobileBottomNav() {
  const pathname = usePathname() || '/';
  const { user } = useAuth();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const accountHref = user ? '/dashboard' : '/login';

  return (
    <>
      <nav className="tx-bottom-nav d-lg-none" aria-label="Primary">
        <Link href="/" className={`tx-bottom-nav__item${isActive('/') ? ' is-active' : ''}`}>
          <i className="fa-solid fa-house" aria-hidden="true"></i>
          <span>Home</span>
        </Link>

        <Link href="/artisans" className={`tx-bottom-nav__item${isActive('/artisans') ? ' is-active' : ''}`}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <span>Find help</span>
        </Link>

        <a
          href={whatsappBotLink('Hi, I need a service provider.')}
          target="_blank"
          rel="noopener noreferrer"
          className="tx-bottom-nav__item tx-bottom-nav__item--cta"
        >
          <span className="tx-bottom-nav__cta">
            <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
          </span>
          <span>Book</span>
        </a>

        <Link href="/track" className={`tx-bottom-nav__item${isActive('/track') ? ' is-active' : ''}`}>
          <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
          <span>Track</span>
        </Link>

        <Link href={accountHref} className={`tx-bottom-nav__item${isActive('/dashboard') ? ' is-active' : ''}`}>
          <i className="fa-solid fa-user" aria-hidden="true"></i>
          <span>{user ? 'Account' : 'Sign in'}</span>
        </Link>
      </nav>

      {/* Global, not scoped: styled-jsx does not add its scope class to <Link> children. */}
      <style jsx global>{`
        @media (max-width: 991.98px) {
          body {
            padding-bottom: calc(64px + env(safe-area-inset-bottom));
          }
          /* Keep the WhatsApp bubble clear of the bar. */
          .tx-wa-fab {
            bottom: calc(78px + env(safe-area-inset-bottom)) !important;
          }
          .tx-wa-panel {
            bottom: calc(148px + env(safe-area-inset-bottom)) !important;
          }
        }

        .tx-bottom-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1040;
          display: flex;
          align-items: stretch;
          justify-content: space-around;
          height: calc(64px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: var(--bs-body-bg, #fff);
          border-top: 1px solid var(--bs-border-color, #e5e7eb);
          box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
        }

        .tx-bottom-nav__item {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-width: 0;
          padding: 6px 2px;
          font-size: 0.66rem;
          font-weight: 500;
          line-height: 1.1;
          color: #6c757d;
          text-decoration: none;
          text-align: center;
        }

        .tx-bottom-nav__item i {
          font-size: 1.15rem;
        }

        .tx-bottom-nav__item.is-active {
          color: var(--bs-primary);
        }

        .tx-bottom-nav__item--cta {
          color: #198754;
        }

        .tx-bottom-nav__cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          margin-top: -18px;
          border-radius: 50%;
          background: var(--tx-whatsapp);
          color: #fff;
          box-shadow: 0 4px 10px rgba(37, 211, 102, 0.4);
        }

        .tx-bottom-nav__cta i {
          font-size: 1.3rem;
        }
      `}</style>
    </>
  );
}
