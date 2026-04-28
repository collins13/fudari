'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { workersAPI, leadsAPI, publicReviewsAPI, reportsAPI, listingsAPI } from '@/lib/api';
import { whatsappBotLink } from '@/lib/whatsapp';
import { profileImageFor } from '@/lib/avatar';
import { skillTypeToLabel, vettingToPackage, getPackageBadgeClass } from '@/lib/skills';
import TrustScoreCard from '@/components/TrustScoreCard';

interface WorkerSkillInfo {
  id: number;
  skillType: string;
  description?: string;
  experienceYears?: number;
  hourlyRate?: string;
  isVerified?: boolean;
}

interface WorkerProfile {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  profileImage?: string;
  role: string;
  vettingLevel: string;
  trustScore: number;
  totalJobsCompleted: number;
  totalReviews: number;
  locationName?: string;
  isVerified: boolean;
  skills: WorkerSkillInfo[];
}

interface PublicReview {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  isVerified: boolean;
  createdAt: string;
}

function renderStars(rating: number, size = '') {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) {
    stars.push(<i key={`f${i}`} className={`fa-solid fa-star text-warning ${size}`}></i>);
  }
  if (rating % 1 >= 0.5) {
    stars.push(<i key="h" className={`fa-solid fa-star-half-stroke text-warning ${size}`}></i>);
  }
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) {
    stars.push(<i key={`e${i}`} className={`fa-regular fa-star text-warning ${size}`}></i>);
  }
  return stars;
}

const REPORT_REASONS = [
  { value: 'FRAUD', label: 'Fraud / Scam' },
  { value: 'POOR_QUALITY', label: 'Poor Quality Work' },
  { value: 'NO_SHOW', label: 'Did Not Show Up' },
  { value: 'RUDE_BEHAVIOR', label: 'Rude Behavior' },
  { value: 'OVERCHARGING', label: 'Overcharging' },
  { value: 'SAFETY_CONCERN', label: 'Safety Concern' },
  { value: 'OTHER', label: 'Other' },
];

