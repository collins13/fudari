'use client';
import { useState, useEffect } from 'react';
import { whatsappAPI } from '@/lib/api';

interface WhatsAppSession {
  id: number;
  customerPhone: string;
  customerName: string;
  state: string;
  selectedCategory: string;
  skillType: string;
  customerLocation: string;
  jobDescription: string;
  urgency: string;
  bookingCode: string;
  jobId: number;
  errorCount: number;
  sessionStatus: string;
  createdAt: string;
  updatedAt: string;
}

const stateColors: Record<string, string> = {
  CATEGORY: 'text-bg-secondary',
  LOCATION: 'text-bg-info',
  DESCRIPTION: 'text-bg-primary',
  URGENCY: 'text-bg-warning',
  CONFIRM: 'text-bg-dark',
  COMPLETED: 'text-bg-success',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'text-bg-success',
  COMPLETED: 'text-bg-primary',
  ABANDONED: 'text-bg-danger',
};

export default function WhatsAppAdminPage() {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await whatsappAPI.getSessions();
        setSessions(res.data);
      } catch (err) {
        console.error('Failed to fetch WhatsApp sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const filteredSessions = filter === 'all'
    ? sessions
    : sessions.filter(s => s.sessionStatus === filter);

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.sessionStatus === 'ACTIVE').length,
    completed: sessions.filter(s => s.sessionStatus === 'COMPLETED').length,
    abandoned: sessions.filter(s => s.sessionStatus === 'ABANDONED').length,
  };

  const conversionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

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
          <h4 className="fw-bold mb-1">
            <i className="fa-brands fa-whatsapp text-success me-2"></i>
            WhatsApp Bot Sessions
          </h4>
          <p className="text-muted mb-0">Monitor automated booking conversations via WhatsApp</p>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Sessions', value: stats.total, icon: 'fa-message', color: 'primary' },
          { label: 'Active', value: stats.active, icon: 'fa-spinner', color: 'success' },
          { label: 'Completed', value: stats.completed, icon: 'fa-check-circle', color: 'info' },
          { label: 'Abandoned', value: stats.abandoned, icon: 'fa-xmark-circle', color: 'danger' },
          { label: 'Conversion', value: `${conversionRate}%`, icon: 'fa-chart-line', color: 'warning' },
        ].map(stat => (
          <div key={stat.label} className="col-6 col-md">
            <div className="card border-0 shadow-sm text-center p-3">
              <i className={`fa-solid ${stat.icon} text-${stat.color} fs-4 mb-1`}></i>
              <div className={`fs-3 fw-bold text-${stat.color}`}>{stat.value}</div>
              <div className="text-muted small">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="d-flex gap-2 mb-3">
        {['all', 'ACTIVE', 'COMPLETED', 'ABANDONED'].map(f => (
          <button key={f} className={`btn btn-sm rounded-5 ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f}
            {f !== 'all' && (
              <span className="badge bg-light text-dark ms-1">
                {sessions.filter(s => f === 'all' || s.sessionStatus === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sessions table */}
      {filteredSessions.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center">
          <i className="fa-brands fa-whatsapp fs-1 text-muted mb-3"></i>
          <h5>No WhatsApp sessions yet</h5>
          <p className="text-muted">Sessions will appear here when customers interact with the WhatsApp booking bot.</p>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Customer</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Booking</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => (
                  <tr key={session.id}>
                    <td>
                      <div className="fw-medium">{session.customerName || 'Unknown'}</div>
                      <div className="text-muted small font-monospace">{session.customerPhone}</div>
                    </td>
                    <td>
                      <span className={`badge ${stateColors[session.state] || 'text-bg-secondary'}`}>
                        {session.state}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusColors[session.sessionStatus] || 'text-bg-secondary'}`}>
                        {session.sessionStatus}
                      </span>
                      {session.errorCount > 0 && (
                        <span className="badge text-bg-danger ms-1">{session.errorCount} errors</span>
                      )}
                    </td>
                    <td className="small">{session.selectedCategory || '—'}</td>
                    <td className="small">{session.customerLocation || '—'}</td>
                    <td>
                      {session.bookingCode ? (
                        <span className="badge text-bg-success font-monospace">{session.bookingCode}</span>
                      ) : '—'}
                    </td>
                    <td className="small text-muted">
                      {new Date(session.updatedAt).toLocaleString('en-KE', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
