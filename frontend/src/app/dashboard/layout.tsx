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

type Role = 'WORKER' | 'CLIENT' | 'ADMIN' | 'ESTATE_MANAGER';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Omit to show for every role. */
  roles?: Role[];
  /** Match only this exact path, not descendants. */
  exact?: boolean;
  badge?: 'unread';
}

interface NavGroup {
  label: string;
  roles?: Role[];
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'fa-gauge', exact: true },
      { href: '/dashboard/messages', label: 'Messages', icon: 'fa-comment', badge: 'unread' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/dashboard/jobs', label: 'Jobs Marketplace', icon: 'fa-briefcase', roles: ['WORKER'] },
      { href: '/dashboard/bookings', label: 'Bookings', icon: 'fa-calendar-check' },
      { href: '/dashboard/my-jobs', label: 'My Jobs', icon: 'fa-clipboard-list', roles: ['WORKER', 'CLIENT'] },
      { href: '/dashboard/post-job', label: 'Post a Job', icon: 'fa-pen-to-square', roles: ['WORKER', 'CLIENT'] },
    ],
  },
  {
    label: 'My Business',
    roles: ['WORKER'],
    items: [
      { href: '/dashboard/my-listings', label: 'My Listings', icon: 'fa-list' },
      { href: '/dashboard/add-listing', label: 'Add Listing', icon: 'fa-circle-plus' },
      { href: '/dashboard/skills', label: 'My Skills', icon: 'fa-toolbox' },
      { href: '/dashboard/verification', label: 'Verification', icon: 'fa-certificate' },
    ],
  },
  {
    label: 'Insights',
    roles: ['WORKER'],
    items: [
      { href: '/dashboard/analytics', label: 'Lead Analytics', icon: 'fa-chart-line' },
      { href: '/dashboard/demand-forecast', label: 'Market Intelligence', icon: 'fa-chart-bar' },
      { href: '/dashboard/reviews', label: 'Reviews', icon: 'fa-star' },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/dashboard/wallet', label: 'Wallet', icon: 'fa-wallet' },
      { href: '/dashboard/subscription', label: 'Subscription', icon: 'fa-crown', roles: ['WORKER'] },
    ],
  },
  {
    label: 'Reviews',
    roles: ['CLIENT'],
    items: [
      { href: '/dashboard/reviews', label: 'Reviews', icon: 'fa-star' },
    ],
  },
  {
    label: 'Admin',
    roles: ['ADMIN'],
    items: [
      { href: '/dashboard/admin', label: 'Listing Approvals', icon: 'fa-shield-halved', exact: true },
      { href: '/dashboard/admin/analytics', label: 'Platform Analytics', icon: 'fa-chart-pie' },
      { href: '/dashboard/admin/jobs', label: 'Jobs Oversight', icon: 'fa-briefcase' },
      { href: '/dashboard/admin/payments', label: 'Payments', icon: 'fa-money-bill-transfer' },
      { href: '/dashboard/admin/categories', label: 'Categories', icon: 'fa-layer-group' },
      { href: '/dashboard/admin/services', label: 'Services', icon: 'fa-list-check' },
      { href: '/dashboard/admin/users', label: 'Manage Users', icon: 'fa-users' },
      { href: '/dashboard/admin/reports', label: 'Reports', icon: 'fa-flag' },
      { href: '/dashboard/admin/disputes', label: 'Disputes', icon: 'fa-gavel' },
      { href: '/dashboard/admin/estates', label: 'Estate Partners', icon: 'fa-building' },
      { href: '/dashboard/admin/whatsapp', label: 'WhatsApp Bot', icon: 'fa-brands fa-whatsapp' },
    ],
  },
  {
    label: 'Estate',
    roles: ['ADMIN', 'ESTATE_MANAGER'],
    items: [
      { href: '/dashboard/estate-manager', label: 'Estate Operations', icon: 'fa-city' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/profile', label: 'Edit Profile', icon: 'fa-user-pen' },
      { href: '/dashboard/settings', label: 'Settings', icon: 'fa-gear' },
    ],
  },
];

