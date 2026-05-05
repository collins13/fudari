import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Contact Us | TUFIXIT',
  description: 'Get in touch with the TUFIXIT team. We are here to help customers and artisans across Kenya.',
  alternates: { canonical: 'https://tufixit.com/contact' },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main className="bg-light pb-5">
        {/* Hero */}
        <section
          className="position-relative overflow-hidden mx-3 mt-3 rounded-4 d-flex align-items-center justify-content-center"
          style={{ minHeight: 260, background: 'linear-gradient(135deg, #F84525, #ff6b4a)' }}
        >
          <div className="text-center text-white py-5 px-3" style={{ zIndex: 1, position: 'relative' }}>
            <h1 className="display-5 fw-bold mb-2">Contact Us</h1>
            <p className="lead mb-0 opacity-75">We&apos;d love to hear from you</p>
          </div>
        </section>

        <div className="container py-5">
          <div className="row justify-content-center g-4">

            {/* Contact info */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-4">Get in Touch</h5>

                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 44, height: 44 }}>
                      <i className="fa-solid fa-envelope text-danger"></i>
                    </div>
                    <div>
                      <div className="fw-semibold small text-muted mb-1">Email</div>
                      <a href="mailto:info@tufixit.com" className="fw-medium text-dark text-decoration-none">
                        info@tufixit.com
                      </a>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 44, height: 44 }}>
                      <i className="fa-brands fa-whatsapp text-success"></i>
                    </div>
                    <div>
                      <div className="fw-semibold small text-muted mb-1">WhatsApp</div>
                      <a
                        href="https://wa.me/254700000000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fw-medium text-dark text-decoration-none"
                      >
                        +254 700 000 000
                      </a>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 44, height: 44 }}>
                      <i className="fa-solid fa-location-dot text-primary"></i>
                    </div>
                    <div>
                      <div className="fw-semibold small text-muted mb-1">Location</div>
                      <span className="fw-medium">Nairobi, Kenya</span>
                    </div>
                  </div>

                  <hr className="my-4" />

                  <h6 className="fw-bold mb-3">Follow Us</h6>
                  <div className="d-flex gap-2">
                    {[
                      { href: 'https://twitter.com/tufixit_ke', icon: 'fa-x-twitter', label: 'X (Twitter)' },
                      { href: 'https://facebook.com/tufixit', icon: 'fa-facebook-f', label: 'Facebook' },
                      { href: 'https://instagram.com/tufixit_ke', icon: 'fa-instagram', label: 'Instagram' },
                    ].map(({ href, icon, label }) => (
                      <a
                        key={icon}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: 36, height: 36 }}
                      >
                        <i className={`fa-brands ${icon}`}></i>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-4">Send a Message</h5>
                  <form
                    action="mailto:info@tufixit.com"
                    method="get"
                    encType="text/plain"
                    noValidate
                  >
                    <div className="row g-3 mb-3">
                      <div className="col-sm-6">
                        <label className="form-label fw-medium small" htmlFor="contact-name">Full Name</label>
                        <input
                          type="text"
                          id="contact-name"
                          name="name"
                          className="form-control"
                          placeholder="Jane Doe"
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label fw-medium small" htmlFor="contact-email">Email</label>
                        <input
                          type="email"
                          id="contact-email"
                          name="email"
                          className="form-control"
                          placeholder="jane@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-medium small" htmlFor="contact-subject">Subject</label>
                      <input
                        type="text"
                        id="contact-subject"
                        name="subject"
                        className="form-control"
                        placeholder="How can we help?"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-medium small" htmlFor="contact-message">Message</label>
                      <textarea
                        id="contact-message"
                        name="body"
                        className="form-control"
                        rows={5}
                        placeholder="Tell us more about your inquiry..."
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary rounded-5 px-4">
                      <i className="fa-solid fa-paper-plane me-2"></i>Send Message
                    </button>
                  </form>

                  <p className="text-muted small mt-3 mb-0">
                    Prefer a faster response?{' '}
                    <a
                      href="https://wa.me/254700000000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success fw-medium text-decoration-none"
                    >
                      <i className="fa-brands fa-whatsapp me-1"></i>Chat on WhatsApp
                    </a>
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* FAQ quick links */}
          <div className="row justify-content-center mt-5">
            <div className="col-lg-10">
              <div className="card border-0 bg-white rounded-4 shadow-sm">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3">Quick Links</h5>
                  <div className="row g-2">
                    {[
                      { href: '/artisans', label: 'Find an Artisan', icon: 'fa-search' },
                      { href: '/pricing', label: 'Subscription Plans', icon: 'fa-crown' },
                      { href: '/privacy', label: 'Privacy Policy', icon: 'fa-shield-halved' },
                      { href: '/terms', label: 'Terms of Service', icon: 'fa-file-lines' },
                    ].map(({ href, label, icon }) => (
                      <div key={href} className="col-6 col-md-3">
                        <Link
                          href={href}
                          className="d-flex align-items-center gap-2 p-3 rounded-3 border text-decoration-none text-dark hover-bg-light"
                          style={{ transition: 'background 0.15s' }}
                        >
                          <i className={`fa-solid ${icon} text-primary`}></i>
                          <span className="small fw-medium">{label}</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
