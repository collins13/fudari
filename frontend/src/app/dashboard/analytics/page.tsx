'use client';

import { useState, useEffect } from 'react';
import { leadsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface LeadStats {
  profileViews: number;
  callClicks: number;
  whatsappClicks: number;
  totalLeads: number;
}

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="d-flex align-items-end gap-3 justify-content-center" style={{ height: 200 }}>
      {data.map((d, i) => {
        const height = maxVal > 0 ? Math.max(4, (d.value / maxVal) * 180) : 4;
        return (
          <div key={i} className="text-center">
            <div className="fw-bold small mb-1">{d.value}</div>
            <div className="rounded-top-3" style={{ width: 48, height, background: d.color, transition: 'height 0.5s' }}></div>
            <div className="text-muted mt-2" style={{ fontSize: 11 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="text-muted text-center py-4">No data yet</p>;
  let cumulative = 0;
  const gradientParts = segments.map((seg) => {
    const start = (cumulative / total) * 100;
    cumulative += seg.value;
    const end = (cumulative / total) * 100;
    return `${seg.color} ${start}% ${end}%`;
  });
  const gradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div className="d-flex align-items-center gap-4 justify-content-center">
      <div style={{ width: 140, height: 140, borderRadius: '50%', background: gradient, position: 'relative' }}>
        <div className="position-absolute top-50 start-50 translate-middle bg-white rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: 80, height: 80 }}>
          <div className="text-center">
            <div className="fw-bold fs-5">{total}</div>
            <div className="text-muted" style={{ fontSize: 10 }}>Total</div>
          </div>
        </div>
      </div>
      <div>
        {segments.map((seg, i) => (
          <div key={i} className="d-flex align-items-center gap-2 mb-1">
            <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color }}></div>
            <span className="small">{seg.label}: <strong>{seg.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LeadStats>({ profileViews: 0, callClicks: 0, whatsappClicks: 0, totalLeads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await leadsAPI.getLeadStats();
        setStats(res.data);
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  const maxVal = Math.max(stats.profileViews, stats.callClicks, stats.whatsappClicks, 1);
  const convRate = stats.profileViews > 0
    ? (((stats.callClicks + stats.whatsappClicks) / stats.profileViews) * 100).toFixed(1)
    : '0';

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Lead Analytics</h4>
        <p className="text-muted mb-0">Track how customers find and contact you (last 30 days)</p>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Profile Views', value: stats.profileViews, icon: 'fa-eye', color: '#0d6efd', bg: '#e8f0fe' },
          { label: 'Call Clicks', value: stats.callClicks, icon: 'fa-phone', color: '#198754', bg: '#d1f2e0' },
          { label: 'WhatsApp Clicks', value: stats.whatsappClicks, icon: 'fa-brands fa-whatsapp', color: '#25d366', bg: '#d4f8e2' },
          { label: 'Total Leads', value: stats.totalLeads, icon: 'fa-bullseye', color: '#F84525', bg: '#fde8e4' },
          { label: 'Conversion Rate', value: convRate + '%', icon: 'fa-chart-line', color: '#fd7e14', bg: '#fff3e0' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-xl">
            <div className="card border-0 shadow-sm h-100" style={{ background: s.bg }}>
              <div className="card-body text-center py-4">
                <i className={`fa-solid ${s.icon} mb-2`} style={{ fontSize: 24, color: s.color }}></i>
                <div className="fw-bold fs-4">{s.value}</div>
                <div className="text-muted small">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Bar Chart */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0"><i className="fa-solid fa-chart-bar me-2 text-primary"></i>Lead Breakdown</h6>
            </div>
            <div className="card-body">
              <BarChart
                maxVal={maxVal}
                data={[
                  { label: 'Profile Views', value: stats.profileViews, color: '#0d6efd' },
                  { label: 'Call Clicks', value: stats.callClicks, color: '#198754' },
                  { label: 'WhatsApp', value: stats.whatsappClicks, color: '#25d366' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3">
              <h6 className="fw-semibold mb-0"><i className="fa-solid fa-chart-pie me-2 text-primary"></i>Contact Channel Mix</h6>
            </div>
            <div className="card-body d-flex align-items-center">
              <DonutChart
                segments={[
                  { label: 'Calls', value: stats.callClicks, color: '#198754' },
                  { label: 'WhatsApp', value: stats.whatsappClicks, color: '#25d366' },
                  { label: 'Views Only', value: Math.max(0, stats.profileViews - stats.callClicks - stats.whatsappClicks), color: '#dee2e6' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="card border-0 shadow-sm mt-4" style={{ background: '#f0f7ff' }}>
        <div className="card-body">
          <h6 className="fw-semibold mb-3"><i className="fa-solid fa-lightbulb text-warning me-2"></i>Tips to Get More Leads</h6>
          <div className="row g-3">
            {[
              { tip: 'Complete your profile — filled profiles get 3× more views', icon: 'fa-user-check' },
              { tip: 'Add multiple listings for different services you offer', icon: 'fa-list-check' },
              { tip: 'Upload quality before/after photos of your work', icon: 'fa-camera' },
              { tip: 'Upgrade to PRO for featured placement in search', icon: 'fa-crown' },
            ].map((t, i) => (
              <div key={i} className="col-md-6">
                <div className="d-flex gap-2">
                  <i className={`fa-solid ${t.icon} text-primary mt-1`}></i>
                  <span className="small text-muted">{t.tip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
