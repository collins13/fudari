'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, workersAPI, aiAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
  { label: 'Electrician', value: 'ELECTRICIAN', icon: 'fa-bolt' },
  { label: 'Plumber', value: 'PLUMBER', icon: 'fa-faucet' },
  { label: 'Mechanic', value: 'MECHANIC', icon: 'fa-car' },
  { label: 'Painter', value: 'PAINTER', icon: 'fa-paint-roller' },
  { label: 'Carpenter', value: 'CARPENTER', icon: 'fa-hammer' },
  { label: 'HVAC Technician', value: 'HVAC_TECHNICIAN', icon: 'fa-wind' },
  { label: 'Welder', value: 'WELDER', icon: 'fa-fire' },
  { label: 'Mason', value: 'MASON', icon: 'fa-building' },
  { label: 'Cleaner', value: 'CLEANER', icon: 'fa-broom' },
  { label: 'Gardener', value: 'GARDENER', icon: 'fa-leaf' },
  { label: 'Other', value: 'OTHER', icon: 'fa-wrench' },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    skillType: '',
    experienceYears: '',
    hourlyRate: '',
    locationName: '',
    bio: '',
    profileImage: '',
  });

  // AI classifier state
  const [aiWorkDesc, setAiWorkDesc] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  // Location detection state
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!user) return;
    // If user already has a profile, skip to dashboard
    if (user.role === 'WORKER' && user.vettingLevel !== 'STANDARD') {
      router.push('/dashboard');
    }
  }, [user]);

  const handleAiClassify = async () => {
    if (!aiWorkDesc.trim()) return;
    setAiLoading(true);
    setAiSuggested(false);
    try {
      const res = await aiAPI.enhanceDescription({ description: aiWorkDesc });
      const data = res.data as { skillType?: string; enhancedDescription?: string; suggestedSkillType?: string };
      // Map returned skill type to our CATEGORIES values (case-insensitive match)
      const suggested = (data.skillType || data.suggestedSkillType || '').toUpperCase().replace(/\s+/g, '_');
      const matched = CATEGORIES.find(
        (c) => c.value === suggested || suggested.includes(c.value) || c.value.includes(suggested)
      );
      if (matched) setForm((prev) => ({ ...prev, skillType: matched.value }));
      if (data.enhancedDescription) setForm((prev) => ({ ...prev, bio: data.enhancedDescription as string }));
      // Try to get a price estimate if skill was matched
      if (matched) {
        try {
          const priceRes = await aiAPI.estimatePrice(matched.value);
          const priceData = priceRes.data as { median?: number; min?: number };
          const suggested = priceData.median ?? priceData.min;
          if (suggested) setForm((prev) => ({ ...prev, hourlyRate: String(suggested) }));
        } catch {
          // ignore price error
        }
      }
      setAiSuggested(true);
    } catch {
      // silently fail — user can still pick manually
    } finally {
      setAiLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const name =
            addr.suburb || addr.neighbourhood || addr.city_district ||
            addr.town || addr.city || addr.county || data.display_name;
          if (name) setForm((prev) => ({ ...prev, locationName: name }));
        } catch {
          // fallback: leave blank
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, profileImage: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && !form.skillType) {
      setError('Please select your service category.');
      return;
    }
    if (step === 2 && !form.locationName) {
      setError('Please enter your service area.');
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    try {
      // Save profile
      await authAPI.updateFullProfile({
        locationName: form.locationName || undefined,
        profileImage: form.profileImage || undefined,
      });

      // Add skill if selected
      if (form.skillType && user?.userId) {
        try {
          await workersAPI.addSkill(user.userId, {
            skillType: form.skillType,
            description: form.bio || undefined,
            experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
            hourlyRate: form.hourlyRate || undefined,
          });
        } catch {
          // Skill might already exist, that's OK
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const isWorker = user?.role === 'WORKER';

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5">
      <div className="card border-0 shadow-sm rounded-4" style={{ maxWidth: 560, width: '100%' }}>
        <div className="card-body p-4 p-lg-5">
          {/* Progress */}
          {isWorker && (
            <div className="d-flex gap-2 mb-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex-grow-1 rounded-pill" style={{
                  height: 4,
                  background: s <= step ? '#F84525' : '#e9ecef',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}

          {error && (
            <div className="alert alert-danger small py-2 rounded-3">
              <i className="fa-solid fa-triangle-exclamation me-2"></i>{error}
            </div>
          )}

          {/* Step 1: Service Category (workers only) */}
          {step === 1 && isWorker && (
            <>
              <h4 className="fw-bold mb-1">What service do you offer?</h4>
              <p className="text-muted mb-4">Select your primary skill category</p>

              {/* AI Classifier */}
              <div className="mb-4 p-3 rounded-3 border" style={{ background: '#f8f9ff' }}>
                <label className="form-label fw-medium small">
                  <i className="fa-solid fa-wand-magic-sparkles me-2 text-primary"></i>
                  Describe your work and let AI pick your category
                </label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. I fix electrical wiring and install sockets in homes..."
                    value={aiWorkDesc}
                    onChange={(e) => { setAiWorkDesc(e.target.value); setAiSuggested(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiClassify()}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-3 text-nowrap"
                    onClick={handleAiClassify}
                    disabled={aiLoading || !aiWorkDesc.trim()}
                  >
                    {aiLoading
                      ? <span className="spinner-border spinner-border-sm"></span>
                      : <><i className="fa-solid fa-bolt me-1"></i>Suggest</>}
                  </button>
                </div>
                {aiSuggested && (
                  <div className="mt-2 small text-success">
                    <i className="fa-solid fa-circle-check me-1"></i>
                    Category, bio, and rate pre-filled below — adjust as needed.
                  </div>
                )}
              </div>

              <div className="row g-2">
                {CATEGORIES.map((cat) => (
                  <div key={cat.value} className="col-6 col-md-4">
                    <button
                      type="button"
                      className={`btn w-100 p-3 rounded-3 text-start d-flex align-items-center gap-2 ${
                        form.skillType === cat.value
                          ? 'btn-primary text-white'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => setForm({ ...form, skillType: cat.value })}
                    >
                      <i className={`fa-solid ${cat.icon}`}></i>
                      <span className="small fw-medium">{cat.label}</span>
                    </button>
                  </div>
                ))}
              </div>
              {form.skillType && (
                <div className="row g-3 mt-3">
                  <div className="col-6">
                    <label className="form-label fw-medium small">Years of Experience</label>
                    <input type="number" className="form-control" placeholder="e.g. 5" min="0"
                      value={form.experienceYears}
                      onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Hourly Rate (KES)</label>
                    <input type="number" className="form-control" placeholder="e.g. 500" min="0"
                      value={form.hourlyRate}
                      onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 1 for clients */}
          {step === 1 && !isWorker && (
            <>
              <h4 className="fw-bold mb-1">Welcome to TUFIXIT!</h4>
              <p className="text-muted mb-4">Let&apos;s set up your account</p>
              <div className="mb-3">
                <label className="form-label fw-medium">Your Location</label>
                <input type="text" className="form-control form-control-lg" placeholder="e.g. Nairobi, Westlands"
                  value={form.locationName}
                  onChange={(e) => setForm({ ...form, locationName: e.target.value })} />
              </div>
            </>
          )}

          {/* Step 2: Location */}
          {step === 2 && isWorker && (
            <>
              <h4 className="fw-bold mb-1">Where do you offer services?</h4>
              <p className="text-muted mb-4">This helps customers find you nearby</p>
              <div className="mb-3">
                <label className="form-label fw-medium">Service Area</label>
                <div className="input-group">
                  <input type="text" className="form-control form-control-lg" placeholder="e.g. Westlands, Nairobi"
                    value={form.locationName}
                    onChange={(e) => setForm({ ...form, locationName: e.target.value })} autoFocus />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    title="Detect my location"
                  >
                    {locating
                      ? <span className="spinner-border spinner-border-sm" role="status"></span>
                      : <i className="fa-solid fa-location-crosshairs"></i>}
                  </button>
                </div>
                <div className="form-text">
                  Enter your primary area of operation or{' '}
                  <button type="button" className="btn btn-link btn-sm p-0 text-primary fw-medium"
                    onClick={handleDetectLocation} disabled={locating}>
                    use my current location
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Bio */}
          {step === 3 && isWorker && (
            <>
              <h4 className="fw-bold mb-1">Tell customers about yourself</h4>
              <p className="text-muted mb-4">A short description of your experience and services</p>
              <textarea className="form-control form-control-lg" rows={5}
                placeholder="I am a professional electrician with 10 years of experience in residential and commercial wiring..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })} autoFocus />
            </>
          )}

          {/* Step 4: Profile Photo + Plan Summary */}
          {step === 4 && isWorker && (
            <>
              <h4 className="fw-bold mb-1">Add a profile photo</h4>
              <p className="text-muted mb-4">Customers trust artisans with a real photo</p>
              <div className="text-center">
                {form.profileImage ? (
                  <div className="mb-3">
                    <img src={form.profileImage} alt="Profile" className="rounded-circle border border-3"
                      style={{ width: 120, height: 120, objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center border border-3"
                      style={{ width: 120, height: 120 }}>
                      <i className="fa-solid fa-camera fs-3 text-muted"></i>
                    </div>
                  </div>
                )}
                <label className="btn btn-outline-primary rounded-5">
                  <i className="fa-solid fa-upload me-2"></i>Choose Photo
                  <input type="file" accept="image/*" className="d-none" onChange={handleImageChange} />
                </label>
                <p className="text-muted small mt-2">JPG or PNG, max 2MB</p>
              </div>

              {/* Onboarding Score + Subscription Summary */}
              {(() => {
                const checks = [
                  { label: 'Skill category selected', done: !!form.skillType, pts: 25 },
                  { label: 'Bio written', done: form.bio.trim().length > 20, pts: 20 },
                  { label: 'Location set', done: !!form.locationName, pts: 20 },
                  { label: 'Hourly rate added', done: !!form.hourlyRate, pts: 15 },
                  { label: 'Profile photo uploaded', done: !!form.profileImage, pts: 20 },
                ];
                const score = checks.filter((c) => c.done).reduce((sum, c) => sum + c.pts, 0);
                const scoreColor = score >= 80 ? '#198754' : score >= 60 ? '#fd7e14' : '#dc3545';
                return (
                  <div className="mt-4 p-3 rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold small">Profile Strength</span>
                      <span className="fw-bold" style={{ color: scoreColor }}>{score}%</span>
                    </div>
                    <div className="progress mb-3" style={{ height: 8, borderRadius: 4 }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${score}%`, backgroundColor: scoreColor, borderRadius: 4 }}
                        aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}
                      />
                    </div>
                    <ul className="list-unstyled small mb-0">
                      {checks.map((c) => (
                        <li key={c.label} className={c.done ? 'text-success' : 'text-muted'}>
                          <i className={`fa-solid ${c.done ? 'fa-circle-check' : 'fa-circle'} me-2`}></i>
                          {c.label}
                          {!c.done && <span className="ms-1 text-muted">(+{c.pts}%)</span>}
                        </li>
                      ))}
                    </ul>
                    <hr className="my-3" />
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold small">Your Plan</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Starting with <strong>Free</strong></div>
                      </div>
                      <span className="badge text-bg-dark px-3 py-2">Free</span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Client finish */}
          {!isWorker && step === 1 && (
            <div className="mt-4">
              <button className="btn btn-primary btn-lg w-100 rounded-5" onClick={handleFinish} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                <i className="fa-solid fa-check me-2"></i>Finish Setup
              </button>
            </div>
          )}

          {/* Navigation */}
          {isWorker && (
            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              {step > 1 ? (
                <button className="btn btn-outline-secondary rounded-5" onClick={handleBack}>
                  <i className="fa-solid fa-arrow-left me-2"></i>Back
                </button>
              ) : (
                <button className="btn btn-link text-muted" onClick={() => router.push('/dashboard')}>
                  Skip for now
                </button>
              )}
              {step < 4 ? (
                <button className="btn btn-primary rounded-5" onClick={handleNext}>
                  Next<i className="fa-solid fa-arrow-right ms-2"></i>
                </button>
              ) : (
                <button className="btn btn-primary rounded-5" onClick={handleFinish} disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  <i className="fa-solid fa-check me-2"></i>Finish
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
