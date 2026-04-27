'use client';
import { useState, useEffect } from 'react';
import { publicReviewsAPI, adminJobsAPI } from '@/lib/api';

interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  artisanName?: string;
  isVerified: boolean;
  createdAt: string;
}

function StarRating({ rating, size = 'normal' }: { rating: number; size?: 'normal' | 'large' }) {
  const fontSize = size === 'large' ? 22 : 14;
  return (
    <span className="text-warning" style={{ fontSize }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) { setLoading(false); return; }

    const admin = user.role === 'ADMIN';
    setIsAdmin(admin);

    if (admin) {
      // Admin: fetch all reviews across all artisans
      adminJobsAPI.getAllReviews()
        .then((res) => setReviews(res.data || []))
        .catch(() => setReviews([]))
        .finally(() => setLoading(false));
    } else {
      // Worker: fetch reviews for own profile
      if (!user.id && !user.userId) { setLoading(false); return; }
      publicReviewsAPI.getReviewsForArtisan(user.id || user.userId)
        .then((res) => setReviews(res.data || []))
        .catch(() => setReviews([]))
        .finally(() => setLoading(false));
    }
  }, []);

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0
      ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">{isAdmin ? 'All Reviews' : 'Reviews'}</h4>
        <p className="text-muted mb-0">{isAdmin ? 'All customer reviews across the platform' : 'Customer feedback on your services'}</p>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-5">
          <i className="fa-solid fa-star text-muted" style={{ fontSize: 48 }}></i>
          <p className="text-muted mt-3">No reviews yet. Share your profile to get reviews!</p>
        </div>
      ) : (
        <>
          {/* Rating Summary */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-4 align-items-center">
                <div className="col-md-3 text-center">
                  <div className="display-3 fw-bold mb-1" style={{ color: '#F84525' }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <StarRating rating={Math.round(avgRating)} size="large" />
                  <div className="text-muted small mt-2">Based on {reviews.length} reviews</div>
                </div>
                <div className="col-md-9">
                  {distribution.map((d) => (
                    <div key={d.star} className="d-flex align-items-center gap-3 mb-2">
                      <span className="text-muted small fw-medium" style={{ width: 40 }}>
                        {d.star} <i className="fa-solid fa-star text-warning" style={{ fontSize: 11 }}></i>
                      </span>
                      <div className="progress flex-grow-1" style={{ height: 10 }}>
                        <div className="progress-bar bg-warning" style={{ width: `${d.pct}%`, borderRadius: 10 }}></div>
                      </div>
                      <span className="text-muted small" style={{ width: 60 }}>{d.count} ({d.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="row g-3">
            {reviews.map((r) => (
              <div key={r.id} className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <span className="fw-semibold">{r.reviewerName}</span>
                        {r.isVerified && <span className="badge bg-success-subtle text-success ms-2 small">Verified</span>}
                        {isAdmin && r.artisanName && (
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            <i className="fa-solid fa-user-gear me-1"></i>Artisan: {r.artisanName}
                          </div>
                        )}
                      </div>
                      <span className="text-muted small">
                        {new Date(r.createdAt).toLocaleDateString('en-KE')}
                      </span>
                    </div>
                    <StarRating rating={r.rating} />
                    {r.comment && <p className="text-muted small mb-0 mt-2 fst-italic">&ldquo;{r.comment}&rdquo;</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
