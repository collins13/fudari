'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jobsAPI, subscriptionsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SKILL_OPTIONS = [
  { value: 'ELECTRICIAN', label: 'Electrician' },
  { value: 'PLUMBER', label: 'Plumber' },
  { value: 'MECHANIC', label: 'Mechanic' },
  { value: 'CARPENTER', label: 'Carpenter' },
  { value: 'PAINTER', label: 'Painter' },
  { value: 'WELDER', label: 'Welder' },
  { value: 'HVAC_TECHNICIAN', label: 'HVAC Technician' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair' },
  { value: 'ROOFING', label: 'Roofing' },
  { value: 'TILING', label: 'Tiling' },
  { value: 'MASON', label: 'Mason' },
  { value: 'GARDENER', label: 'Gardener' },
  { value: 'CLEANER', label: 'Cleaner' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'SOLAR_TECHNICIAN', label: 'Solar Technician' },
  { value: 'BOREHOLE_DRILLING', label: 'Borehole Drilling' },
  { value: 'FUMIGATION', label: 'Fumigation' },
  { value: 'WATER_TANK_CLEANING', label: 'Water Tank Cleaning' },
  { value: 'GLASS_FITTER', label: 'Glass Fitter' },
  { value: 'CEILING_BOARD', label: 'Ceiling Board' },
  { value: 'LOCKSMITH', label: 'Locksmith' },
  { value: 'CCTV_INSTALLER', label: 'CCTV Installer' },
  { value: 'INTERIOR_DESIGNER', label: 'Interior Designer' },
  { value: 'MOVER', label: 'Mover' },
  { value: 'TRANSPORT_PROVIDER', label: 'Transport Provider' },
  { value: 'EVENT_LIGHTING', label: 'Event Lighting' },
  { value: 'OTHER', label: 'Other' },
];

interface FormState {
  title: string;
  skillType: string;
  description: string;
  address: string;
  locationName: string;
  budgetMin: string;
  budgetMax: string;
  isUrgent: boolean;
  allowBidding: boolean;
  estimatedDurationHours: string;
  preferredTime: string;
}

const EMPTY: FormState = {
  title: '',
  skillType: '',
  description: '',
  address: '',
  locationName: '',
  budgetMin: '',
  budgetMax: '',
  isUrgent: false,
  allowBidding: true,
  estimatedDurationHours: '',
  preferredTime: '',
};

