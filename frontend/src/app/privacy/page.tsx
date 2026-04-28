import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | TUFIXIT',
  description:
    'How TUFIXIT collects, uses, and protects personal data of customers, artisans, and estate partners under the Kenya Data Protection Act, 2019.',
  alternates: { canonical: 'https://tufixit.com/privacy' },
};

const EFFECTIVE_DATE = 'April 28, 2026';
const LAST_UPDATED = 'April 28, 2026';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />

      <main className="bg-light pb-5">
        {/* Hero */}
        <section className="position-relative overflow-hidden mx-3 mt-3 rounded-4 dark-overlay">
          <img className="bg-image" src="/liston/images/header/lg-01.jpg" alt="" aria-hidden="true" />
          <div className="container overlay-content py-5 text-white text-center">
            <span className="badge bg-primary px-3 py-2 mb-3">Legal</span>
            <h1 className="display-5 fw-bold mb-2">Privacy Policy</h1>
            <p className="mb-0 opacity-75">
              Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="container py-5">
          <div className="row g-4">
            {/* Table of contents */}
            <aside className="col-lg-3 d-none d-lg-block">
              <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: 100 }}>
                <div className="card-body p-3">
                  <h6 className="fw-bold text-uppercase small text-muted mb-3">On this page</h6>
                  <nav className="nav flex-column small">
                    <a className="nav-link px-2 py-1" href="#who-we-are">1. Who we are</a>
                    <a className="nav-link px-2 py-1" href="#data-we-collect">2. Data we collect</a>
                    <a className="nav-link px-2 py-1" href="#how-we-use">3. How we use it</a>
                    <a className="nav-link px-2 py-1" href="#legal-basis">4. Legal basis</a>
                    <a className="nav-link px-2 py-1" href="#sharing">5. Sharing</a>
                    <a className="nav-link px-2 py-1" href="#location">6. Location data</a>
                    <a className="nav-link px-2 py-1" href="#cookies">7. Cookies</a>
                    <a className="nav-link px-2 py-1" href="#sms-whatsapp">8. SMS &amp; WhatsApp</a>
                    <a className="nav-link px-2 py-1" href="#retention">9. Retention</a>
                    <a className="nav-link px-2 py-1" href="#security">10. Security</a>
                    <a className="nav-link px-2 py-1" href="#your-rights">11. Your rights</a>
                    <a className="nav-link px-2 py-1" href="#children">12. Children</a>
                    <a className="nav-link px-2 py-1" href="#international">13. International transfers</a>
                    <a className="nav-link px-2 py-1" href="#changes">14. Changes</a>
                    <a className="nav-link px-2 py-1" href="#contact">15. Contact</a>
                  </nav>
                </div>
              </div>
            </aside>

            {/* Article */}
            <article className="col-lg-9">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 p-lg-5 legal-doc">
                  <p className="lead">
                    This Privacy Policy explains how <strong>TUFIXIT</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo;
                    or &ldquo;us&rdquo;) collects, uses, shares, and protects personal data when you use our
                    website, mobile experiences, WhatsApp services, or any related APIs (the
                    &ldquo;<strong>Platform</strong>&rdquo;).
                  </p>
                  <p>
                    We process personal data in line with the <strong>Kenya Data Protection Act, 2019</strong> and
                    the regulations issued under it. By using the Platform you acknowledge the practices described
                    here. This policy should be read together with our{' '}
                    <Link href="/terms" className="text-primary">Terms of Service</Link>.
                  </p>

                  <h2 id="who-we-are" className="h4 fw-bold mt-5">1. Who we are</h2>
                  <p>
                    TuFixIt Limited is the data controller for personal data processed through the Platform. Our
                    contact details are at the bottom of this page.
                  </p>

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
                  <p><strong>We never sell your personal data.</strong></p>

                  <h2 id="location" className="h4 fw-bold mt-5">6. Location data</h2>
                  <p>
                    When you allow your browser to share precise location, we use it to (a) suggest your service
                    area on the artisan onboarding flow, and (b) sort artisans by distance on the customer search
                    results. You can revoke this permission in your browser settings at any time. Coarse location
                    typed by you (e.g., &ldquo;Westlands, Nairobi&rdquo;) is stored on your profile so customers in
                    your area can find you.
                  </p>

                  <h2 id="cookies" className="h4 fw-bold mt-5">7. Cookies &amp; local storage</h2>
                  <p>
                    We use only the cookies and browser storage that are strictly necessary to keep you logged in
                    (a JWT token in <code>localStorage</code>) and to remember light UI preferences such as the
                    last selected billing cycle. We do not use third-party advertising cookies. You can clear
                    these at any time from your browser.
                  </p>

                  <h2 id="sms-whatsapp" className="h4 fw-bold mt-5">8. SMS &amp; WhatsApp messaging</h2>
                  <p>
                    By signing up with a Kenyan phone number you agree to receive transactional SMS and WhatsApp
                    messages relating to your account, bookings, payment confirmations, and security alerts. You
                    may opt out of marketing messages at any time by replying <code>STOP</code> to any SMS we
                    send, or by adjusting your preferences in{' '}
                    <Link href="/dashboard/settings" className="text-primary">Dashboard → Settings</Link>. Opting
                    out of transactional messages may impair service delivery.
                  </p>

                  <h2 id="retention" className="h4 fw-bold mt-5">9. How long we keep your data</h2>
                  <ul>
                    <li><strong>Active accounts:</strong> for as long as the account is open.</li>
                    <li><strong>Closed accounts:</strong> retained in a soft-deleted state for up to 24 months to comply with tax, accounting, and dispute-handling obligations, then anonymised.</li>
                    <li><strong>Job records, reviews, and M-Pesa transaction IDs:</strong> retained for at least 7 years to satisfy Kenyan tax laws.</li>
                    <li><strong>Server &amp; security logs:</strong> typically 90 days.</li>
                  </ul>

                  <h2 id="security" className="h4 fw-bold mt-5">10. How we protect your data</h2>
                  <ul>
                    <li>Passwords are stored as BCrypt hashes — never in plaintext.</li>
                    <li>Authentication uses signed, short-lived JSON Web Tokens (JWT).</li>
                    <li>All traffic between your device and our servers is encrypted with TLS (HTTPS).</li>
                    <li>API endpoints have rate-limiting, input validation, and CORS protection.</li>
                    <li>Internal access to personal data is restricted on a least-privilege basis.</li>
                  </ul>
                  <p>
                    No system is 100% secure. If we discover a personal-data breach that is likely to result in
                    risk to your rights and freedoms, we will notify the Office of the Data Protection
                    Commissioner within 72 hours and inform affected users without undue delay, as required by
                    section 43 of the Data Protection Act, 2019.
                  </p>

                  <h2 id="your-rights" className="h4 fw-bold mt-5">11. Your rights</h2>
                  <p>
                    Under the Kenya Data Protection Act, 2019, you have the right to:
                  </p>
                  <ul>
                    <li><strong>Access</strong> a copy of the personal data we hold about you.</li>
                    <li><strong>Rectify</strong> inaccurate or incomplete data — most fields are editable from your dashboard.</li>
                    <li><strong>Erase</strong> your data (&ldquo;right to be forgotten&rdquo;), subject to our legal-retention obligations.</li>
                    <li><strong>Object to or restrict</strong> certain processing, especially processing based on legitimate interests.</li>
                    <li><strong>Withdraw consent</strong> at any time where we rely on consent.</li>
                    <li><strong>Data portability</strong> — receive your data in a structured, machine-readable format.</li>
                    <li><strong>Lodge a complaint</strong> with the Office of the Data Protection Commissioner — <a href="https://www.odpc.go.ke" target="_blank" rel="noreferrer">www.odpc.go.ke</a>.</li>
                  </ul>
                  <p>
                    To exercise any right, email{' '}
                    <a href="mailto:privacy@tufixit.com">privacy@tufixit.com</a>{' '}
                    from the address registered on your account. We will respond within 30 days.
                  </p>

                  <h2 id="children" className="h4 fw-bold mt-5">12. Children&rsquo;s data</h2>
                  <p>
                    The Platform is not directed to anyone under the age of 18. We do not knowingly collect
                    personal data from children. If you believe a child has shared data with us, please contact
                    us so we can delete it.
                  </p>

                  <h2 id="international" className="h4 fw-bold mt-5">13. International transfers</h2>
                  <p>
                    Our infrastructure providers may store backups in data centres outside Kenya. Where data
                    leaves Kenya, we rely on the safeguards set out in section 48 of the Data Protection Act,
                    2019 — namely, transfers to jurisdictions with adequate protection or under standard
                    contractual clauses with our processors.
                  </p>

                  <h2 id="changes" className="h4 fw-bold mt-5">14. Changes to this Policy</h2>
                  <p>
                    We may update this Policy as the Platform evolves. The &ldquo;Last updated&rdquo; date at the
                    top of this page reflects the most recent version. Material changes will be notified via
                    email, SMS, or an in-app banner before they take effect.
                  </p>

                  <h2 id="contact" className="h4 fw-bold mt-5">15. Contact us</h2>
                  <ul className="list-unstyled">
                    <li><i className="fa-solid fa-user-shield text-primary me-2"></i>Data Protection Officer: <a href="mailto:privacy@tufixit.com">privacy@tufixit.com</a></li>
                    <li><i className="fa-solid fa-envelope text-primary me-2"></i>General: <a href="mailto:info@tufixit.com">info@tufixit.com</a></li>
                    <li><i className="fa-solid fa-phone text-primary me-2"></i><a href="tel:+254703954539">+254 703 954 539</a></li>
                    <li><i className="fa-solid fa-location-dot text-primary me-2"></i>Nairobi, Kenya</li>
                  </ul>

                  <hr className="my-4" />
                  <p className="text-muted small mb-0">
                    See also our{' '}
                    <Link href="/terms" className="text-primary">Terms of Service</Link> for the contractual terms
                    that govern use of the Platform.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .legal-doc h2 { scroll-margin-top: 100px; }
        .legal-doc p { line-height: 1.75; color: #444; }
        .legal-doc ul { line-height: 1.85; color: #444; }
        .legal-doc code {
          background: #f4f4f7; padding: 2px 6px; border-radius: 4px;
          font-size: 0.9em; color: #c7254e;
        }
      `}</style>
    </>
  );
}
