'use client';

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface DocState {
  nationalId: string;
  certificateOfGoodConduct: string;
  tvetCertification: string;
}

function DocCard({
  label, description, icon, value, status,
  onChange, onError, accept,
}: {
  label: string; description: string; icon: string;
  value: string; status: 'missing' | 'uploaded' | 'verified';
  onChange: (base64: string) => void; accept: string;
  onError?: (msg: string) => void;
}) {
  const statusMap = {
    missing: { badge: 'text-bg-warning', text: 'Not Uploaded' },
    uploaded: { badge: 'text-bg-info', text: 'Pending Review' },
    verified: { badge: 'text-bg-success', text: 'Verified' },
  };
  const s = statusMap[status];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError?.('File too large (max 5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { onChange(ev.target?.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, background: 'var(--tx-primary-soft)' }}>
            <i className={`fa-solid ${icon}`} style={{ color: 'var(--bs-primary)', fontSize: 20 }}></i>
          </div>
          <span className={`badge ${s.badge}`}>{s.text}</span>
        </div>
        <h6 className="fw-bold mb-1">{label}</h6>
        <p className="text-muted small mb-3">{description}</p>

        {value ? (
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-file-circle-check text-success"></i>
            <span className="small text-muted flex-grow-1">Document uploaded</span>
            <label className="btn btn-sm btn-outline-secondary rounded-5" style={{ cursor: 'pointer' }}>
              <i className="fa-solid fa-arrow-rotate-right me-1"></i>Replace
              <input type="file" accept={accept} className="d-none" onChange={handleFile} />
            </label>
          </div>
        ) : (
          <label className="btn btn-sm btn-primary rounded-5 w-100" style={{ cursor: 'pointer' }}>
            <i className="fa-solid fa-upload me-2"></i>Upload Document
            <input type="file" accept={accept} className="d-none" onChange={handleFile} />
          </label>
        )}
      </div>
    </div>
  );
}

export default function VettingPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocState>({ nationalId: '', certificateOfGoodConduct: '', tvetCertification: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authAPI.getCurrentUser();
        const d = res.data;
        setDocs({
          nationalId: d.nationalId || '',
          certificateOfGoodConduct: d.certificateOfGoodConduct || '',
          tvetCertification: d.tvetCertification || '',
        });
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const updateDoc = (key: keyof DocState, value: string) => {
    setDocs((prev) => ({ ...prev, [key]: value }));
    setChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateFullProfile({
        nationalId: docs.nationalId || undefined,
        certificateOfGoodConduct: docs.certificateOfGoodConduct || undefined,
        tvetCertification: docs.tvetCertification || undefined,
      });
      setToast({ msg: 'Documents saved! An admin will review them shortly.', type: 'success' });
      setChanged(false);
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Failed to save documents', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const docStatus = (val: string): 'missing' | 'uploaded' | 'verified' => {
    if (!val) return 'missing';
    if (user?.isVerified) return 'verified';
    return 'uploaded';
  };

  const uploadedCount = [docs.nationalId, docs.certificateOfGoodConduct, docs.tvetCertification].filter(Boolean).length;
  const progress = Math.round((uploadedCount / 3) * 100);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Verification Documents</h4>
          <p className="text-muted mb-0">Upload your documents to get the <span className="badge text-bg-success">Verified</span> badge and rank higher in search</p>
        </div>
        {changed && (
          <button className="btn btn-primary rounded-5" disabled={saving} onClick={handleSave}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fa-solid fa-cloud-arrow-up me-2"></i>Save Documents</>}
          </button>
        )}
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {/* Progress */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold">Verification Progress</span>
            <span className="badge text-bg-primary">{uploadedCount}/3 documents</span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <div className={`progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}></div>
          </div>
          {progress === 100 && (
            <p className="text-success small mt-2 mb-0"><i className="fa-solid fa-circle-check me-1"></i>All documents uploaded! Admin will review and verify your account.</p>
          )}
        </div>
      </div>

      {/* Document Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <DocCard
            label="National ID / Passport"
            description="Kenyan National ID card or valid passport (front & back)"
            icon="fa-id-card"
            value={docs.nationalId}
            status={docStatus(docs.nationalId)}
            onChange={(v) => updateDoc('nationalId', v)}
            onError={(msg) => setToast({ msg, type: 'danger' })}
            accept="image/*,.pdf"
          />
        </div>
        <div className="col-md-4">
          <DocCard
            label="Certificate of Good Conduct"
            description="Police clearance certificate from DCI Kenya"
            icon="fa-shield-halved"
            value={docs.certificateOfGoodConduct}
            status={docStatus(docs.certificateOfGoodConduct)}
            onChange={(v) => updateDoc('certificateOfGoodConduct', v)}
            onError={(msg) => setToast({ msg, type: 'danger' })}
            accept="image/*,.pdf"
          />
        </div>
        <div className="col-md-4">
          <DocCard
            label="TVET Certification"
            description="Trade certificate from NITA, TVET, or recognized institution"
            icon="fa-award"
            value={docs.tvetCertification}
            status={docStatus(docs.tvetCertification)}
            onChange={(v) => updateDoc('tvetCertification', v)}
            onError={(msg) => setToast({ msg, type: 'danger' })}
            accept="image/*,.pdf"
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="card border-0 shadow-sm" style={{ background: '#f0f7ff' }}>
        <div className="card-body">
          <h6 className="fw-semibold mb-3"><i className="fa-solid fa-circle-info text-primary me-2"></i>Why Verify?</h6>
          <div className="row g-3">
            {[
              { text: 'Verified badge displayed on your profile', icon: 'fa-circle-check' },
              { text: 'Higher ranking in search results', icon: 'fa-arrow-up' },
              { text: '3× more booking requests from customers', icon: 'fa-chart-line' },
              { text: 'Access to premium/government contracts', icon: 'fa-briefcase' },
            ].map((item, i) => (
              <div key={i} className="col-md-6">
                <div className="d-flex gap-2 align-items-start">
                  <i className={`fa-solid ${item.icon} text-success mt-1`}></i>
                  <span className="small text-muted">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
