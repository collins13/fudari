'use client';
import { useState, useEffect } from 'react';
import { listingsAPI, reportsAPI, adminUsersAPI } from '@/lib/api';

interface Listing {
  id: number;
  title: string;
  description: string;
  skillType: string;
  skillTypeLabel: string;
  artisanName: string;
  artisanPhone: string;
  priceStart: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  images: string | null;
  artisanRating: number;
  artisanTotalReviews: number;
  viewCount: number;
}

interface Report {
  id: number;
  reportedArtisanName: string;
  reason: string;
  status: string;
}

type TabType = 'Pending' | 'All';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    REVOKED: 'dark',
  };
  return (
    <span className={`badge text-bg-${map[status] || 'secondary'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabType>('Pending');
  const [listings, setListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        listingsAPI.adminGetPending(),
        listingsAPI.adminGetAll(),
      ]);
      const pending = pendingRes.data?.content || pendingRes.data || [];
      const all = allRes.data?.content || allRes.data || [];
      setListings(tab === 'Pending' ? pending : all);
      setAllListings(all);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const res = await reportsAPI.getPendingReports();
      setPendingReports(res.data || []);
    } catch {
      setPendingReports([]);
    }
  };

  useEffect(() => { loadListings(); loadReports(); }, [tab]);

  const showToast = (msg: string, type: 'success' | 'danger') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await listingsAPI.adminApprove(id);
      showToast(`Listing #${id} approved.`, 'success');
      loadListings();
    } catch {
      showToast('Action failed.', 'danger');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await listingsAPI.adminReject(id);
      showToast(`Listing #${id} rejected.`, 'success');
      loadListings();
    } catch {
      showToast('Action failed.', 'danger');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('Revoke this listing? It will be hidden from customers immediately.')) return;
    setActionLoading(id);
    try {
      await adminUsersAPI.revokeListing(id);
      showToast(`Listing #${id} revoked.`, 'success');
      loadListings();
    } catch {
      showToast('Action failed.', 'danger');
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const totalListings = allListings.length;
  const approvedCount = allListings.filter((l) => l.status === 'APPROVED').length;
  const pendingCount = allListings.filter((l) => l.status === 'PENDING').length;
  const totalReviews = allListings.reduce((sum, l) => sum + (l.artisanTotalReviews || 0), 0);
  const avgRating = allListings.length > 0
    ? (allListings.reduce((sum, l) => sum + (l.artisanRating || 0), 0) / allListings.length).toFixed(1)
    : '0.0';

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1">Admin — Dashboard</h4>
          <p className="text-muted mb-0">Manage listings, artisans, and reports</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm rounded-5" onClick={loadListings}>
          <i className="fa-solid fa-rotate-right me-1"></i>Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Listings', value: totalListings, icon: 'fa-list', color: '#0d6efd' },
          { label: 'Approved', value: approvedCount, icon: 'fa-circle-check', color: '#198754' },
          { label: 'Pending Review', value: pendingCount, icon: 'fa-clock', color: '#ffc107' },
          { label: 'Avg Rating', value: avgRating, icon: 'fa-star', color: '#fd7e14' },
          { label: 'Total Reviews', value: totalReviews, icon: 'fa-comments', color: '#6f42c1' },
          { label: 'Open Reports', value: pendingReports.length, icon: 'fa-flag', color: '#dc3545' },
        ].map((s, i) => (
          <div key={i} className="col-sm-6 col-xl-2">
            <div className="card border-0 shadow-sm p-3">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 40, height: 40, background: s.color + '15' }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 16 }}></i>
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

      {toast && (
        <div className={`alert alert-${toast.type} d-flex align-items-center gap-2 mb-3`} role="alert">
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <ul className="nav nav-pills gap-2">
            {(['Pending', 'All'] as TabType[]).map((t) => (
              <li key={t} className="nav-item">
                <button
                  className={`nav-link rounded-5 ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                  style={tab === t ? {} : { color: '#6c757d' }}
                >
                  {t === 'Pending' ? 'Awaiting Approval' : 'All Listings'}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fa-solid fa-inbox" style={{ fontSize: 48 }}></i>
              <p className="mt-3 mb-0">No listings found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Artisan</th>
                    <th>Rating</th>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Views</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <td className="ps-4 text-muted small">#{l.id}</td>
                      <td>
                        <div className="fw-medium" style={{ maxWidth: 180 }}>{l.title}</div>
                        <div className="text-muted" style={{ fontSize: 11, maxWidth: 180 }}>
                          {l.description?.slice(0, 50)}{l.description?.length > 50 ? '...' : ''}
                        </div>
                      </td>
                      <td><span className="badge text-bg-light border">{l.skillTypeLabel || l.skillType}</span></td>
                      <td className="fw-medium">{l.artisanName}</td>
                      <td>
                        <span className="text-warning small">
                          <i className="fa-solid fa-star me-1"></i>
                          {l.artisanRating ? l.artisanRating.toFixed(1) : '—'}
                        </span>
                        {l.artisanTotalReviews > 0 && (
                          <span className="text-muted small ms-1">({l.artisanTotalReviews})</span>
                        )}
                      </td>
                      <td className="text-muted small">{l.location || '—'}</td>
                      <td className="text-success fw-medium">
                        {l.priceStart ? `KES ${l.priceStart}` : '—'}
                      </td>
                      <td className="text-muted small">
                        <i className="fa-solid fa-eye me-1"></i>{l.viewCount || 0}
                      </td>
                      <td><StatusBadge status={l.status} /></td>
                      <td className="text-muted small">
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-KE') : '—'}
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex gap-2 justify-content-end flex-wrap">
                          <button className="btn btn-sm btn-outline-primary rounded-3"
                            onClick={() => setPreviewListing(l)}>
                            <i className="fa-solid fa-eye me-1"></i>View
                          </button>
                          {l.status === 'PENDING' && (
                            <>
                              <button className="btn btn-sm btn-success rounded-3"
                                disabled={actionLoading === l.id}
                                onClick={() => handleApprove(l.id)}>
                                {actionLoading === l.id ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <><i className="fa-solid fa-check me-1"></i>Approve</>
                                )}
                              </button>
                              <button className="btn btn-sm btn-outline-danger rounded-3"
                                disabled={actionLoading === l.id}
                                onClick={() => handleReject(l.id)}>
                                <i className="fa-solid fa-xmark me-1"></i>Reject
                              </button>
                            </>
                          )}
                          {l.status === 'APPROVED' && (
                            <button className="btn btn-sm btn-outline-warning rounded-3"
                              disabled={actionLoading === l.id}
                              onClick={() => handleRevoke(l.id)}>
                              <i className="fa-solid fa-rotate-left me-1"></i>Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewListing && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{previewListing.title}</h5>
                <button type="button" className="btn-close" onClick={() => setPreviewListing(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Category</div>
                    <div>{previewListing.skillTypeLabel || previewListing.skillType}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Status</div>
                    <StatusBadge status={previewListing.status} />
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Artisan</div>
                    <div>{previewListing.artisanName} — {previewListing.artisanPhone}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Rating</div>
                    <div>
                      <span className="text-warning"><i className="fa-solid fa-star me-1"></i></span>
                      {previewListing.artisanRating ? previewListing.artisanRating.toFixed(1) : 'No rating'}
                      {previewListing.artisanTotalReviews > 0 && (
                        <span className="text-muted small ms-1">({previewListing.artisanTotalReviews} reviews)</span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Price</div>
                    <div className="text-success fw-medium">
                      {previewListing.priceStart ? `KES ${previewListing.priceStart}` : 'Not specified'}
                    </div>
                  </div>
                  {previewListing.location && (
                    <div className="col-md-6">
                      <div className="text-muted small fw-semibold text-uppercase mb-1">Location</div>
                      <div>{previewListing.location}</div>
                    </div>
                  )}
                  <div className="col-12">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Description</div>
                    <p className="mb-0">{previewListing.description}</p>
                  </div>
                  {previewListing.images && (() => {
                    try {
                      const imgs = JSON.parse(previewListing.images);
                      if (Array.isArray(imgs) && imgs.length > 0) {
                        return (
                          <div className="col-12">
                            <div className="text-muted small fw-semibold text-uppercase mb-2">Images</div>
                            <div className="d-flex gap-2 flex-wrap">
                              {imgs.map((src: string, i: number) => (
                                <img key={i} src={src} alt={`img-${i}`} className="rounded"
                                  style={{ width: 120, height: 90, objectFit: 'cover' }} />
                              ))}
                            </div>
                          </div>
                        );
                      }
                    } catch { /* ignore */ }
                    return null;
                  })()}
                </div>
              </div>
              <div className="modal-footer border-0">
                {previewListing.status === 'PENDING' && (
                  <>
                    <button className="btn btn-success rounded-5"
                      onClick={() => { handleApprove(previewListing.id); setPreviewListing(null); }}>
                      <i className="fa-solid fa-check me-2"></i>Approve
                    </button>
                    <button className="btn btn-danger rounded-5"
                      onClick={() => { handleReject(previewListing.id); setPreviewListing(null); }}>
                      <i className="fa-solid fa-xmark me-2"></i>Reject
                    </button>
                  </>
                )}
                {previewListing.status === 'APPROVED' && (
                  <button className="btn btn-warning rounded-5"
                    onClick={() => { handleRevoke(previewListing.id); setPreviewListing(null); }}>
                    <i className="fa-solid fa-rotate-left me-2"></i>Revoke Listing
                  </button>
                )}
                <button className="btn btn-secondary rounded-5" onClick={() => setPreviewListing(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
