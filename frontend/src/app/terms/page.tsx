import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | TUFIXIT',
  description:
    'Terms of Service governing the use of the TUFIXIT marketplace by customers, artisans (Jua Kali workers), and estate partners in Kenya.',
  alternates: { canonical: 'https://tufixit.com/terms' },
};

const EFFECTIVE_DATE = 'April 28, 2026';
const LAST_UPDATED = 'April 28, 2026';

export default function TermsPage() {
  return (
    <>
      <Navbar />

      <main className="bg-light pb-5">
        {/* Hero */}
        <section className="position-relative overflow-hidden mx-3 mt-3 rounded-4 dark-overlay">
          <img className="bg-image" src="/liston/images/header/lg-01.jpg" alt="" aria-hidden="true" />
          <div className="container overlay-content py-5 text-white text-center">
            <span className="badge bg-primary px-3 py-2 mb-3">Legal</span>
            <h1 className="display-5 fw-bold mb-2">Terms of Service</h1>
            <p className="mb-0 opacity-75">
              Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
            </p>
          </div>
        </section>

        {/* Body */}
        <section className="container py-5">
          <div className="row g-4">
            {/* Table of contents */}
            <aside className="col-lg-3 d-none d-lg-block">
              <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: 100 }}>
                <div className="card-body p-3">
                  <h6 className="fw-bold text-uppercase small text-muted mb-3">On this page</h6>
                  <nav className="nav flex-column small">
                    <a className="nav-link px-2 py-1" href="#acceptance">1. Acceptance</a>
                    <a className="nav-link px-2 py-1" href="#service">2. Our Service</a>
                    <a className="nav-link px-2 py-1" href="#accounts">3. Accounts &amp; Eligibility</a>
                    <a className="nav-link px-2 py-1" href="#artisans">4. Artisans &amp; Subscriptions</a>
                    <a className="nav-link px-2 py-1" href="#customers">5. Customers</a>
                    <a className="nav-link px-2 py-1" href="#estates">6. Estate Partners</a>
                    <a className="nav-link px-2 py-1" href="#payments">7. Payments &amp; M-Pesa</a>
                    <a className="nav-link px-2 py-1" href="#vetting">8. Vetting &amp; Trust Score</a>
                    <a className="nav-link px-2 py-1" href="#conduct">9. User Conduct</a>
                    <a className="nav-link px-2 py-1" href="#liability">10. Disclaimers &amp; Liability</a>
                    <a className="nav-link px-2 py-1" href="#disputes">11. Disputes &amp; Refunds</a>
                    <a className="nav-link px-2 py-1" href="#termination">12. Termination</a>
                    <a className="nav-link px-2 py-1" href="#changes">13. Changes</a>
                    <a className="nav-link px-2 py-1" href="#governing-law">14. Governing Law</a>
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
                    Welcome to <strong>TUFIXIT</strong>. These Terms of Service (the &ldquo;<strong>Terms</strong>&rdquo;)
                    form a binding agreement between you and TuFixIt Limited, a company operating in Kenya
                    (&ldquo;<strong>TUFIXIT</strong>,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), and govern
                    your access to and use of our website, mobile experiences, WhatsApp services, and any related
                    APIs (collectively, the &ldquo;<strong>Platform</strong>&rdquo;).
                  </p>
                  <p>
                    Please read these Terms carefully. By creating an account, browsing listings, contacting an
                    artisan, booking a job, or otherwise using the Platform, you confirm that you have read,
                    understood, and agreed to be bound by these Terms and by our{' '}
                    <Link href="/privacy" className="text-primary">Privacy Policy</Link>.
                  </p>

                  <h2 id="acceptance" className="h4 fw-bold mt-5">1. Acceptance of these Terms</h2>
                  <p>
                    These Terms apply to every visitor, registered customer, registered artisan
                    (also referred to as a &ldquo;Jua Kali worker&rdquo; or &ldquo;service provider&rdquo;), estate manager,
                    and administrator. If you do not agree with any part of these Terms, you must not use the
                    Platform.
                  </p>

                  <h2 id="service" className="h4 fw-bold mt-5">2. Our Service</h2>
                  <p>
                    TUFIXIT is a location-based marketplace that connects customers in Kenya with verified local
                    artisans for home, vehicle, and commercial services (electrical, plumbing, mechanics,
                    carpentry, painting, welding, HVAC, masonry, roofing, tiling, cleaning, gardening, security,
                    appliance repair, and other categories we may add).
                  </p>
                  <p>
                    <strong>TUFIXIT is a neutral marketplace.</strong> We are <strong>not</strong> the employer,
                    agent, partner, or representative of any artisan listed on the Platform. Each artisan is an
                    independent contractor who alone performs the services. The contract for the actual service
                    (the &ldquo;<strong>Service Contract</strong>&rdquo;) is concluded directly between the customer
                    and the artisan.
                  </p>

                  <h2 id="accounts" className="h4 fw-bold mt-5">3. Accounts &amp; Eligibility</h2>
                  <ul>
                    <li>You must be at least <strong>18 years old</strong> and able to enter into a binding contract under Kenyan law to register an account.</li>
                    <li>You must provide accurate, current, and complete information (full name, Kenyan phone number, email, and location) and keep it up to date.</li>
                    <li>You are responsible for safeguarding your password and any activity that occurs under your account. Notify us immediately at <a href="mailto:security@tufixit.com">security@tufixit.com</a> if you suspect unauthorised access.</li>
                    <li>One natural person may hold one customer account and, separately, one artisan account. Duplicate, fictitious, or shared accounts may be suspended without notice.</li>
                    <li>Customers may also use the Platform via WhatsApp or as guests without registering. Guest contact details supplied to start a chat are subject to these Terms.</li>
                  </ul>

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
                  <p>Subscription plans available to artisans are:</p>
                  <ul>
                    <li><strong>FREE</strong> — 1 active listing, standard search visibility.</li>
                    <li><strong>BASIC</strong> — KES 500 / month or KES 150 / week, up to 3 listings, higher search ranking, portfolio uploads.</li>
                    <li><strong>PRO</strong> — KES 3,000 / month or KES 800 / week, unlimited listings, featured badge, top search ranking, analytics dashboard.</li>
                  </ul>
                  <p>
                    Subscriptions are activated once the corresponding M-Pesa payment is received and verified.
                    Plans renew only if you opt in to auto-renew; otherwise they expire on the end-date and the
                    artisan reverts to the FREE tier. <strong>Subscription fees are non-refundable</strong> once
                    a billing cycle has started, except where required by Kenyan law or where we expressly state
                    otherwise.
                  </p>

                  <h2 id="customers" className="h4 fw-bold mt-5">5. Customers</h2>
                  <ul>
                    <li>You agree to provide truthful information when booking a job, including a real phone number, accurate location, and an honest description of the work.</li>
                    <li>You are responsible for inspecting the work delivered and for paying the agreed price (in cash, M-Pesa, or escrow where offered) once the work meets the agreed scope.</li>
                    <li>Reviews must be based on a genuine experience. Fake, paid, or retaliatory reviews may be removed and may lead to account suspension.</li>
                  </ul>

                  <h2 id="estates" className="h4 fw-bold mt-5">6. Estate Partners</h2>
                  <p>
                    Residential estates may partner with TUFIXIT to offer maintenance services to their residents
                    via a branded estate page (e.g., <code>/estate/fedha-estate</code>) and a WhatsApp short-code.
                    The estate manager is responsible for the accuracy of the estate&rsquo;s details, the list of
                    approved artisans, and any communications sent to residents through the Platform. Commission
                    rates and contract terms between TUFIXIT and the estate are set out in a separate written
                    agreement.
                  </p>

                  <h2 id="payments" className="h4 fw-bold mt-5">7. Payments &amp; M-Pesa</h2>
                  <ul>
                    <li>Subscription payments are made via M-Pesa Pay Bill (Business Number <strong>522522</strong>, account <em>TUFIXIT-&lt;PLAN&gt;</em>) and confirmed by submitting the M-Pesa transaction ID.</li>
                    <li>Job payments between customer and artisan may be made in cash or via M-Pesa direct to the artisan, unless an escrow option is used. Where escrow is used, funds are released to the artisan only after the customer marks the job as completed or after the dispute window closes.</li>
                    <li>Prices are quoted in Kenyan Shillings (KES) and are inclusive of taxes where applicable. Artisans are individually responsible for declaring and paying their own income tax.</li>
                  </ul>

                  <h2 id="vetting" className="h4 fw-bold mt-5">8. Vetting Levels &amp; Trust Score</h2>
                  <p>
                    Artisans are assigned a vetting level — <em>STANDARD</em>, <em>VERIFIED</em>, or <em>PRO</em> —
                    based on documents submitted (national ID, certificate of good conduct, TVET certification),
                    the active subscription plan, and platform activity. The Trust Score is computed from job
                    completion rate, customer ratings, response time, and engagement. Both indicators are provided
                    in good faith for guidance only; they are not a guarantee of quality, safety, or outcome, and
                    customers remain responsible for their own due diligence before engaging an artisan.
                  </p>

                  <h2 id="conduct" className="h4 fw-bold mt-5">9. User Conduct</h2>
                  <p>You agree NOT to:</p>
                  <ul>
                    <li>Use the Platform for any unlawful, fraudulent, or harmful purpose;</li>
                    <li>Impersonate any person or misrepresent your affiliation with any individual or entity;</li>
                    <li>Bypass TUFIXIT to avoid platform fees on a job that originated through the Platform;</li>
                    <li>Post offensive, defamatory, sexually explicit, discriminatory, or violent content;</li>
                    <li>Upload viruses, scrape the Platform, attempt to reverse engineer it, or interfere with its security;</li>
                    <li>Send spam, unsolicited promotions, or phishing messages via chat, SMS, or WhatsApp;</li>
                    <li>Collect or harvest other users&rsquo; personal information without their consent.</li>
                  </ul>

                  <h2 id="liability" className="h4 fw-bold mt-5">10. Disclaimers &amp; Limitation of Liability</h2>
                  <p>
                    The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the maximum extent
                    permitted by law, TUFIXIT disclaims all warranties, express or implied, including merchantability,
                    fitness for a particular purpose, and non-infringement. We do not warrant that the Platform will
                    be uninterrupted or error-free.
                  </p>
                  <p>
                    TUFIXIT is not a party to the Service Contract between customer and artisan and is therefore not
                    liable for the quality of work performed, damage to property, personal injury, theft, late
                    arrival, no-shows, or any direct or consequential loss arising from a Service Contract. Customers
                    and artisans deal with each other at their own risk.
                  </p>
                  <p>
                    Where liability cannot be excluded under Kenyan law, our aggregate liability to you in any
                    twelve-month period is capped at the greater of (a) the subscription fees you have paid us in
                    that period, or (b) <strong>KES 5,000</strong>.
                  </p>

                  <h2 id="disputes" className="h4 fw-bold mt-5">11. Disputes &amp; Refunds</h2>
                  <p>
                    If a job goes wrong, please first try to resolve it directly with the other party. If that
                    fails, raise a dispute through the Platform within <strong>72 hours</strong> of the job&rsquo;s
                    scheduled completion. We may, in our sole discretion, mediate, hold escrow funds, or remove
                    listings, but we are not obligated to award refunds or compensation for off-platform payments.
                  </p>

                  <h2 id="termination" className="h4 fw-bold mt-5">12. Suspension &amp; Termination</h2>
                  <p>
                    We may suspend or terminate any account, remove any listing, or restrict access to the
                    Platform at any time, with or without notice, if we reasonably believe a user has violated
                    these Terms, applicable law, or the rights of another user. You may close your account at any
                    time from <Link href="/dashboard/settings" className="text-primary">Dashboard → Settings</Link>.
                  </p>

                  <h2 id="changes" className="h4 fw-bold mt-5">13. Changes to these Terms</h2>
                  <p>
                    We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date at the top of
                    this page reflects the most recent version. Material changes will be notified via email, SMS,
                    or an in-app banner at least seven (7) days before they take effect. Continued use of the
                    Platform after the effective date constitutes acceptance of the revised Terms.
                  </p>

                  <h2 id="governing-law" className="h4 fw-bold mt-5">14. Governing Law &amp; Jurisdiction</h2>
                  <p>
                    These Terms are governed by the laws of the Republic of Kenya. Any dispute arising from these
                    Terms or your use of the Platform shall be submitted to the exclusive jurisdiction of the
                    courts of Nairobi, Kenya, without prejudice to any mandatory consumer-protection rights you
                    may have under the Consumer Protection Act, 2012, and the Data Protection Act, 2019.
                  </p>

                  <h2 id="contact" className="h4 fw-bold mt-5">15. Contact Us</h2>
                  <p>
                    Questions about these Terms? Reach us at:
                  </p>
                  <ul className="list-unstyled">
                    <li><i className="fa-solid fa-envelope text-primary me-2"></i><a href="mailto:legal@tufixit.com">legal@tufixit.com</a></li>
                    <li><i className="fa-solid fa-phone text-primary me-2"></i><a href="tel:+254703954539">+254 703 954 539</a></li>
                    <li><i className="fa-solid fa-location-dot text-primary me-2"></i>Nairobi, Kenya</li>
                  </ul>

                  <hr className="my-4" />
                  <p className="text-muted small mb-0">
                    By using TUFIXIT you acknowledge that you have read these Terms in conjunction with our{' '}
                    <Link href="/privacy" className="text-primary">Privacy Policy</Link>.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Footer />

      {/* Document-specific styling: tighter spacing, friendlier headings */}
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
