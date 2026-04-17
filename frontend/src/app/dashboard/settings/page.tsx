'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

interface NotificationPrefs {
  emailBookings: boolean;
  emailReviews: boolean;
  emailMessages: boolean;
  smsBookings: boolean;
  smsPayments: boolean;
  smsPricing: boolean;
}

const PLANS = [
  {
    name: 'Basic',
    price: 'Free',
    features: ['1 listing', 'Standard visibility', 'Email support'],
    badge: '',
    color: '#6c757d',
  },
  {
    name: 'Silver',
    price: 'KES 300/mo',
    features: ['3 listings', 'Enhanced visibility', 'Priority support', 'Analytics'],
    badge: 'Popular',
    color: '#0d6efd',
  },
  {
    name: 'Gold',
    price: 'KES 1,500/mo',
    features: ['Unlimited listings', 'Top visibility', 'Featured badge', 'Analytics', 'Dedicated support'],
    badge: 'Current',
    color: '#ffc107',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notifs, setNotifs] = useState<NotificationPrefs>({
    emailBookings: true,
    emailReviews: true,
    emailMessages: false,
    smsBookings: true,
    smsPayments: true,
    smsPricing: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });
      setPasswordSaved(true);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPasswordError(e?.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotifToggle = (key: keyof NotificationPrefs) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNotifSave = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await authAPI.deleteAccount();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setDeleteError(e?.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Settings</h4>
        <p className="text-muted mb-0">Manage your account preferences and security</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Change Password */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="fa-solid fa-lock me-2 text-primary"></i>Change Password
              </h6>
            </div>
            <div className="card-body">
              {passwordSaved && (
                <div className="alert alert-success d-flex align-items-center gap-2 mb-3" role="alert">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>Password changed successfully!</span>
                </div>
              )}
              {passwordError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" role="alert">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{passwordError}</span>
                </div>
              )}
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-3">
                  <label htmlFor="current" className="form-label fw-medium">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current"
                    name="current"
                    className="form-control"
                    value={passwordForm.current}
                    onChange={handlePasswordChange}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="newPass" className="form-label fw-medium">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPass"
                    name="newPass"
                    className="form-control"
                    value={passwordForm.newPass}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <div className="form-text">At least 8 characters</div>
                </div>
                <div className="mb-4">
                  <label htmlFor="confirm" className="form-label fw-medium">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm"
                    name="confirm"
                    className="form-control"
                    value={passwordForm.confirm}
                    onChange={handlePasswordChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="btn btn-primary rounded-5" disabled={passwordLoading}>
                  {passwordLoading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</>
                    : <><i className="fa-solid fa-lock me-2"></i>Update Password</>}
                </button>
              </form>
            </div>
          </div>

          {/* Notifications */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-semibold">
                <i className="fa-solid fa-bell me-2 text-primary"></i>Notification Preferences
              </h6>
              {notifSaved && (
                <span className="text-success small">
                  <i className="fa-solid fa-check me-1"></i>Saved
                </span>
              )}
            </div>
            <div className="card-body">
              <h6 className="text-muted small fw-semibold text-uppercase mb-3">
                Email Notifications
              </h6>
              {([
                { key: 'emailBookings' as keyof NotificationPrefs, label: 'New booking requests', desc: 'Get notified when customers book your services' },
                { key: 'emailReviews' as keyof NotificationPrefs, label: 'New reviews', desc: 'Get notified when customers leave reviews' },
                { key: 'emailMessages' as keyof NotificationPrefs, label: 'New messages', desc: 'Get email alerts for new customer messages' },
              ]).map((item) => (
                <div key={item.key} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <div className="fw-medium small">{item.label}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{item.desc}</div>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={notifs[item.key]}
                      onChange={() => handleNotifToggle(item.key)}
                      style={{ width: 40, height: 22, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              ))}

              <h6 className="text-muted small fw-semibold text-uppercase mb-3 mt-4">
                SMS Notifications
              </h6>
              {([
                { key: 'smsBookings' as keyof NotificationPrefs, label: 'Booking confirmations', desc: 'SMS when a booking is confirmed or updated' },
                { key: 'smsPayments' as keyof NotificationPrefs, label: 'Payment alerts', desc: 'SMS when you receive a payment' },
                { key: 'smsPricing' as keyof NotificationPrefs, label: 'Promotional offers', desc: 'SMS about TUFIXIT promotions and discounts' },
              ]).map((item) => (
                <div key={item.key} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <div className="fw-medium small">{item.label}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{item.desc}</div>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={notifs[item.key]}
                      onChange={() => handleNotifToggle(item.key)}
                      style={{ width: 40, height: 22, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              ))}

              <button
                className="btn btn-primary rounded-5 mt-4"
                onClick={handleNotifSave}
              >
                <i className="fa-solid fa-floppy-disk me-2"></i>Save Preferences
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border-0 shadow-sm border border-danger border-opacity-25">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="mb-0 fw-semibold text-danger">
                <i className="fa-solid fa-triangle-exclamation me-2"></i>Danger Zone
              </h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-medium">Delete Account</div>
                  <div className="text-muted small">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </div>
                </div>
                <button
                  className="btn btn-outline-danger rounded-5 ms-4 flex-shrink-0"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <i className="fa-solid fa-trash me-2"></i>Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Package Column */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="fa-solid fa-crown text-warning me-2"></i>Subscription Plan
              </h6>
            </div>
            <div className="card-body p-0">
              {PLANS.map((plan, i) => {
                const isCurrent = plan.badge === 'Current';
                return (
                  <div
                    key={i}
                    className={`p-3 border-bottom ${isCurrent ? 'bg-warning bg-opacity-10' : ''}`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <span className="fw-semibold">{plan.name}</span>
                        <div className="text-muted small">{plan.price}</div>
                      </div>
                      {plan.badge && (
                        <span
                          className={`badge ${
                            plan.badge === 'Current'
                              ? 'text-bg-warning'
                              : 'text-bg-primary'
                          }`}
                        >
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <ul className="list-unstyled mb-2">
                      {plan.features.map((f, j) => (
                        <li key={j} className="d-flex gap-2 mb-1">
                          <i className="fa-solid fa-check-circle text-success mt-1 flex-shrink-0" style={{ fontSize: 12 }}></i>
                          <span className="text-muted small">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <button
                        className={`btn btn-sm rounded-5 w-100 ${
                          plan.name === 'Basic'
                            ? 'btn-outline-secondary'
                            : 'btn-outline-primary'
                        }`}
                      >
                        {plan.name === 'Basic' ? 'Downgrade' : 'Upgrade to ' + plan.name}
                      </button>
                    )}
                    {isCurrent && (
                      <div className="text-center text-muted small">
                        <i className="fa-solid fa-circle-check text-success me-1"></i>
                        Active Plan
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="fa-solid fa-triangle-exclamation me-2"></i>Delete Account
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger small mb-3" role="alert">
                  <strong>Warning:</strong> This action is permanent and cannot be undone. All your listings, bookings, and reviews will be deleted.
                </div>
                {deleteError && (
                  <div className="alert alert-warning small mb-3" role="alert">
                    <i className="fa-solid fa-circle-exclamation me-1"></i>{deleteError}
                  </div>
                )}
                <p className="text-muted small mb-3">
                  Type <strong>delete</strong> in the box below to confirm.
                </p>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type 'delete' to confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>
              <div className="modal-footer border-0">
                <button
                  className="btn btn-secondary rounded-5"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm('');
                    setDeleteError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger rounded-5"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm.toLowerCase() !== 'delete' || deleteLoading}
                >
                  {deleteLoading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</>
                    : <><i className="fa-solid fa-trash me-2"></i>Delete My Account</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
