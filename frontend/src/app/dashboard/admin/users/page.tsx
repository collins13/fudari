'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { adminUsersAPI, authAPI } from '@/lib/api';
import { SKILL_OPTIONS as SKILL_CATEGORIES } from '@/lib/kenya';

const PHONE_REGEX = /^(?:\+254|0)[17]\d{8}$/;
const NAME_REGEX = /^[A-Za-z\s'-]{2,50}$/;
const NATIONAL_ID_REGEX = /^[A-Za-z0-9-]{5,30}$/;
const MAX_DOC_BYTES = 2 * 1024 * 1024; // 2MB

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

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface UserDTO {
  id: number;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  role: string;
  vettingLevel: string;
  trustScore: number;
  totalJobsCompleted: number;
  totalReviews: number;
  locationName: string | null;
  isVerified: boolean;
  isActive: boolean;
  accountStatus: string;
  isApproved: boolean;
  approvalStatus?: string;
  approvedAt?: string | null;
  approvedByAdminId?: number | null;
  rejectionReason?: string | null;
  createdByAdminId?: number | null;
  nationalId?: string | null;
  createdAt: string | null;
  skills?: { id: number; skillType: string; experienceYears: number; hourlyRate: string; isVerified: boolean }[];
}

const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED'] as const;
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'success', SUSPENDED: 'warning', LOCKED: 'danger',
  DISABLED: 'secondary', SOFT_DELETED: 'dark',
};
const STATUS_ICONS: Record<string, string> = {
  ACTIVE: 'fa-circle-check', SUSPENDED: 'fa-pause-circle', LOCKED: 'fa-lock',
  DISABLED: 'fa-ban', SOFT_DELETED: 'fa-trash',
};

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'ADMIN' ? 'danger' : role === 'WORKER' ? 'primary' : 'secondary';
  return <span className={`badge text-bg-${cls}`}>{role}</span>;
}

