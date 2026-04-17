'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { artisanJobsAPI, adminJobsAPI } from '@/lib/api';
import QualityVerificationCard from '@/components/QualityVerificationCard';

interface JobSummary {
  id: number;
  bookingCode: string;
  customerName: string;
  customerLocation: string;
  jobDescription: string;
  status: string;
  statusLabel: string;
  urgency: string;
  scheduledTime: string | null;
  customerBudget: number | null;
  agreedPrice: number | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  timeAgo: string;
  beforeImages?: string;
  afterImages?: string;
}

interface JobDetail extends JobSummary {
  customerPhone: string;
  startPin: string | null;
  completionPin: string | null;
  paymentRecorded: boolean;
  paymentMethod: string | null;
  paymentAmount: number | null;
  beforeImages?: string;
  afterImages?: string;
}

type TabType = 'pending' | 'active' | 'history';

function StatusBadge({ status, label }: { status: string; label: string }) {
  const cls =
    status === 'COMPLETED' ? 'success' :
    status === 'IN_PROGRESS' ? 'primary' :
    status === 'ACCEPTED' || status === 'ARRIVED' ? 'info' :
    status === 'PENDING' ? 'warning' :
    status === 'COUNTER_OFFERED' ? 'warning' :
    status === 'DISPUTED' ? 'warning' :
    'secondary';
  return <span className={`badge text-bg-${cls}`}>{label}</span>;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === 'NOW') return <span className="badge text-bg-danger"><i className="fa-solid fa-bolt me-1"></i>Now</span>;
  if (urgency === 'TODAY') return <span className="badge text-bg-warning"><i className="fa-solid fa-sun me-1"></i>Today</span>;
  if (urgency === 'TOMORROW') return <span className="badge text-bg-secondary">Tomorrow</span>;
  return <span className="badge text-bg-light text-dark border">Scheduled</span>;
}

