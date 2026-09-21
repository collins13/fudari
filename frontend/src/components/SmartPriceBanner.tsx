'use client';

import { useState, useEffect } from 'react';
import { aiAPI } from '@/lib/api';

interface PriceBreakdown {
  factor: string;
  impact: string;
  detail: string;
}

interface SmartPriceData {
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  sampleSize: number;
  currency: string;
  summary: string;
  confidencePercent: number;
  urgencySurcharge: string;
  locationFactor: string;
  ratingPremium: string;
  breakdown: PriceBreakdown[];
}

interface Props {
  skillType?: string;
  location?: string;
  urgency?: string;
  artisanRating?: number;
}

export default function SmartPriceBanner({ skillType, location, urgency, artisanRating }: Props) {
  const [data, setData] = useState<SmartPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!skillType) return;
    setLoading(true);
    aiAPI.smartPrice({ skillType, location, urgency, artisanRating })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [skillType, location, urgency, artisanRating]);

  if (loading) {
    return (
      <div className="card border-0 rounded-4 mb-4 p-3" style={{ background: '#f0f0ff' }}>
        <div className="d-flex align-items-center gap-2">
          <span className="spinner-border spinner-border-sm text-primary" />
          <span className="text-muted small">Calculating smart price...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card border-0 rounded-4 mb-4 overflow-hidden">
      {/* Main price banner */}
      <div className="p-3 d-flex align-items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>
        <i className="fa-solid fa-brain fa-lg flex-shrink-0" />
        <div className="flex-grow-1">
          <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>
            Smart Estimate: KES {data.minPrice.toLocaleString()} – {data.maxPrice.toLocaleString()}
            <span className="ms-2 opacity-75 fw-normal" style={{ fontSize: '0.78rem' }}>
              (median KES {data.medianPrice.toLocaleString()})
            </span>
          </div>
          <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '0.75rem' }}>
            <span className="opacity-85">{data.summary}</span>
            <span className="badge bg-white bg-opacity-25 rounded-pill" style={{ fontSize: '0.68rem' }}>
              {data.confidencePercent.toFixed(0)}% confidence
            </span>
          </div>
        </div>
        {data.breakdown.length > 0 && (
          <button className="btn btn-sm text-white"
            onClick={() => setShowBreakdown(!showBreakdown)}
            title="Show price breakdown">
            <i className={`fa-solid fa-chevron-${showBreakdown ? 'up' : 'down'}`} />
          </button>
        )}
      </div>

      {/* Factor pills */}
      {(data.urgencySurcharge !== 'none' || data.locationFactor !== 'standard' || data.ratingPremium !== 'none') && (
        <div className="px-3 py-2 d-flex flex-wrap gap-1" style={{ background: 'rgba(99,102,241,0.06)' }}>
          {data.urgencySurcharge !== 'none' && (
            <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill" style={{ fontSize: '0.7rem' }}>
              <i className="fa-solid fa-bolt me-1" />Urgency {data.urgencySurcharge}
            </span>
          )}
          {data.locationFactor !== 'standard' && (
            <span className="badge bg-info bg-opacity-10 text-info rounded-pill" style={{ fontSize: '0.7rem' }}>
              <i className="fa-solid fa-location-dot me-1" />Location {data.locationFactor}
            </span>
          )}
          {data.ratingPremium !== 'none' && (
            <span className="badge bg-success bg-opacity-10 text-success rounded-pill" style={{ fontSize: '0.7rem' }}>
              <i className="fa-solid fa-star me-1" />Rating {data.ratingPremium}
            </span>
          )}
          <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill" style={{ fontSize: '0.7rem' }}>
            <i className="fa-solid fa-database me-1" />{data.sampleSize} jobs analysed
          </span>
        </div>
      )}

      <div className="px-3 py-2 border-top" style={{ background: '#f8fafc' }}>
        <div className="small text-muted">
          <i className="fa-solid fa-circle-info me-1 text-primary"></i>
          This estimate uses recent completed jobs in similar areas and urgency levels. Final price can change after onsite assessment.
        </div>
      </div>

      <div className="px-3 py-2 border-top" style={{ background: '#fffef7' }}>
        <div className="small fw-semibold mb-1 text-dark">Possible extra costs to confirm early:</div>
        <div className="d-flex flex-wrap gap-2">
          <span className="badge text-bg-light border">Transport</span>
          <span className="badge text-bg-light border">Materials & fittings</span>
          <span className="badge text-bg-light border">After-hours urgency fee</span>
          <span className="badge text-bg-light border">Special tools/equipment</span>
        </div>
      </div>

      {/* Detailed breakdown */}
      {showBreakdown && data.breakdown.length > 0 && (
        <div className="p-3 border-top" style={{ background: '#fafafa' }}>
          <div className="small fw-semibold text-muted mb-2">Price Factors</div>
          {data.breakdown.map((b, i) => (
            <div key={i} className="d-flex align-items-start gap-2 mb-2">
              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill flex-shrink-0"
                style={{ fontSize: '0.7rem', minWidth: 45 }}>
                {b.impact}
              </span>
              <div>
                <div className="small fw-semibold">{b.factor}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{b.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