export default function PostJobPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [subChecked, setSubChecked] = useState(false);
  const [hasPaidPlan, setHasPaidPlan] = useState(true); // assume allowed until checked

  useEffect(() => {
    // CLIENT users always allowed; WORKER users need BASIC or PRO
    if (!user) return;
    if (user.role !== 'WORKER') { setSubChecked(true); return; }
    subscriptionsAPI.getCurrentSubscription()
      .then((res) => {
        const plan: string = res.data?.planType || 'FREE';
        setHasPaidPlan(plan === 'BASIC' || plan === 'PRO');
      })
      .catch(() => setHasPaidPlan(false))
      .finally(() => setSubChecked(true));
  }, [user]);

  if (!subChecked) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (!hasPaidPlan) {
    return (
      <div className="text-center py-5">
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 mx-auto" style={{ maxWidth: 480 }}>
          <span className="rounded-circle d-inline-flex align-items-center justify-content-center bg-warning bg-opacity-10 mx-auto mb-3"
            style={{ width: 72, height: 72 }}>
            <i className="fa-solid fa-lock fa-2x text-warning"></i>
          </span>
          <h5 className="fw-bold mb-2">BASIC or PRO Plan Required</h5>
          <p className="text-muted mb-4 small">
            Posting jobs is available to artisans on the <strong>BASIC</strong> or <strong>PRO</strong> plan.
            Upgrade your subscription to post jobs and receive sub-contractor bids.
          </p>
          <Link href="/dashboard/subscription" className="btn btn-primary rounded-pill px-4">
            <i className="fa-solid fa-arrow-up me-2"></i>Upgrade My Plan
          </Link>
        </div>
      </div>
    );
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError('Job title is required.'); return; }
    if (!form.skillType) { setError('Please select a skill type.'); return; }
    if (!form.description.trim()) { setError('Please describe the job.'); return; }

    setLoading(true);
    try {
      await jobsAPI.createJob({
        title: form.title.trim(),
        skillType: form.skillType,
        description: form.description.trim(),
        address: form.address.trim() || undefined,
        locationName: form.locationName.trim() || undefined,
        budgetMin: form.budgetMin || undefined,
        budgetMax: form.budgetMax || undefined,
        isUrgent: form.isUrgent,
        allowBidding: form.allowBidding,
        estimatedDurationHours: form.estimatedDurationHours ? parseInt(form.estimatedDurationHours) : undefined,
        preferredTime: form.preferredTime || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-5">
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 mx-auto" style={{ maxWidth: 480 }}>
          <span className="rounded-circle d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 mx-auto mb-3"
            style={{ width: 72, height: 72 }}>
            <i className="fa-solid fa-circle-check fa-2x text-success"></i>
          </span>
          <h5 className="fw-bold mb-2">Job Posted!</h5>
          <p className="text-muted mb-4 small">
            Your job has been submitted for review. Once approved by our team, artisans
            will be able to see it and place bids. You&apos;ll be notified when bids arrive.
          </p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <button className="btn btn-outline-secondary rounded-pill btn-sm px-3"
              onClick={() => { setForm(EMPTY); setSuccess(false); }}>
              Post Another Job
            </button>
            <button className="btn btn-primary rounded-pill btn-sm px-3"
              onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">
          <i className="fa-solid fa-pen-to-square text-primary me-2" />
          Post a Job
        </h4>
        <p className="text-muted mb-0 small">
          Describe what you need done. Qualified artisans will bid and you pick the best offer.
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Title */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Job Title <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="e.g. Fix leaking kitchen tap"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>

                {/* Skill Type */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Service Needed <span className="text-danger">*</span></label>
                  <select
                    className="form-select rounded-3"
                    value={form.skillType}
                    onChange={(e) => set('skillType', e.target.value)}
                    required
                  >
                    <option value="">— Select a category —</option>
                    {SKILL_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Job Description <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control rounded-3"
                    rows={4}
                    placeholder="Describe the work in detail — what needs fixing, any symptoms, materials you already have, etc."
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    maxLength={2000}
                    required
                  />
                  <div className="form-text">{form.description.length}/2000 characters</div>
                </div>

                <hr className="my-4" />

                {/* Location */}
                <h6 className="fw-semibold mb-3 text-muted text-uppercase" style={{ fontSize: 11, letterSpacing: 1 }}>Location</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Area / Estate</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. Westlands, Nairobi"
                      value={form.locationName}
                      onChange={(e) => set('locationName', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Street / Building Address</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. 14 Muthangari Drive"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                    />
                  </div>
                </div>

                <hr className="my-4" />

                {/* Budget & Duration */}
                <h6 className="fw-semibold mb-3 text-muted text-uppercase" style={{ fontSize: 11, letterSpacing: 1 }}>Budget & Timing</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Min Budget (KES)</label>
                    <input
                      type="number"
                      className="form-control rounded-3"
                      placeholder="e.g. 1500"
                      min={0}
                      value={form.budgetMin}
                      onChange={(e) => set('budgetMin', e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Max Budget (KES)</label>
                    <input
                      type="number"
                      className="form-control rounded-3"
                      placeholder="e.g. 5000"
                      min={0}
                      value={form.budgetMax}
                      onChange={(e) => set('budgetMax', e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Est. Duration (hrs)</label>
                    <input
                      type="number"
                      className="form-control rounded-3"
                      placeholder="e.g. 2"
                      min={1}
                      max={72}
                      value={form.estimatedDurationHours}
                      onChange={(e) => set('estimatedDurationHours', e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Preferred Time</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="e.g. Weekdays after 5pm, or Sat morning"
                    value={form.preferredTime}
                    onChange={(e) => set('preferredTime', e.target.value)}
                  />
                </div>

                <hr className="my-4" />

                {/* Options */}
                <h6 className="fw-semibold mb-3 text-muted text-uppercase" style={{ fontSize: 11, letterSpacing: 1 }}>Options</h6>
                <div className="d-flex flex-column gap-2 mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="allowBidding"
                      checked={form.allowBidding}
                      onChange={(e) => set('allowBidding', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="allowBidding">
                      Allow artisans to bid with their own price
                      <span className="text-muted ms-1 small">(recommended)</span>
                    </label>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isUrgent"
                      checked={form.isUrgent}
                      onChange={(e) => set('isUrgent', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="isUrgent">
                      <span className="text-danger fw-semibold">Mark as urgent</span>
                      <span className="text-muted ms-1 small">— highlighted to artisans</span>
                    </label>
                  </div>
                </div>

                <div className="d-flex gap-2 justify-content-end">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4"
                    onClick={() => router.back()} disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={loading}>
                    {loading
                      ? <><span className="spinner-border spinner-border-sm me-2" />Posting...</>
                      : <><i className="fa-solid fa-paper-plane me-2" />Post Job</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
