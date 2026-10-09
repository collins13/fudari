'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import PWAInstallButton from '@/components/PWAInstallButton';

interface NavbarProps {
  /** Use over a dark hero. Becomes solid+shadowed on scroll. */
  transparent?: boolean;
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/artisans', label: 'Find Help' },
  { href: '/pricing', label: 'Pricing' },
];

const THEME_EVENT = 'fudari:theme';

const subscribeTheme = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
};

const readTheme = () =>
  document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';

export default function Navbar({ transparent = false }: NavbarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'light' as const);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', saved);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  // Track scroll only when transparent (so the header darkens after hero)
  useEffect(() => {
    if (!transparent) return;
    const getScrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const onScroll = () => setScrolled(getScrollTop() > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparent]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/artisans?q=${encodeURIComponent(q)}` : '/artisans');
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  // Light text styling when transparent and not yet scrolled
  const onDark = transparent && !scrolled;

  const navClass = useMemo(() => {
    const base = 'tx-navbar navbar navbar-expand-xl sticky-top';
    if (transparent) {
      return `${base} ${scrolled ? 'tx-navbar--solid' : 'tx-navbar--transparent'}`;
    }
    return `${base} tx-navbar--solid`;
  }, [transparent, scrolled]);

  const initials = user
    ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`.toUpperCase() || 'U'
    : '';

  return (
    <>
      <nav className={navClass}>
        <div className="container">
          {/* Brand */}
          <Link href="/" className="navbar-brand d-flex align-items-center gap-2 m-0 p-0">
            <Logo variant={onDark ? 'white' : 'dark'} height={32} />
          </Link>

          {/* Right cluster (always visible) */}
          <div className="d-flex order-xl-2 align-items-center gap-2">
            <span className="d-none d-md-inline-flex">
              <PWAInstallButton variant="compact" />
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              className="tx-icon-btn"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <i className={theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
            </button>

            {user ? (
              <div className="dropdown">
                <button
                  className="tx-user-chip"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  data-bs-offset="0,4"
                  data-bs-strategy="fixed"
                >
                  <span className="tx-avatar">{initials}</span>
                  <span className="d-none d-sm-inline fw-medium">{user.firstName}</span>
                  <i className="fa-solid fa-chevron-down small"></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 mt-2" style={{ minWidth: '220px', right: 0, left: 'auto' }}>
                  <li className="px-3 py-2 small text-muted">
                    Signed in as <strong className="d-block text-body">{user.email}</strong>
                  </li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" href="/dashboard">
                      <i className="fa-solid fa-gauge text-primary"></i> Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" href="/dashboard/bookings">
                      <i className="fa-regular fa-calendar text-primary"></i> Bookings
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" href="/dashboard/profile">
                      <i className="fa-regular fa-user text-primary"></i> Profile
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2 text-danger" onClick={logout}>
                      <i className="fa-solid fa-right-from-bracket"></i> Sign out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn btn-sm tx-btn-ghost d-none d-sm-inline-flex">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm rounded-pill px-3 fw-medium">
                  <i className="fa-solid fa-plus me-1 d-none d-sm-inline"></i>
                  Join free
                </Link>
              </>
            )}

            <button
              className="tx-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#txNavMenu"
              aria-controls="txNavMenu"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span></span><span></span><span></span>
            </button>
          </div>

          {/* Center: links + (desktop) search */}
          <div className="collapse navbar-collapse" id="txNavMenu">
            <ul className="navbar-nav m-auto mb-2 mb-xl-0 align-items-xl-center gap-xl-1">
              {NAV_LINKS.map((l) => (
                <li className="nav-item" key={l.href}>
                  <Link
                    href={l.href}
                    className={`nav-link tx-nav-link ${isActive(l.href) ? 'is-active' : ''}`}
                    aria-current={isActive(l.href) ? 'page' : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="nav-item dropdown">
                <button
                  className="nav-link tx-nav-link dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  For Pros
                </button>
                <ul className="dropdown-menu shadow border-0 rounded-3 mt-2">
                  <li><Link className="dropdown-item" href="/register">Join as a Pro</Link></li>
                  <li><Link className="dropdown-item" href="/login">Pro Login</Link></li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li><Link className="dropdown-item" href="/pricing">View Packages</Link></li>
                </ul>
              </li>
            </ul>

            {!transparent && (
              <form className="tx-quick-search d-none d-xl-flex" onSubmit={onSearchSubmit} role="search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="search"
                  placeholder="Search electrician, plumber…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search services"
                />
              </form>
            )}

            {!user && (
              <div className="d-sm-none d-flex flex-column gap-2 mt-3">
                <Link href="/login" className="btn btn-outline-primary rounded-pill">Sign in</Link>
                <Link href="/register" className="btn btn-primary rounded-pill">Join free as a Pro</Link>
              </div>
            )}

            <div className="d-md-none d-flex justify-content-center mt-3">
              <PWAInstallButton />
            </div>
          </div>
        </div>
      </nav>

      <style jsx global>{`
        .tx-navbar {
          padding-block: 0.75rem;
          transition: background 0.25s ease, box-shadow 0.25s ease, color 0.25s ease;
        }
        /* At full size the wordmark plus the action cluster exceeds a small
           phone's width, which wrapped the navbar onto two rows. */
        @media (max-width: 575.98px) {
          .tx-navbar .navbar-brand svg {
            height: clamp(18px, 5.2vw, 30px);
            width: auto;
          }
        }
        @media (max-width: 575px) {
          /* Keep user dropdown inside the viewport on small phones */
          .tx-user-chip + .dropdown-menu {
            position: fixed !important;
            right: 0.75rem !important;
            left: auto !important;
            top: auto !important;
            max-width: calc(100vw - 1.5rem);
          }
        }
        .tx-navbar--solid {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: saturate(180%) blur(14px);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          box-shadow: 0 1px 0 rgba(13, 20, 38, 0.06), 0 6px 20px -12px rgba(13, 20, 38, 0.18);
          color: #0d1426;
        }
        /* Explicit dark-on-white in solid (light) state — prevents leakage from --transparent */
        .tx-navbar--solid .tx-nav-link,
        .tx-navbar--solid .navbar-brand,
        .tx-navbar--solid .tx-icon-btn,
        .tx-navbar--solid .tx-btn-ghost,
        .tx-navbar--solid .tx-toggler {
          color: #0d1426 !important;
        }
        .tx-navbar--solid .tx-nav-link:hover,
        .tx-navbar--solid .tx-nav-link.is-active {
          color: var(--bs-primary) !important;
        }
        .tx-navbar--solid .tx-user-chip {
          background: #fff;
          color: #0d1426;
          border-color: rgba(13, 20, 38, 0.12);
        }
        .tx-navbar--solid .dropdown-toggle,
        .tx-navbar--solid .nav-link {
          color: #0d1426;
        }
        [data-bs-theme="dark"] .tx-navbar--solid {
          background: rgba(20, 22, 30, 0.85);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 6px 20px -12px rgba(0, 0, 0, 0.5);
          color: #e7e9ed;
        }
        [data-bs-theme="dark"] .tx-navbar--solid .tx-nav-link,
        [data-bs-theme="dark"] .tx-navbar--solid .navbar-brand,
        [data-bs-theme="dark"] .tx-navbar--solid .tx-icon-btn,
        [data-bs-theme="dark"] .tx-navbar--solid .tx-btn-ghost,
        [data-bs-theme="dark"] .tx-navbar--solid .tx-toggler {
          color: #e7e9ed !important;
        }
        [data-bs-theme="dark"] .tx-navbar--solid .tx-user-chip {
          background: rgba(255, 255, 255, 0.06);
          color: #e7e9ed;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .tx-navbar--transparent {
          background: transparent;
          box-shadow: none;
          color: #fff;
        }
        .tx-navbar--transparent .tx-nav-link,
        .tx-navbar--transparent .navbar-brand,
        .tx-navbar--transparent .tx-icon-btn,
        .tx-navbar--transparent .tx-btn-ghost,
        .tx-navbar--transparent .tx-toggler {
          color: #fff;
        }
        .tx-navbar--transparent .tx-icon-btn:hover,
        .tx-navbar--transparent .tx-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .tx-nav-link {
          position: relative;
          font-weight: 500;
          font-size: 0.95rem;
          padding: 0.5rem 0.85rem !important;
          border-radius: 0.5rem;
          color: var(--bs-body-color);
          transition: color 0.15s ease, background 0.15s ease;
        }
        .tx-nav-link:hover { color: var(--bs-primary); }
        .tx-nav-link.is-active { color: var(--bs-primary); }
        .tx-nav-link.is-active::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 4px;
          transform: translateX(-50%);
          width: 18px;
          height: 2px;
          background: var(--bs-primary);
          border-radius: 2px;
        }

        .tx-icon-btn {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: var(--bs-body-color);
          border-radius: 50%;
          transition: background 0.15s ease;
        }
        .tx-icon-btn:hover { background: rgba(13, 20, 38, 0.06); }
        [data-bs-theme="dark"] .tx-icon-btn:hover { background: rgba(255, 255, 255, 0.08); }

        .tx-btn-ghost {
          padding: 0.4rem 1rem;
          border-radius: 999px;
          font-weight: 500;
          color: var(--bs-body-color);
          background: transparent;
          border: 1px solid transparent;
        }
        .tx-btn-ghost:hover { background: rgba(13, 20, 38, 0.05); color: var(--bs-primary); }

        .tx-user-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.85rem 0.3rem 0.3rem;
          border: 1px solid rgba(13, 20, 38, 0.1);
          background: #fff;
          border-radius: 999px;
          font-size: 0.875rem;
          color: var(--bs-body-color);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .tx-user-chip:hover {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 4px rgba(13, 92, 99, 0.12);
        }
        [data-bs-theme="dark"] .tx-user-chip {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .tx-navbar--transparent .tx-user-chip {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          color: #fff;
        }

        .tx-avatar {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #157A83, #0D5C63);
          color: #fff;
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
        }

        .tx-quick-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(13, 20, 38, 0.04);
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 0.4rem 1rem;
          width: 280px;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .tx-quick-search:focus-within {
          background: #fff;
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 4px rgba(13, 92, 99, 0.14);
        }
        .tx-quick-search i { color: rgba(13, 20, 38, 0.5); font-size: 0.875rem; }
        .tx-quick-search input {
          border: 0;
          background: transparent;
          flex: 1;
          font-size: 0.9rem;
          outline: none;
          color: var(--bs-body-color);
        }
        [data-bs-theme="dark"] .tx-quick-search { background: rgba(255, 255, 255, 0.06); }
        [data-bs-theme="dark"] .tx-quick-search:focus-within { background: rgba(255, 255, 255, 0.1); }

        .tx-toggler {
          display: none;
          width: 40px;
          height: 40px;
          border: 0;
          background: transparent;
          border-radius: 0.5rem;
          padding: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: var(--bs-body-color);
        }
        .tx-toggler span {
          display: block;
          width: 22px;
          height: 2px;
          background: currentColor;
          border-radius: 2px;
        }
        @media (max-width: 1199.98px) {
          .tx-toggler { display: inline-flex; }
        }
        .tx-navbar--transparent .tx-toggler { color: #fff; }

        @media (max-width: 1199.98px) {
          .tx-navbar .navbar-collapse {
            margin-top: 0.75rem;
            background: #fff;
            border-radius: 0.75rem;
            padding: 0.75rem;
            box-shadow: 0 12px 32px -8px rgba(13, 20, 38, 0.15);
            color: #0d1426;
          }
          /* Inside the mobile menu panel, always use dark text — even when navbar is transparent */
          .tx-navbar .navbar-collapse .tx-nav-link,
          .tx-navbar .navbar-collapse .dropdown-toggle {
            color: #0d1426;
          }
          .tx-navbar .navbar-collapse .tx-nav-link:hover,
          .tx-navbar .navbar-collapse .tx-nav-link.is-active {
            color: var(--bs-primary);
          }
          [data-bs-theme="dark"] .tx-navbar .navbar-collapse {
            background: #1a1d24;
            color: #e7e9ed;
          }
          [data-bs-theme="dark"] .tx-navbar .navbar-collapse .tx-nav-link,
          [data-bs-theme="dark"] .tx-navbar .navbar-collapse .dropdown-toggle {
            color: #e7e9ed;
          }
          .tx-navbar--transparent .tx-nav-link { color: var(--bs-body-color); }
          .tx-nav-link.is-active::after { display: none; }
          .tx-nav-link.is-active { background: rgba(13, 92, 99, 0.09); }
        }
      `}</style>
    </>
  );
}
