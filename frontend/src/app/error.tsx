'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error:', error);
  }, [error]);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6 text-center py-5">
          <i className="fa-solid fa-triangle-exclamation text-warning display-3 mb-4 d-block" aria-hidden="true"></i>
          <h1 className="h3 fw-bold mb-3">Something went wrong on our side</h1>
          <p className="text-muted mb-4">
            This is not your fault and nothing you entered was lost. Try again, or reach us on
            WhatsApp and we will sort it out.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <button type="button" className="btn btn-primary rounded-pill px-4" onClick={reset}>
              <i className="fa-solid fa-rotate-right me-2" aria-hidden="true"></i>Try again
            </button>
            <Link href="/" className="btn btn-outline-primary rounded-pill px-4">
              <i className="fa-solid fa-house me-2" aria-hidden="true"></i>Go home
            </Link>
            <Link href="/artisans" className="btn btn-outline-secondary rounded-pill px-4">
              Browse pros
            </Link>
          </div>
          {error.digest && (
            <p className="text-muted small mt-4 mb-0">Reference: {error.digest}</p>
          )}
        </div>
      </div>
    </div>
  );
}
