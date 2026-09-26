'use client';

import { useEffect, useState, useCallback, Suspense, type ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { workersAPI, listingsAPI, categoriesAPI, apiErrorMessage } from '@/lib/api';
import { skillTypeToLabel, vettingToPackage, getPackageBadgeClass, packageLabel } from '@/lib/skills';
import { skillLabelBilingual, skillLabelSwahili, skillIcon } from '@/lib/kenya';
import { resolveProfileImage } from '@/lib/avatar';
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
  skillType: string;
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
  return skillIcon(s);
}

function mapWorkerToArtisan(w: any): Artisan {
  const primarySkill: WorkerSkillInfo | undefined = w.skills?.[0];
  return {
    id: w.id,
    name: `${w.firstName} ${w.lastName}`,
    skill: primarySkill ? skillTypeToLabel(primarySkill.skillType) : 'General',
    skillType: primarySkill?.skillType || '',
    package: vettingToPackage(w.vettingLevel),
    rating: w.trustScore || 0,
    reviews: w.totalReviews || 0,
    location: w.locationName || 'Kenya',
    price: primarySkill?.hourlyRate ? parseFloat(primarySkill.hourlyRate) : 0,
    image: resolveProfileImage(w.profileImage),
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

const PACKAGES = ['All', 'Gold', 'Silver', 'Bronze'];
const MAX_PRICE = 50000;
const SORT_OPTIONS = [
  { value: 'ranking', label: 'Top Ranked' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const ALL_CATEGORIES_SLUG = 'all';

interface CategoryOption {
  name: string;
  slug: string;
  skillTypes: string[];
  count: number;
}

/** Mirrors the backend slug so older `?category=mama fua` links still resolve. */
function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const QUICK_ISSUE_CHIPS: Array<{ label: string; query: string; skillType: string }> = [
  { label: 'No power / socket issue', query: 'No power and sockets not working', skillType: 'ELECTRICIAN' },
  { label: 'Leaking tap / blocked drain', query: 'Leaking tap and blocked sink drain', skillType: 'PLUMBER' },
  { label: 'Car won\'t start', query: 'Car wont start, need help', skillType: 'MECHANIC' },
  { label: 'AC not cooling', query: 'AC not cooling and making noise', skillType: 'HVAC_TECHNICIAN' },
  { label: 'Broken door / cabinet', query: 'Door hinge broken and cabinet repair', skillType: 'CARPENTER' },
  { label: 'Need house painting', query: 'Need repainting for a 2 bedroom house', skillType: 'PAINTER' },
  { label: 'Laundry / house cleaning', query: 'Need mama fua for laundry and house cleaning', skillType: 'MAMA_FUA' },
  { label: 'House / office moving', query: 'Need mover for house or office relocation', skillType: 'MOVER' },
  { label: 'Boda / quick errand', query: 'Need a boda boda rider for a quick errand', skillType: 'BODA_BODA' },
  { label: 'Send a parcel', query: 'Need same day parcel delivery', skillType: 'COURIER' },
  { label: 'Haircut at home', query: 'Need a barber for a haircut at home', skillType: 'BARBER' },
  { label: 'Braids / hair styling', query: 'Need braiding and hair styling', skillType: 'HAIR_SALON' },
  { label: 'Makeup / nails', query: 'Need makeup and nails done', skillType: 'MAKEUP_ARTIST' },
  { label: 'Car wash / detailing', query: 'Need car wash and interior detailing', skillType: 'CAR_WASH' },
  { label: 'Puncture / tyre change', query: 'Puncture repair and tyre change', skillType: 'TYRE_SERVICES' },
  { label: 'Photoshoot / event photos', query: 'Need a photographer for an event shoot', skillType: 'PHOTOGRAPHER' },
  { label: 'Logo / flyer design', query: 'Need a logo and flyer designed', skillType: 'GRAPHIC_DESIGNER' },
  { label: 'Laptop / wifi problem', query: 'Laptop not working and wifi keeps dropping', skillType: 'IT_TECHNICIAN' },
  { label: 'Event lighting setup', query: 'Need event lighting and stage lights setup', skillType: 'EVENT_LIGHTING' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

function ArtisansContent() {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'providers' | 'listings'>(
    searchParams.get('tab') === 'listings' ? 'listings' : 'providers'
  );
  const [categorySlug, setCategorySlug] = useState(
    slugify(searchParams.get('category') || ALL_CATEGORIES_SLUG) || ALL_CATEGORIES_SLUG
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [skillParam, setSkillParam] = useState(searchParams.get('skill') || '');
  const [packageFilter, setPackageFilter] = useState('All');
  const [sortBy, setSortBy] = useState('ranking');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [rangeValue, setRangeValue] = useState(MAX_PRICE);
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Text filters hit the API, so hold off until the customer stops typing.
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  const [debouncedLocation, setDebouncedLocation] = useState(locationInput);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setDebouncedLocation(locationInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, locationInput]);

  // Pagination state
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalListingsPages, setTotalListingsPages] = useState(1);

  // Normalize category from URL slug
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setCategorySlug(slugify(cat) || ALL_CATEGORIES_SLUG);
    setSkillParam(searchParams.get('skill') || '');
    const q = searchParams.get('q');
    if (q) setSearchInput(q);
  }, [searchParams]);

  // Categories drive both the filter list and the category → skill mapping, so the
  // provider fetch waits for them rather than firing an unfiltered request first.
  const loadCategories = useCallback(() => {
    categoriesAPI.getActiveCategoriesWithStats()
      .then((res) => {
        const cats: CategoryOption[] = (res.data || [])
          .filter((c: any) => (c.skillTypes || []).length > 0)
          .map((c: any) => ({
            name: c.name,
            slug: c.slug || slugify(c.name),
            skillTypes: c.skillTypes || [],
            count: c.artisanCount ?? 0,
          }));
        setCategories(cats);
        setCategoriesError(null);
      })
      .catch((err) => {
        setCategories([]);
        setCategoriesError(apiErrorMessage(err, "We couldn't load categories."));
      })
      .finally(() => setCategoriesReady(true));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const activeCategory = categories.find((c) => c.slug === categorySlug) || null;
  const categoryLabel = activeCategory?.name || 'All';

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
    if (!categoriesReady) return;
    setLoading(true);
    setLoadError(null);
    try {
      // An explicit skill from symptom search is more precise than the broad category filter.
      const skillTypes = skillParam ? [skillParam] : activeCategory?.skillTypes || [undefined];
      const responses = await Promise.all(skillTypes.map((skillType) => workersAPI.searchWorkers({
        skillType,
        name: debouncedSearch || undefined,
        location: debouncedLocation || undefined,
        maxHourlyRate: maxPrice < MAX_PRICE ? maxPrice : undefined,
        availableNow: availableOnly || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
      })));
      const uniqueWorkers = new Map<number, any>();
      responses.flatMap((response) => response.data || []).forEach((worker) => uniqueWorkers.set(worker.id, worker));
      setArtisans(Array.from(uniqueWorkers.values()).map(mapWorkerToArtisan));
    } catch (err: any) {
      console.error('Failed to fetch workers:', err?.response?.status, err?.message);
      setArtisans([]);
      setLoadError(
        err?.response
          ? 'We could not load pros right now. Please try again.'
          : 'No connection. Check your data and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeCategory, categoriesReady, skillParam, debouncedSearch, debouncedLocation, maxPrice, availableOnly, coords]);

  // Fetch listings (public - no auth required) — page param wired to backend
  const fetchListings = useCallback(async (page = 1) => {
    setLoading(true);
    setLoadError(null);
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
      setLoadError(
        err?.response
          ? 'We could not load listings right now. Please try again.'
          : 'No connection. Check your data and try again.'
      );
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

  // Search, location, price and availability are applied by the API; only the package tier is local.
  const filteredArtisans = withDistance
    .filter((a) => packageFilter === 'All' || a.package === packageFilter)
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
  const skillTypesForCategory = skillParam ? [skillParam] : activeCategory?.skillTypes || [];
  const predictiveSkillType = skillParam || (skillTypesForCategory.length === 1 ? skillTypesForCategory[0] : undefined);
  const filteredListings = listings.filter((l) => {
    if (skillTypesForCategory.length > 0 && !skillTypesForCategory.includes(l.skillType)) return false;
    if (searchInput && !l.title.toLowerCase().includes(searchInput.toLowerCase()) &&
        !l.description?.toLowerCase().includes(searchInput.toLowerCase())) return false;
    if (locationInput && !l.location?.toLowerCase().includes(locationInput.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => {
    setCategorySlug(ALL_CATEGORIES_SLUG); setPackageFilter('All'); setSortBy('newest');
    setMaxPrice(MAX_PRICE); setRangeValue(MAX_PRICE); setSearchInput(''); setLocationInput('');
    setAvailableOnly(false); setSkillParam('');
    setCurrentPage(1);
  };

  const applyQuickIssue = (chip: { query: string; skillType: string }) => {
    setTab('providers');
    setSearchInput(chip.query);
    setSkillParam(chip.skillType);
    const matched = categories.find((c) => c.skillTypes.includes(chip.skillType));
    setCategorySlug(matched?.slug || ALL_CATEGORIES_SLUG);
    setCurrentPage(1);
  };

  // Client-side page slice for providers
  const featuredArtisans = filteredArtisans.filter((a) => a.isFeatured).slice(0, 3);
  const featuredIds = new Set(featuredArtisans.map((a) => a.id));
  // Pros promoted into the Featured strip are removed from the list below so the
  // same card does not appear twice on one page.
  const listArtisans = featuredArtisans.length
    ? filteredArtisans.filter((a) => !featuredIds.has(a.id))
    : filteredArtisans;
  const pagedArtisans = listArtisans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
              min={0} max={MAX_PRICE} step={500} value={rangeValue}
              onChange={(e) => { setRangeValue(Number(e.target.value)); setMaxPrice(Number(e.target.value)); }}
            />
            <div className="d-flex justify-content-between small text-muted"><span>KES 0</span><span>KES {MAX_PRICE.toLocaleString()}</span></div>
          </div>
          <div className="mb-4 border-bottom pb-4">
            <h6 className="fw-semibold mb-2">Category</h6>
            {!categoriesReady ? (
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading categories</span>
              </div>
            ) : categoriesError ? (
              <div className="small">
                <p className="text-muted mb-2">{categoriesError}</p>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadCategories}>
                  <i className="fa-solid fa-rotate-right me-1" />Try again
                </button>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-muted small mb-0">No categories available yet.</p>
            ) : (
              [{ name: 'All', slug: ALL_CATEGORIES_SLUG, count: 0 }, ...categories].map((cat) => (
                <div className="form-check mb-2" key={`mob-cat-${cat.slug}`}>
                  <input className="form-check-input" type="radio" name="mobCategoryFilter"
                    id={`mob-cat-${cat.slug}`} checked={categorySlug === cat.slug}
                    onChange={() => setCategorySlug(cat.slug)} />
                  <label className="form-check-label" htmlFor={`mob-cat-${cat.slug}`}>
                    {cat.name}
                    {cat.count > 0 && <span className="text-muted ms-1">({cat.count})</span>}
                  </label>
                </div>
              ))
            )}
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

          <header className="mb-4">
            <h1 className="fs-2 fw-bold mb-2">Verified Service Providers in Kenya</h1>
            <p className="text-muted mb-0">
              Browse plumbers, electricians, cleaners, mama fua, movers, boda boda riders,
              barbers, car wash and IT pros near you. Compare ratings and book directly —
              no account needed.
            </p>
          </header>

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
                      min={0} max={MAX_PRICE} step={500} value={rangeValue}
                      onChange={(e) => { setRangeValue(Number(e.target.value)); setMaxPrice(Number(e.target.value)); }}
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>KES 0</span><span>KES {MAX_PRICE.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mb-4 border-bottom pb-4">
                    <h4 className="fs-5 fw-semibold mb-2">Category</h4>
                    {!categoriesReady ? (
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading categories</span>
                      </div>
                    ) : categoriesError ? (
                      <div className="small">
                        <p className="text-muted mb-2">{categoriesError}</p>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadCategories}>
                          <i className="fa-solid fa-rotate-right me-1" />Try again
                        </button>
                      </div>
                    ) : categories.length === 0 ? (
                      <p className="text-muted small mb-0">No categories available yet.</p>
                    ) : (
                      [{ name: 'All', slug: ALL_CATEGORIES_SLUG, count: 0 }, ...categories].map((cat) => (
                        <div className="form-check mb-2" key={cat.slug}>
                          <input className="form-check-input" type="radio" name="categoryFilter"
                            id={`cat-${cat.slug}`} checked={categorySlug === cat.slug}
                            onChange={() => setCategorySlug(cat.slug)} />
                          <label className="form-check-label" htmlFor={`cat-${cat.slug}`}>
                            {cat.name}
                            {cat.count > 0 && <span className="text-muted ms-1">({cat.count})</span>}
                          </label>
                        </div>
                      ))
                    )}
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
                    <><span className="fw-bold text-dark">
                      {tab === 'providers' ? filteredArtisans.length : filteredListings.length}
                    </span> {tab === 'providers' ? 'Pros' : 'Listings'} found</>
                  )}
                </div>
                {tab === 'providers' && (
                  <div className="ms-auto d-flex flex-wrap gap-2 align-items-center">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-5 px-3 ${availableOnly ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => { setAvailableOnly((v) => !v); setCurrentPage(1); }}
                      aria-pressed={availableOnly}
                    >
                      <i className="fa-solid fa-bolt me-1" aria-hidden="true"></i>Available now
                    </button>
                    {/* `width: auto` sizes the select to its longest option, which overflows
                        a 360px viewport. Cap it and let flex shrink it instead. */}
                    <select className="form-select form-select-sm" style={{ width: 'auto', maxWidth: '100%', minWidth: 0 }}
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

              {!loading && loadError && (
                <div className="alert alert-warning d-flex flex-wrap align-items-center gap-3" role="alert">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  <span className="flex-grow-1">{loadError}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary rounded-pill px-3"
                    onClick={() => (tab === 'providers' ? fetchWorkers() : fetchListings(currentPage))}
                  >
                    <i className="fa-solid fa-rotate-right me-2" aria-hidden="true"></i>Try again
                  </button>
                </div>
              )}

              {/* Recommendations belong here — while the customer is still choosing. */}
              {!loading && tab === 'providers' && predictiveSkillType && (
                <div className="mb-4">
                  <PredictiveMatchPanel
                    skillType={predictiveSkillType}
                    latitude={coords?.lat}
                    longitude={coords?.lng}
                  />
                </div>
              )}

              {/* ── FEATURED ARTISANS (Pro tier) ─────────────────── */}
              {!loading && tab === 'providers' && featuredArtisans.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="fa-solid fa-crown text-warning fs-5"></i>
                    <h5 className="fw-bold mb-0">Featured Pros</h5>
                  </div>
                  <div className="row g-3">
                    {featuredArtisans.map((artisan) => (
                      <div key={`feat-${artisan.id}`} className="col-md-4">
                        <div className="card border-2 border-warning shadow-sm h-100 rounded-4 overflow-hidden position-relative">
                          <Link href={`/artisan/${artisan.id}`} className="stretched-link"></Link>
                          <div style={{ position: 'relative', height: 180 }}>
                            {artisan.image ? (
                              <Image src={artisan.image} alt={artisan.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="tx-photo-cover" />
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
                            <p className="text-primary small mb-1">
                              <i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}
                              {skillLabelSwahili(artisan.skillType) && (
                                <span className="text-muted"> &middot; {skillLabelSwahili(artisan.skillType)}</span>
                              )}
                            </p>
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
              {!loading && !loadError && tab === 'providers' && filteredArtisans.length === 0 && (
                <div className="text-center py-5">
                  <i className="fa-solid fa-search fs-1 text-muted mb-3 d-block"></i>
                  <h5 className="text-muted">No one available for that yet.</h5>
                  <p className="text-muted mb-4">
                    {activeCategory
                      ? `No ${categoryLabel} pros found${locationInput ? ` in "${locationInput}"` : ''}. Try removing a filter.`
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
                      <Link href={`/artisan/${artisan.id}`} className="stretched-link"></Link>
                      <div className="card-body p-0">
                        <div className="g-0 row">
                          <div className="col-lg-5 col-md-5 col-xl-4 position-relative">
                            <div className="card-image-hover dark-overlay h-100 overflow-hidden position-relative" style={{ minHeight: 200 }}>
                              {artisan.image ? (
                                <Image src={artisan.image} alt={artisan.name} fill sizes="(max-width: 768px) 100vw, 40vw" className="tx-photo-cover" />
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
                              <p className="text-primary mt-1 mb-1">
                                <i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}
                                {skillLabelSwahili(artisan.skillType) && (
                                  <span className="text-muted"> &middot; {skillLabelSwahili(artisan.skillType)}</span>
                                )}
                              </p>
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
                        <Link href={`/artisan/${artisan.id}`} className="stretched-link"></Link>
                        <div style={{ position: 'relative', height: 200 }}>
                          {artisan.image ? (
                            <Image src={artisan.image} alt={artisan.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="tx-photo-cover" loading="lazy" />
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
                              <i className="fa-solid fa-circle-check text-success ms-1" style={{fontSize:'0.75rem'}} title="Verified by FUDARI"></i>
                            )}
                          </h6>
                          <p className="text-primary small mb-1">
                            <i className="fa-solid fa-screwdriver-wrench me-1"></i>{artisan.skill}
                            {skillLabelSwahili(artisan.skillType) && (
                              <span className="text-muted"> &middot; {skillLabelSwahili(artisan.skillType)}</span>
                            )}
                          </p>
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
                              <span className="text-muted small">Ask for a quote</span>
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
              {!loading && !loadError && tab === 'listings' && filteredListings.length === 0 && (
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
                        <Link href={`/artisan/${l.artisanId}`} className="text-decoration-none">
                          <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden card-hover">
                            <div className="position-relative" style={{ height: 220 }}>
                              {firstImage ? (
                                <Image src={firstImage} alt={l.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} loading="lazy" />
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
              {!loading && tab === 'providers' && listArtisans.length > PAGE_SIZE && (
                <nav className="mt-5" aria-label="Results pagination">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: Math.ceil(listArtisans.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
                      <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{p}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === Math.ceil(listArtisans.length / PAGE_SIZE) ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => { setCurrentPage(p => Math.min(Math.ceil(listArtisans.length / PAGE_SIZE), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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
    // The fallback repeats the page heading so the streamed shell crawlers receive
    // is not an empty spinner.
    <Suspense
      fallback={
        <div className="container py-5">
          <h1 className="fs-2 fw-bold mb-2">Verified Service Providers in Kenya</h1>
          <p className="text-muted">
            Browse plumbers, electricians, cleaners, mama fua, movers, boda boda riders,
            barbers, car wash and IT pros near you. Compare ratings and book directly —
            no account needed.
          </p>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading providers</span>
          </div>
        </div>
      }
    >
      <ArtisansContent />
    </Suspense>
  );
}
