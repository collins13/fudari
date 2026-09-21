'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { whatsappBotLink } from '@/lib/whatsapp';

export default function TrackLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Enter the booking code from your SMS, e.g. TUF-123456.');
      return;
    }
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <Navbar />

      <main className="bg-light py-5">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 p-md-5">
                  <div className="text-center mb-4">
                    <i className="fa-solid fa-location-crosshairs text-primary display-5 mb-3 d-block" aria-hidden="true"></i>
                    <h1 className="h3 fw-bold mb-2">Track your booking</h1>
                    <p className="text-muted mb-0">
                      Enter the code we sent you by SMS to see your job status, your pro&apos;s details
                      and your PINs.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <label className="form-label fw-medium" htmlFor="bookingCode">Booking code</label>
                    <input
                      id="bookingCode"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      className="form-control form-control-lg text-uppercase"
                      placeholder="TUF-123456"
                      value={code}
                      onChange={(e) => { setCode(e.target.value); setError(''); }}
                    />
                    {error && (
                      <div className="alert alert-danger d-flex align-items-start gap-2 mt-3 mb-0" role="alert">
                        <i className="fa-solid fa-circle-exclamation mt-1" aria-hidden="true"></i>
                        <span>{error}</span>
                      </div>
                    )}
                    <button type="submit" className="btn btn-accent btn-lg w-100 rounded-3 mt-3">
                      <i className="fa-solid fa-magnifying-glass me-2" aria-hidden="true"></i>Track booking
                    </button>
                  </form>

                  <hr className="my-4" />

                  <p className="text-muted small mb-2">Lost your code?</p>
                  <div className="d-flex flex-wrap gap-2">
                    <a
                      href={whatsappBotLink('Hi, I lost my FUDARI booking code and need help finding my job.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-success rounded-pill px-3"
                    >
                      <i className="fa-brands fa-whatsapp me-2" aria-hidden="true"></i>Ask on WhatsApp
                    </a>
                    <Link href="/artisans" className="btn btn-outline-primary rounded-pill px-3">
                      Book another pro
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
