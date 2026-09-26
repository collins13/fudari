'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { parseProviderSlug } from '@/lib/seoUrls';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { workersAPI, bookingsAPI, aiAPI } from '@/lib/api';
import { resolveProfileImage } from '@/lib/avatar';
import JobScopingChatbot from '@/components/JobScopingChatbot';
import SmartPriceBanner from '@/components/SmartPriceBanner';
import {
  saveDraft, loadDraft, clearDraft,
  enqueueBooking, readOutbox, removeFromOutbox, markAttempt, isRetryableError,
} from '@/lib/offlineBookings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtisanBasic {
  id: number;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  locationName: string | null;
  trustScore: number;
  vettingLevel: string;
  skills: { skillType: string; hourlyRate?: string }[];
}

interface EnhanceResult {
  enhancedDescription: string;
  suggestedSkillType: string;
  estimatedDurationHours: number;
  likelyMaterials: string[];
  clarifyingQuestions: string[];
}

interface PriceEstimate {
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  sampleSize: number;
  currency: string;
  summary: string;
}


// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_OPTIONS = [
  { value: 'NOW',       label: 'Right Now',          icon: 'fa-bolt',         desc: 'Need help immediately' },
  { value: 'TODAY',     label: 'Today',              icon: 'fa-sun',          desc: 'Sometime today' },
  { value: 'TOMORROW',  label: 'Tomorrow',           icon: 'fa-calendar-day', desc: 'Available tomorrow' },
  { value: 'SCHEDULED', label: 'Pick a date & time', icon: 'fa-calendar',     desc: 'Schedule in advance' },
];

