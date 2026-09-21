'use client';

import { useState, useEffect, useCallback } from 'react';
import { serviceOfferingsAPI, apiErrorMessage } from '@/lib/api';
import { SKILL_OPTIONS } from '@/lib/kenya';

interface Offering {
  id: number;
  name: string;
  slug: string;
  skillType: string;
  description: string | null;
  synonyms: string[];
  priceFromKes: number | null;
  priceToKes: number | null;
  isEmergency: boolean;
  isActive: boolean;
  indexable: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  artisanCount?: number;
}

const EMPTY_FORM = {
  name: '', slug: '', skillType: '', description: '', synonyms: '',
  priceFromKes: '', priceToKes: '', isEmergency: false, isActive: true,
  indexable: true, sortOrder: '0', seoTitle: '', seoDescription: '',
};

function skillLabel(value: string): string {
  return SKILL_OPTIONS.find((s) => s.value === value)?.label || value.replace(/_/g, ' ');
}

export default function AdminServicesPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Offering | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [deactivating, setDeactivating] = useState<Offering | null>(null);
  const [skillFilter, setSkillFilter] = useState('');

  const fetchOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await serviceOfferingsAPI.listAll();
      setOfferings(res.data || []);
      setLoadFailed(false);
    } catch {
      setOfferings([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOfferings(); }, [fetchOfferings]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (offering: Offering) => {
    setEditing(offering);
    setForm({
      name: offering.name,
      slug: offering.slug,
      skillType: offering.skillType,
      description: offering.description || '',
      synonyms: (offering.synonyms || []).join(', '),
      priceFromKes: offering.priceFromKes != null ? String(offering.priceFromKes) : '',
      priceToKes: offering.priceToKes != null ? String(offering.priceToKes) : '',
      isEmergency: offering.isEmergency,
      isActive: offering.isActive,
      indexable: offering.indexable,
      sortOrder: String(offering.sortOrder ?? 0),
      seoTitle: offering.seoTitle || '',
      seoDescription: offering.seoDescription || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.skillType) { setError('Select the parent trade'); return; }

    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      skillType: form.skillType,
      description: form.description || undefined,
      synonyms: form.synonyms.split(',').map((s) => s.trim()).filter(Boolean),
      priceFromKes: form.priceFromKes ? Number(form.priceFromKes) : undefined,
      priceToKes: form.priceToKes ? Number(form.priceToKes) : undefined,
      isEmergency: form.isEmergency,
      isActive: form.isActive,
      indexable: form.indexable,
      sortOrder: Number(form.sortOrder) || 0,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
    };

    try {
      if (editing) {
        await serviceOfferingsAPI.update(editing.id, payload);
        setToast({ msg: 'Service updated', type: 'success' });
      } else {
        await serviceOfferingsAPI.create(payload);
        setToast({ msg: 'Service created', type: 'success' });
      }
      setShowForm(false);
      fetchOfferings();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save service'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (offering: Offering) => {
    setDeactivating(null);
    try {
      await serviceOfferingsAPI.remove(offering.id);
      setToast({ msg: `${offering.name} deactivated`, type: 'success' });
      fetchOfferings();
    } catch (err) {
      setToast({ msg: apiErrorMessage(err, 'Failed to deactivate'), type: 'danger' });
    }
  };

  const visible = skillFilter ? offerings.filter((o) => o.skillType === skillFilter) : offerings;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Services</h4>
          <p className="text-muted mb-0">
            Specific bookable services under each trade. These drive the /services landing pages.
          </p>
        </div>
        <button className="btn btn-primary rounded-5" onClick={openAdd}>
          <i className="fa-solid fa-plus me-2"></i>Add Service
        </button>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      <div className="mb-3" style={{ maxWidth: 320 }}>
        <select className="form-select" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
          <option value="">All trades</option>
          {SKILL_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : loadFailed ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <h5 className="fw-semibold">Could not load services</h5>
            <p className="text-muted mb-3">The request failed. This is not the same as having no services.</p>
            <button className="btn btn-outline-primary rounded-5" onClick={fetchOfferings}>Try again</button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <h5 className="fw-semibold">No services yet</h5>
            <p className="text-muted mb-3">Add specific services so customers can search for exactly what they need.</p>
            <button className="btn btn-primary rounded-5" onClick={openAdd}>Add the first service</button>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Service</th>
                  <th>Trade</th>
                  <th>Price band</th>
                  <th>Providers</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((offering) => (
                  <tr key={offering.id}>
                    <td>
                      <div className="fw-semibold">
                        {offering.name}
                        {offering.isEmergency && <span className="badge bg-danger ms-2">24/7</span>}
                      </div>
                      <code className="small text-muted">/{offering.slug}</code>
                    </td>
                    <td className="small">{skillLabel(offering.skillType)}</td>
                    <td className="small">
                      {offering.priceFromKes && offering.priceToKes
                        ? `KES ${offering.priceFromKes.toLocaleString()}–${offering.priceToKes.toLocaleString()}`
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="small">{offering.artisanCount ?? 0}</td>
                    <td>
                      <span className={`badge ${offering.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {offering.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {!offering.indexable && <span className="badge text-bg-warning ms-1">noindex</span>}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-light me-1" onClick={() => openEdit(offering)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      {offering.isActive && (
                        <button className="btn btn-sm btn-light text-danger" onClick={() => setDeactivating(offering)}>
                          <i className="fa-solid fa-ban"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deactivating && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDeactivating(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Deactivate service</h5>
                <button className="btn-close" onClick={() => setDeactivating(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Hide <strong>{deactivating.name}</strong> from search and its landing page? Providers who
                  offer it keep the selection, and you can reactivate it later.
                </p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setDeactivating(null)}>Cancel</button>
                <button className="btn btn-danger rounded-5" onClick={() => void handleDeactivate(deactivating)}>
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{editing ? 'Edit service' : 'Add service'}</h5>
                <button className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2 small">{error}</div>}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Name <span className="text-danger">*</span></label>
                    <input className="form-control" placeholder="e.g. Drain Unblocking"
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Parent trade <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.skillType}
                      onChange={(e) => setForm({ ...form, skillType: e.target.value })}>
                      <option value="">Select trade...</option>
                      {SKILL_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Slug</label>
                    <input className="form-control" placeholder="auto-generated from name"
                      value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-medium">Price from (KES)</label>
                    <input type="number" className="form-control" min="0"
                      value={form.priceFromKes} onChange={(e) => setForm({ ...form, priceFromKes: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-medium">Price to (KES)</label>
                    <input type="number" className="form-control" min="0"
                      value={form.priceToKes} onChange={(e) => setForm({ ...form, priceToKes: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Description</label>
                    <textarea className="form-control" rows={2}
                      value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Search synonyms</label>
                    <input className="form-control" placeholder="blocked drain, choked sink, blocked toilet"
                      value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} />
                    <div className="form-text">Comma separated. How customers actually describe the problem.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">SEO title</label>
                    <input className="form-control"
                      value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Sort order</label>
                    <input type="number" className="form-control"
                      value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">SEO description</label>
                    <textarea className="form-control" rows={2}
                      value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
                  </div>
                  <div className="col-12 d-flex flex-wrap gap-4">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="isEmergency" checked={form.isEmergency}
                        onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })} />
                      <label className="form-check-label" htmlFor="isEmergency">Emergency / 24-7 callout</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="isActive" checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                      <label className="form-check-label" htmlFor="isActive">Active</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="indexable" checked={form.indexable}
                        onChange={(e) => setForm({ ...form, indexable: e.target.checked })} />
                      <label className="form-check-label" htmlFor="indexable">Indexable by search engines</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary rounded-5" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save service'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
