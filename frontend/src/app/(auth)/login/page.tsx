'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'expired';
  const { login } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(emailOrPhone, password);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role === 'ADMIN' || user?.role === 'WORKER') {
        router.push('/dashboard');
      } else {
        router.push('/artisans');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5">
        <div className="row g-0 rounded-4 overflow-hidden shadow-sm" style={{ maxWidth: 900, width: '100%' }}>
          {/* Form Side */}
          <div className="col-md-6 bg-white p-4 p-lg-5 d-flex flex-column justify-content-center">
            <div className="mb-4">
              <h3 className="fw-bold mb-1">Welcome back</h3>
              <p className="text-muted mb-0">Sign in to your FUDARI account</p>
            </div>

            {sessionExpired && (
              <div className="alert alert-warning small py-2 rounded-3 mb-3">
                <i className="fa-solid fa-clock me-2"></i>Your session has expired. Please sign in again.
              </div>
            )}

            {error && (
              <div className="alert alert-danger small py-2 rounded-3 mb-3">
                <i className="fa-solid fa-circle-exclamation me-2"></i>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-medium small">Phone or Email</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="fa-solid fa-user text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    required
                    placeholder="+254 7XX XXX XXX"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label fw-medium small mb-0">Password</label>
                  <Link href="/forgot-password" className="text-primary small">Forgot?</Link>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="fa-solid fa-lock text-muted"></i>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0 ps-0"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fa-regular ${showPassword ? 'fa-eye' : 'fa-eye-slash'} text-muted`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 rounded-3 py-2 fw-medium"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="d-flex align-items-center gap-2 my-3">
              <hr className="flex-grow-1 m-0" />
              <span className="text-muted small">or</span>
              <hr className="flex-grow-1 m-0" />
            </div>

            <Link href="/register" className="btn btn-outline-primary w-100 rounded-3 py-2 fw-medium">
              <i className="fa-solid fa-comment-sms me-2"></i>Sign in with an SMS code
            </Link>

            <div className="text-center mt-4 pt-3 border-top">
              <span className="text-muted small">Don&apos;t have an account?</span>{' '}
              <Link href="/register" className="fw-semibold small">Create Account</Link>
            </div>
            <p className="text-center text-muted small mt-3 mb-0">
              By signing in you agree to our{' '}
              <Link href="/terms" className="text-decoration-underline">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-decoration-underline">Privacy Policy</Link>.
            </p>
          </div>

          {/* Info Side */}
          <div className="col-md-6 d-none d-md-flex flex-column justify-content-center p-4 p-lg-5 text-white position-relative"
            style={{ background: 'var(--tx-primary-gradient)' }}>
            <div className="position-relative">
              <div className="font-caveat fs-3 mb-2">Kenya&apos;s #1</div>
              <h3 className="fw-bold mb-3">Services Marketplace</h3>
              <p className="opacity-75 mb-4">
                Find trusted service providers or grow your business. Customers browse free.
              </p>
              <div className="row g-3 mb-4">
                {[
                  { icon: 'fa-search', label: 'Browse Providers' },
                  { icon: 'fa-phone', label: 'Contact Directly' },
                  { icon: 'fa-star', label: 'Verified Reviews' },
                  { icon: 'fa-shield-halved', label: 'Trusted Platform' },
                ].map((item, i) => (
                  <div key={i} className="col-6">
                    <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 rounded-3 p-2">
                      <i className={`fa-solid ${item.icon}`}></i>
                      <span className="small">{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="btn btn-light btn-sm rounded-3 fw-medium">
                <i className="fa-solid fa-user-plus me-2"></i>Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
