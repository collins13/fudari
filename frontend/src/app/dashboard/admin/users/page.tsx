'use client';
import { useState, useEffect } from 'react';
import { adminUsersAPI } from '@/lib/api';

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

function ApprovalBadge({ approved }: { approved: boolean }) {
  return approved
    ? <span className="badge text-bg-success"><i className="fa-solid fa-check me-1" />Approved</span>
    : <span className="badge text-bg-warning"><i className="fa-solid fa-clock me-1" />Pending</span>;
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

  // Create form state
  const [createForm, setCreateForm] = useState({
    firstName: '', lastName: '', phoneNumber: '', email: '', password: '', role: 'CLIENT' as string,
  });
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await adminUsersAPI.getAllUsers();
      setUsers(res.data || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

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
    if (!confirm('Are you sure you want to soft-delete this user? Their listings will be revoked.')) return;
    setActionLoading(userId);
    try {
      await adminUsersAPI.softDeleteUser(userId);
      showToast('User soft-deleted', 'success');
      loadUsers();
    } catch { showToast('Failed to delete user', 'danger'); }
    finally { setActionLoading(null); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminUsersAPI.createUser({
        ...createForm,
        email: createForm.email || undefined,
      });
      showToast('User created successfully', 'success');
      setShowCreateModal(false);
      setCreateForm({ firstName: '', lastName: '', phoneNumber: '', email: '', password: '', role: 'CLIENT' });
      loadUsers();
    } catch { showToast('Failed to create user. Phone or email may already exist.', 'danger'); }
    finally { setCreating(false); }
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
                        {u.role === 'WORKER' ? <ApprovalBadge approved={u.isApproved} /> : '—'}
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

      {/* ─── Create User Modal ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-user-plus me-2 text-primary" />Create New User
                </h5>
                <button className="btn-close" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-medium">First Name *</label>
                      <input type="text" className="form-control" required
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Last Name *</label>
                      <input type="text" className="form-control" required
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-medium">Phone Number *</label>
                      <input type="tel" className="form-control" required placeholder="e.g. 0712345678"
                        value={createForm.phoneNumber}
                        onChange={(e) => setCreateForm(f => ({ ...f, phoneNumber: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-medium">Email (optional)</label>
                      <input type="email" className="form-control" placeholder="user@example.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-medium">Password *</label>
                      <input type="password" className="form-control" required minLength={6}
                        value={createForm.password}
                        onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-medium">Role *</label>
                      <select className="form-select" value={createForm.role}
                        onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="CLIENT">Client</option>
                        <option value="WORKER">Worker (Artisan)</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {createForm.role === 'WORKER' && (
                        <div className="form-text text-info">
                          <i className="fa-solid fa-info-circle me-1" />
                          Admin-created workers are auto-approved.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary rounded-3"
                    onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-3" disabled={creating}>
                    {creating ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    Create User
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
                        {selectedUser.role === 'WORKER' && <ApprovalBadge approved={selectedUser.isApproved} />}
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
                  {selectedUser.role === 'WORKER' && !selectedUser.isApproved && (
                    <button className="btn btn-success btn-sm rounded-3"
                      onClick={() => { handleApprove(selectedUser.id); setSelectedUser(null); }}>
                      <i className="fa-solid fa-check me-1" />Approve Artisan
                    </button>
                  )}
                  {selectedUser.role === 'WORKER' && selectedUser.isApproved && (
                    <button className="btn btn-outline-warning btn-sm rounded-3"
                      onClick={() => { handleRevokeApproval(selectedUser.id); setSelectedUser(null); }}>
                      <i className="fa-solid fa-xmark me-1" />Revoke Approval
                    </button>
                  )}
                  <button className="btn btn-outline-danger btn-sm rounded-3"
                    onClick={() => { handleSoftDelete(selectedUser.id); setSelectedUser(null); }}>
                    <i className="fa-solid fa-trash me-1" />Soft Delete
                  </button>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-3" onClick={() => setSelectedUser(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
