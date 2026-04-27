'use client';
import { useState, useEffect } from 'react';
import { estatesAPI, workersAPI } from '@/lib/api';

interface Estate {
  id: number;
  name: string;
  slug: string;
  area: string;
  unitCount: number;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  monthlyFee: number;
  contractStartDate: string;
  contractEndDate: string;
  isActive: boolean;
  bookingUrl: string;
}

interface EstateAnalytics {
  estateId: number;
  estateName: string;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  approvedArtisans: number;
  topArtisans: { artisanId: number; artisanName: string; jobCount: number }[];
}

interface ApprovedArtisan {
  id: number;
  artisanId: number;
  artisanName: string;
  approvedBy: string;
  note: string;
  createdAt: string;
}

export default function EstateAdminPage() {
  const [estates, setEstates] = useState<Estate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEstate, setEditingEstate] = useState<Estate | null>(null);
  const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
  const [analytics, setAnalytics] = useState<EstateAnalytics | null>(null);
  const [approvedArtisans, setApprovedArtisans] = useState<ApprovedArtisan[]>([]);
  const [artisanSearchId, setArtisanSearchId] = useState('');
  const [artisanNote, setArtisanNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    name: '', area: '', latitude: '', longitude: '', unitCount: '',
    managerName: '', managerPhone: '', managerEmail: '',
    monthlyFee: '', contractStartDate: '', contractEndDate: '',
  });

  const fetchEstates = async () => {
    try {
      const res = await estatesAPI.getAll();
      setEstates(res.data);
    } catch (err) {
      console.error('Failed to fetch estates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstates(); }, []);

  const resetForm = () => {
    setForm({ name: '', area: '', latitude: '', longitude: '', unitCount: '',
      managerName: '', managerPhone: '', managerEmail: '',
      monthlyFee: '', contractStartDate: '', contractEndDate: '' });
    setEditingEstate(null);
    setShowForm(false);
  };

  const handleEdit = (estate: Estate) => {
    setForm({
      name: estate.name, area: estate.area, latitude: '', longitude: '',
      unitCount: String(estate.unitCount || ''),
      managerName: estate.managerName || '', managerPhone: estate.managerPhone || '',
      managerEmail: estate.managerEmail || '',
      monthlyFee: String(estate.monthlyFee || ''),
      contractStartDate: estate.contractStartDate || '',
      contractEndDate: estate.contractEndDate || '',
    });
    setEditingEstate(estate);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name, area: form.area,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        unitCount: form.unitCount ? parseInt(form.unitCount) : undefined,
        managerName: form.managerName || undefined,
        managerPhone: form.managerPhone || undefined,
        managerEmail: form.managerEmail || undefined,
        monthlyFee: form.monthlyFee ? parseFloat(form.monthlyFee) : undefined,
        contractStartDate: form.contractStartDate || undefined,
        contractEndDate: form.contractEndDate || undefined,
      };
      if (editingEstate) {
        await estatesAPI.update(editingEstate.id, payload);
      } else {
        await estatesAPI.create(payload);
      }
      resetForm();
      fetchEstates();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save estate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this estate?')) return;
    try {
      await estatesAPI.delete(id);
      fetchEstates();
      if (selectedEstate?.id === id) setSelectedEstate(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSelectEstate = async (estate: Estate) => {
    setSelectedEstate(estate);
    try {
      const [analyticsRes, artisansRes] = await Promise.all([
        estatesAPI.getAnalytics(estate.id),
        estatesAPI.getApprovedArtisans(estate.id),
      ]);
      setAnalytics(analyticsRes.data);
      setApprovedArtisans(artisansRes.data);
    } catch (err) {
      console.error('Failed to load estate details:', err);
    }
  };

  const handleApproveArtisan = async () => {
    if (!selectedEstate || !artisanSearchId) return;
    try {
      await estatesAPI.approveArtisan(selectedEstate.id, {
        artisanId: parseInt(artisanSearchId),
        note: artisanNote || undefined,
      });
      setArtisanSearchId('');
      setArtisanNote('');
      const res = await estatesAPI.getApprovedArtisans(selectedEstate.id);
      setApprovedArtisans(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve artisan');
    }
  };

  const handleRemoveArtisan = async (artisanId: number) => {
    if (!selectedEstate) return;
    try {
      await estatesAPI.removeArtisan(selectedEstate.id, artisanId);
      const res = await estatesAPI.getApprovedArtisans(selectedEstate.id);
      setApprovedArtisans(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove artisan');
    }
  };

  const copyBookingUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Booking URL copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Estate Partnerships</h4>
          <p className="text-muted mb-0">Manage estate distribution channels and artisan approvals</p>
        </div>
        <button className="btn btn-primary rounded-3" onClick={() => { resetForm(); setShowForm(true); }}>
          <i className="fa-solid fa-plus me-1"></i> Add Estate
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h5 className="fw-semibold mb-3">{editingEstate ? 'Edit Estate' : 'Add New Estate'}</h5>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium">Estate Name *</label>
                  <input className="form-control" required value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Greenpark Athi River" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium">Area *</label>
                  <input className="form-control" required value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })} placeholder="e.g. Athi River, Machakos" />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Latitude</label>
                  <input className="form-control" value={form.latitude} type="number" step="any"
                    onChange={e => setForm({ ...form, latitude: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Longitude</label>
                  <input className="form-control" value={form.longitude} type="number" step="any"
                    onChange={e => setForm({ ...form, longitude: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Units</label>
                  <input className="form-control" value={form.unitCount} type="number"
                    onChange={e => setForm({ ...form, unitCount: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Monthly Fee (KES)</label>
                  <input className="form-control" value={form.monthlyFee} type="number"
                    onChange={e => setForm({ ...form, monthlyFee: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Manager Name</label>
                  <input className="form-control" value={form.managerName}
                    onChange={e => setForm({ ...form, managerName: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Manager Phone</label>
                  <input className="form-control" value={form.managerPhone}
                    onChange={e => setForm({ ...form, managerPhone: e.target.value })} placeholder="+254..." />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Manager Email</label>
                  <input className="form-control" value={form.managerEmail} type="email"
                    onChange={e => setForm({ ...form, managerEmail: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contract Start</label>
                  <input className="form-control" type="date" value={form.contractStartDate}
                    onChange={e => setForm({ ...form, contractStartDate: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contract End</label>
                  <input className="form-control" type="date" value={form.contractEndDate}
                    onChange={e => setForm({ ...form, contractEndDate: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary rounded-3" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {editingEstate ? 'Update' : 'Create'} Estate
                </button>
                <button type="button" className="btn btn-light rounded-3" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Estate list */}
        <div className={selectedEstate ? 'col-md-5' : 'col-12'}>
          {estates.length === 0 ? (
            <div className="card border-0 shadow-sm p-5 text-center">
              <i className="fa-solid fa-building-circle-xmark fs-1 text-muted mb-3"></i>
              <h5>No estates yet</h5>
              <p className="text-muted">Add your first estate partnership to start distributing through residential communities.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {estates.map(estate => (
                <div key={estate.id}
                  className={`card border-0 shadow-sm cursor-pointer ${selectedEstate?.id === estate.id ? 'border-primary border-2' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSelectEstate(estate)}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-bold mb-1">{estate.name}</h6>
                        <div className="text-muted small">
                          <i className="fa-solid fa-location-dot me-1"></i>{estate.area}
                          {estate.unitCount > 0 && <span className="ms-2">• {estate.unitCount} units</span>}
                        </div>
                        {estate.managerName && (
                          <div className="text-muted small mt-1">
                            <i className="fa-solid fa-user me-1"></i>{estate.managerName}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-1">
                        <span className={`badge ${estate.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {estate.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {estate.monthlyFee > 0 && (
                          <span className="badge text-bg-info">KES {estate.monthlyFee.toLocaleString()}/mo</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary rounded-3" onClick={(e) => { e.stopPropagation(); handleEdit(estate); }}>
                        <i className="fa-solid fa-pen-to-square me-1"></i>Edit
                      </button>
                      <button className="btn btn-sm btn-outline-secondary rounded-3" onClick={(e) => { e.stopPropagation(); copyBookingUrl(estate.bookingUrl); }}>
                        <i className="fa-solid fa-link me-1"></i>Copy URL
                      </button>
                      <button className="btn btn-sm btn-outline-danger rounded-3" onClick={(e) => { e.stopPropagation(); handleDelete(estate.id); }}>
                        <i className="fa-solid fa-trash me-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estate detail panel */}
        {selectedEstate && (
          <div className="col-md-7">
            {/* Analytics */}
            {analytics && (
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body p-4">
                  <h5 className="fw-semibold mb-3">
                    <i className="fa-solid fa-chart-bar text-primary me-2"></i>
                    {analytics.estateName} — Analytics
                  </h5>
                  <div className="row g-3 mb-3">
                    {[
                      { label: 'Total Bookings', value: analytics.totalBookings, icon: 'fa-calendar', color: 'primary' },
                      { label: 'Completed', value: analytics.completedBookings, icon: 'fa-check-circle', color: 'success' },
                      { label: 'Pending', value: analytics.pendingBookings, icon: 'fa-clock', color: 'warning' },
                      { label: 'Cancelled', value: analytics.cancelledBookings, icon: 'fa-xmark-circle', color: 'danger' },
                    ].map(stat => (
                      <div key={stat.label} className="col-6 col-md-3">
                        <div className={`text-center p-3 bg-${stat.color} bg-opacity-10 rounded-3`}>
                          <div className={`fs-3 fw-bold text-${stat.color}`}>{stat.value}</div>
                          <div className="text-muted small">{stat.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {analytics.topArtisans.length > 0 && (
                    <>
                      <h6 className="fw-medium mt-3 mb-2">Top Artisans</h6>
                      <ul className="list-unstyled mb-0">
                        {analytics.topArtisans.map(a => (
                          <li key={a.artisanId} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <span>{a.artisanName}</span>
                            <span className="badge text-bg-primary">{a.jobCount} jobs</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Booking URL */}
                  <div className="mt-3 p-3 bg-light rounded-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted fw-medium">Booking URL (share with residents)</small>
                        <div className="font-monospace small text-primary">{selectedEstate.bookingUrl}</div>
                      </div>
                      <button className="btn btn-sm btn-primary rounded-3" onClick={() => copyBookingUrl(selectedEstate.bookingUrl)}>
                        <i className="fa-solid fa-copy"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Approved Artisans */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-semibold mb-3">
                  <i className="fa-solid fa-user-check text-success me-2"></i>
                  Approved Artisans ({approvedArtisans.length})
                </h5>
                <p className="text-muted small mb-3">
                  Approved artisans get a ranking boost for bookings from this estate. They still appear in general search.
                </p>

                {/* Add artisan */}
                <div className="d-flex gap-2 mb-3">
                  <input className="form-control form-control-sm" placeholder="Artisan ID"
                    value={artisanSearchId} onChange={e => setArtisanSearchId(e.target.value)} type="number" />
                  <input className="form-control form-control-sm" placeholder="Note (optional)"
                    value={artisanNote} onChange={e => setArtisanNote(e.target.value)} />
                  <button className="btn btn-sm btn-success rounded-3 text-nowrap" onClick={handleApproveArtisan}
                    disabled={!artisanSearchId}>
                    <i className="fa-solid fa-plus me-1"></i>Approve
                  </button>
                </div>

                {approvedArtisans.length === 0 ? (
                  <div className="text-muted text-center py-3">No artisans approved yet</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Artisan</th>
                          <th>Note</th>
                          <th>Approved</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedArtisans.map(a => (
                          <tr key={a.id}>
                            <td className="fw-medium">{a.artisanName} <span className="text-muted small">(#{a.artisanId})</span></td>
                            <td className="text-muted small">{a.note || '—'}</td>
                            <td className="text-muted small">{new Date(a.createdAt).toLocaleDateString('en-KE')}</td>
                            <td>
                              <button className="btn btn-sm btn-outline-danger rounded-3" onClick={() => handleRemoveArtisan(a.artisanId)}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
