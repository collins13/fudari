'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    weeklyPrice: 0,
    dailyPrice: 0,
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
    dailyPrice: 30,
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
    dailyPrice: 150,
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

export default function PricingCards() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'weekly' | 'daily'>('daily');

  return (
    <div className="py-5">
      <div className="container py-4">
        {/* Billing cycle toggle */}
        <div className="d-flex justify-content-center mb-4">
          <div className="btn-group bg-light rounded-5 p-1" role="group" aria-label="Billing cycle">
            <button
              className={`btn rounded-5 px-4 ${billingCycle === 'daily' ? 'btn-primary shadow-sm' : 'btn-light'}`}
              onClick={() => setBillingCycle('daily')}
            >
              Daily
              <span className="badge bg-success ms-2 rounded-5">Pay as you earn</span>
            </button>
            <button
              className={`btn rounded-5 px-4 ${billingCycle === 'weekly' ? 'btn-primary shadow-sm' : 'btn-light'}`}
              onClick={() => setBillingCycle('weekly')}
            >
              Weekly
            </button>
            <button
              className={`btn rounded-5 px-4 ${billingCycle === 'monthly' ? 'btn-primary shadow-sm' : 'btn-light'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
              <span className="badge bg-warning text-dark ms-2 rounded-5">Best value</span>
            </button>
          </div>
        </div>

        <div className="row g-4 justify-content-center">
          {plans.map((plan) => {
            const price = billingCycle === 'daily' ? plan.dailyPrice
              : billingCycle === 'weekly' ? plan.weeklyPrice
              : plan.monthlyPrice;
            const periodLabel = plan.id === 'free' ? ''
              : billingCycle === 'daily' ? '/day'
              : billingCycle === 'weekly' ? '/wk'
              : '/mo';
            return (
              <div key={plan.id} className="col-md-6 col-lg-4">
                <div
                  className={`card border-0 rounded-4 shadow-sm h-100 position-relative ${plan.borderClass}`}
                  style={plan.borderClass ? { borderWidth: 2, borderStyle: 'solid' } : {}}
                >
                  {plan.popular && (
                    <div className="position-absolute start-50 translate-middle-x" style={{ top: -12 }}>
                      <span className="badge bg-primary px-3 py-2 rounded-5 shadow-sm">
                        <i className="fa-solid fa-star me-1"></i>Most Popular
                      </span>
                    </div>
                  )}
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">{plan.name}</h5>
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
                    <Link href="/register" className={`btn ${plan.ctaClass} w-100 rounded-3 py-2 fw-medium mb-4`}>
                      {plan.cta}
                    </Link>
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
  );
}
