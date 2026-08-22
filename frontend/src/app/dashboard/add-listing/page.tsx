'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { listingsAPI, aiAPI } from '@/lib/api';

interface FormData {
  title: string;
  category: string;
  description: string;
  price: string;
  location: string;
  isUrgent: boolean;
  allowBidding: boolean;
  beforeImages: string;
}

const CATEGORIES = [
  { label: 'Electrician', value: 'ELECTRICIAN' },
  { label: 'Plumber', value: 'PLUMBER' },
  { label: 'Mechanic', value: 'MECHANIC' },
  { label: 'Painter', value: 'PAINTER' },
  { label: 'Carpenter', value: 'CARPENTER' },
  { label: 'HVAC Technician', value: 'HVAC_TECHNICIAN' },
  { label: 'Welder', value: 'WELDER' },
  { label: 'Mason', value: 'MASON' },
  { label: 'Mover', value: 'MOVER' },
  { label: 'Transport Provider', value: 'TRANSPORT_PROVIDER' },
  { label: 'Event Lighting', value: 'EVENT_LIGHTING' },
  { label: 'Other', value: 'OTHER' },
];

export default function AddListingPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    title: '',
    category: '',
    description: '',
    price: '',
    location: '',
    isUrgent: false,
    allowBidding: true,
    beforeImages: '',
  });
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiPricing, setAiPricing] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<{ min: number; max: number; median: number } | null>(null);

  const handleAiEnhance = async () => {
    if (!form.description || form.description.length < 10) {
      setError('Write at least a short description first so AI can enhance it.');
      return;
    }
    setAiEnhancing(true);
    setError('');
    try {
      const res = await aiAPI.enhanceDescription({
        description: form.description,
        location: form.location || undefined,
        skillType: form.category || undefined,
      });
      const data = res.data;
      if (data.enhancedDescription) {
        setForm((prev) => ({ ...prev, description: data.enhancedDescription }));
      }
      if (data.suggestedCategory && !form.category) {
        setForm((prev) => ({ ...prev, category: data.suggestedCategory }));
      }
    } catch {
      setError('AI enhancement failed. You can still submit manually.');
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleAiPrice = async () => {
    if (!form.category) {
      setError('Select a category first to get a price estimate.');
      return;
    }
    setAiPricing(true);
    setError('');
    try {
      const res = await aiAPI.estimatePrice(form.category, form.location || undefined);
      setPriceEstimate(res.data);
    } catch {
      setError('Price estimate unavailable. Set your own price.');
    } finally {
      setAiPricing(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const previews: string[] = [];
    const base64List: string[] = [];
    let done = 0;
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        previews[idx] = result;
        base64List[idx] = result;
        done++;
        if (done === files.length) {
          setImagePreview(previews);
          setForm((prev) => ({ ...prev, beforeImages: JSON.stringify(base64List) }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await listingsAPI.createListing({
        title: form.title,
        description: form.description,
        skillType: form.category,
        location: form.location || undefined,
        priceStart: form.price || undefined,
        images: form.beforeImages || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        router.push('/dashboard/my-listings');
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div
          className="rounded-circle bg-success d-flex align-items-center justify-content-center mb-4"
          style={{ width: 80, height: 80 }}
        >
          <i className="fa-solid fa-check text-white" style={{ fontSize: 36 }}></i>
        </div>
        <h4 className="fw-bold mb-2">Listing Submitted!</h4>
        <p className="text-muted mb-2">Your listing has been submitted for review.</p>
        <p className="text-muted small mb-4">It will appear publicly once approved by an admin.</p>
        <p className="text-muted small">Redirecting to My Listings...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Add New Listing</h4>
        <p className="text-muted mb-0">Create a new service listing to attract customers</p>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 mb-4">
          <i className="fa-solid fa-triangle-exclamation me-2"></i>{error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="fa-solid fa-info-circle me-2 text-primary"></i>Basic Information
                </h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="title" className="form-label fw-medium">
                    Listing Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className="form-control"
                    placeholder="e.g. Professional Residential Wiring & Installation"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                  <div className="form-text">Make it descriptive and specific to attract more clients.</div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label fw-medium">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="form-select"
                      value={form.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="price" className="form-label fw-medium">
                      Starting Price (KES)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">KES</span>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        className="form-control"
                        placeholder="500"
                        min="0"
                        value={form.price}
                        onChange={handleChange}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-5 mt-1"
                      disabled={aiPricing}
                      onClick={handleAiPrice}
                    >
                      {aiPricing ? (
                        <><span className="spinner-border spinner-border-sm me-1"></span>Checking...</>
                      ) : (
                        <><i className="fa-solid fa-chart-line me-1"></i>AI Price Guide</>
                      )}
                    </button>
                    {priceEstimate && (
                      <div className="mt-1 small text-muted">
                        <i className="fa-solid fa-lightbulb text-warning me-1"></i>
                        Market range: <strong>KES {priceEstimate.min.toLocaleString()}</strong> –{' '}
                        <strong>KES {priceEstimate.max.toLocaleString()}</strong>{' '}
                        (median: KES {priceEstimate.median.toLocaleString()})
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <label htmlFor="description" className="form-label fw-medium">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-control"
                    rows={5}
                    placeholder="Describe your service in detail. Include your experience, tools used, what's included in the price, etc."
                    value={form.description}
                    onChange={handleChange}
                    required
                  ></textarea>
                  <div className="form-text">Minimum 50 characters recommended.</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary rounded-5 mt-2"
                    disabled={aiEnhancing}
                    onClick={handleAiEnhance}
                  >
                    {aiEnhancing ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Enhancing...</>
                    ) : (
                      <><i className="fa-solid fa-wand-magic-sparkles me-1"></i>AI Enhance Description</>
                    )}
                  </button>
                </div>

                <div className="mt-3">
                  <label htmlFor="location" className="form-label fw-medium">
                    Service Area / Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    className="form-control"
                    placeholder="e.g. Nairobi, Westlands, Karen, Kikuyu"
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-3">
                  <label className="form-label fw-medium">
                    Before Images <span className="text-muted small">(Optional)</span>
                  </label>
                  <div
                    className="border rounded-3 p-3 text-center"
                    style={{ borderStyle: 'dashed !important', background: '#f8f9fa' }}
                  >
                    <label className="btn btn-outline-secondary btn-sm rounded-5 mb-2" style={{ cursor: 'pointer' }}>
                      <i className="fa-solid fa-camera me-2"></i>Choose Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="d-none"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="text-muted small mb-0">JPG, PNG — max 2MB each</p>
                    {imagePreview.length > 0 && (
                      <div className="d-flex gap-2 flex-wrap justify-content-center mt-2">
                        {imagePreview.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`preview-${i}`}
                            className="rounded"
                            style={{ width: 64, height: 64, objectFit: 'cover' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 d-flex gap-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isUrgent"
                      name="isUrgent"
                      checked={form.isUrgent}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="isUrgent">
                      Mark as Urgent
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="allowBidding"
                      name="allowBidding"
                      checked={form.allowBidding}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="allowBidding">
                      Allow Bidding
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-3">
              <button
                type="submit"
                className="btn btn-primary px-5 rounded-5 fw-medium"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Publishing...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane me-2"></i>Publish Listing</>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary rounded-5"
                onClick={() => router.push('/dashboard/bookings')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Tips Sidebar */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4" style={{ background: '#f0f7ff' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                <i className="fa-solid fa-lightbulb text-primary me-2"></i>Tips for a Great Listing
              </h6>
              <ul className="list-unstyled mb-0">
                {[
                  'Use a clear, specific title',
                  'Write a detailed description',
                  'Set a competitive starting price',
                  'List all areas you cover',
                  'Enable bidding to get competitive offers',
                  'Mark urgent jobs to get faster responses',
                ].map((tip, i) => (
                  <li key={i} className="d-flex gap-2 mb-2">
                    <i className="fa-solid fa-check-circle text-success mt-1 flex-shrink-0"></i>
                    <span className="small text-muted">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
