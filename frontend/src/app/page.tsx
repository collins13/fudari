'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import { workersAPI, categoriesAPI } from '@/lib/api';
import { KENYA_MAJOR_TOWNS, formatKES } from '@/lib/kenya';
import { profileImageFor } from '@/lib/avatar';

interface FeaturedArtisan {
  id: number;
  name: string;
  skill: string;
  package: string;
  rating: number;
  reviews: number;
  location: string;
  price: number;
  image: string;
}

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  description: string;
  count: number;
  slug: string;
}

function getPackageBadgeClass(pkg: string) {
  if (pkg === 'Gold') return 'text-bg-warning';
  if (pkg === 'Silver') return 'text-bg-secondary';
  return 'text-bg-dark';
}

function skillTypeToLabel(skillType: string): string {
  const map: Record<string, string> = {
    ELECTRICIAN: 'Electrician', PLUMBER: 'Plumber', MECHANIC: 'Mechanic',
    CARPENTER: 'Carpenter', PAINTER: 'Painter', WELDER: 'Welder',
    HVAC_TECHNICIAN: 'HVAC Technician', APPLIANCE_REPAIR: 'Appliance Repair',
    ROOFING: 'Roofing', TILING: 'Tiling', MASON: 'Mason',
    GARDENER: 'Gardener', CLEANER: 'Cleaner', SECURITY: 'Security', OTHER: 'Other',
  };
  return map[skillType] || skillType;
}

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) {
    stars.push(<i key={`f${i}`} className="fa-solid fa-star text-warning"></i>);
  }
  if (rating % 1 >= 0.5) {
    stars.push(<i key="h" className="fa-solid fa-star-half-stroke text-warning"></i>);
  }
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) {
    stars.push(<i key={`e${i}`} className="fa-regular fa-star text-warning"></i>);
  }
  return stars;
}

function vettingToPackage(level: string): 'Gold' | 'Silver' | 'Bronze' {
  if (level === 'PRO') return 'Gold';
  if (level === 'VERIFIED') return 'Silver';
  return 'Bronze';
}

interface PlatformStats {
  totalArtisans: number;
  totalCompletedJobs: number;
  totalCategories: number;
  totalListings: number;
}

