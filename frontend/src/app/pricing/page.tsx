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

    name: 'Free',
    monthlyPrice: 0,
    weeklyPrice: 0,
    period: 'forever',
    color: '',
    borderClass: '',
    popular: false,
    features: [
      '1 active listing',
      'Basic profile page',
      'Phone & WhatsApp contact',
      'Standard search visibility',
    ],
    excluded: ['Portfolio photos', 'Analytics', 'Featured badge'],
    cta: 'Start Free',
    ctaClass: 'btn-outline-dark',
  },
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 500,
    weeklyPrice: 150,
    period: 'month',
    color: '',
    borderClass: 'border-primary',
    popular: true,
    features: [
      '3 active listings',
      'Higher search ranking',
      'Portfolio upload',
      'Priority in category',
      'Customer inquiries',
    ],
    excluded: ['Featured badge', 'Full analytics'],
    cta: 'Get Basic',
    ctaClass: 'btn-primary',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 3000,
    weeklyPrice: 800,
    period: 'month',
    color: 'text-bg-warning',
    borderClass: 'border-warning',
    popular: false,
    features: [
      'Unlimited listings',
      'Top search placement',
      'Featured badge & crown',
      'Full analytics dashboard',
      'Priority support',
    ],
    excluded: [],
    cta: 'Go Pro',
    ctaClass: 'btn-warning',
  },
];

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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'weekly'>('monthly');

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

      {/* Pricing Cards */}
      <div className="py-5">
        <div className="container py-4">
          {/* Billing cycle toggle */}
          <div className="d-flex justify-content-center mb-4">
            <div className="btn-group bg-light rounded-5 p-1" role="group">
              <button
                className={`btn rounded-5 px-4 ${billingCycle === 'monthly' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`btn rounded-5 px-4 ${billingCycle === 'weekly' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setBillingCycle('weekly')}
              >
                Weekly
                <span className="badge bg-success ms-2 rounded-5">Save trial</span>
              </button>
            </div>
          </div>

          <div className="row g-4 justify-content-center">
            {plans.map((plan) => {
              const price = billingCycle === 'weekly' ? plan.weeklyPrice : plan.monthlyPrice;
              const periodLabel = plan.id === 'free' ? '' : billingCycle === 'weekly' ? '/wk' : '/mo';
              return (
              <div key={plan.id} className="col-md-6 col-lg-4">
                <div className={`card border-0 rounded-4 shadow-sm h-100 position-relative ${plan.borderClass}`}
                  style={plan.borderClass ? { borderWidth: 2, borderStyle: 'solid' } : {}}>
                  {plan.popular && (
                    <div className="position-absolute start-50 translate-middle-x" style={{ top: -12 }}>
                      <span className="badge bg-primary px-3 py-2 rounded-5 shadow-sm">
                        <i className="fa-solid fa-star me-1"></i>Most Popular
                      </span>
                    </div>
                  )}
                  <div className="card-body p-4">
                    {/* Plan name */}
                    <h5 className="fw-bold mb-3">{plan.name}</h5>

                    {/* Price */}
                    <div className="mb-3">
                      {price === 0 ? (
                        <div className="display-5 fw-bold">Free</div>
                      ) : (
                        <div className="d-flex align-items-end gap-1">
                          <span className="fs-5 text-muted">KES</span>
                          <span className="display-5 fw-bold">{price.toLocaleString()}</span>
                          <span className="text-muted mb-2">{periodLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <Link href={`/register`} className={`btn ${plan.ctaClass} w-100 rounded-3 py-2 fw-medium mb-4`}>
                      {plan.cta}
                    </Link>

                    {/* Features */}
                    <ul className="list-unstyled mb-0">
                      {plan.features.map((f, i) => (
                        <li key={i} className="d-flex align-items-start gap-2 mb-2">
                          <i className="fa-solid fa-check text-success mt-1"></i>
                          <span className="small">{f}</span>
                        </li>
                      ))}
                      {plan.excluded.map((f, i) => (
                        <li key={`e${i}`} className="d-flex align-items-start gap-2 mb-2 opacity-50">
                          <i className="fa-solid fa-xmark text-muted mt-1"></i>
                          <span className="small text-muted text-decoration-line-through">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

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
                        aria-expanded={idx === 0}
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
