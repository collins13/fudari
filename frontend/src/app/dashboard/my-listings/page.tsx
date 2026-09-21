'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { listingsAPI } from '@/lib/api';

interface Listing {
  id: number;
  title: string;
  skillType: string;
  skillTypeLabel: string;
  priceStart: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  viewCount: number;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'APPROVED' ? 'success' :
    status === 'PENDING' ? 'warning' :
    status === 'REJECTED' ? 'danger' : 'secondary';
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`badge text-bg-${cls}`}>{label}</span>;
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);

  const fetchListings = async () => {
    try {
      const res = await listingsAPI.getMyListings(0, 50);
      setListings(res.data?.content || res.data || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await listingsAPI.deleteListing(deleteId);
      setListings((prev) => prev.filter((l) => l.id !== deleteId));
      setToast({ msg: 'Listing deleted successfully', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Failed to delete listing', type: 'danger' });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const approvedCount = listings.filter((l) => l.status === 'APPROVED').length;
  const pendingCount = listings.filter((l) => l.status === 'PENDING').length;
  const rejectedCount = listings.filter((l) => l.status === 'REJECTED').length;

  return (
    <>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1">My Listings</h4>
          <p className="text-muted mb-0">Manage your service listings</p>
        </div>
        <Link href="/dashboard/add-listing" className="btn btn-primary rounded-5">
          <i className="fa-solid fa-plus me-2"></i>Add New Listing
        </Link>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Listings', value: listings.length, icon: 'fa-list', color: '#0d6efd' },
          { label: 'Approved', value: approvedCount, icon: 'fa-circle-check', color: '#198754' },
          { label: 'Pending Review', value: pendingCount, icon: 'fa-clock', color: '#ffc107' },
          { label: 'Rejected', value: rejectedCount, icon: 'fa-circle-xmark', color: '#dc3545' },
        ].map((s, i) => (
          <div key={i} className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm p-3">
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, background: s.color + '15' }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 18 }}></i>
                </div>
                <div>
                  <div className="text-muted small">{s.label}</div>
                  <h5 className="mb-0 fw-bold">{s.value}</h5>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Listings Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="mb-0 fw-semibold">All Listings ({listings.length})</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-5">
              <i className="fa-solid fa-folder-open text-muted" style={{ fontSize: 48 }}></i>
              <p className="text-muted mt-3 mb-3">No listings yet. Create your first listing!</p>
              <Link href="/dashboard/add-listing" className="btn btn-primary rounded-5">
                <i className="fa-solid fa-plus me-2"></i>Add Listing
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Title</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Location</th>
                    <th>Views</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="ps-4">
                        <div className="fw-medium">{listing.title}</div>
                      </td>
                      <td>
                        <span className="badge text-bg-light border">
                          {listing.skillTypeLabel || listing.skillType}
                        </span>
                      </td>
                      <td className="fw-medium text-success">
                        {listing.priceStart ? `KES ${listing.priceStart}` : 'Contact'}
                      </td>
                      <td className="text-muted small">
                        {listing.location || '—'}
                      </td>
                      <td className="text-muted small">
                        <i className="fa-solid fa-eye me-1"></i>{listing.viewCount || 0}
                      </td>
                      <td>
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className="text-muted small">
                        {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('en-KE') : '—'}
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex gap-2 justify-content-end">
                          <Link
                            href={`/dashboard/edit-listing/${listing.id}`}
                            className="btn btn-sm btn-outline-primary rounded-3"
                          >
                            <i className="fa-solid fa-pen me-1"></i>Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-3"
                            onClick={() => setDeleteId(listing.id)}
                          >
                            <i className="fa-solid fa-trash me-1"></i>Delete
                          </button>
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

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Delete Listing</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteId(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted">
                  Are you sure you want to delete this listing? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary rounded-5" onClick={() => setDeleteId(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger rounded-5" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  <i className="fa-solid fa-trash me-2"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
