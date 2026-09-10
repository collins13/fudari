'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

const PHONE_REGEX = /^(?:\+254|0)[17]\d{8}$/;
const NAME_REGEX = /^[A-Za-z\s'-]{2,50}$/;
const OTP_RESEND_SECONDS = 45;

type Step = 'phone' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [role, setRole] = useState<'CLIENT' | 'WORKER'>('WORKER');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [otp, setOtp] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  const sendCode = async () => {
    setError('');
    const stripped = phoneNumber.replace(/\s/g, '');
    if (!PHONE_REGEX.test(stripped)) {
      setError('Enter a valid Kenyan phone number, e.g. 0712345678.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the terms and conditions.');
      return;
    }

    setLoading(true);
    try {
      const newAccount = await requestOtp(stripped);
      setIsNewAccount(newAccount);
      setStep('otp');
      setResendIn(OTP_RESEND_SECONDS);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      setError(
        e?.response?.status === 429
          ? 'Too many requests. Please wait a minute and try again.'
          : e?.response?.data?.message || 'Could not send the code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from the SMS.');
      return;
    }
    if (isNewAccount && !NAME_REGEX.test(firstName.trim())) {
      setError('Enter your first name (letters only).');
      return;
    }

    setLoading(true);
    try {
      const user = await verifyOtp({
        phoneNumber: phoneNumber.replace(/\s/g, ''),
        otp,
        ...(isNewAccount && {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          ...(referralCode.trim() && { referralCode: referralCode.trim() }),
        }),
      });

      if (user.role === 'WORKER') router.push('/complete-profile');
      else router.push('/artisans');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Could not verify the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
                  Join FUDARI
                </div>
                <h1 className="display-6 fw-semibold mb-2">
                  {step === 'phone' ? (
                    <>Enter Your <span className="font-caveat text-primary">Number</span></>
                  ) : (
                    <>Check Your <span className="font-caveat text-primary">SMS</span></>
                  )}
                </h1>
                <p className="mb-0 text-muted">
                  {step === 'phone'
                    ? 'No password needed. We\u2019ll text you a 6-digit code.'
                    : `We sent a code to ${phoneNumber}.`}
                </p>
              </div>

              {error && (
                <div className="alert alert-danger rounded-4 mb-4" role="alert">
                  <i className="fa-solid fa-triangle-exclamation me-2"></i>{error}
                </div>
              )}

              {step === 'phone' ? (
                <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} noValidate>
                  <fieldset className="mb-4">
                    <legend className="form-label fw-medium mb-2">I want to join as</legend>
                    <div className="d-flex gap-2 p-1 bg-light rounded-4" role="radiogroup" aria-label="Account type">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={role === 'CLIENT'}
                        className={`btn flex-grow-1 rounded-3 fw-medium ${role === 'CLIENT' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setRole('CLIENT')}
                      >
                        <i className="fa-solid fa-user me-2"></i>Customer
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={role === 'WORKER'}
                        className={`btn flex-grow-1 rounded-3 fw-medium ${role === 'WORKER' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setRole('WORKER')}
                      >
                        <i className="fa-solid fa-wrench me-2"></i>Pro
                      </button>
                    </div>
                  </fieldset>

                  <div className="form-group mb-3">
                    <label htmlFor="phoneNumber" className="form-label required fw-medium">Phone Number</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      inputMode="numeric"
                      className="form-control form-control-lg"
                      required
                      placeholder="0712 345 678"
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setError(''); }}
                    />
                    <small className="text-muted">Safaricom or Airtel. This is how customers reach you.</small>
                  </div>

                  <div className="form-check mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={(e) => { setAgreeTerms(e.target.checked); setError(''); }}
                      required
                    />
                    <label className="form-check-label" htmlFor="agreeTerms">
                      I agree to the{' '}
                      <Link href="/terms" className="text-primary text-decoration-underline">terms of service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-primary text-decoration-underline">privacy policy</Link>
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg w-100 rounded-5" disabled={loading}>
                    {loading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Sending code...</>
                    ) : (
                      <><i className="fa-solid fa-comment-sms me-2"></i>Send me a code</>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); submitCode(); }} noValidate>
                  <div className="form-group mb-4">
                    <label htmlFor="otp" className="form-label required fw-medium">6-digit code</label>
                    <input
                      id="otp"
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="form-control form-control-lg text-center font-monospace fw-bold"
                      style={{ letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                    />
                  </div>

                  {isNewAccount && (
                    <>
                      <div className="row g-3">
                        <div className="col-sm-6">
                          <div className="form-group mb-3">
                            <label htmlFor="firstName" className="form-label required fw-medium">First Name</label>
                            <input
                              id="firstName"
                              type="text"
                              className="form-control"
                              required
                              placeholder="John"
                              autoComplete="given-name"
                              value={firstName}
                              onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                            />
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="form-group mb-3">
                            <label htmlFor="lastName" className="form-label fw-medium">Last Name</label>
                            <input
                              id="lastName"
                              type="text"
                              className="form-control"
                              placeholder="Kamau"
                              autoComplete="family-name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-group mb-4">
                        <label htmlFor="referralCode" className="form-label fw-medium">
                          Referral code <span className="text-muted fw-normal">(optional)</span>
                        </label>
                        <input
                          id="referralCode"
                          type="text"
                          className="form-control text-uppercase"
                          placeholder="e.g. TFX2K9"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        />
                      </div>
                    </>
                  )}

                  <button type="submit" className="btn btn-primary btn-lg w-100 rounded-5" disabled={loading}>
                    {loading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Verifying...</>
                    ) : (
                      <><i className="fa-solid fa-check me-2"></i>{isNewAccount ? 'Create my account' : 'Sign in'}</>
                    )}
                  </button>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-muted text-decoration-none"
                      onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                    >
                      <i className="fa-solid fa-arrow-left me-1"></i>Change number
                    </button>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none"
                      disabled={resendIn > 0 || loading}
                      onClick={sendCode}
                    >
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center mt-4">
                Prefer a password?{' '}
                <Link href="/login" className="fw-medium text-primary text-decoration-underline">
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          {/* Image Column */}
          <div className="col-xl-6 d-none d-xl-block">
            <div
              className="background-image bg-light d-flex flex-column h-100 justify-content-center p-5 rounded-4"
              style={{ backgroundImage: 'url(/liston/images/header/lg-01.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,92,99,0.88)', borderRadius: 'inherit' }}></div>
              <div className="position-relative text-white text-center py-5">
                <div className="font-caveat fs-1 mb-3">Kenya&apos;s #1 Services Marketplace</div>
                <h2 className="fw-bold display-5 mb-4">
                  {role === 'WORKER' ? 'Grow Your Business' : 'Find Someone You Can Trust'}
                </h2>
                <div className="row g-4 justify-content-center">
                  {(role === 'WORKER' ? [
                    { icon: 'fa-users', label: 'Reach More Customers' },
                    { icon: 'fa-chart-line', label: 'Grow Your Income' },
                    { icon: 'fa-star', label: 'Build Your Reputation' },
                    { icon: 'fa-shield-halved', label: 'Verified Profile' },
                  ] : [
                    { icon: 'fa-search', label: 'Search Services' },
                    { icon: 'fa-phone', label: 'Contact Directly' },
                    { icon: 'fa-star', label: 'Read Reviews' },
                    { icon: 'fa-shield-halved', label: 'Verified Pros' },
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