function ApprovalBadge({ user }: { user: { isApproved: boolean; approvalStatus?: string } }) {
  const status = user.approvalStatus || (user.isApproved ? 'APPROVED' : 'PENDING');
  if (status === 'APPROVED') return <span className="badge text-bg-success"><i className="fa-solid fa-check me-1" />Approved</span>;
  if (status === 'REJECTED') return <span className="badge text-bg-danger"><i className="fa-solid fa-xmark me-1" />Rejected</span>;
  return <span className="badge text-bg-warning"><i className="fa-solid fa-clock me-1" />Pending</span>;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

/** Sanitize profile image URL to prevent XSS — only allow http(s) and data:image URIs */
function safeImageSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('data:image/')) return url;
  return null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [confirmSoftDeleteUser, setConfirmSoftDeleteUser] = useState<UserDTO | null>(null);
  const [rejectUser, setRejectUser] = useState<UserDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Create form state — mirrors provider self-registration + artisan vetting + service profile
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'WORKER' as 'CLIENT' | 'WORKER' | 'ADMIN',
    nationalId: '',
    idDocumentImage: '',
    idDocumentName: '',
    certificateOfGoodConduct: '',
    certificateName: '',
    autoApprove: false,
    // Service profile (artisan-only)
    skillType: '',
    bio: '',
    experienceYears: '',
    hourlyRate: '',
    locationName: '',
    latitude: '' as string | number,
    longitude: '' as string | number,
    profileImage: '',
  });
  const [locating, setLocating] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>({});
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const passwordStrength = useMemo(() => getPasswordStrength(createForm.password), [createForm.password]);

  const loadUsers = async () => {
    try {
      const res = await adminUsersAPI.getAllUsers();
      setUsers(res.data || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  // Real-time phone availability check (matches provider self-registration)
  useEffect(() => {
    if (!showCreateModal) return;
    const stripped = createForm.phoneNumber.replace(/\s/g, '');
    if (!PHONE_REGEX.test(stripped)) { setPhoneStatus('idle'); return; }
    setPhoneStatus('checking');
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(async () => {
      try {
        const res = await authAPI.checkPhone(stripped);
        setPhoneStatus(res.data.available ? 'available' : 'taken');
      } catch { setPhoneStatus('idle'); }
    }, 500);
    return () => { if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current); };
  }, [createForm.phoneNumber, showCreateModal]);

  const showToast = (msg: string, type: 'success' | 'danger') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    setActionLoading(userId);
    try {
      await adminUsersAPI.updateUserRole(userId, newRole);
      showToast(`Role updated to ${newRole}`, 'success');
      loadUsers();
    } catch { showToast('Failed to update role', 'danger'); }
    finally { setActionLoading(null); }
  };

  const handleAccountStatus = async (userId: number, status: string) => {
    setActionLoading(userId);
    try {
      await adminUsersAPI.updateAccountStatus(userId, status);
      showToast(`Account status set to ${status}`, 'success');
      loadUsers();
    } catch { showToast('Failed to update status', 'danger'); }
    finally { setActionLoading(null); }
  };

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await adminUsersAPI.approveUser(userId);
      showToast('User approved — now visible to customers', 'success');
      loadUsers();
    } catch { showToast('Failed to approve user', 'danger'); }
    finally { setActionLoading(null); }
  };

  const handleRevokeApproval = async (userId: number) => {
    setActionLoading(userId);
    try {
      await adminUsersAPI.revokeApproval(userId);
      showToast('Approval revoked — user hidden from customers', 'success');
      loadUsers();
    } catch { showToast('Failed to revoke approval', 'danger'); }
    finally { setActionLoading(null); }
  };

  const handleSoftDelete = async (userId: number) => {
    setConfirmSoftDeleteUser(null);
    setActionLoading(userId);
    try {
      await adminUsersAPI.softDeleteUser(userId);
      showToast('User soft-deleted', 'success');
      loadUsers();
    } catch { showToast('Failed to delete user', 'danger'); }
    finally { setActionLoading(null); }
  };

  const handleRejectArtisan = async () => {
    if (!rejectUser) return;
    setSubmittingReject(true);
    setActionLoading(rejectUser.id);
    try {
      await adminUsersAPI.rejectArtisan(rejectUser.id, rejectReason.trim() || undefined);
      showToast('Artisan rejected', 'success');
      setRejectUser(null);
      setRejectReason('');
      loadUsers();
    } catch {
      showToast('Failed to reject artisan', 'danger');
    } finally {
      setSubmittingReject(false);
      setActionLoading(null);
    }
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.firstName.trim() || !NAME_REGEX.test(createForm.firstName.trim()))
      errors.firstName = 'Enter a valid first name (letters only, 2-50 characters).';
    if (!createForm.lastName.trim() || !NAME_REGEX.test(createForm.lastName.trim()))
      errors.lastName = 'Enter a valid last name (letters only, 2-50 characters).';
    if (!PHONE_REGEX.test(createForm.phoneNumber.replace(/\s/g, '')))
      errors.phoneNumber = 'Enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).';
    if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email))
      errors.email = 'Enter a valid email address.';
    if (createForm.password.length < 8)
      errors.password = 'Password must be at least 8 characters.';
    if (createForm.password !== createForm.confirmPassword)
      errors.confirmPassword = 'Passwords do not match.';
    if (createForm.role === 'WORKER') {
      if (!createForm.nationalId.trim() || !NATIONAL_ID_REGEX.test(createForm.nationalId.trim()))
        errors.nationalId = 'Enter a valid National ID number.';
      if (!createForm.idDocumentImage) errors.idDocumentImage = 'Upload the artisan\u2019s ID document.';
      if (!createForm.certificateOfGoodConduct) errors.certificateOfGoodConduct = 'Upload Certificate of Good Conduct.';
      if (!createForm.skillType) errors.skillType = 'Select the artisan’s primary service category.';
      if (!createForm.locationName.trim()) errors.locationName = 'Enter the artisan’s service area.';
      if (createForm.experienceYears && Number(createForm.experienceYears) < 0)
        errors.experienceYears = 'Experience years must be 0 or greater.';
      if (createForm.hourlyRate && Number(createForm.hourlyRate) < 0)
        errors.hourlyRate = 'Hourly rate must be 0 or greater.';
    }
    setCreateErrors(errors);
    setCreateTouched({
      firstName: true, lastName: true, phoneNumber: true, email: true,
      password: true, confirmPassword: true,
      nationalId: true, idDocumentImage: true, certificateOfGoodConduct: true,
      skillType: true, locationName: true,
    });
    return Object.keys(errors).length === 0;
  };

  const handleDocUpload = async (
    field: 'idDocumentImage' | 'certificateOfGoodConduct',
    nameField: 'idDocumentName' | 'certificateName',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/.test(file.type)) {
      setCreateErrors((p) => ({ ...p, [field]: 'Only JPG, PNG, WEBP or PDF allowed.' }));
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setCreateErrors((p) => ({ ...p, [field]: 'File too large (max 2MB).' }));
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setCreateForm((f) => ({ ...f, [field]: dataUrl, [nameField]: file.name }));
      setCreateErrors((p) => { const n = { ...p }; delete n[field]; return n; });
    } catch {
      setCreateErrors((p) => ({ ...p, [field]: 'Failed to read file.' }));
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
            { headers: { 'Accept-Language': 'en' } },
          );
          const data = await res.json();
          const addr = data.address || {};
          const name = addr.suburb || addr.neighbourhood || addr.city_district
            || addr.town || addr.city || addr.county || data.display_name;
          setCreateForm((f) => ({
            ...f,
            locationName: name || f.locationName,
            latitude,
            longitude,
          }));
        } catch {
          /* ignore reverse-geocode errors */
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setCreateErrors((p) => ({ ...p, profileImage: 'Only JPG, PNG, or WEBP allowed.' }));
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setCreateErrors((p) => ({ ...p, profileImage: 'Image too large (max 2MB).' }));
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setCreateForm((f) => ({ ...f, profileImage: dataUrl }));
      setCreateErrors((p) => { const n = { ...p }; delete n.profileImage; return n; });
    } catch {
      setCreateErrors((p) => ({ ...p, profileImage: 'Failed to read file.' }));
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      firstName: '', lastName: '', phoneNumber: '', email: '',
      password: '', confirmPassword: '', role: 'WORKER',
      nationalId: '', idDocumentImage: '', idDocumentName: '',
      certificateOfGoodConduct: '', certificateName: '', autoApprove: false,
      skillType: '', bio: '', experienceYears: '', hourlyRate: '',
      locationName: '', latitude: '', longitude: '', profileImage: '',
    });
    setCreateErrors({});
    setCreateTouched({});
    setCreateError('');
    setPhoneStatus('idle');
    setShowPassword(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!validateCreateForm()) return;
    if (phoneStatus === 'taken') {
      setCreateError('This phone number is already registered.');
      return;
    }
    setCreating(true);
    try {
      await adminUsersAPI.createUser({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phoneNumber: createForm.phoneNumber.replace(/\s/g, ''),
        email: createForm.email.trim() || undefined,
        password: createForm.password,
        role: createForm.role,
        ...(createForm.role === 'WORKER' && {
          nationalId: createForm.nationalId.trim(),
          idDocumentImage: createForm.idDocumentImage,
          certificateOfGoodConduct: createForm.certificateOfGoodConduct,
          autoApprove: createForm.autoApprove,
          skillType: createForm.skillType || undefined,
          bio: createForm.bio.trim() || undefined,
          experienceYears: createForm.experienceYears ? Number(createForm.experienceYears) : undefined,
          hourlyRate: createForm.hourlyRate || undefined,
          locationName: createForm.locationName.trim() || undefined,
          latitude: createForm.latitude !== '' ? Number(createForm.latitude) : undefined,
          longitude: createForm.longitude !== '' ? Number(createForm.longitude) : undefined,
          profileImage: createForm.profileImage || undefined,
        }),
      });
      const isPending = createForm.role === 'WORKER' && !createForm.autoApprove;
      showToast(isPending
        ? 'Artisan onboarded \u2014 awaiting approval'
        : 'User created successfully', 'success');
      setShowCreateModal(false);
      resetCreateForm();
      loadUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to create user. Phone, email, or National ID may already exist.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter((u) => {
    if (filter !== 'ALL' && u.role !== filter) return false;
    if (statusFilter === 'PENDING_APPROVAL' && (u.isApproved || u.role !== 'WORKER')) return false;
    if (statusFilter !== 'ALL' && statusFilter !== 'PENDING_APPROVAL' && u.accountStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phoneNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const workerCount = users.filter((u) => u.role === 'WORKER').length;
  const clientCount = users.filter((u) => u.role === 'CLIENT').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const pendingApproval = users.filter((u) => u.role === 'WORKER' && !u.isApproved).length;
  const suspendedCount = users.filter((u) => u.accountStatus === 'SUSPENDED').length;

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">User Management</h4>
          <p className="text-muted mb-0">Manage users, roles, and approval status</p>
        </div>
        <button className="btn btn-primary rounded-3" onClick={() => setShowCreateModal(true)}>
          <i className="fa-solid fa-user-plus me-2" />Create User
        </button>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)} />
        </div>
      )}

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Users', value: users.length, color: '#0d6efd', icon: 'fa-users' },
          { label: 'Artisans', value: workerCount, color: '#198754', icon: 'fa-wrench' },
          { label: 'Customers', value: clientCount, color: '#6f42c1', icon: 'fa-user' },
          { label: 'Admins', value: adminCount, color: '#dc3545', icon: 'fa-shield' },
          { label: 'Pending Approval', value: pendingApproval, color: '#fd7e14', icon: 'fa-clock' },
          { label: 'Suspended', value: suspendedCount, color: '#ffc107', icon: 'fa-pause-circle' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-sm-4 col-xl-2">
            <div className="card border-0 shadow-sm p-3 h-100">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40, background: s.color + '15' }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{s.label}</div>
                  <h5 className="mb-0 fw-bold">{s.value}</h5>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Role filter */}
            <ul className="nav nav-pills gap-1 mb-0 flex-nowrap">
              {['ALL', 'WORKER', 'CLIENT', 'ADMIN'].map((f) => (
                <li key={f} className="nav-item">
                  <button className={`nav-link rounded-5 py-1 px-3 ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                    style={filter === f ? {} : { color: '#6c757d', fontSize: 13 }}>
                    {f === 'ALL' ? 'All Roles' : f.charAt(0) + f.slice(1).toLowerCase() + 's'}
                  </button>
                </li>
              ))}
            </ul>
            {/* Status filter */}
            <select className="form-select form-select-sm rounded-5" style={{ width: 'auto', fontSize: 13 }}
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="LOCKED">Locked</option>
              <option value="DISABLED">Disabled</option>
            </select>
            {/* Search */}
            <div className="position-relative ms-auto" style={{ minWidth: 200 }}>
              <i className="fa-solid fa-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 12 }} />
              <input type="text" className="form-control form-control-sm rounded-5 ps-4"
                placeholder="Search name, email, phone..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fa-solid fa-users-slash" style={{ fontSize: 48 }} />
              <p className="mt-3 mb-0">No users found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Joined</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          {safeImageSrc(u.profileImage) ? (
                            <img src={safeImageSrc(u.profileImage)!} alt="" className="rounded-circle flex-shrink-0"
                              style={{ width: 34, height: 34, objectFit: 'cover' }} />
                          ) : (
                            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                              style={{ width: 34, height: 34, fontSize: 12 }}>
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </div>
                          )}
                          <div>
                            <div className="fw-medium small">{u.firstName} {u.lastName}</div>
                            <div className="text-muted" style={{ fontSize: 10 }}>ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="small">{u.email || '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{u.phoneNumber}</div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <span className={`badge text-bg-${STATUS_COLORS[u.accountStatus] || 'secondary'}`}>
                          <i className={`fa-solid ${STATUS_ICONS[u.accountStatus] || 'fa-question'} me-1`} />
                          {u.accountStatus || 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        {u.role === 'WORKER' ? <ApprovalBadge user={u} /> : '—'}
                      </td>
                      <td className="text-muted small">{formatDate(u.createdAt)}</td>
                      <td className="text-end pe-3">
                        {actionLoading === u.id ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <div className="d-flex gap-1 justify-content-end flex-wrap">
                            <button className="btn btn-sm btn-outline-primary rounded-3"
                              onClick={() => setSelectedUser(u)} title="Manage">
                              <i className="fa-solid fa-ellipsis" />
                            </button>
                            {u.role === 'WORKER' && !u.isApproved && (
                              <button className="btn btn-sm btn-success rounded-3"
                                onClick={() => handleApprove(u.id)} title="Approve">
                                <i className="fa-solid fa-check" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card-footer bg-white border-top py-2 text-muted small text-center">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* ─── Create User / Onboard Artisan Modal ───────────────── */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-user-plus me-2 text-primary" />
                  {createForm.role === 'WORKER' ? 'Onboard New Artisan' : 'Create New User'}
                </h5>
                <button className="btn-close" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} />
              </div>
              <form onSubmit={handleCreateUser} noValidate>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger small py-2 rounded-3">
                      <i className="fa-solid fa-triangle-exclamation me-2" />{createError}
                    </div>
                  )}

                  {/* Role toggle — same UX as provider self-registration */}
                  <fieldset className="mb-3">
                    <legend className="form-label small fw-medium mb-2">Account Type</legend>
                    <div className="d-flex gap-2 p-1 bg-light rounded-3" role="radiogroup">
                      {[
                        { value: 'CLIENT', icon: 'fa-user', label: 'Customer' },
                        { value: 'WORKER', icon: 'fa-wrench', label: 'Artisan / Provider' },
                        { value: 'ADMIN', icon: 'fa-shield', label: 'Admin' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={createForm.role === opt.value}
                          className={`btn flex-grow-1 rounded-3 fw-medium btn-sm ${createForm.role === opt.value ? 'btn-primary' : 'btn-light'}`}
                          onClick={() => setCreateForm((f) => ({ ...f, role: opt.value as 'CLIENT' | 'WORKER' | 'ADMIN' }))}
                        >
                          <i className={`fa-solid ${opt.icon} me-2`} />{opt.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-medium">First Name *</label>
                      <input type="text"
                        className={`form-control${createTouched.firstName && createErrors.firstName ? ' is-invalid' : ''}`}
                        required autoComplete="given-name" placeholder="John"
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                        onBlur={() => setCreateTouched((t) => ({ ...t, firstName: true }))} />
                      {createTouched.firstName && createErrors.firstName && (
                        <div className="invalid-feedback">{createErrors.firstName}</div>
                      )}
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-medium">Last Name *</label>
                      <input type="text"
                        className={`form-control${createTouched.lastName && createErrors.lastName ? ' is-invalid' : ''}`}
                        required autoComplete="family-name" placeholder="Kamau"
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                        onBlur={() => setCreateTouched((t) => ({ ...t, lastName: true }))} />
                      {createTouched.lastName && createErrors.lastName && (
                        <div className="invalid-feedback">{createErrors.lastName}</div>
                      )}
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-medium">Phone Number *</label>
                      <div className="input-group">
                        <input type="tel"
                          className={`form-control${createTouched.phoneNumber && createErrors.phoneNumber ? ' is-invalid' : ''}`}
                          required placeholder="0712345678"
                          value={createForm.phoneNumber}
                          onChange={(e) => setCreateForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                          onBlur={() => setCreateTouched((t) => ({ ...t, phoneNumber: true }))} />
                        {phoneStatus === 'checking' && (
                          <span className="input-group-text bg-white">
                            <span className="spinner-border spinner-border-sm text-secondary" />
                          </span>
                        )}
                        {phoneStatus === 'available' && (
                          <span className="input-group-text bg-white text-success">
                            <i className="fa-solid fa-circle-check me-1" />Available
                          </span>
                        )}
                        {phoneStatus === 'taken' && (
                          <span className="input-group-text bg-white text-danger">
                            <i className="fa-solid fa-circle-xmark me-1" />Registered
                          </span>
                        )}
                      </div>
                      {createTouched.phoneNumber && createErrors.phoneNumber && (
                        <div className="text-danger small mt-1">{createErrors.phoneNumber}</div>
                      )}
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-medium">Email <span className="text-muted fw-normal">(optional)</span></label>
                      <input type="email"
                        className={`form-control${createTouched.email && createErrors.email ? ' is-invalid' : ''}`}
                        placeholder="user@example.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                        onBlur={() => setCreateTouched((t) => ({ ...t, email: true }))} />
                      {createTouched.email && createErrors.email && (
                        <div className="invalid-feedback">{createErrors.email}</div>
                      )}
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-medium">Password *</label>
                      <div className="input-group">
                        <input type={showPassword ? 'text' : 'password'}
                          className={`form-control${createTouched.password && createErrors.password ? ' is-invalid' : ''}`}
                          required minLength={8} autoComplete="new-password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                          onBlur={() => setCreateTouched((t) => ({ ...t, password: true }))} />
                        <button type="button" className="btn btn-outline-secondary"
                          onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                          <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                      </div>
                      {createForm.password && (
                        <div className="mt-1">
                          <div className="progress" style={{ height: 3 }}>
                            <div className="progress-bar" role="progressbar"
                              style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }} />
                          </div>
                          <small style={{ color: passwordStrength.color }} className="fw-medium">
                            {passwordStrength.label}
                          </small>
                        </div>
                      )}
                      {createTouched.password && createErrors.password && (
                        <div className="text-danger small mt-1">{createErrors.password}</div>
                      )}
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-medium">Confirm Password *</label>
                      <input type={showPassword ? 'text' : 'password'}
                        className={`form-control${createTouched.confirmPassword && createErrors.confirmPassword ? ' is-invalid' : ''}`}
                        required autoComplete="new-password"
                        value={createForm.confirmPassword}
                        onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                        onBlur={() => setCreateTouched((t) => ({ ...t, confirmPassword: true }))} />
                      {createTouched.confirmPassword && createErrors.confirmPassword && (
                        <div className="invalid-feedback">{createErrors.confirmPassword}</div>
                      )}
                    </div>

                    {createForm.role === 'WORKER' && (
                      <>
                        <div className="col-12">
                          <hr className="my-2" />
                          <h6 className="fw-semibold mb-2">
                            <i className="fa-solid fa-id-card me-2 text-primary" />Vetting Documents
                          </h6>
                          <p className="small text-muted mb-3">
                            Required for artisan onboarding. Documents are restricted to admin access only.
                          </p>
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-medium">National ID Number *</label>
                          <input type="text"
                            className={`form-control${createTouched.nationalId && createErrors.nationalId ? ' is-invalid' : ''}`}
                            placeholder="e.g. 12345678"
                            value={createForm.nationalId}
                            onChange={(e) => setCreateForm((f) => ({ ...f, nationalId: e.target.value }))}
                            onBlur={() => setCreateTouched((t) => ({ ...t, nationalId: true }))} />
                          {createTouched.nationalId && createErrors.nationalId && (
                            <div className="invalid-feedback">{createErrors.nationalId}</div>
                          )}
                        </div>

                        <div className="col-sm-6">
                          <label className="form-label small fw-medium">ID Document Upload *</label>
                          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                            className={`form-control${createTouched.idDocumentImage && createErrors.idDocumentImage ? ' is-invalid' : ''}`}
                            onChange={(e) => handleDocUpload('idDocumentImage', 'idDocumentName', e)} />
                          {createForm.idDocumentName && (
                            <div className="form-text text-success">
                              <i className="fa-solid fa-circle-check me-1" />{createForm.idDocumentName}
                            </div>
                          )}
                          {createErrors.idDocumentImage && (
                            <div className="text-danger small mt-1">{createErrors.idDocumentImage}</div>
                          )}
                        </div>

                        <div className="col-sm-6">
                          <label className="form-label small fw-medium">Certificate of Good Conduct *</label>
                          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                            className={`form-control${createTouched.certificateOfGoodConduct && createErrors.certificateOfGoodConduct ? ' is-invalid' : ''}`}
                            onChange={(e) => handleDocUpload('certificateOfGoodConduct', 'certificateName', e)} />
                          {createForm.certificateName && (
                            <div className="form-text text-success">
                              <i className="fa-solid fa-circle-check me-1" />{createForm.certificateName}
                            </div>
                          )}
                          {createErrors.certificateOfGoodConduct && (
                            <div className="text-danger small mt-1">{createErrors.certificateOfGoodConduct}</div>
                          )}
                        </div>

                        <div className="col-12">
                          <hr className="my-2" />
                          <h6 className="fw-semibold mb-2">
                            <i className="fa-solid fa-screwdriver-wrench me-2 text-primary" />Service Profile
                          </h6>
                          <p className="small text-muted mb-3">
                            Helps customers find this artisan and is required to go live.
                          </p>
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-medium">Primary Service Category *</label>
                          <select
                            className={`form-select${createTouched.skillType && createErrors.skillType ? ' is-invalid' : ''}`}
                            value={createForm.skillType}
                            onChange={(e) => setCreateForm((f) => ({ ...f, skillType: e.target.value }))}
                            onBlur={() => setCreateTouched((t) => ({ ...t, skillType: true }))}
                          >
                            <option value="">Select a service…</option>
                            {SKILL_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          {createTouched.skillType && createErrors.skillType && (
                            <div className="invalid-feedback">{createErrors.skillType}</div>
                          )}
                        </div>

                        <div className="col-sm-6">
                          <label className="form-label small fw-medium">Years of Experience</label>
                          <input type="number" min="0" className="form-control"
                            placeholder="e.g. 5"
                            value={createForm.experienceYears}
                            onChange={(e) => setCreateForm((f) => ({ ...f, experienceYears: e.target.value }))} />
                          {createErrors.experienceYears && (
                            <div className="text-danger small mt-1">{createErrors.experienceYears}</div>
                          )}
                        </div>

                        <div className="col-sm-6">
                          <label className="form-label small fw-medium">Hourly Rate (KES)</label>
                          <input type="number" min="0" className="form-control"
                            placeholder="e.g. 500"
                            value={createForm.hourlyRate}
                            onChange={(e) => setCreateForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
                          {createErrors.hourlyRate && (
                            <div className="text-danger small mt-1">{createErrors.hourlyRate}</div>
                          )}
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-medium">Service Area / Location *</label>
                          <div className="input-group">
                            <input type="text"
                              className={`form-control${createTouched.locationName && createErrors.locationName ? ' is-invalid' : ''}`}
                              placeholder="e.g. Westlands, Nairobi"
                              value={createForm.locationName}
                              onChange={(e) => setCreateForm((f) => ({ ...f, locationName: e.target.value }))}
                              onBlur={() => setCreateTouched((t) => ({ ...t, locationName: true }))} />
                            <button type="button" className="btn btn-outline-secondary"
                              onClick={handleDetectLocation} disabled={locating}
                              title="Detect location">
                              {locating
                                ? <span className="spinner-border spinner-border-sm" />
                                : <i className="fa-solid fa-location-crosshairs" />}
                            </button>
                            {createTouched.locationName && createErrors.locationName && (
                              <div className="invalid-feedback">{createErrors.locationName}</div>
                            )}
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-medium">Bio / Description</label>
                          <textarea className="form-control" rows={3}
                            placeholder="Short description of the artisan’s experience and services…"
                            value={createForm.bio}
                            onChange={(e) => setCreateForm((f) => ({ ...f, bio: e.target.value }))} />
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-medium">Profile Photo (optional)</label>
                          <div className="d-flex align-items-center gap-3">
                            {createForm.profileImage ? (
                              <img src={createForm.profileImage} alt="Profile preview"
                                className="rounded-circle border"
                                style={{ width: 56, height: 56, objectFit: 'cover' }} />
                            ) : (
                              <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center border"
                                style={{ width: 56, height: 56 }}>
                                <i className="fa-solid fa-camera text-muted" />
                              </div>
                            )}
                            <input type="file" accept="image/png,image/jpeg,image/webp"
                              className="form-control"
                              onChange={handleProfileImageUpload} />
                          </div>
                          {createErrors.profileImage && (
                            <div className="text-danger small mt-1">{createErrors.profileImage}</div>
                          )}
                        </div>

                        <div className="col-12">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="autoApprove"
                              checked={createForm.autoApprove}
                              onChange={(e) => setCreateForm((f) => ({ ...f, autoApprove: e.target.checked }))} />
                            <label className="form-check-label small" htmlFor="autoApprove">
                              <strong>Auto-approve on creation</strong>
                              <span className="text-muted d-block" style={{ fontSize: 12 }}>
                                If unchecked, the artisan will be created with status <em>Pending</em> until manually approved.
                              </span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary rounded-3"
                    onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3"
                    disabled={creating || phoneStatus === 'taken' || phoneStatus === 'checking'}>
                    {creating ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="fa-solid fa-user-plus me-2" />}
                    {createForm.role === 'WORKER' ? 'Onboard Artisan' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── User Detail / Actions Modal ──────────────────────────── */}
      {selectedUser && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedUser(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  {selectedUser.firstName} {selectedUser.lastName}
                  <RoleBadge role={selectedUser.role} />
                </h5>
                <button className="btn-close" onClick={() => setSelectedUser(null)} />
              </div>
              <div className="modal-body">
                {/* Info grid */}
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small mb-1">Contact</div>
                      <div className="fw-medium">{selectedUser.email || '—'}</div>
                      <div>{selectedUser.phoneNumber}</div>
                      <div className="text-muted small mt-1">{selectedUser.locationName || 'No location set'}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small mb-1">Account</div>
                      <div className="d-flex gap-2 flex-wrap">
                        <span className={`badge text-bg-${STATUS_COLORS[selectedUser.accountStatus] || 'secondary'}`}>
                          {selectedUser.accountStatus || 'ACTIVE'}
                        </span>
                        {selectedUser.role === 'WORKER' && <ApprovalBadge user={selectedUser} />}
                        {selectedUser.isVerified && <span className="badge text-bg-info">Verified</span>}
                      </div>
                      <div className="text-muted small mt-2">Joined: {formatDate(selectedUser.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {/* Worker stats */}
                {selectedUser.role === 'WORKER' && (
                  <div className="row g-3 mb-4">
                    <div className="col-4 text-center">
                      <div className="p-2 rounded-3" style={{ background: '#ffc10720' }}>
                        <div className="fw-bold text-warning">{selectedUser.trustScore?.toFixed(1) || '0.0'}</div>
                        <div className="text-muted" style={{ fontSize: 10 }}>Rating</div>
                      </div>
                    </div>
                    <div className="col-4 text-center">
                      <div className="p-2 rounded-3" style={{ background: '#0d6efd20' }}>
                        <div className="fw-bold">{selectedUser.totalJobsCompleted || 0}</div>
                        <div className="text-muted" style={{ fontSize: 10 }}>Jobs</div>
                      </div>
                    </div>
                    <div className="col-4 text-center">
                      <div className="p-2 rounded-3" style={{ background: '#19875420' }}>
                        <div className="fw-bold">{selectedUser.totalReviews || 0}</div>
                        <div className="text-muted" style={{ fontSize: 10 }}>Reviews</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <h6 className="fw-semibold mb-3">Account Actions</h6>
                <div className="row g-2 mb-3">
                  <div className="col-sm-6">
                    <label className="form-label small fw-medium">Change Role</label>
                    <select className="form-select form-select-sm"
                      value={selectedUser.role}
                      onChange={(e) => {
                        handleRoleChange(selectedUser.id, e.target.value);
                        setSelectedUser(null);
                      }}>
                      <option value="CLIENT">Client</option>
                      <option value="WORKER">Worker</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-medium">Account Status</label>
                    <select className="form-select form-select-sm"
                      value={selectedUser.accountStatus || 'ACTIVE'}
                      onChange={(e) => {
                        handleAccountStatus(selectedUser.id, e.target.value);
                        setSelectedUser(null);
                      }}>
                      {ACCOUNT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  {selectedUser.role === 'WORKER' && (selectedUser.approvalStatus !== 'APPROVED') && (
                    <button className="btn btn-success btn-sm rounded-3"
                      onClick={() => { handleApprove(selectedUser.id); setSelectedUser(null); }}>
                      <i className="fa-solid fa-check me-1" />Approve Artisan
                    </button>
                  )}
                  {selectedUser.role === 'WORKER' && selectedUser.approvalStatus !== 'REJECTED' && (
                    <button className="btn btn-outline-danger btn-sm rounded-3"
                      onClick={() => {
                        setRejectUser(selectedUser);
                        setRejectReason('');
                        setSelectedUser(null);
                      }}>
                      <i className="fa-solid fa-ban me-1" />Reject
                    </button>
                  )}
                  {selectedUser.role === 'WORKER' && selectedUser.isApproved && (
                    <button className="btn btn-outline-warning btn-sm rounded-3"
                      onClick={() => { handleRevokeApproval(selectedUser.id); setSelectedUser(null); }}>
                      <i className="fa-solid fa-xmark me-1" />Revoke Approval
                    </button>
                  )}
                  <button className="btn btn-outline-danger btn-sm rounded-3"
                    onClick={() => {
                      setConfirmSoftDeleteUser(selectedUser);
                      setSelectedUser(null);
                    }}>
                    <i className="fa-solid fa-trash me-1" />Soft Delete
                  </button>
                </div>
                {selectedUser.rejectionReason && (
                  <div className="alert alert-danger mt-3 small mb-0">
                    <strong>Rejection reason:</strong> {selectedUser.rejectionReason}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-3" onClick={() => setSelectedUser(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmSoftDeleteUser && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setConfirmSoftDeleteUser(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Confirm Soft Delete</h5>
                <button className="btn-close" onClick={() => setConfirmSoftDeleteUser(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted mb-0">
                  Soft-delete {confirmSoftDeleteUser.firstName} {confirmSoftDeleteUser.lastName}? Their listings will be revoked.
                </p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-3" onClick={() => setConfirmSoftDeleteUser(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger rounded-3" onClick={() => void handleSoftDelete(confirmSoftDeleteUser.id)}>
                  Soft Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectUser && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setRejectUser(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Reject Artisan</h5>
                <button className="btn-close" onClick={() => setRejectUser(null)} />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">
                  Optionally add a reason for rejecting {rejectUser.firstName} {rejectUser.lastName}.
                </p>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Reason (optional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-3" onClick={() => setRejectUser(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger rounded-3" onClick={() => void handleRejectArtisan()} disabled={submittingReject}>
                  {submittingReject ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="fa-solid fa-ban me-1" />}
                  Reject Artisan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
