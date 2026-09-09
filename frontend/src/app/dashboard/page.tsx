'use client';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { listingsAPI, workersAPI, leadsAPI, subscriptionsAPI, publicReviewsAPI, authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface ListingItem {
  id: number;
  title: string;
  skillType: string;
  skillTypeLabel: string;
  priceStart: string | null;
  status: string;
  createdAt: string;
  viewCount: number;
}

interface LeadStats {
  profileViews: number;
  callClicks: number;
  whatsappClicks: number;
  totalLeads: number;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'APPROVED' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'danger' : 'secondary';
  return <span className={`badge text-bg-${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-warning">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [availableNow, setAvailableNow] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  useEffect(() => {
    if (user?.availableNow !== undefined) setAvailableNow(user.availableNow);
  }, [user?.availableNow]);
  const [recentListings, setRecentListings] = useState<ListingItem[]>([]);
  const [stats, setStats] = useState({ totalListings: 0, approvedListings: 0, averageRating: 0, reviewCount: 0 });
  const [leadStats, setLeadStats] = useState<LeadStats>({ profileViews: 0, callClicks: 0, whatsappClicks: 0, totalLeads: 0 });
  const [subscription, setSubscription] = useState<any>(null);
  const [referral, setReferral] = useState<{ referralCode: string; referralCount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isWorker = user?.role === 'WORKER';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const isWorker = user.role === 'WORKER';

        // Fetch listings
        const listingsRes = isWorker
          ? await listingsAPI.getMyListings(0, 5)
          : await listingsAPI.getListings({ size: 5 });
        const listings: ListingItem[] = listingsRes.data?.content || listingsRes.data || [];
        setRecentListings(listings);

        const totalListings = listingsRes.data?.totalElements ?? listings.length;
        const approvedListings = listings.filter((l) => l.status === 'APPROVED').length;

        let averageRating = user.trustScore || 0;
        let reviewCount = user.totalReviews || 0;

        if (isWorker && user.userId) {
          try {
            const ratingRes = await workersAPI.getWorkerRating(user.userId);
            averageRating = ratingRes.data.rating || 0;
            reviewCount = ratingRes.data.reviewCount || 0;
          } catch { /* use user data */ }

          try {
            const leadRes = await leadsAPI.getLeadStats();
            setLeadStats(leadRes.data);
          } catch { /* leads not available */ }

          try {
            const subRes = await subscriptionsAPI.getCurrentSubscription();
            setSubscription(subRes.data);
          } catch { /* subscription not available */ }

          try {
            const refRes = await authAPI.getReferralInfo();
            setReferral(refRes.data);
          } catch { /* referral info not available */ }
        }

        setStats({ totalListings, approvedListings, averageRating, reviewCount });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const vettingToPackage = (level?: string) => {
    if (level === 'PRO') return 'Gold';
    if (level === 'VERIFIED') return 'Silver';
    return 'Bronze';
  };

  const pkg = vettingToPackage(user?.vettingLevel);

  const copyReferralCode = useCallback(() => {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referral]);

  return (
    <>
      {/* Availability — worker-only control */}
      {isWorker && (
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body d-flex flex-wrap align-items-center gap-3 p-4">
            <span
              className="d-inline-block rounded-circle flex-shrink-0"
              style={{ width: 12, height: 12, background: availableNow ? '#22c55e' : '#94a3b8' }}
            />
            <div className="me-auto">
              <div className="fw-bold">{availableNow ? 'You are available now' : 'You are not taking jobs'}</div>
              <div className="text-muted small">
                {availableNow
                  ? 'Customers searching nearby will see you first. Turns off automatically after 8 hours.'
                  : 'Switch on when you are free — urgent jobs go to available pros first.'}
              </div>
            </div>
            <div className="form-check form-switch m-0" style={{ minHeight: 'auto' }}>
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="availabilitySwitch"
                style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }}
                checked={availableNow}
                disabled={savingAvailability}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setAvailableNow(next);
                  setSavingAvailability(true);
                  try {
                    await workersAPI.setAvailability(next);
                  } catch {
                    setAvailableNow(!next);
                  } finally {
                    setSavingAvailability(false);
                  }
                }}
              />
              <label className="visually-hidden" htmlFor="availabilitySwitch">Available now</label>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="header-banner align-items-center d-flex justify-content-between mb-4 p-4 rounded-4 w-100"
        style={{ background: 'var(--tx-primary-gradient)' }}>
        <div className="header-banner-context">
          <h4 className="text-white mb-2">Welcome back, {user?.firstName || 'Service Provider'}!</h4>
          <p className="text-white opacity-75 mb-3">
            {isWorker
              ? "Here&apos;s what&apos;s happening with your listings today."
              : isAdmin
                ? "Monitor platform operations and keep quality high."
                : "Track your bookings and post new jobs quickly."}
          </p>
          <Link
            href={isWorker ? '/dashboard/add-listing' : isAdmin ? '/dashboard/admin' : '/dashboard/post-job'}
            className="btn btn-light btn-sm fw-medium"
          >
            {isWorker ? '+ Add New Listing' : isAdmin ? 'Open Admin Operations' : '+ Post a Job'}
          </Link>
        </div>
        <i className="fa-solid fa-wrench text-white opacity-25" style={{ fontSize: 80 }}></i>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => window.location.reload()}>
            <i className="fa-solid fa-rotate-right me-1"></i>Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Listings', value: loading ? '...' : String(stats.totalListings), icon: 'fa-list', color: 'var(--bs-primary)', bg: 'var(--tx-primary-tint)' },
          { label: 'Approved', value: loading ? '...' : String(stats.approvedListings), icon: 'fa-circle-check', color: '#198754', bg: '#f0fdf4' },
          { label: 'Reviews', value: loading ? '...' : String(stats.reviewCount), icon: 'fa-star', color: '#ffc107', bg: '#fffdf0' },
          { label: 'Avg Rating', value: loading ? '...' : stats.averageRating.toFixed(1), icon: 'fa-star-half-stroke', color: '#fd7e14', bg: '#fff8f0' },
        ].map((s, i) => (
          <div key={i} className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ background: s.bg }}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 48, height: 48, background: s.color + '20' }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 20 }}></i>
                </div>
                <div>
                  <div className="text-muted small">{s.label}</div>
                  <h4 className="mb-0 fw-bold">{s.value}</h4>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lead Tracking (Workers only) */}
      {user?.role === 'WORKER' && (
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm p-4">
              <h6 className="mb-3 fw-semibold">
                <i className="fa-solid fa-chart-line me-2 text-primary"></i>Lead Analytics (Last 30 Days)
              </h6>
              <div className="row g-3">
                {[
                  { label: 'Profile Views', value: leadStats.profileViews, icon: 'fa-eye', color: '#0d6efd' },
                  { label: 'Call Clicks', value: leadStats.callClicks, icon: 'fa-phone', color: '#198754' },
                  { label: 'WhatsApp Clicks', value: leadStats.whatsappClicks, icon: 'fa-brands fa-whatsapp', color: '#25d366' },
                  { label: 'Total Leads', value: leadStats.totalLeads, icon: 'fa-bullseye', color: 'var(--bs-primary)' },
                ].map((lead, i) => (
                  <div key={i} className="col-6 col-md-3">
                    <div className="text-center p-3 rounded-3" style={{ background: lead.color + '10' }}>
                      <i className={`fa-solid ${lead.icon} mb-2`} style={{ color: lead.color, fontSize: 24 }}></i>
                      <div className="fw-bold fs-4">{loading ? '...' : lead.value}</div>
                      <div className="text-muted small">{lead.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 g-xl-4">
        {/* Recent Listings */}
        <div className="col-xl-8 col-xxl-9">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3">
              <h6 className="mb-0 fw-semibold">Recent Listings</h6>
              <Link href="/dashboard/my-listings" className="btn btn-sm btn-outline-primary rounded-5">View All</Link>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : recentListings.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fa-solid fa-inbox mb-2 d-block fs-3"></i>
                  No listings yet. <Link href="/dashboard/add-listing">Add a listing</Link> to get started.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Title</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Views</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentListings.map((l) => (
                        <tr key={l.id}>
                          <td className="ps-4 fw-medium">{l.title}</td>
                          <td className="text-muted small">{l.skillTypeLabel || l.skillType}</td>
                          <td className="fw-medium text-success">{l.priceStart ? `KES ${l.priceStart}` : 'Contact'}</td>
                          <td className="text-muted small"><i className="fa-solid fa-eye me-1"></i>{l.viewCount || 0}</td>
                          <td><StatusBadge status={l.status} /></td>
                          <td className="text-muted small">{formatDate(l.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-xl-4 col-xxl-3">
          {/* Subscription */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 fw-semibold">Subscription</h6>
                <span className={`badge fw-semibold ${pkg === 'Gold' ? 'text-bg-warning' : pkg === 'Silver' ? 'text-bg-secondary' : 'text-bg-dark'}`}>
                  {pkg}
                </span>
              </div>
              <p className="text-muted small mb-3">
                {subscription ? `${subscription.planType} plan - ${subscription.maxListings >= 999 ? 'Unlimited' : subscription.maxListings} listings` :
                  pkg === 'Gold' ? 'Unlimited listings. Featured badge.' :
                  pkg === 'Silver' ? '3 listings. Higher visibility.' : '1 listing. Basic visibility.'}
              </p>
              <Link href="/dashboard/subscription" className="btn btn-primary btn-sm w-100 rounded-5">Manage Subscription</Link>
            </div>
          </div>

          {/* Referral Card */}
          {referral?.referralCode && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-semibold mb-2">
                  <i className="fa-solid fa-gift me-2 text-primary"></i>Invite a Pro
                </h6>
                <p className="text-muted small mb-3">
                  Share your code — when they sign up, you get <strong>1 month free BASIC plan</strong>.
                </p>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control fw-bold text-center"
                    value={referral.referralCode}
                    readOnly
                  />
                  <button
                    className={`btn ${copied ? 'btn-success' : 'btn-outline-primary'}`}
                    onClick={copyReferralCode}
                  >
                    <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                  </button>
                </div>
                {referral.referralCount > 0 && (
                  <div className="text-muted small text-center">
                    <i className="fa-solid fa-users me-1"></i>
                    {referral.referralCount} pro{referral.referralCount !== 1 ? 's' : ''} referred
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rating */}
          {user?.role === 'WORKER' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 py-3">
                <h6 className="mb-0 fw-semibold">Rating Summary</h6>
              </div>
              <div className="card-body text-center">
                <div className="display-6 fw-bold text-warning mb-1">
                  {loading ? '...' : stats.averageRating.toFixed(1)}
                </div>
                <StarRating rating={stats.averageRating} />
                <p className="text-muted small mt-2 mb-0">
                  Based on {loading ? '...' : stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''}
                </p>
                <Link href="/dashboard/reviews" className="btn btn-outline-primary btn-sm rounded-5 mt-3">View Reviews</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