export default function ArtisanProfilePage() {
  const params = useParams();
  const workerId = Number(params.id);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [bookingForm, setBookingForm] = useState({ service: '', date: '', message: '' });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    reviewerName: '',
  });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: '', description: '' });
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Portfolio images from listings
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  useEffect(() => {
    if (!workerId) return;
    const fetchWorker = async () => {
      try {
        const res = await workersAPI.getWorkerProfile(workerId);
        const w = res.data;
        setWorker(w);

        // Update SEO meta tags
        // Track profile view
        leadsAPI.trackProfileView(workerId).catch(() => {});
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 400) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();

    // Scroll listener for sticky bar
    const onScroll = () => setStickyVisible(window.scrollY > 350);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Fetch public reviews
    publicReviewsAPI.getReviewsForArtisan(workerId)
      .then(res => setReviews(res.data))
      .catch(() => {});

    // Fetch artisan's listings for portfolio images
    listingsAPI.getListings({ size: 20 })
      .then(res => {
        const allListings = res.data?.content || res.data || [];
        const artisanListings = allListings.filter((l: any) => l.artisanId === workerId);
        const imgs: string[] = [];
        artisanListings.forEach((l: any) => {
          if (l.images) {
            try {
              const parsed = JSON.parse(l.images);
              if (Array.isArray(parsed)) imgs.push(...parsed);
            } catch { /* ignore */ }
          }
        });
        setPortfolioImages(imgs);
      })
      .catch(() => {});

    return () => window.removeEventListener('scroll', onScroll);
  }, [workerId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const $ = (window as any).$;
    if (!$ || !$.fn) return;
    setTimeout(() => {
      if ($.fn.magnificPopup) {
        $('.portfolio-gallery').magnificPopup({
          delegate: 'a',
          type: 'image',
          gallery: { enabled: true },
        });
      }
    }, 600);
  }, [worker]);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSubmitted(true);
    setBookingForm({ service: '', date: '', message: '' });
  };

  const handleCallClick = () => {
    setPhoneRevealed(true);
    leadsAPI.trackCallClick(workerId).catch(() => {});
  };

  const handleWhatsAppClick = () => {
    leadsAPI.trackWhatsAppClick(workerId).catch(() => {});
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await publicReviewsAPI.createReview({
        artisanId: workerId,
        rating: reviewForm.rating,
        comment: reviewForm.comment || undefined,
        reviewerName: reviewForm.reviewerName || undefined,
      });
      setReviewSubmitted(true);
      setReviewForm({ rating: 5, comment: '', reviewerName: '' });

      // Refresh reviews
      const res = await publicReviewsAPI.getReviewsForArtisan(workerId);
      setReviews(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportsAPI.createReport({
        reportedArtisanId: workerId,
        reason: reportForm.reason,
        description: reportForm.description || undefined,
      });
      setReportSubmitted(true);
      setReportForm({ reason: '', description: '' });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit report');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (notFound || !worker) {
    return (
      <>
        <Navbar />
        <div className="container py-5 text-center">
          <i className="fa-solid fa-user-slash fs-1 text-muted mb-3 d-block"></i>
          <h4 className="text-muted">Service Provider not found</h4>
          <Link href="/artisans" className="btn btn-primary rounded-5 mt-3">Browse All Providers</Link>
        </div>
        <Footer />
      </>
    );
  }

  const pkg = vettingToPackage(worker.vettingLevel);
  const primarySkill = worker.skills?.[0];
  const skillLabel = primarySkill ? skillTypeToLabel(primarySkill.skillType) : 'General';

  return (
    <>
      <Navbar />

      {/* ===== PROFILE HEADER ===== */}
      <section className="dark-overlay hero mx-3 overflow-hidden position-relative py-4 py-lg-5 rounded-4 text-white mt-3">
        <img className="bg-image" src="/liston/images/header/04.jpg" alt="Cover" />
        <div className="container overlay-content py-5">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-4">
            <ol className="breadcrumb breadcrumb-light mb-0" style={{ '--bs-breadcrumb-divider': "'/'" } as React.CSSProperties}>
              <li className="breadcrumb-item"><Link href="/" className="text-white-50 text-decoration-none">Home</Link></li>
              <li className="breadcrumb-item"><Link href="/artisans" className="text-white-50 text-decoration-none">Artisans</Link></li>
              <li className="breadcrumb-item text-white-50">{skillLabel}</li>
              <li className="breadcrumb-item active text-white" aria-current="page">{worker.firstName} {worker.lastName}</li>
            </ol>
          </nav>
          <div className="row align-items-end g-4">
            <div className="col-auto">
              <img
                src={profileImageFor(worker.profileImage, `${worker.firstName} ${worker.lastName}`, worker.id)}
                alt={`${worker.firstName} ${worker.lastName}`}
                className="rounded-circle border border-3 border-white"
                style={{ width: 120, height: 120, objectFit: 'cover' }}
                loading="eager"
              />
            </div>
            <div className="col">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <span className={`badge ${getPackageBadgeClass(pkg)}`}>
                  {pkg === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                  {pkg === 'Gold' ? 'Pro' : pkg === 'Silver' ? 'Verified' : 'Standard'}
                </span>
                {worker.isVerified && <span className="badge bg-success"><i className="fa-solid fa-shield-halved me-1"></i>TUFIXIT Verified</span>}
              </div>
              <h1 className="fw-bold mb-1">{worker.firstName} {worker.lastName}</h1>
              <p className="fs-5 mb-2 opacity-90">
                <i className="fa-solid fa-screwdriver-wrench me-2"></i>{skillLabel}
              </p>
              <div className="d-flex align-items-center gap-2 mb-2">
                {renderStars(worker.trustScore)}
                <span className="fw-semibold">{worker.trustScore.toFixed(1)}</span>
                <span className="opacity-75">({worker.totalReviews} reviews)</span>
              </div>
              {worker.locationName && (
                <p className="mb-0 opacity-75">
                  <i className="fa-solid fa-location-dot me-2"></i>{worker.locationName}
                </p>
              )}
            </div>
            <div className="col-auto d-flex gap-2 flex-wrap">
              <Link
                href={`/artisans/${worker.id}/book`}
                className="btn btn-primary rounded-5 fw-medium"
              >
                <i className="fa-solid fa-calendar-check me-2"></i>Book Now
              </Link>
              <a
                href={whatsappBotLink(`Hi, I'd like to book ${worker.firstName} ${worker.lastName} (${skillLabel}) in ${worker.locationName || 'Nairobi'}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success rounded-5"
                onClick={handleWhatsAppClick}
              >
                <i className="fa-brands fa-whatsapp me-2"></i>WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className="py-5 bg-light mx-3 rounded-4 mt-3">
        <div className="container py-4">
          <div className="row g-4">
            {/* Left Main Column */}
            <div className="col-lg-8">
              {/* About */}
              <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
                <h4 className="fw-semibold mb-3">
                  About <span className="font-caveat text-primary">{worker.firstName}</span>
                </h4>
                <p className="mb-2">{primarySkill?.description || 'Experienced professional ready to help with your needs.'}</p>
                <div className="d-flex gap-4 mt-3">
                  {primarySkill?.experienceYears && (
                    <div>
                      <div className="fw-bold text-primary fs-4">{primarySkill.experienceYears}+</div>
                      <small className="text-muted">Years Experience</small>
                    </div>
                  )}
                  <div>
                    <div className="fw-bold text-primary fs-4">{worker.totalReviews}</div>
                    <small className="text-muted">Reviews</small>
                  </div>
                  <div>
                    <div className="fw-bold text-primary fs-4">{worker.trustScore.toFixed(1)}</div>
                    <small className="text-muted">Rating</small>
                  </div>
                  <div>
                    <div className="fw-bold text-primary fs-4">{worker.totalJobsCompleted}</div>
                    <small className="text-muted">Jobs Done</small>
                  </div>
                </div>
              </div>

              {/* Portfolio Images */}
              {portfolioImages.length > 0 && (
                <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
                  <h4 className="fw-semibold mb-3">Portfolio</h4>
                  <div className="row g-3 portfolio-gallery">
                    {portfolioImages.map((img, i) => (
                      <div key={i} className="col-6 col-md-4">
                        <a href={img} className="d-block rounded-3 overflow-hidden">
                          <img src={img} alt={`Portfolio ${i + 1}`} style={{ height: 200, objectFit: 'cover', width: '100%' }} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services / Skills */}
              {worker.skills && worker.skills.length > 0 && (
                <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
                  <h4 className="fw-semibold mb-3">Services Offered</h4>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Service</th>
                          <th className="text-end">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {worker.skills.map((skill) => (
                          <tr key={skill.id}>
                            <td>
                              <i className="fa-solid fa-check-circle text-success me-2"></i>
                              {skillTypeToLabel(skill.skillType)}
                              {skill.experienceYears && (
                                <span className="text-muted small ms-2">({skill.experienceYears} yrs exp)</span>
                              )}
                            </td>
                            <td className="text-end fw-semibold text-primary">
                              {skill.hourlyRate ? `KES ${parseFloat(skill.hourlyRate).toLocaleString()}/hr` : 'Contact for price'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="fw-semibold mb-0">Reviews ({reviews.length})</h4>
                  <button
                    className="btn btn-outline-primary btn-sm rounded-5"
                    onClick={() => { setShowReviewForm(!showReviewForm); setReviewSubmitted(false); }}
                  >
                    <i className="fa-solid fa-pen me-1"></i>Write Review
                  </button>
                </div>

                {/* Review Form */}
                {showReviewForm && !reviewSubmitted && (
                  <div className="bg-light rounded-3 p-3 mb-4">
                    <h6 className="fw-semibold mb-3">Leave a Review for {worker.firstName}</h6>
                    <form onSubmit={handleReviewSubmit}>
                      <div className="mb-3">
                        <label className="form-label fw-medium">Rating</label>
                        <div className="d-flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className="btn btn-link p-0"
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            >
                              <i className={`fa-${star <= reviewForm.rating ? 'solid' : 'regular'} fa-star fa-lg ${star <= reviewForm.rating ? 'text-warning' : 'text-muted'}`}></i>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-medium">Your Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter your name"
                          value={reviewForm.reviewerName}
                          onChange={(e) => setReviewForm({ ...reviewForm, reviewerName: e.target.value })}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-medium">Comment</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Share your experience..."
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        ></textarea>
                      </div>
                      <button type="submit" className="btn btn-primary rounded-5">
                        <i className="fa-solid fa-paper-plane me-2"></i>Submit Review
                      </button>
                    </form>
                  </div>
                )}

                {reviewSubmitted && (
                  <div className="alert alert-success rounded-3 mb-4">
                    <i className="fa-solid fa-check-circle me-2"></i>
                    Thank you! Your review has been submitted.
                  </div>
                )}

                {/* Review List */}
                {reviews.length === 0 ? (
                  <p className="text-muted text-center py-3">No reviews yet. Be the first to review!</p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-bottom pb-3">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div>
                            <span className="fw-semibold">{review.reviewerName}</span>
                            {review.isVerified && (
                              <span className="badge bg-success-subtle text-success ms-2 small">Verified</span>
                            )}
                          </div>
                          <small className="text-muted">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        <div className="mb-1">{renderStars(review.rating, 'small')}</div>
                        {review.comment && <p className="mb-0 text-muted small">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-lg-4">
              {/* AI Trust Score Card */}
              <div className="mb-4">
                <TrustScoreCard artisanId={worker.id} />
              </div>

              {/* Contact Card */}
              <div className="card border-0 rounded-4 shadow-sm p-4 mb-4">
                <h5 className="fw-semibold mb-3">Contact {worker.firstName}</h5>
                <div className="d-grid gap-2">
                  <a
                    href={`tel:${worker.phoneNumber}`}
                    className="btn btn-outline-primary rounded-5"
                    onClick={handleCallClick}
                  >
                    <i className="fa-solid fa-phone me-2"></i>
                    {phoneRevealed ? worker.phoneNumber : 'Call Now'}
                  </a>
                  <a
                    href={whatsappBotLink(`Hi, I'd like to book ${worker.firstName} ${worker.lastName} (${skillLabel}) in ${worker.locationName || 'Nairobi'}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success rounded-5"
                    onClick={handleWhatsAppClick}
                  >
                    <i className="fa-brands fa-whatsapp me-2"></i>Book via WhatsApp
                  </a>
                  <Link href={`/artisans/${worker.id}/book`} className="btn btn-primary rounded-5">
                    <i className="fa-solid fa-calendar-check me-2"></i>Book Now
                  </Link>
                </div>
                <div className="mt-3 pt-3 border-top">
                  <p className="text-muted small mb-1">
                    <i className="fa-solid fa-shield-halved text-success me-1"></i>
                    {worker.isVerified ? 'Verified by TUFIXIT' : 'TUFIXIT Member'}
                  </p>
                  <p className="text-success small mb-0">
                    <i className="fa-solid fa-clock me-1"></i>
                    {worker.vettingLevel === 'PRO'
                      ? 'Typically responds within 1 hr'
                      : worker.vettingLevel === 'VERIFIED'
                        ? 'Typically responds within 3 hrs'
                        : 'Typically responds same day'}
                  </p>
                </div>
              </div>

              {/* Tier Info — customer perspective */}
              <div className={`card border-0 rounded-4 shadow-sm p-4 mb-4`}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className={`badge ${getPackageBadgeClass(pkg)} fs-6 px-3 py-2`}>
                    {pkg === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                    {pkg === 'Gold' ? 'Pro' : pkg === 'Silver' ? 'Verified' : 'Standard'} Provider
                  </span>
                </div>
                {pkg === 'Gold' && (
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2"><i className="fa-solid fa-shield-halved text-success me-2"></i>Fully vetted &amp; background-checked by TUFIXIT</li>
                    <li className="mb-2"><i className="fa-solid fa-id-card text-success me-2"></i>Government ID verified</li>
                    <li className="mb-2"><i className="fa-solid fa-star text-warning me-2"></i>Top-rated Pro — consistently high ratings</li>
                    <li><i className="fa-solid fa-headset text-primary me-2"></i>Priority customer support included</li>
                  </ul>
                )}
                {pkg === 'Silver' && (
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2"><i className="fa-solid fa-shield-halved text-success me-2"></i>Identity verified by TUFIXIT</li>
                    <li className="mb-2"><i className="fa-solid fa-id-card text-success me-2"></i>National ID on file</li>
                    <li><i className="fa-solid fa-star text-warning me-2"></i>Verified professional with track record</li>
                  </ul>
                )}
                {pkg === 'Bronze' && (
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2"><i className="fa-solid fa-user-check text-primary me-2"></i>Registered TUFIXIT member</li>
                    <li><i className="fa-solid fa-star text-muted me-2"></i>Building their review history</li>
                  </ul>
                )}
              </div>

              {/* Booking Card — links to the full booking flow */}
              <div className="card border-0 rounded-4 shadow-sm p-4 mb-4" id="booking-card">
                <h5 className="fw-semibold mb-2">Book {worker.firstName}</h5>
                <p className="text-muted small mb-3">
                  No account needed. You&apos;ll receive a booking code via SMS to track your job in real time.
                </p>
                <div className="d-flex flex-column gap-2">
                  <Link href={`/artisans/${worker.id}/book`} className="btn btn-primary rounded-5 fw-medium">
                    <i className="fa-solid fa-calendar-check me-2"></i>Request a Booking
                  </Link>
                  <div className="text-center text-muted small">
                    <i className="fa-solid fa-shield-halved me-1 text-success"></i>
                    No payment now · Artisan confirms price · Job tracked by code
                  </div>
                </div>
              </div>

              {/* Starting Price */}
              {primarySkill?.hourlyRate && (
                <div className="card border-0 rounded-4 shadow-sm p-4 text-center mb-4">
                  <div className="text-muted small mb-1">Starting from</div>
                  <div className="display-6 fw-bold text-primary">KES {parseFloat(primarySkill.hourlyRate).toLocaleString()}</div>
                  <div className="text-muted small mt-1">per hour</div>
                </div>
              )}

              {/* Report Artisan */}
              <div className="card border-0 rounded-4 shadow-sm p-4">
                {!showReportForm ? (
                  <button
                    className="btn btn-sm btn-outline-danger rounded-2 px-3 py-1 text-decoration-none"
                    onClick={() => setShowReportForm(true)}
                  >
                    <i className="fa-solid fa-flag me-2"></i>Report this artisan
                  </button>
                ) : reportSubmitted ? (
                  <div className="alert alert-success rounded-3 mb-0">
                    <i className="fa-solid fa-check-circle me-2"></i>
                    Report submitted. We will review it.
                  </div>
                ) : (
                  <form onSubmit={handleReportSubmit}>
                    <h6 className="fw-semibold mb-3 text-danger">
                      <i className="fa-solid fa-flag me-2"></i>Report {worker.firstName}
                    </h6>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Reason</label>
                      <select
                        className="form-select"
                        value={reportForm.reason}
                        onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                        required
                      >
                        <option value="">Select a reason...</option>
                        {REPORT_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Details</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describe the issue..."
                        value={reportForm.description}
                        onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-danger btn-sm rounded-5">
                        Submit Report
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-5"
                        onClick={() => setShowReportForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* ===== STICKY BOOK BAR ===== */}
      <div
        className="position-fixed bottom-0 start-0 end-0 bg-white border-top shadow-lg py-2 px-3 d-flex align-items-center justify-content-between gap-3"
        style={{
          zIndex: 1050,
          transform: stickyVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.25s ease-in-out',
        }}
        aria-hidden={!stickyVisible}
      >
        <div className="d-flex align-items-center gap-2 overflow-hidden">
          <img
            src={profileImageFor(worker.profileImage, `${worker.firstName} ${worker.lastName}`, worker.id)}
            alt={worker.firstName}
            width={40}
            height={40}
            className="rounded-circle flex-shrink-0"
            style={{ objectFit: 'cover', width: 40, height: 40 }}
            loading="lazy"
          />
          <div className="overflow-hidden">
            <div className="fw-semibold small text-truncate">{worker.firstName} {worker.lastName}</div>
            <div className="text-muted text-truncate" style={{ fontSize: 12 }}>{skillLabel}</div>
          </div>
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <a
            href={whatsappBotLink(`Hi, I'd like to book ${worker.firstName} ${worker.lastName} (${skillLabel}) in ${worker.locationName || 'Nairobi'}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success btn-sm rounded-5"
            onClick={handleWhatsAppClick}
          >
            <i className="fa-brands fa-whatsapp me-1"></i>
            <span className="d-none d-sm-inline">WhatsApp</span>
          </a>
          <Link href={`/artisans/${worker.id}/book`} className="btn btn-primary btn-sm rounded-5">
            <i className="fa-solid fa-calendar-check me-1"></i>Book Now
          </Link>
        </div>
      </div>
      {/* ===== END STICKY BAR ===== */}
    </>
  );
}
