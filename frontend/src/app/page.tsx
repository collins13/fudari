'use client';

import { useEffect, useState, useCallback, type ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import { workersAPI, categoriesAPI, apiErrorMessage } from '@/lib/api';
import { KENYA_MAJOR_TOWNS, formatKES, matchSymptomToSkills, skillLabelBilingual, skillLabelSwahili, SKILL_LABELS_KE } from '@/lib/kenya';
import { profileImageFor, isGeneratedAvatar } from '@/lib/avatar';
import { skillTypeToLabel, vettingToPackage, getPackageBadgeClass, packageLabel } from '@/lib/skills';
import { whatsappBotLink } from '@/lib/whatsapp';

interface FeaturedArtisan {
  id: number;
  name: string;
  skill: string;
  skillType: string;
  package: string;
  rating: number;
  reviews: number;
  location: string;
  price: number;
  image: string;
  totalJobsCompleted: number;
  availableNow: boolean;
}

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  description: string;
  count: number;
  slug: string;
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

interface PlatformStats {
  totalArtisans: number;
  totalCompletedJobs: number;
  totalCategories: number;
  totalListings: number;
}

function getAvailability(availableNow: boolean) {
  return availableNow
    ? { label: 'Available now', color: '#22c55e' }
    : { label: 'Check availability', color: '#94a3b8' };
}

function TrustFacts({ pkg, jobs, rating, reviews }: { pkg: string; jobs: number; rating: number; reviews: number }) {
  const facts: ReactElement[] = [];
  if (pkg === 'Gold' || pkg === 'Silver')
    facts.push(<span key="v"><i className="fa-solid fa-shield-halved text-success me-1"></i>Verified ID</span>);
  if (jobs > 0)
    facts.push(<span key="j">{jobs} jobs done</span>);
  if (reviews > 0)
    facts.push(<span key="r"><i className="fa-solid fa-star text-warning me-1"></i>{rating.toFixed(1)} ({reviews})</span>);
  if (facts.length === 0)
    facts.push(<span key="n" className="text-muted">New here</span>);
  return (
    <div className="d-flex flex-wrap align-items-center gap-1 mb-2" style={{ fontSize: '0.72rem', color: '#6c757d' }}>
      {facts.reduce<ReactElement[]>((acc, el, i) =>
        i === 0 ? [el] : [...acc, <span key={`d${i}`} className="text-muted mx-1">•</span>, el], [])}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [problemInput, setProblemInput] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [problemSuggestions, setProblemSuggestions] = useState<{ skillType: string; label: string }[]>([]);
  const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [featuredArtisans, setFeaturedArtisans] = useState<FeaturedArtisan[]>([]);
  const [loadingArtisans, setLoadingArtisans] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  // Aggregate rating across loaded pros; null until at least one real review exists.
  const liveRating = (() => {
    const rated = featuredArtisans.filter((a) => a.reviews > 0 && a.rating > 0);
    if (rated.length === 0) return null;
    const reviewCount = rated.reduce((sum, a) => sum + a.reviews, 0);
    const weighted = rated.reduce((sum, a) => sum + a.rating * a.reviews, 0);
    return { average: weighted / reviewCount, reviewCount };
  })();

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

  // /categories/stats returns live artisan counts per category in one request.
  const loadCategories = useCallback(() => {
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
            slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          }))
        );
        setCategoriesError(null);
      })
      .catch((err) => {
        setCategories([]);
        setCategoriesError(apiErrorMessage(err, "We couldn't load categories."));
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  const retryCategories = useCallback(() => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    // Fetch platform stats for the stats banner
    categoriesAPI.getPlatformStats()
      .then((res) => setPlatformStats(res.data))
      .catch(() => setPlatformStats(null));

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
                skillType: skill?.skillType || '',
                package: vettingToPackage(w.vettingLevel || 'STANDARD'),
                rating: w.trustScore || 0,
                reviews: w.totalReviews || 0,
                location: w.locationName || 'Kenya',
                price: skill?.hourlyRate ? Number(skill.hourlyRate) : 0,
                image: profileImageFor(w.profileImage, fullName, w.id),
                totalJobsCompleted: w.totalJobsCompleted || 0,
                availableNow: w.availableNow === true,
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
    if (document.querySelector('link[data-aos-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/liston/plugins/aos/aos.min.css';
    link.setAttribute('data-aos-css', '');
    document.head.appendChild(link);
  }, []);

  const handleProblemChange = useCallback((value: string) => {
    setProblemInput(value);
    setSelectedSkill('');
    const q = value.toLowerCase().trim();
    if (q.length < 2) {
      setShowProblemSuggestions(false);
      return;
    }

    const bySymptom = matchSymptomToSkills(value, 4);
    // Also allow typing the trade name directly.
    const byName = Object.keys(SKILL_LABELS_KE).filter((k) => {
      const e = SKILL_LABELS_KE[k];
      return e.en.toLowerCase().includes(q) || e.sw.toLowerCase().includes(q);
    });

    const ordered = [...bySymptom, ...byName.filter((k) => !bySymptom.includes(k))].slice(0, 6);
    const suggestions = ordered.map((skillType) => ({
      skillType,
      label: skillLabelBilingual(skillType),
    }));

    setProblemSuggestions(suggestions);
    setShowProblemSuggestions(suggestions.length > 0);
  }, []);

  const selectSkill = useCallback((skillType: string, label: string) => {
    setSelectedSkill(skillType);
    setProblemInput(label);
    setShowProblemSuggestions(false);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    // An explicit pick wins; otherwise infer the trade from whatever the customer typed.
    const skill = selectedSkill || matchSymptomToSkills(problemInput, 1)[0];
    if (skill) params.set('skill', skill);
    else if (problemInput.trim()) params.set('q', problemInput.trim());
    if (searchLocation) params.set('location', searchLocation);
    router.push(`/artisans?${params.toString()}`);
  };

  return (
    <>
      {/* Not `transparent`: the hero below is an inset rounded card (mt-3 mx-3),
          so the navbar sits on the page background, not on the dark image. */}
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <div className="align-items-center d-flex hero-header tx-hero-home dark-overlay mt-3 mx-3 overflow-hidden position-relative rounded-4">
        <Image
          className="bg-image"
          src="/liston/images/header/lg-01.jpg"
          alt="Verified artisans, cleaners, riders, barbers and other service pros in Nairobi and Kenya"
          fill
          priority
          quality={60}
          sizes="100vw"
        />
        <div className="container overlay-content py-5">
          <div className="hero-header-subtitle text-center text-white text-uppercase mb-3">
            Verified Service Providers Across Kenya
          </div>
          <h1 className="display-1 fw-bold hero-header_title text-capitalize text-white text-center mb-4">
            Get It <span className="font-caveat text-span">Fixed Today</span> — Nairobi and Countrywide
          </h1>
          <p className="lead mb-2 mb-md-3 text-center text-white">
            Verified pros. Real reviews. No login required.
          </p>
          {/* Trust indicators — only factual platform guarantees, plus live rating when we have one */}
          <div className="tx-hero-trust d-flex justify-content-center gap-3 gap-md-4 flex-wrap mb-3 mb-md-5">
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-solid fa-shield-halved text-success"></i>ID-Verified Pros
            </span>
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-solid fa-wallet text-warning"></i>No booking fee
            </span>
            {liveRating && (
              <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
                <i className="fa-solid fa-star text-warning"></i>
                {liveRating.average.toFixed(1)} from {liveRating.reviewCount} reviews
              </span>
            )}
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
                {/* Problem — accepts a symptom ("tap is leaking") or a trade */}
                <div className="d-flex align-items-center flex-grow-1 px-3 py-2 position-relative">
                  <i className="fa-solid fa-screwdriver-wrench text-primary me-3 fs-5"></i>
                  <input
                    type="text"
                    className="form-control border-0 shadow-none fw-medium"
                    placeholder="What's the problem? e.g. tap is leaking"
                    value={problemInput}
                    onChange={(e) => handleProblemChange(e.target.value)}
                    onFocus={() => setShowProblemSuggestions(problemSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowProblemSuggestions(false), 200)}
                    autoComplete="off"
                    aria-label="What service do you need?"
                  />
                  {showProblemSuggestions && (
                    <ul className="list-group position-absolute top-100 start-0 end-0 shadow-lg rounded-3 mt-1" style={{ zIndex: 9999 }}>
                      {problemSuggestions.map((s) => (
                        <li
                          key={s.skillType}
                          className="list-group-item list-group-item-action py-2 px-3"
                          style={{ cursor: 'pointer' }}
                          onMouseDown={() => selectSkill(s.skillType, s.label)}
                        >
                          <i className="fa-solid fa-screwdriver-wrench text-primary me-2 small"></i>
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
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
                    <ul className="list-group position-absolute top-100 start-0 end-0 shadow-lg rounded-3 mt-1" style={{ zIndex: 9999 }}>
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
                <button type="submit" className="btn btn-accent rounded-3 px-4 py-3 fw-medium d-flex align-items-center justify-content-center gap-2">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Search</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END HERO ===== */}

      {/* ===== HOW BOOKING WORKS STRIP ===== */}
      <div className="bg-white border-bottom py-4">
        <div className="container">
          <div className="row g-3">
            {[
              { icon: 'fa-magnifying-glass', title: 'Search free', text: 'Browse verified pros near you. No account needed.' },
              { icon: 'fa-comments', title: 'Agree the price first', text: 'Talk on WhatsApp or call before any work starts.' },
              { icon: 'fa-shield-halved', title: 'PIN-verified job', text: 'Confirm arrival and completion with your own codes.' },
              { icon: 'fa-money-bill-wave', title: 'Pay on completion', text: 'Pay by M-Pesa once the work is done, not before.' },
            ].map((step) => (
              <div key={step.title} className="col-6 col-lg-3">
                <div className="d-flex align-items-start gap-2 p-2 rounded-3 h-100" style={{ background: '#f8f9fa' }}>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{ width: 36, height: 36, background: 'var(--tx-primary-soft)', color: 'var(--bs-primary)' }}
                  >
                    <i className={`fa-solid ${step.icon}`} aria-hidden="true"></i>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="fw-semibold" style={{ fontSize: '0.82rem' }}>{step.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>{step.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ===== END HOW BOOKING WORKS STRIP ===== */}

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
                  Find the right person for any job.{' '}
                  <span className="text-primary fw-semibold">
                    {categories.length > 0 ? `${categories.length} categories available.` : 'Verified pros across Kenya.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-4">
            {categoriesLoading ? (
              <div className="col-12 text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading categories</span>
                </div>
              </div>
            ) : categoriesError ? (
              <div className="col-12 text-center py-4">
                <p className="text-muted mb-3">{categoriesError}</p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <button type="button" className="btn btn-primary" onClick={retryCategories}>
                    <i className="fa-solid fa-rotate-right me-2" />Try again
                  </button>
                  <Link href="/artisans" className="btn btn-outline-primary">Browse All Services</Link>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="col-12 text-center py-4">
                <p className="text-muted mb-3">No categories published yet.</p>
                <Link href="/artisans" className="btn btn-primary">Browse All Services</Link>
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div key={cat.id} className="col-6 col-sm-4 col-lg-3">
                  <Link
                    href={`/artisans?category=${encodeURIComponent(cat.slug)}`}
                    className="card border-0 shadow-sm text-center p-4 rounded-4 h-100 d-block text-decoration-none card-hover"
                    data-aos="fade-up"
                    data-aos-delay={String(idx * 50)}
                  >
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                      style={{ width: 64, height: 64, background: 'var(--tx-primary-soft)' }}
                    >
                      <i className={`fa-solid ${cat.icon} fs-4 text-primary`}></i>
                    </div>
                    <h6 className="fw-semibold mb-1">{cat.name}</h6>
                    <small className="text-muted">{cat.count > 0 ? `${cat.count} available` : 'Available'}</small>
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
                  How FUDARI Works
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
                  <p>Call, WhatsApp, or book online — no account needed. They confirm within minutes via SMS.</p>
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
                  Featured Pros
                </h2>
                <div className="sub-title fs-16">
                  Our highest-rated pros ready to serve you.{' '}
                  <span className="text-primary fw-semibold">Book today.</span>
                </div>
              </div>
            </div>
          </div>
          {loadingArtisans ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Finding someone near you…</p>
            </div>
          ) : featuredArtisans.length === 0 ? (
            <div className="text-center py-5">
              <i className="fa-solid fa-users-slash fs-1 text-muted mb-2 d-block"></i>
              <p className="text-muted mb-2">No exact match nearby right now. Try searching your area or use WhatsApp for assisted matching.</p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Link href="/artisans" className="btn btn-outline-primary btn-sm rounded-5">Browse All Services</Link>
                <a href="https://wa.me/254703954539?text=Hi%20FUDARI%2C%20please%20help%20me%20find%20someone%20near%20me" target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm rounded-5">
                  <i className="fa-brands fa-whatsapp me-1"></i>Get Help on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {featuredArtisans.map((artisan) => (
                <div key={artisan.id} className="col-md-6 col-lg-4 col-xl-3">
                  <div className="card rounded-4 overflow-hidden border-0 shadow-sm h-100">
                    <div className="position-relative overflow-hidden" style={{ height: 220 }}>
                      {artisan.image ? (
                        <Image
                          src={artisan.image}
                          alt={artisan.name}
                          fill
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          unoptimized={isGeneratedAvatar(artisan.image)}
                        />
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
                        {packageLabel(artisan.package)}
                      </span>
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      {(() => { const av = getAvailability(artisan.availableNow); return (
                        <div className="d-flex align-items-center gap-1 mb-2">
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: av.color, display: 'inline-block', flexShrink: 0 }}></span>
                          <span className="small fw-medium" style={{ color: av.color }}>{av.label}</span>
                        </div>
                      ); })()}
                      <h4 className="fs-5 fw-semibold mb-1">{artisan.name}</h4>
                      <p className="text-primary small mb-1">
                        <i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}
                        {skillLabelSwahili(artisan.skillType) && (
                          <span className="text-muted"> &middot; {skillLabelSwahili(artisan.skillType)}</span>
                        )}
                      </p>
                      <p className="text-muted small mb-2">
                        <i className="fa-solid fa-location-dot me-1"></i>{artisan.location}
                      </p>
                      <TrustFacts pkg={artisan.package} jobs={artisan.totalJobsCompleted} rating={artisan.rating} reviews={artisan.reviews} />
                      <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top gap-2">
                        {artisan.price > 0 ? (
                          <strong className="text-primary" style={{ fontSize: '0.85rem' }}>From KES {artisan.price.toLocaleString()}</strong>
                        ) : (
                          <span className="text-muted small">Ask for price</span>
                        )}
                        <div className="d-flex gap-1">
                          <a
                            href={whatsappBotLink(`Hi FUDARI, I'd like to book ${artisan.name} (${artisan.skill}) in ${artisan.location}.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-success btn-sm rounded-5 px-2"
                            aria-label={`Ask ${artisan.name} a question on WhatsApp`}
                            title="Ask a question on WhatsApp"
                          >
                            <i className="fa-brands fa-whatsapp"></i>
                          </a>
                          <Link href={`/artisans/${artisan.id}`} className="btn btn-primary btn-sm rounded-5">
                            View Profile
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ===== END FEATURED ARTISANS ===== */}

      {/* ===== SEE ALL ARTISANS LINK ===== */}
      <div className="text-center py-2 pb-5">
        <Link href="/artisans" className="btn btn-outline-primary btn-lg rounded-5 px-5">
          <i className="fa-solid fa-users me-2"></i>Browse All Services
          <i className="fa-solid fa-arrow-right ms-2"></i>
        </Link>
      </div>
      {/* ===== END SEE ALL ===== */}

      {/* ===== WHY TRUST FUDARI (Kenya-specific) ===== */}
      <div className="py-5">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-sm-10 col-lg-8">
              <div className="section-header text-center mb-5" data-aos="fade-down">
                <div className="d-inline-block font-caveat fs-1 fw-medium section-header__subtitle text-capitalize text-primary">
                  Built for Kenya
                </div>
                <h2 className="display-5 fw-semibold mb-3 section-header__title text-capitalize">
                  Why Kenyans Trust FUDARI
                </h2>
                <div className="sub-title fs-16">
                  Designed from the ground up for how Kenyans actually hire local services.
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
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'var(--tx-primary-soft)' }}>
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
                <p className="text-muted small mb-0">Unique START &amp; COMPLETION PINs ensure only the right person works on your job. Full accountability.</p>
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
                <p className="text-muted small mb-0">Contact pros directly via WhatsApp or phone call — the way Kenyans prefer to communicate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== END WHY TRUST ===== */}

      {/* ===== STATS SECTION ===== */}
      {platformStats && (
        <div className="bg-primary mx-3 position-relative py-5 rounded-4 text-white">
          <div className="container py-4">
            <div className="row justify-content-center text-center g-4">
              <div className="col-sm-6 col-lg-3" data-aos="fade-up">
                <div className="display-4 fw-bold">{platformStats.totalArtisans}</div>
                <div className="fs-5 mt-1 opacity-75">ID-Verified Pros</div>
              </div>
              <div className="col-sm-6 col-lg-3" data-aos="fade-up" data-aos-delay="100">
                <div className="display-4 fw-bold">{platformStats.totalCompletedJobs}</div>
                <div className="fs-5 mt-1 opacity-75">Jobs Completed</div>
              </div>
              <div className="col-sm-6 col-lg-3" data-aos="fade-up" data-aos-delay="200">
                <div className="display-4 fw-bold">{platformStats.totalCategories}</div>
                <div className="fs-5 mt-1 opacity-75">Service Categories</div>
              </div>
              <div className="col-sm-6 col-lg-3" data-aos="fade-up" data-aos-delay="300">
                <div className="display-4 fw-bold">{platformStats.totalListings}</div>
                <div className="fs-5 mt-1 opacity-75">Active Listings</div>
              </div>
            </div>
          </div>
        </div>
      )}
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
                Register your services, get found by customers across all 47 counties,
                and boost your income with our affordable plans from KES 500/mo.
                {platformStats && platformStats.totalArtisans > 0 && (
                  <span className="d-block mt-2 fw-medium text-dark">
                    {platformStats.totalArtisans} pros already growing with FUDARI.
                  </span>
                )}
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Link href="/register" className="btn btn-primary btn-lg rounded-5 px-5">
                  <i className="fa-solid fa-user-plus me-2"></i>Join as a Pro
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

      <Script
        src="/liston/plugins/aos/aos.min.js"
        strategy="lazyOnload"
        onLoad={() => (window as unknown as { AOS?: { init: (o: object) => void } }).AOS?.init({ duration: 800, once: true })}
      />
    </>
  );
}