const visibleFor = (role: Role, roles?: Role[]) => !roles || roles.includes(role);

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

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');

  const role = (user?.role as Role) || 'CLIENT';

  const pageTitle =
    NAV_GROUPS.flatMap((g) => g.items).find((i) =>
      i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + '/')
    )?.label ?? 'Dashboard';

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
              FUDARI
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
              {NAV_GROUPS.filter((g) => visibleFor(role, g.roles)).map((group) => {
                const items = group.items.filter((i) => visibleFor(role, i.roles));
                if (items.length === 0) return null;
                return (
                  <li key={group.label} className="nav-group">
                    <span className="nav-label_text">{group.label}</span>
                    <ul className="nav-group_items">
                      {items.map((item) => (
                        <li key={item.href} className={isActive(item) ? 'mm-active' : ''}>
                          <Link href={item.href} title={item.label}>
                            <i className={item.icon.startsWith('fa-brands') ? item.icon : `fa-solid ${item.icon}`}></i>
                            <span className="nav-text">{item.label}</span>
                            {item.badge === 'unread' && unreadCount > 0 && (
                              <span className="badge rounded-pill bg-danger ms-auto">{unreadCount}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}

              <li className="nav-group">
                <ul className="nav-group_items">
                  <li>
                    <button type="button" className="nav-logout" onClick={handleLogout}>
                      <i className="fa-solid fa-right-from-bracket"></i>
                      <span className="nav-text">Logout</span>
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
            </nav>
          </div>
        </nav>

        {/* Content Wrapper */}
        <div className={`content-wrapper${sidebarCollapsed ? ' sidebar-collapsed-offset' : ''}`}>
          <div className="main-content">
            {/* Top Navbar */}
            <nav className={`navbar-custom-menu navbar m-0${sidebarCollapsed ? ' sidebar-collapsed-offset' : ''}`}>
              <div className="topbar-left">
                <button
                  type="button"
                  className="sidebar-toggle d-md-none"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <div className="sidebar-toggle-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </button>
                <button
                  type="button"
                  className="sidebar-toggle d-none d-md-flex"
                  id="sidebarCollapse"
                  onClick={() => setSidebarCollapsed(c => !c)}
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!sidebarCollapsed}
                >
                  <div className="sidebar-toggle-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </button>
                <span className="topbar-title d-none d-lg-block">{pageTitle}</span>
              </div>

              <div className="topbar-right">
                <Link href="/" className="btn btn-sm btn-outline-primary topbar-back d-none d-sm-inline-flex">
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>Back to Site</span>
                </Link>
                <div className="tufixit-user-menu">
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
                        <h6 className="m-0 fw-medium">
                          {user?.firstName} {user?.lastName}
                        </h6>
                        <span>{user?.email}</span>
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
                </div>
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
          min-width: 264px !important;
          max-width: 264px !important;
          z-index: 10;
          background: #fff;
          overflow-y: auto;
          overflow-x: hidden;
          border-right: 1px solid #e4e4e4;
          transition: min-width 0.25s ease, max-width 0.25s ease;
        }
        .content-wrapper,
        .fixed .sidebar + .content-wrapper {
          margin-left: 264px !important;
          margin-top: 72px !important;
          transition: margin-left 0.25s ease;
        }
        .navbar-custom-menu.navbar,
        .fixed .navbar-custom-menu.navbar {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          left: 264px !important;
          z-index: 11;
          height: 72px !important;
          transition: left 0.25s ease;
        }

        /* ── Top bar ────────────────────────────────────────
           The theme's .navbar-icon/.navbar-nav let their contents shrink
           below intrinsic width, so the user block overflowed and painted
           on top of "Back to Site". Own the layout explicitly instead. */
        .navbar-custom-menu.navbar {
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0 1rem !important;
          background: #fff;
          border-bottom: 1px solid #e9ecef;
        }
        .topbar-left,
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }
        .topbar-right {
          flex-shrink: 0;
          gap: 0.75rem;
        }
        .topbar-left { flex: 1 1 auto; }
        .topbar-title {
          font-size: 1.05rem;
          font-weight: 600;
          margin-left: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .navbar-custom-menu .sidebar-toggle {
          flex-shrink: 0;
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }
        .topbar-back {
          flex-shrink: 0;
          align-items: center;
          gap: 0.35rem;
          white-space: nowrap;
        }
        .topbar-back i { font-size: 11px; }
        .tufixit-user-menu > button {
          flex-shrink: 0;
          max-width: 260px;
        }
        .tufixit-user-menu .avatar { flex-shrink: 0; }
        .tufixit-user-menu .profile-text {
          min-width: 0;
          max-width: 170px;
        }
        .tufixit-user-menu .profile-text h6,
        .tufixit-user-menu .profile-text span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tufixit-user-menu .profile-text h6 { font-size: 14px; line-height: 1.2; }
        .tufixit-user-menu .profile-text span { font-size: 12px; color: #888; }

        /* ── Sidebar menu groups ────────────────────────────── */
        .sidebar-nav .metismenu,
        .sidebar-nav .nav-group_items {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .sidebar-nav .nav-group { margin-bottom: 0.25rem; }
        .sidebar-nav .nav-group > .nav-label_text {
          display: block;
          padding: 1rem 1.25rem 0.35rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9aa0a6;
        }
        .sidebar-nav .nav-group_items a,
        .sidebar-nav .nav-logout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.6rem 1.25rem;
          font-size: 0.9rem;
          color: #4a4a4a;
          text-decoration: none;
          background: transparent;
          border: 0;
          border-left: 3px solid transparent;
          text-align: left;
          cursor: pointer;
        }
        .sidebar-nav .nav-group_items a i,
        .sidebar-nav .nav-logout i {
          width: 18px;
          flex-shrink: 0;
          text-align: center;
          font-size: 0.95rem;
        }
        .sidebar-nav .nav-text {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-nav .nav-group_items a:hover,
        .sidebar-nav .nav-logout:hover {
          background: #f6f7f9;
          color: var(--bs-primary, #0D5C63);
        }
        .sidebar-nav .nav-group_items .mm-active > a {
          color: var(--bs-primary, #0D5C63);
          background: rgba(13, 92, 99, 0.09);
          border-left-color: var(--bs-primary, #0D5C63);
          font-weight: 600;
        }
        .sidebar-nav .nav-logout { color: #d6336c; }
        .sidebar-nav .nav-logout:hover { background: #fff5f5; color: #c92a52; }

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
          min-width: 72px !important;
          max-width: 72px !important;
        }
        .sidebar.sidebar-collapsed .sidebar-brand_text,
        .sidebar.sidebar-collapsed .nav-text,
        .sidebar.sidebar-collapsed .nav-label_text,
        .sidebar.sidebar-collapsed .badge {
          display: none !important;
        }
        .sidebar.sidebar-collapsed .nav-group > .nav-label_text { padding: 0 !important; }
        .sidebar.sidebar-collapsed .nav-group { border-top: 1px solid #f1f1f1; padding-top: 0.25rem; }
        .sidebar.sidebar-collapsed .nav-group:first-child { border-top: 0; }
        .sidebar.sidebar-collapsed .sidebar-nav .nav-group_items a,
        .sidebar.sidebar-collapsed .sidebar-nav .nav-logout {
          justify-content: center;
          padding: 0.7rem 0 !important;
          border-left-width: 0;
          border-right: 3px solid transparent;
        }
        .sidebar.sidebar-collapsed .sidebar-nav .nav-group_items .mm-active > a {
          border-right-color: var(--bs-primary, #0D5C63);
        }
        .sidebar.sidebar-collapsed .sidebar-nav .nav-group_items a i,
        .sidebar.sidebar-collapsed .sidebar-nav .nav-logout i {
          margin: 0 !important;
          font-size: 1.1rem;
        }
        .content-wrapper.sidebar-collapsed-offset,
        .fixed .sidebar.sidebar-collapsed + .content-wrapper {
          margin-left: 72px !important;
        }
        .navbar-custom-menu.navbar.sidebar-collapsed-offset,
        .fixed .sidebar.sidebar-collapsed ~ .content-wrapper .navbar-custom-menu.navbar {
          left: 72px !important;
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
          .sidebar:not(.sidebar-collapsed),
          .fixed .sidebar:not(.sidebar-collapsed) {
            min-width: 232px !important;
            max-width: 232px !important;
          }
          .content-wrapper:not(.sidebar-collapsed-offset),
          .fixed .sidebar:not(.sidebar-collapsed) + .content-wrapper {
            margin-left: 232px !important;
          }
          /* CRITICAL: navbar left must match the reduced sidebar width */
          .navbar-custom-menu.navbar:not(.sidebar-collapsed-offset),
          .fixed .sidebar:not(.sidebar-collapsed) ~ .content-wrapper .navbar-custom-menu.navbar:not(.sidebar-collapsed-offset) {
            left: 232px !important;
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
          /* Long labels ellipsis rather than clip at this width */
          .sidebar-nav .nav-text { font-size: 0.85rem; }
          .sidebar-brand_text { font-size: 1.1rem; }
          .tufixit-user-menu .profile-text { max-width: 120px; }
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
