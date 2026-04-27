'use client';

import { useState, useEffect, useCallback } from 'react';
import { workersAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SKILL_TYPES = [
  { label: 'Electrician', value: 'ELECTRICIAN' },
  { label: 'Plumber', value: 'PLUMBER' },
  { label: 'Mechanic', value: 'MECHANIC' },
  { label: 'Carpenter', value: 'CARPENTER' },
  { label: 'Painter', value: 'PAINTER' },
  { label: 'Welder', value: 'WELDER' },
  { label: 'HVAC Technician', value: 'HVAC_TECHNICIAN' },
  { label: 'Appliance Repair', value: 'APPLIANCE_REPAIR' },
  { label: 'Roofing', value: 'ROOFING' },
  { label: 'Tiling', value: 'TILING' },
  { label: 'Mason', value: 'MASON' },
  { label: 'Gardener', value: 'GARDENER' },
  { label: 'Cleaner', value: 'CLEANER' },
  { label: 'Security', value: 'SECURITY' },
  { label: 'Solar Technician', value: 'SOLAR_TECHNICIAN' },
  { label: 'Borehole Drilling', value: 'BOREHOLE_DRILLING' },
  { label: 'Fumigation', value: 'FUMIGATION' },
  { label: 'Water Tank Cleaning', value: 'WATER_TANK_CLEANING' },
  { label: 'Glass Fitter', value: 'GLASS_FITTER' },
  { label: 'Ceiling Board', value: 'CEILING_BOARD' },
  { label: 'Locksmith', value: 'LOCKSMITH' },
  { label: 'CCTV Installer', value: 'CCTV_INSTALLER' },
  { label: 'Interior Designer', value: 'INTERIOR_DESIGNER' },
  { label: 'Other', value: 'OTHER' },
];

interface Skill {
  id: number;
  skillType: string;
  description: string | null;
  experienceYears: number | null;
  hourlyRate: string | null;
  isVerified: boolean;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

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

  const openAdd = () => {
    setEditingSkill(null);
    setForm({ skillType: '', description: '', experienceYears: '', hourlyRate: '' });
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
    setError('');
    setShowForm(true);
  };

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
        });
        setToast({ msg: 'Skill updated', type: 'success' });
      } else {
        await workersAPI.addSkill(user.userId, {
          skillType: form.skillType,
          description: form.description || undefined,
          experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
          hourlyRate: form.hourlyRate || undefined,
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
    if (!confirm('Remove this skill?')) return;
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
                        <li><button className="dropdown-item text-danger" onClick={() => handleDelete(skill.id)}><i className="fa-solid fa-trash me-2"></i>Remove</button></li>
                      </ul>
                    </div>
                  </div>
                  {skill.description && <p className="text-muted small mb-2">{skill.description}</p>}
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
