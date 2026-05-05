'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobsAPI } from '@/lib/api';
import Link from 'next/link';

interface Bid {
  id: number;
  bidAmount: string;
  proposal: string | null;
  estimatedDays: number | null;
  status: string;
  workerName: string;
  createdAt: string;
}

interface Job {
  id: number;
  title: string;
  skillType: string;
  status: string;
  locationName: string | null;
  isUrgent: boolean;
  budgetMin: string | null;
  budgetMax: string | null;
  allowBidding: boolean;
  createdAt: string;
  bidCount?: number;
  assignedWorkerName?: string;
  agreedPrice?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending Review', color: 'warning' },
  BIDDING: { label: 'Receiving Bids', color: 'info' },
  COUNTER_OFFERED: { label: 'Counter Offered', color: 'secondary' },
  ACCEPTED: { label: 'Accepted', color: 'primary' },
  ARRIVED: { label: 'Artisan Arrived', color: 'primary' },
  IN_PROGRESS: { label: 'In Progress', color: 'primary' },
  COMPLETED: { label: 'Completed', color: 'success' },
  DECLINED: { label: 'Declined', color: 'danger' },
  CANCELLED: { label: 'Cancelled', color: 'danger' },
  DISPUTED: { label: 'Disputed', color: 'danger' },
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatKES(v: string | null | undefined): string {
  if (!v) return '—';
  return `KES ${Number(v).toLocaleString()}`;
}

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Bid panel
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState<number | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsAPI.getClientJobs(page, 20);
      const content: Job[] = res.data?.content || res.data || [];
      setJobs(content);
      setHasMore(!res.data?.last);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const openBids = async (job: Job) => {
    setSelectedJob(job);
    setBids([]);
    setBidsLoading(true);
    try {
      const res = await jobsAPI.getJobBids(job.id);
      setBids(res.data || []);
    } catch { /* ignore */ }
    finally { setBidsLoading(false); }
  };

  const acceptBid = async (jobId: number, bidId: number, bidAmount: string) => {
    setAcceptLoading(bidId);
    try {
      await jobsAPI.acceptBid(jobId, bidId, { agreedPrice: bidAmount });
      setToast({ msg: 'Bid accepted! The artisan has been notified.', type: 'success' });
      setSelectedJob(null);
      fetchJobs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToast({ msg: msg || 'Failed to accept bid.', type: 'danger' });
    } finally {
      setAcceptLoading(null);
    }
  };

  const badge = (status: string) => {
    const s = STATUS_BADGE[status] ?? { label: status, color: 'secondary' };
    return <span className={`badge bg-${s.color}-subtle text-${s.color} rounded-pill`}>{s.label}</span>;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">My Jobs</h4>
          <p className="text-muted mb-0 small">Track jobs you&apos;ve posted and manage incoming bids</p>
        </div>
        <Link href="/dashboard/post-job" className="btn btn-primary rounded-pill px-4 btn-sm">
          <i className="fa-solid fa-plus me-2"></i>Post a Job
        </Link>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="fa-solid fa-briefcase fa-3x text-muted mb-3"></i>
            <h5 className="fw-semibold">No Jobs Yet</h5>
            <p className="text-muted mb-3">You haven&apos;t posted any jobs. Post one and let artisans bid for it.</p>
            <Link href="/dashboard/post-job" className="btn btn-primary rounded-pill px-4">
              <i className="fa-solid fa-pen-to-square me-2"></i>Post a Job
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3">
            {jobs.map((job) => (
              <div key={job.id} className="col-12">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <h6 className="fw-bold mb-0">{job.title}</h6>
                          {job.isUrgent && (
                            <span className="badge bg-danger-subtle text-danger rounded-pill">
                              <i className="fa-solid fa-bolt me-1"></i>Urgent
                            </span>
                          )}
                          {badge(job.status)}
                        </div>
                        <div className="d-flex gap-3 flex-wrap text-muted small">
                          <span>
                            <i className="fa-solid fa-toolbox me-1"></i>
                            {job.skillType.replace(/_/g, ' ')}
                          </span>
                          {job.locationName && (
                            <span>
                              <i className="fa-solid fa-location-dot me-1"></i>
                              {job.locationName}
                            </span>
                          )}
                          <span>
                            <i className="fa-regular fa-calendar me-1"></i>
                            {formatDate(job.createdAt)}
                          </span>
                          {(job.budgetMin || job.budgetMax) && (
                            <span>
                              <i className="fa-solid fa-money-bill me-1"></i>
                              {formatKES(job.budgetMin)} – {formatKES(job.budgetMax)}
                            </span>
                          )}
                        </div>
                        {job.assignedWorkerName && (
                          <div className="mt-1 small text-success">
                            <i className="fa-solid fa-user-check me-1"></i>
                            Assigned to <strong>{job.assignedWorkerName}</strong>
                            {job.agreedPrice && <> · Agreed price: <strong>{formatKES(job.agreedPrice)}</strong></>}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2 flex-shrink-0">
                        {job.status === 'BIDDING' && (
                          <button
                            className="btn btn-sm btn-outline-primary rounded-pill"
                            onClick={() => openBids(job)}
                          >
                            <i className="fa-solid fa-gavel me-1"></i>
                            View Bids
                            {(job.bidCount ?? 0) > 0 && (
                              <span className="badge rounded-pill bg-primary ms-1">{job.bidCount}</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-center gap-2 mt-4">
            <button className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <button className="btn btn-outline-secondary btn-sm rounded-pill px-3"
              disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        </>
      )}

      {/* Bids Modal */}
      {selectedJob && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.45)' }} onClick={() => setSelectedJob(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-gavel text-primary me-2"></i>
                  Bids for &ldquo;{selectedJob.title}&rdquo;
                </h5>
                <button className="btn-close" onClick={() => setSelectedJob(null)} />
              </div>
              <div className="modal-body">
                {bidsLoading ? (
                  <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
                ) : bids.length === 0 ? (
                  <p className="text-muted text-center py-3">No bids yet — check back soon.</p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {bids.map((bid) => (
                      <div key={bid.id} className="card border rounded-3 p-3">
                        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                          <div>
                            <div className="fw-semibold">{bid.workerName}</div>
                            <div className="fs-5 fw-bold text-primary">{formatKES(bid.bidAmount)}</div>
                            {bid.estimatedDays && (
                              <div className="text-muted small">
                                <i className="fa-regular fa-clock me-1"></i>
                                Est. {bid.estimatedDays} day{bid.estimatedDays > 1 ? 's' : ''}
                              </div>
                            )}
                            {bid.proposal && (
                              <p className="text-muted small mt-1 mb-0">{bid.proposal}</p>
                            )}
                            <div className="text-muted small mt-1">{formatDate(bid.createdAt)}</div>
                          </div>
                          {bid.status === 'PENDING' && (
                            <button
                              className="btn btn-success btn-sm rounded-pill px-3 flex-shrink-0"
                              disabled={acceptLoading === bid.id}
                              onClick={() => acceptBid(selectedJob.id, bid.id, bid.bidAmount)}
                            >
                              {acceptLoading === bid.id
                                ? <span className="spinner-border spinner-border-sm" />
                                : <><i className="fa-solid fa-check me-1"></i>Accept</>}
                            </button>
                          )}
                          {bid.status === 'ACCEPTED' && (
                            <span className="badge bg-success-subtle text-success rounded-pill">Accepted</span>
                          )}
                          {bid.status === 'REJECTED' && (
                            <span className="badge bg-secondary-subtle text-secondary rounded-pill">Rejected</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
