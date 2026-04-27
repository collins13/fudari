'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';

const PHONE_REGEX = /^(?:\+254|0)[17]\d{8}$/;
const NAME_REGEX = /^[A-Za-z\s'-]{2,50}$/;

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: 'Weak', color: '#dc3545', percent: 20 };
  if (score === 2) return { label: 'Fair', color: '#fd7e14', percent: 40 };
  if (score === 3) return { label: 'Good', color: '#ffc107', percent: 60 };
  if (score === 4) return { label: 'Strong', color: '#198754', percent: 80 };
  return { label: 'Very Strong', color: '#0d6efd', percent: 100 };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'WORKER' as 'CLIENT' | 'WORKER',
    agreeTerms: false,
    referralCode: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced real-time phone availability check
  useEffect(() => {
    const stripped = form.phoneNumber.replace(/\s/g, '');
    if (!PHONE_REGEX.test(stripped)) {
      setPhoneStatus('idle');
      return;
    }
    setPhoneStatus('checking');
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(async () => {
      try {
        const res = await authAPI.checkPhone(stripped);
        setPhoneStatus(res.data.available ? 'available' : 'taken');
      } catch {
        setPhoneStatus('idle');
      }
    }, 500);
    return () => {
      if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    };
  }, [form.phoneNumber]);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const errors: Record<string, string> = {};

    switch (field) {
      case 'firstName':
        if (form.firstName && !NAME_REGEX.test(form.firstName.trim())) {
          errors.firstName = 'Enter a valid first name (letters only, 2-50 characters).';
        }
        break;
      case 'lastName':
        if (form.lastName && !NAME_REGEX.test(form.lastName.trim())) {
          errors.lastName = 'Enter a valid last name (letters only, 2-50 characters).';
        }
        break;
      case 'phoneNumber':
        if (form.phoneNumber && !PHONE_REGEX.test(form.phoneNumber.replace(/\s/g, ''))) {
          errors.phoneNumber = 'Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).';
        }
        break;
      case 'email':
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          errors.email = 'Enter a valid email address.';
        }
        break;
      case 'password':
        if (form.password && form.password.length < 8) {
          errors.password = 'Password must be at least 8 characters.';
        }
        break;
      case 'confirmPassword':
        if (form.confirmPassword && form.password !== form.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match.';
        }
        break;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (errors[field]) {
        next[field] = errors[field];
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.firstName.trim() || !NAME_REGEX.test(form.firstName.trim())) {
      errors.firstName = 'Enter a valid first name (letters only, 2-50 characters).';
    }
    if (!form.lastName.trim() || !NAME_REGEX.test(form.lastName.trim())) {
      errors.lastName = 'Enter a valid last name (letters only, 2-50 characters).';
    }
    if (!form.phoneNumber || !PHONE_REGEX.test(form.phoneNumber.replace(/\s/g, ''))) {
      errors.phoneNumber = 'Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    if (!form.agreeTerms) {
      errors.agreeTerms = 'Please accept the terms and conditions.';
    }

    setFieldErrors(errors);
    setTouched({ firstName: true, lastName: true, phoneNumber: true, email: true, password: true, confirmPassword: true, agreeTerms: true });
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAll()) return;
    if (phoneStatus === 'taken') {
      setError('This phone number is already registered. Please sign in instead.');
      return;
    }

    if (!validateAll()) return;

    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.replace(/\s/g, ''),
        password: form.password,
        role: form.role,
        ...(form.referralCode.trim() && { referralCode: form.referralCode.trim().toUpperCase() }),
      });

      // Workers go to complete-profile, clients go to browse artisans
      if (form.role === 'WORKER') {
        router.push('/complete-profile');
      } else {
        router.push('/artisans');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (field: string) =>
    `form-control${touched[field] && fieldErrors[field] ? ' is-invalid' : touched[field] && !fieldErrors[field] && form[field as keyof typeof form] ? ' is-valid' : ''}`;

  return (
    <>
      <Navbar />
      <div className="p-3 p-sm-4 p-md-5">
        <div className="row g-4 g-xl-5 justify-content-between">
          {/* Form Column */}
          <div className="col-xl-5">
            <div className="authentication-wrap overflow-hidden position-relative my-4">
              <div className="mb-4">
                <div className="d-inline-block font-caveat fs-1 fw-medium text-primary mb-2">
                  Join TUFIXIT
                </div>
                <h2 className="display-6 fw-semibold mb-2">
                  Create Your <span className="font-caveat text-primary">Account</span>
                </h2>
                <p className="mb-0 text-muted">
                  {form.role === 'WORKER'
                    ? 'Register as an artisan to reach thousands of customers across Kenya.'
                    : 'Create an account to find trusted service providers near you.'}
                </p>
              </div>

              {error && (
                <div className="alert alert-danger rounded-4 mb-4" role="alert">
                  <i className="fa-solid fa-triangle-exclamation me-2"></i>{error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Role Toggle */}
                <fieldset className="mb-4">
                  <legend className="form-label fw-medium mb-2">I want to register as</legend>
                  <div className="d-flex gap-2 p-1 bg-light rounded-4" role="radiogroup" aria-label="Account type">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.role === 'CLIENT'}
                      className={`btn flex-grow-1 rounded-3 fw-medium ${form.role === 'CLIENT' ? 'btn-primary' : 'btn-light'}`}
                      onClick={() => setForm((prev) => ({ ...prev, role: 'CLIENT' }))}
                    >
                      <i className="fa-solid fa-user me-2"></i>Customer
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.role === 'WORKER'}
                      className={`btn flex-grow-1 rounded-3 fw-medium ${form.role === 'WORKER' ? 'btn-primary' : 'btn-light'}`}
                      onClick={() => setForm((prev) => ({ ...prev, role: 'WORKER' }))}
                    >
                      <i className="fa-solid fa-wrench me-2"></i>Artisan / Service Provider
                    </button>
                  </div>
                </fieldset>

                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="firstName" className="form-label required fw-medium">First Name</label>
                      <input
                        id="firstName"
                        type="text"
                        className={fieldClass('firstName')}
                        required
                        placeholder="John"
                        autoComplete="given-name"
                        aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                        value={form.firstName}
                        onChange={handleChange('firstName')}
                        onBlur={handleBlur('firstName')}
                      />
                      {touched.firstName && fieldErrors.firstName && (
                        <div className="invalid-feedback" id="firstName-error">{fieldErrors.firstName}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="lastName" className="form-label required fw-medium">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        className={fieldClass('lastName')}
                        required
                        placeholder="Kamau"
                        autoComplete="family-name"
                        aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                        value={form.lastName}
                        onChange={handleChange('lastName')}
                        onBlur={handleBlur('lastName')}
                      />
                      {touched.lastName && fieldErrors.lastName && (
                        <div className="invalid-feedback" id="lastName-error">{fieldErrors.lastName}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="phoneNumber" className="form-label required fw-medium">Phone Number</label>
                  <div className="input-group">
                    <input
                      id="phoneNumber"
                      type="tel"
                      className={fieldClass('phoneNumber')}
                      required
                      placeholder="0712 345 678"
                      autoComplete="tel"
                      aria-describedby={fieldErrors.phoneNumber ? 'phone-error' : 'phone-hint'}
                      value={form.phoneNumber}
                      onChange={handleChange('phoneNumber')}
                      onBlur={handleBlur('phoneNumber')}
                    />
                    {phoneStatus === 'checking' && (
                      <span className="input-group-text bg-white">
                        <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-label="Checking..."></span>
                      </span>
                    )}
                    {phoneStatus === 'available' && (
                      <span className="input-group-text bg-white text-success fw-medium">
                        <i className="fa-solid fa-circle-check me-1"></i>Available
                      </span>
                    )}
                    {phoneStatus === 'taken' && (
                      <span className="input-group-text bg-white text-danger fw-medium">
                        <i className="fa-solid fa-circle-xmark me-1"></i>Registered
                      </span>
                    )}
                    {touched.phoneNumber && fieldErrors.phoneNumber && (
                      <div className="invalid-feedback" id="phone-error">{fieldErrors.phoneNumber}</div>
                    )}
                  </div>
                  {phoneStatus === 'taken' ? (
                    <div className="form-text text-danger">
                      This number already has an account.{' '}
                      <Link href="/login" className="fw-medium">Sign in instead</Link>
                    </div>
                  ) : (
                    <div className="form-text" id="phone-hint">
                      {form.role === 'WORKER'
                        ? 'Used for M-Pesa payments and customer contact.'
                        : 'Kenyan number starting with 07 or 01.'}
                    </div>
                  )}
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="email" className="form-label fw-medium">Email (optional)</label>
                  <input
                    id="email"
                    type="email"
                    className={fieldClass('email')}
                    placeholder="john@example.com"
                    autoComplete="email"
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    value={form.email}
                    onChange={handleChange('email')}
                    onBlur={handleBlur('email')}
                  />
                  {touched.email && fieldErrors.email && (
                    <div className="invalid-feedback" id="email-error">{fieldErrors.email}</div>
                  )}
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="referralCode" className="form-label fw-medium">
                    Referral Code <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <input
                    id="referralCode"
                    type="text"
                    className="form-control"
                    placeholder="e.g. TFX-A1B2C3"
                    autoComplete="off"
                    maxLength={10}
                    value={form.referralCode}
                    onChange={handleChange('referralCode')}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <div className="form-text">
                    Got a code from a friend? Enter it here — they&apos;ll get 1 month free BASIC plan.
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="password" className="form-label required fw-medium">Password</label>
                  <div className="input-group">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={fieldClass('password')}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      aria-describedby={fieldErrors.password ? 'password-error' : 'password-strength'}
                      value={form.password}
                      onChange={handleChange('password')}
                      onBlur={handleBlur('password')}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                    {touched.password && fieldErrors.password && (
                      <div className="invalid-feedback" id="password-error">{fieldErrors.password}</div>
                    )}
                  </div>
                  {form.password && (
                    <div className="mt-2" id="password-strength">
                      <div className="progress" style={{ height: 4 }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }}
                          aria-valuenow={passwordStrength.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Password strength: ${passwordStrength.label}`}
                        />
                      </div>
                      <small style={{ color: passwordStrength.color }} className="fw-medium">
                        {passwordStrength.label}
                      </small>
                    </div>
                  )}
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="confirmPassword" className="form-label required fw-medium">Confirm Password</label>
                  <div className="input-group">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={fieldClass('confirmPassword')}
                      required
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
                      value={form.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                    {touched.confirmPassword && fieldErrors.confirmPassword && (
                      <div className="invalid-feedback" id="confirm-error">{fieldErrors.confirmPassword}</div>
                    )}
                  </div>
                </div>

                <div className="form-check mb-4">
                  <input
                    className={`form-check-input${touched.agreeTerms && fieldErrors.agreeTerms ? ' is-invalid' : ''}`}
                    type="checkbox"
                    id="agreeTerms"
                    checked={form.agreeTerms}
                    onChange={handleChange('agreeTerms')}
                    required
                  />
                  <label className="form-check-label" htmlFor="agreeTerms">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary text-decoration-underline">terms of service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-primary text-decoration-underline">privacy policy</Link>
                  </label>
                  {touched.agreeTerms && fieldErrors.agreeTerms && (
                    <div className="invalid-feedback">{fieldErrors.agreeTerms}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 rounded-5"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Creating Account...</>
                  ) : (
                    <><i className="fa-solid fa-user-plus me-2"></i>Create Account</>
                  )}
                </button>

                <div className="text-center mt-4">
                  Already have an account?{' '}
                  <Link href="/login" className="fw-medium text-primary text-decoration-underline">
                    Sign In
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Image Column */}
          <div className="col-xl-6 d-none d-xl-block">
            <div
              className="background-image bg-light d-flex flex-column h-100 justify-content-center p-5 rounded-4"
              style={{ backgroundImage: 'url(/liston/images/header/lg-01.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(248,69,37,0.85)', borderRadius: 'inherit' }}></div>
              <div className="position-relative text-white text-center py-5">
                <div className="font-caveat fs-1 mb-3">Kenya&apos;s #1 Jua Kali Marketplace</div>
                <h2 className="fw-bold display-5 mb-4">
                  {form.role === 'WORKER' ? 'Grow Your Business' : 'Find Trusted Service Providers'}
                </h2>
                <div className="row g-4 justify-content-center">
                  {(form.role === 'WORKER' ? [
                    { icon: 'fa-users', label: 'Reach More Customers' },
                    { icon: 'fa-chart-line', label: 'Grow Your Income' },
                    { icon: 'fa-star', label: 'Build Your Reputation' },
                    { icon: 'fa-shield-halved', label: 'Verified Profile' },
                  ] : [
                    { icon: 'fa-search', label: 'Search Providers' },
                    { icon: 'fa-phone', label: 'Contact Directly' },
                    { icon: 'fa-star', label: 'Read Reviews' },
                    { icon: 'fa-shield-halved', label: 'Verified Artisans' },
                  ]).map((item, i) => (
                    <div key={i} className="col-6 text-center">
                      <div className="rounded-circle bg-white bg-opacity-25 d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 56, height: 56 }}>
                        <i className={`fa-solid ${item.icon} fs-4`}></i>
                      </div>
                      <div className="fw-medium">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
