'use client';

import { useState, useEffect } from 'react';
import { adminJobsAPI } from '@/lib/api';

interface DisputedJob {
  id: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  jobDescription: string;
  status: string;
  statusLabel: string;
  urgency: string;
  artisanId: number;
  artisanName: string;
  artisanPhone: string;
  artisanSubscriptionTier: string;
  agreedPrice: number | null;
  customerBudget: number | null;
  paymentRecorded: boolean;
  paymentMethod: string | null;
  paymentAmount: number | null;
  declineReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function formatKES(amount: number | null): string {
  if (!amount) return '—';
  return `KES ${amount.toLocaleString()}`;
}

function TimelineItem({ label, date, icon, color }: { label: string; date: string | null; icon: string; color: string }) {
  const done = !!date;
  return (
    <div className="d-flex align-items-start gap-3 mb-3">
      <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}
        style={{ width: 32, height: 32, background: done ? color + '20' : '#f0f0f0' }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize: 14, color: done ? color : '#ccc' }}></i>
      </div>
      <div>
        <div className={`small fw-medium ${done ? '' : 'text-muted'}`}>{label}</div>
        <div className="text-muted" style={{ fontSize: 12 }}>{done ? formatDate(date) : 'Pending'}</div>
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [jobs, setJobs] = useState<DisputedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<DisputedJob | null>(null);
  const [resolveForm, setResolveForm] = useState({ action: '', note: '' });
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    const fetchDisputed = async () => {
      try {
        const res = await adminJobsAPI.getAll({ status: 'DISPUTED' });
        const data = res.data?.content || res.data || [];
        setJobs(Array.isArray(data) ? data : []);
      } catch { setJobs([]); }
      finally { setLoading(false); }
    };
    fetchDisputed();
  }, []);

  const handleResolve = async () => {
    if (!selectedJob || !resolveForm.action) return;
    setResolving(true);
    try {
      await adminJobsAPI.resolveDispute(selectedJob.id, {
        action: resolveForm.action,
        note: resolveForm.note || undefined,
      });
      setToast({ msg: 'Dispute resolved', type: 'success' });
      setSelectedJob(null);
      // Refresh
      const res = await adminJobsAPI.getAll({ status: 'DISPUTED' });
      setJobs(res.data?.content || res.data || []);
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Failed to resolve', type: 'danger' });
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Dispute Resolution</h4>
          <p className="text-muted mb-0">Review and resolve disputed bookings with full timeline</p>
        </div>
        {jobs.length > 0 && (
          <span className="badge text-bg-danger fs-6">{jobs.length} active dispute{jobs.length !== 1 ? 's' : ''}</span>
        )}
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
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fa-solid fa-circle-check text-success mb-3" style={{ fontSize: 48 }}></i>
            <h5 className="fw-semibold">No Active Disputes</h5>
            <p className="text-muted">All bookings are running smoothly.</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {jobs.map((job) => (
            <div key={job.id} className="col-lg-6">
              <div className="card border-0 shadow-sm border-start border-danger border-3 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <span className="font-monospace small text-muted fw-semibold">{job.bookingCode}</span>
                      <span className="badge text-bg-danger ms-2">DISPUTED</span>
                    </div>
                    <span className="text-muted small">{formatDate(job.createdAt)}</span>
                  </div>

                  <p className="text-muted small mb-3" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.jobDescription}
                  </p>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <div className="p-2 bg-light rounded-3">
                        <div className="text-muted" style={{ fontSize: 11 }}>Customer</div>
                        <div className="fw-medium small">{job.customerName}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{job.customerPhone}</div>
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="p-2 bg-light rounded-3">
                        <div className="text-muted" style={{ fontSize: 11 }}>Artisan</div>
                        <div className="fw-medium small">{job.artisanName}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{job.artisanPhone}</div>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-3 small mb-3">
                    <span className="text-muted">Budget: {formatKES(job.customerBudget)}</span>
                    <span className="text-muted">Agreed: {formatKES(job.agreedPrice)}</span>
                  </div>

                  {/* Mini Timeline */}
                  <TimelineItem label="Job Created" date={job.createdAt} icon="fa-plus" color="#0d6efd" />
                  <TimelineItem label="Accepted" date={job.acceptedAt} icon="fa-check" color="#198754" />
                  <TimelineItem label="Arrived" date={job.arrivedAt} icon="fa-location-dot" color="#fd7e14" />
                  <TimelineItem label="Started" date={job.startedAt} icon="fa-play" color="#6f42c1" />
                  <TimelineItem label="Completed" date={job.completedAt} icon="fa-flag-checkered" color="#198754" />

                  <button className="btn btn-primary btn-sm rounded-5 w-100 mt-2" onClick={() => {
                    setSelectedJob(job);
                    setResolveForm({ action: '', note: '' });
                  }}>
                    <i className="fa-solid fa-gavel me-2"></i>Resolve Dispute
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selectedJob && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedJob(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Resolve: {selectedJob.bookingCode}</h5>
                <button className="btn-close" onClick={() => setSelectedJob(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-medium">Resolution Action <span className="text-danger">*</span></label>
                  <select className="form-select" value={resolveForm.action} onChange={(e) => setResolveForm({ ...resolveForm, action: e.target.value })}>
                    <option value="">Select action...</option>
                    <option value="NO_ACTION">No Action — Mark Resolved</option>
                    <option value="WARN_ARTISAN">Warn Artisan</option>
                    <option value="SUSPEND_ARTISAN">Suspend Artisan</option>
                    <option value="REFUND_SUBSCRIPTION">Refund Customer Subscription</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Admin Notes</label>
                  <textarea className="form-control" rows={3} placeholder="Describe your findings and resolution..."
                    value={resolveForm.note} onChange={(e) => setResolveForm({ ...resolveForm, note: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setSelectedJob(null)}>Cancel</button>
                <button className="btn btn-primary rounded-5" disabled={!resolveForm.action || resolving} onClick={handleResolve}>
                  {resolving ? <><span className="spinner-border spinner-border-sm me-2"></span>Resolving...</> : 'Apply Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
