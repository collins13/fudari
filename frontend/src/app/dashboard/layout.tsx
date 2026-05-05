'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Script from 'next/script';
import { authAPI, messagesAPI } from '@/lib/api';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  vettingLevel?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const profileCheckDone = useRef(false);

  // ── Profile completeness gate for artisans ─────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'WORKER' || profileCheckDone.current) return;
    profileCheckDone.current = true;

    authAPI.getCurrentUser()
      .then((res) => {
        const data = res.data;
        const hasSkills = Array.isArray(data.skills) && data.skills.length > 0;
        const hasLocation = !!data.locationName;
        if (!hasSkills || !hasLocation) {
          router.push('/complete-profile');
        }
      })
      .catch(() => {
        // Can't verify — don't block the dashboard
      });
  }, [user, router]);

  useEffect(() => {
    // Disable browser scroll restoration — prevents the browser from
    // trying to restore a previous scroll position while the layout is
    // still stabilising, which causes the violent jitter on reload.
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    document.body.classList.add('fixed', 'sidebar-mini');

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));

    const cssFiles = [
      '/liston-dashboard/plugins/metisMenu/metisMenu.min.css',
      '/liston-dashboard/dist/css/app.min.css',
      '/liston-dashboard/dist/css/style.css',
    ];
    const links: HTMLLinkElement[] = [];
    cssFiles.forEach((href) => {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-dashboard', 'true');
        document.head.appendChild(link);
        links.push(link);
      }
    });

    return () => {
      document.body.classList.remove('fixed', 'sidebar-mini');
      links.forEach((l) => l.remove());
    };
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await messagesAPI.getUnreadCount();
        setUnreadCount(res.data?.unreadCount || 0);
      } catch { /* ignore */ }
    };
    fetchUnread();
  }, []);

  // Close user dropdown on outside click / Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tufixit-user-menu')) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  // Close on route change
  useEffect(() => { setUserMenuOpen(false); }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isActive = (path: string) =>
    pathname === path || (path !== '/dashboard' && pathname.startsWith(path + '/'));

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`dashboard-overlay${mobileSidebarOpen ? ' active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <nav className={`sidebar${mobileSidebarOpen ? ' active' : ''}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-brand">
            <span className="sidebar-brand_text">
              TUF<span>IXIT</span>
            </span>
          </Link>
          {/* Mobile close button */}
          <button
            className="btn btn-link d-md-none ms-auto p-0"
            onClick={() => setMobileSidebarOpen(false)}
            style={{ fontSize: 22, color: '#888', lineHeight: 1 }}
            aria-label="Close sidebar"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="sidebar-body">
          <nav className="sidebar-nav">
            <ul className="metismenu" id="menu">
                <li className="nav-label">
                  <span className="nav-label_text">Main Menu</span>
                </li>

                <li className={pathname === '/dashboard' ? 'mm-active' : ''}>
                  <Link href="/dashboard">
                    <i className="fa-solid fa-gauge"></i>
                    <span className="ms-2">Dashboard</span>
                  </Link>
                </li>

                <li className={isActive('/dashboard/add-listing') ? 'mm-active' : ''}>
                  <Link href="/dashboard/add-listing">
                    <i className="fa-solid fa-circle-plus"></i>
                    <span className="ms-2">Add Listing</span>
                  </Link>
                </li>

                {user?.role === 'WORKER' && (
                  <li className={isActive('/dashboard/jobs') ? 'mm-active' : ''}>
                    <Link href="/dashboard/jobs">
                      <i className="fa-solid fa-briefcase"></i>
                      <span className="ms-2">Jobs Marketplace</span>
                    </Link>
                  </li>
                )}

                {user?.role !== 'ADMIN' && (
                  <>
                    <li className={isActive('/dashboard/post-job') ? 'mm-active' : ''}>
                      <Link href="/dashboard/post-job">
                        <i className="fa-solid fa-pen-to-square"></i>
                        <span className="ms-2">Post a Job</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/my-jobs') ? 'mm-active' : ''}>
                      <Link href="/dashboard/my-jobs">
                        <i className="fa-solid fa-briefcase"></i>
                        <span className="ms-2">My Jobs</span>
                      </Link>
                    </li>
                  </>
                )}

                <li className={isActive('/dashboard/wallet') ? 'mm-active' : ''}>
                  <Link href="/dashboard/wallet">
                    <i className="fa-solid fa-wallet"></i>
                    <span className="ms-2">Wallet</span>
                  </Link>
                </li>

                <li className={isActive('/dashboard/messages') ? 'mm-active' : ''}>
                  <Link href="/dashboard/messages">
                    <i className="fa-solid fa-comment"></i>
                    <span className="ms-2">Messages</span>
                    {unreadCount > 0 && (
                      <span className="badge rounded-pill bg-danger ms-1">{unreadCount}</span>
                    )}
                  </Link>
                </li>

                <li className="nav-label">
                  <span className="nav-label_text">Listings</span>
                </li>

                <li className={isActive('/dashboard/my-listings') ? 'mm-active' : ''}>
                  <Link href="/dashboard/my-listings">
                    <i className="fa-solid fa-list"></i>
                    <span className="ms-2">My Listings</span>
                  </Link>
                </li>

                {user?.role === 'WORKER' && (
                  <>
                    <li className={isActive('/dashboard/skills') ? 'mm-active' : ''}>
                      <Link href="/dashboard/skills">
                        <i className="fa-solid fa-toolbox"></i>
                        <span className="ms-2">My Skills</span>
                      </Link>
                    </li>

                    <li className={isActive('/dashboard/analytics') ? 'mm-active' : ''}>
                      <Link href="/dashboard/analytics">
                        <i className="fa-solid fa-chart-line"></i>
                        <span className="ms-2">Lead Analytics</span>
                      </Link>
                    </li>

                    <li className={isActive('/dashboard/verification') ? 'mm-active' : ''}>
                      <Link href="/dashboard/verification">
                        <i className="fa-solid fa-certificate"></i>
                        <span className="ms-2">Verification</span>
                      </Link>
                    </li>

                    <li className={isActive('/dashboard/demand-forecast') ? 'mm-active' : ''}>
                      <Link href="/dashboard/demand-forecast">
                        <i className="fa-solid fa-chart-bar"></i>
                        <span className="ms-2">Market Intelligence</span>
                      </Link>
                    </li>
                  </>
                )}

                <li className={isActive('/dashboard/reviews') ? 'mm-active' : ''}>
                  <Link href="/dashboard/reviews">
                    <i className="fa-solid fa-star"></i>
                    <span className="ms-2">Reviews</span>
                  </Link>
                </li>

                <li className={isActive('/dashboard/bookings') ? 'mm-active' : ''}>
                  <Link href="/dashboard/bookings">
                    <i className="fa-solid fa-calendar-check"></i>
                    <span className="ms-2">Bookings</span>
                  </Link>
                </li>

                {user?.role === 'WORKER' && (
                  <li className={isActive('/dashboard/subscription') ? 'mm-active' : ''}>
                    <Link href="/dashboard/subscription">
                      <i className="fa-solid fa-crown"></i>
                      <span className="ms-2">Subscription</span>
                    </Link>
                  </li>
                )}

                {user?.role === 'ADMIN' && (
                  <>
                    <li className="nav-label">
                      <span className="nav-label_text">Admin</span>
                    </li>
                    <li className={pathname === '/dashboard/admin' ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin">
                        <i className="fa-solid fa-shield-halved"></i>
                        <span className="ms-2">Listing Approvals</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/analytics') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/analytics">
                        <i className="fa-solid fa-chart-pie"></i>
                        <span className="ms-2">Platform Analytics</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/jobs') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/jobs">
                        <i className="fa-solid fa-briefcase"></i>
                        <span className="ms-2">Jobs Oversight</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/payments') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/payments">
                        <i className="fa-solid fa-money-bill-transfer"></i>
                        <span className="ms-2">Payments</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/categories') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/categories">
                        <i className="fa-solid fa-layer-group"></i>
                        <span className="ms-2">Categories</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/users') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/users">
                        <i className="fa-solid fa-users"></i>
                        <span className="ms-2">Manage Users</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/reports') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/reports">
                        <i className="fa-solid fa-flag"></i>
                        <span className="ms-2">Reports</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/disputes') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/disputes">
                        <i className="fa-solid fa-gavel"></i>
                        <span className="ms-2">Disputes</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/estates') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/estates">
                        <i className="fa-solid fa-building"></i>
                        <span className="ms-2">Estate Partners</span>
                      </Link>
                    </li>
                    <li className={isActive('/dashboard/admin/whatsapp') ? 'mm-active' : ''}>
                      <Link href="/dashboard/admin/whatsapp">
                        <i className="fa-brands fa-whatsapp"></i>
                        <span className="ms-2">WhatsApp Bot</span>
                      </Link>
                    </li>
                  </>
                )}

                <li className="nav-label">
                  <span className="nav-label_text">Account</span>
                </li>

                <li className={isActive('/dashboard/profile') ? 'mm-active' : ''}>
                  <Link href="/dashboard/profile">
                    <i className="fa-solid fa-user-pen"></i>
                    <span className="ms-2">Edit Profile</span>
                  </Link>
                </li>

                <li className={isActive('/dashboard/settings') ? 'mm-active' : ''}>
                  <Link href="/dashboard/settings">
                    <i className="fa-solid fa-gear"></i>
                    <span className="ms-2">Settings</span>
                  </Link>
                </li>

                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLogout();
                    }}
                  >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    <span className="ms-2">Logout</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </nav>

        {/* Content Wrapper */}
        <div className={`content-wrapper${sidebarCollapsed ? ' sidebar-collapsed-offset' : ''}`}>
          <div className="main-content">
            {/* Top Navbar */}
            <nav className={`navbar-custom-menu navbar navbar-expand-md m-0${sidebarCollapsed ? ' sidebar-collapsed-offset' : ''}`}>
              <div className="sidebar-toggle d-md-none" onClick={() => setMobileSidebarOpen(true)}>
                <div className="sidebar-toggle-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="sidebar-toggle d-none d-md-flex" id="sidebarCollapse" onClick={() => setSidebarCollapsed(c => !c)}>
                <div className="sidebar-toggle-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="navbar-icon d-flex align-items-center ms-auto">
                <ul className="navbar-nav flex-row align-items-center gap-2">
                  <li className="nav-item d-none d-sm-block">
                    <Link href="/" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                      <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }}></i>
                      <span>Back to Site</span>
                    </Link>
                  </li>
                  <li className="nav-item tufixit-user-menu">
                    <button
                      type="button"
                      className="btn btn-link nav-link p-1 d-flex align-items-center gap-2 text-decoration-none"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      aria-expanded={userMenuOpen}
                      aria-haspopup="menu"
                    >
                      <div className="avatar">
                        <div
                          className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                          style={{
                            width: 36,
                            height: 36,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: 14,
                          }}
                        >
                          {user?.firstName?.[0] || 'A'}
                        </div>
                      </div>
                      <div className="profile-text d-none d-md-block text-start">
                        <h6 className="m-0 fw-medium" style={{ fontSize: 14 }}>
                          {user?.firstName} {user?.lastName}
                        </h6>
                        <span style={{ fontSize: 12, color: '#888' }}>{user?.email}</span>
                      </div>
                      <i
                        className="fa-solid fa-chevron-down ms-1"
                        style={{ fontSize: 10, color: '#888' }}
                      />
                    </button>
                    {userMenuOpen && (
                      <ul className="tufixit-user-menu-panel shadow border rounded-3" role="menu">
                        <li className="px-3 py-2 text-muted small border-bottom">
                          Signed in as<br />
                          <strong className="text-body">{user?.email}</strong>
                        </li>
                        <li className="d-sm-none">
                          <Link href="/" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                            <i className="fa-solid fa-arrow-left me-2 text-primary"></i>Back to Site
                          </Link>
                        </li>
                        <li className="d-sm-none"><hr className="dropdown-divider my-1" /></li>
                        <li>
                          <Link href="/dashboard/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                            <i className="fa-solid fa-user me-2"></i>My Profile
                          </Link>
                        </li>
                        <li>
                          <Link href="/dashboard/settings" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                            <i className="fa-solid fa-gear me-2"></i>Settings
                          </Link>
                        </li>
                        <li><hr className="dropdown-divider my-1" /></li>
                        <li>
                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleLogout();
                            }}
                          >
                            <i className="fa-solid fa-right-from-bracket me-2"></i>Sign Out
                          </button>
                        </li>
                      </ul>
                    )}
                  </li>
                </ul>
              </div>
            </nav>

            {/* Page Body */}
            <div className="body-content">
              <div className="container-fluid py-3 py-md-4">{children}</div>
            </div>
          </div>
        </div>

      {/* Dashboard Scripts */}
      <Script
        src="/liston-dashboard/plugins/perfect-scrollbar/perfect-scrollbar.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/liston-dashboard/plugins/metisMenu/metisMenu.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/liston-dashboard/plugins/apexcharts/apexcharts.min.js"
        strategy="afterInteractive"
      />
      <Script src="/liston-dashboard/dist/js/app.min.js" strategy="afterInteractive" />

      {/* Responsive dashboard overrides */}
      <style jsx global>{`
        /* ── Critical layout bootstrap (prevents FOUC + reload jitter) ──
           Problem: theme CSS loads async via useEffect. On reload:
             1. useEffect adds body.fixed
             2. app.min.css loads: .fixed .sidebar+.content-wrapper
                { margin-left:250px; margin-top:65px } → specificity
                (0,2,0) BEATS our plain .content-wrapper (0,1,0)
             3. style.css loads: overrides back to 320px
           This two-way shift = violent jitter.
           Fix: use !important AND add the .fixed prefix variants so
           cascade order and specificity can never produce a bad state. */
        .sidebar,
        .fixed .sidebar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;
          min-width: 320px !important;
          max-width: 320px !important;
          z-index: 10;
          background: #fff;
          overflow-y: auto;
          border-right: 1px solid #e4e4e4;
          transition: min-width 0.25s ease, max-width 0.25s ease;
        }
        .content-wrapper,
        .fixed .sidebar + .content-wrapper {
          margin-left: 320px !important;
          margin-top: 80px !important;
          transition: margin-left 0.25s ease;
        }
        .navbar-custom-menu.navbar,
        .fixed .navbar-custom-menu.navbar {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          left: 320px !important;
          z-index: 11;
          height: 80px !important;
          transition: left 0.25s ease;
        }

        /* ── Mobile: sidebar off-canvas ─────────────────────── */
        @media (max-width: 767.98px) {
          .sidebar,
          .fixed .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: -300px !important;
            bottom: 0 !important;
            z-index: 1050 !important;
            height: 100vh !important;
            min-width: 280px !important;
            max-width: 280px !important;
            width: 280px !important;
            transition: left 0.3s ease;
            background-color: rgba(255,255,255,.97) !important;
            backdrop-filter: blur(15px);
            overflow-y: auto !important;
          }
          .sidebar.active,
          .fixed .sidebar.active {
            left: 0 !important;
          }
          .sidebar-header {
            display: flex;
            align-items: center;
            padding-right: 12px;
          }
          .content-wrapper,
          .fixed .sidebar + .content-wrapper {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .navbar-custom-menu.navbar,
          .fixed .navbar-custom-menu.navbar {
            left: 0 !important;
          }
          /* Overlay */
          .dashboard-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 1040;
            transition: opacity 0.3s;
          }
          .dashboard-overlay.active {
            display: block;
          }
          /* Tables scroll horizontally */
          .table-responsive, .card-body {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          /* Stat cards stack to 2-col on mobile */
          .row .col-sm-6.col-xl-3,
          .row .col-md-3,
          .row .col-md-4,
          .row .col-lg-3,
          .row .col-lg-4 {
            flex: 0 0 50%;
            max-width: 50%;
          }
          /* Remove excess padding */
          .body-content {
            padding: 0 0.5rem !important;
          }
          .container-xxl {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
          /* Modal full-screen on mobile */
          .modal-dialog {
            margin: 0.5rem !important;
            max-width: calc(100% - 1rem) !important;
          }
          /* Action buttons stack vertically on mobile (gap-1 and gap-2 variants) */
          .d-flex.gap-1.justify-content-end,
          td .d-flex.gap-1,
          td .d-flex.gap-2 {
            flex-direction: column;
            align-items: stretch;
          }
          td .d-flex.gap-1 select,
          td .d-flex.gap-1 button,
          td .d-flex.gap-2 select,
          td .d-flex.gap-2 button {
            width: 100% !important;
          }
          /* Compact tables — rely on table-responsive for overflow instead
             of hiding columns (hiding Status was harmful) */
          .table th, .table td {
            white-space: nowrap;
          }
          /* Filter pills scroll horizontally */
          .d-flex.flex-wrap.gap-2 {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 0.5rem;
          }
          .d-flex.flex-wrap.gap-2::-webkit-scrollbar {
            height: 3px;
          }
          /* Nav pills horizontal scroll */
          .nav-pills {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          /* Card header flex wrapping */
          .card-header .d-flex.flex-wrap {
            gap: 0.75rem !important;
          }
          .card-header .d-flex .position-relative {
            min-width: 100% !important;
          }
          /* Welcome banner responsive */
          .header-banner {
            flex-direction: column;
            text-align: center;
          }
          .header-banner i {
            display: none;
          }
        }

        /* ── Small phones ──────────────────────────────────── */
        @media (max-width: 479.98px) {
          .row .col-sm-6.col-xl-3,
          .row .col-md-3,
          .row .col-md-4,
          .row .col-lg-3,
          .row .col-lg-4 {
            flex: 0 0 100%;
            max-width: 100%;
          }
          /* Page headers: let title + button wrap to avoid cramping */
          .d-flex.justify-content-between.mb-4,
          .d-flex.align-items-center.justify-content-between.mb-4 {
            flex-wrap: wrap !important;
            gap: 0.75rem;
          }
          .card { margin-bottom: 0.75rem; }
          h4, .h4 { font-size: 1.1rem; }
          h5, .h5 { font-size: 1rem; }
          /* Table font size */
          .table { font-size: 0.8rem; }
          .table th, .table td { padding: 0.5rem 0.4rem; }
          /* Badge sizing */
          .badge { font-size: 0.65rem; padding: 0.25em 0.5em; }
          /* Form controls */
          .form-select-sm, .form-control-sm {
            font-size: 0.75rem;
            padding: 0.2rem 0.5rem;
          }
        }

        /* ── Desktop sidebar collapse ───────────────────────── */
        .sidebar.sidebar-collapsed,
        .fixed .sidebar.sidebar-collapsed {
          min-width: 68px !important;
          max-width: 68px !important;
        }
        .sidebar.sidebar-collapsed .sidebar-brand_text,
        .sidebar.sidebar-collapsed .sidebar-nav a span,
        .sidebar.sidebar-collapsed .nav-label {
          display: none !important;
        }
        .sidebar.sidebar-collapsed .sidebar-nav a {
          justify-content: center;
          padding: 12px !important;
        }
        .sidebar.sidebar-collapsed .sidebar-nav a i {
          margin: 0 !important;
          font-size: 1.2rem;
        }
        .content-wrapper.sidebar-collapsed-offset,
        .fixed .sidebar.sidebar-collapsed + .content-wrapper {
          margin-left: 68px !important;
        }
        .navbar-custom-menu.navbar.sidebar-collapsed-offset,
        .fixed .sidebar.sidebar-collapsed ~ .content-wrapper .navbar-custom-menu.navbar {
          left: 68px !important;
        }

        /* ── Topbar user dropdown: self-positioned (no Bootstrap/Popper
              dependency). Anchored to the avatar button, right-aligned,
              clamped to viewport so it never gets clipped on mobile. ── */
        .tufixit-user-menu {
          position: relative;
        }
        .tufixit-user-menu > button {
          background: transparent;
          border: 0;
          color: inherit;
          box-shadow: none !important;
        }
        .tufixit-user-menu > button:hover,
        .tufixit-user-menu > button:focus {
          background: rgba(0,0,0,0.04);
          border-radius: 8px;
        }
        .tufixit-user-menu-panel {
          list-style: none;
          margin: 0;
          padding: 0.5rem 0;
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          left: auto;
          background: #fff;
          min-width: 16rem;
          max-width: calc(100vw - 1rem);
          z-index: 1080;
          border-color: #e9ecef !important;
        }
        .tufixit-user-menu-panel .dropdown-item {
          display: flex;
          align-items: center;
          padding: 0.55rem 1rem;
          font-size: 0.875rem;
          color: #333;
          text-decoration: none;
          background: transparent;
          border: 0;
          width: 100%;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }
        .tufixit-user-menu-panel .dropdown-item:hover {
          background: #f5f5f7;
          color: var(--bs-primary);
        }
        .tufixit-user-menu-panel .dropdown-divider {
          margin: 0.25rem 0;
          border-top: 1px solid #eee;
        }
        @media (max-width: 575.98px) {
          .tufixit-user-menu-panel {
            min-width: 14rem;
            right: 0;
          }
        }

        /* ── Tablet (768px-1023px) ─────────────────────────── */
        @media (min-width: 768px) and (max-width: 1023.98px) {
          .sidebar,
          .fixed .sidebar {
            min-width: 220px !important;
            max-width: 220px !important;
            width: 220px !important;
          }
          .content-wrapper,
          .fixed .sidebar + .content-wrapper {
            margin-left: 220px !important;
          }
          /* CRITICAL: navbar left must match the reduced sidebar width */
          .navbar-custom-menu.navbar,
          .fixed .navbar-custom-menu.navbar {
            left: 220px !important;
          }
          .row .col-xl-3 {
            flex: 0 0 50%;
            max-width: 50%;
          }
          /* Table columns on tablet */
          .table { font-size: 0.85rem; }
          /* Modal optimised for tablet */
          .modal-dialog.modal-lg {
            max-width: 90% !important;
          }
          /* Sidebar nav text smaller to fit 220px */
          .sidebar-nav a span { font-size: 0.85rem; }
          .sidebar-brand_text { font-size: 1.1rem; }
        }

        /* ── Desktop overlay should not appear ─────────────── */
        @media (min-width: 768px) {
          .dashboard-overlay { display: none !important; }
        }

        /* ── Large screens (≥1200px) ──────────────────────── */
        @media (min-width: 1200px) {
          .body-content .container-fluid {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
          /* Promote fixed navbar to own GPU layer – eliminates
             backdrop-filter repaint jitter while scrolling */
          .navbar-custom-menu.navbar {
            will-change: transform;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
        }

        /* ── Extra-large screens (≥1600px) ────────────────── */
        @media (min-width: 1600px) {
          .body-content .container-fluid {
            padding-left: 2.5rem;
            padding-right: 2.5rem;
          }
          /* Cards breathe better with increased gap */
          .row.g-3 { --bs-gutter-x: 1.25rem; --bs-gutter-y: 1.25rem; }
          .row.g-4 { --bs-gutter-x: 2rem; --bs-gutter-y: 2rem; }
        }

        /* ── Ultra-wide screens (≥1920px) ─────────────────── */
        @media (min-width: 1920px) {
          /* Constrain content so it doesn't stretch across 1920px+ */
          .body-content {
            max-width: 1600px;
            margin-left: auto;
            margin-right: auto;
          }
          .body-content .container-fluid {
            padding-left: 3rem;
            padding-right: 3rem;
          }
          /* Wider sidebar proportionally */
          .sidebar {
            min-width: 300px !important;
            max-width: 300px !important;
          }
          .fixed .sidebar+.content-wrapper {
            margin-left: 300px !important;
          }
          .fixed .navbar-custom-menu.navbar {
            left: 300px !important;
          }
          /* Table readability: slightly larger type + more padding */
          .table { font-size: 0.95rem; }
          .table th, .table td { padding: 0.85rem 1rem; }
          /* Cards get subtle max-width to avoid over-stretching */
          .card { max-width: 100%; }
          .row.g-3, .row.g-4 { --bs-gutter-x: 1.5rem; --bs-gutter-y: 1.5rem; }
        }

        /* ── 2K / QHD screens (≥2560px) ───────────────────── */
        @media (min-width: 2560px) {
          .body-content {
            max-width: 2200px;
            margin-left: auto;
            margin-right: auto;
          }
          .body-content .container-fluid {
            padding-left: 3.5rem;
            padding-right: 3.5rem;
          }
          /* Even bigger gutters to prevent cards from feeling lost */
          .row.g-3 { --bs-gutter-x: 2rem; --bs-gutter-y: 2rem; }
          .row.g-4 { --bs-gutter-x: 2.5rem; --bs-gutter-y: 2.5rem; }
          /* Stat cards: restore 4-col but with controlled width */
          .row > .col-sm-6.col-xl-3 {
            flex: 0 0 25%;
            max-width: 25%;
          }
          .row > .col-6.col-md-3 {
            flex: 0 0 25%;
            max-width: 25%;
          }
          /* Typography scales up for readability at distance */
          h4, .h4 { font-size: 1.5rem; }
          h5, .h5 { font-size: 1.25rem; }
          h6, .h6 { font-size: 1.1rem; }
          .table { font-size: 1rem; }
          .table th, .table td { padding: 1rem 1.25rem; }
        }

        /* ── 4K screens (≥3840px) ─────────────────────────── */
        @media (min-width: 3840px) {
          .body-content {
            max-width: 3200px;
          }
          .body-content .container-fluid {
            padding-left: 5rem;
            padding-right: 5rem;
          }
          .sidebar {
            min-width: 360px !important;
            max-width: 360px !important;
          }
          .fixed .sidebar+.content-wrapper {
            margin-left: 360px !important;
          }
          .fixed .navbar-custom-menu.navbar {
            left: 360px !important;
          }
          h4, .h4 { font-size: 1.75rem; }
          .card-body { padding: 1.75rem; }
          .badge { font-size: 0.85rem; padding: 0.35em 0.7em; }
        }

        /* ── Polish: consistent card styling across all sizes ─ */
        .body-content .card {
          border-radius: 0.75rem;
          transition: box-shadow 0.2s ease;
        }
        .body-content .card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        /* Welcome banner constrained to not span infinitely */
        .header-banner {
          max-width: 100%;
        }
        @media (min-width: 1920px) {
          .header-banner {
            border-radius: 1rem;
          }
        }
        /* Sidebar nav items get better spacing on large screens */
        @media (min-width: 1200px) {
          .sidebar-nav .metismenu > li > a {
            padding-top: 0.65rem;
            padding-bottom: 0.65rem;
          }
        }
        /* Prevent scroll-triggered layout thrashing on content area */
        .content-wrapper {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        /* Fix: app.min.css sets width:100% on .content-wrapper. Combined with
           margin-left:320px (sidebar) this extends the wrapper 320px past the
           viewport right edge — the right column is then clipped by the theme's
           own overflow-x:hidden. width:auto lets the browser calculate:
           container_width = viewport - margin-left, which is exactly correct. */
        .fixed .sidebar + .content-wrapper {
          width: auto;
        }
      `}</style>
    </>
  );
}
