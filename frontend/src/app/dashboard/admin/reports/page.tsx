'use client';
import { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/api';

interface Report {
  id: number;
  reportedArtisanId: number;
  reportedArtisanName: string;
  reason: string;
  description: string;
  status: string;
  adminAction: string;
  adminNotes: string;
  createdAt: string;
  resolvedAt: string;
}

type TabType = 'Pending' | 'All';

const REASON_LABELS: Record<string, string> = {
  FRAUD: 'Fraud / Scam',
  POOR_QUALITY: 'Poor Quality Work',
  NO_SHOW: 'Did Not Show Up',
  RUDE_BEHAVIOR: 'Rude Behavior',
  OVERCHARGING: 'Overcharging',
  SAFETY_CONCERN: 'Safety Concern',
  OTHER: 'Other',
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'warning',
  REVIEWED: 'info',
  WARNING_ISSUED: 'primary',
  ARTISAN_SUSPENDED: 'danger',
  ARTISAN_BANNED: 'dark',
  DISMISSED: 'secondary',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<TabType>('Pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionForm, setActionForm] = useState({ action: '', adminNotes: '' });

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = tab === 'Pending'
        ? await reportsAPI.getPendingReports()
        : await reportsAPI.getAllReports();
      setReports(res.data || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, [tab]);

  const handleAction = async (reportId: number) => {
    if (!actionForm.action) return;
    setActionLoading(reportId);
    try {
      await reportsAPI.takeAdminAction(reportId, {
        action: actionForm.action,
        adminNotes: actionForm.adminNotes || undefined,
      });
      setToast({ msg: 'Action applied successfully', type: 'success' });
      setSelectedReport(null);
      setActionForm({ action: '', adminNotes: '' });
      loadReports();
    } catch (err: any) {
      setToast({ msg: err?.response?.data?.message || 'Action failed', type: 'danger' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Reports & Complaints</h4>
          <p className="text-muted mb-0">Review and take action on reported artisans</p>
        </div>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show rounded-3`} role="alert">
          {toast.msg}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {(['Pending', 'All'] as TabType[]).map((t) => (
          <li key={t} className="nav-item">
            <button
              className={`nav-link ${tab === t ? 'active fw-semibold' : ''}`}
              onClick={() => setTab(t)}
            >
              {t} Reports
            </button>
          </li>
        ))}
      </ul>

      {/* Reports Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fa-solid fa-check-circle fs-1 d-block mb-2 text-success"></i>
              No {tab.toLowerCase()} reports found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Artisan</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="ps-4 fw-medium">{report.reportedArtisanName}</td>
                      <td>
                        <span className="badge text-bg-light text-dark">
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-bg-${STATUS_BADGES[report.status] || 'secondary'}`}>
                          {report.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-muted small">{formatDate(report.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary rounded-5"
                          onClick={() => {
                            setSelectedReport(report);
                            setActionForm({ action: '', adminNotes: '' });
                          }}
                        >
                          Review
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

      {/* Action Modal */}
      {selectedReport && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title">Review Report</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedReport(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Artisan:</strong> {selectedReport.reportedArtisanName}
                </div>
                <div className="mb-3">
                  <strong>Reason:</strong> {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                </div>
                {selectedReport.description && (
                  <div className="mb-3">
                    <strong>Description:</strong>
                    <p className="text-muted mb-0 mt-1">{selectedReport.description}</p>
                  </div>
                )}
                <div className="mb-3">
                  <strong>Reported:</strong> {formatDate(selectedReport.createdAt)}
                </div>
                {selectedReport.status !== 'PENDING' && (
                  <div className="mb-3">
                    <strong>Current Status:</strong>{' '}
                    <span className={`badge text-bg-${STATUS_BADGES[selectedReport.status] || 'secondary'}`}>
                      {selectedReport.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}

                <hr />

                <div className="mb-3">
                  <label className="form-label fw-semibold">Take Action</label>
                  <select
                    className="form-select"
                    value={actionForm.action}
                    onChange={(e) => setActionForm({ ...actionForm, action: e.target.value })}
                  >
                    <option value="">Select an action...</option>
                    <option value="WARNING">Issue Warning</option>
                    <option value="SUSPENSION">Suspend Artisan</option>
                    <option value="BAN">Ban Artisan</option>
                    <option value="DISMISS">Dismiss Report</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Admin Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add notes about this action..."
                    value={actionForm.adminNotes}
                    onChange={(e) => setActionForm({ ...actionForm, adminNotes: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary rounded-5" onClick={() => setSelectedReport(null)}>
                  Close
                </button>
                <button
                  className={`btn ${actionForm.action === 'BAN' ? 'btn-danger' : actionForm.action === 'SUSPENSION' ? 'btn-warning' : 'btn-primary'} rounded-5`}
                  onClick={() => handleAction(selectedReport.id)}
                  disabled={!actionForm.action || actionLoading === selectedReport.id}
                >
                  {actionLoading === selectedReport.id ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : null}
                  Apply Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
