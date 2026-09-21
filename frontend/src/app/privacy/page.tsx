import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LegalPageClient from '@/components/LegalPageClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How FUDARI collects, uses, and protects personal data of customers, artisans, and estate partners under the Kenya Data Protection Act, 2019.',
  alternates: { canonical: 'https://fudari.co/privacy' },
};

const EFFECTIVE_DATE = 'April 28, 2026';
const LAST_UPDATED = 'April 28, 2026';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <LegalPageClient />

      {/* CSS-only reading-progress bar (Chrome/Edge 115+ progressive enhancement) */}
      <div className="reading-progress" aria-hidden="true" />

      <main className="bg-light pb-5">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="position-relative overflow-hidden mx-3 mt-3 rounded-4 dark-overlay legal-hero">
          <img className="bg-image" src="/liston/images/header/lg-01.jpg" alt="" aria-hidden="true" />
          <div className="container overlay-content py-5 text-white">
            <div className="row align-items-center">
              <div className="col-md-8 text-center text-md-start">
                <span className="badge bg-white text-primary px-3 py-2 mb-3 fw-semibold small">
                  <i className="fa-solid fa-shield-halved me-1"></i> Legal
                </span>
                <h1 className="display-5 fw-bold mb-2">Privacy Policy</h1>
                <p className="opacity-75 mb-3">
                  Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge hero-badge px-3 py-2">
                    <i className="fa-solid fa-clock me-1"></i> ~7 min read
                  </span>
                  <span className="badge hero-badge px-3 py-2">
                    <i className="fa-solid fa-list-ol me-1"></i> 15 sections
                  </span>
                  <span className="badge hero-badge px-3 py-2">
                    <i className="fa-solid fa-flag me-1"></i> Kenya DPA 2019
                  </span>
                </div>
              </div>
              <div className="col-md-4 text-center d-none d-md-block">
                <i className="fa-solid fa-shield-halved hero-icon"></i>
              </div>
            </div>
          </div>
        </section>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <section className="container py-5">
          <div className="row g-4">

            {/* Desktop TOC */}
            <aside className="col-lg-3 d-none d-lg-block">
              <div className="card border-0 shadow-sm rounded-4 sticky-top legal-toc" style={{ top: 100 }}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="fa-solid fa-list text-primary small"></i>
                    <span className="fw-bold text-uppercase small text-muted">On this page</span>
                  </div>
                  <nav className="nav flex-column small">
                    <a className="nav-link" href="#who-we-are">1. Who we are</a>
                    <a className="nav-link" href="#data-we-collect">2. Data we collect</a>
                    <a className="nav-link" href="#how-we-use">3. How we use it</a>
                    <a className="nav-link" href="#legal-basis">4. Legal basis</a>
                    <a className="nav-link" href="#sharing">5. Sharing</a>
                    <a className="nav-link" href="#location">6. Location data</a>
                    <a className="nav-link" href="#cookies">7. Cookies</a>
                    <a className="nav-link" href="#sms-whatsapp">8. SMS &amp; WhatsApp</a>
                    <a className="nav-link" href="#retention">9. Retention</a>
                    <a className="nav-link" href="#security">10. Security</a>
                    <a className="nav-link" href="#your-rights">11. Your rights</a>
                    <a className="nav-link" href="#children">12. Children</a>
                    <a className="nav-link" href="#international">13. International transfers</a>
                    <a className="nav-link" href="#changes">14. Changes</a>
                    <a className="nav-link" href="#contact">15. Contact</a>
                  </nav>
                  <hr className="my-3" />
                  <Link href="/terms" className="btn btn-outline-primary btn-sm w-100">
                    <i className="fa-solid fa-file-contract me-1"></i> Terms of Service
                  </Link>
                </div>
              </div>
            </aside>

            {/* Article */}
            <article className="col-lg-9">

              {/* Mobile TOC accordion */}
              <div className="d-lg-none mb-4">
                <button
                  className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#mobileToc"
                  aria-expanded="false"
                  aria-controls="mobileToc"
                >
                  <span><i className="fa-solid fa-list me-2"></i>Jump to a section</span>
                  <i className="fa-solid fa-chevron-down small"></i>
                </button>
                <div className="collapse" id="mobileToc">
                  <nav className="card card-body p-3 small legal-toc border-0 shadow-sm mt-1">
                    <a className="nav-link" href="#who-we-are">1. Who we are</a>
                    <a className="nav-link" href="#data-we-collect">2. Data we collect</a>
                    <a className="nav-link" href="#how-we-use">3. How we use it</a>
                    <a className="nav-link" href="#legal-basis">4. Legal basis</a>
                    <a className="nav-link" href="#sharing">5. Sharing</a>
                    <a className="nav-link" href="#location">6. Location data</a>
                    <a className="nav-link" href="#cookies">7. Cookies</a>
                    <a className="nav-link" href="#sms-whatsapp">8. SMS &amp; WhatsApp</a>
                    <a className="nav-link" href="#retention">9. Retention</a>
                    <a className="nav-link" href="#security">10. Security</a>
                    <a className="nav-link" href="#your-rights">11. Your rights</a>
                    <a className="nav-link" href="#children">12. Children</a>
                    <a className="nav-link" href="#international">13. International transfers</a>
                    <a className="nav-link" href="#changes">14. Changes</a>
                    <a className="nav-link" href="#contact">15. Contact</a>
                  </nav>
                </div>
              </div>

              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 p-lg-5 legal-doc">

                  <p className="lead">
                    This Privacy Policy explains how <strong>FUDARI</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo;
                    or &ldquo;us&rdquo;) collects, uses, shares, and protects personal data when you use our
                    website, mobile experiences, WhatsApp services, or any related APIs (the
                    &ldquo;<strong>Platform</strong>&rdquo;).
                  </p>
                  <p>
                    We process personal data in line with the <strong>Kenya Data Protection Act, 2019</strong> and
                    the regulations issued under it. By using the Platform you acknowledge the practices described
                    here. This policy should be read together with our{' '}
                    <Link href="/terms" className="text-primary fw-semibold">Terms of Service</Link>.
                  </p>

                  {/* ── 1 ── */}
                  <h2 id="who-we-are" className="h4 fw-bold mt-5">1. Who we are</h2>
                  <p>
                    Fudari Limited is the data controller for personal data processed through the Platform. Our
                    contact details are at the bottom of this page.
                  </p>

                  {/* ── 2 ── */}
                  <h2 id="data-we-collect" className="h4 fw-bold mt-5">2. Personal data we collect</h2>
                  <p>We collect the following categories of personal data:</p>
                  <ul>
                    <li><strong>Account data:</strong> first name, last name, email address, Kenyan phone number, password (stored hashed with BCrypt), role (CLIENT / WORKER / ADMIN), referral code.</li>
                    <li><strong>Profile data (artisans):</strong> profile photo, skills, hourly rate, bio, years of experience, optional national ID number, certificate of good conduct, TVET certification, M-Pesa account number for payouts.</li>
                    <li><strong>Location data:</strong> service area name, GPS latitude/longitude (only when you grant browser permission or type it manually), and the customer&rsquo;s job address.</li>
                    <li><strong>Job &amp; transaction data:</strong> bookings, bids, agreed prices, M-Pesa transaction IDs, escrow records, ratings, reviews, dispute messages.</li>
                    <li><strong>Communication data:</strong> chat messages between customers and artisans, SMS and WhatsApp messages sent through the Platform, support tickets.</li>
                    <li><strong>Device &amp; usage data:</strong> IP address, browser type, device identifier, pages viewed, links clicked, profile views, call/WhatsApp button clicks (used for analytics and ranking).</li>
                    <li><strong>Cookies &amp; local storage:</strong> JWT token, session preferences (see <a href="#cookies">section 7</a>).</li>
                  </ul>

                  {/* ── 3 ── */}
                  <h2 id="how-we-use" className="h4 fw-bold mt-5">3. How we use your data</h2>
                  <ul>
                    <li>Create and manage your account, log you in, and protect against fraud or abuse.</li>
                    <li>Match customers with nearby, suitable artisans and rank search results.</li>
                    <li>Process subscription payments via M-Pesa and verify transactions.</li>
                    <li>Calculate the artisan Trust Score and vetting level (STANDARD / VERIFIED / PRO).</li>
                    <li>Send transactional notifications (booking confirmations, OTPs, job updates) via SMS, WhatsApp, or email.</li>
                    <li>Improve the Platform — debugging, analytics, A/B testing, and feature development.</li>
                    <li>Comply with legal obligations, respond to lawful requests, and enforce our Terms.</li>
                  </ul>

                  {/* ── 4 ── */}
                  <h2 id="legal-basis" className="h4 fw-bold mt-5">4. Legal basis for processing</h2>
                  <p>
                    We rely on the following lawful bases set out in section 30 of the Data Protection Act, 2019:
                  </p>
                  <ul>
                    <li><strong>Performance of a contract</strong> — to deliver the marketplace service you signed up for.</li>
                    <li><strong>Consent</strong> — for optional features such as precise GPS location, marketing emails, and cookies that are not strictly necessary. You can withdraw consent at any time.</li>
                    <li><strong>Legitimate interests</strong> — to keep the Platform safe, prevent fraud, and improve search quality, balanced against your privacy rights.</li>
                    <li><strong>Legal obligation</strong> — when we are required to retain or disclose data under Kenyan law (e.g., tax, anti-money-laundering).</li>
                  </ul>

                  {/* ── 5 ── */}
                  <h2 id="sharing" className="h4 fw-bold mt-5">5. How we share your data</h2>
                  <p>We share personal data only with parties who need it to deliver the service:</p>
                  <ul>
                    <li><strong>Other users:</strong> when a customer contacts an artisan, the artisan sees the customer&rsquo;s first name, phone number, location, and job description. When a customer views an artisan, the artisan&rsquo;s public profile (name, photo, skills, ratings, location area) is visible. Reviews submitted are visible publicly with the reviewer&rsquo;s first name only.</li>
                    <li><strong>Estate partners:</strong> if you book through an estate-branded short-code (e.g., <code>FDH1</code>), the estate manager receives the booking details to coordinate the job.</li>
                    <li><strong>Payment providers:</strong> Safaricom M-Pesa (Daraja API) for payment initiation and verification.</li>
                    <li><strong>Communication providers:</strong> Africa&rsquo;s Talking for SMS, Meta WhatsApp Business API for WhatsApp messages.</li>
                    <li><strong>Infrastructure providers:</strong> our cloud hosting provider, PostgreSQL database, Redis cache, and CDN. They process data on our instructions only.</li>
                    <li><strong>Authorities &amp; legal:</strong> the police, the Office of the Data Protection Commissioner, the courts, or KRA, where required by law or to protect rights, property, and safety.</li>
                  </ul>
                  <div className="legal-callout">
                    <p><strong>We never sell your personal data.</strong></p>
                  </div>

                  {/* ── 6 ── */}
                  <h2 id="location" className="h4 fw-bold mt-5">6. Location data</h2>
                  <p>
                    When you allow your browser to share precise location, we use it to (a) suggest your service
                    area on the artisan onboarding flow, and (b) sort artisans by distance on the customer search
                    results. You can revoke this permission in your browser settings at any time. Coarse location
                    typed by you (e.g., &ldquo;Westlands, Nairobi&rdquo;) is stored on your profile so customers in
                    your area can find you.
                  </p>

                  {/* ── 7 ── */}
                  <h2 id="cookies" className="h4 fw-bold mt-5">7. Cookies &amp; local storage</h2>
                  <p>
                    We use only the cookies and browser storage that are strictly necessary to keep you logged in
                    (a JWT token in <code>localStorage</code>) and to remember light UI preferences such as the
                    last selected billing cycle. We do not use third-party advertising cookies. You can clear
                    these at any time from your browser.
                  </p>

                  {/* ── 8 ── */}
                  <h2 id="sms-whatsapp" className="h4 fw-bold mt-5">8. SMS &amp; WhatsApp messaging</h2>
                  <p>
                    By signing up with a Kenyan phone number you agree to receive transactional SMS and WhatsApp
                    messages relating to your account, bookings, payment confirmations, and security alerts. You
                    may opt out of marketing messages at any time by replying <code>STOP</code> to any SMS we
                    send, or by adjusting your preferences in{' '}
                    <Link href="/dashboard/settings" className="text-primary fw-semibold">Dashboard → Settings</Link>. Opting
                    out of transactional messages may impair service delivery.
                  </p>

                  {/* ── 9 ── */}
                  <h2 id="retention" className="h4 fw-bold mt-5">9. How long we keep your data</h2>
                  <div className="table-responsive mt-3 mb-3">
                    <table className="table table-bordered table-sm align-middle small">
                      <thead className="table-light">
                        <tr>
                          <th>Data type</th>
                          <th>Retention period</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Active accounts</td>
                          <td>For as long as the account is open</td>
                        </tr>
                        <tr>
                          <td>Closed accounts</td>
                          <td>Up to 24 months (soft-deleted), then anonymised</td>
                        </tr>
                        <tr>
                          <td>Job records, reviews, M-Pesa transaction IDs</td>
                          <td>At least 7 years (Kenyan tax laws)</td>
                        </tr>
                        <tr>
                          <td>Server &amp; security logs</td>
                          <td>Typically 90 days</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── 10 ── */}
                  <h2 id="security" className="h4 fw-bold mt-5">10. How we protect your data</h2>
                  <ul>
                    <li>Passwords are stored as BCrypt hashes — never in plaintext.</li>
                    <li>Authentication uses signed, short-lived JSON Web Tokens (JWT).</li>
                    <li>All traffic between your device and our servers is encrypted with TLS (HTTPS).</li>
                    <li>API endpoints have rate-limiting, input validation, and CORS protection.</li>
                    <li>Internal access to personal data is restricted on a least-privilege basis.</li>
                  </ul>
                  <div className="legal-callout">
                    <p>
                      No system is 100% secure. If we discover a personal-data breach that is likely to result in
                      risk to your rights and freedoms, we will notify the Office of the Data Protection Commissioner
                      within <strong>72 hours</strong> and inform affected users without undue delay, as required by
                      section 43 of the Data Protection Act, 2019.
                    </p>
                  </div>

                  {/* ── 11 ── */}
                  <h2 id="your-rights" className="h4 fw-bold mt-5">11. Your rights</h2>
                  <p>Under the Kenya Data Protection Act, 2019, you have the right to:</p>
                  <div className="rights-grid mt-3 mb-3">
                    <div className="right-item">
                      <span className="right-icon"><i className="fa-solid fa-eye"></i></span>
                      <div>
                        <div className="fw-semibold small">Access</div>
                        <div className="text-muted x-small">Request a copy of data we hold about you</div>
                      </div>
                    </div>
                    <div className="right-item">
                      <span className="right-icon"><i className="fa-solid fa-pen"></i></span>
                      <div>
                        <div className="fw-semibold small">Rectify</div>
                        <div className="text-muted x-small">Correct inaccurate or incomplete data</div>
                      </div>
                    </div>
                    <div className="right-item">
                      <span className="right-icon"><i className="fa-solid fa-trash-can"></i></span>
                      <div>
                        <div className="fw-semibold small">Erase</div>
                        <div className="text-muted x-small">&ldquo;Right to be forgotten&rdquo;, subject to legal retention</div>
                      </div>
                    </div>
                    <div className="right-item">
                      <span className="right-icon"><i className="fa-solid fa-hand"></i></span>
                      <div>
                        <div className="fw-semibold small">Object / Restrict</div>
                        <div className="text-muted x-small">Especially for legitimate-interest processing</div>
                      </div>
                    </div>
                    <div className="right-item">
                      <span className="right-icon"><i className="fa-solid fa-rotate-left"></i></span>
                      <div>
                        <div className="fw-semibold small">Withdraw consent</div>
                        <div className="text-muted x-small">At any time where we rely on consent</div>
                      </div>
                    </div>
                    <div className="right-item">
                      <span className="right-icon"><i className="fa-solid fa-file-export"></i></span>
                      <div>
                        <div className="fw-semibold small">Data portability</div>
                        <div className="text-muted x-small">Receive your data in machine-readable format</div>
                      </div>
                    </div>
                  </div>
                  <p>
                    To exercise any right, email{' '}
                    <a href="mailto:privacy@fudari.co" className="text-primary fw-semibold">privacy@fudari.co</a>{' '}
                    from the address registered on your account. We will respond within 30 days. You may also{' '}
                    <a href="https://www.odpc.go.ke" target="_blank" rel="noreferrer" className="text-primary fw-semibold">
                      lodge a complaint with the ODPC
                    </a>.
                  </p>

                  {/* ── 12 ── */}
                  <h2 id="children" className="h4 fw-bold mt-5">12. Children&rsquo;s data</h2>
                  <p>
                    The Platform is not directed to anyone under the age of 18. We do not knowingly collect
                    personal data from children. If you believe a child has shared data with us, please contact
                    us so we can delete it.
                  </p>

                  {/* ── 13 ── */}
                  <h2 id="international" className="h4 fw-bold mt-5">13. International transfers</h2>
                  <p>
                    Our infrastructure providers may store backups in data centres outside Kenya. Where data
                    leaves Kenya, we rely on the safeguards set out in section 48 of the Data Protection Act,
                    2019 — namely, transfers to jurisdictions with adequate protection or under standard
                    contractual clauses with our processors.
                  </p>

                  {/* ── 14 ── */}
                  <h2 id="changes" className="h4 fw-bold mt-5">14. Changes to this Policy</h2>
                  <p>
                    We may update this Policy as the Platform evolves. The &ldquo;Last updated&rdquo; date at the
                    top of this page reflects the most recent version. Material changes will be notified via
                    email, SMS, or an in-app banner before they take effect.
                  </p>

                  {/* ── 15 ── */}
                  <h2 id="contact" className="h4 fw-bold mt-5">15. Contact us</h2>
                  <p>Data-related enquiries:</p>
                  <div className="contact-grid mt-3">
                    <a href="mailto:privacy@fudari.co" className="contact-item text-decoration-none">
                      <span className="contact-icon"><i className="fa-solid fa-user-shield"></i></span>
                      <span>
                        <div className="small text-muted fw-semibold mb-1">Data Protection Officer</div>
                        <div className="fw-medium text-dark">privacy@fudari.co</div>
                      </span>
                    </a>
                    <a href="mailto:info@fudari.co" className="contact-item text-decoration-none">
                      <span className="contact-icon"><i className="fa-solid fa-envelope"></i></span>
                      <span>
                        <div className="small text-muted fw-semibold mb-1">General</div>
                        <div className="fw-medium text-dark">info@fudari.co</div>
                      </span>
                    </a>
                    <a href="tel:+254703954539" className="contact-item text-decoration-none">
                      <span className="contact-icon"><i className="fa-solid fa-phone"></i></span>
                      <span>
                        <div className="small text-muted fw-semibold mb-1">Phone</div>
                        <div className="fw-medium text-dark">+254 703 954 539</div>
                      </span>
                    </a>
                    <div className="contact-item">
                      <span className="contact-icon"><i className="fa-solid fa-location-dot"></i></span>
                      <span>
                        <div className="small text-muted fw-semibold mb-1">Location</div>
                        <div className="fw-medium text-dark">Nairobi, Kenya</div>
                      </span>
                    </div>
                  </div>

                  <hr className="my-4" />
                  <p className="text-muted small mb-0">
                    See also our{' '}
                    <Link href="/terms" className="text-primary fw-semibold">Terms of Service</Link> for the
                    contractual terms that govern use of the Platform.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ── Cross-link banner ─────────────────────────────────────────── */}
        <section className="container pb-3">
          <div className="card border-0 rounded-4 overflow-hidden">
            <div className="card-body p-4 d-flex flex-column flex-sm-row align-items-center gap-4 cross-link-banner">
              <div className="flex-shrink-0 text-white" style={{ fontSize: '2.5rem' }}>
                <i className="fa-solid fa-file-contract"></i>
              </div>
              <div className="flex-grow-1 text-white">
                <h2 className="h5 fw-bold mb-1">Also read our Terms of Service</h2>
                <p className="mb-0 opacity-75 small">
                  The contractual rules that govern your use of FUDARI — covering accounts, payments, and disputes.
                </p>
              </div>
              <Link href="/terms" className="btn btn-light fw-semibold flex-shrink-0">
                Read Terms <i className="fa-solid fa-arrow-right ms-1"></i>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      <style>{`
        /* Reading progress bar (progressive enhancement) */
        @supports (animation-timeline: scroll()) {
          .reading-progress {
            position: fixed; top: 0; left: 0; width: 100%; height: 3px;
            background: var(--bs-primary); z-index: 9999;
            transform-origin: 0 50%; transform: scaleX(0);
            animation: readProgress linear;
            animation-timeline: scroll(root);
          }
          @keyframes readProgress { to { transform: scaleX(1); } }
        }

        /* Hero */
        .legal-hero.dark-overlay::before {
          background: linear-gradient(135deg, rgba(13,92,99,0.94) 0%, rgba(11,27,35,0.9) 100%);
        }
        .hero-badge {
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(4px);
          color: #fff;
          font-weight: 500;
        }
        .hero-icon {
          font-size: 7rem;
          opacity: 0.18;
          color: #fff;
        }

        /* TOC */
        .legal-toc a {
          color: #666; border-left: 2px solid transparent;
          transition: all .15s ease; padding: .25rem .6rem !important;
          border-radius: 0 .25rem .25rem 0; display: block;
        }
        .legal-toc a:hover { color: var(--bs-primary) !important; background: rgba(13,92,99,.06); }
        .legal-toc a.toc-active {
          color: var(--bs-primary) !important; font-weight: 600;
          border-left-color: var(--bs-primary); background: rgba(13,92,99,.1);
        }

        /* Document typography */
        .legal-doc h2 {
          scroll-margin-top: 100px;
          padding-bottom: .6rem;
          border-bottom: 2px solid #f0f0f2;
          color: #1a1a2e;
        }
        .legal-doc p { line-height: 1.78; color: #444; }
        .legal-doc ul { line-height: 1.88; color: #444; }
        .legal-doc li { margin-bottom: .35rem; }
        .legal-doc a { color: var(--bs-primary); }
        .legal-doc a:hover { color: var(--tx-primary-dark); }
        .legal-doc code {
          background: #f4f4f7; padding: 2px 6px; border-radius: 4px;
          font-size: .9em; color: #c7254e;
        }

        /* Callout boxes */
        .legal-callout {
          background: rgba(13,92,99,.06);
          border-left: 4px solid var(--bs-primary);
          border-radius: 0 .5rem .5rem 0;
          padding: 1rem 1.25rem; margin: 1.5rem 0;
        }
        .legal-callout p { margin-bottom: 0; color: #333; }

        /* Rights grid */
        .rights-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .75rem; }
        @media (max-width: 767px) { .rights-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 479px) { .rights-grid { grid-template-columns: 1fr; } }
        .right-item {
          display: flex; align-items: flex-start; gap: .6rem;
          padding: .75rem; border-radius: .5rem;
          background: #f8f9fa; border: 1px solid #eee;
        }
        .right-icon {
          width: 2rem; height: 2rem; border-radius: .35rem;
          background: var(--bs-primary); color: #fff; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: .8rem;
        }
        .x-small { font-size: .75rem; }

        /* Contact grid */
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
        @media (max-width: 575px) { .contact-grid { grid-template-columns: 1fr; } }
        .contact-item {
          display: flex; align-items: flex-start; gap: .75rem;
          padding: .875rem 1rem; border-radius: .5rem;
          background: #f8f9fa; border: 1px solid #eee;
          color: inherit; text-decoration: none;
          transition: box-shadow .15s ease;
        }
        .contact-item:hover { background: #fff; box-shadow: 0 3px 10px rgba(0,0,0,.08); }
        .contact-icon {
          width: 2.25rem; height: 2.25rem; border-radius: .4rem;
          background: var(--bs-primary); color: #fff; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: .85rem;
        }

        /* Cross-link banner */
        .cross-link-banner {
          background: linear-gradient(135deg, var(--tx-ink) 0%, var(--bs-primary) 100%);
        }

        @media print {
          .reading-progress, nav, aside, .d-lg-none, .btn, .cross-link-banner { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>
    </>
  );
}
