'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { estatesAPI, categoriesAPI, bookingsAPI } from '@/lib/api';
import { whatsappBotLink } from '@/lib/whatsapp';
import { TenantProvider, useTenant } from '@/context/TenantContext';

interface Estate {
  id: number;
  name: string;
  slug: string;
  area: string;
  brandPrimaryColor?: string | null;
  brandLogoUrl?: string | null;
  brandWelcomeMessage?: string | null;
  shortCode?: string | null;
  whatsappStartCommand?: string | null;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  artisanCount?: number;
}

interface Worker {
  id: number;
  firstName: string;
  lastName: string;
  trustScore: number;
  totalJobsCompleted: number;
  locationName: string;
  vettingLevel: string;
}

export default function EstateBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [estate, setEstate] = useState<Estate | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allApprovedWorkers, setAllApprovedWorkers] = useState<Worker[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking form
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState<{
    customerName: string; customerPhone: string; customerLocation: string;
    jobDescription: string; urgency: 'NOW' | 'TODAY' | 'TOMORROW' | 'SCHEDULED'; scheduledTime: string;
  }>({
    customerName: '', customerPhone: '', customerLocation: '',
    jobDescription: '', urgency: 'TODAY', scheduledTime: '',
  });
  const [booking, setBooking] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [estateRes, catRes, artisansRes] = await Promise.all([
          estatesAPI.resolve(slug),
          categoriesAPI.getActiveCategoriesWithStats(),
          estatesAPI.getApprovedArtisanProfiles(slug),
        ]);
        setEstate(estateRes.data);
        setCategories(catRes.data);
        const approved = artisansRes.data || [];
        setAllApprovedWorkers(approved);
      } catch {
        setError('Estate not found or inactive.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const handleCategorySelect = (skillType: string) => {
    setSelectedCategory(skillType);
    setSelectedWorker(null);
    // Filter approved artisans by skill type (match against skills array)
    const filtered = allApprovedWorkers.filter((w: any) =>
      w.skills?.some((s: any) => s.skillType === skillType) ||
      // fallback: match first skill
      (w.skills?.[0]?.skillType || '').toUpperCase() === skillType.toUpperCase()
    );
    setWorkers(filtered);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    if (formData.urgency === 'SCHEDULED' && !formData.scheduledTime) {
      alert('Please pick a date and time for your scheduled booking.');
      return;
    }
    setBooking(true);
    try {
      const payload: Record<string, unknown> = {
        artisanId: selectedWorker.id,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerLocation: formData.customerLocation || estate?.area || '',
        jobDescription: formData.jobDescription,
        urgency: formData.urgency,
        estateSlug: slug,
      };
      if (formData.urgency === 'SCHEDULED') {
        payload.scheduledTime = new Date(formData.scheduledTime).toISOString();
      }
      const res = await bookingsAPI.create(payload as Parameters<typeof bookingsAPI.create>[0]);
      setBookingCode(res.data?.bookingCode || res.data?.code || '');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </>
    );
  }

  if (error || !estate) {
    return (
      <>
        <Navbar />
        <div className="container py-5 text-center">
          <i className="fa-solid fa-building-circle-xmark fs-1 text-muted mb-3 d-block"></i>
          <h3>Estate Not Found</h3>
          <p className="text-muted">{error || 'This estate link is invalid or inactive.'}</p>
          <Link href="/" className="btn btn-primary rounded-3">Go to Homepage</Link>
        </div>
        <Footer />
      </>
    );
  }

  // Booking success
  if (bookingCode) {
    return (
      <>
        <Navbar />
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-6 text-center">
              <div className="card border-0 shadow-sm p-5 rounded-4">
                <i className="fa-solid fa-circle-check text-success fs-1 mb-3"></i>
                <h3 className="fw-bold mb-2">Booking Confirmed!</h3>
                <p className="text-muted">Your booking through <strong>{estate.name}</strong> has been placed.</p>
                <div className="bg-light p-3 rounded-3 mb-3">
                  <div className="text-muted small">Your Booking Code</div>
                  <div className="display-6 fw-bold font-monospace text-primary">{bookingCode}</div>
                </div>
                <p className="small text-muted mb-4">
                  Save this code! Use it to track your booking status. The artisan will contact you shortly.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <Link href={`/track/${bookingCode}`} className="btn btn-primary rounded-3">
                    <i className="fa-solid fa-location-dot me-1"></i>Track Booking
                  </Link>
                  <button className="btn btn-outline-primary rounded-3"
                    onClick={() => { setBookingCode(''); setSelectedWorker(null); setSelectedCategory(''); }}>
                    Book Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <TenantProvider slug={slug}>
      <Navbar />

      {/* Estate Header — dynamic brand theming */}
      <section
        className="text-white py-4 mx-3 rounded-4 mt-3"
        style={{ backgroundColor: estate.brandPrimaryColor || '#0d6efd' }}
      >
        <div className="container text-center">
          {estate.brandLogoUrl && (
            <img src={estate.brandLogoUrl} alt={estate.name} className="mb-3"
              style={{ maxHeight: 60, objectFit: 'contain' }} />
          )}
          <div className="badge bg-white mb-2 px-3 py-2 rounded-5"
            style={{ color: estate.brandPrimaryColor || '#0d6efd' }}>
            <i className="fa-solid fa-building me-1"></i> Estate Services
          </div>
          <h2 className="display-5 fw-bold mb-2">{estate.name}</h2>
          <p className="lead opacity-75 mb-0">
            {estate.brandWelcomeMessage || (
              <><i className="fa-solid fa-location-dot me-1"></i>{estate.area} — Book trusted artisans for your home</>
            )}
          </p>
          {estate.whatsappStartCommand && (
            <div className="mt-2 small opacity-75">
              <i className="fa-brands fa-whatsapp me-1"></i>
              WhatsApp: Send <strong>{estate.whatsappStartCommand}</strong> to book via chat
            </div>
          )}
          <a
            href={whatsappBotLink(estate.whatsappStartCommand || `Hi, I live in ${estate.name} and need to book an artisan`)}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-success btn-lg rounded-5 mt-3"
          >
            <i className="fa-brands fa-whatsapp me-2"></i>Book via WhatsApp Instead
          </a>
        </div>
      </section>

      <div className="container py-5">
        {/* Step 1: Select category */}
        {!selectedWorker && (
          <>
            <h4 className="fw-bold mb-3">
              {selectedCategory ? '2. Choose a Pro' : '1. What do you need help with?'}
            </h4>

            {!selectedCategory && (
              <div className="row g-3 mb-4">
                {categories.map(cat => (
                  <div key={cat.id} className="col-6 col-md-3">
                    <button className="card border-0 shadow-sm w-100 p-3 text-center h-100"
                      style={{ cursor: 'pointer', border: 'none', background: 'white' }}
                      onClick={() => handleCategorySelect(cat.name.toUpperCase().replace(/ /g, '_'))}>
                      <i className={`fa-solid ${cat.icon} fs-2 text-primary mb-2`}></i>
                      <div className="fw-medium small">{cat.name}</div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Workers list */}
            {selectedCategory && (
              <>
                <button className="btn btn-sm btn-outline-secondary rounded-5 mb-3"
                  onClick={() => { setSelectedCategory(''); setWorkers([]); }}>
                  <i className="fa-solid fa-arrow-left me-1"></i> Back to categories
                </button>
                {workers.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="fa-solid fa-search fs-2 mb-2 d-block"></i>
                    No artisans found for this category in your area.
                  </div>
                ) : (
                  <div className="row g-3">
                    {workers.map(worker => (
                      <div key={worker.id} className="col-md-6 col-lg-4">
                        <div className="card border-0 shadow-sm h-100" style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedWorker(worker)}>
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="fw-bold mb-1">{worker.firstName} {worker.lastName}</h6>
                                <div className="text-muted small">
                                  <i className="fa-solid fa-location-dot me-1"></i>{worker.locationName}
                                </div>
                              </div>
                              <div className="text-end">
                                {worker.vettingLevel === 'PRO' && (
                                  <span className="badge text-bg-warning mb-1"><i className="fa-solid fa-crown me-1"></i>PRO</span>
                                )}
                                {worker.vettingLevel === 'VERIFIED' && (
                                  <span className="badge text-bg-info mb-1"><i className="fa-solid fa-check me-1"></i>Verified</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 d-flex gap-3 small">
                              <span><i className="fa-solid fa-star text-warning me-1"></i>{worker.trustScore?.toFixed(1) || '—'}</span>
                              <span><i className="fa-solid fa-briefcase text-muted me-1"></i>{worker.totalJobsCompleted} jobs</span>
                            </div>
                            <button className="btn btn-primary btn-sm w-100 mt-3 rounded-3">
                              Select &amp; Book
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Step 3: Booking form */}
        {selectedWorker && (
          <>
            <button className="btn btn-sm btn-outline-secondary rounded-5 mb-3"
              onClick={() => setSelectedWorker(null)}>
              <i className="fa-solid fa-arrow-left me-1"></i> Back to artisans
            </button>

            <div className="row g-4">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm p-3">
                  <h6 className="fw-bold mb-2">Selected Artisan</h6>
                  <div className="fw-medium">{selectedWorker.firstName} {selectedWorker.lastName}</div>
                  <div className="text-muted small">{selectedWorker.locationName}</div>
                  <div className="mt-2 small">
                    <i className="fa-solid fa-star text-warning me-1"></i>{selectedWorker.trustScore?.toFixed(1)}
                    <span className="text-muted ms-2">{selectedWorker.totalJobsCompleted} jobs</span>
                  </div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="card border-0 shadow-sm p-4">
                  <h5 className="fw-bold mb-3">3. Your Details</h5>
                  <form onSubmit={handleBooking}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Your Name *</label>
                        <input className="form-control" required value={formData.customerName}
                          onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Phone Number *</label>
                        <input className="form-control" required value={formData.customerPhone}
                          onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                          placeholder="+254..." />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Location / House Number</label>
                        <input className="form-control" value={formData.customerLocation}
                          onChange={e => setFormData({ ...formData, customerLocation: e.target.value })}
                          placeholder={`e.g. House A12, ${estate.name}`} />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Describe the job *</label>
                        <textarea className="form-control" rows={3} required value={formData.jobDescription}
                          onChange={e => setFormData({ ...formData, jobDescription: e.target.value })}
                          placeholder="What needs to be fixed or done?" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Urgency</label>
                        <select className="form-select" value={formData.urgency}
                          onChange={e => setFormData({ ...formData, urgency: e.target.value as any })}>
                          <option value="NOW">Right now</option>
                          <option value="TODAY">Today</option>
                          <option value="TOMORROW">Tomorrow</option>
                          <option value="SCHEDULED">Scheduled</option>
                        </select>
                      </div>
                      {formData.urgency === 'SCHEDULED' && (
                        <div className="col-md-6">
                          <label className="form-label fw-medium">Date & Time *</label>
                          <input type="datetime-local" className="form-control" required
                            value={formData.scheduledTime}
                            min={new Date().toISOString().slice(0, 16)}
                            onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <button type="submit" className="btn btn-primary w-100 mt-4 py-2 rounded-3 fw-medium"
                      disabled={booking}>
                      {booking ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                      <i className="fa-solid fa-calendar-check me-1"></i> Confirm Booking
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </TenantProvider>
  );
}
