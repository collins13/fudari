import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PricingCards from './PricingCards';

const faqs = [
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.',
  },
  {
    q: 'How do I pay?',
    a: 'We accept M-Pesa. Payment is monthly and you can cancel anytime from your dashboard.',
  },
  {
    q: 'Do customers pay anything?',
    a: 'No. Customers browse and contact service providers completely free. Only artisans pay for plans.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your plan stays active until the end of the billing period. After that, you revert to the Free plan with 1 listing.',
  },
  {
    q: 'What is the featured badge?',
    a: 'Pro members get a crown badge on their profile and appear at the top of search results, getting more visibility.',
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="dark-overlay hero mx-3 overflow-hidden position-relative py-4 py-lg-5 rounded-4 text-white mt-3">
        <img className="bg-image" src="/liston/images/header/03.jpg" alt="Pricing" />
        <div className="container overlay-content py-5">
          <div className="row justify-content-center">
            <div className="col-lg-7 text-center">
              <div className="bg-primary d-inline-block fs-14 mb-3 px-4 py-2 rounded-5 text-uppercase">
                Pricing
              </div>
              <h2 className="display-4 fw-semibold mb-3">
                Simple Plans for <span className="font-caveat">Every Provider</span>
              </h2>
              <p className="sub-title fs-16">
                Start free. Upgrade when you&apos;re ready. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive pricing cards (client component) */}
      <PricingCards />

      {/* FAQ */}
      <div className="py-5 bg-light mx-3 rounded-4">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="text-center mb-5">
                <div className="d-inline-block font-caveat fs-1 fw-medium text-primary">FAQ</div>
                <h3 className="display-6 fw-semibold mb-3">Common Questions</h3>
              </div>
              <div className="accordion" id="pricingFAQ">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="accordion-item mb-3 rounded-4 border-0 shadow-sm">
                    <h2 className="accordion-header">
                      <button
                        className={`accordion-button p-4 fw-medium ${idx !== 0 ? 'collapsed' : ''} rounded-4`}
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#faq-${idx}`}
                        aria-expanded={String(idx === 0) as unknown as boolean}
                      >
                        {faq.q}
                      </button>
                    </h2>
                    <div
                      id={`faq-${idx}`}
                      className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                      data-bs-parent="#pricingFAQ"
                    >
                      <div className="accordion-body p-4 pt-0 text-muted">{faq.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-5 bg-primary mx-3 rounded-4 text-white mb-5">
        <div className="container py-4 text-center">
          <h3 className="display-5 fw-bold mb-3">Start Free Today</h3>
          <p className="lead opacity-75 mb-4">
            No credit card needed. Upgrade when you&apos;re ready to grow.
          </p>
          <Link href="/register" className="btn btn-light btn-lg rounded-3 px-5 fw-semibold">
            <i className="fa-solid fa-user-plus me-2"></i>Create Account
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
