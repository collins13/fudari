'use client';
import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { squareImageDataUrl, galleryImageDataUrl } from '@/lib/image';
import { SKILL_OPTIONS as CATEGORIES, KENYA_COUNTIES, KENYA_MAJOR_TOWNS } from '@/lib/kenya';

/** Mirrors PortfolioImages.MAX_IMAGES on the backend. */
const MAX_PORTFOLIO_PHOTOS = 8;

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  skillType: string;
  experienceYears: string;
  locationName: string;
  county: string;
  town: string;
  area: string;
  serviceRadiusKm: string;
  hourlyRate: string;
  profileImage: string;
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    skillType: '',
    experienceYears: '',
    locationName: '',
    county: '',
    town: '',
    area: '',
    serviceRadiusKm: '',
    hourlyRate: '',
    profileImage: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [portfolio, setPortfolio] = useState<string[]>([]);

  useEffect(() => {
    authAPI.getCurrentUser()
      .then((res) => {
        const u = res.data;
        const skill = u.skills?.[0];
        setRole(u.role || '');
        setPortfolio(Array.isArray(u.portfolioImages) ? u.portfolioImages : []);
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          phone: u.phoneNumber || '',
          bio: skill?.description || '',
          skillType: skill?.skillType || '',
          experienceYears: skill?.experienceYears?.toString() || '',
          locationName: u.locationName || '',
          county: u.county || '',
          town: u.town || '',
          area: u.area || '',
          serviceRadiusKm: u.serviceRadiusKm ? String(u.serviceRadiusKm) : '',
          hourlyRate: skill?.hourlyRate || '',
          profileImage: u.profileImage || '',
        });
      })
      .catch(() => {
        // fallback to localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          setRole(u.role || '');
          setForm((prev) => ({
            ...prev,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phone: u.phoneNumber || u.phone || '',
          }));
        }
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }
    try {
      const dataUrl = await squareImageDataUrl(file);
      setForm((prev) => ({ ...prev, profileImage: dataUrl }));
    } catch {
      setError('Could not read that image. Try a JPG or PNG.');
    }
  };

  const handlePortfolioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const room = MAX_PORTFOLIO_PHOTOS - portfolio.length;
    if (room <= 0) {
      setError(`You can show up to ${MAX_PORTFOLIO_PHOTOS} work photos. Remove one first.`);
      return;
    }

    setError('');
    try {
      const added = await Promise.all(files.slice(0, room).map((file) => galleryImageDataUrl(file)));
      setPortfolio((prev) => [...prev, ...added]);
      if (files.length > room) {
        setError(`Only the first ${room} photo(s) were added — the limit is ${MAX_PORTFOLIO_PHOTOS}.`);
      }
    } catch {
      setError('Could not read one of those images. Try JPG or PNG files.');
    }
  };

  const removePortfolioPhoto = (index: number) => {
    setPortfolio((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        locationName: form.locationName || undefined,
        county: form.county || undefined,
        town: form.town || undefined,
        area: form.area || undefined,
        serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
      };
      if (form.profileImage) payload.profileImage = form.profileImage;
      if (role === 'WORKER') {
        payload.portfolioImages = portfolio;
      }
      if (role === 'WORKER' && form.skillType) {
        payload.skillType = form.skillType;
        if (form.bio) payload.bio = form.bio;
        if (form.experienceYears) payload.experienceYears = form.experienceYears;
        if (form.hourlyRate) payload.hourlyRate = form.hourlyRate;
      }
      const res = await authAPI.updateFullProfile(payload);
      // update localStorage user
      const stored = localStorage.getItem('user');
      const stored_user = stored ? JSON.parse(stored) : {};
      localStorage.setItem('user', JSON.stringify({ ...stored_user, ...res.data }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayInitials =
    (form.firstName?.[0] || '') + (form.lastName?.[0] || '') || 'A';

  const completionFields = [
    form.firstName,
    form.lastName,
    form.phone,
    form.bio,
    form.skillType,
    form.experienceYears,
    form.locationName,
    form.hourlyRate,
  ];
  const completion = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100
  );

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Edit Profile</h4>
        <p className="text-muted mb-0">Keep your profile updated to attract more customers</p>
      </div>

      {saved && (
        <div className="alert alert-success alert-dismissible d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="fa-solid fa-circle-check"></i>
          <span>Profile saved successfully!</span>
          <button type="button" className="btn-close ms-auto" onClick={() => setSaved(false)}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{error}</span>
          <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          {/* Profile Photo Card */}
          <div className="card border-0 shadow-sm text-center mb-4">
            <div className="card-body py-4">
              {form.profileImage ? (
                <img
                  src={form.profileImage}
                  alt="Profile"
                  className="rounded-circle mx-auto mb-3 d-block object-fit-cover"
                  style={{ width: 96, height: 96 }}
                />
              ) : (
                <div
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto mb-3 text-white fw-bold"
                  style={{ width: 96, height: 96, fontSize: 32 }}
                >
                  {displayInitials}
                </div>
              )}
              <h6 className="fw-bold mb-1">
                {form.firstName} {form.lastName}
              </h6>
              <p className="text-muted small mb-3">
                {CATEGORIES.find((c) => c.value === form.skillType)?.label || 'Artisan'}
              </p>
              <label className="btn btn-outline-primary btn-sm rounded-5">
                <i className="fa-solid fa-camera me-2"></i>Upload Photo
                <input type="file" accept="image/*" className="d-none" onChange={handlePhotoChange} />
              </label>
              <p className="text-muted mt-2 mb-0" style={{ fontSize: 11 }}>
                JPG or PNG, max 2MB
              </p>
            </div>
          </div>

          {/* Completion Card */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">Profile Completion</h6>
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-muted">Progress</span>
                <span className="text-primary fw-medium">{completion}%</span>
              </div>
              <div className="progress mb-3" style={{ height: 8 }}>
                <div
                  className={`progress-bar ${completion >= 80 ? 'bg-success' : completion >= 50 ? 'bg-primary' : 'bg-warning'}`}
                  style={{ width: `${completion}%` }}
                ></div>
              </div>
              {completion < 100 && (
                <p className="text-muted small mb-0">
                  <i className="fa-solid fa-circle-info me-1 text-primary"></i>
                  Complete your profile to appear higher in search results.
                </p>
              )}
              {completion === 100 && (
                <p className="text-success small mb-0">
                  <i className="fa-solid fa-circle-check me-1"></i>
                  Your profile is 100% complete!
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <form onSubmit={handleSubmit}>
            {/* Personal Info */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="fa-solid fa-user me-2 text-primary"></i>Personal Information
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="firstName" className="form-label fw-medium">
                      First Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      className="form-control"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="lastName" className="form-label fw-medium">
                      Last Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      className="form-control"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email Address</label>
                    <input
                      type="email"
                      className="form-control bg-light"
                      value={form.email}
                      readOnly
                      placeholder="Not set"
                    />
                    <div className="form-text">Email cannot be changed here.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Phone Number (M-Pesa)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="fa-solid fa-mobile-screen text-muted"></i>
                      </span>
                      <input
                        type="tel"
                        className="form-control bg-light"
                        value={form.phone}
                        readOnly
                      />
                    </div>
                    <div className="form-text">Phone number cannot be changed here.</div>
                  </div>
                  {role === 'WORKER' && (
                    <div className="col-12">
                      <label htmlFor="bio" className="form-label fw-medium">
                        Bio / About Me
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        className="form-control"
                        rows={4}
                        placeholder="Tell customers about yourself, your experience, and why they should hire you..."
                        value={form.bio}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Info (Workers only) */}
            {role === 'WORKER' && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h6 className="mb-0 fw-semibold">
                    <i className="fa-solid fa-briefcase me-2 text-primary"></i>Professional Details
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="skillType" className="form-label fw-medium">
                        Category / Skill
                      </label>
                      <select
                        id="skillType"
                        name="skillType"
                        className="form-select"
                        value={form.skillType}
                        onChange={handleChange}
                      >
                        <option value="">Select your trade</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="experienceYears" className="form-label fw-medium">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        id="experienceYears"
                        name="experienceYears"
                        className="form-control"
                        placeholder="e.g. 5"
                        min="0"
                        max="50"
                        value={form.experienceYears}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="locationName" className="form-label fw-medium">
                        Location / Service Area
                      </label>
                      <input
                        type="text"
                        id="locationName"
                        name="locationName"
                        className="form-control"
                        placeholder="e.g. Nairobi, Westlands"
                        value={form.locationName}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="county" className="form-label fw-medium">
                        County
                      </label>
                      <select
                        id="county"
                        name="county"
                        className="form-select"
                        value={form.county}
                        onChange={handleChange}
                      >
                        <option value="">Select county...</option>
                        {KENYA_COUNTIES.map((county) => (
                          <option key={county} value={county}>{county}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="town" className="form-label fw-medium">
                        Town / City
                      </label>
                      <input
                        type="text"
                        id="town"
                        name="town"
                        className="form-control"
                        list="ke-towns"
                        placeholder="e.g. Thika"
                        value={form.town}
                        onChange={handleChange}
                      />
                      <datalist id="ke-towns">
                        {KENYA_MAJOR_TOWNS.map((town) => <option key={town} value={town} />)}
                      </datalist>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="area" className="form-label fw-medium">
                        Estate / Area
                      </label>
                      <input
                        type="text"
                        id="area"
                        name="area"
                        className="form-control"
                        placeholder="e.g. Westlands"
                        value={form.area}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="serviceRadiusKm" className="form-label fw-medium">
                        Service Radius (km)
                      </label>
                      <input
                        type="number"
                        id="serviceRadiusKm"
                        name="serviceRadiusKm"
                        className="form-control"
                        min="1"
                        max="200"
                        placeholder="15"
                        value={form.serviceRadiusKm}
                        onChange={handleChange}
                      />
                      <div className="form-text">How far you will travel for a job.</div>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="hourlyRate" className="form-label fw-medium">
                        Starting Price (KES)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">KES</span>
                        <input
                          type="number"
                          id="hourlyRate"
                          name="hourlyRate"
                          className="form-control"
                          placeholder="500"
                          min="0"
                          value={form.hourlyRate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Work Photos (Workers) */}
            {role === 'WORKER' && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-semibold">
                    <i className="fa-solid fa-images me-2 text-primary"></i>Work Photos
                  </h6>
                  <span className="text-muted small">{portfolio.length}/{MAX_PORTFOLIO_PHOTOS}</span>
                </div>
                <div className="card-body">
                  <p className="text-muted small">
                    Photos of jobs you have completed. These appear in the Portfolio section of your
                    public profile and are the first thing customers look at.
                  </p>

                  {portfolio.length > 0 ? (
                    <div className="row g-3 mb-3">
                      {portfolio.map((src, i) => (
                        <div key={i} className="col-6 col-md-4">
                          <div className="position-relative rounded-3 overflow-hidden border">
                            <img
                              src={src}
                              alt={`Work photo ${i + 1}`}
                              className="w-100 object-fit-cover d-block"
                              style={{ height: 120 }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-danger rounded-circle position-absolute top-0 end-0 m-1 d-flex align-items-center justify-content-center"
                              style={{ width: 28, height: 28 }}
                              aria-label={`Remove work photo ${i + 1}`}
                              onClick={() => removePortfolioPhoto(i)}
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center border rounded-3 py-4 mb-3">
                      <i className="fa-solid fa-camera text-muted fs-3 mb-2 d-block"></i>
                      <p className="text-muted small mb-0">
                        No work photos yet. Profiles with photos get noticeably more bookings.
                      </p>
                    </div>
                  )}

                  <label className={`btn btn-outline-primary btn-sm rounded-5 ${portfolio.length >= MAX_PORTFOLIO_PHOTOS ? 'disabled' : ''}`}>
                    <i className="fa-solid fa-plus me-2"></i>Add Photos
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="d-none"
                      disabled={portfolio.length >= MAX_PORTFOLIO_PHOTOS}
                      onChange={handlePortfolioChange}
                    />
                  </label>
                  <div className="form-text">
                    Up to {MAX_PORTFOLIO_PHOTOS} photos. They are resized automatically, then saved when
                    you press Save Changes.
                  </div>
                </div>
              </div>
            )}

            {/* Location (Clients) */}
            {role !== 'WORKER' && (              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h6 className="mb-0 fw-semibold">
                    <i className="fa-solid fa-location-dot me-2 text-primary"></i>Location
                  </h6>
                </div>
                <div className="card-body">
                  <div className="col-md-8">
                    <label htmlFor="locationName" className="form-label fw-medium">
                      Your Location
                    </label>
                    <input
                      type="text"
                      id="locationName"
                      name="locationName"
                      className="form-control"
                      placeholder="e.g. Nairobi, Westlands"
                      value={form.locationName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="d-flex gap-3">
              <button
                type="submit"
                className="btn btn-primary px-5 rounded-5 fw-medium"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                ) : (
                  <><i className="fa-solid fa-floppy-disk me-2"></i>Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
