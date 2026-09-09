'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { bookingsAPI } from '@/lib/api';
import { whatsappBotLink } from '@/lib/whatsapp';

interface TrackData {
  jobId: number;
  bookingCode: string;
  status: string;
  statusLabel: string;
  jobDescription: string;
  customerLocation: string;
  urgency: string;
  scheduledTime: string | null;
  customerBudget: number | null;
  artisanId: number | null;
  artisanName: string | null;
  artisanPhone: string | null;
  artisanLocation: string | null;
  artisanRating: number | null;
  agreedPrice: number | null;
  startPin: string | null;
  completionPin: string | null;
  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  declineReason: string | null;
  canCancel: boolean;
  canRate: boolean;
}

const STATUS_STEPS = ['PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

function getStepIndex(status: string) {
  const idx = STATUS_STEPS.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function statusColor(status: string) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'DECLINED' || status === 'CANCELLED') return 'danger';
  if (status === 'DISPUTED') return 'warning';
  if (status === 'COUNTER_OFFERED') return 'warning';
  return 'primary';
}

function statusIcon(status: string) {
  if (status === 'COMPLETED') return 'fa-circle-check';
  if (status === 'DECLINED' || status === 'CANCELLED') return 'fa-circle-xmark';
  if (status === 'DISPUTED') return 'fa-triangle-exclamation';
  if (status === 'COUNTER_OFFERED') return 'fa-comment-dollar';
  if (status === 'IN_PROGRESS') return 'fa-screwdriver-wrench';
  if (status === 'ARRIVED') return 'fa-location-dot';
  if (status === 'ACCEPTED') return 'fa-circle-check';
  return 'fa-clock';
}

