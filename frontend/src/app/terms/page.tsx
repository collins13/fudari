import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LegalPageClient from '@/components/LegalPageClient';

export const metadata: Metadata = {
  title: 'Terms of Service | FUDARI',
  description:
    'Terms of Service governing the use of the FUDARI marketplace by customers, service providers, and estate partners in Kenya.',
  alternates: { canonical: 'https://fudari.co/terms' },
};

const EFFECTIVE_DATE = 'April 28, 2026';
const LAST_UPDATED = 'April 28, 2026';

export default function TermsPage() {
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
                  <i className="fa-solid fa-file-contract me-1"></i> Legal
                </span>
                <h1 className="display-5 fw-bold mb-2">Terms of Service</h1>
                <p className="opacity-75 mb-3">
                  Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge hero-badge px-3 py-2">
                    <i className="fa-solid fa-clock me-1"></i> ~8 min read
                  </span>
                  <span className="badge hero-badge px-3 py-2">
                    <i className="fa-solid fa-list-ol me-1"></i> 15 sections
                  </span>
                  <span className="badge hero-badge px-3 py-2">
                    <i className="fa-solid fa-flag me-1"></i> Kenya law
                  </span>
                </div>
              </div>
              <div className="col-md-4 text-center d-none d-md-block">
                <i className="fa-solid fa-scale-balanced hero-icon"></i>
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
                    <a className="nav-link" href="#acceptance">1. Acceptance</a>
                    <a className="nav-link" href="#service">2. Our Service</a>
                    <a className="nav-link" href="#accounts">3. Accounts &amp; Eligibility</a>
                    <a className="nav-link" href="#artisans">4. Artisans &amp; Subscriptions</a>
                    <a className="nav-link" href="#customers">5. Customers</a>
                    <a className="nav-link" href="#estates">6. Estate Partners</a>
                    <a className="nav-link" href="#payments">7. Payments &amp; M-Pesa</a>
                    <a className="nav-link" href="#vetting">8. Vetting &amp; Trust Score</a>
                    <a className="nav-link" href="#conduct">9. User Conduct</a>
                    <a className="nav-link" href="#liability">10. Disclaimers &amp; Liability</a>
                    <a className="nav-link" href="#disputes">11. Disputes &amp; Refunds</a>
                    <a className="nav-link" href="#termination">12. Termination</a>
                    <a className="nav-link" href="#changes">13. Changes</a>
                    <a className="nav-link" href="#governing-law">14. Governing Law</a>
                    <a className="nav-link" href="#contact">15. Contact</a>
                  </nav>
                  <hr className="my-3" />
                  <Link href="/privacy" className="btn btn-outline-primary btn-sm w-100">
                    <i className="fa-solid fa-shield-halved me-1"></i> Privacy Policy
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
                    <a className="nav-link" href="#acceptance">1. Acceptance</a>
                    <a className="nav-link" href="#service">2. Our Service</a>
                    <a className="nav-link" href="#accounts">3. Accounts &amp; Eligibility</a>
                    <a className="nav-link" href="#artisans">4. Artisans &amp; Subscriptions</a>
                    <a className="nav-link" href="#customers">5. Customers</a>
                    <a className="nav-link" href="#estates">6. Estate Partners</a>
                    <a className="nav-link" href="#payments">7. Payments &amp; M-Pesa</a>
                    <a className="nav-link" href="#vetting">8. Vetting &amp; Trust Score</a>
                    <a className="nav-link" href="#conduct">9. User Conduct</a>
                    <a className="nav-link" href="#liability">10. Disclaimers &amp; Liability</a>
                    <a className="nav-link" href="#disputes">11. Disputes &amp; Refunds</a>
                    <a className="nav-link" href="#termination">12. Termination</a>
                    <a className="nav-link" href="#changes">13. Changes</a>
                    <a className="nav-link" href="#governing-law">14. Governing Law</a>
                    <a className="nav-link" href="#contact">15. Contact</a>
                  </nav>
                </div>
              </div>

              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 p-lg-5 legal-doc">

                  <p className="lead">
                    Welcome to <strong>FUDARI</strong>. These Terms of Service (the &ldquo;<strong>Terms</strong>&rdquo;)
                    form a binding agreement between you and Fudari Limited, a company operating in Kenya
                    (&ldquo;<strong>FUDARI</strong>,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), and govern
                    your access to and use of our website, mobile experiences, WhatsApp services, and any related
                    APIs (collectively, the &ldquo;<strong>Platform</strong>&rdquo;).
                  </p>
                  <p>
                    Please read these Terms carefully. By creating an account, browsing listings, contacting an
                    artisan, booking a job, or otherwise using the Platform, you confirm that you have read,
                    understood, and agreed to be bound by these Terms and by our{' '}
                    <Link href="/privacy" className="text-primary fw-semibold">Privacy Policy</Link>.
                  </p>

                  {/* ── 1 ── */}
                  <h2 id="acceptance" className="h4 fw-bold mt-5">1. Acceptance of these Terms</h2>
                  <p>
                    These Terms apply to every visitor, registered customer, registered service provider
                    (also referred to as an &ldquo;artisan&rdquo;, &ldquo;fundi&rdquo; or &ldquo;pro&rdquo;), estate manager,
                    and administrator. If you do not agree with any part of these Terms, you must not use the
                    Platform.
                  </p>

                  {/* ── 2 ── */}
                  <h2 id="service" className="h4 fw-bold mt-5">2. Our Service</h2>
                  <p>
                    FUDARI is a location-based marketplace that connects customers in Kenya with verified local
                    service providers (electrical, plumbing, mechanics, carpentry, painting, welding, HVAC,
                    masonry, roofing, tiling, cleaning and laundry, gardening, security, appliance repair,
                    moving and delivery, boda boda and tuk tuk transport, beauty and personal care, car wash
                    and tyre services, photography, design, IT support, and other categories we may add).
                  </p>
                  <div className="legal-callout">
                    <p>
                      <strong>FUDARI is a neutral marketplace.</strong> We are <strong>not</strong> the employer,
                      agent, partner, or representative of any artisan listed on the Platform. Each artisan is an
                      independent contractor who alone performs the services. The contract for the actual service
                      (the &ldquo;<strong>Service Contract</strong>&rdquo;) is concluded directly between the customer
                      and the artisan.
                    </p>
                  </div>

                  {/* ── 3 ── */}
                  <h2 id="accounts" className="h4 fw-bold mt-5">3. Accounts &amp; Eligibility</h2>
                  <ul>
                    <li>You must be at least <strong>18 years old</strong> and able to enter into a binding contract under Kenyan law to register an account.</li>
                    <li>You must provide accurate, current, and complete information (full name, Kenyan phone number, email, and location) and keep it up to date.</li>
                    <li>You are responsible for safeguarding your password and any activity that occurs under your account. Notify us immediately at <a href="mailto:security@fudari.co" className="text-primary">security@fudari.co</a> if you suspect unauthorised access.</li>
                    <li>One natural person may hold one customer account and, separately, one artisan account. Duplicate, fictitious, or shared accounts may be suspended without notice.</li>
                    <li>Customers may also use the Platform via WhatsApp or as guests without registering. Guest contact details supplied to start a chat are subject to these Terms.</li>
                  </ul>

                  {/* ── 4 ── */}
                  <h2 id="artisans" className="h4 fw-bold mt-5">4. Artisans &amp; Subscriptions</h2>
                  <p>
                    Artisans may register to publish service listings, receive bookings, and grow their client
                    base. By registering as an artisan you represent and warrant that:
                  </p>
                  <ul>
                    <li>You are legally permitted to provide the services you list;</li>
                    <li>You hold any licences, permits, or qualifications required by law (e.g., EPRA licence for electrical work, NCA registration for masonry where applicable);</li>
                    <li>The information in your profile (skills, experience, hourly rate, photos, certificates) is true, current, and lawfully obtained;</li>
                    <li>You will only upload photographs of yourself, your work, or content you have the right to use.</li>
                  </ul>
                  <p>Subscription plans available to artisans:</p>
                  <div className="table-responsive mt-3 mb-3">
                    <table className="table table-bordered table-sm align-middle small">
                      <thead className="table-light">
                        <tr>
                          <th>Plan</th>
                          <th>Price</th>
                          <th>Listings</th>
                          <th>Perks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><span className="badge bg-secondary">FREE</span></td>
                          <td>KES 0</td>
                          <td>1</td>
                          <td>Standard search visibility</td>
                        </tr>
                        <tr>
                          <td><span className="badge bg-primary">BASIC</span></td>
                          <td>KES 500 / mo · KES 150 / wk</td>
                          <td>3</td>
                          <td>Higher ranking, portfolio uploads</td>
                        </tr>
                        <tr>
                          <td><span className="badge" style={{ background: '#1e1e3c' }}>PRO</span></td>
                          <td>KES 3,000 / mo · KES 800 / wk</td>
                          <td>Unlimited</td>
                          <td>Featured badge, top ranking, analytics</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p>
                    Subscriptions are activated once the corresponding M-Pesa payment is received and verified.
                    Plans renew only if you opt in to auto-renew; otherwise they expire on the end-date and the
                    artisan reverts to the FREE tier. <strong>Subscription fees are non-refundable</strong> once
                    a billing cycle has started, except where required by Kenyan law or where we expressly state
                    otherwise.
                  </p>

                  {/* ── 5 ── */}
                  <h2 id="customers" className="h4 fw-bold mt-5">5. Customers</h2>
                  <ul>
                    <li>You agree to provide truthful information when booking a job, including a real phone number, accurate location, and an honest description of the work.</li>
                    <li>You are responsible for inspecting the work delivered and for paying the agreed price (in cash, M-Pesa, or escrow where offered) once the work meets the agreed scope.</li>
                    <li>Reviews must be based on a genuine experience. Fake, paid, or retaliatory reviews may be removed and may lead to account suspension.</li>
                  </ul>

                  {/* ── 6 ── */}
                  <h2 id="estates" className="h4 fw-bold mt-5">6. Estate Partners</h2>
                  <p>
                    Residential estates may partner with FUDARI to offer maintenance services to their residents
                    via a branded estate page (e.g., <code>/estate/fedha-estate</code>) and a WhatsApp short-code.
                    The estate manager is responsible for the accuracy of the estate&rsquo;s details, the list of
                    approved artisans, and any communications sent to residents through the Platform. Commission
                    rates and contract terms between FUDARI and the estate are set out in a separate written
                    agreement.
                  </p>

                  {/* ── 7 ── */}
                  <h2 id="payments" className="h4 fw-bold mt-5">7. Payments &amp; M-Pesa</h2>
                  <ul>
                    <li>Subscription payments are made via M-Pesa Pay Bill (Business Number <strong>522522</strong>, account <em>FUDARI-&lt;PLAN&gt;</em>) and confirmed by submitting the M-Pesa transaction ID.</li>
                    <li>Job payments between customer and artisan may be made in cash or via M-Pesa direct to the artisan, unless an escrow option is used. Where escrow is used, funds are released to the artisan only after the customer marks the job as completed or after the dispute window closes.</li>
                    <li>Prices are quoted in Kenyan Shillings (KES) and are inclusive of taxes where applicable. Artisans are individually responsible for declaring and paying their own income tax.</li>
                  </ul>

                  {/* ── 8 ── */}
                  <h2 id="vetting" className="h4 fw-bold mt-5">8. Vetting Levels &amp; Trust Score</h2>
                  <p>
                    Artisans are assigned a vetting level — <em>STANDARD</em>, <em>VERIFIED</em>, or <em>PRO</em> —
                    based on documents submitted (national ID, certificate of good conduct, TVET certification),
                    the active subscription plan, and platform activity. The Trust Score is computed from job
                    completion rate, customer ratings, response time, and engagement. Both indicators are provided
                    in good faith for guidance only; they are not a guarantee of quality, safety, or outcome, and
                    customers remain responsible for their own due diligence before engaging an artisan.
                  </p>

                  {/* ── 9 ── */}
                  <h2 id="conduct" className="h4 fw-bold mt-5">9. User Conduct</h2>
                  <p>You agree <strong>NOT</strong> to:</p>
                  <ul>
                    <li>Use the Platform for any unlawful, fraudulent, or harmful purpose;</li>
                    <li>Impersonate any person or misrepresent your affiliation with any individual or entity;</li>
                    <li>Bypass FUDARI to avoid platform fees on a job that originated through the Platform;</li>
                    <li>Post offensive, defamatory, sexually explicit, discriminatory, or violent content;</li>
                    <li>Upload viruses, scrape the Platform, attempt to reverse engineer it, or interfere with its security;</li>
                    <li>Send spam, unsolicited promotions, or phishing messages via chat, SMS, or WhatsApp;</li>
                    <li>Collect or harvest other users&rsquo; personal information without their consent.</li>
                  </ul>

                  {/* ── 10 ── */}
                  <h2 id="liability" className="h4 fw-bold mt-5">10. Disclaimers &amp; Limitation of Liability</h2>
                  <p>
                    The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the maximum extent
                    permitted by law, FUDARI disclaims all warranties, express or implied, including merchantability,
                    fitness for a particular purpose, and non-infringement. We do not warrant that the Platform will
                    be uninterrupted or error-free.
                  </p>
                  <p>
                    FUDARI is not a party to the Service Contract between customer and artisan and is therefore not
                    liable for the quality of work performed, damage to property, personal injury, theft, late
                    arrival, no-shows, or any direct or consequential loss arising from a Service Contract. Customers
                    and artisans deal with each other at their own risk.
                  </p>
                  <div className="legal-callout">
                    <p>
                      Where liability cannot be excluded under Kenyan law, our aggregate liability to you in any
                      twelve-month period is capped at the greater of (a) the subscription fees you have paid us in
                      that period, or (b) <strong>KES 5,000</strong>.
                    </p>
                  </div>

                  {/* ── 11 ── */}
                  <h2 id="disputes" className="h4 fw-bold mt-5">11. Disputes &amp; Refunds</h2>
                  <p>
                    If a job goes wrong, please first try to resolve it directly with the other party. If that
                    fails, raise a dispute through the Platform within <strong>72 hours</strong> of the job&rsquo;s
                    scheduled completion. We may, in our sole discretion, mediate, hold escrow funds, or remove
                    listings, but we are not obligated to award refunds or compensation for off-platform payments.
                  </p>

                  {/* ── 12 ── */}
                  <h2 id="termination" className="h4 fw-bold mt-5">12. Suspension &amp; Termination</h2>
                  <p>
                    We may suspend or terminate any account, remove any listing, or restrict access to the
                    Platform at any time, with or without notice, if we reasonably believe a user has violated
                    these Terms, applicable law, or the rights of another user. You may close your account at any
                    time from <Link href="/dashboard/settings" className="text-primary fw-semibold">Dashboard → Settings</Link>.
                  </p>

                  {/* ── 13 ── */}
                  <h2 id="changes" className="h4 fw-bold mt-5">13. Changes to these Terms</h2>
                  <p>
                    We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date at the top of
                    this page reflects the most recent version. Material changes will be notified via email, SMS,
                    or an in-app banner at least seven (7) days before they take effect. Continued use of the
                    Platform after the effective date constitutes acceptance of the revised Terms.
                  </p>

                  {/* ── 14 ── */}
                  <h2 id="governing-law" className="h4 fw-bold mt-5">14. Governing Law &amp; Jurisdiction</h2>
                  <p>
                    These Terms are governed by the laws of the Republic of Kenya. Any dispute arising from these
                    Terms or your use of the Platform shall be submitted to the exclusive jurisdiction of the
                    courts of Nairobi, Kenya, without prejudice to any mandatory consumer-protection rights you
                    may have under the Consumer Protection Act, 2012, and the Data Protection Act, 2019.
                  </p>

                  {/* ── 15 ── */}
                  <h2 id="contact" className="h4 fw-bold mt-5">15. Contact Us</h2>
                  <p>Questions about these Terms? Reach us at:</p>
                  <div className="contact-grid mt-3">
                    <a href="mailto:legal@fudari.co" className="contact-item text-decoration-none">
                      <span className="contact-icon"><i className="fa-solid fa-envelope"></i></span>
                      <span>
                        <div className="small text-muted fw-semibold mb-1">Legal Email</div>
                        <div className="fw-medium text-dark">legal@fudari.co</div>
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
                    <div className="contact-item">
                      <span className="contact-icon"><i className="fa-solid fa-building-columns"></i></span>
                      <span>
                        <div className="small text-muted fw-semibold mb-1">Entity</div>
                        <div className="fw-medium text-dark">Fudari Limited</div>
                      </span>
                    </div>
                  </div>

                  <hr className="my-4" />
                  <p className="text-muted small mb-0">
                    By using FUDARI you acknowledge that you have read these Terms in conjunction with our{' '}
                    <Link href="/privacy" className="text-primary fw-semibold">Privacy Policy</Link>.
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
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div className="flex-grow-1 text-white">
                <h5 className="fw-bold mb-1">Also read our Privacy Policy</h5>
                <p className="mb-0 opacity-75 small">
                  Understand how we collect, use, and protect your personal data under the Kenya Data Protection Act, 2019.
                </p>
              </div>
              <Link href="/privacy" className="btn btn-light fw-semibold flex-shrink-0">
                Read Privacy Policy <i className="fa-solid fa-arrow-right ms-1"></i>
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
