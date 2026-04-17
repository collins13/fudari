'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="footer-dark main-footer overflow-hidden position-relative pt-5">
      <div className="container pt-4">
        <div className="border-top py-5">
          <div className="footer-row row gy-5 g-sm-5 gx-xxl-6">
            {/* Brand + About */}
            <div className="col-lg-4 col-md-6">
              <Link href="/" className="navbar-brand fw-bold fs-3 text-white mb-3 d-inline-block">
                TUF<span style={{ color: '#F84525' }}>IXIT</span>
              </Link>
              <p className="mb-4">
                Kenya&apos;s #1 Jua Kali Marketplace — connecting customers with
                trusted, verified artisans for all home and business services.
              </p>
              {/* Social icons */}
              <ul className="d-flex flex-wrap gap-2 list-unstyled mb-0 social-icon">
                <li>
                  <a href="#" className="rounded-circle align-items-center d-flex fs-19 icon-wrap justify-content-center rounded-2 text-white fb">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                </li>
                <li>
                  <a href="#" className="rounded-circle align-items-center d-flex fs-19 icon-wrap justify-content-center rounded-2 text-white twi">
                    <i className="fab fa-twitter"></i>
                  </a>
                </li>
                <li>
                  <a href="#" className="rounded-circle align-items-center d-flex fs-19 icon-wrap justify-content-center rounded-2 text-white inst">
                    <i className="fab fa-instagram"></i>
                  </a>
                </li>
                <li>
                  <a href="#" className="rounded-circle align-items-center d-flex fs-19 icon-wrap justify-content-center rounded-2 text-white whatsapp">
                    <i className="fa-brands fa-whatsapp"></i>
                  </a>
                </li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="col-lg-2 col-md-3 col-sm-6">
              <h5 className="fw-bold mb-4">Browse</h5>
              <ul className="list-unstyled">
                <li className="mb-2"><Link href="/artisans" className="d-block">Browse Service Providers</Link></li>
                <li className="mb-2"><Link href="/pricing" className="d-block">Pricing</Link></li>
                <li className="mb-2"><Link href="/#how-it-works" className="d-block">How It Works</Link></li>
                <li className="mb-2"><Link href="/artisans?category=electrical" className="d-block">Electricians</Link></li>
                <li className="mb-2"><Link href="/artisans?category=plumbing" className="d-block">Plumbers</Link></li>
              </ul>
            </div>

            {/* For Artisans */}
            <div className="col-lg-2 col-md-3 col-sm-6">
              <h5 className="fw-bold mb-4">For Artisans</h5>
              <ul className="list-unstyled">
                <li className="mb-2"><Link href="/register" className="d-block">Register</Link></li>
                <li className="mb-2"><Link href="/login" className="d-block">Login</Link></li>
                <li className="mb-2"><Link href="/pricing" className="d-block">Packages</Link></li>
                <li className="mb-2"><Link href="/pricing#basic" className="d-block">Basic — KES 300</Link></li>
                <li className="mb-2"><Link href="/pricing#silver" className="d-block">Silver — KES 1,500</Link></li>
                <li className="mb-2"><Link href="/pricing#pro" className="d-block">Pro — KES 1,500</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="col-lg-4 col-md-6">
              <h5 className="fw-bold mb-4">Contact Us</h5>
              <div className="mb-3">
                <a className="d-flex gap-2 align-items-center fw-medium mb-2" href="tel:+254703954539">
                  <i className="fa-solid fa-phone text-primary"></i>
                  <span>+254 700 000 000</span>
                </a>
                <a className="d-flex gap-2 align-items-center fw-medium mb-2" href="mailto:info@tufixit.co.ke">
                  <i className="fa-solid fa-envelope text-primary"></i>
                  <span>info@tufixit.co.ke</span>
                </a>
                <div className="d-flex gap-2 align-items-center fw-medium mb-2">
                  <i className="fa-solid fa-location-dot text-primary"></i>
                  <span>Nairobi, Kenya</span>
                </div>
              </div>
              {/* Newsletter */}
              <h6 className="fw-bold mb-3">Stay Updated</h6>
              <div className="newsletter position-relative">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                />
                <button
                  type="button"
                  className="btn btn-primary search-btn position-absolute top-50 rounded-circle"
                >
                  <i className="fa-solid fa-angle-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="container border-top">
        <div className="align-items-center g-3 py-4 row">
          <div className="col-lg-auto">
            <ul className="list-unstyled list-separator mb-2 footer-nav">
              <li className="list-inline-item"><Link href="/privacy">Privacy</Link></li>
              <li className="list-inline-item"><Link href="/terms">Terms</Link></li>
              <li className="list-inline-item"><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="col-lg order-md-first">
            <div className="align-items-center row">
              <Link href="/" className="col-sm-auto footer-logo mb-2 mb-sm-0 d-inline-block">
                <Logo variant="white" height={28} />
              </Link>
              <div className="col-sm-auto copy">
                &copy; 2026 TUFIXIT. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
