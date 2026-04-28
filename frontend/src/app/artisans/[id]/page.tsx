'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { workersAPI, leadsAPI, publicReviewsAPI, reportsAPI, listingsAPI } from '@/lib/api';
import { whatsappBotLink } from '@/lib/whatsapp';
import { profileImageFor } from '@/lib/avatar';
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

function skillTypeToLabel(skillType: string): string {
  const map: Record<string, string> = {
    ELECTRICIAN: 'Electrician',
    PLUMBER: 'Plumber',
    MECHANIC: 'Mechanic',
    CARPENTER: 'Carpenter',
    PAINTER: 'Painter',
    WELDER: 'Welder',
    HVAC_TECHNICIAN: 'HVAC Technician',
    APPLIANCE_REPAIR: 'Appliance Repair',
    ROOFING: 'Roofing',
    TILING: 'Tiling',
    MASON: 'Mason',
    GARDENER: 'Gardener',
    CLEANER: 'Cleaner',
    SECURITY: 'Security',
    OTHER: 'Other',
  };
  return map[skillType] || skillType;
}

function vettingToPackage(level: string): 'Gold' | 'Silver' | 'Bronze' {
  if (level === 'PRO') return 'Gold';
  if (level === 'VERIFIED') return 'Silver';
  return 'Bronze';
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

function getPackageBadgeClass(pkg: string) {
  if (pkg === 'Gold') return 'text-bg-warning';
  if (pkg === 'Silver') return 'text-bg-secondary';
  return 'text-bg-dark';
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

  // Reviews state
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    reviewerName: '',
    reviewerPhone: '',
    reviewerEmail: '',
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
        const name = `${w.firstName} ${w.lastName}`;
        const skill = w.skills?.[0]?.skillType?.replace(/_/g, ' ') || 'Artisan';
        const loc = w.locationName || 'Kenya';
        const title = `${name} - ${skill} in ${loc} | TUFIXIT`;
        const desc = `Hire ${name}, a verified ${skill.toLowerCase()} in ${loc}. ${w.skills?.[0]?.description || 'Contact via phone or WhatsApp on TUFIXIT.'}`;

        document.title = title;
        const setMeta = (attr: string, key: string, content: string) => {
          let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
          if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
          el.content = content;
        };
        setMeta('name', 'description', desc);
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:image', w.profileImage || 'https://tufixit.com/liston/images/header/lg-01.jpg');
        setMeta('property', 'og:url', `https://tufixit.com/artisans/${workerId}`);
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:description', desc);

        // Add JSON-LD structured data
        const existing = document.getElementById('artisan-jsonld');
        if (existing) existing.remove();
        const script = document.createElement('script');
        script.id = 'artisan-jsonld';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: name,
          description: desc,
          image: w.profileImage || undefined,
          address: { "@type": "PostalAddress", addressLocality: loc, addressCountry: "KE" },
          aggregateRating: w.trustScore > 0 ? {
            "@type": "AggregateRating",
            ratingValue: w.trustScore.toFixed(1),
            reviewCount: w.totalReviews || 0,
            bestRating: "5",
          } : undefined,
          priceRange: w.skills?.[0]?.hourlyRate ? `KES ${w.skills[0].hourlyRate}/hr` : undefined,
          telephone: w.phoneNumber,
          url: `https://tufixit.com/artisans/${workerId}`,
        });
        document.head.appendChild(script);

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
        reviewerPhone: reviewForm.reviewerPhone || undefined,
        reviewerEmail: reviewForm.reviewerEmail || undefined,
      });
      setReviewSubmitted(true);
      setReviewForm({ rating: 5, comment: '', reviewerName: '', reviewerPhone: '', reviewerEmail: '' });

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
  const maskedPhone = worker.phoneNumber.replace(/(\+\d{3})\d{5}(\d{3})/, '$1*****$2');

  return (
    <>
      <Navbar />

      {/* ===== PROFILE HEADER ===== */}
      <section className="dark-overlay hero mx-3 overflow-hidden position-relative py-4 py-lg-5 rounded-4 text-white mt-3">
        <img className="bg-image" src="/liston/images/header/04.jpg" alt="Cover" />
        <div className="container overlay-content py-5">
          <div className="row align-items-end g-4">
            <div className="col-auto">
              <img
                src={profileImageFor(worker.profileImage, `${worker.firstName} ${worker.lastName}`, worker.id)}
                alt={`${worker.firstName} ${worker.lastName}`}
                className="rounded-circle border border-3 border-white"
                style={{ width: 120, height: 120, objectFit: 'cover' }}
              />
            </div>
            <div className="col">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <span className={`badge ${getPackageBadgeClass(pkg)}`}>
                  {pkg === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                  {pkg} Member
                </span>
                {worker.isVerified && <span className="badge bg-success">Verified</span>}
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
              <button
                className="btn btn-light rounded-5"
                onClick={handleCallClick}
              >
                <i className="fa-solid fa-phone me-2"></i>Contact
              </button>
              <Link href={`/chat/${worker.id}`} className="btn btn-outline-light rounded-5">
                <i className="fa-solid fa-message me-2"></i>Message
              </Link>
              <Link href={`/artisans/${worker.id}/book`} className="btn btn-primary rounded-5">
                <i className="fa-solid fa-calendar-check me-2"></i>Book Now
              </Link>
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
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label fw-medium">Phone Number</label>
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="+254..."
                            value={reviewForm.reviewerPhone}
                            onChange={(e) => setReviewForm({ ...reviewForm, reviewerPhone: e.target.value })}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-medium">Email</label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="your@email.com"
                            value={reviewForm.reviewerEmail}
                            onChange={(e) => setReviewForm({ ...reviewForm, reviewerEmail: e.target.value })}
                          />
                        </div>
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
                  <button
                    className="btn btn-outline-primary rounded-5"
                    onClick={handleCallClick}
                  >
                    <i className="fa-solid fa-phone me-2"></i>
                    {phoneRevealed ? worker.phoneNumber : maskedPhone}
                    {!phoneRevealed && <span className="ms-2 text-muted small">(tap to reveal)</span>}
                  </button>
                  <a
                    href={whatsappBotLink(`Hi, I'd like to book ${worker.firstName} ${worker.lastName} (${skillLabel}) in ${worker.locationName || 'Nairobi'}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success rounded-5"
                    onClick={handleWhatsAppClick}
                  >
                    <i className="fa-brands fa-whatsapp me-2"></i>Book via WhatsApp
                  </a>
                  <Link href={`/chat/${worker.id}`} className="btn btn-outline-primary rounded-5">
                    <i className="fa-solid fa-message me-2"></i>Message
                  </Link>
                  <Link href={`/artisans/${worker.id}/book`} className="btn btn-primary rounded-5">
                    <i className="fa-solid fa-calendar-check me-2"></i>Book Now
                  </Link>
                </div>
                <div className="mt-3 pt-3 border-top text-center">
                  <p className="text-muted small mb-0">
                    <i className="fa-solid fa-shield-halved text-success me-1"></i>
                    {worker.isVerified ? 'Verified by TUFIXIT' : 'TUFIXIT Member'}
                  </p>
                </div>
              </div>

              {/* Package Info */}
              <div className={`card border-0 rounded-4 shadow-sm p-4 mb-4`}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className={`badge ${getPackageBadgeClass(pkg)} fs-6 px-3 py-2`}>
                    {pkg === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                    {pkg} Package
                  </span>
                </div>
                {pkg === 'Gold' && (
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-1"><i className="fa-solid fa-check text-success me-2"></i>Featured in search results</li>
                    <li className="mb-1"><i className="fa-solid fa-check text-success me-2"></i>Unlimited active listings</li>
                    <li className="mb-1"><i className="fa-solid fa-check text-success me-2"></i>Priority support</li>
                    <li><i className="fa-solid fa-check text-success me-2"></i>Analytics dashboard</li>
                  </ul>
                )}
                {pkg === 'Silver' && (
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-1"><i className="fa-solid fa-check text-success me-2"></i>Higher search visibility</li>
                    <li className="mb-1"><i className="fa-solid fa-check text-success me-2"></i>3 active listings</li>
                    <li><i className="fa-solid fa-check text-success me-2"></i>Portfolio upload</li>
                  </ul>
                )}
                {pkg === 'Bronze' && (
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-1"><i className="fa-solid fa-check text-success me-2"></i>Basic listing</li>
                    <li><i className="fa-solid fa-check text-success me-2"></i>1 active listing</li>
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
                    className="btn btn-link text-danger text-decoration-none p-0"
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
    </>
  );
}
