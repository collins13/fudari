'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminJobsAPI } from '@/lib/api';

interface AdminJob {
  id: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  jobDescription: string;
  status: string;
  statusLabel: string;
  urgency: string;
  artisanId: number | null;
  artisanName: string | null;
  artisanPhone: string | null;
  artisanSubscriptionTier: string | null;
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

const STATUS_OPTIONS = ['ALL', 'PENDING', 'ACCEPTED', 'COUNTER_OFFERED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'CANCELLED', 'DISPUTED'];
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'warning', ACCEPTED: 'info', COUNTER_OFFERED: 'warning',
  ARRIVED: 'primary', IN_PROGRESS: 'primary', COMPLETED: 'success',
  DECLINED: 'secondary', CANCELLED: 'secondary', DISPUTED: 'danger',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return dateStr; }
}

function formatKES(amount: number | null): string {
  if (!amount) return '—';
  return `KES ${amount.toLocaleString()}`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminJobsAPI.getAll({
        status: filter === 'ALL' ? undefined : filter,
        page,
        size: 25,
      });
      const data = res.data;
      setJobs(data.content || data || []);
      setTotalPages(data.totalPages || 1);
    } catch { setJobs([]); }
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const counts = jobs.reduce((acc: Record<string, number>, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Jobs Oversight</h4>
          <p className="text-muted mb-0">Monitor all bookings and jobs across the platform</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {STATUS_OPTIONS.map((s) => (
          <button key={s}
            className={`btn btn-sm rounded-5 ${filter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => { setFilter(s); setPage(0); }}>
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <i className="fa-solid fa-inbox mb-3" style={{ fontSize: 48 }}></i>
            <h5>No jobs found for this filter.</h5>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Artisan</th>
                  <th>Status</th>
                  <th>Budget</th>
                  <th>Agreed</th>
                  <th>Paid</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td><span className="font-monospace small fw-semibold">{job.bookingCode}</span></td>
                    <td>
                      <div className="fw-medium small">{job.customerName}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{job.customerLocation}</div>
                    </td>
                    <td>
                      {job.artisanName ? (
                        <div>
                          <div className="fw-medium small">{job.artisanName}</div>
                          {job.artisanSubscriptionTier && (
                            <span className="badge text-bg-light text-dark border" style={{ fontSize: 10 }}>{job.artisanSubscriptionTier}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted small">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge text-bg-${STATUS_COLORS[job.status] || 'secondary'}`}>
                        {job.statusLabel || job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="small">{formatKES(job.customerBudget)}</td>
                    <td className="small fw-medium">{formatKES(job.agreedPrice)}</td>
                    <td>
                      {job.paymentRecorded ? (
                        <span className="badge text-bg-success"><i className="fa-solid fa-check me-1"></i>{formatKES(job.paymentAmount)}</span>
                      ) : job.status === 'COMPLETED' ? (
                        <span className="badge text-bg-danger">Missing</span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="text-muted small">{formatDate(job.createdAt)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary rounded-circle" onClick={() => setSelectedJob(job)}>
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-center gap-2 py-3">
              <button className="btn btn-sm btn-outline-secondary rounded-5" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="btn btn-sm btn-light rounded-5 disabled">Page {page + 1} / {totalPages}</span>
              <button className="btn btn-sm btn-outline-secondary rounded-5" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedJob && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedJob(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  {selectedJob.bookingCode}
                  <span className={`badge text-bg-${STATUS_COLORS[selectedJob.status] || 'secondary'} ms-2`}>{selectedJob.statusLabel || selectedJob.status}</span>
                </h5>
                <button className="btn-close" onClick={() => setSelectedJob(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-4">{selectedJob.jobDescription}</p>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <h6 className="fw-semibold small mb-2"><i className="fa-solid fa-user me-2 text-primary"></i>Customer</h6>
                      <div>{selectedJob.customerName}</div>
                      <div className="text-muted small">{selectedJob.customerPhone}</div>
                      <div className="text-muted small">{selectedJob.customerLocation}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <h6 className="fw-semibold small mb-2"><i className="fa-solid fa-hard-hat me-2 text-danger"></i>Artisan</h6>
                      {selectedJob.artisanName ? (
                        <>
                          <div>{selectedJob.artisanName}</div>
                          <div className="text-muted small">{selectedJob.artisanPhone}</div>
                          <div className="text-muted small">Tier: {selectedJob.artisanSubscriptionTier || '—'}</div>
                        </>
                      ) : (
                        <span className="text-muted">Not yet assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-4 text-center">
                    <div className="p-3 rounded-3" style={{ background: '#ffc10720' }}>
                      <div className="text-muted small">Budget</div>
                      <div className="fw-bold">{formatKES(selectedJob.customerBudget)}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 text-center">
                    <div className="p-3 rounded-3" style={{ background: '#0d6efd20' }}>
                      <div className="text-muted small">Agreed</div>
                      <div className="fw-bold">{formatKES(selectedJob.agreedPrice)}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 text-center">
                    <div className="p-3 rounded-3" style={{ background: selectedJob.paymentRecorded ? '#19875420' : '#dc354520' }}>
                      <div className="text-muted small">Paid</div>
                      <div className="fw-bold">{selectedJob.paymentRecorded ? formatKES(selectedJob.paymentAmount) : 'Not paid'}</div>
                      {selectedJob.paymentMethod && <div className="text-muted" style={{ fontSize: 10 }}>{selectedJob.paymentMethod}</div>}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <h6 className="fw-semibold mb-3">Timeline</h6>
                <div className="ps-3 border-start border-2">
                  {[
                    { label: 'Created', date: selectedJob.createdAt, icon: 'fa-plus', color: '#6c757d' },
                    { label: 'Accepted', date: selectedJob.acceptedAt, icon: 'fa-check', color: '#198754' },
                    { label: 'Arrived', date: selectedJob.arrivedAt, icon: 'fa-location-dot', color: '#fd7e14' },
                    { label: 'Started', date: selectedJob.startedAt, icon: 'fa-play', color: '#0d6efd' },
                    { label: 'Completed', date: selectedJob.completedAt, icon: 'fa-flag-checkered', color: '#198754' },
                  ].map((t, i) => (
                    <div key={i} className="d-flex align-items-center gap-3 mb-2 ms-n3">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center`}
                        style={{ width: 28, height: 28, background: t.date ? t.color + '20' : '#f0f0f0', border: `2px solid ${t.date ? t.color : '#ddd'}` }}>
                        <i className={`fa-solid ${t.icon}`} style={{ fontSize: 11, color: t.date ? t.color : '#ccc' }}></i>
                      </div>
                      <div>
                        <span className={`small ${t.date ? 'fw-medium' : 'text-muted'}`}>{t.label}</span>
                        <span className="text-muted ms-2" style={{ fontSize: 11 }}>{t.date ? formatDate(t.date) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedJob.declineReason && (
                  <div className="alert alert-secondary mt-3 small">
                    <strong>Decline/Cancel Reason:</strong> {selectedJob.declineReason}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setSelectedJob(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
