'use client';

import { useState, useEffect } from 'react';
import { adminJobsAPI, adminUsersAPI, categoriesAPI, listingsAPI } from '@/lib/api';

interface PlatformStats {
  totalUsers: number;
  totalWorkers: number;
  totalClients: number;
  totalAdmins: number;
  totalListings: number;
  pendingListings: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  activeJobs: number;
  totalEscrows: number;
}

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: string | number; icon: string; color: string; bg: string;
}) {
  return (
    <div className="card border-0 shadow-sm h-100" style={{ background: bg }}>
      <div className="card-body d-flex align-items-center gap-3 py-4">
        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 52, height: 52, background: color + '20' }}>
          <i className={`fa-solid ${icon}`} style={{ color, fontSize: 22 }}></i>
        </div>
        <div>
          <div className="text-muted small">{label}</div>
          <h4 className="mb-0 fw-bold">{value}</h4>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">{label}</span>
        <span className="fw-medium">{value}</span>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div className="progress-bar" style={{ width: `${pct}%`, background: color }}></div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminJobsAPI.getStats();
        setStats(res.data);
      } catch { /* keep null */ }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-5">
        <i className="fa-solid fa-chart-line text-muted mb-3" style={{ fontSize: 48 }}></i>
        <h5>Could not load platform stats</h5>
        <p className="text-muted">Check that you have admin privileges.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Platform Analytics</h4>
        <p className="text-muted mb-0">Overview of FUDARI platform activity</p>
      </div>

      {/* Top KPIs */}
      <div className="row g-3 g-xl-4 mb-4">
        <div className="col-sm-6 col-xl-3">
          <StatCard label="Total Users" value={stats.totalUsers} icon="fa-users" color="#0d6efd" bg="#e8f0fe" />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard label="Artisans" value={stats.totalWorkers} icon="fa-hard-hat" color="var(--bs-primary)" bg="var(--tx-primary-tint)" />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard label="Total Jobs" value={stats.totalJobs} icon="fa-briefcase" color="#198754" bg="#d1f2e0" />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard label="Completed Jobs" value={stats.completedJobs} icon="fa-circle-check" color="#6f42c1" bg="#f3e8ff" />
        </div>
      </div>

      <div className="row g-3 g-xl-4">
        {/* Users Breakdown */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0"><i className="fa-solid fa-users me-2 text-primary"></i>Users Breakdown</h6>
            </div>
            <div className="card-body">
              <MiniBar label="Workers / Artisans" value={stats.totalWorkers} max={stats.totalUsers} color="var(--bs-primary)" />
              <MiniBar label="Clients / Customers" value={stats.totalClients} max={stats.totalUsers} color="#0d6efd" />
              <MiniBar label="Admins" value={stats.totalAdmins} max={stats.totalUsers} color="#6f42c1" />
            </div>
          </div>
        </div>

        {/* Jobs Pipeline */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0"><i className="fa-solid fa-briefcase me-2 text-success"></i>Jobs Pipeline</h6>
            </div>
            <div className="card-body">
              <MiniBar label="Pending" value={stats.pendingJobs} max={stats.totalJobs} color="#ffc107" />
              <MiniBar label="Active (Accepted/Arrived/In Progress)" value={stats.activeJobs} max={stats.totalJobs} color="#0d6efd" />
              <MiniBar label="Completed" value={stats.completedJobs} max={stats.totalJobs} color="#198754" />
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0"><i className="fa-solid fa-list me-2 text-warning"></i>Listings</h6>
            </div>
            <div className="card-body">
              <div className="row g-3 text-center">
                <div className="col-12 col-sm-4">
                  <div className="p-3 rounded-3" style={{ background: '#ffc10720' }}>
                    <div className="fw-bold fs-4">{stats.pendingListings}</div>
                    <div className="text-muted small">Pending Review</div>
                  </div>
                </div>
                <div className="col-6 col-sm-4">
                  <div className="p-3 rounded-3" style={{ background: '#19875420' }}>
                    <div className="fw-bold fs-4">{stats.totalListings - stats.pendingListings}</div>
                    <div className="text-muted small">Approved</div>
                  </div>
                </div>
                <div className="col-6 col-sm-4">
                  <div className="p-3 rounded-3" style={{ background: '#0d6efd20' }}>
                    <div className="fw-bold fs-4">{stats.totalListings}</div>
                    <div className="text-muted small">Total</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0"><i className="fa-solid fa-money-bill-transfer me-2 text-danger"></i>Escrow Transactions</h6>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <div className="text-center">
                <div className="fw-bold display-6">{stats.totalEscrows}</div>
                <p className="text-muted small mb-0">Total escrow transactions on the platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
