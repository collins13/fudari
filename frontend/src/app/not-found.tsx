import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container py-5" style={{ minHeight: '70vh' }}>
      <div className="row justify-content-center align-items-center py-5">
        <div className="col-lg-8 text-center">
          <div className="display-2 fw-bold text-primary mb-2">404</div>
          <h1 className="fw-bold mb-3">Page not found</h1>
          <p className="text-muted mb-4">
            The page you are looking for might have moved, been removed, or never existed.
            You can continue browsing verified artisans across Kenya from the links below.
          </p>

          <div className="d-flex flex-wrap gap-2 justify-content-center mb-4">
            <Link href="/" className="btn btn-primary rounded-pill px-4">
              Back to Home
            </Link>
            <Link href="/artisans" className="btn btn-outline-primary rounded-pill px-4">
              Find Artisans
            </Link>
            <Link href="/pricing" className="btn btn-outline-secondary rounded-pill px-4">
              View Pricing
            </Link>
          </div>

          <div className="small text-muted">
            Need help now? Call or WhatsApp <a href="tel:+254703954539">+254703954539</a>
          </div>
        </div>
      </div>
    </main>
  );
}
