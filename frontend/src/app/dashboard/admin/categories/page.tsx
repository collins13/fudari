'use client';

import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  artisanCount?: number;
}

const ICON_OPTIONS = [
  'fa-bolt', 'fa-faucet-drip', 'fa-screwdriver-wrench', 'fa-paint-roller', 'fa-tree',
  'fa-hammer', 'fa-fire', 'fa-shield-halved', 'fa-solar-panel', 'fa-bug',
  'fa-droplet', 'fa-key', 'fa-video', 'fa-couch', 'fa-broom', 'fa-hard-hat',
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', icon: '', description: '', sortOrder: '0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesAPI.getAllCategories();
      setCategories(res.data || []);
    } catch { setCategories([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', icon: 'fa-wrench', description: '', sortOrder: '0' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      icon: cat.icon || '',
      description: cat.description || '',
      sortOrder: String(cat.sortOrder),
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await categoriesAPI.updateCategory(editing.id, {
          name: form.name,
          icon: form.icon || undefined,
          description: form.description || undefined,
          sortOrder: parseInt(form.sortOrder) || 0,
        });
        setToast({ msg: 'Category updated', type: 'success' });
      } else {
        await categoriesAPI.createCategory({
          name: form.name,
          icon: form.icon || undefined,
          description: form.description || undefined,
          sortOrder: parseInt(form.sortOrder) || 0,
        });
        setToast({ msg: 'Category created', type: 'success' });
      }
      setShowForm(false);
      fetchCategories();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await categoriesAPI.updateCategory(cat.id, { isActive: !cat.isActive });
      setToast({ msg: `Category ${cat.isActive ? 'deactivated' : 'activated'}`, type: 'success' });
      fetchCategories();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Failed to toggle', type: 'danger' });
    }
  };

  const handleDelete = async (cat: Category) => {
    setDeleteCategory(null);
    try {
      await categoriesAPI.deleteCategory(cat.id);
      setToast({ msg: 'Category deleted', type: 'success' });
      fetchCategories();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Failed to delete', type: 'danger' });
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Category Management</h4>
          <p className="text-muted mb-0">Manage service categories displayed on the platform</p>
        </div>
        <button className="btn btn-primary rounded-5" onClick={openAdd}>
          <i className="fa-solid fa-plus me-2"></i>New Category
        </button>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : categories.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fa-solid fa-layer-group text-muted mb-3" style={{ fontSize: 48 }}></i>
            <h5>No Categories Yet</h5>
            <button className="btn btn-primary rounded-5 mt-2" onClick={openAdd}>Create First Category</button>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 50 }}>Icon</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Artisans</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.sort((a, b) => a.sortOrder - b.sortOrder).map((cat) => (
                  <tr key={cat.id} className={cat.isActive ? '' : 'text-muted'}>
                    <td>
                      {cat.icon ? <i className={`fa-solid ${cat.icon}`} style={{ fontSize: 20 }}></i> : <span className="text-muted">—</span>}
                    </td>
                    <td className="fw-medium">{cat.name}</td>
                    <td className="text-muted small text-truncate" style={{ maxWidth: 200 }}>{cat.description || '—'}</td>
                    <td>{cat.artisanCount ?? '—'}</td>
                    <td>{cat.sortOrder}</td>
                    <td>
                      <span className={`badge text-bg-${cat.isActive ? 'success' : 'secondary'}`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openEdit(cat)}>
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" title={cat.isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(cat)}>
                          <i className={`fa-solid ${cat.isActive ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => setDeleteCategory(cat)}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteCategory && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDeleteCategory(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Delete Category</h5>
                <button className="btn-close" onClick={() => setDeleteCategory(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-0">
                  Delete category "{deleteCategory.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setDeleteCategory(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger rounded-5" onClick={() => void handleDelete(deleteCategory)}>
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{editing ? 'Edit Category' : 'New Category'}</h5>
                <button className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                <div className="mb-3">
                  <label className="form-label fw-medium">Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. Solar Installation"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Icon</label>
                  <div className="d-flex flex-wrap gap-2">
                    {ICON_OPTIONS.map((icon) => (
                      <button key={icon} type="button"
                        className={`btn btn-sm ${form.icon === icon ? 'btn-primary' : 'btn-outline-secondary'} rounded-circle`}
                        style={{ width: 40, height: 40 }}
                        onClick={() => setForm({ ...form, icon })}>
                        <i className={`fa-solid ${icon}`}></i>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Description</label>
                  <textarea className="form-control" rows={2} placeholder="Short description..."
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Sort Order</label>
                  <input type="number" className="form-control" min="0"
                    value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary rounded-5" disabled={saving} onClick={handleSave}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
