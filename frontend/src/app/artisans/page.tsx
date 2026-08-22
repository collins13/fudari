'use client';

import { useEffect, useState, useCallback, Suspense, type ReactElement } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { workersAPI, listingsAPI } from '@/lib/api';
import { skillTypeToLabel, vettingToPackage, getPackageBadgeClass, packageLabel } from '@/lib/skills';
import { skillLabelBilingual } from '@/lib/kenya';
import PredictiveMatchPanel from '@/components/PredictiveMatchPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerSkillInfo {
  id: number;
  skillType: string;
  description?: string;
  experienceYears?: number;
  hourlyRate?: string;
  isVerified?: boolean;
}

interface Artisan {
  id: number;
  name: string;
  skill: string;
  package: 'Gold' | 'Silver' | 'Bronze';
  rating: number;
  reviews: number;
  location: string;
  price: number;
  image: string;
  bio: string;
  rankingScore: number;
  isFeatured: boolean;
  totalJobsCompleted: number;
  latitude: number | null;
  longitude: number | null;
  availableNow: boolean;
  distanceKm: number | null;
}

interface Listing {
  id: number;
  title: string;
  description: string;
  skillType: string;
  skillTypeLabel: string;
  artisanId: number;
  artisanName: string;
  priceStart: string | null;
  location: string | null;
  images: string | null;
  status: string;
  createdAt: string;
  artisanRating: number;
  artisanTotalReviews: number;
  artisanVerified: boolean;
  artisanVettingLevel: string;
  rankingScore?: number;
  isFeatured?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryIcon(s: string) {
  const map: Record<string, string> = {
    ELECTRICIAN: 'fa-bolt', PLUMBER: 'fa-faucet', MECHANIC: 'fa-car',
    PAINTER: 'fa-paint-roller', CARPENTER: 'fa-hammer', HVAC_TECHNICIAN: 'fa-wind',
    WELDER: 'fa-fire', MASON: 'fa-building',
    MOVER: 'fa-truck-moving', TRANSPORT_PROVIDER: 'fa-truck', EVENT_LIGHTING: 'fa-lightbulb',
  };
  return map[s] || 'fa-wrench';
}

function mapWorkerToArtisan(w: any): Artisan {
  const primarySkill: WorkerSkillInfo | undefined = w.skills?.[0];
  return {
    id: w.id,
    name: `${w.firstName} ${w.lastName}`,
    skill: primarySkill ? skillTypeToLabel(primarySkill.skillType) : 'General',
    package: vettingToPackage(w.vettingLevel),
    rating: w.trustScore || 0,
    reviews: w.totalReviews || 0,
    location: w.locationName || 'Kenya',
    price: primarySkill?.hourlyRate ? parseFloat(primarySkill.hourlyRate) : 0,
    image: w.profileImage || '',
    bio: primarySkill?.description || '',
    rankingScore: w.rankingScore || 0,
    isFeatured: w.isFeatured || false,
    totalJobsCompleted: w.totalJobsCompleted || 0,
    latitude: typeof w.latitude === 'number' ? w.latitude : null,
    longitude: typeof w.longitude === 'number' ? w.longitude : null,
    availableNow: w.availableNow === true,
    distanceKm: null,
  };
}

/** Great-circle distance in km. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number | null) {
  if (km === null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) stars.push(<i key={`f${i}`} className="fa-solid fa-star text-warning"></i>);
  if (rating % 1 >= 0.5) stars.push(<i key="h" className="fa-solid fa-star-half-stroke text-warning"></i>);
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) stars.push(<i key={`e${i}`} className="fa-regular fa-star text-warning"></i>);
  return stars;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Electrical', 'Plumbing', 'Mechanics', 'Painting', 'Carpentry', 'HVAC', 'Welding', 'Masonry', 'Moving', 'Transport', 'Event Lighting'];
const PACKAGES = ['All', 'Gold', 'Silver', 'Bronze'];
const SORT_OPTIONS = [
  { value: 'ranking', label: 'Top Ranked' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];
const CATEGORY_TO_SKILL_TYPE: Record<string, string> = {
  electrical: 'ELECTRICIAN', plumbing: 'PLUMBER', mechanics: 'MECHANIC',
  painting: 'PAINTER', carpentry: 'CARPENTER', hvac: 'HVAC_TECHNICIAN',
  welding: 'WELDER', masonry: 'MASON',
  moving: 'MOVER', transport: 'TRANSPORT_PROVIDER', 'event lighting': 'EVENT_LIGHTING',
};

const QUICK_ISSUE_CHIPS: Array<{ label: string; query: string; skillType: string }> = [
  { label: 'No power / socket issue', query: 'No power and sockets not working', skillType: 'ELECTRICIAN' },
  { label: 'Leaking tap / blocked drain', query: 'Leaking tap and blocked sink drain', skillType: 'PLUMBER' },
  { label: 'Car won\'t start', query: 'Car wont start, need help', skillType: 'MECHANIC' },
  { label: 'AC not cooling', query: 'AC not cooling and making noise', skillType: 'HVAC_TECHNICIAN' },
  { label: 'Broken door / cabinet', query: 'Door hinge broken and cabinet repair', skillType: 'CARPENTER' },
  { label: 'Need house painting', query: 'Need repainting for a 2 bedroom house', skillType: 'PAINTER' },
  { label: 'House / office moving', query: 'Need mover for house or office relocation', skillType: 'MOVER' },
  { label: 'Pickup / delivery transport', query: 'Need transport provider with pickup or truck', skillType: 'TRANSPORT_PROVIDER' },
  { label: 'Event lighting setup', query: 'Need event lighting and stage lights setup', skillType: 'EVENT_LIGHTING' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

function ArtisansContent() {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'providers' | 'listings'>(
    searchParams.get('tab') === 'listings' ? 'listings' : 'providers'
  );
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [skillParam, setSkillParam] = useState(searchParams.get('skill') || '');
  const [packageFilter, setPackageFilter] = useState('All');
  const [sortBy, setSortBy] = useState('ranking');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [maxPrice, setMaxPrice] = useState(50000);
  const [rangeValue, setRangeValue] = useState(50000);
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalListingsPages, setTotalListingsPages] = useState(1);

  // Normalize category from URL slug
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      const matched = CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase());
      setCategory(matched || 'All');
    }
    setSkillParam(searchParams.get('skill') || '');
    const q = searchParams.get('q');
    if (q) setSearchInput(q);
  }, [searchParams]);

  // Distance is computed client-side from the coordinates already returned per artisan.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  // Fetch workers
  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      // An explicit skill from symptom search is more precise than the broad category filter.
      const skillTypeParam = skillParam
        || (category !== 'All' ? CATEGORY_TO_SKILL_TYPE[category.toLowerCase()] : undefined)
        || undefined;
      const response = await workersAPI.searchWorkers({ skillType: skillTypeParam });
      setArtisans((response.data || []).map(mapWorkerToArtisan));
    } catch (err: any) {
      console.error('Failed to fetch workers:', err?.response?.status, err?.message);
      setArtisans([]);
    } finally {
      setLoading(false);
    }
  }, [category, skillParam]);

  // Fetch listings (public - no auth required) — page param wired to backend
  const fetchListings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await listingsAPI.getListings({ page: page - 1, size: PAGE_SIZE });
      const data = res.data;
      if (data?.content !== undefined) {
        // Paginated response
        setListings(data.content);
        setTotalListingsPages(data.totalPages || 1);
      } else {
        setListings(data || []);
        setTotalListingsPages(1);
      }
    } catch (err: any) {
      console.error('Failed to fetch listings:', err?.response?.status, err?.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [PAGE_SIZE]);

  useEffect(() => {
    setCurrentPage(1);
    if (tab === 'providers') fetchWorkers();
    else fetchListings(1);
  }, [tab, fetchWorkers, fetchListings]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (tab === 'listings') {
      fetchListings(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter + sort artisans
  const withDistance = coords
    ? artisans.map((a) => ({
        ...a,
        distanceKm:
          a.latitude !== null && a.longitude !== null
            ? haversineKm(coords.lat, coords.lng, a.latitude, a.longitude)
            : null,
      }))
    : artisans;

  const filteredArtisans = withDistance
    .filter((a) => {
      if (packageFilter !== 'All' && a.package !== packageFilter) return false;
      if (availableOnly && !a.availableNow) return false;
      if (maxPrice > 0 && a.price > 0 && a.price > maxPrice) return false;
      if (searchInput && !a.name.toLowerCase().includes(searchInput.toLowerCase()) &&
          !a.skill.toLowerCase().includes(searchInput.toLowerCase())) return false;
      if (locationInput && !a.location.toLowerCase().includes(locationInput.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ranking') return b.rankingScore - a.rankingScore;
      if (sortBy === 'distance') {
        // Artisans without coordinates sink to the bottom rather than sorting as "nearest".
        if (a.distanceKm === null) return b.distanceKm === null ? 0 : 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return b.id - a.id;
    });

  // Filter listings
  const skillTypeForCategory = skillParam
    || (category !== 'All' ? CATEGORY_TO_SKILL_TYPE[category.toLowerCase()] : undefined);
  const filteredListings = listings.filter((l) => {
    if (skillTypeForCategory && l.skillType !== skillTypeForCategory) return false;
    if (searchInput && !l.title.toLowerCase().includes(searchInput.toLowerCase()) &&
        !l.description?.toLowerCase().includes(searchInput.toLowerCase())) return false;
    if (locationInput && !l.location?.toLowerCase().includes(locationInput.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => {
    setCategory('All'); setPackageFilter('All'); setSortBy('newest');
    setMaxPrice(5000); setRangeValue(5000); setSearchInput(''); setLocationInput('');
    setAvailableOnly(false); setSkillParam('');
    setCurrentPage(1);
  };

  const applyQuickIssue = (chip: { query: string; skillType: string }) => {
    setTab('providers');
    setSearchInput(chip.query);
    setSkillParam(chip.skillType);
    const mappedCategory = Object.entries(CATEGORY_TO_SKILL_TYPE)
      .find(([, value]) => value === chip.skillType)?.[0];
    if (mappedCategory) {
      const titleCase = mappedCategory.charAt(0).toUpperCase() + mappedCategory.slice(1);
      const matched = CATEGORIES.find((c) => c.toLowerCase() === titleCase.toLowerCase());
      setCategory(matched || 'All');
    }
    setCurrentPage(1);
  };

  // Client-side page slice for providers
  const pagedArtisans = filteredArtisans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <Navbar />

      {/* ── Off-canvas filter drawer (mobile) ─────────────────── */}
      <div className="offcanvas offcanvas-start" tabIndex={-1} id="filterDrawer" aria-labelledby="filterDrawerLabel">
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold" id="filterDrawerLabel">
            <i className="fa-solid fa-sliders me-2 text-primary"></i>Filter Results
          </h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close filters"></button>
        </div>
        <div className="offcanvas-body">
          <div className="mb-4 border-bottom pb-4">
            <h6 className="fw-semibold mb-1">Max Price</h6>
            <p className="mb-2 small text-muted">Up to KES {rangeValue.toLocaleString()}/hr</p>
            <input
              type="range" className="form-range"
              min={0} max={50000} step={500} value={rangeValue}
              onChange={(e) => { setRangeValue(Number(e.target.value)); setMaxPrice(Number(e.target.value)); }}
            />
            <div className="d-flex justify-content-between small text-muted"><span>KES 0</span><span>KES 50,000</span></div>
          </div>
          <div className="mb-4 border-bottom pb-4">
            <h6 className="fw-semibold mb-2">Category</h6>
            {CATEGORIES.map((cat) => (
              <div className="form-check mb-2" key={`mob-cat-${cat}`}>
                <input className="form-check-input" type="radio" name="mobCategoryFilter"
                  id={`mob-cat-${cat}`} checked={category === cat} onChange={() => setCategory(cat)} />
                <label className="form-check-label" htmlFor={`mob-cat-${cat}`}>{cat}</label>
              </div>
            ))}
          </div>
          {tab === 'providers' && (
            <div className="mb-4 border-bottom pb-4">
              <h6 className="fw-semibold mb-2">Verification Tier</h6>
              {PACKAGES.map((pkg) => (
                <div className="form-check mb-2" key={`mob-pkg-${pkg}`}>
                  <input className="form-check-input" type="radio" name="mobPackageFilter"
                    id={`mob-pkg-${pkg}`} checked={packageFilter === pkg} onChange={() => setPackageFilter(pkg)} />
                  <label className="form-check-label" htmlFor={`mob-pkg-${pkg}`}>
                    {pkg !== 'All' && <span className={`badge ${getPackageBadgeClass(pkg)} me-2`}>{packageLabel(pkg)}</span>}
                    {pkg === 'All' ? 'All Tiers' : packageLabel(pkg)}
                  </label>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-primary w-100 mb-2"
            data-bs-dismiss="offcanvas" onClick={() => {}}>Apply Filters</button>
          <button type="button" className="btn btn-outline-secondary w-100" onClick={clearFilters}>Clear All</button>
        </div>
      </div>
      <div className="bg-white border-bottom py-3">
        <div className="container">
          <form onSubmit={(e) => e.preventDefault()}
            className="d-flex align-items-stretch gap-2">
            {/* Mobile filter trigger */}
            <button
              type="button"
              className="btn btn-outline-secondary d-xl-none flex-shrink-0"
              data-bs-toggle="offcanvas"
              data-bs-target="#filterDrawer"
              aria-controls="filterDrawer"
              aria-label="Open filters"
            >
              <i className="fa-solid fa-sliders"></i>
            </button>
            <div className="flex-grow-1 position-relative">
              <i className="fa-solid fa-magnifying-glass position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
              <input
                type="text"
                className="form-control form-control-lg border-0 bg-light rounded-3 ps-5"
                placeholder={tab === 'providers' ? 'Search by name or skill...' : 'Search listings...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {/* Location input */}
            <div className="flex-grow-1 position-relative d-none d-md-block">
              <i className="fa-solid fa-location-dot position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
              <input
                type="text"
                className="form-control form-control-lg border-0 bg-light rounded-3 ps-5"
                placeholder="Location (e.g. Westlands)"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
            </div>
            {/* Search button */}
            <button type="submit" className="btn btn-primary btn-lg rounded-3 px-4 d-flex align-items-center gap-2">
              <i className="fa-solid fa-magnifying-glass d-none d-sm-inline"></i>
              <span>Search</span>
            </button>
          </form>
          {tab === 'providers' && (
            <div className="mt-3">
              <div className="small text-muted mb-2">Quick issue search:</div>
              <div className="d-flex flex-wrap gap-2">
                {QUICK_ISSUE_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="btn btn-sm btn-outline-primary rounded-5"
                    onClick={() => applyQuickIssue(chip)}
                    title={skillLabelBilingual(chip.skillType)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="py-3 py-xl-5 bg-gradient">
        <div className="container">

          {/* Tab switcher */}
          <div className="mb-4">
            <ul className="nav nav-pills gap-2">
              <li className="nav-item">
                <button
                  className={`nav-link rounded-5 fw-medium ${tab === 'providers' ? 'active' : ''}`}
                  onClick={() => setTab('providers')}
                  style={tab !== 'providers' ? { color: '#6c757d' } : {}}
                >
                  <i className="fa-solid fa-users me-2"></i>Browse Pros
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-5 fw-medium ${tab === 'listings' ? 'active' : ''}`}
                  onClick={() => setTab('listings')}
                  style={tab !== 'listings' ? { color: '#6c757d' } : {}}
                >
                  <i className="fa-solid fa-list me-2"></i>Browse Listings
                </button>
              </li>
            </ul>
          </div>

          <div className="row">
            {/* Sidebar Filters */}
            <aside className="col-xl-3 filters-col content pe-lg-4 pe-xl-5 shadow-end mb-4 mb-xl-0">
              <div className="js-sidebar-filters-mobile">
                <div className="sidebar-filters-body p-3 p-xl-0">
                  <div className="mb-4 border-bottom pb-4">
                    <h4 className="fs-5 fw-semibold mb-1">Price Range</h4>
                    <p className="mb-0 small">Max: KES {rangeValue.toLocaleString()}/hr</p>
                    <input
                      type="range" className="form-range" id="priceRange"
                      min={0} max={50000} step={500} value={rangeValue}
                      onChange={(e) => { setRangeValue(Number(e.target.value)); setMaxPrice(Number(e.target.value)); }}
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>KES 0</span><span>KES 50,000</span>
                    </div>
                  </div>

                  <div className="mb-4 border-bottom pb-4">
                    <h4 className="fs-5 fw-semibold mb-2">Category</h4>
                    {CATEGORIES.map((cat) => (
                      <div className="form-check mb-2" key={cat}>
                        <input className="form-check-input" type="radio" name="categoryFilter"
                          id={`cat-${cat}`} checked={category === cat} onChange={() => setCategory(cat)} />
                        <label className="form-check-label" htmlFor={`cat-${cat}`}>{cat}</label>
                      </div>
                    ))}
                  </div>

                  {tab === 'providers' && (
                    <div className="mb-4 border-bottom pb-4">
                      <h4 className="fs-5 fw-semibold mb-2">Verification Tier</h4>
                      {PACKAGES.map((pkg) => (
                        <div className="form-check mb-2" key={pkg}>
                          <input className="form-check-input" type="radio" name="packageFilter"
                            id={`pkg-${pkg}`} checked={packageFilter === pkg} onChange={() => setPackageFilter(pkg)} />
                          <label className="form-check-label" htmlFor={`pkg-${pkg}`}>
                            {pkg !== 'All' && <span className={`badge ${getPackageBadgeClass(pkg)} me-2`}>{packageLabel(pkg)}</span>}
                            {pkg === 'All' ? 'All Tiers' : packageLabel(pkg)}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'providers' && (
                    <div className="mb-4 border-bottom pb-4">
                      <h4 className="fs-5 fw-semibold mb-1">Sort By</h4>
                      <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  )}

                  <button type="button" className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="col-xl-9 ps-lg-4 ps-xl-5">
              {/* Toolbox */}
              <div className="d-flex flex-wrap align-items-center mb-3 gap-2">
                <div className="col fs-18 text-nowrap">
                  {loading ? 'Loading...' : (
                    <>All <span className="fw-bold text-dark">
                      {tab === 'providers' ? filteredArtisans.length : filteredListings.length}
                    </span> {tab === 'providers' ? 'Pros' : 'Listings'} found</>
                  )}
                </div>
                {tab === 'providers' && (
                  <div className="ms-auto d-flex gap-2 align-items-center">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-5 px-3 ${availableOnly ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => { setAvailableOnly((v) => !v); setCurrentPage(1); }}
                      aria-pressed={availableOnly}
                    >
                      <i className="fa-solid fa-bolt me-1" aria-hidden="true"></i>Available now
                    </button>
                    <select className="form-select form-select-sm" style={{ width: 'auto' }}
                      value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.value === 'distance' && !coords}>
                          {o.value === 'distance' && !coords ? 'Nearest first (enable location)' : o.label}
                        </option>
                      ))}
                    </select>
                    <div className="border-0 card d-inline-flex flex-row gap-1 p-1 rounded-3 shadow-sm">
                      <button className={`btn btn-sm px-2 py-1 ${viewMode === 'list' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setViewMode('list')} aria-label="List view" title="List view">
                        <i className="fa-solid fa-list" aria-hidden="true"></i>
                      </button>
                      <button className={`btn btn-sm px-2 py-1 ${viewMode === 'grid' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setViewMode('grid')} aria-label="Grid view" title="Grid view">
                        <i className="fa-solid fa-border-all" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted mt-3">Loading {tab === 'providers' ? 'pros' : 'listings'}...</p>
                </div>
              )}

              {/* Recommendations belong here — while the customer is still choosing. */}
              {!loading && tab === 'providers' && skillTypeForCategory && (
                <div className="mb-4">
                  <PredictiveMatchPanel
                    skillType={skillTypeForCategory}
                    latitude={coords?.lat}
                    longitude={coords?.lng}
                  />
                </div>
              )}

              {/* ── FEATURED ARTISANS (Pro tier) ─────────────────── */}
              {!loading && tab === 'providers' && filteredArtisans.some(a => a.isFeatured) && (
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="fa-solid fa-crown text-warning fs-5"></i>
                    <h5 className="fw-bold mb-0">Featured Pros</h5>
                  </div>
                  <div className="row g-3">
                    {filteredArtisans.filter(a => a.isFeatured).slice(0, 3).map((artisan) => (
                      <div key={`feat-${artisan.id}`} className="col-md-4">
                        <div className="card border-2 border-warning shadow-sm h-100 rounded-4 overflow-hidden position-relative">
                          <Link href={`/artisans/${artisan.id}`} className="stretched-link"></Link>
                          <div style={{ position: 'relative', height: 180 }}>
                            {artisan.image ? (
                              <img src={artisan.image} className="w-100 h-100" style={{ objectFit: 'cover' }} alt={artisan.name} />
                            ) : (
                              <div className="d-flex align-items-center justify-content-center w-100 h-100"
                                style={{ background: 'linear-gradient(135deg, #f6d365, #fda085)' }}>
                                <span className="text-white fw-bold" style={{ fontSize: 48 }}>{artisan.name[0]}</span>
                              </div>
                            )}
                            <span className="badge text-bg-warning position-absolute top-0 start-0 m-2">
                              <i className="fa-solid fa-crown me-1"></i>Pro
                            </span>
                            <span className="badge text-bg-dark position-absolute top-0 end-0 m-2" style={{ fontSize: 11 }}>
                              Score: {artisan.rankingScore.toFixed(1)}
                            </span>
                          </div>
                          <div className="card-body">
                            <h6 className="card-title fw-semibold mb-1">{artisan.name}</h6>
                            <p className="text-primary small mb-1"><i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}</p>
                            {(() => { const av = getAvailability(artisan.availableNow); return (
                              <div className="d-flex align-items-center gap-1 mb-1">
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: av.color, display: 'inline-block', flexShrink: 0 }}></span>
                                <span className="small fw-medium" style={{ color: av.color }}>{av.label}</span>
                              </div>
                            ); })()}
                            <TrustFacts pkg={artisan.package} jobs={artisan.totalJobsCompleted} rating={artisan.rating} reviews={artisan.reviews} />
                            <p className="text-muted small mb-0">
                              <i className="fa-solid fa-location-dot me-1"></i>{artisan.location}
                              {formatDistance(artisan.distanceKm) && (
                                <span className="ms-1 fw-medium text-dark">&middot; {formatDistance(artisan.distanceKm)}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr className="my-4" />
                </div>
              )}

              {/* ── SERVICE PROVIDERS ─────────────────────────────── */}
              {!loading && tab === 'providers' && filteredArtisans.length === 0 && (
                <div className="text-center py-5">
                  <i className="fa-solid fa-search fs-1 text-muted mb-3 d-block"></i>
                  <h5 className="text-muted">No one available for that yet.</h5>
                  <p className="text-muted mb-4">
                    {category !== 'All'
                      ? `No ${category} pros found${locationInput ? ` in "${locationInput}"` : ''}. Try removing a filter.`
                      : 'Try adjusting your search or filters.'}
                  </p>
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    <button className="btn btn-outline-secondary rounded-5" onClick={clearFilters}>Clear Filters</button>
                    <Link
                      href={`/artisans/${locationInput ? `?tab=providers&location=${encodeURIComponent(locationInput)}` : ''}`}
                      className="btn btn-primary rounded-5"
                    >
                      <i className="fa-brands fa-whatsapp me-2"></i>Post a Job Request
                    </Link>
                  </div>
                  <p className="text-muted small mt-3">
                    Can&apos;t find what you need? We&apos;ll match you with the right pro.
                  </p>
                </div>
              )}

              {/* Providers — List view */}
              {!loading && tab === 'providers' && viewMode === 'list' && (
                <div>
                  {pagedArtisans.map((artisan) => (
                    <div key={artisan.id} className="card border-0 shadow-sm overflow-hidden rounded-4 mb-4 card-hover card-hover-bg position-relative">
                      <Link href={`/artisans/${artisan.id}`} className="stretched-link"></Link>
                      <div className="card-body p-0">
                        <div className="g-0 row">
                          <div className="col-lg-5 col-md-5 col-xl-4 position-relative">
                            <div className="card-image-hover dark-overlay h-100 overflow-hidden position-relative">
                              {artisan.image ? (
                                <img src={artisan.image} alt={artisan.name} className="h-100 w-100 object-fit-cover" style={{ minHeight: 200 }} />
                              ) : (
                                <div className="d-flex align-items-center justify-content-center h-100 w-100"
                                  style={{ minHeight: 200, background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                                  <span className="text-white fw-bold" style={{ fontSize: 56 }}>{artisan.name[0]}</span>
                                </div>
                              )}
                              <span className={`badge position-absolute top-0 start-0 m-2 ${getPackageBadgeClass(artisan.package)}`}>
                                {artisan.package === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                                {packageLabel(artisan.package)}
                              </span>
                              {artisan.package !== 'Bronze' && (
                                <span className="badge bg-success position-absolute bottom-0 end-0 m-2" style={{ fontSize: 10 }}>
                                  <i className="fa-solid fa-shield-halved me-1"></i>Verified
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="col-lg-7 col-md-7 col-xl-8 p-3 p-lg-4">
                            <div className="d-flex flex-column h-100">
                              {(() => { const av = getAvailability(artisan.availableNow); return (
                                <div className="d-flex align-items-center gap-1 mb-2">
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: av.color, display: 'inline-block', flexShrink: 0 }}></span>
                                  <span className="small fw-medium" style={{ color: av.color }}>{av.label}</span>
                                </div>
                              ); })()}
                              <h4 className="fs-18 fw-semibold mb-0">
                                {artisan.isFeatured && <i className="fa-solid fa-crown text-warning me-2" title="Featured Gold pro"></i>}
                                {artisan.name}
                              </h4>
                              <p className="text-primary mt-1 mb-1"><i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}</p>
                              <p className="mt-1 fs-15 text-muted">{artisan.bio}</p>
                              <TrustFacts pkg={artisan.package} jobs={artisan.totalJobsCompleted} rating={artisan.rating} reviews={artisan.reviews} />
                              <div className="d-flex flex-wrap gap-2 mt-auto z-1 align-items-center">
                                <span className="d-flex gap-2 align-items-center fs-13 fw-semibold text-muted">
                                  <i className="fa-solid fa-location-dot"></i>{artisan.location}
                                  {formatDistance(artisan.distanceKm) && (
                                    <span className="text-dark">&middot; {formatDistance(artisan.distanceKm)}</span>
                                  )}
                                </span>
                                {artisan.price > 0 && (
                                  <strong className="text-primary ms-auto">From KES {artisan.price.toLocaleString()}</strong>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Providers — Grid view */}
              {!loading && tab === 'providers' && viewMode === 'grid' && (
                <div className="row g-4">
                  {pagedArtisans.map((artisan) => (
                    <div key={artisan.id} className="col-md-6 col-lg-4">
                      <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover card-hover-bg position-relative">
                        <Link href={`/artisans/${artisan.id}`} className="stretched-link"></Link>
                        <div style={{ position: 'relative', height: 200 }}>
                          {artisan.image ? (
                            <img src={artisan.image} className="w-100 h-100" style={{ objectFit: 'cover' }} alt={artisan.name} loading="lazy" decoding="async" />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center w-100 h-100"
                              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                              <span className="text-white fw-bold" style={{ fontSize: 48 }}>{artisan.name[0]}</span>
                            </div>
                          )}
                          <span className={`badge position-absolute top-0 start-0 m-2 ${getPackageBadgeClass(artisan.package)}`}>
                            {artisan.package === 'Gold' && <i className="fa-solid fa-crown me-1"></i>}
                            {packageLabel(artisan.package)}
                          </span>
                          {artisan.package !== 'Bronze' && (
                            <span className="badge bg-success position-absolute bottom-0 end-0 m-2" style={{ fontSize: 10 }}>
                              <i className="fa-solid fa-shield-halved me-1"></i>Verified
                            </span>
                          )}
                        </div>
                        <div className="card-body">
                          <h6 className="card-title fw-semibold mb-1">
                            {artisan.isFeatured && <i className="fa-solid fa-crown text-warning me-1"></i>}
                            {artisan.name}
                            {artisan.package !== 'Bronze' && (
                              <i className="fa-solid fa-circle-check text-success ms-1" style={{fontSize:'0.75rem'}} title="Verified by TUFIXIT"></i>
                            )}
                          </h6>
                          <p className="text-primary small mb-1"><i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}</p>
                          <p className="text-muted small mb-1">
                            <i className="fa-solid fa-location-dot me-1"></i>{artisan.location}
                            {formatDistance(artisan.distanceKm) && (
                              <span className="ms-1 fw-medium text-dark">&middot; {formatDistance(artisan.distanceKm)}</span>
                            )}
                          </p>
                          {(() => { const av = getAvailability(artisan.availableNow); return (
                            <div className="d-flex align-items-center gap-1 mb-1">
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: av.color, display: 'inline-block', flexShrink: 0 }}></span>
                              <span className="small fw-medium" style={{ color: av.color }}>{av.label}</span>
                            </div>
                          ); })()}
                          <TrustFacts pkg={artisan.package} jobs={artisan.totalJobsCompleted} rating={artisan.rating} reviews={artisan.reviews} />
                          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                            {artisan.price > 0 ? (
                              <strong className="text-primary">From KES {artisan.price.toLocaleString()}</strong>
                            ) : (
                              <span className="text-muted small">Contact for price</span>
                            )}
                            <span className="btn btn-primary btn-sm rounded-5 z-1" aria-hidden="true">View</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── LISTINGS ───────────────────────────────────── */}
              {!loading && tab === 'listings' && filteredListings.length === 0 && (
                <div className="text-center py-5">
                  <i className="fa-solid fa-folder-open fs-1 text-muted mb-3 d-block"></i>
                  <h5 className="text-muted">No approved listings found.</h5>
                  <p className="text-muted">Check back later or try a different category.</p>
                </div>
              )}

              {!loading && tab === 'listings' && (
                <div className="row g-4">
                  {filteredListings.map((l) => {
                    let firstImage: string | null = null;
                    try {
                      if (l.images) {
                        const imgs = JSON.parse(l.images);
                        if (Array.isArray(imgs) && imgs.length > 0) firstImage = imgs[0];
                      }
                    } catch { /* ignore */ }

                    return (
                      <div key={l.id} className="col-md-6 col-lg-4">
                        {/* Listing card now navigates to artisan profile */}
                        <Link href={`/artisans/${l.artisanId}`} className="text-decoration-none">
                          <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover">
                            <div className="position-relative" style={{ minHeight: 220 }}>
                              {firstImage ? (
                                <img src={firstImage} alt={l.title} className="card-img-top" style={{ height: 220, objectFit: 'cover', width: '100%' }} />
                              ) : (
                                <div className="d-flex align-items-center justify-content-center"
                                  style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', height: 220 }}>
                                  <i className={`fa-solid ${getCategoryIcon(l.skillType)} text-white`} style={{ fontSize: 40, opacity: 0.8 }}></i>
                                </div>
                              )}
                              {l.artisanVerified && (
                                <span className="badge text-bg-success position-absolute" style={{ top: 10, left: 10 }}>
                                  <i className="fa-solid fa-check me-1"></i>Verified
                                </span>
                              )}
                              {l.isFeatured && (
                                <span className="badge text-bg-warning position-absolute" style={{ top: 10, right: 10 }}>
                                  <i className="fa-solid fa-crown me-1"></i>Featured
                                </span>
                              )}
                            </div>
                            <div className="card-body">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="badge text-bg-light border" style={{ fontSize: 11 }}>
                                  <i className={`fa-solid ${getCategoryIcon(l.skillType)} text-primary me-1`}></i>
                                  {l.skillTypeLabel || skillTypeToLabel(l.skillType)}
                                </span>
                              </div>
                              <h6 className="fw-bold mb-1 text-dark">{l.title}</h6>
                              <p className="text-muted small mb-2" style={{ lineHeight: 1.5 }}>
                                {l.description?.slice(0, 80)}{(l.description?.length || 0) > 80 ? '...' : ''}
                              </p>
                              <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto">
                                <div>
                                  {l.priceStart && (
                                    <div className="fw-bold text-success" style={{ fontSize: 14 }}>
                                      From KES {l.priceStart}
                                    </div>
                                  )}
                                  {l.location && (
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                      <i className="fa-solid fa-location-dot me-1"></i>{l.location}
                                    </div>
                                  )}
                                </div>
                                <div className="text-end">
                                  {l.artisanRating > 0 && (
                                    <div className="small text-warning">
                                      {renderStars(l.artisanRating)} <span className="text-muted">({l.artisanTotalReviews})</span>
                                    </div>
                                  )}
                                  <span className="btn btn-primary btn-sm rounded-5 mt-1 z-1" aria-hidden="true" style={{ pointerEvents: 'none' }}>
                                    View &amp; Book
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination — wired for listings (server-side) and providers (client-side) */}
              {!loading && tab === 'listings' && totalListingsPages > 1 && (
                <nav className="mt-5" aria-label="Listings pagination">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalListingsPages }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalListingsPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
              {!loading && tab === 'providers' && filteredArtisans.length > PAGE_SIZE && (
                <nav className="mt-5" aria-label="Results pagination">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: Math.ceil(filteredArtisans.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{p}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === Math.ceil(filteredArtisans.length / PAGE_SIZE) ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => { setCurrentPage(p => Math.min(Math.ceil(filteredArtisans.length / PAGE_SIZE), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default function ArtisansPage() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}><div className="spinner-border text-primary" /></div>}>
      <ArtisansContent />
    </Suspense>
  );
}
