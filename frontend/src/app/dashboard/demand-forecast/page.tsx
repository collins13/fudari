'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { aiAPI, workersAPI } from '@/lib/api';
import Link from 'next/link';

interface DemandTrend {
  currentWeekJobs: number;
  previousWeekJobs: number;
  changePercent: number;
  direction: string;
  activeArtisans: number;
  supplyDemandRatio: number;
}

interface DemandInsight {
  type: string;
  title: string;
  description: string;
  icon: string;
}

interface PricingAdvice {
  suggestedMinRate: number;
  suggestedMaxRate: number;
  rationale: string;
  marketPosition: string;
}

interface ForecastData {
  skillType: string;
  location: string;
  period: string;
  trend: DemandTrend;
  insights: DemandInsight[];
  pricingAdvice: PricingAdvice;
}

const INSIGHT_ICONS: Record<string, { icon: string; color: string }> = {
  TREND: { icon: 'fa-chart-line', color: '#6366f1' },
  OPPORTUNITY: { icon: 'fa-star', color: '#f59e0b' },
  COMPETITION: { icon: 'fa-users', color: '#3b82f6' },
  SEASONAL: { icon: 'fa-calendar', color: '#10b981' },
  LOCATION: { icon: 'fa-location-dot', color: '#ef4444' },
};

const POSITION_LABELS: Record<string, { label: string; color: string }> = {
  PREMIUM: { label: 'Premium Positioning', color: 'success' },
  COMPETITIVE: { label: 'Competitive Pricing', color: 'warning' },
  MARKET_RATE: { label: 'Market Rate', color: 'info' },
};

