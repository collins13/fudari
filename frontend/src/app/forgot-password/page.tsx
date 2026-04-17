'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { passwordAPI } from '@/lib/api';

type Step = 'phone' | 'otp' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const normalisePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
    if (digits.startsWith('254')) return `+${digits}`;
    return raw.trim();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phone = normalisePhone(phoneNumber);
    setLoading(true);
    try {
      await passwordAPI.forgotPassword({ phoneNumber: phone });
      setSuccess(`OTP sent to ${phone}. Check your SMS.`);
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send OTP. Check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await passwordAPI.resetPassword({
        phoneNumber: normalisePhone(phoneNumber),
        otp: otp.trim(),
        newPassword,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password. Check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5">
        <div className="card border-0 shadow-sm rounded-4 p-4 p-lg-5" style={{ maxWidth: 440, width: '100%' }}>

          {/* Step indicators */}
          <div className="d-flex align-items-center gap-2 mb-4">
            {(['phone', 'otp', 'done'] as Step[]).map((s, idx) => (
              <div key={s} className="d-flex align-items-center flex-fill">
                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center fw-bold ${step === s ? 'bg-primary text-white' : ['otp', 'done'].indexOf(step) > idx - 1 ? 'bg-success text-white' : 'bg-light text-muted border'}`}
                  style={{ width: 28, height: 28, fontSize: 12 }}>
                  {['otp', 'done'].indexOf(step) > idx - 1 && step !== s
                    ? <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i>
                    : idx + 1}
                </div>
                {idx < 2 && <div className={`flex-fill border-top border-2 mx-1 ${['otp', 'done'].indexOf(step) > idx - 1 ? 'border-success' : 'border-light'}`}></div>}
              </div>
            ))}
          </div>

          {step === 'phone' && (
            <>
              <h4 className="fw-bold mb-1">Forgot Password</h4>
              <p className="text-muted mb-4">Enter your phone number to receive a reset code via SMS.</p>

              {error && <div className="alert alert-danger small rounded-3 mb-3"><i className="fa-solid fa-circle-exclamation me-2"></i>{error}</div>}

              <form onSubmit={handleSendOtp}>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Phone Number <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="fa-solid fa-phone text-muted"></i></span>
                    <input type="tel" className="form-control" required
                      placeholder="+254 7XX XXX XXX"
                      value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 rounded-3 py-2 fw-medium" disabled={loading}>
                  {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</> : 'Send Reset Code'}
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h4 className="fw-bold mb-1">Enter Reset Code</h4>
              <p className="text-muted mb-1">{success}</p>
              <p className="text-muted small mb-4">
                Didn&apos;t receive it?{' '}
                <button className="btn btn-link p-0 text-primary small" onClick={() => { setStep('phone'); setError(''); setSuccess(''); }}>
                  Resend
                </button>
              </p>

              {error && <div className="alert alert-danger small rounded-3 mb-3"><i className="fa-solid fa-circle-exclamation me-2"></i>{error}</div>}

              <form onSubmit={handleResetPassword}>
                <div className="mb-3">
                  <label className="form-label fw-medium small">6-Digit OTP <span className="text-danger">*</span></label>
                  <input type="text" className="form-control form-control-lg text-center fw-bold font-monospace rounded-3"
                    required maxLength={6} placeholder="000000"
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">New Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input type={showPassword ? 'text' : 'password'} className="form-control border-end-0" required
                      minLength={8} placeholder="Minimum 8 characters"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <button type="button" className="input-group-text bg-light border-start-0" onClick={() => setShowPassword(!showPassword)}>
                      <i className={`fa-regular ${showPassword ? 'fa-eye' : 'fa-eye-slash'} text-muted`}></i>
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-medium small">Confirm New Password <span className="text-danger">*</span></label>
                  <input type={showPassword ? 'text' : 'password'} className="form-control rounded-3" required
                    placeholder="Repeat your new password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <small className="text-danger">Passwords do not match</small>
                  )}
                </div>
                <button type="submit" className="btn btn-primary w-100 rounded-3 py-2 fw-medium" disabled={loading}>
                  {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Resetting...</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-3">
              <i className="fa-solid fa-circle-check text-success mb-3" style={{ fontSize: 56 }}></i>
              <h4 className="fw-bold mb-2">Password Reset!</h4>
              <p className="text-muted mb-4">Your password has been changed successfully. You can now log in with your new password.</p>
              <button className="btn btn-primary w-100 rounded-3 py-2 fw-medium" onClick={() => router.push('/login')}>
                <i className="fa-solid fa-arrow-right-to-bracket me-2"></i>Go to Login
              </button>
            </div>
          )}

          <div className="text-center mt-4 pt-3 border-top">
            <Link href="/login" className="text-muted small">
              <i className="fa-solid fa-arrow-left me-1"></i>Back to Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
