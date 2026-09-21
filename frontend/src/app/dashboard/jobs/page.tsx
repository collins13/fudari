'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SKILL_TYPES, skillLabel } from '@/lib/kenya';

interface Job {
  id: number;
  title: string;
  description: string;
  skillType: string;
  status: string;
  address: string;
  locationName: string;
  isUrgent: boolean;
  budgetMin: string | null;
  budgetMax: string | null;
  allowBidding: boolean;
  estimatedDurationHours: number | null;
  createdAt: string;
  clientName?: string;
  bidCount?: number;
}

interface Bid {
  id: number;
  bidAmount: string;
  proposal: string | null;
  estimatedDays: number | null;
  status: string;
  workerName: string;
  createdAt: string;
}

const SKILL_LABELS: Record<string, string> = {
  ...Object.fromEntries(SKILL_TYPES.map((s) => [s, skillLabel(s)])),
  HVAC_TECHNICIAN: 'HVAC', SOLAR_TECHNICIAN: 'Solar', BOREHOLE_DRILLING: 'Borehole',
  WATER_TANK_CLEANING: 'Water Tank', CCTV_INSTALLER: 'CCTV',
  INTERIOR_DESIGNER: 'Interior Design', TRANSPORT_PROVIDER: 'Transport',
  GRAPHIC_DESIGNER: 'Design', IT_TECHNICIAN: 'IT Support',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function formatKES(amount: string | number | null): string {
  if (!amount) return '—';
  return `KES ${Number(amount).toLocaleString()}`;
}

export default function JobsMarketplacePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'open' | 'nearby' | 'mybids'>('open');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Bid modal
  const [bidJob, setBidJob] = useState<Job | null>(null);
  const [bidForm, setBidForm] = useState({ amount: '', proposal: '', days: '' });
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');

  // Detail modal
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [jobBids, setJobBids] = useState<Bid[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'open') {
        res = await jobsAPI.getOpenJobs(page, 20);
      } else if (tab === 'nearby') {
        if (navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          res = await jobsAPI.getNearbyJobs(pos.coords.latitude, pos.coords.longitude, 25);
        } else {
          res = await jobsAPI.getOpenJobs(page, 20);
        }
      } else {
        res = await jobsAPI.getWorkerJobs(page, 20);
      }
      const data = res.data?.content || res.data || [];
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const openBidModal = (job: Job) => {
    setBidJob(job);
    setBidForm({ amount: job.budgetMin || '', proposal: '', days: '' });
    setBidError('');
  };

  const submitBid = async () => {
    if (!bidJob) return;
    if (!bidForm.amount) { setBidError('Bid amount is required'); return; }
    setBidLoading(true);
    setBidError('');
    try {
      await jobsAPI.placeBid(bidJob.id, {
        bidAmount: bidForm.amount,
        proposal: bidForm.proposal || undefined,
        estimatedDays: bidForm.days ? parseInt(bidForm.days) : undefined,
      });
      setToast({ msg: 'Bid placed successfully!', type: 'success' });
      setBidJob(null);
      fetchJobs();
    } catch (err: any) {
      setBidError(err?.response?.data?.message || 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  };

  const viewDetail = async (job: Job) => {
    setDetailJob(job);
    setDetailLoading(true);
    try {
      const [jobRes, bidsRes] = await Promise.all([
        jobsAPI.getJob(job.id),
        jobsAPI.getJobBids(job.id),
      ]);
      setDetailJob(jobRes.data);
      setJobBids(bidsRes.data || []);
    } catch { /* keep what we have */ }
    finally { setDetailLoading(false); }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Jobs Marketplace</h4>
          <p className="text-muted mb-0">Browse open jobs and place bids to win work</p>
        </div>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        {[
          { key: 'open' as const, label: 'Open Jobs', icon: 'fa-briefcase' },
          { key: 'nearby' as const, label: 'Nearby', icon: 'fa-location-dot' },
          { key: 'mybids' as const, label: 'My Bids', icon: 'fa-gavel' },
        ].map((t) => (
          <li key={t.key} className="nav-item">
            <button
              className={`nav-link rounded-5 ${tab === t.key ? 'active' : ''}`}
              onClick={() => { setTab(t.key); setPage(0); }}
            >
              <i className={`fa-solid ${t.icon} me-2`}></i>{t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fa-solid fa-magnifying-glass text-muted mb-3" style={{ fontSize: 48 }}></i>
            <h5 className="fw-semibold">No Jobs Found</h5>
            <p className="text-muted">
              {tab === 'nearby' ? 'No open jobs near your location right now.' : tab === 'mybids' ? "You haven't bid on any jobs yet." : 'No open jobs available at the moment. Check back soon.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {jobs.map((job) => (
            <div key={job.id} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge text-bg-light text-dark border">{SKILL_LABELS[job.skillType] || job.skillType}</span>
                    {job.isUrgent && <span className="badge text-bg-danger"><i className="fa-solid fa-bolt me-1"></i>Urgent</span>}
                  </div>
                  <h6 className="fw-bold mb-1 text-truncate">{job.title}</h6>
                  <p className="text-muted small mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.description}
                  </p>
                  <div className="d-flex flex-wrap gap-2 mb-3 small text-muted">
                    {job.locationName && <span><i className="fa-solid fa-location-dot me-1"></i>{job.locationName}</span>}
                    {(job.budgetMin || job.budgetMax) && (
                      <span><i className="fa-solid fa-money-bill me-1"></i>{formatKES(job.budgetMin)} – {formatKES(job.budgetMax)}</span>
                    )}
                    {job.estimatedDurationHours && <span><i className="fa-solid fa-clock me-1"></i>{job.estimatedDurationHours}h</span>}
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">{formatDate(job.createdAt)}</span>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-secondary rounded-5" onClick={() => viewDetail(job)}>
                        <i className="fa-solid fa-eye me-1"></i>Details
                      </button>
                      {job.allowBidding && job.status !== 'ASSIGNED' && (
                        <button className="btn btn-sm btn-primary rounded-5" onClick={() => openBidModal(job)}>
                          <i className="fa-solid fa-gavel me-1"></i>Bid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {jobs.length >= 20 && (
        <div className="d-flex justify-content-center mt-4 gap-2">
          <button className="btn btn-outline-secondary rounded-5" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button>
          <button className="btn btn-outline-secondary rounded-5" onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}

      {/* Bid Modal */}
      {bidJob && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setBidJob(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Place Bid</h5>
                <button className="btn-close" onClick={() => setBidJob(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  <strong>{bidJob.title}</strong> — {SKILL_LABELS[bidJob.skillType] || bidJob.skillType}
                  {bidJob.budgetMin && <> | Budget: {formatKES(bidJob.budgetMin)} – {formatKES(bidJob.budgetMax)}</>}
                </p>
                {bidError && <div className="alert alert-danger py-2 small">{bidError}</div>}
                <div className="mb-3">
                  <label className="form-label fw-medium">Bid Amount (KES) <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">KES</span>
                    <input type="number" className="form-control" min="1" placeholder="e.g. 5000"
                      value={bidForm.amount} onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Proposal</label>
                  <textarea className="form-control" rows={3} placeholder="Why are you the best fit for this job?"
                    value={bidForm.proposal} onChange={(e) => setBidForm({ ...bidForm, proposal: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Estimated Days to Complete</label>
                  <input type="number" className="form-control" min="1" placeholder="e.g. 3"
                    value={bidForm.days} onChange={(e) => setBidForm({ ...bidForm, days: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setBidJob(null)}>Cancel</button>
                <button className="btn btn-primary rounded-5" disabled={bidLoading} onClick={submitBid}>
                  {bidLoading ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</> : 'Submit Bid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailJob && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDetailJob(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{detailJob.title}</h5>
                <button className="btn-close" onClick={() => setDetailJob(null)}></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
                ) : (
                  <>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <span className="badge text-bg-primary">{SKILL_LABELS[detailJob.skillType] || detailJob.skillType}</span>
                      <span className={`badge text-bg-${detailJob.status === 'OPEN' || detailJob.status === 'BIDDING' ? 'success' : 'secondary'}`}>{detailJob.status}</span>
                      {detailJob.isUrgent && <span className="badge text-bg-danger">Urgent</span>}
                    </div>
                    <p className="mb-3">{detailJob.description}</p>
                    <div className="row g-3 mb-3">
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded-3">
                          <div className="text-muted small">Location</div>
                          <div className="fw-medium">{detailJob.locationName || detailJob.address || '—'}</div>
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="p-3 bg-light rounded-3">
                          <div className="text-muted small">Budget Range</div>
                          <div className="fw-medium">{formatKES(detailJob.budgetMin)} – {formatKES(detailJob.budgetMax)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bids */}
                    <h6 className="fw-semibold mb-2">Bids ({jobBids.length})</h6>
                    {jobBids.length === 0 ? (
                      <p className="text-muted small">No bids yet. Be the first!</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Bidder</th>
                              <th>Amount</th>
                              <th>Est. Days</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobBids.map((bid) => (
                              <tr key={bid.id}>
                                <td>{bid.workerName}</td>
                                <td className="fw-medium">{formatKES(bid.bidAmount)}</td>
                                <td>{bid.estimatedDays || '—'}</td>
                                <td><span className={`badge text-bg-${bid.status === 'ACCEPTED' ? 'success' : bid.status === 'REJECTED' ? 'danger' : 'warning'}`}>{bid.status}</span></td>
                                <td className="text-muted small">{formatDate(bid.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setDetailJob(null)}>Close</button>
                {detailJob.allowBidding && detailJob.status !== 'ASSIGNED' && (
                  <button className="btn btn-primary rounded-5" onClick={() => { setDetailJob(null); openBidModal(detailJob); }}>
                    <i className="fa-solid fa-gavel me-1"></i>Place Bid
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