export default function BookingsManagePage() {
  const [tab, setTab] = useState<TabType>('pending');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Detect admin role
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setIsAdmin(u.role === 'ADMIN');
      }
    } catch { /* ignore */ }
  }, []);

  // Action modals
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'decline' | 'counter' | 'arrive' | 'start' | 'complete' | null>(null);

  // Form fields for actions
  const [acceptPrice, setAcceptPrice] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [startPin, setStartPin] = useState('');
  const [completionPin, setCompletionPin] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA' | 'CASH' | 'BANK_TRANSFER'>('CASH');
  const [mpesaRef, setMpesaRef] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Photo gallery
  const [galleryJob, setGalleryJob] = useState<JobSummary | null>(null);
  const [galleryDetail, setGalleryDetail] = useState<JobDetail | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const openGallery = async (job: JobSummary) => {
    setGalleryJob(job);
    setGalleryLoading(true);
    try {
      const res = await artisanJobsAPI.getDetail(job.id);
      setGalleryDetail(res.data);
    } catch { setGalleryDetail(null); }
    finally { setGalleryLoading(false); }
  };

  const parseImages = (json?: string): string[] => {
    if (!json) return [];
    try { const arr = JSON.parse(json); return Array.isArray(arr) ? arr : []; }
    catch { return []; }
  };

  const fetchJobs = async (t: TabType) => {
    setLoading(true);
    try {
      let res;
      if (isAdmin) {
        // Admin fetches all jobs filtered by status
        const statusMap: Record<TabType, string> = {
          pending: 'PENDING',
          active: 'ACCEPTED', // Also gets ARRIVED, IN_PROGRESS from backend
          history: 'COMPLETED',
        };
        // For 'active' tab, fetch multiple statuses
        if (t === 'active') {
          const [a1, a2, a3] = await Promise.all([
            adminJobsAPI.getAll({ status: 'ACCEPTED', size: 100 }),
            adminJobsAPI.getAll({ status: 'ARRIVED', size: 100 }),
            adminJobsAPI.getAll({ status: 'IN_PROGRESS', size: 100 }),
          ]);
          const all = [...(a1.data?.content || []), ...(a2.data?.content || []), ...(a3.data?.content || [])];
          setJobs(all.map(mapAdminJob));
        } else if (t === 'history') {
          const [h1, h2, h3, h4] = await Promise.all([
            adminJobsAPI.getAll({ status: 'COMPLETED', size: 100 }),
            adminJobsAPI.getAll({ status: 'CANCELLED', size: 100 }),
            adminJobsAPI.getAll({ status: 'DECLINED', size: 100 }),
            adminJobsAPI.getAll({ status: 'DISPUTED', size: 100 }),
          ]);
          const all = [...(h1.data?.content || []), ...(h2.data?.content || []), ...(h3.data?.content || []), ...(h4.data?.content || [])];
          setJobs(all.map(mapAdminJob));
        } else {
          res = await adminJobsAPI.getAll({ status: statusMap[t], size: 100 });
          setJobs((res.data?.content || []).map(mapAdminJob));
        }
      } else {
        if (t === 'pending') res = await artisanJobsAPI.getPending();
        else if (t === 'active') res = await artisanJobsAPI.getActive();
        else res = await artisanJobsAPI.getHistory();
        setJobs(res?.data || []);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Map admin job response to match JobSummary shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapAdminJob = (j: any): JobSummary => ({
    id: j.id,
    bookingCode: j.bookingCode,
    customerName: j.customerName + (j.artisanName ? ` → ${j.artisanName}` : ''),
    customerLocation: j.customerLocation,
    jobDescription: j.jobDescription,
    status: j.status,
    statusLabel: j.statusLabel || j.status,
    urgency: j.urgency,
    scheduledTime: j.scheduledTime,
    customerBudget: j.customerBudget,
    agreedPrice: j.agreedPrice,
    createdAt: j.createdAt,
    acceptedAt: j.acceptedAt,
    completedAt: j.completedAt,
    timeAgo: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-KE') : '',
  });

  useEffect(() => { fetchJobs(tab); }, [tab, isAdmin]);

  const openAction = (job: JobSummary, action: typeof actionType) => {
    setSelectedJob(job);
    setActionType(action);
    setActionError('');
    setAcceptPrice(job.customerBudget ? String(job.customerBudget) : '');
    setDeclineReason('');
    setCounterPrice('');
    setCounterMessage('');
    setStartPin('');
    setCompletionPin('');
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setMpesaRef('');
  };

  const closeAction = () => { setSelectedJob(null); setActionType(null); setActionError(''); };

  const submitAction = async () => {
    if (!selectedJob || !actionType) return;
    setActionLoading(true);
    setActionError('');
    try {
      const id = selectedJob.id;
      if (actionType === 'accept') {
        if (!acceptPrice) { setActionError('Price is required'); return; }
        await artisanJobsAPI.accept(id, { price: parseInt(acceptPrice), estimatedArrival: 'IN_1_HOUR' });
      } else if (actionType === 'decline') {
        if (!declineReason) { setActionError('Reason is required'); return; }
        await artisanJobsAPI.decline(id, { reason: declineReason });
      } else if (actionType === 'counter') {
        if (!counterPrice) { setActionError('Counter price is required'); return; }
        await artisanJobsAPI.counterOffer(id, { counterPrice: parseInt(counterPrice), message: counterMessage });
      } else if (actionType === 'arrive') {
        await artisanJobsAPI.markArrived(id);
      } else if (actionType === 'start') {
        if (!startPin) { setActionError('START PIN is required'); return; }
        await artisanJobsAPI.start(id, { startPin });
      } else if (actionType === 'complete') {
        if (!completionPin) { setActionError('COMPLETION PIN is required'); return; }
        if (!paymentAmount) { setActionError('Payment amount is required'); return; }
        if (paymentMethod === 'MPESA' && !mpesaRef) { setActionError('M-Pesa transaction ID is required'); return; }
        await artisanJobsAPI.complete(id, {
          completionPin,
          amountReceived: parseInt(paymentAmount),
          paymentMethod,
          transactionId: paymentMethod === 'MPESA' ? mpesaRef : undefined,
        });
      }
      closeAction();
      fetchJobs(tab);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = tab === 'pending' ? jobs.length : 0;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1">{isAdmin ? 'All Bookings' : 'Job Bookings'}</h4>
          <p className="text-muted mb-0">{isAdmin ? 'View all platform bookings across workers' : 'Manage incoming requests and active jobs'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header bg-white border-bottom rounded-top-4 py-3">
          <ul className="nav nav-pills gap-2">
            {([
              { key: 'pending', label: 'Pending Requests', icon: 'fa-inbox' },
              { key: 'active', label: 'Active Jobs', icon: 'fa-screwdriver-wrench' },
              { key: 'history', label: 'History', icon: 'fa-clock-rotate-left' },
            ] as { key: TabType; label: string; icon: string }[]).map(({ key, label, icon }) => (
              <li key={key} className="nav-item">
                <button
                  className={`nav-link rounded-5 fw-medium ${tab === key ? 'active' : ''}`}
                  onClick={() => setTab(key)}
                  style={tab !== key ? { color: '#6c757d' } : {}}
                >
                  <i className={`fa-solid ${icon} me-2`}></i>{label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="text-muted mt-3 mb-0">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fa-solid fa-inbox" style={{ fontSize: 48 }}></i>
              <p className="mt-3 mb-0">
                {tab === 'pending' ? 'No pending job requests.' :
                 tab === 'active' ? 'No active jobs right now.' : 'No job history yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 border-bottom">
                  <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="font-monospace small text-muted fw-semibold">{job.bookingCode}</span>
                        <StatusBadge status={job.status} label={job.statusLabel} />
                        {job.urgency && <UrgencyBadge urgency={job.urgency} />}
                        <span className="text-muted small ms-auto">{job.timeAgo}</span>
                      </div>
                      <h6 className="fw-semibold mb-1">{job.customerName}</h6>
                      <p className="text-muted small mb-1">
                        <i className="fa-solid fa-location-dot me-1"></i>{job.customerLocation}
                      </p>
                      <p className="text-muted small mb-2 text-truncate" style={{ maxWidth: 500 }}>
                        {job.jobDescription}
                      </p>
                      <div className="d-flex gap-3 flex-wrap small">
                        {job.customerBudget && (
                          <span className="text-muted"><i className="fa-solid fa-wallet me-1"></i>Budget: KES {job.customerBudget.toLocaleString()}</span>
                        )}
                        {job.agreedPrice && (
                          <span className="text-success fw-semibold"><i className="fa-solid fa-circle-check me-1"></i>Agreed: KES {job.agreedPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="d-flex flex-column gap-2" style={{ minWidth: 120 }}>
                      {!isAdmin && job.status === 'PENDING' && (
                        <>
                          <button className="btn btn-success btn-sm rounded-3 fw-medium" onClick={() => openAction(job, 'accept')}>
                            <i className="fa-solid fa-check me-1"></i>Accept
                          </button>
                          <button className="btn btn-outline-primary btn-sm rounded-3" onClick={() => openAction(job, 'counter')}>
                            <i className="fa-solid fa-comment-dollar me-1"></i>Counter
                          </button>
                          <button className="btn btn-outline-danger btn-sm rounded-3" onClick={() => openAction(job, 'decline')}>
                            <i className="fa-solid fa-xmark me-1"></i>Decline
                          </button>
                        </>
                      )}
                      {!isAdmin && job.status === 'ACCEPTED' && (
                        <button className="btn btn-primary btn-sm rounded-3 fw-medium" onClick={() => openAction(job, 'arrive')}>
                          <i className="fa-solid fa-location-dot me-1"></i>Mark Arrived
                        </button>
                      )}
                      {!isAdmin && job.status === 'ARRIVED' && (
                        <button className="btn btn-primary btn-sm rounded-3 fw-medium" onClick={() => openAction(job, 'start')}>
                          <i className="fa-solid fa-play me-1"></i>Enter Start PIN
                        </button>
                      )}
                      {!isAdmin && job.status === 'IN_PROGRESS' && (
                        <button className="btn btn-success btn-sm rounded-3 fw-medium" onClick={() => openAction(job, 'complete')}>
                          <i className="fa-solid fa-flag-checkered me-1"></i>Complete Job
                        </button>
                      )}
                      {(job.status === 'COMPLETED' || job.status === 'IN_PROGRESS') && (
                        <button className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => openGallery(job)}>
                          <i className="fa-solid fa-images me-1"></i>Photos
                        </button>
                      )}
                      {job.status === 'COMPLETED' && (
                        <QualityVerificationCard jobId={job.id} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {selectedJob && actionType && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) closeAction(); }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {actionType === 'accept' && 'Accept Job'}
                  {actionType === 'decline' && 'Decline Job'}
                  {actionType === 'counter' && 'Send Counter-Offer'}
                  {actionType === 'arrive' && 'Mark as Arrived'}
                  {actionType === 'start' && 'Enter Start PIN'}
                  {actionType === 'complete' && 'Complete Job & Record Payment'}
                </h5>
                <button type="button" className="btn-close" onClick={closeAction}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  <strong>{selectedJob.customerName}</strong> · {selectedJob.bookingCode}
                </p>

                {actionError && (
                  <div className="alert alert-danger small rounded-3 mb-3">{actionError}</div>
                )}

                {actionType === 'accept' && (
                  <div>
                    <label className="form-label fw-medium">Your price for this job (KES) <span className="text-danger">*</span></label>
                    <input type="number" className="form-control rounded-3" min="1"
                      placeholder={selectedJob.customerBudget ? `Customer budget: KES ${selectedJob.customerBudget}` : 'e.g. 2500'}
                      value={acceptPrice} onChange={(e) => setAcceptPrice(e.target.value)} />
                    <small className="text-muted">Customer budget: {selectedJob.customerBudget ? `KES ${selectedJob.customerBudget}` : 'Not specified'}</small>
                  </div>
                )}

                {actionType === 'decline' && (
                  <div>
                    <label className="form-label fw-medium">Reason <span className="text-danger">*</span></label>
                    <select className="form-select rounded-3" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}>
                      <option value="">Select a reason...</option>
                      <option value="TOO_FAR">Too far away</option>
                      <option value="BUDGET_TOO_LOW">Budget too low</option>
                      <option value="NOT_MY_SKILL">Not my skill area</option>
                      <option value="ALREADY_BUSY">Already busy</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}

                {actionType === 'counter' && (
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label fw-medium">Your proposed price (KES) <span className="text-danger">*</span></label>
                      <input type="number" className="form-control rounded-3" min="1"
                        placeholder="e.g. 3500"
                        value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label fw-medium">Message (optional)</label>
                      <textarea className="form-control rounded-3" rows={2}
                        placeholder="e.g. Requires specialised equipment..."
                        value={counterMessage} onChange={(e) => setCounterMessage(e.target.value)} />
                    </div>
                  </div>
                )}

                {actionType === 'arrive' && (
                  <p className="text-muted">This will notify the customer via SMS and send them your START PIN.</p>
                )}

                {actionType === 'start' && (
                  <div>
                    <label className="form-label fw-medium">Enter the 4-digit START PIN given by the customer <span className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-lg rounded-3 text-center font-monospace fw-bold"
                      maxLength={4} pattern="\d{4}" placeholder="0000"
                      value={startPin} onChange={(e) => setStartPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                )}

                {actionType === 'complete' && (
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label fw-medium">Enter COMPLETION PIN given by customer <span className="text-danger">*</span></label>
                      <input type="text" className="form-control form-control-lg rounded-3 text-center font-monospace fw-bold"
                        maxLength={4} placeholder="0000"
                        value={completionPin} onChange={(e) => setCompletionPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                    </div>
                    <div>
                      <label className="form-label fw-medium">Amount Received (KES) <span className="text-danger">*</span></label>
                      <input type="number" className="form-control rounded-3" min="1"
                        placeholder={selectedJob.agreedPrice ? String(selectedJob.agreedPrice) : 'e.g. 2500'}
                        value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label fw-medium">Payment Method <span className="text-danger">*</span></label>
                      <div className="d-flex gap-3">
                        {(['CASH', 'MPESA', 'BANK_TRANSFER'] as const).map((m) => (
                          <label key={m} className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-outline-secondary'} rounded-3`}>
                            <input type="radio" className="d-none" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                            {m === 'MPESA' ? 'M-Pesa' : m === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Cash'}
                          </label>
                        ))}
                      </div>
                    </div>
                    {paymentMethod === 'MPESA' && (
                      <div>
                        <label className="form-label fw-medium">M-Pesa Transaction ID <span className="text-danger">*</span></label>
                        <input type="text" className="form-control rounded-3 text-uppercase"
                          placeholder="e.g. QKA12345XYZ"
                          value={mpesaRef} onChange={(e) => setMpesaRef(e.target.value.toUpperCase())} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-light rounded-3" onClick={closeAction}>Cancel</button>
                <button
                  className={`btn rounded-3 fw-medium ${actionType === 'decline' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={submitAction} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {actionType === 'accept' && 'Confirm Accept'}
                  {actionType === 'decline' && 'Confirm Decline'}
                  {actionType === 'counter' && 'Send Counter-Offer'}
                  {actionType === 'arrive' && 'Mark Arrived'}
                  {actionType === 'start' && 'Start Job'}
                  {actionType === 'complete' && 'Complete & Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {galleryJob && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => { setGalleryJob(null); setGalleryDetail(null); }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Job Photos — {galleryJob.bookingCode}</h5>
                <button className="btn-close" onClick={() => { setGalleryJob(null); setGalleryDetail(null); }}></button>
              </div>
              <div className="modal-body">
                {galleryLoading ? (
                  <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
                ) : !galleryDetail ? (
                  <p className="text-muted text-center">Could not load job details.</p>
                ) : (
                  <>
                    {/* Before Photos */}
                    <h6 className="fw-semibold mb-2"><i className="fa-solid fa-camera me-2 text-warning"></i>Before Photos</h6>
                    {parseImages(galleryDetail.beforeImages).length > 0 ? (
                      <div className="d-flex gap-2 flex-wrap mb-4">
                        {parseImages(galleryDetail.beforeImages).map((src, i) => (
                          <img key={`before-${i}`} src={src} alt={`Before ${i + 1}`}
                            className="rounded-3 border" style={{ width: 150, height: 150, objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(src, '_blank')} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted small mb-4">No before photos uploaded.</p>
                    )}

                    {/* After Photos */}
                    <h6 className="fw-semibold mb-2"><i className="fa-solid fa-camera-retro me-2 text-success"></i>After Photos</h6>
                    {parseImages(galleryDetail.afterImages).length > 0 ? (
                      <div className="d-flex gap-2 flex-wrap">
                        {parseImages(galleryDetail.afterImages).map((src, i) => (
                          <img key={`after-${i}`} src={src} alt={`After ${i + 1}`}
                            className="rounded-3 border" style={{ width: 150, height: 150, objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(src, '_blank')} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted small">No after photos uploaded yet.</p>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => { setGalleryJob(null); setGalleryDetail(null); }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
