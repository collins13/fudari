'use client';
import { useState, useEffect } from 'react';
import { subscriptionsAPI, rankingAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PlanInfo {
  name: string;
  monthlyPrice: number;
  weeklyPrice?: number;
  maxListings: number;
  featured: boolean;
  rankingPriority: number;
  features: string[];
}

interface SubscriptionResponse {
  id?: number;
  artisanId: number;
  planType: string;
  billingCycle?: string;
  priceKes?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  autoRenew: boolean;
  maxListings: number;
  featured: boolean;
  rankingPriority: number;
  createdAt?: string;
}

function getPlanBadgeClass(plan: string) {
  if (plan === 'PRO') return 'text-bg-warning';
  if (plan === 'BASIC') return 'text-bg-secondary';
  return 'text-bg-dark';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [currentSub, setCurrentSub] = useState<SubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Payment gate state
  const [pendingPlan, setPendingPlan] = useState<'BASIC' | 'PRO' | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [mpesaRef, setMpesaRef] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Ranking analytics
  const [rankingData, setRankingData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, plansRes] = await Promise.all([
          subscriptionsAPI.getCurrentSubscription(),
          subscriptionsAPI.getAvailablePlans(),
        ]);
        setCurrentSub(subRes.data);
        setPlans(plansRes.data);

        // Fetch ranking analytics for workers
        try {
          const rankRes = await rankingAPI.getMyRanking();
          setRankingData(rankRes.data);
        } catch { /* not a worker or no score yet */ }
      } catch (err) {
        console.error('Subscription fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (planType: 'FREE' | 'BASIC' | 'PRO') => {
    if (planType !== 'FREE') {
      // Paid plan — show payment confirmation modal first
      setPendingPlan(planType);
      setMpesaRef('');
      setPaymentError('');
      return;
    }
    setSubscribing(planType);
    try {
      const res = await subscriptionsAPI.createSubscription({ planType });
      setCurrentSub(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingPlan) return;
    if (!mpesaRef.trim()) { setPaymentError('Please enter your M-Pesa transaction ID.'); return; }
    setSubscribing(pendingPlan);
    setPaymentError('');
    try {
      const res = await subscriptionsAPI.createSubscription({
        planType: pendingPlan,
        billingCycle,
        mpesaTransactionId: mpesaRef.trim().toUpperCase(),
      });
      setCurrentSub(res.data);
      setPendingPlan(null);
    } catch (err: any) {
      setPaymentError(err?.response?.data?.message || 'Failed to activate subscription. Please check your transaction ID.');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      const res = await subscriptionsAPI.cancelSubscription();
      setCurrentSub(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isWorker = user?.role === 'WORKER';

  return (
    <>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Subscription</h4>
          <p className="text-muted mb-0">Manage your listing plan and visibility</p>
        </div>
      </div>

      {/* Current Subscription Card */}
      {currentSub && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <span className="text-muted small">Current Plan</span>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge ${getPlanBadgeClass(currentSub.planType)} fs-6 px-3 py-2`}>
                  {currentSub.planType === 'PRO' && <i className="fa-solid fa-crown me-1"></i>}
                  {currentSub.planType}
                </span>
                <span className={`badge ${currentSub.status === 'ACTIVE' ? 'text-bg-success' : currentSub.status === 'GRACE_PERIOD' ? 'text-bg-warning' : 'text-bg-secondary'}`}>
                  {currentSub.status === 'GRACE_PERIOD' ? 'Grace Period' : currentSub.status}
                </span>
                {currentSub.billingCycle && (
                  <span className="badge text-bg-info">{currentSub.billingCycle}</span>
                )}
              </div>
            </div>
            <div className="text-end">
              <div className="text-muted small">
                {currentSub.planType === 'FREE'
                  ? 'No expiry'
                  : currentSub.startDate
                    ? `${formatDate(currentSub.startDate)} – ${formatDate(currentSub.endDate)}`
                    : null}
              </div>
              <div className="text-muted small mt-1">
                {currentSub.maxListings >= 999 ? 'Unlimited' : currentSub.maxListings} listing{currentSub.maxListings !== 1 ? 's' : ''} allowed
              </div>
            </div>
          </div>
          {currentSub.planType !== 'FREE' && currentSub.status === 'ACTIVE' && (
            <div className="mt-3 pt-3 border-top">
              <button className="btn btn-outline-danger btn-sm rounded-5" onClick={handleCancel}>
                <i className="fa-solid fa-xmark me-1"></i>Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      <div className="row g-4 mb-4">
        {/* Billing cycle toggle */}
        <div className="col-12">
          <div className="d-flex justify-content-center mb-2">
            <div className="btn-group bg-light rounded-5 p-1" role="group">
              <button className={`btn rounded-5 px-4 ${billingCycle === 'MONTHLY' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setBillingCycle('MONTHLY')}>Monthly</button>
              <button className={`btn rounded-5 px-4 ${billingCycle === 'WEEKLY' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setBillingCycle('WEEKLY')}>
                Weekly <span className="badge bg-success ms-1 rounded-5">Try first</span>
              </button>
            </div>
          </div>
        </div>
        {plans.map((plan) => {
          const isCurrentPlan = currentSub?.planType === plan.name;
          const isPopular = plan.name === 'BASIC';
          const monthly = plan.monthlyPrice ?? 0;
          const weekly = plan.weeklyPrice ?? 0;
          const displayPrice = billingCycle === 'WEEKLY' && weekly ? weekly : monthly;
          const periodLabel = monthly === 0 ? '' : billingCycle === 'WEEKLY' ? '/week' : '/month';
          return (
            <div key={plan.name} className="col-md-4">
              <div className={`card border-0 shadow-sm h-100 position-relative ${isPopular ? 'border-primary border-2' : ''}`}>
                {isPopular && (
                  <div className="position-absolute top-0 start-50 translate-middle">
                    <span className="badge bg-primary px-3 py-2">Most Popular</span>
                  </div>
                )}
                <div className="card-body p-4 text-center">
                  <h5 className="fw-bold mb-1">{plan.name}</h5>
                  <div className="display-5 fw-bold text-primary my-3">
                    {displayPrice === 0 ? 'Free' : `KES ${displayPrice.toLocaleString()}`}
                  </div>
                  {displayPrice > 0 && <div className="text-muted small mb-3">{periodLabel}</div>}
                  <ul className="list-unstyled text-start mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="mb-2">
                        <i className="fa-solid fa-check text-success me-2"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <button className="btn btn-outline-secondary w-100 rounded-5" disabled>
                      <i className="fa-solid fa-check me-1"></i>Current Plan
                    </button>
                  ) : isWorker ? (
                    <button
                      className={`btn ${plan.name === 'PRO' ? 'btn-warning' : plan.name === 'BASIC' ? 'btn-primary' : 'btn-outline-dark'} w-100 rounded-5`}
                      onClick={() => handleSubscribe(plan.name as 'FREE' | 'BASIC' | 'PRO')}
                      disabled={subscribing !== null}
                    >
                      {subscribing === plan.name ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : null}
                      {monthly === 0 ? 'Switch to Free' : `Upgrade to ${plan.name}`}
                    </button>
                  ) : (
                    <button className="btn btn-outline-primary w-100 rounded-5" disabled>
                      Workers Only
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* M-Pesa Payment Confirmation Modal */}
      {pendingPlan && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-mobile-screen text-success me-2"></i>
                  Pay via M-Pesa
                </h5>
                <button type="button" className="btn-close" onClick={() => setPendingPlan(null)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info rounded-3 small mb-4">
                  <strong>Payment Instructions:</strong>
                  <ol className="mb-0 mt-2 ps-3">
                    <li>Go to M-Pesa &rarr; Lipa na M-Pesa &rarr; Pay Bill</li>
                    <li>Business No: <strong>522522</strong></li>
                    <li>Account No: <strong>TUFIXIT-{pendingPlan}</strong></li>
                    <li>Amount: <strong>KES {
                      pendingPlan === 'PRO'
                        ? (billingCycle === 'WEEKLY' ? '800' : '3,000')
                        : (billingCycle === 'WEEKLY' ? '150' : '500')
                    }</strong> ({billingCycle === 'WEEKLY' ? 'weekly' : 'monthly'})</li>
                    <li>Enter your PIN and confirm</li>
                    <li>Copy the confirmation code (e.g. <em>QKA12345XYZ</em>) and paste below</li>
                  </ol>
                </div>

                {paymentError && (
                  <div className="alert alert-danger small rounded-3 mb-3">{paymentError}</div>
                )}

                <label className="form-label fw-medium">M-Pesa Transaction ID <span className="text-danger">*</span></label>
                <input type="text" className="form-control form-control-lg rounded-3 text-uppercase font-monospace fw-bold"
                  placeholder="e.g. QKA12345XYZ"
                  value={mpesaRef} onChange={(e) => { setMpesaRef(e.target.value.toUpperCase()); setPaymentError(''); }} />
                <small className="text-muted">This is the code in the confirmation SMS you received from M-Pesa.</small>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-light rounded-3" onClick={() => setPendingPlan(null)}>Cancel</button>
                <button
                  className={`btn ${pendingPlan === 'PRO' ? 'btn-warning' : 'btn-primary'} rounded-3 fw-medium px-4`}
                  onClick={handleConfirmPayment}
                  disabled={subscribing !== null}>
                  {subscribing === pendingPlan
                    ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Confirm &amp; Activate {pendingPlan}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Analytics */}
      {isWorker && rankingData && (
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="fa-solid fa-chart-line text-primary fs-5"></i>
            <h5 className="fw-semibold mb-0">Your Ranking Score</h5>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="text-center p-3 bg-light rounded-3">
                <div className="display-4 fw-bold text-primary">{rankingData.finalScore}</div>
                <div className="text-muted small">Overall Score (out of 100)</div>
                <span className={`badge mt-2 ${rankingData.tier === 'PRO' ? 'text-bg-warning' : rankingData.tier === 'BASIC' ? 'text-bg-secondary' : 'text-bg-dark'}`}>
                  {rankingData.tier === 'PRO' && <i className="fa-solid fa-crown me-1"></i>}
                  {rankingData.tier} Tier
                </span>
              </div>
            </div>
            <div className="col-md-8">
              {[
                { label: 'Subscription', score: rankingData.subscriptionScore, weight: 40, color: '#f6c23e' },
                { label: 'Ratings & Reviews', score: rankingData.ratingsScore, weight: 20, color: '#4e73df' },
                { label: 'Performance', score: rankingData.performanceScore, weight: 15, color: '#1cc88a' },
                { label: 'Engagement', score: rankingData.engagementScore, weight: 15, color: '#36b9cc' },
                { label: 'Activity', score: rankingData.recencyScore, weight: 10, color: '#858796' },
              ].map((item) => (
                <div key={item.label} className="mb-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-medium">{item.label} ({item.weight}%)</span>
                    <span className="fw-bold">{item.score}/100</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className="progress-bar" role="progressbar"
                      style={{ width: `${item.score}%`, backgroundColor: item.color }}
                      aria-valuenow={item.score} aria-valuemin={0} aria-valuemax={100}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade prompt for non-Pro users */}
          {rankingData.tier !== 'PRO' && (
            <div className="alert alert-warning border-0 rounded-3 mb-0">
              <div className="d-flex align-items-start gap-3">
                <i className="fa-solid fa-rocket fs-4 mt-1"></i>
                <div>
                  <h6 className="fw-bold mb-1">Boost Your Visibility</h6>
                  <p className="mb-2 small">
                    {rankingData.tier === 'FREE'
                      ? `Your subscription score is 40/100. Upgrade to Basic (60) or Pro (100) to instantly jump in search rankings and get up to 2.5x more profile views.`
                      : `Your subscription score is 60/100. Upgrade to Pro to unlock top placement, featured badges, and the maximum visibility boost.`}
                  </p>
                  <div className="d-flex gap-2">
                    {rankingData.tier === 'FREE' && (
                      <button className="btn btn-sm btn-primary rounded-5"
                        onClick={() => { setPendingPlan('BASIC'); setMpesaRef(''); setPaymentError(''); }}>
                        <i className="fa-solid fa-arrow-up me-1"></i>Upgrade to Basic
                      </button>
                    )}
                    <button className="btn btn-sm btn-warning rounded-5"
                      onClick={() => { setPendingPlan('PRO'); setMpesaRef(''); setPaymentError(''); }}>
                      <i className="fa-solid fa-crown me-1"></i>Go Pro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAQ */}
      <div className="card border-0 shadow-sm p-4">
        <h5 className="fw-semibold mb-3">Frequently Asked Questions</h5>
        <div className="accordion" id="faqAccordion">
          {[
            { q: 'How do I upgrade my plan?', a: 'Select the plan you want above and click upgrade. Changes take effect immediately.' },
            { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. Your plan will remain active until the end of the billing period.' },
            { q: 'What payment methods are accepted?', a: 'We accept M-Pesa payments. Bank transfer coming soon.' },
            { q: 'Does upgrading increase my visibility?', a: 'Yes! Higher-tier plans get priority in search results and featured placement.' },
          ].map((item, i) => (
            <div key={i} className="accordion-item border-0">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#faq${i}`}>
                  {item.q}
                </button>
              </h2>
              <div id={`faq${i}`} className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                <div className="accordion-body text-muted">{item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
