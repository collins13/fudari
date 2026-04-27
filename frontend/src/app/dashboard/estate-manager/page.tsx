'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { estatesAPI, workersAPI } from '@/lib/api';

interface Artisan {
  approvalId: number;
  artisanId: number;
  artisanName: string;
  skillType: string;
  rating: number | null;
  note: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  approvedAt: string;
}

interface SearchResult {
  id: number;
  firstName: string;
  lastName: string;
  trustScore: number;
  totalJobsCompleted: number;
  locationName: string;
  vettingLevel: string;
  skills?: { skillType: string }[];
}

interface Analytics {
  estateId: number;
  estateName: string;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  avgRating: number;
  approvedArtisans: number;
  activeJobs: number;
  totalJobValue: number;
  estateCommission: number;
  topArtisans: { artisanId: number; name: string; skillType: string; completedJobs: number; avgRating: number }[];
}

export default function EstateManagerDashboard() {
  const router = useRouter();
  const [estateId, setEstateId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [approvedArtisans, setApprovedArtisans] = useState<Artisan[]>([]);
  const [pendingArtisans, setPendingArtisans] = useState<Artisan[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'artisans' | 'pending'>('overview');
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Artisan search + add
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addNote, setAddNote] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ESTATE_MANAGER' && payload.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        if (payload.estate_id) setEstateId(payload.estate_id);
      } catch {
        router.push('/login');
      }
    }
  }, [router]);

  const loadData = useCallback(async () => {
    if (!estateId) return;
    setLoading(true);
    try {
      const [analyticsRes, artisansRes, pendingRes] = await Promise.all([
        estatesAPI.getAnalytics(estateId),
        estatesAPI.getApprovedArtisans(estateId),
        estatesAPI.getPendingApprovals(estateId),
      ]);
      setAnalytics(analyticsRes.data);
      setApprovedArtisans(artisansRes.data);
      setPendingArtisans(pendingRes.data);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [estateId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDecision = async (approvalId: number, decision: 'APPROVED' | 'REJECTED') => {
    if (!estateId) return;
    setProcessingId(approvalId);
    try {
      await estatesAPI.decideApproval(estateId, approvalId, {
        decision,
        rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
      });
      setRejectionReason('');
      await loadData();
    } catch {
      alert('Failed to process decision');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await workersAPI.searchWorkers({ name: searchQuery.trim() });
      const results = res.data || [];
      // Exclude artisans already in the approved/pending list
      const existingIds = new Set([
        ...approvedArtisans.map(a => a.artisanId),
        ...pendingArtisans.map(a => a.artisanId),
      ]);
      setSearchResults(results.filter((r: SearchResult) => !existingIds.has(r.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddArtisan = async (artisanId: number) => {
    if (!estateId) return;
    setAddingId(artisanId);
    try {
      await estatesAPI.approveArtisan(estateId, { artisanId, note: addNote || undefined });
      setAddNote('');
      setSearchQuery('');
      setSearchResults([]);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add artisan');
    } finally {
      setAddingId(null);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">Loading estate dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="fa-solid fa-building me-2"></i>
            {analytics?.estateName || 'Estate'} Dashboard
          </h2>
          <p className="text-muted mb-0">Manage artisans, track bookings, and monitor service health</p>
        </div>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center">
              <div className="text-muted small">Total Bookings</div>
              <div className="display-6 fw-bold text-primary">{analytics.totalBookings}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center">
              <div className="text-muted small">Active Jobs</div>
              <div className="display-6 fw-bold text-warning">{analytics.activeJobs}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center">
              <div className="text-muted small">Approved Artisans</div>
              <div className="display-6 fw-bold text-success">{analytics.approvedArtisans}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 text-center">
              <div className="text-muted small">Commission Earned</div>
              <div className="display-6 fw-bold text-info">
                KES {analytics.estateCommission.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}>
            <i className="fa-solid fa-chart-line me-1"></i> Overview
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'artisans' ? 'active' : ''}`}
            onClick={() => setActiveTab('artisans')}>
            <i className="fa-solid fa-users me-1"></i> Artisans ({approvedArtisans.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''} position-relative`}
            onClick={() => setActiveTab('pending')}>
            <i className="fa-solid fa-clock me-1"></i> Pending
            {pendingArtisans.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {pendingArtisans.length}
              </span>
            )}
          </button>
        </li>
      </ul>

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 p-4">
              <h5 className="fw-bold mb-3"><i className="fa-solid fa-chart-pie me-2"></i>Booking Breakdown</h5>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between">
                  <span>Completed</span>
                  <span className="badge bg-success rounded-pill">{analytics.completedBookings}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Pending</span>
                  <span className="badge bg-warning rounded-pill">{analytics.pendingBookings}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Cancelled</span>
                  <span className="badge bg-danger rounded-pill">{analytics.cancelledBookings}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 p-4">
              <h5 className="fw-bold mb-3"><i className="fa-solid fa-trophy me-2"></i>Top Artisans</h5>
              {analytics.topArtisans.length === 0 && (
                <p className="text-muted">No completed jobs yet.</p>
              )}
              {analytics.topArtisans.map((a, i) => (
                <div key={a.artisanId} className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <span className="badge bg-light text-dark me-2">#{i + 1}</span>
                    <strong>{a.name}</strong>
                    <span className="text-muted small ms-2">{a.skillType}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-success fw-bold">{a.completedJobs} jobs</span>
                    <span className="text-warning ms-2">★ {a.avgRating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4 p-4">
              <h5 className="fw-bold mb-3"><i className="fa-solid fa-money-bill-wave me-2"></i>Financial Summary</h5>
              <div className="row text-center">
                <div className="col-4">
                  <div className="text-muted small">Total Job Value</div>
                  <div className="h4 fw-bold">KES {analytics.totalJobValue.toLocaleString()}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Estate Commission</div>
                  <div className="h4 fw-bold text-success">KES {analytics.estateCommission.toLocaleString()}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Avg Rating</div>
                  <div className="h4 fw-bold text-warning">★ {analytics.avgRating.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved Artisans Tab */}
      {activeTab === 'artisans' && (
        <>
          {/* Add Artisan by Name Search */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h5 className="fw-bold mb-3"><i className="fa-solid fa-user-plus me-2"></i>Add Artisan to Estate</h5>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search artisan by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2}>
                {searching ? <span className="spinner-border spinner-border-sm" /> : <i className="fa-solid fa-search"></i>}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="list-group">
                {searchResults.map(r => (
                  <div key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{r.firstName} {r.lastName}</strong>
                      <span className="text-muted small ms-2">{r.locationName}</span>
                      <div className="small">
                        {r.skills?.map((s: any) => (
                          <span key={s.skillType} className="badge bg-info rounded-pill me-1">{s.skillType}</span>
                        ))}
                        <span className="text-warning ms-1">★ {r.trustScore?.toFixed(1) || '0.0'}</span>
                        <span className="text-muted ms-2">{r.totalJobsCompleted} jobs</span>
                        {r.vettingLevel === 'PRO' && <span className="badge bg-warning ms-2">PRO</span>}
                        {r.vettingLevel === 'VERIFIED' && <span className="badge bg-info ms-2">Verified</span>}
                      </div>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Note (optional)"
                        style={{ width: 150 }}
                        value={addingId === r.id ? addNote : ''}
                        onChange={e => { setAddingId(r.id); setAddNote(e.target.value); }}
                      />
                      <button
                        className="btn btn-success btn-sm"
                        disabled={addingId === r.id && addingId !== r.id}
                        onClick={() => handleAddArtisan(r.id)}
                      >
                        {addingId === r.id ? <span className="spinner-border spinner-border-sm" /> : <i className="fa-solid fa-plus"></i>}
                        {' '}Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
              <p className="text-muted small mb-0">No artisans found matching &quot;{searchQuery}&quot;</p>
            )}
          </div>

          {/* Approved Artisans Table */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Artisan</th>
                      <th>Skill</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedArtisans.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted py-4">No approved artisans yet</td></tr>
                    )}
                    {approvedArtisans.map(a => (
                      <tr key={a.approvalId}>
                        <td className="fw-medium">{a.artisanName}</td>
                        <td><span className="badge bg-info rounded-pill">{a.skillType}</span></td>
                        <td>{a.rating ? `★ ${a.rating.toFixed(1)}` : '—'}</td>
                        <td>
                          <span className={`badge rounded-pill ${
                            a.approvalStatus === 'APPROVED' ? 'bg-success' :
                            a.approvalStatus === 'REJECTED' ? 'bg-danger' : 'bg-warning'
                          }`}>{a.approvalStatus}</span>
                        </td>
                        <td className="text-muted small">{new Date(a.approvedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pending Verification Queue */}
      {activeTab === 'pending' && (
        <div className="row g-3">
          {pendingArtisans.length === 0 && (
            <div className="col-12 text-center py-5">
              <i className="fa-solid fa-check-circle fs-1 text-success mb-3 d-block"></i>
              <h5>All caught up!</h5>
              <p className="text-muted">No pending artisan applications.</p>
            </div>
          )}
          {pendingArtisans.map(a => (
            <div key={a.approvalId} className="col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 48, height: 48 }}>
                    <i className="fa-solid fa-user-hard-hat text-primary"></i>
                  </div>
                  <div className="ms-3">
                    <h6 className="fw-bold mb-0">{a.artisanName}</h6>
                    <span className="badge bg-info rounded-pill">{a.skillType}</span>
                  </div>
                </div>
                {a.rating && (
                  <p className="small mb-2">
                    <span className="text-warning">★</span> {a.rating.toFixed(1)} rating
                  </p>
                )}
                {a.note && <p className="small text-muted mb-3">{a.note}</p>}
                <div className="mb-2">
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-3"
                    placeholder="Rejection reason (optional)"
                    value={processingId === a.approvalId ? rejectionReason : ''}
                    onChange={e => { setProcessingId(a.approvalId); setRejectionReason(e.target.value); }}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success btn-sm flex-grow-1 rounded-3"
                    disabled={processingId === a.approvalId && rejectionReason !== ''}
                    onClick={() => handleDecision(a.approvalId, 'APPROVED')}
                  >
                    <i className="fa-solid fa-check me-1"></i> Approve
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm flex-grow-1 rounded-3"
                    onClick={() => handleDecision(a.approvalId, 'REJECTED')}
                  >
                    <i className="fa-solid fa-times me-1"></i> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
