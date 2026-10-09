'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import ProviderCard from '@/components/ProviderCard';
import { workersAPI, categoriesAPI, apiErrorMessage } from '@/lib/api';
import { KENYA_MAJOR_TOWNS, matchSymptomToSkills, skillLabelBilingual, skillLabelSwahili, SKILL_LABELS_KE } from '@/lib/kenya';
import {
  FEATURED_ARTISAN_LIMIT,
  toCategoryItem,
  toFeaturedArtisan,
  type CategoryItem,
  type FeaturedArtisan,
  type PlatformStats,
} from '@/lib/homeData';
import { whatsappBotLink } from '@/lib/whatsapp';

export interface HomeInitialData {
  categories: CategoryItem[];
  artisans: FeaturedArtisan[];
  stats: PlatformStats | null;
}

export default function HomeClient({ initial }: { initial: HomeInitialData }) {
  const router = useRouter();
  const [problemInput, setProblemInput] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [problemSuggestions, setProblemSuggestions] = useState<{ skillType: string; label: string }[]>([]);
  const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [searchLocation, setSearchLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  // Seeded from the server render so the markup crawlers get is not an empty spinner.
  const [featuredArtisans, setFeaturedArtisans] = useState<FeaturedArtisan[]>(initial.artisans);
  const [loadingArtisans, setLoadingArtisans] = useState(initial.artisans.length === 0);
  const [categories, setCategories] = useState<CategoryItem[]>(initial.categories);
  const [categoriesLoading, setCategoriesLoading] = useState(initial.categories.length === 0);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(initial.stats);

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
    setActiveLocationIndex(0);
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
        setCategories((res.data || []).map(toCategoryItem));
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
    if (initial.categories.length > 0) return;
    loadCategories();
  }, [initial.categories.length, loadCategories]);

  useEffect(() => {
    if (!initial.stats) {
      categoriesAPI.getPlatformStats()
        .then((res) => setPlatformStats(res.data))
        .catch(() => setPlatformStats(null));
    }

    if (initial.artisans.length > 0) {
      return;
    }

    // Fetch featured artisans — with geolocation if available
    const fetchArtisans = (params: { latitude?: number; longitude?: number }) => {
      workersAPI.searchWorkers(params)
        .then((res) => {
          setFeaturedArtisans((res.data || []).slice(0, FEATURED_ARTISAN_LIMIT).map(toFeaturedArtisan));
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
  }, [initial.artisans.length, initial.stats]);

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
    setActiveProblemIndex(0);
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
          alt="Service professionals available through Fudari in Kenya"
          fill
          priority
          quality={60}
          sizes="100vw"
        />
        <div className="container overlay-content py-5">
          <div className="hero-header-subtitle text-center text-white text-uppercase mb-3">
            Local Service Marketplace Across Kenya
          </div>
          <h1 className="display-1 fw-bold hero-header_title text-white text-center mb-4">
            Find Fundis &amp; Service Professionals Across Kenya
          </h1>
          <p className="lead mb-2 mb-md-3 text-center text-white col-lg-10 mx-auto">
            Explore available services, compare provider profiles, ratings and starting prices, then contact a
            professional by phone or WhatsApp. No account is required.
          </p>
          {/* Trust indicators — only factual platform guarantees, plus live rating when we have one */}
          <div className="tx-hero-trust d-flex justify-content-center gap-3 gap-md-4 flex-wrap mb-3 mb-md-5">
            <span className="d-flex align-items-center gap-2 text-white opacity-90 small">
              <i className="fa-solid fa-shield-halved text-success"></i>Verification Status Shown
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
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setShowProblemSuggestions(false);
                      if (!showProblemSuggestions || problemSuggestions.length === 0) return;
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setActiveProblemIndex((index) => (index + 1) % problemSuggestions.length);
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActiveProblemIndex((index) => (index - 1 + problemSuggestions.length) % problemSuggestions.length);
                      } else if (event.key === 'Enter') {
                        event.preventDefault();
                        const suggestion = problemSuggestions[activeProblemIndex];
                        selectSkill(suggestion.skillType, suggestion.label);
                      }
                    }}
                    autoComplete="off"
                    aria-label="What service do you need?"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showProblemSuggestions}
                    aria-controls="problem-suggestions"
                    aria-activedescendant={showProblemSuggestions ? `problem-suggestion-${activeProblemIndex}` : undefined}
                  />
                  {showProblemSuggestions && (
                    <ul id="problem-suggestions" role="listbox" className="list-group position-absolute top-100 start-0 end-0 shadow-lg rounded-3 mt-1" style={{ zIndex: 9999 }}>
                      {problemSuggestions.map((s, index) => (
                        <li
                          key={s.skillType}
                          id={`problem-suggestion-${index}`}
                          role="option"
                          aria-selected={index === activeProblemIndex}
                          className={`list-group-item list-group-item-action py-2 px-3${index === activeProblemIndex ? ' active' : ''}`}
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
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setShowSuggestions(false);
                      if (!showSuggestions || locationSuggestions.length === 0) return;
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setActiveLocationIndex((index) => (index + 1) % locationSuggestions.length);
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActiveLocationIndex((index) => (index - 1 + locationSuggestions.length) % locationSuggestions.length);
                      } else if (event.key === 'Enter') {
                        event.preventDefault();
                        setSearchLocation(locationSuggestions[activeLocationIndex]);
                        setShowSuggestions(false);
                      }
                    }}
                    autoComplete="off"
                    aria-label="Where do you need help?"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls="location-suggestions"
                    aria-activedescendant={showSuggestions ? `location-suggestion-${activeLocationIndex}` : undefined}
                  />
                  {showSuggestions && (
                    <ul id="location-suggestions" role="listbox" className="list-group position-absolute top-100 start-0 end-0 shadow-lg rounded-3 mt-1" style={{ zIndex: 9999 }}>
                      {locationSuggestions.map((town, index) => (
                        <li
                          key={town}
                          id={`location-suggestion-${index}`}
                          role="option"
                          aria-selected={index === activeLocationIndex}
                          className={`list-group-item list-group-item-action py-2 px-3 cursor-pointer${index === activeLocationIndex ? ' active' : ''}`}
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
                  Home Services
                </div>
                <h2 className="display-5 fw-semibold mb-3 section-header__title">
                  Browse verified home repair services across Kenya
                </h2>
                <h3 className="h5 fw-semibold mb-3">Explore plumbing, electrical and other skilled trades</h3>
                <div className="sub-title fs-16 text-start text-md-center">
                  <p>
                    Browse plumbing, electrical, bathroom supply, cleaning, carpentry, painting, welding and other
                    home services in Nairobi, Mombasa and Nakuru. Search local service professionals kenya to find a
                    suitable pro for your job.
                  </p>
                  <p className="mb-0">
                    Need a repair in the capital? Explore options when you want to hire a fundi nairobi residents can
                    contact directly. Fudari also helps you find plumbers in kenya and electricians for household jobs.
                  </p>
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
                    <h3 className="h6 fw-semibold mb-1">{cat.name}</h3>
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
                  How to hire a fundi nairobi with confidence
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
                  <h3 className="fs-20 fw-semibold">Check ratings, completed jobs and starting prices</h3>
                  <p>Browse professionals by skill and location. Check available profiles, ratings and starting prices.</p>
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
                  <h3 className="fs-20 fw-semibold">Agree on the price before work begins</h3>
                  <p>Call or WhatsApp to discuss the job and agree on the price before work begins.</p>
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
                  <h3 className="fs-20 fw-semibold">Track your booking and pay after the work is complete</h3>
                  <p>Use your booking code to confirm job progress, pay when work is complete and leave a rating.</p>
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
                <h2 className="display-5 fw-semibold mb-3 section-header__title">
                  Featured Professionals
                </h2>
                <div className="sub-title fs-16">
                  Explore highly rated professionals available for selected jobs in Nairobi. Review each profile to
                  check the provider&apos;s services, location, customer ratings and starting price before making contact.
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
                  <ProviderCard
                    featured={artisan.package === 'Gold'}
                    provider={{
                      name: artisan.name,
                      href: artisan.href,
                      image: artisan.image,
                      skill: `${artisan.skill}${skillLabelSwahili(artisan.skillType) ? ` · ${skillLabelSwahili(artisan.skillType)}` : ''}`,
                      location: artisan.location,
                      price: artisan.price,
                      rating: artisan.rating,
                      reviews: artisan.reviews,
                      jobs: artisan.totalJobsCompleted,
                      availableNow: artisan.availableNow,
                      verified: artisan.isVerified,
                    }}
                  />
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
                <h3 className="h5 fw-semibold mb-2">M-Pesa Payments</h3>
                <p className="text-muted small mb-0">Pay securely via M-Pesa — no bank account needed. Track every transaction with Safaricom Daraja integration.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="100">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'var(--tx-primary-soft)' }}>
                  <i className="fa-solid fa-comment-sms fs-4 text-primary"></i>
                </div>
                <h3 className="h5 fw-semibold mb-2">SMS Notifications</h3>
                <p className="text-muted small mb-0">Get instant SMS updates on booking status — works on any phone, no internet needed. Powered by Africa&apos;s Talking.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="200">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(13,110,253,0.1)' }}>
                  <i className="fa-solid fa-shield-halved fs-4 text-info"></i>
                </div>
                <h3 className="h5 fw-semibold mb-2">PIN Verification</h3>
                <p className="text-muted small mb-0">Unique START &amp; COMPLETION PINs ensure only the right person works on your job. Full accountability.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="300">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(255,193,7,0.1)' }}>
                  <i className="fa-solid fa-star fs-4 text-warning"></i>
                </div>
                <h3 className="h5 fw-semibold mb-2">No Login to Book</h3>
                <p className="text-muted small mb-0">Customers don&apos;t need an account. Just describe your problem, enter your phone, and book — simple as USSD.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="400">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(111,66,193,0.1)' }}>
                  <i className="fa-solid fa-brain fs-4 text-purple" style={{ color: '#6f42c1' }}></i>
                </div>
                <h3 className="h5 fw-semibold mb-2">AI Price Estimates</h3>
                <p className="text-muted small mb-0">Get instant KES price estimates based on real Nairobi job data — no guessing, fair pricing for everyone.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="500">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 64, height: 64, background: 'rgba(220,53,69,0.1)' }}>
                  <i className="fa-brands fa-whatsapp fs-4 text-success"></i>
                </div>
                <h3 className="h5 fw-semibold mb-2">WhatsApp & Call</h3>
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
                <div className="fs-5 mt-1 opacity-75">Active Pros</div>
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

      {/* ===== ABOUT / FAQ ===== */}
      <section className="bg-white border-top py-5">
        <div className="container py-4">
          <div className="row g-5">
            <div className="col-lg-7">
              <h2 className="fw-semibold mb-3">Get Started with Fudari</h2>
              <p className="text-muted">
                Find home repair services in Kenya with a straightforward search. Call Fudari on{' '}
                <a href="tel:+254703954539">+254 703 954 539</a> or visit{' '}
                <a href="https://fudari.co/">fudari.co</a>.
              </p>
              <h3 className="h5 fw-semibold mt-4 mb-2">Trusted help for jobs across Kenya</h3>
              <p className="text-muted">
                FUDARI exists for the moment something breaks and you need it fixed today. Describe
                the problem in plain English or Kiswahili &mdash; &ldquo;tap is leaking&rdquo;,
                &ldquo;stima imekatika&rdquo;, &ldquo;fridge is not cooling&rdquo; &mdash; add where you
                are, and the search matches your symptom to the right trade instead of asking you to
                guess whether you need a plumber, an electrician or an appliance technician.
              </p>
              <p className="text-muted">
                Provider profiles show their verification tier, completed jobs, customer ratings and
                starting rate where that information is available. Verified badges appear only on
                profiles that have completed FUDARI&apos;s verification process.
              </p>
              <p className="text-muted">
                Nothing about the process assumes a smartphone or a bank account. You do not need an
                account to book. You agree the price with the provider on WhatsApp or by phone before
                any work starts, they confirm the booking by SMS, and you pay by M-Pesa once the job
                is finished &mdash; never upfront.
              </p>

              <h3 className="h5 fw-semibold mt-4 mb-2">Find plumbers in kenya for reliable home repairs</h3>
              <p className="text-muted">
                Home and property work covers plumbing, electrical, carpentry, masonry, tiling,
                painting, welding, roofing, solar, HVAC, appliance repair, CCTV, locksmithing,
                fumigation and gardening. Household and personal services cover cleaning, mama fua
                and laundry, barbers, salons, braiding, makeup and nail technicians. Transport covers
                boda boda, tuk tuk, courier and same-day delivery, house and office movers, and
                pickups and trucks for hire. Vehicle services cover mobile mechanics, car wash,
                detailing, tyre fitting and puncture repair. Digital services cover photography,
                videography, graphic and logo design, and IT and laptop technicians.
              </p>

              <h3 className="h5 fw-semibold mt-4 mb-2">Where FUDARI operates</h3>
              <p className="text-muted">
                Coverage is countrywide across all 47 counties. Providers set their own service
                areas, so availability is deepest in and around Nairobi and grows outward through
                Mombasa, Kisumu, Nakuru, Eldoret, Thika, Nyeri, Machakos and the smaller towns as
                more pros join. If nobody is listed for your area yet, message the{' '}
                <a href={whatsappBotLink('Hi, I need a service provider.')} target="_blank" rel="noopener noreferrer">
                  WhatsApp booking bot
                </a>{' '}
                and it will scope the job and route it for you.
              </p>
            </div>

            <div className="col-lg-5">
              <h2 className="fw-semibold mb-3">Common questions</h2>

              <h3 className="h6 fw-semibold mb-1">Do I need an account to book?</h3>
              <p className="text-muted">
                No. Search, compare and book as a guest with just your phone number. Creating an
                account only adds booking history and saved details.
              </p>

              <h3 className="h6 fw-semibold mb-1">When do I pay, and how?</h3>
              <p className="text-muted">
                After the work is done, by M-Pesa or cash. FUDARI charges customers no booking fee,
                and the price is whatever you and the provider agreed before work started.
              </p>

              <h3 className="h6 fw-semibold mb-1">How do I know the right person turned up?</h3>
              <p className="text-muted">
                Each booking issues you a start PIN and a completion PIN. You give the start PIN when
                the provider arrives and the completion PIN only when you are satisfied, so the job
                cannot be marked done without you.
              </p>

              <h3 className="h6 fw-semibold mb-1">What if something goes wrong?</h3>
              <p className="text-muted">
                Raise a dispute from the booking and our team reviews it. Ratings and reviews are tied
                to completed jobs, so poor work follows a provider and good work is rewarded.
              </p>

              <h3 className="h6 fw-semibold mb-1">Can I check a job I already booked?</h3>
              <p className="text-muted">
                Yes &mdash; use your booking code on the{' '}
                <Link href="/track">job tracking page</Link> to see status without signing in.
              </p>

              <h3 className="h6 fw-semibold mb-1">I want to offer my services. What does it cost?</h3>
              <p className="text-muted">
                Listing is free to start. Paid tiers add more listings, better search placement and
                analytics &mdash; see the{' '}
                <Link href="/pricing">plans for providers</Link> or{' '}
                <Link href="/contact">talk to our team</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ===== END ABOUT / FAQ ===== */}

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