export default function DemandForecastPage() {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    workersAPI.getWorkerSkills(user.id)
      .then(res => {
        const sk = (res.data || []).map((s: { skillType: string }) => s.skillType);
        setSkills(sk);
        if (sk.length > 0) setSelectedSkill(sk[0]);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedSkill) { setLoading(false); return; }
    setLoading(true);
    aiAPI.demandForecast(selectedSkill, user?.locationName || undefined)
      .then(res => setForecast(res.data))
      .catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, [selectedSkill, user]);

  const trend = forecast?.trend;
  const advice = forecast?.pricingAdvice;
  const pos = advice?.marketPosition ? POSITION_LABELS[advice.marketPosition] : null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="fa-solid fa-chart-line text-primary me-2" />
            Market Intelligence
          </h4>
          <p className="text-muted mb-0 small">AI-powered demand forecasting and pricing advice for your skills</p>
        </div>
        {skills.length > 1 && (
          <select className="form-select form-select-sm rounded-pill" style={{ maxWidth: 200 }}
            value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}>
            {skills.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2">Analysing market data...</p>
        </div>
      )}

      {!loading && !forecast && (
        <div className="text-center py-5">
          <i className="fa-solid fa-chart-bar fa-3x text-muted mb-3" />
          <p className="text-muted">No forecast data available. Add a skill to your profile first.</p>
          <Link href="/dashboard/profile" className="btn btn-outline-primary btn-sm rounded-pill">
            Update Profile
          </Link>
        </div>
      )}

      {!loading && forecast && trend && (
        <>
          {/* Trend Overview Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-3 text-center h-100">
                <div className={`fw-bold fs-4 ${trend.direction === 'UP' ? 'text-success' : trend.direction === 'DOWN' ? 'text-danger' : 'text-secondary'}`}>
                  {trend.currentWeekJobs}
                </div>
                <div className="text-muted small">Jobs This Week</div>
                {trend.changePercent !== 0 && (
                  <div className={`small mt-1 ${trend.direction === 'UP' ? 'text-success' : 'text-danger'}`}>
                    <i className={`fa-solid fa-arrow-${trend.direction === 'UP' ? 'up' : 'down'} me-1`} />
                    {Math.abs(trend.changePercent)}%
                  </div>
                )}
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-3 text-center h-100">
                <div className="fw-bold fs-4 text-muted">{trend.previousWeekJobs}</div>
                <div className="text-muted small">Last Week</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-3 text-center h-100">
                <div className="fw-bold fs-4 text-primary">{trend.activeArtisans}</div>
                <div className="text-muted small">Active Artisans</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-3 text-center h-100">
                <div className={`fw-bold fs-4 ${trend.supplyDemandRatio > 1.5 ? 'text-success' : trend.supplyDemandRatio < 0.5 ? 'text-danger' : 'text-primary'}`}>
                  {trend.supplyDemandRatio}x
                </div>
                <div className="text-muted small">Jobs / Artisan</div>
              </div>
            </div>
          </div>

          {/* Supply/Demand Visual Bar */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h6 className="fw-bold mb-3">
              <i className="fa-solid fa-scale-balanced text-primary me-2" />Supply vs Demand
            </h6>
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="flex-grow-1">
                <div className="small text-muted mb-1">Demand ({trend.currentWeekJobs} jobs)</div>
                <div className="progress" style={{ height: 12 }}>
                  <div className="progress-bar bg-primary" style={{
                    width: `${Math.min(100, (trend.currentWeekJobs / Math.max(trend.currentWeekJobs, trend.activeArtisans)) * 100)}%`
                  }} />
                </div>
              </div>
              <div className="text-muted small">vs</div>
              <div className="flex-grow-1">
                <div className="small text-muted mb-1">Supply ({trend.activeArtisans} artisans)</div>
                <div className="progress" style={{ height: 12 }}>
                  <div className="progress-bar bg-success" style={{
                    width: `${Math.min(100, (trend.activeArtisans / Math.max(trend.currentWeekJobs, trend.activeArtisans)) * 100)}%`
                  }} />
                </div>
              </div>
            </div>
            <div className="small text-muted">
              {trend.supplyDemandRatio > 1.5
                ? '🟢 Demand exceeds supply — great opportunity to take on more jobs'
                : trend.supplyDemandRatio < 0.5
                  ? '🔴 More artisans than jobs — stand out with fast responses and great reviews'
                  : '🟡 Market is balanced — maintain quality to stay competitive'}
            </div>
          </div>

          {/* Pricing Advice */}
          {advice && (
            <div className="card border-0 rounded-4 p-4 mb-4 text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <h6 className="fw-bold mb-1">
                    <i className="fa-solid fa-coins me-2" />Pricing Advice
                  </h6>
                  <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{advice.rationale}</div>
                </div>
                {pos && (
                  <span className={`badge bg-${pos.color} rounded-pill`}>{pos.label}</span>
                )}
              </div>
              <div className="d-flex align-items-baseline gap-1">
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>KES</span>
                <span className="fw-bold" style={{ fontSize: '1.8rem' }}>
                  {advice.suggestedMinRate.toLocaleString()}
                </span>
                <span style={{ fontSize: '1rem', opacity: 0.7 }}> – </span>
                <span className="fw-bold" style={{ fontSize: '1.8rem' }}>
                  {advice.suggestedMaxRate.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>Suggested rate range per job</div>
            </div>
          )}

          {/* Insights */}
          {forecast.insights.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <h6 className="fw-bold mb-3">
                <i className="fa-solid fa-lightbulb text-warning me-2" />Market Insights
              </h6>
              <div className="row g-3">
                {forecast.insights.map((insight, i) => {
                  const ic = INSIGHT_ICONS[insight.type] || INSIGHT_ICONS.TREND;
                  return (
                    <div key={i} className="col-12 col-md-6">
                      <div className="card border rounded-3 p-3 h-100">
                        <div className="d-flex align-items-start gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 36, height: 36, background: `${ic.color}15`, color: ic.color }}>
                            <i className={`fa-solid ${ic.icon}`} />
                          </div>
                          <div>
                            <div className="fw-semibold small mb-1">{insight.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                              {insight.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info footer */}
          <div className="text-center text-muted small py-3">
            <i className="fa-solid fa-robot me-1" />
            AI-generated forecast based on platform data · Updated in real-time
          </div>
        </>
      )}
    </div>
  );
}
