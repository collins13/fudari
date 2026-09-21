'use client';

import { useState, useEffect } from 'react';
import { adminJobsAPI, paymentsAPI } from '@/lib/api';

interface MissingPayment {
  id: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  artisanName: string;
  artisanPhone: string;
  agreedPrice: number;
  status: string;
  statusLabel: string;
  completedAt: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function formatKES(amount: number | null): string {
  if (!amount) return '—';
  return `KES ${amount.toLocaleString()}`;
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<'missing' | 'escrows'>('missing');
  const [missingPayments, setMissingPayments] = useState<MissingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (tab === 'missing') {
          const res = await adminJobsAPI.getMissingPayments();
          setMissingPayments(res.data || []);
        }
      } catch { setMissingPayments([]); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [tab]);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Payments & Escrow</h4>
          <p className="text-muted mb-0">Monitor payments, escrow transactions, and missing payment follow-ups</p>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button className={`nav-link rounded-5 ${tab === 'missing' ? 'active' : ''}`} onClick={() => setTab('missing')}>
            <i className="fa-solid fa-triangle-exclamation me-2"></i>Missing Payments
            {missingPayments.length > 0 && tab !== 'missing' && <span className="badge text-bg-danger ms-2">{missingPayments.length}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-5 ${tab === 'escrows' ? 'active' : ''}`} onClick={() => setTab('escrows')}>
            <i className="fa-solid fa-vault me-2"></i>Escrow Info
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : tab === 'missing' ? (
        <>
          {/* Missing Payments Alert */}
          {missingPayments.length > 0 && (
            <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4">
              <i className="fa-solid fa-exclamation-triangle me-2"></i>
              <strong>{missingPayments.length}</strong> job(s) completed &gt; 24 hours ago without payment recorded.
            </div>
          )}

          {missingPayments.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="fa-solid fa-circle-check text-success mb-3" style={{ fontSize: 48 }}></i>
                <h5 className="fw-semibold">All Clear</h5>
                <p className="text-muted">No jobs with missing payments.</p>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Booking Code</th>
                      <th>Customer</th>
                      <th>Artisan</th>
                      <th>Agreed Price</th>
                      <th>Completed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingPayments.map((p) => (
                      <tr key={p.id}>
                        <td><span className="font-monospace fw-semibold">{p.bookingCode}</span></td>
                        <td>
                          <div className="fw-medium">{p.customerName}</div>
                          <div className="text-muted small">{p.customerPhone}</div>
                        </td>
                        <td>
                          <div className="fw-medium">{p.artisanName}</div>
                          <div className="text-muted small">{p.artisanPhone}</div>
                        </td>
                        <td className="fw-medium">{formatKES(p.agreedPrice)}</td>
                        <td className="text-muted small">{formatDate(p.completedAt)}</td>
                        <td><span className="badge text-bg-warning">{p.statusLabel || p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="text-center py-4">
              <i className="fa-solid fa-vault text-muted mb-3" style={{ fontSize: 48 }}></i>
              <h5 className="fw-semibold">Escrow System</h5>
              <p className="text-muted mb-3">
                The escrow system holds funds until job milestones are met. Material costs are released after the START PIN, and labor costs after the COMPLETION PIN.
              </p>
              <div className="row g-3 text-start mx-auto" style={{ maxWidth: 500 }}>
                {[
                  { step: '1', text: 'Customer deposits full amount into escrow', icon: 'fa-money-bill-wave' },
                  { step: '2', text: 'Artisan starts job → Material cost released', icon: 'fa-hammer' },
                  { step: '3', text: 'Job completed → Labor cost released', icon: 'fa-flag-checkered' },
                  { step: '4', text: 'Platform fee retained automatically', icon: 'fa-percent' },
                ].map((s, i) => (
                  <div key={i} className="col-12">
                    <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3">
                      <div className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 32, height: 32, fontSize: 14 }}>{s.step}</div>
                      <div className="d-flex align-items-center gap-2">
                        <i className={`fa-solid ${s.icon} text-muted`}></i>
                        <span className="small">{s.text}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