export default function HomePage() {
  const [searchCategory, setSearchCategory] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [featuredArtisans, setFeaturedArtisans] = useState<FeaturedArtisan[]>([]);
  const [loadingArtisans, setLoadingArtisans] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  const handleLocationChange = useCallback((value: string) => {
    setSearchLocation(value);
    if (value.length >= 2) {
      const filtered = KENYA_MAJOR_TOWNS.filter(t =>
        t.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6);
      setLocationSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    // Use /categories/stats — returns live artisan counts per category in one request
    categoriesAPI.getActiveCategoriesWithStats()
      .then((res) => {
        const cats = res.data || [];
        setCategories(
          cats.map((c: any) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || 'fa-wrench',
            description: c.description || '',
            count: c.artisanCount ?? 0,
            slug: c.name.toLowerCase(),
          }))
        );
      })
      .catch(() => setCategories([]));

    // Fetch platform stats for the stats banner
    categoriesAPI.getPlatformStats()
      .then((res) => setPlatformStats(res.data))
      .catch(() => {}); // silently fail — fallback to hardcoded shown below

    // Fetch featured artisans — with geolocation if available
    const fetchArtisans = (params: { latitude?: number; longitude?: number }) => {
      workersAPI.searchWorkers(params)
        .then((res) => {
          const workers = (res.data || []).slice(0, 20);
          setFeaturedArtisans(
            workers.map((w: any) => {
              const skill = w.skills?.[0];
              const fullName = `${w.firstName} ${w.lastName}`;
              return {
                id: w.id,
                name: fullName,
                skill: skill?.skillType ? skillTypeToLabel(skill.skillType) : 'General',
                package: vettingToPackage(w.vettingLevel || 'STANDARD'),
                rating: w.trustScore || 0,
                reviews: w.totalReviews || 0,
                location: w.locationName || 'Kenya',
                price: skill?.hourlyRate ? Number(skill.hourlyRate) : 0,
                image: profileImageFor(w.profileImage, fullName, w.id),
              };
            })
          );
        })
        .catch((err) => {
          console.error('Failed to fetch artisans:', err);
        })
        .finally(() => setLoadingArtisans(false));
    };

    // Try browser geolocation, fall back to no-location fetch
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchArtisans({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Permission denied or error — fetch without location
          fetchArtisans({});
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      fetchArtisans({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Initialize AOS
    const AOS = (window as any).AOS;
    if (AOS) AOS.init({ duration: 800, once: true });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCategory) params.set('category', searchCategory);
    if (searchLocation) params.set('location', searchLocation);
    window.location.href = `/artisans?${params.toString()}`;
  };

  return (
    <>
      <Navbar transparent />

      {/* ===== HERO SECTION ===== */}
      <div
        className="align-items-center d-flex hero-header dark-overlay mt-3 mx-3 overflow-hidden position-relative rounded-4"
        style={{ minHeight: '90vh' }}
      >
        <img className="bg-image" src="/liston/images/header/lg-01.jpg" alt="Hero Background" />
        <div className="container overlay-content py-5">
          <div className="hero-header-subtitle text-center text-white text-uppercase mb-3">
            Kenya&apos;s #1 Jua Kali Marketplace
          </div>
          <h1 className="display-1 fw-bold hero-header_title text-capitalize text-white text-center mb-4">
            Get a <span className="font-caveat text-span">Vetted Pro</span> in Minutes
          </h1>
          <p className="lead mb-3 text-center text-white">
            Verified artisans. Real reviews. Fast response. No login required.
          </p>
          {/* Trust indicators */}
          <div className="d-flex justify-content-center gap-3 gap-md-4 flex-wrap mb-5">
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-solid fa-shield-halved text-success"></i>ID-Verified Providers
            </span>
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-solid fa-clock text-warning"></i>Avg. 8 min Response
            </span>
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-solid fa-star text-warning"></i>4.6 Avg Rating
            </span>
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-brands fa-whatsapp text-success"></i>WhatsApp &amp; Call
            </span>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <form
                onSubmit={handleSearch}
                className="bg-white rounded-4 p-2 d-flex flex-column flex-md-row align-items-stretch shadow-lg"
              >
                {/* Category */}
                <div className="d-flex align-items-center flex-grow-1 px-3 py-2">
                  <i className="fa-solid fa-screwdriver-wrench text-primary me-3 fs-5"></i>
                  <select
                    className="form-select border-0 shadow-none fw-medium"
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                  >
                    <option value="">What service do you need?</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="d-none d-md-block border-start my-2"></div>
                {/* Location — with Kenya-specific autocomplete */}
                <div className="d-flex align-items-center flex-grow-1 px-3 py-2 position-relative">
                  <i className="fa-solid fa-location-dot text-primary me-3 fs-5"></i>
                  <input
                    type="text"
                    className="form-control border-0 shadow-none fw-medium"
                    placeholder="Where? (e.g. Westlands, Nairobi)"
                    value={searchLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    onFocus={() => searchLocation.length >= 2 && setShowSuggestions(locationSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoComplete="off"
                  />
                  {showSuggestions && (
                    <ul className="list-group position-absolute top-100 start-0 end-0 shadow-lg rounded-3 mt-1" style={{ zIndex: 1050 }}>
                      {locationSuggestions.map((town) => (
                        <li
                          key={town}
                          className="list-group-item list-group-item-action py-2 px-3 cursor-pointer"
                          style={{ cursor: 'pointer' }}
                          onMouseDown={() => { setSearchLocation(town); setShowSuggestions(false); }}
                        >
                          <i className="fa-solid fa-location-dot text-muted me-2 small"></i>{town}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Button */}
                <button type="submit" className="btn btn-primary rounded-3 px-4 py-3 fw-medium d-flex align-items-center justify-content-center gap-2">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Search</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END HERO ===== */}

      {/* ===== CATEGORIES SECTION ===== */}
      <div className="py-5">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-sm-10 col-lg-8">
              <div className="section-header text-center mb-5" data-aos="fade-down">
                <div className="d-inline-block font-caveat fs-1 fw-medium section-header__subtitle text-capitalize text-primary">
                  Categories
                </div>
                <h2 className="display-5 fw-semibold mb-3 section-header__title text-capitalize">
                  Browse by Category
                </h2>
                <div className="sub-title fs-16">
                  Find the right service provider for any job.{' '}
                  <span className="text-primary fw-semibold">
                    {categories.length > 0 ? `${categories.length} categories available.` : 'Verified artisans across Kenya.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-4">
            {categories.length === 0 ? (
              <div className="col-12 text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div key={cat.id} className="col-6 col-sm-4 col-lg-3">
                  <Link
                    href={`/artisans?category=${cat.slug}`}
                    className="card border-0 shadow-sm text-center p-4 rounded-4 h-100 d-block text-decoration-none card-hover"
                    data-aos="fade-up"
                    data-aos-delay={String(idx * 50)}
                  >
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                      style={{ width: 64, height: 64, background: 'rgba(248,69,37,0.1)' }}
                    >
                      <i className={`fa-solid ${cat.icon} fs-4 text-primary`}></i>
                    </div>
                    <h6 className="fw-semibold mb-1">{cat.name}</h6>
                    <small className="text-muted">{cat.count > 0 ? `${cat.count} Providers` : 'Browse'}</small>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* ===== END CATEGORIES ===== */}

      {/* ===== HOW IT WORKS ===== */}
      <div className="py-5 bg-light mx-3 rounded-4" id="how-it-works">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-sm-10 col-lg-8">
              <div className="section-header text-center mb-5" data-aos="fade-down">
                <div className="d-inline-block font-caveat fs-1 fw-medium section-header__subtitle text-capitalize text-primary">
                  Easy Steps
                </div>
                <h2 className="display-5 fw-semibold mb-3 section-header__title text-capitalize">
                  How TUFIXIT Works
                </h2>
                <div className="sub-title fs-16">From search to job done — no account needed, no upfront payment.</div>
              </div>
            </div>
          </div>
          <div className="row g-4 g-md-5 justify-content-center work-process">
            <div className="col-sm-6 col-lg-4">
              <div className="work-process position-relative p-3 px-xl-5" data-aos="fade" data-aos-delay="300">
                <div className="step-box d-flex gap-3 mb-4">
                  <div className="fs-5 text-dark fw-semibold">01/</div>
                  <i className="fs-50 fa-solid fa-magnifying-glass text-primary"></i>
                </div>
                <div className="step-desc">
                  <h4 className="fs-20 fw-semibold">Search &amp; Find</h4>
                  <p>Browse ID-verified pros by skill and location. See real ratings, completed jobs, and starting prices.</p>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="work-process position-relative p-3 px-xl-5" data-aos="fade" data-aos-delay="400">
                <div className="step-box d-flex gap-3 mb-4">
                  <div className="fs-5 text-dark fw-semibold">02/</div>
                  <i className="fs-50 fa-solid fa-calendar-check text-primary"></i>
                </div>
                <div className="step-desc">
                  <h4 className="fs-20 fw-semibold">Book &amp; Connect</h4>
                  <p>Call, WhatsApp, or book online — no account needed. Artisan confirms within minutes via SMS.</p>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="work-process position-relative p-3 px-xl-5" data-aos="fade" data-aos-delay="500">
                <div className="step-box d-flex gap-3 mb-4">
                  <div className="fs-5 text-dark fw-semibold">03/</div>
                  <i className="fs-50 fa-solid fa-star text-primary"></i>
                </div>
                <div className="step-desc">
                  <h4 className="fs-20 fw-semibold">Track &amp; Rate</h4>
                  <p>Track your job with a booking code. Pay on completion. Rate to help others find great pros.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END HOW IT WORKS ===== */}

      {/* ===== FEATURED ARTISANS CAROUSEL ===== */}
      <div className="py-5 position-relative overflow-hidden">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-sm-10 col-lg-8">
              <div className="section-header text-center mb-5" data-aos="fade-down">
                <div className="d-inline-block font-caveat fs-1 fw-medium section-header__subtitle text-capitalize text-primary">
                  Top Rated
                </div>
                <h2 className="display-5 fw-semibold mb-3 section-header__title text-capitalize">
                  Featured Service Providers
                </h2>
                <div className="sub-title fs-16">
                  Our highest-rated artisans ready to serve you.{' '}
                  <span className="text-primary fw-semibold">Book today.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-4">
            {loadingArtisans ? (
              <div className="col-12 text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">Loading artisans...</p>
              </div>
            ) : featuredArtisans.length === 0 ? (
              <div className="col-12 text-center py-5">
                <i className="fa-solid fa-users-slash fs-1 text-muted mb-2 d-block"></i>
                <p className="text-muted">Artisans coming soon! Be the first to <Link href="/register">register as an artisan</Link>.</p>
              </div>
            ) : (
              featuredArtisans.map((artisan) => (
                <div key={artisan.id} className="col-md-6 col-lg-4 col-xl-3">
                  <div className="card rounded-4 overflow-hidden border-0 shadow-sm h-100">
                    <div className="position-relative" style={{ height: 220 }}>
                      {artisan.image ? (
                        <img src={artisan.image} alt={artisan.name} className="card-img-top" style={{ height: 220, objectFit: 'cover', width: '100%' }} />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center w-100 h-100"
                          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        >
                          <span className="text-white fw-bold" style={{ fontSize: 56 }}>
                            {artisan.name[0]}
                          </span>
                        </div>
                      )}
                      <span className={`badge position-absolute top-0 start-0 m-2 ${getPackageBadgeClass(artisan.package)}`}>
                        {artisan.package === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                        {artisan.package}
                      </span>
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      <div className="align-items-center d-flex flex-wrap gap-1 card-start mb-1">
                        {renderStars(artisan.rating)}
                        <span className="fw-medium text-primary ms-1">({artisan.rating.toFixed(1)}) {artisan.reviews} reviews</span>
                      </div>
                      <h4 className="fs-5 fw-semibold mb-1">{artisan.name}</h4>
                      <p className="text-primary small mb-1">
                        <i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}
                      </p>
                      <p className="text-muted small mb-2">
                        <i className="fa-solid fa-location-dot me-1"></i>{artisan.location}
                      </p>
                      <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                        {artisan.price > 0 ? (
                          <strong className="text-primary">From KES {artisan.price.toLocaleString()}</strong>
                        ) : (
                          <span className="text-muted small">Contact for price</span>
                        )}
                        <Link href={`/artisans/${artisan.id}`} className="btn btn-primary btn-sm rounded-5">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* ===== END FEATURED ARTISANS ===== */}

      {/* ===== BROWSE LISTINGS BANNER ===== */}
      <div className="py-4 bg-light mx-3 rounded-4 mb-4">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <h3 className="fw-bold mb-2">Looking for a specific service?</h3>
              <p className="text-muted mb-0">
                Browse approved listings from verified service providers — find the right job at the right price.
              </p>
            </div>
            <div className="col-lg-5 text-lg-end d-flex gap-3 justify-content-lg-end">
              <Link href="/artisans?tab=listings" className="btn btn-primary rounded-5 px-4">
                <i className="fa-solid fa-list me-2"></i>Browse Listings
              </Link>
              <Link href="/artisans" className="btn btn-outline-primary rounded-5 px-4">
                <i className="fa-solid fa-users me-2"></i>Browse Providers
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END BROWSE LISTINGS ===== */}

      {/* ===== WHY TRUST TUFIXIT (Kenya-specific) ===== */}
      <div className="py-5">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-sm-10 col-lg-8">
              <div className="section-header text-center mb-5" data-aos="fade-down">
                <div className="d-inline-block font-caveat fs-1 fw-medium section-header__subtitle text-capitalize text-primary">
                  Built for Kenya
                </div>
                <h2 className="display-5 fw-semibold mb-3 section-header__title text-capitalize">
                  Why Kenyans Trust TUFIXIT
                </h2>
                <div className="sub-title fs-16">
                  Designed from the ground up for the Kenyan Jua Kali market.
                </div>
              </div>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-4" data-aos="fade-up">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(40,167,69,0.1)' }}>
                  <i className="fa-solid fa-mobile-screen-button fs-4 text-success"></i>
                </div>
                <h5 className="fw-semibold mb-2">M-Pesa Payments</h5>
                <p className="text-muted small mb-0">Pay securely via M-Pesa — no bank account needed. Track every transaction with Safaricom Daraja integration.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="100">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(248,69,37,0.1)' }}>
                  <i className="fa-solid fa-comment-sms fs-4 text-primary"></i>
                </div>
                <h5 className="fw-semibold mb-2">SMS Notifications</h5>
                <p className="text-muted small mb-0">Get instant SMS updates on booking status — works on any phone, no internet needed. Powered by Africa&apos;s Talking.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="200">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(13,110,253,0.1)' }}>
                  <i className="fa-solid fa-shield-halved fs-4 text-info"></i>
                </div>
                <h5 className="fw-semibold mb-2">PIN Verification</h5>
                <p className="text-muted small mb-0">Unique START &amp; COMPLETION PINs ensure only the right artisan works on your job. Full accountability.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="300">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(255,193,7,0.1)' }}>
                  <i className="fa-solid fa-star fs-4 text-warning"></i>
                </div>
                <h5 className="fw-semibold mb-2">No Login to Book</h5>
                <p className="text-muted small mb-0">Customers don&apos;t need an account. Just describe your problem, enter your phone, and book — simple as USSD.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="400">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(111,66,193,0.1)' }}>
                  <i className="fa-solid fa-brain fs-4 text-purple" style={{ color: '#6f42c1' }}></i>
                </div>
                <h5 className="fw-semibold mb-2">AI Price Estimates</h5>
                <p className="text-muted small mb-0">Get instant KES price estimates based on real Nairobi job data — no guessing, fair pricing for everyone.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="500">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(220,53,69,0.1)' }}>
                  <i className="fa-brands fa-whatsapp fs-4 text-success"></i>
                </div>
                <h5 className="fw-semibold mb-2">WhatsApp & Call</h5>
                <p className="text-muted small mb-0">Contact artisans directly via WhatsApp or phone call — the way Kenyans prefer to communicate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END WHY TRUST ===== */}

      {/* ===== STATS SECTION ===== */}
      <div className="bg-primary mx-3 position-relative py-5 rounded-4 text-white">
        <div className="container py-4">
          <div className="row justify-content-center text-center g-4">
            <div className="col-sm-6 col-lg-3" data-aos="fade-up">
              <div className="display-4 fw-bold">
                {platformStats ? `${platformStats.totalArtisans}+` : '—'}
              </div>
              <div className="fs-5 mt-1 opacity-75">ID-Verified Pros</div>
            </div>
            <div className="col-sm-6 col-lg-3" data-aos="fade-up" data-aos-delay="100">
              <div className="display-4 fw-bold">
                {platformStats ? `${platformStats.totalCompletedJobs}+` : '—'}
              </div>
              <div className="fs-5 mt-1 opacity-75">Jobs Completed</div>
            </div>
            <div className="col-sm-6 col-lg-3" data-aos="fade-up" data-aos-delay="200">
              <div className="display-4 fw-bold">
                {platformStats ? `${platformStats.totalCategories}` : '—'}
              </div>
              <div className="fs-5 mt-1 opacity-75">Service Categories</div>
            </div>
            <div className="col-sm-6 col-lg-3" data-aos="fade-up" data-aos-delay="300">
              <div className="display-4 fw-bold">
                {platformStats ? `${platformStats.totalListings}+` : '—'}
              </div>
              <div className="fs-5 mt-1 opacity-75">Active Listings</div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END STATS ===== */}

      {/* ===== CTA SECTION ===== */}
      <div className="py-5">
        <div className="container py-4">
          <div className="card border-0 rounded-4 shadow-sm overflow-hidden" data-aos="fade-up">
            <div className="card-body p-5 text-center" style={{ background: 'linear-gradient(135deg, #fff8f6 0%, #fff 100%)' }}>
              <div className="d-inline-block font-caveat fs-1 fw-medium text-primary mb-2">
                Are you a Pro?
              </div>
              <h2 className="display-5 fw-semibold mb-3">
                Get Found by Customers Near You
              </h2>
              <p className="lead text-muted mb-4 col-lg-8 mx-auto">
                Register your services, get found by thousands of customers across all 47 counties,
                and boost your income with our affordable plans from KES 300/mo.
                <span className="d-block mt-2 fw-medium text-dark">
                  Over {platformStats ? platformStats.totalArtisans : '100'}+ pros already growing with TUFIXIT.
                </span>
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Link href="/register" className="btn btn-primary btn-lg rounded-5 px-5">
                  <i className="fa-solid fa-user-plus me-2"></i>Register as Service Provider
                </Link>
                <Link href="/pricing" className="btn btn-outline-primary btn-lg rounded-5 px-5">
                  <i className="fa-solid fa-tag me-2"></i>View Packages
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END CTA ===== */}
      <WhatsAppWidget />

      <Footer />
    </>
  );
}