export default function TrackBookingPage() {
  const params = useParams();
  const code = params.code as string;

  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Counter-offer state
  const [counterAction, setCounterAction] = useState<'accept' | 'reject' | null>(null);
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterMsg, setCounterMsg] = useState('');

  // Cancel state
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Rate state
  const [rating, setRating] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSuccess, setRateSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [uiMessage, setUiMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await bookingsAPI.track(code);
      setData(res.data);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Booking not found. Check your booking code.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchTracking();
    // Poll every 30 seconds for live status updates
    const interval = setInterval(fetchTracking, 30000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  const handleCancel = async () => {
    setShowCancelConfirm(false);
    setCancelLoading(true);
    try {
      await bookingsAPI.cancel(code, cancelReason || undefined);
      setUiMessage({ type: 'success', text: 'Booking cancelled successfully.' });
      fetchTracking();
    } catch (err: any) {
      setUiMessage({
        type: 'danger',
        text: err?.response?.data?.message || 'Failed to cancel booking. Please try again.',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateLoading(true);
    try {
      await bookingsAPI.rate(code, { rating, comment: rateComment });
      setRateSuccess(true);
      setUiMessage({ type: 'success', text: 'Thanks for your rating. Your feedback was submitted.' });
    } catch (err: any) {
      setUiMessage({
        type: 'danger',
        text: err?.response?.data?.message || 'Failed to submit rating. Please try again.',
      });
    } finally {
      setRateLoading(false);
    }
  };

  const handleCopyTrackingLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setUiMessage({ type: 'success', text: 'Tracking link copied to clipboard.' });
    } catch {
      setUiMessage({ type: 'danger', text: 'Could not copy the link. Please copy it manually.' });
    }
  };

  const handleCopyHomeLink = async () => {
    try {
      await navigator.clipboard?.writeText('https://fudari.co');
      setUiMessage({ type: 'success', text: 'Fudari link copied to clipboard.' });
    } catch {
      setUiMessage({ type: 'danger', text: 'Could not copy the link. Please try again.' });
    }
  };

  const handleCounterResponse = async (action: 'accept' | 'reject') => {
    setCounterAction(action);
    setCounterLoading(true);
    try {
      if (action === 'accept') {
        await bookingsAPI.acceptCounter(code);
        setCounterMsg('Counter-offer accepted! The booking is now confirmed.');
      } else {
        await bookingsAPI.rejectCounter(code);
        setCounterMsg('Counter-offer rejected. The booking has been declined.');
      }
      fetchTracking();
    } catch (err: any) {
      setCounterMsg(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setCounterLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <p className="text-muted">Loading booking details...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Navbar />
        <div className="container py-5" style={{ maxWidth: 600 }}>
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
            <i className="fa-solid fa-circle-xmark text-danger mb-3" style={{ fontSize: 48 }}></i>
            <h4 className="fw-bold mb-2">Booking Not Found</h4>
            <p className="text-muted mb-4">{error}</p>
            <Link href="/artisans" className="btn btn-primary rounded-5">Browse Services</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const stepIndex = getStepIndex(data.status);
  const isTerminal = ['COMPLETED', 'CANCELLED', 'DECLINED', 'DISPUTED'].includes(data.status);

  return (
    <>
      <Navbar />
      <div className="bg-light py-5 min-vh-100">
        <div className="container" style={{ maxWidth: 700 }}>

          {uiMessage && (
            <div className={`alert alert-${uiMessage.type} alert-dismissible fade show rounded-3 mb-4`} role="alert">
              <i className={`fa-solid ${uiMessage.type === 'danger' ? 'fa-circle-xmark' : 'fa-circle-check'} me-2`}></i>
              {uiMessage.text}
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setUiMessage(null)}></button>
            </div>
          )}

          {/* Header card */}
          <div className={`card border-0 shadow-sm rounded-4 p-4 mb-4 border-start border-4 border-${statusColor(data.status)}`}>
            <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
              <div>
                <div className="text-muted small mb-1">Booking Reference</div>
                <h3 className="fw-bold mb-1 font-monospace">{data.bookingCode}</h3>
                <span className={`badge text-bg-${statusColor(data.status)} fs-6 px-3 py-2`}>
                  <i className={`fa-solid ${statusIcon(data.status)} me-2`}></i>
                  {data.statusLabel}
                </span>
              </div>
              <div className="text-end text-muted small">
                <div>Submitted: {new Date(data.createdAt).toLocaleString('en-KE')}</div>
                {data.acceptedAt && <div>Accepted: {new Date(data.acceptedAt).toLocaleString('en-KE')}</div>}
                {data.completedAt && <div>Completed: {new Date(data.completedAt).toLocaleString('en-KE')}</div>}
              </div>
            </div>
          </div>

          {/* Counter-offer banner */}
          {data.status === 'COUNTER_OFFERED' && data.agreedPrice && (
            <div className="card border-warning border-2 rounded-4 shadow-sm p-4 mb-4">
              <h6 className="fw-bold text-warning mb-2">
                <i className="fa-solid fa-comment-dollar me-2"></i>Counter-Offer
              </h6>
              <p className="mb-3">
                {data.artisanName} has proposed a new price of{' '}
                <strong className="text-primary fs-5">KES {data.agreedPrice.toLocaleString()}</strong>{' '}
                for this job. Please accept or reject below.
              </p>
              {counterMsg ? (
                <div className="alert alert-info small mb-0">{counterMsg}</div>
              ) : (
                <div className="d-flex gap-3">
                  <button className="btn btn-success rounded-3 fw-medium px-4"
                    onClick={() => handleCounterResponse('accept')}
                    disabled={counterLoading}>
                    {counterLoading && counterAction === 'accept'
                      ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                    <i className="fa-solid fa-check me-1"></i>Accept KES {data.agreedPrice.toLocaleString()}
                  </button>
                  <button className="btn btn-outline-danger rounded-3 fw-medium px-4"
                    onClick={() => handleCounterResponse('reject')}
                    disabled={counterLoading}>
                    {counterLoading && counterAction === 'reject'
                      ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                    <i className="fa-solid fa-xmark me-1"></i>Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Progress tracker */}
          {!isTerminal && data.status !== 'COUNTER_OFFERED' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h6 className="fw-semibold mb-3">Job Progress</h6>
              <div className="d-flex align-items-center">
                {['Requested', 'Accepted', 'Arrived', 'In Progress', 'Done'].map((label, idx) => (
                  <div key={idx} className="d-flex align-items-center flex-fill">
                    <div className="text-center" style={{ minWidth: 50 }}>
                      <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-1 ${idx <= stepIndex ? 'bg-primary text-white' : 'bg-light text-muted border'}`}
                        style={{ width: 32, height: 32, fontSize: 13 }}>
                        {idx < stepIndex ? <i className="fa-solid fa-check"></i> : idx + 1}
                      </div>
                      <div className={`small ${idx <= stepIndex ? 'fw-semibold text-primary' : 'text-muted'}`}
                        style={{ fontSize: 11 }}>{label}</div>
                    </div>
                    {idx < 4 && (
                      <div className={`flex-fill border-top border-2 mb-4 ${idx < stepIndex ? 'border-primary' : 'border-light'}`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isTerminal && data.status !== 'COUNTER_OFFERED' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4" style={{ background: '#f8fbff' }}>
              <h6 className="fw-semibold mb-2">
                <i className="fa-solid fa-route me-2 text-primary"></i>What happens next
              </h6>
              <div className="small text-muted mb-2">
                {data.status === 'PENDING' && 'Your request is waiting for confirmation. Most confirmations happen within a few minutes.'}
                {data.status === 'ACCEPTED' && 'Your pro has accepted and should coordinate arrival shortly. Keep your phone available for call/SMS.'}
                {data.status === 'ARRIVED' && 'Your pro has marked arrival. Share your START PIN when work begins.'}
                {data.status === 'IN_PROGRESS' && 'Work is in progress. Share the COMPLETION PIN only after you confirm the job is done.'}
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="badge text-bg-light border">Typical response: 5-30 mins</span>
                <span className="badge text-bg-light border">Arrival target: within agreed window</span>
                <a
                  href={whatsappBotLink(`Hi FUDARI support, booking ${data.bookingCode} needs reassignment due to delay/no-show.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-primary rounded-5 ms-sm-auto"
                >
                  <i className="fa-brands fa-whatsapp me-1"></i>Request fast reassignment
                </a>
              </div>
            </div>
          )}

          {/* Job details */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h6 className="fw-semibold mb-3"><i className="fa-solid fa-clipboard me-2 text-primary"></i>Job Details</h6>
            <div className="row g-3">
              <div className="col-12">
                <label className="text-muted small d-block">Description</label>
                <p className="mb-0">{data.jobDescription}</p>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">Location</label>
                <p className="mb-0 fw-medium"><i className="fa-solid fa-location-dot text-primary me-1"></i>{data.customerLocation}</p>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">Urgency</label>
                <p className="mb-0 fw-medium">{data.urgency}</p>
              </div>
              {data.customerBudget && (
                <div className="col-md-6">
                  <label className="text-muted small d-block">Your Budget</label>
                  <p className="mb-0 fw-medium">KES {data.customerBudget.toLocaleString()}</p>
                </div>
              )}
              {data.agreedPrice && data.status !== 'COUNTER_OFFERED' && (
                <div className="col-md-6">
                  <label className="text-muted small d-block">Agreed Price</label>
                  <p className="mb-0 fw-bold text-success fs-5">KES {data.agreedPrice.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Artisan info (visible after acceptance) */}
          {data.artisanName && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h6 className="fw-semibold mb-3"><i className="fa-solid fa-user-tie me-2 text-primary"></i>Your Pro</h6>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div>
                  <h5 className="fw-bold mb-0">{data.artisanName}</h5>
                  {data.artisanLocation && (
                    <p className="text-muted small mb-1"><i className="fa-solid fa-location-dot me-1"></i>{data.artisanLocation}</p>
                  )}
                  {data.artisanRating && (
                    <div className="text-warning small"><i className="fa-solid fa-star me-1"></i>{data.artisanRating.toFixed(1)}</div>
                  )}
                </div>
                <div className="ms-auto d-flex gap-2 flex-wrap">
                  {data.artisanPhone && (
                    <>
                      <a href={`tel:${data.artisanPhone}`} className="btn btn-outline-primary rounded-5 btn-sm">
                        <i className="fa-solid fa-phone me-1"></i>Call
                      </a>
                      <a href={whatsappBotLink(`Hi, I have a question about booking ${data.bookingCode}`)}
                        target="_blank" rel="noopener noreferrer"
                        className="btn btn-success rounded-5 btn-sm">
                        <i className="fa-brands fa-whatsapp me-1"></i>WhatsApp Support
                      </a>
                    </>
                  )}
                  {data.artisanId && (
                    <Link
                      href={`/chat/${data.artisanId}?booking=${data.bookingCode}`}
                      className="btn btn-primary rounded-5 btn-sm"
                    >
                      <i className="fa-solid fa-message me-1"></i>Message
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PIN display */}
          {data.startPin && (
            <div className="card border-primary border-2 rounded-4 shadow-sm p-4 mb-4 text-center">
              <h6 className="fw-bold text-primary mb-2"><i className="fa-solid fa-key me-2"></i>START PIN</h6>
              <p className="text-muted small mb-2">Give this PIN to your pro when they arrive.</p>
              <div className="display-4 fw-bold font-monospace letter-spacing-wide text-primary">{data.startPin}</div>
            </div>
          )}
          {data.completionPin && (
            <div className="card border-success border-2 rounded-4 shadow-sm p-4 mb-4 text-center">
              <h6 className="fw-bold text-success mb-2"><i className="fa-solid fa-flag-checkered me-2"></i>COMPLETION PIN</h6>
              <p className="text-muted small mb-2">Give this PIN to your pro when the job is done.</p>
              <div className="display-4 fw-bold font-monospace text-success">{data.completionPin}</div>
            </div>
          )}

          {/* Decline reason */}
          {data.declineReason && (
            <div className="alert alert-danger rounded-3 mb-4">
              <i className="fa-solid fa-circle-xmark me-2"></i>
              <strong>Declined:</strong> {data.declineReason}
              <div className="mt-2">
                <Link href="/artisans" className="btn btn-sm btn-outline-danger rounded-5">
                  Find Someone Else
                </Link>
              </div>
            </div>
          )}

          {/* Rating form */}
          {data.canRate && !rateSuccess && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h6 className="fw-semibold mb-3"><i className="fa-solid fa-star me-2 text-warning"></i>Rate Your Experience</h6>
              <form onSubmit={handleRate}>
                <div className="mb-3 d-flex gap-2 fs-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)}
                      className="btn btn-link p-0" style={{ lineHeight: 1 }}>
                      <i className={`fa-${s <= rating ? 'solid' : 'regular'} fa-star text-warning`}></i>
                    </button>
                  ))}
                  <span className="fs-6 text-muted ms-2 align-self-center">{rating}/5</span>
                </div>
                <textarea className="form-control rounded-3 mb-3" rows={3}
                  placeholder="Optional: share your experience..."
                  value={rateComment} onChange={(e) => setRateComment(e.target.value)} />
                <button type="submit" className="btn btn-primary rounded-5 px-4" disabled={rateLoading}>
                  {rateLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Submit Rating
                </button>
              </form>
            </div>
          )}
          {rateSuccess && (
            <div className="alert alert-success rounded-3 mb-4">
              <i className="fa-solid fa-circle-check me-2"></i>
              Thank you for your rating! Your feedback helps the community.
            </div>
          )}

          {/* Cancel */}
          {data.canCancel && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h6 className="fw-semibold text-danger mb-2">Cancel Booking</h6>
              <p className="text-muted small mb-3">
                Free cancellation within 15 minutes of booking. A KES 100 fee applies after that for accepted bookings.
              </p>
              <div className="mb-3">
                <input type="text" className="form-control rounded-3" placeholder="Reason for cancellation (optional)"
                  value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </div>
              <button className="btn btn-outline-danger rounded-5 btn-sm px-4"
                onClick={() => setShowCancelConfirm(true)} disabled={cancelLoading}>
                {cancelLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                <i className="fa-solid fa-xmark me-1"></i>Cancel Booking
              </button>
            </div>
          )}

          {/* Share tracking link */}
          <div className="card border-0 bg-light rounded-4 p-3 mb-4">
            <p className="text-muted small mb-1">Share your tracking link:</p>
            <div className="input-group input-group-sm">
              <input type="text" readOnly className="form-control font-monospace bg-white"
                value={typeof window !== 'undefined' ? window.location.href : ''} />
              <button className="btn btn-outline-secondary" type="button"
                onClick={handleCopyTrackingLink}>
                <i className="fa-solid fa-copy"></i>
              </button>
            </div>
          </div>

          {/* Referral prompt — highest-intent acquisition moment */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4" style={{ background: 'linear-gradient(135deg, #fff8f6 0%, #fff 100%)' }}>
            <div className="d-flex align-items-start gap-3 flex-wrap">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{ width: 44, height: 44, background: 'var(--tx-primary-soft)' }}>
                <i className="fa-solid fa-people-group text-primary fs-5"></i>
              </div>
              <div className="flex-grow-1">
                <h6 className="fw-bold mb-1">Know someone who needs a hand?</h6>
                <p className="text-muted small mb-3">
                  Share Fudari — book any service in 60 seconds, no account needed. M-Pesa payments, verified pros.
                </p>
                <div className="d-flex gap-2 flex-wrap">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent('🔧 Found a great way to hire verified pros in Kenya! Fudari — Plumbers, Electricians, Carpenters, Movers & more near you. No sign-up, M-Pesa payments 👇 https://fudari.co')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success rounded-5 btn-sm px-3"
                  >
                    <i className="fa-brands fa-whatsapp me-1"></i>Share on WhatsApp
                  </a>
                  <button
                    className="btn btn-outline-secondary rounded-5 btn-sm px-3"
                    onClick={handleCopyHomeLink}
                  >
                    <i className="fa-solid fa-copy me-1"></i>Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showCancelConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="fa-solid fa-triangle-exclamation me-2"></i>Cancel this booking?
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowCancelConfirm(false)}></button>
              </div>
              <div className="modal-body pt-0">
                <p className="mb-2">You are about to cancel booking <strong>{data.bookingCode}</strong>.</p>
                <p className="text-muted small mb-0">This action can affect availability and may include cancellation fees based on status.</p>
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light rounded-3" onClick={() => setShowCancelConfirm(false)}>
                  Keep Booking
                </button>
                <button type="button" className="btn btn-danger rounded-3" onClick={handleCancel} disabled={cancelLoading}>
                  {cancelLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
