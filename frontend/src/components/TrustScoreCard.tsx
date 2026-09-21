'use client';

import { useState, useEffect } from 'react';
import { aiAPI } from '@/lib/api';

interface TrustBreakdown {
  ratingScore: number;
  completionRate: number;
  onTimeRate: number;
  responseRate: number;
  reviewSentiment: number;
  disputeScore: number;
  totalJobsCompleted: number;
  totalReviews: number;
  averageRating: number;
}

interface TrustScoreData {
  artisanId: number;
  name: string;
  overallScore: number;
  tier: string;
  breakdown: TrustBreakdown;
  badges: string[];
  summary: string;
}

interface Props {
  artisanId: number;
  compact?: boolean;
}

const TIER_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PLATINUM: { bg: 'linear-gradient(135deg, #e5e7eb, #9ca3af)', text: '#374151', icon: 'fa-gem' },
  GOLD: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', text: '#78350f', icon: 'fa-crown' },
  SILVER: { bg: 'linear-gradient(135deg, #d1d5db, #9ca3af)', text: '#374151', icon: 'fa-shield-halved' },
  BRONZE: { bg: 'linear-gradient(135deg, #d97706, #b45309)', text: '#fff', icon: 'fa-medal' },
  NEW: { bg: 'linear-gradient(135deg, #93c5fd, #60a5fa)', text: '#1e3a5f', icon: 'fa-seedling' },
};

const BADGE_ICONS: Record<string, string> = {
  'Top Rated': 'fa-star',
  'Reliable Pro': 'fa-check-double',
  'Always On Time': 'fa-clock',
  'Zero Disputes': 'fa-shield-halved',
  'Experienced': 'fa-briefcase',
  'Master Artisan': 'fa-trophy',
  'Verified Pro': 'fa-certificate',
  'ID Verified': 'fa-id-card',
};

export default function TrustScoreCard({ artisanId, compact = false }: Props) {
  const [data, setData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    aiAPI.trustScore(artisanId)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [artisanId]);

  if (loading) {
    return (
      <div className="card border-0 rounded-3 p-3 placeholder-glow">
        <div className="placeholder col-8 mb-2" />
        <div className="placeholder col-5" />
      </div>
    );
  }

  if (!data) return null;

  const tier = TIER_COLORS[data.tier] || TIER_COLORS.NEW;

  // Compact mode — inline badge for artisan cards
  if (compact) {
    return (
      <div className="d-inline-flex align-items-center gap-1">
        <span className="badge rounded-pill px-2 py-1"
          style={{ background: tier.bg, color: tier.text, fontSize: '0.72rem' }}>
          <i className={`fa-solid ${tier.icon} me-1`} />
          {data.tier} · {data.overallScore}/100
        </span>
      </div>
    );
  }

  // Full card mode
  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
      {/* Header bar */}
      <div className="p-3 d-flex align-items-center justify-content-between"
        style={{ background: tier.bg, color: tier.text }}>
        <div className="d-flex align-items-center gap-2">
          <i className={`fa-solid ${tier.icon} fa-lg`} />
          <div>
            <div className="fw-bold" style={{ fontSize: '0.95rem' }}>
              {data.tier} Trust Score
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              AI-verified reputation
            </div>
          </div>
        </div>
        <div className="text-end">
          <div className="fw-bold" style={{ fontSize: '1.5rem' }}>{data.overallScore}</div>
          <div style={{ fontSize: '0.7rem' }}>/ 100</div>
        </div>
      </div>

      <div className="p-3">
        {/* Badges */}
        {data.badges.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mb-3">
            {data.badges.map((badge, i) => (
              <span key={i} className="badge bg-light text-dark border rounded-pill px-2 py-1"
                style={{ fontSize: '0.72rem' }}>
                <i className={`fa-solid ${BADGE_ICONS[badge] || 'fa-award'} me-1 text-primary`} />
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        <p className="text-muted small mb-3" style={{ lineHeight: 1.5 }}>
          {data.summary}
        </p>

        {/* Quick stats */}
        <div className="row g-2 mb-3">
          <div className="col-4 text-center">
            <div className="fw-bold text-primary">{data.breakdown.totalJobsCompleted}</div>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Jobs Done</div>
          </div>
          <div className="col-4 text-center">
            <div className="fw-bold text-warning">
              <i className="fa-solid fa-star me-1" style={{ fontSize: '0.75rem' }} />
              {data.breakdown.averageRating}
            </div>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Avg Rating</div>
          </div>
          <div className="col-4 text-center">
            <div className="fw-bold text-success">{data.breakdown.completionRate}%</div>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Completion</div>
          </div>
        </div>

        {/* Expandable detailed breakdown */}
        <button className="btn btn-sm btn-outline-secondary rounded-pill w-100"
          onClick={() => setExpanded(!expanded)}>
          <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} me-1`} />
          {expanded ? 'Hide' : 'Show'} Detailed Breakdown
        </button>

        {expanded && (
          <div className="mt-3">
            <BreakdownBar label="Rating Quality" value={data.breakdown.ratingScore} max={25} color="#f59e0b" />
            <BreakdownBar label="Completion Rate" value={data.breakdown.completionRate} max={100} color="#10b981" />
            <BreakdownBar label="On-Time Rate" value={data.breakdown.onTimeRate} max={100} color="#3b82f6" />
            <BreakdownBar label="Review Sentiment" value={data.breakdown.reviewSentiment} max={100} color="#8b5cf6" />
            <BreakdownBar label="Dispute Score" value={data.breakdown.disputeScore} max={15} color="#ef4444" />
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between mb-1">
        <span className="small text-muted">{label}</span>
        <span className="small fw-semibold">{value}%</span>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
