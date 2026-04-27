'use client';

import { useState } from 'react';
import { aiAPI } from '@/lib/api';

interface QualityResult {
  jobId: number;
  verdict: string;
  confidencePercent: number;
  analysis: string;
  observations: string[];
  recommendAutoRelease: boolean;
  flags: string[];
}

interface Props {
  jobId: number;
  onVerified?: (result: QualityResult) => void;
}

const VERDICT_STYLES: Record<string, { bg: string; icon: string; label: string }> = {
  VERIFIED: { bg: 'success', icon: 'fa-circle-check', label: 'Quality Verified' },
  NEEDS_REVIEW: { bg: 'warning', icon: 'fa-exclamation-triangle', label: 'Needs Review' },
  FLAGGED: { bg: 'danger', icon: 'fa-flag', label: 'Flagged for Review' },
  INSUFFICIENT_DATA: { bg: 'secondary', icon: 'fa-question-circle', label: 'Insufficient Data' },
};

export default function QualityVerificationCard({ jobId, onVerified }: Props) {
  const [result, setResult] = useState<QualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiAPI.qualityVerify(jobId);
      setResult(res.data);
      if (onVerified) onVerified(res.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message || 'Failed to run quality verification');
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <button
        className="btn btn-sm btn-outline-primary rounded-pill"
        onClick={runVerification}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" />
            Verifying Quality...
          </>
        ) : (
          <>
            <i className="fa-solid fa-magnifying-glass me-1" />
            AI Quality Check
          </>
        )}
      </button>
    );
  }

  const style = VERDICT_STYLES[result.verdict] || VERDICT_STYLES.NEEDS_REVIEW;

  return (
    <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
      {/* Verdict header */}
      <div className={`p-3 d-flex align-items-center justify-content-between bg-${style.bg} bg-opacity-10`}>
        <div className="d-flex align-items-center gap-2">
          <i className={`fa-solid ${style.icon} text-${style.bg}`} />
          <span className={`fw-semibold text-${style.bg}`}>{style.label}</span>
        </div>
        <span className={`badge bg-${style.bg} rounded-pill`}>
          {result.confidencePercent}% confidence
        </span>
      </div>

      <div className="p-3">
        {/* Analysis */}
        <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>{result.analysis}</p>

        {/* Observations */}
        {result.observations.length > 0 && (
          <div className="mb-3">
            <div className="small fw-semibold text-muted mb-1">Checkpoints</div>
            {result.observations.map((obs, i) => (
              <div key={i} className="d-flex align-items-start gap-2 mb-1">
                <i className="fa-solid fa-check-circle text-success mt-1" style={{ fontSize: '0.75rem' }} />
                <span className="small text-muted">{obs}</span>
              </div>
            ))}
          </div>
        )}

        {/* Flags */}
        {result.flags.length > 0 && (
          <div className="mb-3">
            <div className="small fw-semibold text-danger mb-1">Flags</div>
            <div className="d-flex flex-wrap gap-1">
              {result.flags.map((flag, i) => (
                <span key={i} className="badge bg-danger bg-opacity-10 text-danger rounded-pill"
                  style={{ fontSize: '0.72rem' }}>
                  <i className="fa-solid fa-flag me-1" />{flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Auto-release recommendation */}
        {result.recommendAutoRelease && (
          <div className="alert alert-success small mb-0 py-2 rounded-3">
            <i className="fa-solid fa-lock-open me-1" />
            Recommended for automatic escrow release
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 pb-3">
          <div className="alert alert-danger small mb-0 py-2 rounded-3">{error}</div>
        </div>
      )}
    </div>
  );
}
