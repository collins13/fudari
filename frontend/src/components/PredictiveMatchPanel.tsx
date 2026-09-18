'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { aiAPI } from '@/lib/api';

interface MatchedArtisan {
  artisanId: number;
  name: string;
  profileImage: string | null;
  skillType: string;
  trustScore: number;
  locationName: string;
  distanceKm: number | null;
  matchScore: number;
  matchReason: string;
  startingRate: number | null;
}

interface PredictiveMatchData {
  bestMatch: MatchedArtisan[];
  fastestAvailable: MatchedArtisan[];
  bestValue: MatchedArtisan[];
}

interface Props {
  skillType: string;
  latitude?: number;
  longitude?: number;
}

const CATEGORIES = [
  { key: 'bestMatch', label: 'Best Match', icon: 'fa-crown', color: '#f59e0b', desc: 'Highest overall score' },
  { key: 'fastestAvailable', label: 'Fastest Available', icon: 'fa-bolt', color: '#3b82f6', desc: 'Closest to you' },
  { key: 'bestValue', label: 'Best Value', icon: 'fa-tag', color: '#10b981', desc: 'Quality at great rates' },
] as const;

export default function PredictiveMatchPanel({ skillType, latitude, longitude }: Props) {
  const [data, setData] = useState<PredictiveMatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('bestMatch');

  useEffect(() => {
    if (!skillType) return;
    setLoading(true);
    aiAPI.predictiveMatch(skillType, latitude, longitude)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [skillType, latitude, longitude]);

  if (loading) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-4">
        <div className="text-center py-3">
          <div className="spinner-border spinner-border-sm text-primary" />
          <div className="text-muted small mt-2">Finding the best match for you...</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasResults = data.bestMatch.length > 0 || data.fastestAvailable.length > 0 || data.bestValue.length > 0;
  if (!hasResults) return null;

  const activeArtisans = (data as unknown as Record<string, MatchedArtisan[]>)[activeTab] || [];
  const activeCat = CATEGORIES.find(c => c.key === activeTab);

  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
      <div className="p-3 pb-0">
        <h6 className="fw-bold mb-1">
          <i className="fa-solid fa-wand-magic-sparkles text-primary me-2" />
          AI-Recommended Artisans
        </h6>
        <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>
          Ranked by multiple factors including proximity, rating, and value
        </p>
      </div>

      {/* Category tabs */}
      <div className="px-3 pt-3">
        <div className="d-flex gap-2">
          {CATEGORIES.map(cat => {
            const count = ((data as unknown as Record<string, MatchedArtisan[]>)[cat.key] || []).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.key}
                className={`btn btn-sm rounded-pill flex-fill ${activeTab === cat.key
                  ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab(cat.key)}
                style={{ fontSize: '0.78rem' }}
              >
                <i className={`fa-solid ${cat.icon} me-1`} />
                {cat.label}
              </button>
            );
          })}
        </div>
        {activeCat && (
          <div className="text-muted text-center mt-1" style={{ fontSize: '0.72rem' }}>
            {activeCat.desc}
          </div>
        )}
      </div>

      {/* Artisan list */}
      <div className="p-3">
        <div className="row g-3">
          {activeArtisans.map((m, i) => (
            <div key={m.artisanId} className="col-12">
              <Link
                href={`/artisan/${m.artisanId}`}
                className="card border rounded-3 p-3 text-decoration-none text-dark d-block hover-shadow"
              >
                <div className="d-flex align-items-center gap-2 gap-sm-3">
                  {/* Rank badge */}
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                    style={{
                      width: 32, height: 32, fontSize: '0.8rem',
                      background: i === 0 ? '#fef3c7' : '#f3f4f6',
                      color: i === 0 ? '#b45309' : '#6b7280',
                    }}>
                    #{i + 1}
                  </div>

                  {/* Avatar */}
                  {m.profileImage ? (
                    <img src={m.profileImage} className="rounded-circle flex-shrink-0"
                      style={{ width: 44, height: 44, objectFit: 'cover' }} alt={m.name} />
                  ) : (
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                      style={{ width: 44, height: 44, fontSize: '1rem' }}>
                      {m.name[0]}
                    </div>
                  )}

                  {/* Info */}
                  {/* minWidth 0 lets this shrink; without it the flex item refuses to go
                      below its content width and squeezes the score column off-screen. */}
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold text-truncate">{m.name}</div>
                    <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
                      <span className="text-warning">
                        <i className="fa-solid fa-star me-1" style={{ fontSize: '0.7rem' }} />
                        {m.trustScore.toFixed(1)}
                      </span>
                      {m.distanceKm != null && (
                        <span><i className="fa-solid fa-location-dot me-1" />{m.distanceKm} km</span>
                      )}
                      {m.locationName && <span className="text-truncate">{m.locationName}</span>}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{m.matchReason}</div>
                  </div>

                  {/* Score + Rate */}
                  <div className="text-end flex-shrink-0">
                    <div className="fw-bold text-primary" style={{ fontSize: '0.85rem' }}>
                      {m.matchScore}/100
                    </div>
                    {m.startingRate && (
                      <div className="text-muted small text-nowrap">
                        KES {m.startingRate.toLocaleString()}/hr
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
