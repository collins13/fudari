'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const { user, logout } = useAuth();

  useEffect(() => {
    // Initialize dark mode toggle via jQuery/template script
    if (typeof window !== 'undefined' && (window as any).$) {
      const $ = (window as any).$;
      const savedTheme = localStorage.getItem('theme') || 'light';
      $('html').attr('data-bs-theme', savedTheme);
    }
  }, []);

  const handleDarkModeToggle = () => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      const current = html.getAttribute('data-bs-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-bs-theme', next);
      localStorage.setItem('theme', next);
    }
  };

  if (transparent) {
    return (
      <nav className="custom-navbar navbar navbar-expand-lg navbar-fixed navbar-transfarent">
        <div className="container">
          <Link className="navbar-brand m-0 fw-bold text-white fs-4 d-flex align-items-center" href="/">
            <span className="logo-for-white"><Logo variant="white" height={34} /></span>
            <span className="logo-for-dark"><Logo variant="dark" height={34} /></span>
          </Link>
          <div className="d-flex order-lg-2">
            {/* Dark mode toggle */}
            <button
              type="button"
              id="themeToggleBtn"
              className="align-items-center bg-transparent border-0 btn-user d-flex justify-content-center p-0"
              onClick={handleDarkModeToggle}
            >
              <i className="fa-solid fa-moon"></i>
            </button>
            {/* Sign In button */}
            {user ? (
              <div className="dropdown">
                <button className="btn btn-outline-light btn-sm rounded-5 dropdown-toggle" data-bs-toggle="dropdown">
                  {user.firstName}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li><Link className="dropdown-item" href="/dashboard">Dashboard</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item" onClick={logout}>Sign Out</button></li>
                </ul>
              </div>
            ) : (
              <Link href="/login" className="d-flex align-items-center justify-content-center p-0 btn-user">
                <i className="fa-solid fa-user-plus"></i>
              </Link>
            )}
            {/* List Your Services */}
            <Link href="/register" className="btn btn-primary d-none d-sm-flex fw-medium gap-2 hstack rounded-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-plus-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
              </svg>
              <div className="vr d-none d-sm-inline-block"></div>
              <span className="d-none d-sm-inline-block">List Your Services</span>
            </Link>
            {/* Hamburger */}
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarMain"
              aria-controls="navbarMain"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span id="nav-icon" className="">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
          <div className="collapse navbar-collapse" id="navbarMain">
            <ul className="navbar-nav m-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link active" href="/">Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/artisans">Browse Service Providers</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/pricing">Pricing</Link>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  For Artisans
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" href="/register">Register as Service Provider</Link></li>
                  <li><Link className="dropdown-item" href="/login">Login</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" href="/pricing">View Packages</Link></li>
                </ul>
              </li>
            </ul>
            <div className="d-sm-none">
              <Link href="/register" className="btn btn-primary d-flex gap-2 hstack justify-content-center rounded-3">
                <span>List Your Services</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Inner page navbar (sticky, light)
  return (
    <div className="border-0 card header rounded-0 sticky-top">
      <nav className="navbar navbar-expand-lg navbar-light">
        <div className="container">
          <Link className="navbar-brand m-0 fw-bold fs-4 d-flex align-items-center" href="/">
            <Logo variant="dark" height={34} />
          </Link>
          <div className="d-flex order-lg-2 gap-2 align-items-center">
            {/* Dark mode toggle */}
            <button
              type="button"
              className="align-items-center bg-transparent border-0 btn-user d-flex justify-content-center p-0"
              onClick={handleDarkModeToggle}
            >
              <i className="fa-solid fa-moon"></i>
            </button>
            {/* Auth buttons */}
            {user ? (
              <div className="dropdown">
                <button className="btn btn-outline-primary btn-sm rounded-5 dropdown-toggle" data-bs-toggle="dropdown">
                  {user.firstName}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li><Link className="dropdown-item" href="/dashboard">Dashboard</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item" onClick={logout}>Sign Out</button></li>
                </ul>
              </div>
            ) : (
              <Link href="/login" className="btn btn-outline-primary btn-sm rounded-5 d-none d-sm-flex">
                Sign In
              </Link>
            )}
            {/* List Your Services */}
            <Link href="/register" className="btn btn-primary btn-sm d-none d-sm-flex fw-medium gap-2 hstack rounded-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
              </svg>
              <span>List Your Services</span>
            </Link>
            {/* Hamburger */}
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarInner"
              aria-controls="navbarInner"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>
          <div className="collapse navbar-collapse" id="navbarInner">
            <ul className="navbar-nav m-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link" href="/">Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/artisans">Browse Service Providers</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/pricing">Pricing</Link>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  For Artisans
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" href="/register">Register as Service Provider</Link></li>
                  <li><Link className="dropdown-item" href="/login">Login</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" href="/pricing">View Packages</Link></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
