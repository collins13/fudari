'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { listingsAPI } from '@/lib/api';
import { SKILL_OPTIONS as CATEGORIES } from '@/lib/kenya';

interface FormData {
  title: string;
  category: string;
  description: string;
  price: string;
  location: string;
  images: string;
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormData>({
    title: '',
    category: '',
    description: '',
    price: '',
    location: '',
    images: '',
  });
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  useEffect(() => {
    if (!listingId) return;
    const fetchListing = async () => {
      try {
        const res = await listingsAPI.getListing(listingId);
        const l = res.data;
        setForm({
          title: l.title || '',
          category: l.skillType || '',
          description: l.description || '',
          price: l.priceStart || '',
          location: l.location || '',
          images: l.images || '',
        });
        // Parse existing images for preview
        if (l.images) {
          try {
            const imgs = JSON.parse(l.images);
            if (Array.isArray(imgs)) setImagePreview(imgs);
          } catch { /* ignore */ }
        }
      } catch (err: any) {
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [listingId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
          setImagePreview([...imagePreview, ...previews]);
          const existing = form.images ? JSON.parse(form.images) : [];
          setForm((prev) => ({ ...prev, images: JSON.stringify([...existing, ...base64List]) }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.price || Number(form.price) <= 0) {
      setError('Enter a starting price. Customers skip listings that hide the price.');
      return;
    }

    setSaving(true);

    try {
      await listingsAPI.updateListing(listingId, {
        title: form.title,
        skillType: form.category,
        description: form.description,
        priceStart: form.price,
        location: form.location || undefined,
        images: form.images || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/my-listings');
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div className="rounded-circle bg-success d-flex align-items-center justify-content-center mb-4"
          style={{ width: 80, height: 80 }}>
          <i className="fa-solid fa-check text-white" style={{ fontSize: 36 }}></i>
        </div>
        <h4 className="fw-bold mb-2">Listing Updated!</h4>
        <p className="text-muted mb-2">Your changes have been saved.</p>
        <p className="text-muted small">Note: Edits require admin re-approval before going live.</p>
        <p className="text-muted small">Redirecting to My Listings...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Edit Listing</h4>
        <p className="text-muted mb-0">Update your service listing details</p>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 mb-4">
          <i className="fa-solid fa-triangle-exclamation me-2"></i>{error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <form onSubmit={handleSubmit}>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="fa-solid fa-info-circle me-2 text-primary"></i>Listing Details
                </h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="title" className="form-label fw-medium">
                    Listing Title <span className="text-danger">*</span>
                  </label>
                  <input type="text" id="title" name="title" className="form-control"
                    value={form.title} onChange={handleChange} required />
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label fw-medium">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select id="category" name="category" className="form-select"
                      value={form.category} onChange={handleChange} required>
                      <option value="">Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="price" className="form-label fw-medium">
                      Starting Price (KES) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">KES</span>
                      <input type="number" id="price" name="price" className="form-control"
                        placeholder="500" min="1" required value={form.price} onChange={handleChange} />
                    </div>
                    <div className="form-text">Your &ldquo;from&rdquo; price. Customers skip listings that hide it.</div>
                  </div>
                </div>

                <div className="mt-3">
                  <label htmlFor="description" className="form-label fw-medium">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea id="description" name="description" className="form-control" rows={5}
                    value={form.description} onChange={handleChange} required></textarea>
                </div>

                <div className="mt-3">
                  <label htmlFor="location" className="form-label fw-medium">Service Area / Location</label>
                  <input type="text" id="location" name="location" className="form-control"
                    placeholder="e.g. Nairobi, Westlands" value={form.location} onChange={handleChange} />
                </div>

                <div className="mt-3">
                  <label className="form-label fw-medium">Images</label>
                  <div className="border rounded-3 p-3 text-center" style={{ background: '#f8f9fa' }}>
                    <label className="btn btn-outline-secondary btn-sm rounded-5 mb-2" style={{ cursor: 'pointer' }}>
                      <i className="fa-solid fa-camera me-2"></i>Add More Images
                      <input type="file" accept="image/*" multiple className="d-none" onChange={handleImageChange} />
                    </label>
                    <p className="text-muted small mb-0">JPG, PNG — max 2MB each</p>
                    {imagePreview.length > 0 && (
                      <div className="d-flex gap-2 flex-wrap justify-content-center mt-2">
                        {imagePreview.map((src, i) => (
                          <img key={i} src={src} alt={`preview-${i}`} className="rounded"
                            style={{ width: 64, height: 64, objectFit: 'cover' }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-3">
              <button type="submit" className="btn btn-primary px-5 rounded-5 fw-medium" disabled={saving}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                ) : (
                  <><i className="fa-solid fa-save me-2"></i>Save Changes</>
                )}
              </button>
              <button type="button" className="btn btn-outline-secondary rounded-5"
                onClick={() => router.push('/dashboard/my-listings')}>
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4" style={{ background: '#fff8f0' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                <i className="fa-solid fa-exclamation-triangle text-warning me-2"></i>Important
              </h6>
              <p className="small text-muted mb-0">
                Editing your listing will reset its status to <strong>Pending</strong>. 
                An admin will need to re-approve it before it appears publicly again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
