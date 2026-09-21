'use client';

import { useState, useEffect, useCallback } from 'react';
import { workersAPI, serviceOfferingsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SKILL_OPTIONS as SKILL_TYPES } from '@/lib/kenya';

interface ServiceRef {
  id: number;
  name: string;
  slug: string;
}

interface Offering extends ServiceRef {
  skillType: string;
  priceFromKes?: number;
  priceToKes?: number;
  isEmergency?: boolean;
}

interface Skill {
  id: number;
  skillType: string;
  description: string | null;
  experienceYears: number | null;
  hourlyRate: string | null;
  isVerified: boolean;
  services?: ServiceRef[];
}

function skillLabel(type: string): string {
  return SKILL_TYPES.find((s) => s.value === type)?.label || type.replace(/_/g, ' ');
}

export default function SkillsPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState({ skillType: '', description: '', experienceYears: '', hourlyRate: '' });
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [deleteSkillId, setDeleteSkillId] = useState<number | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const res = await workersAPI.getWorkerSkills(user.userId);
      setSkills(res.data || []);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  useEffect(() => {
    serviceOfferingsAPI.list()
      .then((res) => setOfferings(res.data || []))
      .catch(() => setOfferings([]));
  }, []);

  const openAdd = () => {
    setEditingSkill(null);
    setForm({ skillType: '', description: '', experienceYears: '', hourlyRate: '' });
    setSelectedServices([]);
    setError('');
    setShowForm(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({
      skillType: skill.skillType,
      description: skill.description || '',
      experienceYears: skill.experienceYears ? String(skill.experienceYears) : '',
      hourlyRate: skill.hourlyRate || '',
    });
    setSelectedServices((skill.services || []).map((s) => s.slug));
    setError('');
    setShowForm(true);
  };

  const toggleService = (slug: string) => {
    setSelectedServices((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  };

  const availableServices = offerings.filter((o) => o.skillType === form.skillType);

  const handleSave = async () => {
    if (!user?.userId) return;
    if (!editingSkill && !form.skillType) { setError('Select a skill type'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingSkill) {
        await workersAPI.updateSkill(editingSkill.id, {
          description: form.description || undefined,
          experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
          hourlyRate: form.hourlyRate || undefined,
          serviceSlugs: selectedServices,
        });
        setToast({ msg: 'Skill updated', type: 'success' });
      } else {
        await workersAPI.addSkill(user.userId, {
          skillType: form.skillType,
          description: form.description || undefined,
          experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
          hourlyRate: form.hourlyRate || undefined,
          serviceSlugs: selectedServices,
        });
        setToast({ msg: 'Skill added', type: 'success' });
      }
      setShowForm(false);
      fetchSkills();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skillId: number) => {
    setDeleteSkillId(null);
    try {
      await workersAPI.deleteSkill(skillId);
      setToast({ msg: 'Skill removed', type: 'success' });
      fetchSkills();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Failed to remove', type: 'danger' });
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">My Skills</h4>
          <p className="text-muted mb-0">Manage your skill set, experience, and hourly rates</p>
        </div>
        <button className="btn btn-primary rounded-5" onClick={openAdd}>
          <i className="fa-solid fa-plus me-2"></i>Add Skill
        </button>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {/* Skills Grid */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : skills.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fa-solid fa-toolbox text-muted mb-3" style={{ fontSize: 48 }}></i>
            <h5 className="fw-semibold">No Skills Added Yet</h5>
            <p className="text-muted mb-3">Add your skills to appear in search results and get more bookings.</p>
            <button className="btn btn-primary rounded-5" onClick={openAdd}>
              <i className="fa-solid fa-plus me-2"></i>Add Your First Skill
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {skills.map((skill) => (
            <div key={skill.id} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="fw-bold mb-1">{skillLabel(skill.skillType)}</h6>
                      {skill.isVerified && (
                        <span className="badge text-bg-success"><i className="fa-solid fa-circle-check me-1"></i>Verified</span>
                      )}
                    </div>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light rounded-circle" data-bs-toggle="dropdown">
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><button className="dropdown-item" onClick={() => openEdit(skill)}><i className="fa-solid fa-pen me-2"></i>Edit</button></li>
                        <li><button className="dropdown-item text-danger" onClick={() => setDeleteSkillId(skill.id)}><i className="fa-solid fa-trash me-2"></i>Remove</button></li>
                      </ul>
                    </div>
                  </div>
                  {skill.description && <p className="text-muted small mb-2">{skill.description}</p>}
                  {skill.services && skill.services.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {skill.services.map((service) => (
                        <span key={service.slug} className="badge text-bg-light border">{service.name}</span>
                      ))}
                    </div>
                  )}
                  <div className="d-flex gap-3 text-muted small">
                    {skill.experienceYears && (
                      <span><i className="fa-solid fa-clock me-1"></i>{skill.experienceYears} yrs</span>
                    )}
                    {skill.hourlyRate && (
                      <span><i className="fa-solid fa-money-bill me-1"></i>KES {skill.hourlyRate}/hr</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteSkillId !== null && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDeleteSkillId(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Remove Skill</h5>
                <button className="btn-close" onClick={() => setDeleteSkillId(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-0">Are you sure you want to remove this skill?</p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setDeleteSkillId(null)}>Cancel</button>
                <button className="btn btn-danger rounded-5" onClick={() => void handleDelete(deleteSkillId)}>Remove Skill</button>
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
                <h5 className="modal-title fw-bold">{editingSkill ? 'Edit Skill' : 'Add New Skill'}</h5>
                <button className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2 small">{error}</div>}

                {!editingSkill && (
                  <div className="mb-3">
                    <label className="form-label fw-medium">Skill Type <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.skillType} onChange={(e) => setForm({ ...form, skillType: e.target.value })}>
                      <option value="">Select skill...</option>
                      {SKILL_TYPES.filter((s) => !skills.some((sk) => sk.skillType === s.value)).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {availableServices.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-medium">Services you offer</label>
                    <p className="text-muted small mb-2">
                      Customers search for these directly. Picking them puts you on the matching service pages.
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {availableServices.map((service) => {
                        const checked = selectedServices.includes(service.slug);
                        return (
                          <button
                            type="button"
                            key={service.slug}
                            className={`btn btn-sm rounded-5 ${checked ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => toggleService(service.slug)}
                            aria-pressed={checked}
                          >
                            {service.name}
                            {service.isEmergency && <i className="fa-solid fa-bolt ms-1"></i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-medium">Description</label>
                  <textarea className="form-control" rows={3} placeholder="Describe your experience with this skill..."
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-medium">Years Experience</label>
                    <input type="number" className="form-control" min="0" max="50" placeholder="e.g. 5"
                      value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-medium">Hourly Rate (KES)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">KES</span>
                      <input type="number" className="form-control" min="0" placeholder="500"
                        value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary rounded-5" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary rounded-5" disabled={saving} onClick={handleSave}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : editingSkill ? 'Update Skill' : 'Add Skill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