function skillLabel(st: string) {
  const m: Record<string, string> = {
    ELECTRICIAN: 'Electrician', PLUMBER: 'Plumber', MECHANIC: 'Mechanic',
    CARPENTER: 'Carpenter', PAINTER: 'Painter', WELDER: 'Welder',
    HVAC_TECHNICIAN: 'HVAC Technician', APPLIANCE_REPAIR: 'Appliance Repair',
    MASON: 'Mason', GARDENER: 'Gardener', CLEANER: 'Cleaner', SECURITY: 'Security',
    MOVER: 'Mover', TRANSPORT_PROVIDER: 'Transport Provider', EVENT_LIGHTING: 'Event Lighting',
    OTHER: 'Other',
  };
  return m[st] || st;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookArtisanPage() {
  const params = useParams();
  const router = useRouter();
  const artisanId = parseProviderSlug(String(params.slug ?? '')) ?? 0;

  const [artisan, setArtisan] = useState<ArtisanBasic | null>(null);
  const [loadingArtisan, setLoadingArtisan] = useState(true);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [urgency, setUrgency] = useState<'NOW' | 'TODAY' | 'TOMORROW' | 'SCHEDULED'>('TODAY');
  const [scheduledTime, setScheduledTime] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [queued, setQueued] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // ── AI State ──
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiResult, setAiResult] = useState<EnhanceResult | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  const [showChatbot, setShowChatbot] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    workersAPI.getWorkerProfile(artisanId)
      .then((res) => setArtisan(res.data))
      .catch(() => setArtisan(null))
      .finally(() => setLoadingArtisan(false));
  }, [artisanId]);

  // ── Offline resilience: restore draft, autosave, flush queued bookings ────
  useEffect(() => {
    const draft = loadDraft(artisanId);
    if (!draft) return;
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setCustomerLocation(draft.customerLocation);
    setJobDescription(draft.jobDescription);
    setBudget(draft.budget);
    setUrgency(draft.urgency as typeof urgency);
    setScheduledTime(draft.scheduledTime);
    setDraftRestored(true);
  }, [artisanId]);

  useEffect(() => {
    if (!customerName && !customerPhone && !customerLocation && !jobDescription) return;
    const t = setTimeout(() => {
      saveDraft(artisanId, {
        customerName, customerPhone, customerLocation,
        jobDescription, budget, urgency, scheduledTime,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [artisanId, customerName, customerPhone, customerLocation, jobDescription, budget, urgency, scheduledTime]);

  useEffect(() => {
    const flush = async () => {
      for (const item of readOutbox()) {
        markAttempt(item.id);
        try {
          const res = await bookingsAPI.create(item.payload as Parameters<typeof bookingsAPI.create>[0]);
          removeFromOutbox(item.id);
          clearDraft(item.artisanId);
          if (item.artisanId === artisanId) router.push(`/track/${res.data?.bookingCode}`);
        } catch (err) {
          // A rejected booking will never succeed, so stop retrying it.
          if (!isRetryableError(err)) removeFromOutbox(item.id);
          break;
        }
      }
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [artisanId, router]);

  // ── AI: auto-trigger description enhancement after 1.5s of inactivity ────
  useEffect(() => {
    if (jobDescription.trim().length < 10) {
      setAiResult(null);
      setAiApplied(false);
      return;
    }
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(async () => {
      try {
        setAiEnhancing(true);
        const res = await aiAPI.enhanceDescription({
          description: jobDescription,
          location: customerLocation || artisan?.locationName || undefined,
          skillType: artisan?.skills?.[0]?.skillType,
        });
        setAiResult(res.data);
      } catch {
        /* silently ignore — AI is a bonus, not critical path */
      } finally {
        setAiEnhancing(false);
      }
    }, 1500);
    return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current); };
  }, [jobDescription, customerLocation, artisan]);

  // ── AI: load price estimate when skill type is known ─────────────────────
  useEffect(() => {
    const skill = aiResult?.suggestedSkillType || artisan?.skills?.[0]?.skillType;
    if (!skill) return;
    aiAPI.estimatePrice(skill, customerLocation || artisan?.locationName || undefined)
      .then((res) => setPriceEstimate(res.data))
      .catch(() => {});
  }, [aiResult, artisan, customerLocation]);

  // ── AI: apply enhanced description ───────────────────────────────────────
  const applyEnhancement = () => {
    if (!aiResult) return;
    setJobDescription(aiResult.enhancedDescription);
    setAiApplied(true);
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setQueued(false);
    if (urgency === 'SCHEDULED' && !scheduledTime) {
      setError('Please pick a date and time for your scheduled booking.');
      return;
    }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      artisanId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerLocation: customerLocation.trim(),
      jobDescription: jobDescription.trim(),
      urgency,
    };
    if (urgency === 'SCHEDULED') payload.scheduledTime = new Date(scheduledTime).toISOString();
    if (budget) payload.budget = parseInt(budget, 10);

    try {
      const res = await bookingsAPI.create(payload as Parameters<typeof bookingsAPI.create>[0]);
      clearDraft(artisanId);
      router.push(`/track/${res.data?.bookingCode}`);
    } catch (err: unknown) {
      if (isRetryableError(err)) {
        enqueueBooking(artisanId, payload);
        setQueued(true);
      } else {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e?.response?.data?.message || 'Failed to submit booking. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const primarySkill = artisan?.skills?.[0];

  return (
    <>
      <Navbar />
      <div className="bg-light min-vh-100 py-5">
        <div className="container" style={{ maxWidth: 820 }}>
          <Link href={`/artisan/${params.slug}`} className="btn btn-link text-muted ps-0 mb-3">
            <i className="fa-solid fa-arrow-left me-2" />Back to Profile
          </Link>

          {/* Artisan summary */}
          {!loadingArtisan && artisan && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 d-flex flex-row align-items-center gap-3">
              {artisan.profileImage ? (
                <Image src={resolveProfileImage(artisan.profileImage)} alt={artisan.firstName}
                  width={60} height={60}
                  className="rounded-circle" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white fw-bold"
                  style={{ width: 60, height: 60, fontSize: 22 }}>
                  {artisan.firstName[0]}
                </div>
              )}
              <div className="flex-grow-1">
                <h5 className="fw-bold mb-0">{artisan.firstName} {artisan.lastName}</h5>
                {primarySkill && (
                  <p className="text-primary small mb-0">
                    <i className="fa-solid fa-screwdriver-wrench me-1" />
                    {skillLabel(primarySkill.skillType)}
                    {primarySkill.hourlyRate && ` · From KES ${primarySkill.hourlyRate}/hr`}
                  </p>
                )}
                {artisan.locationName && (
                  <p className="text-muted small mb-0">
                    <i className="fa-solid fa-location-dot me-1" />{artisan.locationName}
                  </p>
                )}
              </div>
              {artisan.trustScore > 0 && (
                <div className="text-warning small text-end">
                  <i className="fa-solid fa-star me-1" />{artisan.trustScore.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {/* Smart Price Estimate — Feature 5 (upgraded) */}
          <SmartPriceBanner
            skillType={aiResult?.suggestedSkillType || primarySkill?.skillType}
            location={customerLocation || artisan?.locationName || undefined}
            urgency={urgency}
            artisanRating={artisan?.trustScore}
          />

          {/* Booking form */}
          <div className="card border-0 shadow-sm rounded-4 p-4 p-lg-5">
            <h4 className="fw-bold mb-1">Book This Pro</h4>
            <p className="text-muted mb-4">No account needed. You&apos;ll get a booking code to track your job.</p>

            {error && (
              <div className="alert alert-danger small rounded-3 mb-4" role="alert">
                <i className="fa-solid fa-circle-exclamation me-2" />{error}
              </div>
            )}

            {queued && (
              <div className="alert alert-warning small rounded-3 mb-4" role="status">
                <i className="fa-solid fa-cloud-arrow-up me-2" />
                <strong>Saved &mdash; waiting for network.</strong> Your booking will be sent automatically
                as soon as you&apos;re back online. You can keep this page open or come back later.
              </div>
            )}

            {draftRestored && !queued && (
              <div className="alert alert-info small rounded-3 mb-4 d-flex align-items-center">
                <i className="fa-solid fa-rotate-left me-2" />
                <span className="me-auto">We restored what you typed earlier.</span>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-decoration-none"
                  onClick={() => {
                    clearDraft(artisanId);
                    setCustomerName(''); setCustomerPhone(''); setCustomerLocation('');
                    setJobDescription(''); setBudget(''); setScheduledTime('');
                    setDraftRestored(false);
                  }}
                >
                  Start fresh
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Your Details */}
              <h6 className="fw-semibold text-muted text-uppercase small mb-3 mt-2">Your Details</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label htmlFor="customer-name" className="form-label small fw-medium">Full Name <span className="text-danger">*</span></label>
                  <input id="customer-name" name="name" type="text" className="form-control rounded-3" required autoComplete="name"
                    placeholder="e.g. John Kamau"
                    value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label htmlFor="customer-phone" className="form-label small fw-medium">
                    Phone Number <span className="text-danger">*</span>
                    <span className="text-muted ms-1">(for SMS updates)</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">+254</span>
                    <input id="customer-phone" name="tel" type="tel" className="form-control rounded-end-3" required
                      autoComplete="tel" inputMode="tel" aria-describedby="customer-phone-help"
                      placeholder="7XX XXX XXX"
                      value={customerPhone.replace(/^\+254/, '').replace(/^254/, '')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                        setCustomerPhone(raw ? `+254${raw}` : '');
                      }} />
                  </div>
                  <small id="customer-phone-help" className="text-muted">We&apos;ll send your booking code via SMS.</small>
                </div>
                <div className="col-12">
                  <label htmlFor="customer-location" className="form-label small fw-medium">Your Location / Address <span className="text-danger">*</span></label>
                  <input id="customer-location" name="street-address" type="text" className="form-control rounded-3" required autoComplete="street-address"
                    placeholder="e.g. Westlands, Nairobi — near Sarit Centre"
                    value={customerLocation} onChange={(e) => setCustomerLocation(e.target.value)} />
                </div>
              </div>

              {/* Job Details */}
              <h6 className="fw-semibold text-muted text-uppercase small mb-3">Job Details</h6>
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="job-description" className="form-label small fw-medium mb-0">
                    Describe the Job <span className="text-danger">*</span>
                  </label>
                  {/* AI enhance button */}
                  {jobDescription.trim().length >= 10 && !aiEnhancing && !aiApplied && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary rounded-5 py-0 px-2"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => {
                        if (aiResult) applyEnhancement();
                        else {
                          setAiEnhancing(true);
                          aiAPI.enhanceDescription({
                            description: jobDescription,
                            location: customerLocation || artisan?.locationName || undefined,
                          }).then((res) => {
                            setAiResult(res.data);
                            setAiEnhancing(false);
                          }).catch(() => setAiEnhancing(false));
                        }
                      }}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles me-1" />
                      {aiResult ? 'Apply AI suggestion' : 'Enhance with AI'}
                    </button>
                  )}
                  {aiEnhancing && (
                    <span className="text-muted small" role="status">
                      <span className="spinner-border spinner-border-sm me-1" />AI analysing…
                    </span>
                  )}
                  {aiApplied && (
                    <span className="text-success small">
                      <i className="fa-solid fa-check me-1" />AI enhanced
                    </span>
                  )}
                </div>

                <textarea
                  id="job-description"
                  name="job-description"
                  className="form-control rounded-3"
                  rows={4} required minLength={10}
                  aria-describedby="job-description-help"
                  placeholder="e.g. My kitchen sink is leaking and needs a new pipe fitting."
                  value={jobDescription}
                  onChange={(e) => { setJobDescription(e.target.value); setAiApplied(false); }}
                />
                  <small id="job-description-help" className="text-muted">The more detail you give, the better they can prepare.</small>
              </div>

              {/* AI suggestion card — Feature 1 */}
              {aiResult && !aiApplied && (
                <div className="card border border-primary border-opacity-25 rounded-3 p-3 mb-3"
                  style={{ background: 'rgba(99,102,241,0.04)' }}>
                  <div className="d-flex align-items-start gap-2 mb-2">
                    <i className="fa-solid fa-wand-magic-sparkles text-primary mt-1 flex-shrink-0" />
                    <div className="flex-grow-1">
                      <div className="fw-semibold small text-primary mb-1">AI Suggestion</div>

                      {/* Suggested skill */}
                      {aiResult.suggestedSkillType && aiResult.suggestedSkillType !== 'OTHER' && (
                        <div className="mb-2">
                          <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill" style={{ fontSize: '0.75rem' }}>
                            <i className="fa-solid fa-screwdriver-wrench me-1" />
                            Suggested: {skillLabel(aiResult.suggestedSkillType)}
                          </span>
                          {aiResult.estimatedDurationHours > 0 && (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill ms-2" style={{ fontSize: '0.75rem' }}>
                              <i className="fa-solid fa-clock me-1" />~{aiResult.estimatedDurationHours}h
                            </span>
                          )}
                        </div>
                      )}

                      {/* Enhanced description preview */}
                      <p className="small text-muted mb-2" style={{ lineHeight: 1.6 }}>
                        {aiResult.enhancedDescription.slice(0, 200)}
                        {aiResult.enhancedDescription.length > 200 && '…'}
                      </p>

                      {/* Materials */}
                      {aiResult.likelyMaterials?.length > 0 && (
                        <div className="mb-2">
                          <span className="small text-muted fw-semibold">Likely materials: </span>
                          <span className="small text-muted">{aiResult.likelyMaterials.join(', ')}</span>
                        </div>
                      )}

                      {/* Clarifying questions */}
                      {aiResult.clarifyingQuestions?.length > 0 && (
                        <div className="mb-2">
                          <span className="small text-muted fw-semibold">They may ask: </span>
                          <ul className="mb-0 ps-3">
                            {aiResult.clarifyingQuestions.slice(0, 2).map((q, i) => (
                              <li key={i} className="small text-muted">{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-primary rounded-5" onClick={applyEnhancement}>
                      <i className="fa-solid fa-check me-1" />Use this description
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary rounded-5"
                      onClick={() => setAiResult(null)}>
                      Keep mine
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="job-budget" className="form-label small fw-medium">Budget (Optional)</label>
                <div className="input-group" style={{ maxWidth: 240 }}>
                  <span className="input-group-text bg-light">KES</span>
                  <input id="job-budget" name="budget" type="number" min="0" inputMode="numeric" className="form-control rounded-end-3"
                    placeholder="e.g. 2000"
                    value={budget} onChange={(e) => setBudget(e.target.value)} />
                </div>
                {priceEstimate && !budget && (
                  <small className="text-muted">
                    Market rate for this job: KES {priceEstimate.minPrice.toLocaleString()}–{priceEstimate.maxPrice.toLocaleString()}
                  </small>
                )}
              </div>

              {/* Urgency */}
              <h6 className="fw-semibold text-muted text-uppercase small mb-3">When do you need this done?</h6>
              <div className="row g-3 mb-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="col-6 col-md-3">
                    <label
                      className={`card border rounded-3 p-3 text-center h-100 ${urgency === opt.value ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input type="radio" className="d-none" name="urgency" value={opt.value}
                        checked={urgency === opt.value}
                        onChange={() => setUrgency(opt.value as typeof urgency)} />
                      <i className={`fa-solid ${opt.icon} mb-2 ${urgency === opt.value ? 'text-primary' : 'text-muted'}`} style={{ fontSize: 22 }} />
                      <div className={`fw-semibold small ${urgency === opt.value ? 'text-primary' : ''}`}>{opt.label}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{opt.desc}</div>
                    </label>
                  </div>
                ))}
              </div>

              {urgency === 'SCHEDULED' && (
                <div className="mb-4">
                  <label htmlFor="scheduled-time" className="form-label small fw-medium">Date &amp; Time <span className="text-danger">*</span></label>
                  <input id="scheduled-time" name="scheduled-time" type="datetime-local" className="form-control rounded-3" required
                    min={new Date().toISOString().slice(0, 16)}
                    value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
              )}

              <div className="d-grid mt-4">
                <button type="submit" className="btn btn-accent btn-lg rounded-3 fw-semibold"
                  disabled={submitting || loadingArtisan}>
                  {submitting
                    ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
                    : <><i className="fa-solid fa-paper-plane me-2" />Submit Booking Request</>}
                </button>
              </div>
              <p className="text-muted small text-center mt-3 mb-0">
                <i className="fa-solid fa-shield-halved me-1 text-success" />
                No payment required now. The artisan will confirm and agree on a price.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Job Scoping Chatbot */}
      {showChatbot && (
        <div className="position-fixed" style={{ bottom: 90, right: 24, zIndex: 1050 }}>
          <JobScopingChatbot
            onClose={() => setShowChatbot(false)}
            onJobSpecReady={(spec) => {
              setJobDescription(spec.enhancedDescription);
              if (spec.estimatedMinPrice) setBudget(String(spec.estimatedMinPrice));
              if (spec.urgency === 'NOW' || spec.urgency === 'TODAY' || spec.urgency === 'TOMORROW' || spec.urgency === 'SCHEDULED') {
                setUrgency(spec.urgency as typeof urgency);
              }
              setShowChatbot(false);
            }}
          />
        </div>
      )}

      {/* Chatbot FAB */}
      {!showChatbot && (
        <button
          className="btn btn-primary rounded-circle shadow-lg position-fixed d-flex align-items-center justify-content-center"
          style={{ bottom: 24, right: 24, width: 56, height: 56, zIndex: 1040 }}
          onClick={() => setShowChatbot(true)}
          title="AI Job Assistant"
        >
          <i className="fa-solid fa-robot fa-lg" />
        </button>
      )}

      <Footer />
    </>
  );
}
